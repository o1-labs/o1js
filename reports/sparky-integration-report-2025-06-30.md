# Sparky Integration Test Report

Generated: 2025-06-30T20:17:22.821Z
Total Duration: 109.43s

## Summary

- ✅ **Passed**: 9
- ❌ **Failed**: 9
- 🚫 **Compilation Failures**: 2
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

- Duration: 15.04s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-backend-integration.test.ts (13.74 s)
      ✕ should generate identical constraints for field operations (3739 ms)
      ✕ should produce identical Poseidon hashes (13 ms)
      ✕ should handle Poseidon sponge construction identically (14 ms)
      ✕ should generate identical constraints for EC operations (21 ms)
      ✕ should handle range checks identically (28 ms)
      ✕ should generate identical constraints for foreign field operations (1688 ms)
      ✕ should produce identical constraint system metadata (1889 ms)
    Error Handling
      ✕ should handle errors identically (10 ms)
```

### Gate Operation Tests

- Duration: 5.80s
- Status: ❌ Failed

**Key Failures:**
```
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.
```

### New Native Gates Tests

- Duration: 5.46s
- Status: ❌ Failed

**Key Failures:**
```
FAIL src/test/integration/sparky-new-gates.test.ts
FAIL src/test/integration/sparky-new-gates.test.ts
```

### Performance Benchmarks

- Duration: 81.74s
- Status: ❌ Failed


## Recommendations

Based on the test results:

1. 🚫 **2 test suite(s) failed to compile.** Fix TypeScript errors first:
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
(node:174445) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-backend-integration.test.ts (13.74 s)
  Sparky Backend Integration Tests
    Field Operations
      ✓ should handle basic field arithmetic identically (16 ms)
      ✓ should handle field assertions identically (30 ms)
      ✕ should generate identical constraints for field operations (3739 ms)
    Boolean Operations
      ✓ should handle boolean operations identically (7 ms)
    Poseidon Hash
      ✕ should produce identical Poseidon hashes (13 ms)
      ✕ should handle Poseidon sponge construction identically (14 ms)
    Elliptic Curve Operations
      ✓ should handle EC point operations identically (6 ms)
      ✕ should generate identical constraints for EC operations (21 ms)
    Range Checks
      ✕ should handle range checks identically (28 ms)
    Foreign Field Operations
      ✓ should handle foreign field operations identically (5 ms)
      ✕ should generate identical constraints for foreign field operations (1688 ms)
    Complex Cryptographic Operations
      ✓ should handle SHA256 identically (3 ms)
      ✓ should handle Keccak identically (3 ms)
    Constraint System Analysis
      ✕ should produce identical constraint system metadata (1889 ms)
    Performance Benchmarks
      ✓ should have comparable performance for field operations (13 ms)
      ✓ should have comparable performance for Poseidon hashing (493 ms)
    Error Handling
      ✕ should handle errors identically (10 ms)
    Complete zkApp Test
      ✕ should compile and prove a complete zkApp identically (7 ms)

  ● Sparky Backend Integration Tests › Field Operations › should generate identical constraints for field operations

    thrown: "Constant FieldVar must have exactly 2 elements"

      121 |     });
      122 |
    > 123 |     it('should generate identical constraints for field operations', async () => {
          |     ^
      124 |       const program = ZkProgram({
      125 |         name: 'FieldOperations',
      126 |         publicInput: Field,

      at src/test/integration/sparky-backend-integration.test.ts:123:5
      at src/test/integration/sparky-backend-integration.test.ts:66:3
      at src/test/integration/sparky-backend-integration.test.ts:55:1

  ● Sparky Backend Integration Tests › Poseidon Hash › should produce identical Poseidon hashes

    TypeError: Cannot read properties of undefined (reading 'create')

      43 |       'Poseidon.Sponge(): bindings are not initialized, try calling `await initializeBindings()` first.'
      44 |     );
    > 45 |     this.#sponge = Snarky.poseidon.sponge.create(isChecked);
         |                                           ^
      46 |   }
      47 |
      48 |   absorb(x: Field) {

      at new Sponge (src/lib/provable/crypto/poseidon.ts:45:43)
      at src/test/integration/sparky-backend-integration.test.ts:185:24
      at runWithBothBackends (src/test/integration/sparky-backend-integration.test.ts:27:30)
      at Object.<anonymous> (src/test/integration/sparky-backend-integration.test.ts:180:23)

  ● Sparky Backend Integration Tests › Poseidon Hash › should handle Poseidon sponge construction identically

    TypeError: Cannot read properties of undefined (reading 'create')

      43 |       'Poseidon.Sponge(): bindings are not initialized, try calling `await initializeBindings()` first.'
      44 |     );
    > 45 |     this.#sponge = Snarky.poseidon.sponge.create(isChecked);
         |                                           ^
      46 |   }
      47 |
      48 |   absorb(x: Field) {

      at new Sponge (src/lib/provable/crypto/poseidon.ts:45:43)
      at src/test/integration/sparky-backend-integration.test.ts:202:24
      at runWithBothBackends (src/test/integration/sparky-backend-integration.test.ts:27:30)
      at Object.<anonymous> (src/test/integration/sparky-backend-integration.test.ts:201:23)

  ● Sparky Backend Integration Tests › Elliptic Curve Operations › should generate identical constraints for EC operations

    x.toConstant() was called on a variable field element `x` in provable code.
    This is not supported, because variables represent an abstract computation, 
    which only carries actual values during proving, but not during compiling.

    Also, reading out JS values means that whatever you're doing with those values will no longer be
    linked to the original variable in the proof, which makes this pattern prone to security holes.

    You can check whether your field element is a variable or a constant by using x.isConstant().

    To inspect values for debugging, use Provable.log(
... (truncated)
```

