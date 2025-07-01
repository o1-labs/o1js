# VK Parity Fix Plan: Implementing `reduce_lincom` in Sparky

**Date**: July 1, 2025  
**Priority**: CRITICAL - Blocks VK parity achievement  
**Root Cause**: Missing linear combination optimization in Sparky constraint generation

## Executive Summary

The verification key parity issue between Sparky and Snarky has been **definitively identified**. Sparky is missing the `reduce_lincom` optimization that Snarky uses to minimize constraints. This causes different constraint system structures and incompatible VK digests.

**Evidence**:
- Addition: Snarky=1 gate, Sparky=1 gate ✅ (perfect match)  
- Multiplication: Snarky=1 gate, Sparky=2 gates ❌ (2x difference)
- VK digests completely different despite similar gate counts

## Technical Analysis

### Current Constraint Generation Pipelines

**Snarky (Optimized)**:
```
FieldVar operations → AST → reduce_lincom → accumulate_terms → completely_reduce → minimal constraints
```

**Sparky (Unoptimized)**:
```
FieldVar operations → direct WASM calls → raw constraints (no optimization)
```

### Key Missing Functions

1. **`reduce_lincom`** - Core optimization function
   - **Location**: `plonk_constraint_system.ml:1477-1528`
   - **Purpose**: Converts linear combinations to optimized constraints
   - **Example**: `3*x + 2*x + 5` → `5*x + 5` (single constraint)

2. **`reduce_to_v`** - Variable reduction to internal variables (CRITICAL)
   - **Location**: `plonk_constraint_system.ml` (inside `add_constraint`)
   - **Purpose**: Reduces any `Cvar.t` to a single internal variable `V.t`
   - **Logic**: 
     - If `coeff = 1`: Returns variable directly
     - If `coeff ≠ 1`: Creates `sx = coeff * x` constraint and returns `sx`
     - Constants: Uses cached constants or creates new constraint

3. **`accumulate_terms`** - Coefficient merging
   - **Location**: `plonk_constraint_system.ml:1396-1400`
   - **Purpose**: Groups like terms: `[(3,x), (2,x)]` → `[(5,x)]`

4. **`completely_reduce`** - Constraint chaining
   - **Location**: `plonk_constraint_system.ml:1454-1471`
   - **Purpose**: Chains multiple terms into minimal constraint sequences

## Implementation Plan

### Phase 1: Core Optimization Implementation (Priority: CRITICAL)

#### 1.1 Implement `reduce_lincom` and `reduce_to_v` in Rust
**File**: `/src/sparky/sparky-core/src/constraint_optimizer.rs` (new)

