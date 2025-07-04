# Sparky Property-Based Testing Improvement Plan

## Executive Summary

This document provides a comprehensive action plan to address all 12 critical issues identified in the TEST_AUDIT.md. The plan is structured in phases with clear priorities, implementation strategies, and success metrics. Total estimated effort: 8-10 weeks for a dedicated team of 2-3 engineers.

## Phase 1: Critical Security Fixes (Week 1-2)

### Priority: CRITICAL
These fixes address the most severe security vulnerabilities that could lead to incorrect cryptographic implementations.

### 1.1 Fix Value Range Coverage

**Issue**: Tests only cover 0-9999 in a ~2^255 field, missing critical edge cases.

**Implementation**:
```rust
// sparky-core/tests/properties.rs

use proptest::prelude::*;
use ark_ff::{Field, PrimeField};

/// Generate field elements with comprehensive coverage
prop_compose! {
    fn arb_field_element()(
        strategy in prop_oneof![
            // 10% small values (common case optimization testing)
            1 => 0u64..1000u64,
            
            // 20% random 64-bit values
            2 => any::<u64>(),
            
            // 20% random full-range values
            2 => any::<[u64; 4]>().prop_map(|limbs| {
                let mut bytes = [0u8; 32];
                for (i, limb) in limbs.iter().enumerate() {
                    bytes[i*8..(i+1)*8].copy_from_slice(&limb.to_le_bytes());
                }
                FieldElement::from_bytes(&bytes).unwrap_or(FieldElement::zero())
            }),
            
            // 20% near modulus (overflow testing)
            2 => prop_oneof![
                Just(FieldElement::from(PallasF::MODULUS) - FieldElement::one()),
                Just(FieldElement::from(PallasF::MODULUS) - FieldElement::from(2u64)),
                Just(FieldElement::from(PallasF::MODULUS) - FieldElement::from(100u64)),
                (0u64..1000u64).prop_map(|offset| {
                    FieldElement::from(PallasF::MODULUS) - FieldElement::from(offset)
                }),
            ],
            
            // 10% powers of 2 (bit operation testing)
            1 => (0usize..255).prop_map(|shift| {
                FieldElement::from(1u64) << shift
            }),
            
            // 10% Montgomery form edge cases
            1 => prop_oneof![
                Just(FieldElement::MONTGOMERY_ONE),
                Just(FieldElement::MONTGOMERY_R),
                Just(FieldElement::MONTGOMERY_R2),
            ],
            
            // 10% cryptographic constants
            1 => prop_oneof![
                Just(PallasF::GENERATOR),
                Just(PallasF::TWO_ADIC_ROOT_OF_UNITY),
                Just(PallasF::MULTIPLICATIVE_GENERATOR),
                // Include any curve-specific constants
            ],
        ]
    ) -> FieldElement {
        strategy
    }
}

/// Generate adversarial field element pairs for operation testing
prop_compose! {
    fn arb_field_pair()(
        a in arb_field_element(),
        b_strategy in prop_oneof![
            // 30% independent random
            3 => arb_field_element().boxed(),
            // 20% related to a
            2 => Just(a).prop_map(|x| x + FieldElement::one()).boxed(),
            // 20% inverse relationship
            2 => Just(a).prop_map(|x| {
                if x.is_zero() { FieldElement::one() } 
                else { x.inverse().unwrap() }
            }).boxed(),
            // 15% negation
            1 => Just(a).prop_map(|x| -x).boxed(),
            // 15% special relationships
            1 => Just(a).prop_map(|x| x * x).boxed(),
        ]
    ) -> (FieldElement, FieldElement) {
        (a, b_strategy)
    }
}
```

**Success Metrics**:
- 100% of field element range covered by generators
- All edge cases explicitly tested
- No overflow bugs in field operations

**Time Estimate**: 3 days

### 1.2 Remove Toy Field Tests

**Issue**: Tests using p=17 provide no real coverage.

**Implementation**:
```bash
# Remove all toy field tests
rm -f sparky-core/tests/properties/property_tests.rs
rm -rf sparky-core/tests/properties/  # If directory only contains toy tests

# Update test module to exclude removed tests
# In sparky-core/tests/mod.rs, remove:
# mod properties;
```

**Create replacement tests focused on Pallas field**:
```rust
// sparky-core/tests/pallas_field_properties.rs

use ark_pallas::Fr as PallasF;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(10000))]
    
    #[test]
    fn test_pallas_field_axioms(a in arb_pallas_element(), b in arb_pallas_element()) {
        // Test all field axioms with Pallas field specifically
        verify_field_axioms::<PallasF>(a, b);
    }
}
```

**Success Metrics**:
- Zero tests using fields smaller than 2^64
- All tests use cryptographically relevant field sizes

**Time Estimate**: 1 day

### 1.3 Implement Real Security Testing

