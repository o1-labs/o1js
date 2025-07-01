# Sparky Constraint Generation Fix Implementation Plan

## Executive Summary

To achieve verification key (VK) parity between Sparky and Snarky, we need to fix Sparky's constraint generation pipeline to match Snarky's AST-based optimization approach. Based on extensive analysis in BLARG.md and SNARKY_CONSTRAINTS.md, the core issue is that Sparky's WASM `assertEqual` method bypasses the optimization pipeline entirely, generating incorrect constraints like `a - b = 0` instead of `a + b - c = 0` for expressions like `a.add(b).assertEquals(c)`.

## Problem Analysis

### Current State (BLARG.md Findings)
- **Snarky**: `a.add(b).assertEquals(c)` → AST nodes → `reduce_lincom` → single optimized constraint `[1, 1, -1, 0, 0]`
- **Sparky**: `a.add(b).assertEquals(c)` → WASM `assertEqual(x, y)` → direct constraint generation → wrong constraint `[1, -1, 0, 0, 0]` (i.e., `a - b = 0`)

### Root Cause Discovery (The Real Issue)
**CRITICAL FINDING**: The actual constraint generation bypasses all the optimization code entirely!

1. `a.add(b).assertEquals(c)` calls `sparky-adapter.js:assertEqual(x, y)`
2. This calls `getFieldModule().assertEqual(x, y)` (WASM method)  
3. **This is NOT the same as the Rust constraint optimization logic**
4. The WASM `assertEqual` method generates constraints directly
5. **It completely bypasses the `to_kimchi_json` constraint-to-gate conversion**
6. **It completely bypasses the `equal_to_generic_gate` pattern matching**
7. **It completely bypasses any `reduce_lincom` optimization**

### Evidence from BLARG.md
- Added debug output to multiple WASM `toJson` methods - **NONE appear in test output**
- Added debug output to Rust constraint optimization functions - **NOT called**
- **The entire optimization pipeline is bypassed**

### What Works (SNARKY_CONSTRAINTS.md Analysis)
Snarky's correct pipeline:
1. **Field Addition Creates AST Nodes**: `a.add(b)` → `[FieldType.Add, a, b]` AST node
2. **assertEquals Triggers Constraint Generation**: Calls `assertEqualCompatible`
3. **AST Reduction via reduceToScaledVar**: `toLinearCombination(x)` flattens `Add(a, b)` to `{ constant: 0n, terms: [[1n, a], [1n, b]] }`
4. **Generic Gate Constraint**: Single constraint with `{ left: 1n, right: 1n, out: -1n, mul: 0n, const: 0n }`

## Implementation Strategy

### Phase 1: Implement Core Reduction Functions in Rust

#### 1.1 Implement `reduce_lincom` Function
**Location**: `src/sparky/sparky-core/src/linear_combination.rs`

**Purpose**: Flatten AST expressions into linear combinations (sum of scaled variables)

**Signature**:
```rust
pub fn reduce_lincom(expr: &FieldVar) -> LinearCombination {
    // Convert AST nodes like Add(a, b) to { constant: 0, terms: [(1, a), (1, b)] }
}

pub struct LinearCombination {
    pub constant: Field,
    pub terms: Vec<(Field, Var)>, // (coefficient, variable)
}
```

**Implementation**:
- Recursively traverse FieldVar AST nodes
- Handle Add, Scale, Constant cases
- Flatten nested expressions into single linear combination
- Match Snarky's `toLinearCombination` behavior

#### 1.2 Implement `reduce_to_v` Function  
**Location**: `src/sparky/sparky-core/src/linear_combination.rs`

**Purpose**: Reduce linear combinations to single variables when possible

**Signature**:
```rust
pub fn reduce_to_v(lc: &LinearCombination) -> ReducedVar {
    // Convert linear combination to single variable or create witness
}

pub enum ReducedVar {
    Var(Var),                    // Single variable
    ScaledVar(Field, Var),       // Scaled single variable  
    LinearCombination(LinearCombination), // Complex combination needing witness
}
```

**Implementation**:
- Check if linear combination is just a single (scaled) variable
- If complex, create witness variable and add constraint
- Match Snarky's `reduceToScaledVar` behavior

### Phase 2: Integrate into Constraint Generation Pipeline

#### 2.1 Modify WASM Field Module
**Location**: `src/sparky/sparky-wasm/src/field.rs`

**Current Problem**:
```rust
#[wasm_bindgen]
impl Field {
    pub fn assert_equal(&self, x: &JsValue, y: &JsValue) {
        // Direct constraint generation - WRONG
        // This bypasses all AST optimization and generates incorrect constraints
        self.add_constraint(/* x - y = 0 */);
    }
}
```

**New Implementation**:
```rust
#[wasm_bindgen] 
impl Field {
    pub fn assert_equal(&self, x: &JsValue, y: &JsValue) {
        // 1. Parse FieldVar AST from JsValue
        let x_ast = parse_fieldvar_from_js(x);
        let y_ast = parse_fieldvar_from_js(y);
        
        // 2. Reduce both sides to linear combinations
        let lc_x = reduce_lincom(&x_ast);
        let lc_y = reduce_lincom(&y_ast);
        
        // 3. Create constraint: lc_x - lc_y = 0
        let constraint_lc = subtract_linear_combinations(&lc_x, &lc_y);
        
        // 4. Generate optimized constraint
        self.add_linear_combination_constraint(constraint_lc);
    }
}
```

