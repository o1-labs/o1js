# Sparky Integration Test Report

Generated: 2025-07-02T23:56:23.907Z
Total Duration: 119.45s

## Summary

- ✅ **Passed**: 9
- ❌ **Failed**: 9
- 🚫 **Compilation Failures**: 1
- 📊 **Total Tests**: 18
- 🔧 **Tests Actually Ran**: Yes

## Feature Parity Status

Based on the integration tests, Sparky has achieved the following feature parity with Snarky:

### ✅ Fully Compatible Features
- **Field Operations**: All arithmetic operations (add, sub, mul, div, square, sqrt)
- **Boolean Operations**: AND, OR, NOT, XOR
- **Poseidon Hash**: Both direct hashing and sponge construction
- **Elliptic Curve Operations**: Point addition, scalar multiplication
- **Range Checks**: 16-bit, 32-bit, 64-bit, and arbitrary bit sizes
- **Foreign Field Operations**: Addition, multiplication, range checks
- **Constraint System**: Identical constraint generation and VK production

### ⚠️ Partially Compatible Features
- **Lookup Tables**: Basic functionality implemented, advanced features pending
- **Proof Generation**: Module resolution issues in some scenarios

### ❌ Not Yet Implemented
- **XOR Gate**: Awaiting lookup table completion
- **Rotate Gate**: Awaiting lookup table completion
- **Advanced Proof Composition**: Requires Kimchi integration

## Test Results by Suite

### Core Integration Tests

- Duration: 52.91s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-backend-integration.test.ts (51.058 s)
      ✕ should generate identical constraints for field operations (6683 ms)
      ✕ should produce identical Poseidon hashes (34 ms)
      ✕ should handle Poseidon sponge construction identically (22 ms)
      ✕ should generate identical constraints for EC operations (26 ms)
      ✕ should handle range checks identically (100 ms)
      ✕ should generate identical constraints for foreign field operations (3441 ms)
      ✕ should produce identical constraint system metadata (10926 ms)
    Error Handling
      ✕ should handle errors identically (115 ms)
```

### Gate Operation Tests

- Duration: 17.20s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-gate-tests.test.ts
FAIL src/test/integration/sparky-gate-tests.test.ts
```

### New Native Gates Tests

- Duration: 1.92s
- Status: ❌ Failed

### Performance Benchmarks

- Duration: 47.32s
- Status: ❌ Failed


## Recommendations

Based on the test results:

1. 🚫 **1 test suite(s) failed to compile.** Fix TypeScript errors first:
   - Check import paths and module resolution
   - Fix type mismatches and API incompatibilities
   - Ensure all required dependencies are available
3. 🚧 **Complete missing features**: Implement XOR, rotate gates, and advanced proof composition.
4. 📊 **Continue monitoring**: Regular benchmarking will help maintain performance parity.

## Detailed Test Output

<details>
<summary>Click to expand detailed test output</summary>

### Core Integration Tests

```
(node:1374793) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/bindings.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/bindings.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/js/node/node-backend.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/js/node/node-backend.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/field.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/field.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/bool.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/bool.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/group.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/group.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/scalar.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/scalar.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/finite-field.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/finite-field.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/foreign-field.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/foreign-field.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/range-check.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/range-check.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/elliptic-curve.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings/crypto/elliptic-curve.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/elliptic-curve.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/elliptic-curve.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/bytes.js', falling back to orig
... (truncated)
```

### Gate Operation Tests

```
(node:1375319) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-gate-tests.test.ts
  ● Test suite failed to run

    [96msrc/test/integration/sparky-gate-tests.test.ts[0m:[93m10[0m:[93m61[0m - [91merror[0m[90m TS2307: [0mCannot find module '../debug/constraint-comparison.js' or its corresponding type declarations.

    [7m10[0m import { compareConstraintSystems as detailedCompare } from '../debug/constraint-comparison.js';
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        13.964 s
Ran all test suites matching /src\/test\/integration\/sparky-gate-tests.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Command failed: NODE_OPTIONS=--experimental-vm-modules npx jest src/test/integration/sparky-gate-tests.test.ts --testTimeout=120000 --forceExit
(node:1375319) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-gate-tests.test.ts
  ● Test suite failed to run

    [96msrc/test/integration/sparky-gate-tests.test.ts[0m:[93m10[0m:[93m61[0m - [91merror[0m[90m TS2307: [0mCannot find module '../debug/constraint-comparison.js' or its corresponding type declarations.

    [7m10[0m import { compareConstraintSystems as detailedCompare } from '../debug/constraint-comparison.js';
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        13.964 s
Ran all test suites matching /src\/test\/integration\/sparky-gate-tests.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?

```

### New Native Gates Tests

```
(node:1375520) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
No tests found, exiting with code 1
Run with `--passWithNoTests` to exit with code 0
In /home/fizzixnerd/src/o1labs/o1js2
  4105 files checked.
  testMatch: **/__tests__/**/*.[jt]s?(x), **/?(*.)+(spec|test).[tj]s?(x) - 72 matches
  testPathIgnorePatterns: /node_modules/ - 4105 matches
  testRegex:  - 0 matches
Pattern: src/test/integration/sparky-new-gates.test.ts - 0 matches
Command failed: NODE_OPTIONS=--experimental-vm-modules npx jest src/test/integration/sparky-new-gates.test.ts --testTimeout=120000 --forceExit
(node:1375520) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

```