**Issue**: Current timing tests are meaningless due to OS noise.

**Implementation**:
```rust
// sparky-core/tests/security_properties.rs

#[cfg(feature = "security-audit")]
mod constant_time {
    use dudect_bencher::{BenchRng, Class, CtRunner};
    
    /// Test constant-time properties using dudect statistical analysis
    pub fn verify_constant_time<F: Field>(
        operation: impl Fn(&F, &F) -> F,
        runner: &mut CtRunner,
    ) {
        // Class 0: Random inputs
        // Class 1: Special pattern inputs (all zeros, all ones, etc.)
        runner.run_two(|class| {
            let (a, b) = match class {
                Class::Left => generate_random_pair(),
                Class::Right => generate_pattern_pair(),
            };
            
            // Execute operation multiple times to reduce noise
            for _ in 0..100 {
                black_box(operation(&a, &b));
            }
        });
        
        // Statistical analysis - fails if timing depends on input
        assert!(runner.check_ct(), "Operation is not constant time!");
    }
    
    #[test]
    fn test_field_mul_constant_time() {
        let mut runner = CtRunner::new();
        verify_constant_time(|a, b| a * b, &mut runner);
    }
}

// Alternative: Use SIMD cycle counting for precise measurements
#[cfg(target_arch = "x86_64")]
mod cycle_accurate {
    use core::arch::x86_64::{_rdtsc, _mm_mfence};
    
    fn measure_cycles<F>(op: impl Fn() -> F) -> u64 {
        unsafe {
            _mm_mfence();
            let start = _rdtsc();
            black_box(op());
            _mm_mfence();
            _rdtsc() - start
        }
    }
    
    #[test]
    fn test_multiplication_timing_variance() {
        const SAMPLES: usize = 10000;
        let mut measurements = Vec::with_capacity(SAMPLES);
        
        for _ in 0..SAMPLES {
            let a = random_field_element();
            let b = random_field_element();
            
            let cycles = measure_cycles(|| a * b);
            measurements.push(cycles);
        }
        
        // Statistical analysis
        let mean = statistical::mean(&measurements);
        let variance = statistical::variance(&measurements);
        
        // Threshold based on empirical analysis of the target platform
        assert!(variance < mean * 0.05, 
            "Multiplication timing variance too high: {} cycles", variance);
    }
}
```

**Success Metrics**:
- Zero false positives in constant-time detection
- Able to detect known timing vulnerabilities
- Statistical confidence > 99.9%

**Time Estimate**: 5 days

## Phase 2: Test Coverage Expansion (Week 3-4)

### Priority: HIGH
Expand test coverage to industry standards for cryptographic software.

### 2.1 Increase Test Case Counts

**Implementation**:
```rust
// Global test configuration
// sparky-core/tests/test_config.rs

use proptest::prelude::*;

/// Standard test configurations by category
pub mod configs {
    use super::*;
    
    /// Basic operations - 1000 cases minimum
    pub fn basic() -> ProptestConfig {
        ProptestConfig::with_cases(1000)
    }
    
    /// Critical cryptographic properties - 10000 cases
    pub fn cryptographic() -> ProptestConfig {
        ProptestConfig::with_cases(10000)
    }
    
    /// Security properties - 100000 cases
    pub fn security() -> ProptestConfig {
        ProptestConfig::with_cases(100000)
    }
    
    /// Stress tests - 1000000 cases
    pub fn stress() -> ProptestConfig {
        ProptestConfig {
            cases: 1000000,
            max_shrink_iters: 1000,
            timeout: 3600, // 1 hour timeout
            ..Default::default()
        }
    }
}

// Apply configurations systematically
proptest! {
    #![proptest_config(configs::cryptographic())]
    
    #[test]
    fn test_discrete_log_hardness(g in arb_generator(), x in arb_exponent()) {
        // Test that we can't recover x from g^x
        let y = g.pow(x);
        verify_dlog_hardness(g, y, x);
    }
}
```

**Success Metrics**:
- Minimum 1000 cases for all properties
- 10000+ cases for cryptographic properties  
- 100000+ cases for security-critical properties

**Time Estimate**: 2 days

### 2.2 Convert Fixed Tests to Property-Based

**Issue**: `mathematical_equivalence.rs` uses hardcoded examples.