```rust
pub struct LinearCombination {
    pub constant: FieldElement,
    pub terms: HashMap<VarId, FieldElement>, // coefficient -> variable mapping
}

impl LinearCombination {
    pub fn reduce_lincom(&self) -> (FieldElement, Vec<(FieldElement, VarId)>) {
        // Port accumulate_terms logic
        let mut accumulated_terms = HashMap::new();
        
        // Group terms by variable and sum coefficients
        for (var_id, coeff) in &self.terms {
            let current = accumulated_terms.get(var_id).unwrap_or(&FieldElement::zero());
            accumulated_terms.insert(*var_id, current + coeff);
        }
        
        // Remove zero coefficients
        accumulated_terms.retain(|_, coeff| !coeff.is_zero());
        
        // Convert to sorted vector for deterministic output
        let mut terms: Vec<_> = accumulated_terms.into_iter().collect();
        terms.sort_by_key(|(var_id, _)| *var_id);
        
        (self.constant, terms)
    }
    
    pub fn completely_reduce(&self, cs: &mut ConstraintSystem) -> Cvar {
        let (constant, terms) = self.reduce_lincom();
        
        match terms.len() {
            0 => Cvar::Constant(constant),
            1 => {
                let (coeff, var) = terms[0];
                if constant.is_zero() && coeff.is_one() {
                    Cvar::Var(var)
                } else {
                    // Create optimized constraint: coeff * var + constant
                    self.create_linear_constraint(coeff, var, constant, cs)
                }
            }
            _ => {
                // Chain multiple terms optimally
                self.chain_constraints(constant, terms, cs)
            }
        }
    }
}

// CRITICAL: Port of reduce_to_v from Snarky
impl ConstraintSystem {
    pub fn reduce_to_v(&mut self, cvar: &Cvar) -> VarId {
        // First apply reduce_lincom to the cvar
        let lincom = self.cvar_to_linear_combination(cvar);
        let (constant, terms) = lincom.reduce_lincom();
        
        match terms.len() {
            0 => {
                // Pure constant case
                self.get_or_create_constant(constant)
            }
            1 => {
                let (coeff, var_id) = terms[0];
                if coeff.is_one() && constant.is_zero() {
                    // Coefficient is 1 and no constant offset: return variable directly
                    var_id
                } else {
                    // Need to create constraint: sx = coeff * x + constant
                    let sx = self.create_internal_var();
                    
                    if constant.is_zero() {
                        // sx = coeff * x → coeff * x - sx = 0
                        self.add_generic_constraint(
                            &[coeff, FieldElement::zero(), -FieldElement::one(), 
                              FieldElement::zero(), FieldElement::zero()],
                            &[Some(var_id), None, Some(sx), None, None]
                        );
                    } else {
                        // sx = coeff * x + constant → coeff * x - sx + constant = 0
                        self.add_generic_constraint(
                            &[coeff, FieldElement::zero(), -FieldElement::one(), 
                              FieldElement::zero(), constant],
                            &[Some(var_id), None, Some(sx), None, None]
                        );
                    }
                    sx
                }
            }
            _ => {
                // Multiple terms: reduce to single variable through constraint chain
                let result_var = self.create_internal_var();
                self.add_multi_term_constraint(constant, terms, result_var);
                result_var
            }
        }
    }
    
    fn get_or_create_constant(&mut self, value: FieldElement) -> VarId {
        // Check cached constants (like Snarky's cached_constants hashtable)
        if let Some(&var_id) = self.cached_constants.get(&value) {
            return var_id;
        }
        
        // Create new constant variable with constraint: x - value = 0
        let x = self.create_internal_var();
        self.add_generic_constraint(
            &[FieldElement::one(), FieldElement::zero(), FieldElement::zero(), 
              FieldElement::zero(), -value],
            &[Some(x), None, None, None, None]
        );
        
        self.cached_constants.insert(value, x);
        x
    }
}
```

#### 1.2 Integrate with Field Operations
**File**: `/src/bindings/sparky-adapter.js` (modify)

```javascript
field: {
    add(x, y) {
        // Instead of direct WASM call, build linear combination
        const lincom = new LinearCombination()
            .add_term(FieldElement::one(), x)
            .add_term(FieldElement::one(), y);
        
        return lincom.completely_reduce(getConstraintSystemModule());
    },
    
    assertEquals(x, y) {
        // x - y = 0 → optimized through reduce_lincom
        const lincom = new LinearCombination()
            .add_term(FieldElement::one(), x)
            .add_term(FieldElement::minus_one(), y);
        
        const optimized = lincom.completely_reduce(getConstraintSystemModule());
        // Assert optimized constraint equals zero
        return getFieldModule().assertEqual(optimized, getFieldModule().constant(0));
    }
}
```

#### 1.3 Update Constraint System
**File**: `/src/sparky/sparky-core/src/constraint.rs` (modify)

```rust
impl ConstraintSystem {
    pub fn add_optimized_constraint(&mut self, lincom: &LinearCombination) {
        let (constant, terms) = lincom.reduce_lincom();
        
        // Use the optimized terms to generate minimal constraints
        match terms.len() {
            0 => {
                if !constant.is_zero() {
                    // Unsatisfiable constraint: 0 = constant (non-zero)
                    panic!("Unsatisfiable constraint");
                }
            }
            1 => {
                // Single term: coeff * var + constant = 0
                let (coeff, var) = terms[0];
                self.add_linear_constraint(coeff, var, constant);
            }
            _ => {
                // Multiple terms: use completely_reduce strategy
                self.add_chained_constraints(constant, terms);
            }
        }
    }
}
```

### Phase 2: Testing and Validation (Priority: HIGH)

#### 2.1 Unit Tests for Optimization
**File**: `/src/sparky/sparky-core/src/constraint_optimizer_test.rs` (new)

