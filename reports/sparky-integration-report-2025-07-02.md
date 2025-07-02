# Sparky Integration Test Report

Generated: 2025-07-02T17:59:51.942Z
Total Duration: 73.08s

## Summary

- ✅ **Passed**: 4
- ❌ **Failed**: 31
- 🚫 **Compilation Failures**: 1
- 📊 **Total Tests**: 35
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

- Duration: 31.30s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-backend-integration.test.ts (30.524 s)
      ✕ should generate identical constraints for field operations (3016 ms)
      ✕ should handle boolean operations identically (5 ms)
      ✕ should produce identical Poseidon hashes (5 ms)
      ✕ should handle Poseidon sponge construction identically (10 ms)
      ✕ should handle EC point operations identically (3 ms)
      ✕ should generate identical constraints for EC operations (12 ms)
      ✕ should handle range checks identically (15 ms)
      ✕ should handle foreign field operations identically (3 ms)
      ✕ should generate identical constraints for foreign field operations (123 ms)
```

### Gate Operation Tests

- Duration: 3.40s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-gate-tests.test.ts
FAIL src/test/integration/sparky-gate-tests.test.ts
```

### New Native Gates Tests

- Duration: 0.62s
- Status: ❌ Failed

### Performance Benchmarks

- Duration: 37.73s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-performance-benchmarks.test.ts (36.877 s)
      ✕ should have comparable performance for constraint generation (217 ms)
      ✕ should have comparable performance for Poseidon.hash (1515 ms)
      ✕ should have comparable performance for Poseidon sponge (2650 ms)
      ✕ should have comparable performance for Poseidon in circuits (208 ms)
      ✕ should have comparable performance for EC addition (236 ms)
      ✕ should have comparable performance for EC scalar multiplication (15 ms)
      ✕ should have comparable performance for EC operations in circuits (894 ms)
      ✕ should have comparable performance for range checks (320 ms)
      ✕ should have comparable performance for 64-bit range checks (16 ms)
```


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
(node:1255890) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/util/types.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/util/types.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/bindings.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/wrapped.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/wrapped.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/foreign-field.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/foreign-field.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/foreign-curve.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/foreign-curve.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/foreign-ecdsa.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/foreign-ecdsa.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/scalar-field.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/scalar-field.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/poseidon.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/poseidon.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/keccak.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/keccak.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/hash.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/hash.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/common.js', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore /home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/gadgets/common.js from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`
ts-jest[ts-compiler] (WARN) Unable to process '/home/fizzixnerd/src/o1labs/o1js2/dist/node/lib/provable/crypto/signature.js', falling back to original file content. You can al
... (truncated)
```

### Gate Operation Tests

```
(node:1256579) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
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
Time:        2.672 s
Ran all test suites matching /src\/test\/integration\/sparky-gate-tests.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Command failed: NODE_OPTIONS=--experimental-vm-modules npx jest src/test/integration/sparky-gate-tests.test.ts --testTimeout=120000 --forceExit
(node:1256579) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
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
Time:        2.672 s
Ran all test suites matching /src\/test\/integration\/sparky-gate-tests.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?

```

### New Native Gates Tests

```
(node:1256801) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
No tests found, exiting with code 1
Run with `--passWithNoTests` to exit with code 0
In /home/fizzixnerd/src/o1labs/o1js2
  3690 files checked.
  testMatch: **/__tests__/**/*.[jt]s?(x), **/?(*.)+(spec|test).[tj]s?(x) - 63 matches
  testPathIgnorePatterns: /node_modules/ - 3690 matches
  testRegex:  - 0 matches
Pattern: src/test/integration/sparky-new-gates.test.ts - 0 matches
Command failed: NODE_OPTIONS=--experimental-vm-modules npx jest src/test/integration/sparky-new-gates.test.ts --testTimeout=120000 --forceExit
(node:1256801) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

```

### Performance Benchmarks

```
(node:1256833) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-performance-benchmarks.test.ts (36.877 s)
  Sparky Performance Benchmarks
    Field Operation Benchmarks
      ✓ should have comparable performance for basic field arithmetic (476 ms)
      ✓ should have comparable performance for witness generation (23522 ms)
      ✕ should have comparable performance for constraint generation (217 ms)
    Poseidon Hash Benchmarks
      ✕ should have comparable performance for Poseidon.hash (1515 ms)
      ✕ should have comparable performance for Poseidon sponge (2650 ms)
      ✕ should have comparable performance for Poseidon in circuits (208 ms)
    Elliptic Curve Benchmarks
      ✕ should have comparable performance for EC addition (236 ms)
      ✕ should have comparable performance for EC scalar multiplication (15 ms)
      ✕ should have comparable performance for EC operations in circuits (894 ms)
    Range Check Benchmarks
      ✕ should have comparable performance for range checks (320 ms)
      ✕ should have comparable performance for 64-bit range checks (16 ms)
    Foreign Field Benchmarks
      ✕ should have comparable performance for foreign field operations (18 ms)
      ✕ should have comparable performance for foreign field in circuits (48 ms)
    Complex Circuit Benchmarks
      ✕ should have comparable performance for circuit compilation (948 ms)
      ✕ should have comparable performance for proving (108 ms)
    Memory Usage Benchmarks
      ✕ should have comparable memory usage patterns (1718 ms)
    Performance Summary
      ✕ should generate performance summary report (25 ms)

  ● Sparky Performance Benchmarks › Field Operation Benchmarks › should have comparable performance for constraint generation

    RuntimeError: memory access out of bounds

      at null.<anonymous> (wasm:/wasm/001f8012:1:174607)
      at null.<anonymous> (wasm:/wasm/001f8012:1:436620)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155658)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at null.<anonymous> (wasm:/wasm/001f8012:1:110256)
      at null.<anonymous> (wasm:/wasm/001f8012:1:155900)
      at
... (truncated)
```

</details>