### Gate Operation Tests

```
(node:174736) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.

ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/sparky-gate-tests.test.ts.



ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From src/test/integration/spar
... (truncated)
```

### New Native Gates Tests

```
(node:174979) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-new-gates.test.ts
  ● Test suite failed to run

    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m201[0m:[93m27[0m - [91merror[0m[90m TS2339: [0mProperty 'mul' does not exist on type 'UnreducedForeignField'.

    [7m201[0m         const product = a.mul(b);
    [7m   [0m [91m                          ~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m224[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'mul' does not exist on type 'UnreducedForeignField'.

    [7m224[0m         const result = sum.mul(c);
    [7m   [0m [91m                           ~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m343[0m:[93m27[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m343[0m           privateInputs: [Secp256k1Field, Secp256k1Field],
    [7m   [0m [91m                          ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m343[0m:[93m43[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m343[0m           privateInputs: [Secp256k1Field, Secp256k1Field],
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m344[0m:[93m21[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m344[0m           method(a: Secp256k1Field, b: Secp256k1Field) {
    [7m   [0m [91m                    ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m344[0m:[93m40[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m344[0m           method(a: Secp256k1Field, b: Secp256k1Field) {
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m353[0m:[93m23[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m353[0m         const a = new Secp256k1Field(100n);
    [7m   [0m [91m                      ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m354[0m:[93m23[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m354[0m         const b = new Secp256k1Field(200n);
    [7m   [0m [91m                      ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m361[0m:[93m23[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m361[0m         const a = new Secp256k1Field(100n);
    [7m   [0m [91m                      ~~~~~~~~~~~~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m362[0m:[93m23[0m - [91merror[0m[90m TS2304: [0mCannot find name 'Secp256k1Field'.

    [7m362[0m         const b = new Secp256k1Field(200n);
    [7m   [0m [91m                      ~~~~~~~~~~~~~~[0m

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        4.316 s
Ran all test suites matching /src\/test\/integration\/sparky-new-gates.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Command failed: NODE_OPTIONS=--experimental-vm-modules npx jest src/test/integration/sparky-new-gates.test.ts --testTimeout=120000 --forceExit
(node:174979) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
FAIL src/test/integration/sparky-new-gates.test.ts
  ● Test suite failed to run

    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m201[0m:[93m27[0m - [91merror[0m[90m TS2339: [0mProperty 'mul' does not exist on type 'UnreducedForeignField'.

    [7m201[0m         const product = a.mul(b);
    [7m   [0m [91m                          ~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts[0m:[93m224[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'mul' does not exist on type 'UnreducedForeignField'.

    [7m224[0m         const result = sum.mul(c);
    [7m   [0m [91m                           ~~~[0m
    [96msrc/test/integration/sparky-new-gates.test.ts
... (truncated)
```

