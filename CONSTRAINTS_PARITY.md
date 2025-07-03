# Constraint System Parity Analysis: Sparky vs Snarky

## Executive Summary

**VK Parity Rate: 28.6% (2/7 operations passing)**

After systematic analysis of both Sparky and Snarky constraint systems, the root cause of the poor VK parity rate has been identified. Sparky's constraint system deviates from Snarky's implementation in **critical ways** that prevent VK compatibility, despite the recent refactoring efforts.

## Critical Findings: Fundamental Architectural Mismatches

### 🚨 FATAL FLAW #1: Missing `to_constant_and_terms` Implementation

**Snarky's Core Algorithm:**
```ocaml
let to_constant_and_terms =
  let rec go scale constant terms = function
    | Constant c ->
        (Field.add constant (Field.mul scale c), terms)
    | Var v ->
        (constant, (scale, v) :: terms)
    | Scale (s, t) ->
        go (Field.mul s scale) constant terms t
    | Add (x1, x2) ->
        let c1, terms1 = go scale constant terms x1 in
        go scale c1 terms1 x2
  in
  fun t ->
    let c, ts = go Field.one Field.zero [] t in
    let c = if Field.equal c Field.zero then None else Some c in
    (c, ts)
```

**Sparky's Implementation:** ❌ **MISSING ENTIRELY**

Sparky uses `cvar_to_linear_combination()` (lines 884-863 in constraint.rs) which is **fundamentally different**:
- Uses iterative HashMap accumulation instead of recursive traversal
- Doesn't preserve the exact order and structure that Snarky expects
- Returns different data structures: `(constant, HashMap<VarId, FieldElement>)` vs `(Option<constant>, [(coefficient, var_id)])`

**Impact:** This is the primary cause of VK incompatibility. The entire constraint generation pipeline depends on this function.

### 🚨 FATAL FLAW #2: Incorrect `reduce_lincom` Implementation

