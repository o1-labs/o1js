# Snarky Constraint Generation Pipeline

## Overview

This document explains how Snarky generates constraints for operations like `a.add(b).assertEquals(c)`, specifically addressing why this produces a single constraint with coefficients `[1, 1, -1, ...]` rather than two separate constraints.

## Key Insight: AST-Based Optimization

Snarky uses an Abstract Syntax Tree (AST) approach that delays constraint generation until necessary, allowing for powerful optimizations. The expression `a.add(b).assertEquals(c)` generates **ONE constraint**, not two.

## The Pipeline

### 1. Field Addition Creates AST Nodes

When you call `a.add(b)`:

```typescript
// src/lib/provable/field.ts:239-246
add(y: Field | bigint | number | string): Field {
  if (this.isConstant() && isConstant(y)) {
    return new Field(Fp.add(this.toBigInt(), toFp(y)));
  }
  // return new AST node Add(x, y)
  let z = FieldVar.add(this.value, toFieldVar(y));
  return new Field(z);
}
```

This creates an AST node `[FieldType.Add, a, b]` rather than immediately generating constraints.

### 2. assertEquals Triggers Constraint Generation

The `assertEquals` method:

```typescript
// src/lib/provable/field.ts:197-209
assertEquals(y: Field | bigint | number | string, message?: string) {
  // ... constant handling ...
  assertEqual(this, toFieldVar(y));
}
```

This calls `assertEqualCompatible` which:
1. Reduces both sides to linear combinations
2. Generates a single generic gate constraint

### 3. AST Reduction via reduceToScaledVar

Before generating constraints, the AST is reduced to a linear combination:

```typescript
// src/lib/provable/gadgets/basic.ts
function reduceToScaledVar(x: FieldVar): [sign: Sign, scale: bigint, v: Var] {
  let { constant, terms } = toLinearCombination(x);
  // Flattens Add(a, b) to { constant: 0n, terms: [[1n, a], [1n, b]] }
  // ...
}
```

For `a + b`, this produces a representation equivalent to `1*a + 1*b + 0`.

### 4. Generic Gate Constraint

The assertEqual generates a single generic gate:

```typescript
// src/lib/provable/gadgets/compatible.ts:208-211
Gates.generic(
  { left: 1n, right: 1n, out: -1n, mul: 0n, const: 0n },
  { left: a, right: b, out: c }
);
```

This implements the constraint equation:
```
c_l*l + c_r*r + c_o*o + c_m*l*r + c_c = 0
```

Which becomes:
```
1*a + 1*b + (-1)*c + 0*a*b + 0 = 0
```

Simplifying to: `a + b - c = 0` or `a + b = c`

## Why One Constraint, Not Two?

The key is that Snarky's generic gate can encode multiple operations in a single constraint. The Plonk arithmetization allows expressing:
- Addition: `a + b - c = 0`
- Multiplication: `a * b - c = 0`
- Mixed operations: `2*a + 3*b - c + 5 = 0`

All in a single constraint row.

## Constraint Coefficients Explained

The `[1, 1, -1, ...]` pattern represents:
- `[1]`: coefficient for variable `a` (left)
- `[1]`: coefficient for variable `b` (right)
- `[-1]`: coefficient for variable `c` (output)
- `[0]`: coefficient for multiplication term `a*b`
- `[0]`: constant term

## Advanced Optimizations

### 1. Constant Folding
```typescript
let x = new Field(5);
let y = new Field(3);
x.add(y).assertEquals(8); // 0 constraints - all constants
```

### 2. Zero Elimination
```typescript
a.add(0).assertEquals(a); // Uses wire constraint or 0 constraints
```

### 3. Linear Combination Merging
```typescript
a.add(b).add(a).assertEquals(c); // Still 1 constraint: 2*a + b - c = 0
```

### 4. Complex Expression Handling
For expressions with more than ~3-4 unique variables:
```typescript
a.add(b).add(c).add(d).add(e).assertEquals(f);
// May create intermediate variables and use 2-3 constraints
```

## Implementation Details

### Snarky (OCaml) Backend
The generic gate is implemented in the OCaml bindings:
```ocaml
(* src/bindings/ocaml/lib/snarky_bindings.ml:135-137 *)
let generic ~coeffs:(l, r, o, m, c) ~wires:(lw, rw, ow) =
  Impl.handle_error (fun () ->
    Backend.Snarky.add_constraint (Generic (coeffs, wires)))
```

### Sparky (Rust) Backend
The Sparky adapter provides the same interface:
```javascript
// src/bindings/sparky-adapter.js:626-633
generic(coeffs, vars) {
  let { left: cl, right: cr, out: co, mul: cm, const: cc } = coeffs;
  let { left, right, out } = vars;
  
  return module.addGenericConstraint(
    cl, left, cr, right, co, out, cm, cc
  );
}
```

## Performance Implications

1. **Single Constraint**: `a.add(b).assertEquals(c)` → 1 row in constraint system
2. **Wire Constraint**: `a.assertEquals(b)` → 0 rows (just wire connection)
3. **Complex Linear**: `(2*a + 3*b - 4*c + 5).assertEquals(d)` → 1 row
4. **Multiplication Chain**: `a.mul(b).mul(c).assertEquals(d)` → 2 rows

## Debugging Constraint Generation

To inspect generated constraints:

```typescript
import { Provable, Field } from 'o1js';

Provable.runAndCheck(() => {
  let a = Provable.witness(Field, () => Field(1));
  let b = Provable.witness(Field, () => Field(2));
  let c = Provable.witness(Field, () => Field(3));
  
  a.add(b).assertEquals(c);
});

let cs = Provable.constraintSystem(() => {
  let a = Provable.witness(Field, () => Field(1));
  let b = Provable.witness(Field, () => Field(2));
  let c = Provable.witness(Field, () => Field(3));
  
  a.add(b).assertEquals(c);
});

console.log('Constraints:', cs.rows);
console.log('Gates:', cs.gates);
```

## Summary

The expression `a.add(b).assertEquals(c)` generates a single constraint with coefficients `[1, 1, -1, 0, 0]` because:

1. Addition creates an AST node, not constraints
2. assertEquals triggers AST reduction to linear form
3. The generic gate encodes `a + b - c = 0` in one constraint
4. Plonk's arithmetization allows complex expressions in single gates
5. This optimization minimizes proof generation time and verification costs

This design allows o1js to generate highly optimized constraint systems while maintaining a clean, mathematical API for developers.