# Snarky Constraint Optimization Deep Dive

## Overview

Snarky employs sophisticated optimization techniques to minimize the number of constraints in zero-knowledge circuits. The key optimization is through the `reduceToScaledVar` function and the flexible Generic gate structure.

## Key Components

### 1. **reduceToScaledVar Function**

Located in `src/lib/provable/gadgets/basic.ts`, this function is the heart of constraint optimization:

```typescript
function reduceToScaledVar(x: Field | FieldVar): ScaledVar | Constant {
  let { constant: c, terms } = toLinearCombination(fieldVar(x));
  
  // Collapses AST to linear combination: c + s1*x1 + s2*x2 + ... + sn*xn
  // Merges duplicate variables: 2x + 3x becomes 5x
  // Returns either a constant or scaled variable
}
```

### 2. **Linear Combination AST**

Field operations build an Abstract Syntax Tree (AST) instead of creating constraints immediately:

```typescript
// These operations don't create constraints:
x.add(y)        // Creates: Add(x, y)
x.mul(2)        // Creates: Scale(2, x)
x.sub(y)        // Creates: Add(x, Scale(-1, y))

// Only when needed (e.g., assertEquals, mul) are constraints generated
```

### 3. **Generic Gate Structure**

The Plonk Generic gate can encode complex relationships in a single constraint:
```
left*x + right*y + out*z + mul*x*y + const = 0
```

This allows encoding various operations:
- Linear combinations: `x + y - z = 0`
- Scaled equations: `2x - y = 0`
- Multiplications: `x*y - z = 0`
- Mixed operations: `x*y + z - w = 0`

## Optimization Examples

### Example 1: Simple Linear Combination
```typescript
// Input code:
(a + b + c).assertEquals(d)

// After reduceToScaledVar:
// Linear combination: a + b + c - d
// Single constraint: 1*a + 1*b + 1*c + (-1)*d + 0 = 0
// Constraints used: 1
```

### Example 2: Complex Expression
```typescript
// Input code:
(2*a + 3*b - c + 5).assertEquals(d)

// After reduceToScaledVar:
// Linear combination: 2a + 3b - c - d + 5
// Single constraint: 2*a + 3*b + (-1)*c + (-1)*d + 5 = 0
// Constraints used: 1
```

### Example 3: Duplicate Variable Elimination
```typescript
// Input code:
(2*x + 3*x).assertEquals(y)

// After reduceToScaledVar:
// Coefficients merged: 5x - y
// Single constraint: 5*x + (-1)*y + 0 = 0
// Constraints used: 1
```

### Example 4: Zero Constraint Optimization
```typescript
// Input code:
(x - x).assertEquals(0)

// After reduceToScaledVar:
// Collapses to constant 0
// Constant check: 0 == 0 (no constraint needed)
// Constraints used: 0
```

## Special Cases

### 1. **Wire Constraints**
When asserting simple equality between two variables with the same scaling factor:
```typescript
x.assertEquals(y)  // If both have scale factor 1
```
Snarky uses `Snarky.field.assertEqual` which creates a wire constraint, not a gate. This enforces equality without adding rows to the constraint system.

### 2. **Long Linear Combinations**
The Generic gate can only handle a limited number of variables (typically 3). For longer combinations:
```typescript
// Sum of 10 variables
v1 + v2 + ... + v10 = sum

// Requires intermediate variables:
// tmp1 = v1 + v2 + v3
// tmp2 = tmp1 + v4 + v5
// etc.
// Constraints used: ~5
```

### 3. **Multiplication Chains**
Each multiplication typically requires a constraint:
```typescript
// (x * y) * z = w
// Becomes:
// tmp = x * y  (1 constraint)
// tmp * z = w  (could be combined with other linear ops)
// Total constraints: 1-2
```

## Implementation Details

### toLinearCombination Function
Recursively flattens the Field AST:
```typescript
function toLinearCombination(x: FieldVar, sx = 1n, lincom) {
  // Handles different node types:
  // - Constant: adds to constant term
  // - Var: adds/merges with existing terms
  // - Scale: multiplies scaling factor
  // - Add: recursively processes both operands
}
```

### assertEqual Implementation
From `src/lib/provable/gadgets/compatible.ts`:
1. Calls `reduceToScaledVar` on both operands
2. Checks various cases (var-var, var-const, const-const)
3. Uses appropriate constraint type:
   - Wire constraint for simple variable equality
   - Generic gate for scaled/complex expressions
   - Constant assertion for const-const

## Performance Insights

1. **Linear operations are free** until constraint generation
2. **Duplicate variables are automatically merged**
3. **Constants are folded** into the constraint
4. **Wire constraints** don't increase row count
5. **Complex expressions** often reduce to single constraints

## Limitations

1. **Generic gate structure** limits variables per constraint (~3-4)
2. **Long sums** require intermediate variables
3. **Each multiplication** typically needs its own constraint
4. **seal()** forces constraint generation, preventing further optimization

## Key Takeaway

Snarky's optimization is remarkably sophisticated. By building ASTs for linear operations and only generating constraints when necessary, it can often reduce complex expressions to single constraints. The `reduceToScaledVar` function is central to this optimization, converting arbitrary Field expressions into normalized linear combinations that map efficiently to the Generic gate structure.