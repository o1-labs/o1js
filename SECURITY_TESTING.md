# Security Testing Guide for o1js/Sparky

**⚠️ IMPORTANT DISCLAIMER**: This document describes security testing approaches for o1js/Sparky. While we strive for comprehensive coverage, **no test suite can guarantee complete security**. Professional cryptographic audits and formal verification are essential for production systems.

This document describes the security testing approach for ensuring Sparky's cryptographic soundness and helping identify potential vulnerabilities.

## Overview

Our security testing strategy uses property-based testing (PBT) to verify cryptographic properties that, if broken, could lead to practical attacks on zero-knowledge proof systems. The tests are designed to catch:

1. **Mathematical Incorrectness** - Violations of field arithmetic laws
2. **Timing Attacks** - Information leakage through execution time
3. **Constraint System Vulnerabilities** - Ways to create invalid proofs
4. **Implementation Flaws** - Memory safety, determinism, error handling
5. **Cross-Backend Inconsistencies** - Differences between Snarky and Sparky

## Test Categories

### 1. Rust Security Properties (`sparky-core/tests/security_properties.rs`)

These tests verify low-level security properties using proptest. Most properties now use 1000+ test cases after audit improvements (previously some used only 100-256).

**✅ NEW PROPERTIES ADDED (July 2025)**:
- **Proof Soundness** (Property 14): Verifies cannot create valid proofs for false statements
- **Witness Extraction Resistance** (Property 15): Tests information-theoretic witness privacy
- **Differential Cryptanalysis Resistance** (Property 16): Verifies avalanche effect
- **Constraint System Non-Malleability** (Property 17): Cannot modify proofs for different statements
- **Resource Exhaustion Protection** (Property 18): Graceful handling under adversarial load

**Existing Properties**:

- **Timing Attack Resistance**: **⚠️ LIMITED** - Provides statistical analysis of timing variance
  - **IMPORTANT**: Rust/JavaScript timing measurements cannot detect real timing attacks
  - Real constant-time verification requires specialized tools (valgrind/ctgrind, dudect)
  - Tests only verify rough statistical consistency, not cryptographic constant-time
- **Canonical Representation**: Verifies unique field element representation
- **Determinism**: Same inputs always produce same constraints
- **Witness Uniqueness**: Ensures witnesses are unique for given constraints
- **Malleability Resistance**: Prevents constraint manipulation attacks
- **Invalid Input Handling**: Graceful handling of malicious inputs
- **Memory Safety**: Tests deterministic computation and serialization round-trips
  - Verifies operations produce consistent results
  - Checks field element validity through serialization
  - **Fixed**: Previous version had tautological assertion
- **Resource Bounds**: Prevents DoS through resource exhaustion
- **Zero-Knowledge**: Basic verification that witness values don't appear in annotations
  - Checks constraints don't directly expose secret values
  - **NOTE**: This is a basic check, not a formal ZK proof
- **Algebraic Attack Resistance**: Resists common algebraic attacks
- **Side-Channel Resistance**: **⚠️ VERY LIMITED** - Tests data-independent execution
  - Cannot detect physical side channels (power, EM, cache)
  - Only verifies operations don't branch on secret data
  - Real side-channel analysis requires specialized hardware/tools

### 2. TypeScript Security Tests

#### Backend Security Parity (`src/test/security/backend-security-parity.test.ts`)

Verifies that Sparky and Snarky have identical security properties.

**⚠️ LIMITATION**: If both backends share a vulnerability, these tests will pass. Backend parity ≠ security.

- **Timing Consistency**: **⚠️ NOT CRYPTOGRAPHICALLY MEANINGFUL**
  - JavaScript `performance.now()` has ~microsecond precision (need nanoseconds)
  - V8 JIT, GC, and OS scheduling add massive variance
  - Cannot detect real timing attacks in JavaScript
- **Error Message Safety**: No sensitive information in error messages
- **Constraint Non-Malleability**: Cannot forge proofs
- **Deterministic Behavior**: Identical results for same inputs
- **Resource Protection**: Consistent handling of resource-intensive operations
- **Witness Privacy**: Cannot extract witness values
- **Cryptographic Consistency**: Identical results for all crypto operations
- **Attack Vector Handling**: Same response to common attacks

#### Cryptographic Properties (`src/test/security/cryptographic-properties.test.ts`)

High-level cryptographic property verification using fast-check.

**⚠️ NOTE**: These test mathematical properties, not computational security:

- **Field Homomorphism**: Algebraic structure preservation
- **Discrete Log Hardness**: **⚠️ MISLEADING NAME** - Only verifies g^x produces different outputs
  - Does NOT test computational hardness
  - No baby-step giant-step or Pollard rho attempts
  - Should be renamed to "Exponentiation Distinctness"