**Implementation**:
```rust
// sparky-ir/tests/mathematical_equivalence.rs

use proptest::prelude::*;

// Before: Hardcoded test
#[test]
fn test_multiplication_distribution() {
    let a = field_from_u64(5);
    let b = field_from_u64(7);
    let c = field_from_u64(11);
    assert_eq!(a * (b + c), a * b + a * c);
}

// After: Property-based test
proptest! {
    #![proptest_config(ProptestConfig::with_cases(10000))]
    
    #[test]
    fn test_multiplication_distributes_over_addition(
        a in arb_field_element(),
        b in arb_field_element(),
        c in arb_field_element()
    ) {
        // Left distributivity: a * (b + c) = a * b + a * c
        prop_assert_eq!(
            a * (b + c),
            a * b + a * c,
            "Left distributivity failed for a={:?}, b={:?}, c={:?}", a, b, c
        );
        
        // Right distributivity: (a + b) * c = a * c + b * c  
        prop_assert_eq!(
            (a + b) * c,
            a * c + b * c,
            "Right distributivity failed for a={:?}, b={:?}, c={:?}", a, b, c
        );
    }
    
    #[test]
    fn test_optimization_preserves_semantics(
        expr in arb_expression(5, 10), // depth 5, max vars 10
        env in arb_environment(10)
    ) {
        let original_result = evaluate_expression(&expr, &env);
        let optimized = optimize_expression(expr.clone());
        let optimized_result = evaluate_expression(&optimized, &env);
        
        prop_assert_eq!(
            original_result, 
            optimized_result,
            "Optimization changed semantics:\nOriginal: {:?}\nOptimized: {:?}",
            expr, optimized
        );
        
        // Additionally verify optimization actually optimized something
        prop_assert!(
            optimized.complexity() <= expr.complexity(),
            "Optimization increased complexity!"
        );
    }
}
```

**Success Metrics**:
- Zero hardcoded test values remain
- All mathematical properties tested with generated inputs
- Shrinking strategies provide minimal failing cases

**Time Estimate**: 3 days

### 2.3 Expand Expression Complexity

**Implementation**:
```rust
// sparky-ir/tests/generators.rs

/// Generate expressions with configurable complexity
pub fn arb_expression(
    max_depth: u32,
    num_vars: usize,
) -> impl Strategy<Value = Expression> {
    // Base case - leaf nodes
    let leaf = prop_oneof![
        arb_field_element().prop_map(Expression::Constant),
        (0..num_vars).prop_map(|i| Expression::Variable(format!("x{}", i))),
    ];
    
    // Recursive case - compound expressions
    leaf.prop_recursive(
        max_depth,
        256, // max nodes
        10,  // items per collection
        |inner| {
            prop_oneof![
                // Binary operations
                (inner.clone(), inner.clone()).prop_map(|(l, r)| 
                    Expression::Add(Box::new(l), Box::new(r))
                ),
                (inner.clone(), inner.clone()).prop_map(|(l, r)| 
                    Expression::Multiply(Box::new(l), Box::new(r))
                ),
                
                // Adversarial patterns
                inner.clone().prop_map(|e| {
                    // Deeply nested multiplications (stress test)
                    let mut result = e;
                    for _ in 0..10 {
                        result = Expression::Multiply(
                            Box::new(result.clone()),
                            Box::new(result)
                        );
                    }
                    result
                }),
                
                // Pathological patterns
                (inner.clone(), 1u32..20).prop_map(|(base, depth)| {
                    create_pathological_expression(base, depth)
                }),
            ]
        }
    )
}

/// Generate specific adversarial patterns
fn create_pathological_expression(base: Expression, depth: u32) -> Expression {
    match depth % 4 {
        0 => create_exponential_blowup(base),      // (a+b)^n expansion
        1 => create_common_subexpression_bomb(base), // Shared subexpressions
        2 => create_alternating_pattern(base),      // +*+*+* pattern
        3 => create_variable_explosion(base),       // Many unique variables
        _ => unreachable!(),
    }
}
```

**Success Metrics**:
- Test expressions up to depth 20+
- Include known problematic patterns
- Detect exponential complexity issues

**Time Estimate**: 2 days

## Phase 3: Missing Cryptographic Properties (Week 5-6)

### Priority: HIGH
Add comprehensive testing for cryptographic properties essential to zero-knowledge proofs.

### 3.1 Field-Specific Cryptographic Properties

