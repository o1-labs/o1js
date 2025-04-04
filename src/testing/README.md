# @o1js/testing

This is package contains testing utils used internally in o1js to test primitives.

## Table of Contents

- [@o1js/testing](#o1jstesting)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Installation](#installation)
  - [Features](#features)
    - [Property Testing](#property-testing)
    - [Equivalence Testing](#equivalence-testing)
    - [Constraint System Testing](#constraint-system-testing)
  - [Examples](#examples)

## Overview

1. **Property Testing**: Generate random inputs to test properties of your functions
2. **Equivalence Testing**: Compare two implementations (e.g., a bigint-based one and a Field-based one) 
3. **Constraint System Testing**: Verify that your zkSNARK circuits generate the expected constraint systems

## Installation

```bash
npm install --save-dev @o1js/testing
```
> o1js must be installed in the project as peer dependency.

## Features

### Property Testing

The property testing allows you to test functions with randomly generated inputs, ensuring your code works across a wide range of inputs.

```typescript
import { test, Random } from '@o1js/testing';

// Test that addition is commutative
test(Random.field, Random.field, (x, y) => {
  const xField = Field(x);
  const yField = Field(y);
  
  // Verify that x + y = y + x
  expect(xField.add(yField)).toEqual(yField.add(xField));
});
```

```typescript
import { test, Random } from '@o1js/testing';

// Test Uint8.from() correcttly converts numbers to UInt8
test(Random.nat(25), (n, assert) => {
  assert(UInt8.from(n).toString() === String(n));
});
```

```typescript
import { test, Random } from '@o1js/testing';

// Test UInt8.from() throws on negative numbers
test.negative(Random.int(-10, -1), (x) => UInt8.from(x));
```

### Equivalence Testing

The equivalence testing helps you test that two different implementations (e.g., one using native JavaScript types and another using o1js provable types) behave the same way.

```typescript
import { bigintField, field, bool, equivalent } from '@o1js/testing';

// Field | bigint parameter
let fieldOrBigint = oneOf(field, bigintField);

equivalent({ from: [field, fieldOrBigint], to: bool })(
  (x, y) => x < y,
  (x, y) => x.lessThan(y)
);
```

```typescript
import { uint, field, equivalentProvable } from '@o1js/testing';
import { Gadgets } from 'o1js';

equivalentProvable({ from: [uint(64), uint(64)], to: field })(
  (x, y) => x ^ y,
  (x, y) => Gadgets.xor(x, y, 64)
);
```

### Constraint System Testing

The constraint system testing allows you to verify that your circuits generate the expected constraint system, which is valuable for ensuring optimal performance and the expected behavior of your provable code.

```typescript
import { constraintSystem, ifNotAllConstant, withoutGenerics, equals } from '@o1js/testing';
import { Field, Gadgets } from 'o1js';

constraintSystem(
  'range check 64',
  { from: [Field] },
  Gadgets.rangeCheck64,
  ifNotAllConstant(withoutGenerics(equals(['RangeCheck0'])))
);
```

```typescript
import { constraintSystem, ifNotAllConstant, contains } from '@o1js/testing';
import { Field, Gadgets, ZkProgram } from 'o1js';

let Bitwise = ZkProgram({
  name: 'bitwise',
  publicOutput: Field,
  methods: {
    notUnchecked: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.not(a, 240, false) };
      },
    },
  },
});

await Bitwise.compile();

constraintSystem.fromZkProgram(Bitwise, 'notUnchecked', ifNotAllConstant(contains('Generic')));
```

## Examples

Check out [`src/lib/provable/test`](https://github.com/o1-labs/o1js/tree/main/src/lib/provable/test) directory for more examples.