- **Hash Collision Resistance**: No practical collisions in Poseidon
- **Hash Avalanche Effect**: Small input changes cause large output changes
- **EC Security**: Elliptic curve operations maintain group structure
- **Signature Unforgeability**: Cannot create valid signatures without private key
- **Zero-Knowledge**: Proofs don't reveal witness information
- **Merkle Tree Security**: Cannot forge Merkle proofs
- **Range Check Soundness**: Range checks are mathematically sound
- **Constraint Soundness**: Cannot satisfy contradictory constraints

### 3. Attack Vector Testing

The test suite includes specific attack scenarios:

- **Integer Overflow/Underflow**: Field arithmetic wrapping behavior
- **Division by Zero**: Proper error handling
- **Invalid Field Elements**: Rejection of out-of-range values
- **Timing Attacks**: Consistent execution time
- **Resource Exhaustion**: DoS protection
- **Constraint Manipulation**: Proof forgery attempts
- **Type Confusion**: Mixing incompatible types
- **Memory Corruption**: Buffer overflows, use-after-free

## Running Security Tests

### Quick Security Audit
```bash
./run-security-tests.sh
```

This runs all security tests and generates a report at `security-test-report.md`.

### Individual Test Suites

**Rust Security Tests:**
```bash
cd src/sparky
cargo test --test security_properties --features testing
```

**TypeScript Security Tests:**
```bash
npm run test src/test/security/backend-security-parity.test.ts
npm run test src/test/security/cryptographic-properties.test.ts
```

**Timing Analysis:**
```bash
cd src/sparky
cargo bench --bench field_operations_bench
```

## Interpreting Results

### What to Look For

1. **Timing Variance**: Low coefficient of variation (<0.1) indicates consistent timing
   - **WARNING**: <0.5 (50%) was far too permissive
   - **CRITICAL**: This does NOT prove constant-time execution
   - Only indicates rough statistical consistency
2. **Property Violations**: Any failed property test indicates a potential vulnerability
3. **Backend Differences**: Sparky and Snarky should behave identically
4. **Resource Usage**: Linear scaling with input size, no exponential growth
5. **Error Messages**: Should not contain values, addresses, or implementation details

### Security Severity Levels

- **CRITICAL**: Mathematical incorrectness, proof forgery, witness extraction
- **HIGH**: Non-determinism, constraint malleability, proven timing attacks
- **MEDIUM**: Resource exhaustion, error information leakage, statistical timing anomalies
- **LOW**: Performance differences, non-security error handling

**⚠️ NOTE**: "Timing attacks" moved from HIGH to proven-only, as our tests cannot reliably detect them

## Best Practices

1. **Run Before Every Release**: Execute full security test suite
2. **Add Tests for New Features**: Every cryptographic feature needs security tests
3. **Monitor Performance**: Timing changes may indicate security issues
4. **Review Failed Tests**: Never ignore security test failures
5. **Update Attack Vectors**: Add new attack patterns as discovered

## Example: Adding a New Security Test

```rust
// In sparky-core/tests/security_properties.rs
proptest! {
    #[test]
    fn test_new_security_property(
        input in arb_malicious_field_element()
    ) {
        // Test implementation
        prop_assert!(/* security property holds */);
    }
}
```

```typescript
// In src/test/security/cryptographic-properties.test.ts
test('New cryptographic property', () => {
  fc.assert(
    fc.property(arbField, (input) => {
      // Verify property
      expect(/* property holds */).toBe(true);
    }),
    { numRuns: 1000 }
  );
});
```

## Security Checklist

Before marking Sparky as production-ready:

- [ ] All mathematical properties pass with 1000+ test cases
- [ ] Statistical timing consistency verified (NOT cryptographic constant-time)
- [ ] No information leakage in error messages
- [ ] Identical behavior to Snarky for all operations
- [ ] Resource usage is bounded and predictable
- [ ] All attack vectors are properly handled
- [ ] Zero-knowledge properties are maintained (basic level)
- [ ] Deterministic behavior is verified
- [ ] Memory safety is confirmed under stress
- [ ] Cross-platform consistency is verified
- [ ] **CRITICAL**: Professional cryptographic audit completed
- [ ] **CRITICAL**: Formal verification of core properties
- [ ] **CRITICAL**: Hardware side-channel analysis performed

## Continuous Security Monitoring

1. **Automated Testing**: Run security tests in CI/CD pipeline
2. **Benchmark Tracking**: Monitor performance for timing anomalies
3. **Fuzzing**: Use cargo-fuzz for continuous vulnerability discovery
4. **Code Review**: Security-focused review of all changes
5. **Dependency Audit**: Regular security audits of dependencies

## Resources

- [Property-Based Testing in Rust](https://proptest-rs.github.io/proptest/)
- [Fast-Check for TypeScript](https://github.com/dubzzz/fast-check)
- [Constant-Time Cryptography](https://bearssl.org/constanttime.html)
- [Zero-Knowledge Security](https://www.zkdocs.com/docs/zkdocs/)
- [Side-Channel Attacks](https://en.wikipedia.org/wiki/Side-channel_attack)