**Implementation**:
```rust
// sparky-core/tests/cryptographic_properties.rs

use ark_ff::{Field, FftField, SquareRootField};

proptest! {
    #![proptest_config(configs::cryptographic())]
    
    #[test]
    fn test_frobenius_endomorphism(a in arb_field_element()) {
        // For prime fields, Frobenius is identity
        let frobenius = a.pow(&[PallasF::MODULUS]);
        prop_assert_eq!(frobenius, a, "Frobenius endomorphism incorrect");
    }
    
    #[test]
    fn test_legendre_symbol_properties(a in arb_nonzero_element()) {
        let symbol = a.legendre();
        
        // Euler's criterion
        let euler = a.pow(&[(PallasF::MODULUS - 1) / 2]);
        match symbol {
            LegendreSymbol::Zero => prop_assert!(a.is_zero()),
            LegendreSymbol::QuadraticResidue => {
                prop_assert_eq!(euler, FieldElement::one());
                // Verify square root exists
                let sqrt = a.sqrt();
                prop_assert!(sqrt.is_some(), "Quadratic residue has no square root");
                let sqrt = sqrt.unwrap();
                prop_assert_eq!(sqrt * sqrt, a);
            },
            LegendreSymbol::QuadraticNonResidue => {
                prop_assert_eq!(euler, -FieldElement::one());
                prop_assert!(a.sqrt().is_none());
            },
        }
    }
    
    #[test]
    fn test_multiplicative_generator(n in 1usize..100) {
        let g = PallasF::MULTIPLICATIVE_GENERATOR;
        
        // Generator should have order p-1
        let order = PallasF::MODULUS - 1;
        prop_assert_eq!(g.pow(&[order]), FieldElement::one());
        
        // Should generate all non-zero elements
        let mut seen = HashSet::new();
        let mut current = FieldElement::one();
        for _ in 0..n.min((order - 1) as usize) {
            current *= g;
            prop_assert!(seen.insert(current), "Generator has small cycle");
        }
    }
    
    #[test]
    fn test_two_adicity(a in arb_field_element()) {
        // Pallas field has 2-adicity of 32
        const TWO_ADICITY: u32 = 32;
        let root = PallasF::TWO_ADIC_ROOT_OF_UNITY;
        
        // Root should have order 2^32
        prop_assert_eq!(root.pow(&[1u64 << TWO_ADICITY]), FieldElement::one());
        prop_assert_ne!(root.pow(&[1u64 << (TWO_ADICITY - 1)]), FieldElement::one());
        
        // Test FFT-friendliness
        if !a.is_zero() {
            let fft_result = perform_fft(&vec![a; 1 << 10]);
            prop_assert!(fft_result.is_ok(), "FFT failed on valid input");
        }
    }
    
    #[test]
    fn test_sqrt_algorithm_correctness(
        qr in arb_quadratic_residue(),
        qnr in arb_quadratic_nonresidue()
    ) {
        // Tonelli-Shanks should work for all QRs
        let sqrt = qr.sqrt();
        prop_assert!(sqrt.is_some());
        let s = sqrt.unwrap();
        prop_assert_eq!(s * s, qr);
        
        // Should fail for QNRs
        prop_assert!(qnr.sqrt().is_none());
    }
}

// Specialized generators for cryptographic testing
prop_compose! {
    fn arb_quadratic_residue()(x in arb_field_element()) -> FieldElement {
        x * x
    }
}

prop_compose! {
    fn arb_quadratic_nonresidue()(
        g in Just(PallasF::MULTIPLICATIVE_GENERATOR),
        odd_exp in 0u64..((PallasF::MODULUS - 1) / 2)
    ) -> FieldElement {
        g.pow(&[2 * odd_exp + 1])
    }
}
```

**Success Metrics**:
- All field-specific properties verified
- Cryptographic assumptions validated
- Edge cases for special elements tested

**Time Estimate**: 4 days

### 3.2 Zero-Knowledge Properties

**Implementation**:
```rust
// sparky-core/tests/zk_properties.rs

proptest! {
    #[test]
    fn test_commitment_hiding(
        value in arb_field_element(),
        blinding1 in arb_field_element(),
        blinding2 in arb_field_element().filter(|b| b != &blinding1)
    ) {
        let comm1 = commit(value, blinding1);
        let comm2 = commit(value, blinding2);
        
        // Same value, different blinding => different commitments
        prop_assert_ne!(comm1, comm2, 
            "Commitment is not hiding - same output for different blinding");
    }
    
    #[test]
    fn test_commitment_binding(
        value1 in arb_field_element(),
        value2 in arb_field_element().filter(|v| v != &value1),
        blinding in arb_field_element()
    ) {
        // Cannot find blinding2 such that commit(value1, blinding) == commit(value2, blinding2)
        // This is computationally hard, so we test the mathematical structure
        let comm1 = commit(value1, blinding);
        
        // Try many random blindings - should not find collision
        for _ in 0..1000 {
            let blinding2 = random_field_element();
            let comm2 = commit(value2, blinding2);
            prop_assert_ne!(comm1, comm2);
        }
    }
    
    #[test]
    fn test_proof_zero_knowledge(
        witness in arb_witness(),
        statement in arb_statement(),
        challenge1 in arb_field_element(),
        challenge2 in arb_field_element().filter(|c| c != &challenge1)
    ) {
        // Proofs with different challenges should be indistinguishable
        let proof1 = prove(&witness, &statement, challenge1);
        let proof2 = prove(&witness, &statement, challenge2);
        
        // Both should verify
        prop_assert!(verify(&proof1, &statement));
        prop_assert!(verify(&proof2, &statement));
        
        // But proofs should be different (perfect ZK)
        prop_assert_ne!(proof1, proof2);
    }
}
```

