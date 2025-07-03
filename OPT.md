# CVar Optimization Analysis: Snarky vs Sparky

**Date**: July 3, 2025  
**Author**: Analysis of constraint variable (CVar) optimization differences

## Executive Summary

Snarky implements sophisticated CVar optimizations that Sparky has only partially adopted. The most critical difference is **constraint batching**, which reduces gate count by ~50% in Snarky but is not fully activated in Sparky. This explains why Sparky generates 2-3x more constraints and achieves only 14.3% VK parity.

## Key Optimization Techniques

### 1. Constraint Batching (Critical Gap)

**Snarky Implementation** (`plonk_constraint_system.ml:1428-1437`):
```ocaml
let add_generic_constraint ?l ?r ?o coeffs sys : unit =
  match sys.pending_generic_gate with
  | None ->
      sys.pending_generic_gate <- Some (l, r, o, coeffs)
  | Some (l2, r2, o2, coeffs2) ->
      let coeffs = Array.append coeffs coeffs2 in
      add_row sys [| l; r; o; l2; r2; o2 |] Generic coeffs ;
      sys.pending_generic_gate <- None
```

**Impact**: Batches 2 generic constraints into 1 gate, reducing total gate count by ~50%

**Sparky Status**: Structure exists (`PendingGenericGate` at `constraint.rs:84-89`) but batching logic not activated

### 2. Union-Find for Variable Equality

**Both Implement**: Tracks equivalent variables to eliminate redundant equality constraints

**Snarky** (`plonk_constraint_system.ml:848`):
- Integrated into constraint system
- Aggressively merges equivalent variables
- Updates permutation cycles accordingly

**Sparky** (`constraint.rs:10-71`):
- Full Union-Find implementation exists
- Recently implemented (July 3, 2025)
- May not be as aggressively applied

**Impact**: Can reduce constraint count by 30-50% for circuits with many equalities

### 3. Linear Combination Simplification

**Both Implement**: `to_constant_and_terms` algorithm to flatten nested Add/Scale operations

**Sparky** (`constraint.rs:219-268`):
- Exact port of Snarky's algorithm
- Enables other optimizations by normalizing expressions

### 4. Constant Caching

**Both Implement**: Cache variables representing constants to avoid duplicates

**Snarky**: `cached_constants` hashtable  
**Sparky**: `cached_constants: HashMap<FieldElement, VarId>` (line 444)

### 5. Memory Management Differences

**Snarky**: 
- OCaml GC handles memory automatically
- Can be more aggressive with temporary allocations

**Sparky**:
- Manual memory management in Rust/WASM
- Includes deterministic memory patterns (`sparky-adapter.js:219-344`)
- May limit optimization aggressiveness to ensure determinism

## Performance Impact

### Current Metrics (July 3, 2025)

| Metric | Snarky | Sparky | Gap |
|--------|---------|---------|-----|
| VK Parity | 100% | 14.3% | -85.7% |
| Constraint Count | 1x | 2-3x | +100-200% |
| Gate Efficiency | High | Low | Significant |

### Test Results
- **Field Operations**: ✅ 100% parity
- **Cryptographic Functions**: ✅ 100% parity  
- **Backend Infrastructure**: ✅ 100% parity
- **VK Generation**: ❌ 14.3% parity (1/7 tests passing)

## Root Causes

1. **Incomplete Constraint Batching**: The most critical optimization is structurally present but not activated
2. **Missing finalize_constraints Call**: Batching logic may not be triggered during constraint system finalization
3. **Less Aggressive Union-Find**: May not be merging as many equivalent variables
4. **Different Gate Ordering**: Without batching, gate sequences differ significantly

## Implementation Status

### Snarky Optimizations Present in Sparky
- ✅ Union-Find data structure
- ✅ Linear combination simplification
- ✅ Constant caching
- ✅ Basic constraint structures

### Missing or Incomplete in Sparky
- ❌ Constraint batching logic activation
- ❌ Aggressive Union-Find application
- ❌ Gate finalization with pending constraint handling
- ❌ Full optimization pipeline integration

## Recommendations

1. **Activate Constraint Batching**: Implement the pending gate queue logic in Sparky
2. **Add finalize_constraints**: Ensure pending gates are processed during finalization
3. **Profile Union-Find Usage**: Compare merge frequencies between backends
4. **Implement Missing Optimizations**: Identity operation elimination, zero coefficient removal

## Code Locations

### Snarky Files
- `/src/mina/src/lib/crypto/kimchi_pasta_snarky_backend/plonk_constraint_system.ml`
- `/src/mina/src/lib/snarky/src/base/cvar.ml`