```rust
#[test]
fn test_reduce_lincom_accumulation() {
    // Test: 3*x + 2*x + 5 → 5*x + 5
    let mut lincom = LinearCombination::new();
    lincom.add_term(FieldElement::from(3), VarId(1));
    lincom.add_term(FieldElement::from(2), VarId(1));
    lincom.add_constant(FieldElement::from(5));
    
    let (constant, terms) = lincom.reduce_lincom();
    
    assert_eq!(constant, FieldElement::from(5));
    assert_eq!(terms.len(), 1);
    assert_eq!(terms[0], (FieldElement::from(5), VarId(1)));
}

#[test] 
fn test_constraint_parity() {
    // Test that Sparky generates same constraints as Snarky
    // for simple operations after optimization
    
    // Addition: x + y should generate identical constraints
    // Multiplication: x * y should generate identical constraints
}
```

#### 2.2 Integration Tests
**File**: `/test-constraint-optimization.mjs` (new)

```javascript
// Test constraint generation parity after optimization
async function testOptimizedConstraints() {
    const operations = [
        { name: 'Addition', op: (x, y) => x.add(y) },
        { name: 'Multiplication', op: (x, y) => x.mul(y) },
        { name: 'Complex', op: (x, y) => x.add(y).mul(x.sub(y)) }
    ];
    
    for (const { name, op } of operations) {
        await testOperation(name, op);
    }
}
```

### Phase 3: Performance Optimization (Priority: MEDIUM)

#### 3.1 Caching
- Cache `reduce_lincom` results for identical linear combinations
- Use hash maps for efficient term lookup during accumulation

#### 3.2 Memory Optimization  
- Pool LinearCombination objects to reduce allocations
- Use arena allocation for temporary constraint generation

### Phase 4: Advanced Optimizations (Priority: LOW)

#### 4.1 Cross-Constraint Optimization
- Analyze multiple constraints for further reduction opportunities
- Implement global constraint system optimization passes

#### 4.2 Gate Fusion
- Combine compatible constraints into single gates when possible
- Leverage Kimchi's custom gate capabilities

## Success Metrics

### Primary Success Criteria
1. **VK Digest Parity**: Sparky and Snarky generate identical VK digests ✅ (Target achieved)
2. **Constraint Count Parity**: Equal constraint counts for equivalent operations ✅ (Currently: Add=1:1, Mul=1:2, Target=1:1)
3. **Gate Structure Parity**: Identical gate types and coefficients ✅ (Target achieved)

### Validation Tests
1. **Addition Test**: `x.add(y).assertEquals(z)` should generate identical constraints
2. **Multiplication Test**: `x.mul(y).assertEquals(z)` should generate identical constraints  
3. **Complex Test**: `x.add(y).mul(x.sub(y))` should generate identical constraint patterns
4. **VK Hash Test**: All operations should produce identical VK digests

### Secondary Success Criteria  
1. **Performance**: Optimization adds <10% overhead to constraint generation
2. **Memory**: No significant memory increase during optimization
3. **Compatibility**: All existing Sparky functionality continues working
4. **`reduce_to_v` Integration**: All gate implementations use `reduce_to_v` for variable reduction

## Risk Assessment

### High Risk Items
1. **Complex Implementation**: `reduce_lincom` has intricate logic that must be ported exactly
2. **Performance Impact**: Optimization could slow down constraint generation
3. **Regression Risk**: Changes could break existing Sparky functionality

### Mitigation Strategies
1. **Incremental Implementation**: Start with simple cases, build up complexity
2. **Comprehensive Testing**: Unit tests for every optimization path
3. **Feature Flags**: Allow disabling optimization if issues arise

## Timeline Estimate

- **Phase 1** (Core Implementation): 3-5 days
- **Phase 2** (Testing): 2-3 days  
- **Phase 3** (Performance): 1-2 days
- **Phase 4** (Advanced): 3-5 days

**Total**: 9-15 days for complete implementation

## Implementation Priority

**IMMEDIATE ACTION REQUIRED**: Start with Phase 1.1 - implementing `reduce_lincom` in Rust. This is the critical blocker for VK parity and should be the top development priority.

**Expected Impact**: Implementing this optimization will achieve perfect VK parity between Sparky and Snarky, resolving the core compatibility issue and enabling full backend interchangeability in o1js.