**Success Metrics**:
- Core ZK properties verified
- Commitment scheme properties tested
- Proof system soundness validated

**Time Estimate**: 3 days

## Phase 4: Advanced Testing Infrastructure (Week 7-8)

### Priority: MEDIUM
Build sophisticated testing capabilities for long-term reliability.

### 4.1 Compositional Property Testing

**Implementation**:
```rust
// sparky-core/tests/compositional_properties.rs

use proptest::prelude::*;
use proptest::test_runner::{TestRunner, TestCaseError};

/// Test that properties are preserved through operation sequences
#[derive(Debug, Clone)]
enum Operation {
    Add(FieldElement),
    Multiply(FieldElement),
    Inverse,
    Square,
    Negate,
}

prop_compose! {
    fn arb_operation_sequence(max_len: usize)(
        ops in prop::collection::vec(arb_operation(), 1..=max_len)
    ) -> Vec<Operation> {
        ops
    }
}

proptest! {
    #[test]
    fn test_invariant_preservation(
        initial in arb_field_element(),
        ops in arb_operation_sequence(20)
    ) {
        let mut state = initial;
        let mut invariants = InvariantChecker::new(&state);
        
        for op in ops {
            state = apply_operation(state, &op);
            
            // Check all invariants still hold
            prop_assert!(invariants.check_field_closure(&state));
            prop_assert!(invariants.check_no_precision_loss(&state));
            prop_assert!(invariants.check_montgomery_consistency(&state));
        }
    }
    
    #[test]
    fn test_operation_composition_associativity(
        seq1 in arb_operation_sequence(10),
        seq2 in arb_operation_sequence(10),
        seq3 in arb_operation_sequence(10),
        initial in arb_field_element()
    ) {
        // (seq1 ∘ seq2) ∘ seq3 = seq1 ∘ (seq2 ∘ seq3)
        let compose_left = compose_sequences(
            compose_sequences(seq1.clone(), seq2.clone()),
            seq3.clone()
        );
        
        let compose_right = compose_sequences(
            seq1,
            compose_sequences(seq2, seq3)
        );
        
        let result_left = apply_sequence(initial, &compose_left);
        let result_right = apply_sequence(initial, &compose_right);
        
        prop_assert_eq!(result_left, result_right);
    }
}

/// Stateful property testing for constraint systems
#[derive(Debug)]
struct ConstraintSystemStateMachine;

impl StateMachine for ConstraintSystemStateMachine {
    type State = ConstraintSystem;
    type Transition = ConstraintOperation;
    
    fn init(&self) -> BoxedStrategy<Self::State> {
        Just(ConstraintSystem::new()).boxed()
    }
    
    fn transitions(&self, state: &Self::State) -> BoxedStrategy<Self::Transition> {
        let num_vars = state.num_variables();
        
        prop_oneof![
            // Add new variable
            arb_field_element().prop_map(|val| 
                ConstraintOperation::AddVariable(val)
            ),
            
            // Add constraint (only if we have variables)
            if num_vars > 0 {
                arb_constraint(num_vars).prop_map(|c|
                    ConstraintOperation::AddConstraint(c)
                ).boxed()
            } else {
                Just(ConstraintOperation::NoOp).boxed()
            },
            
            // Solve system
            Just(ConstraintOperation::Solve),
        ].boxed()
    }
    
    fn apply(&self, state: &mut Self::State, transition: &Self::Transition) {
        match transition {
            ConstraintOperation::AddVariable(val) => {
                state.add_variable(*val);
            },
            ConstraintOperation::AddConstraint(c) => {
                state.add_constraint(c.clone());
            },
            ConstraintOperation::Solve => {
                let _ = state.solve();
            },
            ConstraintOperation::NoOp => {},
        }
    }
    
    fn invariants(&self, state: &Self::State) -> Result<(), TestCaseError> {
        // System should remain consistent
        prop_assert!(state.is_consistent(), "Constraint system became inconsistent");
        
        // Variable count should match internal state
        prop_assert_eq!(
            state.num_variables(),
            state.variables.len(),
            "Variable count mismatch"
        );
        
        // All constraints should be well-formed
        for constraint in &state.constraints {
            prop_assert!(constraint.is_well_formed(), "Malformed constraint found");
        }
        
        Ok(())
    }
}

#[test]
fn test_constraint_system_state_machine() {
    let config = ProptestConfig {
        cases: 1000,
        max_shrink_iters: 100,
        ..Default::default()
    };
    
    let mut runner = TestRunner::new(config);
    let state_machine = ConstraintSystemStateMachine;
    
    runner.run(&state_machine_strategy(&state_machine), |ops| {
        let mut state = state_machine.init();
        
        for op in ops {
            state_machine.apply(&mut state, &op);
            state_machine.invariants(&state)?;
        }
        
        Ok(())
    }).unwrap();
}
```