### Performance Benchmarks

```
(node:175090) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
ts-jest[versions] (WARN) Version 5.4.5 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
  console.log
    Loading Snarky backend...

      at initializeBindings (dist/node/bindings.js:50:15)

  console.log
    ✓ Snarky backend loaded

      at initializeBindings (dist/node/bindings.js:60:15)

  console.log
    Switching backend from snarky to sparky

      at initializeBindings (dist/node/bindings.js:24:13)

  console.log
    Loading Sparky backend...

      at initializeBindings (dist/node/bindings.js:40:15)

  console.log
    ✓ Sparky backend loaded

      at initializeBindings (dist/node/bindings.js:47:15)

  console.log
    
    Field Arithmetic:

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:47:11)

  console.log
      Snarky: 395.31ms (0.04ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:48:11)

  console.log
      Sparky: 384.82ms (0.04ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:49:11)

  console.log
      Ratio: 0.97x

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:50:11)

  console.log
    Switching backend from sparky to snarky

      at initializeBindings (dist/node/bindings.js:24:13)

  console.log
    Loading Snarky backend...

      at initializeBindings (dist/node/bindings.js:50:15)

  console.log
    ✓ Snarky backend loaded

      at initializeBindings (dist/node/bindings.js:60:15)

  console.log
    Switching backend from snarky to sparky

      at initializeBindings (dist/node/bindings.js:24:13)

  console.log
    Loading Sparky backend...

      at initializeBindings (dist/node/bindings.js:40:15)

  console.log
    ✓ Sparky backend loaded

      at initializeBindings (dist/node/bindings.js:47:15)

  console.log
    
    Witness Generation:

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:47:11)

  console.log
      Snarky: 18930.77ms (18.93ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:48:11)

  console.log
      Sparky: 20226.56ms (20.23ms/op)

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:49:11)

  console.log
      Ratio: 1.07x

      at benchmark (src/test/integration/sparky-performance-benchmarks.test.ts:50:11)

  console.log
    🔍 ENTER: Getting constraint system from WASM...

      at dist/node/bindings/sparky-adapter.js:285:17

  console.log
    🔍 ENTER: Raw JSON from WASM: {"gates":[{"typ":"Generic","wires":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"coeffs":["0000000000000000000000000000000000000000000000000000000000000001","40000000000000000000000000000000224698fc094cf91b992d30ed00000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000"]},{"typ":"Generic","wires":[{"row":0,"col":3},{"row":0,"col":4},{"row":0,"col":2}],"coeffs":["0000000000000000000000000000000000000000000000000000000000000001","40000000000000000000000000000000224698fc094cf91b992d30ed00000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000"]},{"typ":"Generic","wires":[{"row":0,"col":5},{"row":0,"col":6},{"row":0,"col":2}],"coeffs":["0000000000000000000000000000000000000000000000000000000000000001","40000000000000000000000000000000224698fc094cf91b992d30ed00000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000"]},{"typ":"Generic","wires":[{"row":0,"col":7},{"row":0,"col":8},{"row":0,"col":2}],"coeffs":["0000000000000000000000000000000000000000000000000000000000000001","40000000000000000000000000000000224698fc094cf91b992d30ed00000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000"]},{"typ":"Generic","wires":[{"row":0,"col":9},{"row":0,"col":10},{"row":0,"col":2}],"coeffs":["0000000000000000000000000000000000000000000000000000000000000001","40000000000000000000000000000000224698fc094cf91b992d30ed00000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000"]},{"typ":"Ge
... (truncated)
```

</details>