### Sparky Files  
- `/src/sparky/sparky-core/src/constraint.rs`
- `/src/sparky/sparky-core/src/run_state.rs`
- `/src/bindings/sparky-adapter.js`

## When Snarky Performs Optimizations

### Multi-Layer Optimization Architecture

Snarky's optimizations are **NOT** all at the CVar level - they operate across multiple layers at different times:

#### 1. **CVar Construction (Immediate/Eager)**
Location: `src/mina/src/lib/snarky/src/base/cvar.ml:83-108`

```ocaml
let add x y =
  match (x, y) with
  | Constant x, _ when Field.(equal x zero) -> y      (* x + 0 = y *)
  | _, Constant y when Field.(equal y zero) -> x      (* 0 + y = x *)
  | Constant x, Constant y -> Constant (Field.add x y) (* constant folding *)
  | _, _ -> Add (x, y)

let scale x s =
  if Field.(equal s zero) then Constant Field.zero    (* 0 * x = 0 *)
  else if Field.(equal s one) then x                  (* 1 * x = x *)
  else match x with
  | Constant x -> Constant (Field.mul x s)            (* constant folding *)
  | Scale (sx, x) -> Scale (Field.mul sx s, x)        (* flatten nested scales *)
  | _ -> Scale (s, x)
```

**When**: During Field arithmetic operations  
**What**: Identity elimination, constant folding, nested operation flattening

#### 2. **Constraint Addition (Lazy/On-Demand)**
Location: `plonk_constraint_system.ml:1531-1678`

```ocaml
let add_constraint sys (constr : Constraint.t) =
  let red = reduce_lincom sys in  (* Critical: reduce CVar to linear combination *)
  match constr with
  | Equal (v1, v2) ->
      match (red v1, red v2) with
      | (s1, `Var x1), (s2, `Var x2) ->
          if Fp.equal s1 s2 then
            if not (Fp.equal s1 Fp.zero) then
              Union_find.union (union_find sys x1) (union_find sys x2)  (* No constraint! *)
          else
            add_generic_constraint ~l:x1 ~r:x2 [|s1; Fp.(negate s2); ...|] sys
```

**When**: Every time a constraint is added  
**What**: Linear combination reduction, Union-Find merging, constraint generation

#### 3. **Generic Constraint Batching (Queue-Based)**
Location: `plonk_constraint_system.ml:1428-1437`

```ocaml
let add_generic_constraint ?l ?r ?o coeffs sys =
  match sys.pending_generic_gate with
  | None -> 
      sys.pending_generic_gate <- Some (l, r, o, coeffs)  (* Queue it *)
  | Some (l2, r2, o2, coeffs2) ->
      let coeffs = Array.append coeffs coeffs2 in
      add_row sys [| l; r; o; l2; r2; o2 |] Generic coeffs  (* Batch 2 → 1 gate *)
      sys.pending_generic_gate <- None
```

**When**: During constraint-to-gate conversion  
**What**: Batches 2 constraints into 1 gate (50% reduction)

#### 4. **Finalization (End of Circuit)**
Location: `plonk_constraint_system.ml:1261-1279`

```ocaml
let rec finalize_and_get_gates sys =
  match sys with
  | { pending_generic_gate = Some (l, r, o, coeffs); _ } ->
      (* Process any pending constraints *)
      add_row sys [| l; r; o |] Generic coeffs;
      sys.pending_generic_gate <- None;
      finalize_and_get_gates sys
  | _ ->
      (* Generate permutation from Union-Find results *)
      let pos_map = equivalence_classes_to_hashtbl sys in
      (* Create final gate array *)
```

**When**: Before proof generation  
**What**: Process pending gates, generate permutation cycles

### Key Insight: Lazy Evaluation Strategy

Snarky uses a **lazy evaluation strategy** where:
1. CVar operations do minimal work (just build AST)
2. Heavy optimization happens during `add_constraint` via `reduce_lincom`
3. Constraint batching happens during gate generation
4. Final cleanup during circuit finalization

This is why `reduce_lincom` is called for **EVERY** constraint addition - it's the central optimization point that:
- Flattens CVar expressions to linear combinations
- Accumulates terms by variable
- Creates internal variables for complex expressions
- Enables Union-Find and batching optimizations

## Conclusion

Snarky's optimizations are **distributed across multiple layers** with most heavy lifting done **lazily** during constraint addition. The critical missing piece in Sparky is not just constraint batching, but the entire lazy optimization pipeline centered around `reduce_lincom`. With proper implementation of this multi-layer approach, Sparky could achieve >90% VK parity.