**Success Metrics**:
- Complex operation sequences tested
- State machine properties verified
- Invariants maintained through all transitions

**Time Estimate**: 4 days

### 4.2 Performance Property Testing

**Implementation**:
```rust
// sparky-core/tests/performance_properties.rs

use std::time::{Duration, Instant};
use regression::{linear_regression, RegressionError};

proptest! {
    #[test]
    fn test_multiplication_is_constant_time(
        inputs in prop::collection::vec(
            (arb_field_element(), arb_field_element()),
            100..1000
        )
    ) {
        let mut timings = Vec::new();
        
        for (a, b) in inputs {
            let start = Instant::now();
            let _ = black_box(a * b);
            let elapsed = start.elapsed();
            
            timings.push(elapsed.as_nanos() as f64);
        }
        
        // Compute coefficient of variation
        let mean = statistical::mean(&timings);
        let std_dev = statistical::std_deviation(&timings);
        let cv = std_dev / mean;
        
        // CV should be < 5% for constant-time operations
        prop_assert!(cv < 0.05, 
            "Multiplication timing variance too high: CV = {:.2}%", cv * 100.0);
    }
    
    #[test]
    fn test_fft_is_nlogn(size_exp in 4u32..16u32) {
        let size = 1usize << size_exp;
        let mut timings = Vec::new();
        let mut sizes = Vec::new();
        
        // Measure at different sizes
        for exp in 4..=size_exp {
            let n = 1usize << exp;
            let input: Vec<_> = (0..n).map(|_| random_field_element()).collect();
            
            let start = Instant::now();
            let _ = perform_fft(&input);
            let elapsed = start.elapsed();
            
            sizes.push(n as f64);
            timings.push(elapsed.as_nanos() as f64);
        }
        
        // Fit to n*log(n) model
        let nlogn_values: Vec<f64> = sizes.iter()
            .map(|&n| n * n.log2())
            .collect();
        
        let (slope, _intercept) = linear_regression(&nlogn_values, &timings)
            .expect("Regression failed");
        
        // Verify linear relationship with n*log(n)
        let r_squared = calculate_r_squared(&nlogn_values, &timings, slope);
        
        prop_assert!(r_squared > 0.95, 
            "FFT complexity is not O(n log n), R² = {:.3}", r_squared);
    }
    
    #[test]
    fn test_optimization_improves_performance(
        expr in arb_complex_expression(10, 20)
    ) {
        const ITERATIONS: usize = 100;
        let env = random_environment();
        
        // Measure unoptimized
        let start = Instant::now();
        for _ in 0..ITERATIONS {
            let _ = black_box(evaluate_expression(&expr, &env));
        }
        let unopt_time = start.elapsed();
        
        // Measure optimized
        let optimized = optimize_expression(expr.clone());
        let start = Instant::now();
        for _ in 0..ITERATIONS {
            let _ = black_box(evaluate_expression(&optimized, &env));
        }
        let opt_time = start.elapsed();
        
        // Optimized should be faster (or at least not slower)
        prop_assert!(opt_time <= unopt_time,
            "Optimization made performance worse: {:.2}ms -> {:.2}ms",
            unopt_time.as_secs_f64() * 1000.0,
            opt_time.as_secs_f64() * 1000.0
        );
        
        // For complex expressions, expect at least 10% improvement
        if expr.complexity() > 50 {
            let improvement = 1.0 - (opt_time.as_secs_f64() / unopt_time.as_secs_f64());
            prop_assert!(improvement > 0.10,
                "Optimization improvement only {:.1}% on complex expression",
                improvement * 100.0
            );
        }
    }
}
```

**Success Metrics**:
- Performance regressions detected automatically
- Algorithmic complexity verified
- Optimization effectiveness measured

**Time Estimate**: 3 days

### 4.3 Adversarial and Fuzzing Tests

