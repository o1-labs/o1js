# @o1js/testing

This package contains testing utils used internally in o1js to test primitives.

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
    - [Property Testing](#property-testing)
    - [Equivalence Testing](#equivalence-testing)
    - [Constraint System Testing](#constraint-system-testing)
- [Examples](#examples)
- [API Reference](#api-reference)

## Overview

1. **Property Testing**: Generate random inputs to test properties of your functions
2. **Equivalence Testing**: Compare two implementations (e.g., a bigint-based one and a Field-based one) 
3. **Constraint System Testing**: Verify that your zkSNARK circuits generate the expected constraint systems

## Installation

```bash
npm install --save-dev @o1js/testing
```
> `o1js` must be installed in the project as peer dependency.

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

## API Reference

### Property Testing

#### `test()`

The main function for running property-based tests.

##### Parameters
- `...generators`: Random value generators
- `run`: A function that takes generated values and tests assertions

##### Variants
- `test.negative`: Test that all runs fail/throw an error
- `test.custom`: Create a customized test runner with options like `minRuns`, `maxRuns`, `timeBudget`, etc.


#### `sample()`

Generate sample values from a random generator.

##### Parameters
- `random`: The random generator
- `n`: Number of samples to generate (default: 1)

#### `withHardCoded()`

Replace a random generator with hardcoded values.

##### Parameters
- `random`: The original random generator
- `...hardCoded`: The values to return instead of random ones

#### `Random`

A class for generating random values of different types. It includes many methods like:

- `Random.constant()`: Generate a constant value
- `Random.int()`: Generate random integers in a given range
- `Random.nat()`: Generate random natural numbers up to a maximum
- `Random.fraction()`: Generate random fractional values
- `Random.boolean()`: Generate random boolean values
- `Random.byte()`: Generate random byte values
- `Random.bytes()`: Generate random byte arrays
- `Random.string()`: Generate random strings
- `Random.base58()`: Generate random base58 strings
- `Random.array()`: Generate random arrays
- `Random.oneOf()`: Choose randomly from provided options
- `Random.field()`: Generate random field elements
- `Random.bool()`: Generate random boolean elements
- `Random.uint8()`, `Random.uint32()`, `Random.uint64()`: Generate random uint values
- And many more specialized generators

### Equivalence Testing

#### `equivalent()`

Test the equivalence of two functions with different input/output types.

##### Parameters
- `from`: Specifications for converting input values
- `to`: Specification for converting output values
- `verbose`: Whether to log verbose output

#### `equivalentAsync()`

Test the equivalence of two functions with different input/output types.

##### Parameters
- `from`: Specifications for converting input values
- `to`: Specification for converting output values
- `runs`: Number of test runs

#### `equivalentProvable()`

Test the equivalence of two functions where one is provable.

##### Parameters
- `from`: Specifications for converting input values
- `to`: Specification for converting output values
- `verbose`: Whether to log verbose output

### Specs

A `Spec<T1, T2>` is a type that defines how to convert between two types and compare their values. This is essential for equivalence testing. It contains:

- `rng`: A random generator for type T1
- `there`: A function that converts from T1 to T2
- `back`: A function that converts from T2 back to T1
- `assertEqual`: (Optional) A function to compare two T1 values
- `provable`: (Optional) A Provable for T2, if it's a circuit type

#### `field`

A predefined `ProvableSpec<bigint, Field>` that converts between JavaScript's `bigint` and o1js's `Field` type.

#### `fieldWithRng(rng)`

Creates a `ProvableSpec<bigint, Field>` using a custom random generator for bigint values.

#### `bigintField`

A `Spec<bigint, bigint>` for testing with native bigint values, using the standard field random generator.

#### `bool`

A `ProvableSpec<boolean, Bool>` that converts between JavaScript's `boolean` and o1js's `Bool` type.

#### `boolean`

A `Spec<boolean, boolean>` for testing with native boolean values.

#### `unit`

A `ToSpec<void, void>` for testing functions that don't return values.

### Spec Combinators

Spec combinators allow you to build complex specifications from simpler ones.

#### `array(spec, size)`

Creates a `Spec<T[], S[]>` for arrays by mapping the provided spec over each element.

##### Parameters
- `spec`: The specification for array elements
- `size`: Either a fixed number or a random generator for the array size

#### `record(specs)`

Creates a `Spec` for objects with fields that follow the specifications in the `specs` object.

##### Parameters
- `specs`: An object mapping field names to their specifications

#### `map({ from, to }, transform)`

Transforms a specification by mapping the input values.

##### Parameters
- `from`: The source specification
- `to`: The target specification
- `transform`: A function that transforms inputs of the source type

#### `onlyIf(spec, predicate)`

Filters the random inputs of a specification using a predicate function.

##### Parameters
- `spec`: The base specification
- `predicate`: A function that returns true for inputs that should be kept

#### `fromRandom(rng)`

Creates a simple `Spec<T, T>` from a random generator, using identity functions for conversion.

##### Parameters
- `rng`: The random generator for type T

#### `first(spec)`

Creates a `Spec<T, T>` from a `Spec<T, S>` by using only the input type.

##### Parameters
- `spec`: The original specification

#### `second(spec)`

Creates a `Spec<S, S>` from a `Spec<T, S>` by using only the output type.

##### Parameters
- `spec`: The original specification

#### `constant(spec, value)`

Modifies a spec to always use a fixed input value.

##### Parameters
- `spec`: The original specification
- `value`: The constant value to use

### Utils

Utility functions for working with specs and testing.

#### `oneOf(...specs)`

Creates a union specification that randomly selects from multiple specs for generating test inputs.

##### Parameters
- `...specs`: A list of specifications to choose from

#### `throwError(message?)`

A utility function to throw an error with an optional message.

##### Parameters
- `message`: Optional error message

#### `handleErrors(op1, op2, useResults?, label?)`

A helper function that ensures two operations throw the same errors or produce comparable results.

##### Parameters
- `op1`: The first operation to execute
- `op2`: The second operation to execute
- `useResults`: Optional function to compare the results
- `label`: Optional label for error messages

#### `defaultAssertEqual`

The default equality assertion function (uses Node's `deepEqual`).

#### `id(x)`

An identity function that returns its input unchanged.

##### Parameters
- `x`: The input value

#### `spec(options)`

A factory function for creating `Spec` objects with various configurations.

##### Parameters
- `options`: Configuration for the spec, including `rng`, `there`, `back`, `assertEqual`, and `provable`


### Constraint System Testing

#### `constraintSystem(label, inputs, main, constraintSystemTest)`

Tests properties of the constraint system generated by a circuit.

##### Parameters
- `label`: Description of the constraint system.
- `inputs`: Input specification in the form `{ from: [...provables] }`.
- `main`: The circuit to test.
- `constraintSystemTest`: The property test to run on the constraint system.

#### `constraintSystem.fromZkProgram(program, methodName, test)`

Convenience function to run `constraintSystem` on the method of a `ZkProgram`.

##### Parameters
- `program`: The ZkProgram to test
- `methodName`: Name of the method to test
- `test`: The property test to run on the constraint system.

#### `not(test)`

Negates a test.

#### `and(...tests)`

Check that all input tests pass.

#### `or(...tests)`

Check that at least one input test passes.

#### `fulfills`

Test that the constraint system fulfills specific conditions.

#### `equals(gates)`

Test that constraint system has exactly the specified gates.

#### `contains(gates)`

Test that constraint system contains specific gates.

#### `allConstant`

Test whether all inputs are constant.

#### `ifNotAllConstant(test)`

Modifies a test so that it doesn't fail if all inputs are constant, and instead checks that the constraint system is empty in that case.

#### `isEmpty`

Test whether the constraint system is empty.

#### `withoutGenerics(test)`

Modifies a test so that it runs on the constraint system with generic gates filtered out.

#### `print`

Test that just pretty-prints the constraint system.

#### `repeat`

Repeat a sequence of gates.