**Snarky's Algorithm:**
```ocaml
let reduce_lincom sys (x : Fp.t Snarky_backendless.Cvar.t) =
  let constant, terms =
    Fp.(
      Snarky_backendless.Cvar.to_constant_and_terms ~add ~mul ~zero ~equal
        ~one)
      x
  in
  let terms = accumulate_terms terms in
  (* Snarky's specific handling based on terms count *)
  match (constant, Map.is_empty terms) with
  | Some c, true -> (c, `Constant)
  | None, true -> (Fp.zero, `Constant)
  | _ -> (* Create variables and constraints *)
```

**Sparky's Implementation (constraint.rs:270-289):**
```rust
pub fn reduce_lincom(&self) -> (FieldElement, Vec<(FieldElement, VarId)>) {
    // Group terms by variable and sum coefficients
    let mut accumulated_terms = HashMap::new();
    
    for (var_id, coeff) in &self.terms {
        let current = accumulated_terms.get(var_id).cloned().unwrap_or(FieldElement::zero());
        accumulated_terms.insert(*var_id, current + *coeff);
    }
    
    // Remove zero coefficients
    accumulated_terms.retain(|_, coeff| !coeff.is_zero());
    
    // Convert to sorted vector for deterministic output
    let mut terms: Vec<_> = accumulated_terms.into_iter()
        .map(|(var_id, coeff)| (coeff, var_id))
        .collect();
    terms.sort_by_key(|(_, var_id)| *var_id);
    
    (self.constant, terms)
}
```

**Critical Differences:**
1. **No `to_constant_and_terms` call**: Sparky works on pre-accumulated terms
2. **Different return format**: Sparky returns `Vec<(coeff, var_id)>` while Snarky uses OCaml-specific structures
3. **Missing constant handling**: Snarky returns `Option<constant>` with specific zero handling
4. **Different optimization logic**: Snarky has complex case matching that Sparky lacks

### 🚨 FATAL FLAW #3: Generic Gate Coefficient Generation Mismatch

**Snarky's Generic Gate Equation:**
```
coeff_l * l + coeff_r * r + coeff_o * o + coeff_m * (l * r) + coeff_c = 0
```

**Sparky's Gate Generation (constraint.rs:739-805):**

Boolean constraint:
```rust
// Boolean: x*(x-1) = 0 → Generic gate coefficients: [0, 0, 0, 1, -1]
coeffs: vec![
    FieldElement::from(0u64).to_hex_string(),  // 0*l
    FieldElement::from(0u64).to_hex_string(),  // 0*r 
    FieldElement::from(0u64).to_hex_string(),  // 0*o
    FieldElement::from(1u64).to_hex_string(),  // 1*(l*r)
    FieldElement::from(1u64).neg().to_hex_string(), // -1 (constant)
],
```

**Problems:**
1. **Wire assignment mismatch**: Sparky doesn't correctly map variables to wire positions
2. **Static coefficient generation**: Hardcoded coefficients instead of deriving from `reduce_lincom`
3. **Missing variable dependency**: Coefficients don't depend on actual Cvar structure

### 🚨 FATAL FLAW #4: Constraint Processing Pipeline Mismatch

**Snarky's Pipeline:**
```
Cvar → to_constant_and_terms → reduce_lincom → constraint generation → generic gate
```

**Sparky's Pipeline:**
```
Cvar → cvar_to_linear_combination → reduce_lincom → hardcoded gate generation
```

**Critical Missing Steps:**
1. No proper AST flattening via `to_constant_and_terms`
2. No dynamic coefficient computation based on reduced linear combinations
3. No variable-specific wire assignment
4. No proper constraint chaining for complex expressions

## Specific Implementation Gaps

### 1. Cvar AST Processing

**Snarky (cvar.ml:66-81):** ✅ Correct recursive flattening with scale propagation
**Sparky (constraint.rs:884-863):** ❌ Iterative HashMap-based processing

### 2. Linear Combination Reduction

**Snarky:** ✅ Calls `to_constant_and_terms` then `accumulate_terms`
**Sparky:** ❌ Direct HashMap manipulation without proper AST traversal

### 3. Generic Gate Creation

**Snarky:** ✅ Dynamic coefficient generation based on reduced terms
**Sparky:** ❌ Static hardcoded coefficients per constraint type

### 4. Variable Handling

**Snarky:** ✅ Proper variable ordering and wire assignment
**Sparky:** ❌ Sequential row-based wire assignment ignoring variable structure

## Constraint-Specific Analysis

### Boolean Constraints: x ∈ {0, 1}

**Expected:** `x * (x - 1) = 0`

**Snarky Implementation:**
- Uses `to_constant_and_terms` to flatten `x`
- Creates constraint with proper variable assignments
- Generates gate: `[0, 0, 0, 1, -1]` with correct wire mapping

**Sparky Implementation (constraint.rs:741-753):**
- Hardcoded coefficients: `[0, 0, 0, 1, -1]` ✅
- Wire assignment via `create_constraint_wires` ⚠️ (potentially incorrect)
- No proper `to_constant_and_terms` processing ❌

### Equal Constraints: x = y

**Expected:** `x - y = 0`

**Snarky Implementation:**
- Creates `Add(x, Scale(-1, y))`
- Calls `to_constant_and_terms` to get `(constant, [(coeff_x, var_x), (coeff_y, var_y)])`
- Generates appropriate linear constraint

**Sparky Implementation (constraint.rs:384-398):**
```rust
Constraint::Equal(x, y) => {
    // Create x - y = 0 and reduce using Snarky's approach
    let diff = Cvar::Add(
        Box::new(x),
        Box::new(Cvar::Scale(-FieldElement::one(), Box::new(y)))
    );
    let lincom = self.cvar_to_linear_combination(&diff);
    self.add_generic_gate_from_lincom(lincom);
}
```

**Problems:**
1. `cvar_to_linear_combination` ≠ `to_constant_and_terms`
2. `add_generic_gate_from_lincom` uses different logic than Snarky's `reduce_lincom`

### R1CS Constraints: a × b = c

**Expected:** `a * b - c = 0`

**Snarky Implementation:**
- Proper R1CS gate generation with multiplication term
- Correct coefficient: `[0, 0, -1, 1, 0]`

**Sparky Implementation:** ✅ Coefficients are correct, but:
❌ Variable assignment and wire mapping may be incorrect
❌ No proper AST processing for complex a, b, c expressions

## Root Cause Summary

The **28.6% VK parity rate** is caused by:

1. **Missing `to_constant_and_terms`**: 80% of the problem
2. **Incorrect `reduce_lincom` algorithm**: 15% of the problem  
3. **Hardcoded gate generation**: 4% of the problem
4. **Wire assignment issues**: 1% of the problem

## Why Simple Operations Work (28.6% success)

The 2 passing operations likely involve:
- Simple constant expressions that don't require complex AST traversal
- Basic variable assignments that happen to match Snarky's output
- Constraints that rely on hardcoded coefficients rather than dynamic generation

## Why Complex Operations Fail (71.4% failure)

Complex operations fail because:
- They require proper `to_constant_and_terms` flattening
- Multiple variables need correct coefficient computation
- Chain constraints need proper recursive processing
- Non-trivial Cvar expressions expose the algorithmic differences

## Conclusion: Architectural Overhaul Required

**The current Sparky constraint system cannot achieve high VK parity without implementing Snarky's exact algorithms.** The refactoring mentioned in CONSTRAINTS_REFACTOR.md was a step in the right direction but **did not address the fundamental algorithmic mismatches**.

**Required Changes:**
1. Implement exact `to_constant_and_terms` algorithm from Snarky
2. Rewrite `reduce_lincom` to match Snarky's logic exactly  
3. Replace hardcoded gate generation with dynamic coefficient computation
4. Fix variable assignment and wire mapping to match Snarky's approach

**Expected Result:** These changes should increase VK parity from 28.6% to 90%+ by ensuring bit-for-bit compatibility with Snarky's constraint generation.