**Implementation**:
```rust
// sparky-core/tests/adversarial.rs

use arbitrary::{Arbitrary, Unstructured};

/// Custom fuzzer for constraint systems
#[derive(Debug, Arbitrary)]
struct FuzzedConstraintSystem {
    #[arbitrary(with = |u: &mut Unstructured| {
        // Generate pathological variable counts
        Ok(match u.int_in_range(0..=3)? {
            0 => 0,                    // Empty system
            1 => 1,                    // Single variable
            2 => u.int_in_range(1000..=10000)?, // Many variables
            3 => usize::MAX / 2,       // Near overflow
            _ => unreachable!(),
        })
    })]
    num_variables: usize,
    
    #[arbitrary(with = |u: &mut Unstructured| {
        generate_adversarial_constraints(u)
    })]
    constraints: Vec<Constraint>,
}

fn generate_adversarial_constraints(u: &mut Unstructured) -> Result<Vec<Constraint>, arbitrary::Error> {
    let pattern = u.int_in_range(0..=5)?;
    
    Ok(match pattern {
        0 => {
            // Cyclic dependencies
            vec![
                Constraint::new(vec![0, 1], vec![1, -1]),
                Constraint::new(vec![1, 2], vec![1, -1]),
                Constraint::new(vec![2, 0], vec![1, -1]),
            ]
        },
        1 => {
            // Exponential constraint explosion
            let n = u.int_in_range(10..=20)?;
            (0..n).flat_map(|i| {
                (0..n).map(move |j| {
                    Constraint::new(vec![i, j], vec![1, 1])
                })
            }).collect()
        },
        2 => {
            // Memory exhaustion attempt
            vec![Constraint::new(
                vec![0; 1_000_000],
                vec![1; 1_000_000],
            )]
        },
        3 => {
            // Numerical instability
            let mut coeffs = vec![];
            for i in 0..100 {
                coeffs.push(FieldElement::from(2u64).pow(&[i as u64]));
            }
            vec![Constraint::new((0..100).collect(), coeffs)]
        },
        4 => {
            // Random soup
            u.arbitrary()?
        },
        5 => {
            // Stack overflow attempt via deep recursion
            let mut constraints = vec![];
            let mut current = Constraint::new(vec![0], vec![1]);
            for _ in 0..1000 {
                current = Constraint::nested(current);
                constraints.push(current.clone());
            }
            constraints
        },
        _ => unreachable!(),
    })
}

#[test]
fn fuzz_constraint_system() {
    let mut buffer = [0u8; 1024 * 1024]; // 1MB of random data
    
    for _ in 0..10000 {
        rand::thread_rng().fill_bytes(&mut buffer);
        let u = Unstructured::new(&buffer);
        
        if let Ok(fuzzed) = FuzzedConstraintSystem::arbitrary_take_rest(u) {
            // System should not panic
            let result = std::panic::catch_unwind(|| {
                let mut system = ConstraintSystem::new();
                
                // Try to add variables (may fail gracefully)
                for i in 0..fuzzed.num_variables.min(10000) {
                    system.add_variable(FieldElement::from(i as u64));
                }
                
                // Try to add constraints
                for constraint in fuzzed.constraints {
                    let _ = system.try_add_constraint(constraint);
                }
                
                // Try to solve
                let _ = system.solve();
            });
            
            // Should handle adversarial input gracefully
            assert!(result.is_ok() || is_expected_error(&result),
                "Unexpected panic on fuzzed input: {:?}", fuzzed);
        }
    }
}

/// Resource exhaustion tests
proptest! {
    #[test]
    fn test_memory_exhaustion_handling(
        allocation_pattern in arb_allocation_pattern()
    ) {
        let mut allocator = MemoryLimitedAllocator::new(100 * 1024 * 1024); // 100MB limit
        
        let result = allocator.try_execute(|| {
            match allocation_pattern {
                AllocationPattern::Gradual(sizes) => {
                    let mut vecs = vec![];
                    for size in sizes {
                        vecs.push(vec![0u8; size]);
                    }
                },
                AllocationPattern::Spike(size) => {
                    let _ = vec![0u8; size];
                },
                AllocationPattern::Fragmented(count, size) => {
                    let mut vecs = vec![];
                    for _ in 0..count {
                        vecs.push(vec![0u8; size]);
                        if vecs.len() > 100 {
                            vecs.remove(0); // Create fragmentation
                        }
                    }
                },
            }
        });
        
        // Should fail gracefully, not crash
        prop_assert!(
            result.is_ok() || matches!(result, Err(AllocError::OutOfMemory)),
            "Unexpected error: {:?}", result
        );
    }
}
```

**Success Metrics**:
- Zero panics on fuzzed input
- Graceful handling of resource exhaustion
- All error paths tested

**Time Estimate**: 4 days

## Phase 5: Continuous Integration (Week 9-10)

### Priority: MEDIUM
Integrate all improvements into CI/CD pipeline.

### 5.1 CI Configuration

**Implementation**:
```yaml
# .github/workflows/property-tests.yml

name: Property-Based Testing Suite

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily comprehensive run

jobs:
  quick-props:
    name: Quick Property Tests (PR Check)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Quick Property Tests
        run: |
          cargo test --features testing,quick-check -- --test-threads=4
        env:
          PROPTEST_CASES: 100  # Reduced for PR checks
          
  full-props:
    name: Full Property Test Suite
    runs-on: ubuntu-latest
    timeout-minutes: 240  # 4 hours for comprehensive testing
    if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[full-props]')
    
    strategy:
      matrix:
        test-suite:
          - field-properties
          - cryptographic-properties
          - security-properties
          - performance-properties
          - adversarial-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run ${{ matrix.test-suite }}
        run: |
          cargo test --features testing,${{ matrix.test-suite }} \
            --release -- --test-threads=1 --nocapture
        env:
          PROPTEST_CASES: 10000
          PROPTEST_MAX_SHRINK_ITERS: 1000
          
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: proptest-regressions-${{ matrix.test-suite }}
          path: |
            **/proptest-regressions
            **/proptest-stats.json
            
  fuzz-testing:
    name: Continuous Fuzzing
    runs-on: ubuntu-latest
    timeout-minutes: 360  # 6 hours
    if: github.event_name == 'schedule'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Fuzzers
        run: |
          cargo install cargo-fuzz
          
          # Run each fuzzer for 1 hour
          for fuzzer in $(cargo fuzz list); do
            cargo fuzz run $fuzzer -- -max_total_time=3600 -max_len=1048576
          done
          
      - name: Check Coverage
        run: |
          cargo fuzz coverage
          
      - name: Upload Crashes
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: fuzzing-crashes
          path: fuzz/artifacts/
```