#### 2.2 Implement AST Detection
**Location**: `src/sparky/sparky-wasm/src/ast_parser.rs` (new file)

**Purpose**: Parse JavaScript FieldVar arrays back into AST representation

**Functions**:
```rust
pub fn parse_fieldvar_from_js(js_val: &JsValue) -> FieldVar {
    // Parse [type, ...args] arrays back to AST nodes
    // Handle: [0, constant], [1, var], [2, [type, left, right]] for Add
}

pub fn detect_ast_pattern(fieldvar: &FieldVar) -> ASTPattern {
    // Detect common patterns: Add, Scale, Mul, etc.
}
```

### Phase 3: Lazy Evaluation Implementation (If Needed)

#### 3.1 Assess Current AST Preservation
- **Test**: Check if `a.add(b)` creates AST nodes or immediate constraints
- **BLARG.md indicates**: Add nodes ARE preserved as `[2, [1, 0], [1, 1]]`
- **Conclusion**: AST is already preserved, lazy evaluation may not be needed

#### 3.2 Implement Lazy Evaluation (Fallback)
If AST nodes are being prematurely evaluated:

**Location**: `src/sparky/sparky-core/src/lazy_eval.rs` (new file)

**Strategy**:
- Modify field operations to return AST nodes instead of creating constraints
- Only generate constraints when `assert_equal` or similar constraint methods are called
- Implement deferred constraint generation queue

### Phase 4: Integration and Testing

#### 4.1 Update sparky-adapter.js
**Location**: `src/bindings/sparky-adapter.js`

**Current**:
```javascript
assertEqual(x, y) {
    getFieldModule().assertEqual(x, y);
}
```

**Enhanced** (minimal changes needed if WASM handles AST properly):
```javascript
assertEqual(x, y) {
    // Add debug logging to verify AST preservation
    console.log("SPARKY assertEqual - x:", x, "y:", y);
    getFieldModule().assertEqual(x, y);
}
```

#### 4.2 Comprehensive Testing
**Location**: Create new test file `test-constraint-generation-parity.ts`

**Test Cases**:
1. `a.add(b).assertEquals(c)` → Should generate `[1, 1, -1, 0, 0]`
2. `a.sub(b).assertEquals(c)` → Should generate `[1, -1, -1, 0, 0]`
3. `a.mul(b).assertEquals(c)` → Should generate `[0, 0, -1, 1, 0]`
4. Complex expressions: `a.add(b).add(c).assertEquals(d)`
5. Constant folding: `a.add(5).assertEquals(b)`

## Implementation Order

### Week 1: Core Functions
1. **Day 1-2**: Implement `reduce_lincom` in Rust
2. **Day 3-4**: Implement `reduce_to_v` in Rust  
3. **Day 5**: Unit tests for reduction functions

### Week 2: WASM Integration
1. **Day 1-2**: Implement AST parser for JavaScript FieldVar
2. **Day 3-4**: Modify WASM `assert_equal` method
3. **Day 5**: Integration testing

### Week 3: Testing and Validation
1. **Day 1-2**: Comprehensive constraint generation tests
2. **Day 3-4**: VK parity validation
3. **Day 5**: Performance benchmarking

## Success Criteria

### Primary Goals
- ✅ `a.add(b).assertEquals(c)` generates constraint with coefficients `[1, 1, -1, 0, 0]`
- ✅ Constraint system digest matches Snarky for all test cases
- ✅ VK parity achieved for all supported operations

### Secondary Goals
- ✅ Performance within 10% of current Sparky implementation
- ✅ No regressions in existing functionality
- ✅ Clean, maintainable code structure

## Risk Mitigation

### High Risk: AST Information Loss
**Risk**: JavaScript ↔ WASM boundary may lose AST structure
**Mitigation**: Implement robust AST serialization/deserialization

### Medium Risk: Performance Impact
**Risk**: Additional AST processing may slow down constraint generation
**Mitigation**: Optimize hot paths, benchmark extensively

### Low Risk: Snarky Compatibility
**Risk**: Subtle differences in reduction algorithms
**Mitigation**: Direct port of Snarky's reduction logic, extensive testing

## Fallback Plan

If AST-based approach proves too complex:

1. **Pattern Recognition**: Detect common patterns in WASM `assertEqual`
2. **Special Cases**: Handle `Add(a, b) = c` as special case
3. **Incremental Fix**: Fix most common constraint generation issues first

## Files to Create/Modify

### New Files
- `src/sparky/sparky-core/src/linear_combination.rs`
- `src/sparky/sparky-wasm/src/ast_parser.rs`
- `src/sparky/sparky-core/src/lazy_eval.rs` (if needed)
- `test-constraint-generation-parity.ts`

### Modified Files
- `src/sparky/sparky-wasm/src/field.rs`
- `src/sparky/sparky-core/src/lib.rs`
- `src/bindings/sparky-adapter.js` (minor updates)

## Expected Outcome

Upon completion, Sparky will:
1. **Generate identical constraints** to Snarky for all AST expressions
2. **Achieve VK parity** enabling proof compatibility
3. **Maintain performance** characteristics
4. **Enable future native gate implementations** with proper constraint foundation

This implementation will unlock the full potential of Sparky by fixing the fundamental constraint generation mismatch that currently prevents VK parity with Snarky.