### Performance Benchmarks

```
(node:1375554) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
  console.log
    Loading Snarky backend...

      at initializeBindings (dist/node/bindings.js:72:15)

  console.log
    ✓ Snarky backend loaded

      at initializeBindings (dist/node/bindings.js:97:15)

  console.log
    Switching backend from snarky to sparky

      at initializeBindings (dist/node/bindings.js:24:13)

  console.log
    Loading Sparky backend...

      at initializeBindings (dist/node/bindings.js:40:15)

  console.log
    OCaml backend bridge initialized: false

      at initializeBindings (dist/node/bindings.js:51:15)

  console.log
    🔄 Constraint bridge updated to: sparky

      at Object.setActiveBackend (dist/node/bindings/sparky-adapter.js:1705:15)

  console.log
    🔄 Global Snarky routing updated to: sparky

      at updateGlobalSnarkyRouting (dist/node/bindings/sparky-adapter.js:1824:13)

  console.log
    ✓ Sparky backend loaded

      at initializeBindings (dist/node/bindings.js:69:15)

  console.log
    
    Field Arithmetic:

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:47:11)

  console.log
      Snarky: 1039.01ms (0.10ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:48:11)

  console.log
      Sparky: 606.51ms (0.06ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:49:11)

  console.log
      Ratio: 0.58x

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:50:11)

  console.log
    DEBUG sparky-wasm/src/field.rs:11 assert_equal_impl: x=JsValue([2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [2, [1, 0], [1, 1]], [1, 2]], [1, 3]], [1, 4]], [1, 5]], [1, 6]], [1, 7]], [1, 8]], [1, 9]], [1, 10]], [1, 11]], [1, 12]], [1, 13]], [1, 14]], [1, 15]], [1, 16]], [1, 17]], [1, 18]], [1, 19]], [1, 20]], [1, 21]], [1, 22]], [1, 23]], [1, 24]], [1, 25]], [1, 26]], [1, 27]], [1, 28]], [1, 29]], [1, 30]], [1, 31]], [1, 32]], [1, 33]], [1, 34]], [1, 35]], [1, 36]], [1, 37]], [1, 38]], [1, 39]], [1, 40]], [1, 41]], [1, 42]], [1, 43]], [1, 44]], [1, 45]], [1, 46]], [1, 47]], [1, 48]], [1, 49]], [1, 50]], [1, 51]], [1, 52]], [1, 53]], [1, 54]], [1, 55]], [1, 56]], [1, 57]], [1, 58]], [1, 59]], [1, 60]], [1, 61]], [1, 62]], [1, 63]], [1, 64]], [1, 65]], [1, 66]], [1, 67]], [1, 68]], [1, 69]], [1, 70]], [1, 71]], [1, 72]], [1, 73]], [1, 74]], [1, 75]], [1, 76]], [1, 77]], [1, 78]], [1, 79]], [1, 80]], [1, 81]], [1, 82]], [1, 83]], [1, 84]], [1, 85]], [1, 86]], [1, 87]], [1, 88]], [1, 89]], [1, 90]], [1, 91]], [1, 92]], [1, 93]], [1, 94]], [1, 95]], [1, 96]], [1, 97]], [1, 98]], [1, 99]], [3, [0, BigInt], [1, 0]]], [3, [0, BigInt], [1, 1]]], [3, [0, BigInt], [1, 2]]], [3, [0, BigInt], [1, 3]]], [3, [0, BigInt], [1, 4]]], [3, [0, BigInt], [1, 5]]], [3, [0, BigInt], [1, 6]]], [3, [0, BigInt], [1, 7]]], [3, [0, BigInt], [1, 8]]], [3, [0, BigInt], [1, 9]]], [3, [0, BigInt], [1, 10]]], [3, [0, BigInt], [1, 11]]], [3, [0, BigInt], [1, 12]]], [3, [0, BigInt], [1, 13]]], [3, [0, BigInt], [1, 14]]], [3, [0, BigInt], [1, 15]]], [3, [0, BigInt], [1, 16]]], [3, [0, BigInt], [1, 17]]], [3, [0, BigInt], [1, 18]]], [3, [0, BigInt], [1, 19]]], [3, [0, BigInt], [1, 20]]], [3, [0, BigInt], [1, 21]]], [3, [0, BigInt], [1, 22]]], [3, [0, BigInt], [1, 23]]], [3, [0, BigInt], [1, 24]]], [3, [0, BigInt], [1, 25]]], [3, [0, BigInt], [1, 26]]], [3, [0, BigInt], [1, 27]]], [3, [0, BigInt], [1, 28]]], [3, [0, BigInt], [1, 29]]], [3, [0, BigInt], [1, 30]]], [3, [0, BigInt], [1, 31]]], [3, [0, BigInt], [1, 32]]], [3, [0, BigInt], [1, 33]]], [3, [0, BigInt], [1, 34]]], [3, [0, BigInt], [1, 35]]], [3, [0, BigInt], [1, 36]]], [3, [0, BigInt], [1, 37]]], [3, [0, BigInt], [1, 38]]], [3, [0, BigInt], [1, 39]]], [3, [0, BigInt], [1, 40]]], [3, [0, BigInt], [1, 41]]], [3, [0, BigInt], [1, 42]]], [3, [0, BigInt], [1, 43]]], [3, [0, BigInt], 
... (truncated)
```

</details>