**Success Metrics**:
- All PRs pass quick property tests
- Daily full test runs complete successfully
- Fuzzing finds no new crashes

**Time Estimate**: 2 days

### 5.2 Performance Regression Detection

**Implementation**:
```rust
// sparky-core/benches/regression_detection.rs

use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};
use proptest::prelude::*;

fn benchmark_field_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("field_operations");
    group.significance_level(0.01); // 99% confidence
    group.sample_size(1000);
    
    // Generate diverse test inputs
    let inputs = generate_benchmark_inputs();
    
    for (name, (a, b)) in inputs {
        group.bench_with_input(
            BenchmarkId::new("multiply", &name),
            &(a, b),
            |bencher, (a, b)| {
                bencher.iter(|| black_box(a * b));
            }
        );
    }
    
    group.finish();
}

fn generate_benchmark_inputs() -> Vec<(&'static str, (FieldElement, FieldElement))> {
    vec![
        ("small_values", (
            FieldElement::from(42u64),
            FieldElement::from(137u64)
        )),
        ("large_values", (
            FieldElement::from_bytes(&[0xFF; 32]).unwrap(),
            FieldElement::from_bytes(&[0xAA; 32]).unwrap()
        )),
        ("mixed_montgomery", (
            FieldElement::MONTGOMERY_ONE,
            FieldElement::from(12345u64)
        )),
        ("special_values", (
            PallasF::GENERATOR,
            PallasF::TWO_ADIC_ROOT_OF_UNITY
        )),
    ]
}

// Automated regression detection
#[test]
fn test_no_performance_regression() {
    let baseline = load_baseline_results("performance-baseline.json")
        .expect("No baseline found - run benchmarks first");
    
    let current = run_benchmarks();
    
    for (operation, baseline_time) in baseline {
        let current_time = current.get(&operation)
            .expect("Operation missing from current results");
        
        let regression_threshold = 1.10; // Allow 10% variance
        let ratio = current_time / baseline_time;
        
        assert!(ratio <= regression_threshold,
            "Performance regression detected in {}: {:.2}x slower ({:.2}ns -> {:.2}ns)",
            operation, ratio, baseline_time, current_time
        );
    }
}
```

**Success Metrics**:
- Performance regressions caught before merge
- Baseline updated with each release
- Historical performance data tracked

**Time Estimate**: 2 days

## Summary and Success Metrics

### Overall Success Criteria

1. **Test Coverage**:
   - 100% of field value range covered
   - All cryptographic properties tested
   - Zero toy examples remaining

2. **Test Quality**:
   - Minimum 1000 cases per property
   - Proper shrinking strategies
   - Meaningful error messages

3. **Security**:
   - Constant-time verification working
   - All known attack vectors tested
   - Fuzzing finds no crashes

4. **Performance**:
   - No regressions > 10%
   - O(n log n) FFT verified
   - Optimization effectiveness measured

5. **Infrastructure**:
   - CI catches all issues
   - Tests run efficiently
   - Results properly tracked

### Phased Rollout Timeline

- **Week 1-2**: Critical security fixes (Phase 1)
- **Week 3-4**: Coverage expansion (Phase 2)  
- **Week 5-6**: Cryptographic properties (Phase 3)
- **Week 7-8**: Advanced infrastructure (Phase 4)
- **Week 9-10**: CI integration (Phase 5)

### Resource Requirements

- **Team**: 2-3 engineers with cryptographic testing experience
- **Infrastructure**: CI runners with 16+ cores for parallel testing
- **Time**: 8-10 weeks for full implementation
- **Ongoing**: 1 engineer for maintenance and monitoring

### Risk Mitigation

1. **Schedule Risk**: Prioritize phases by security impact
2. **Technical Risk**: Start with known working patterns
3. **Resource Risk**: Can be done incrementally with smaller team
4. **Quality Risk**: Each phase has independent value

This plan transforms Sparky's property-based testing from a liability into a comprehensive safety net suitable for production cryptographic software.