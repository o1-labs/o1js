# Sparky Backend Integration Tests

This directory contains comprehensive integration tests for the Sparky backend, ensuring feature and performance parity with the OCaml Snarky implementation.

## Test Suites

### 1. Core Integration Tests (`sparky-backend-integration.test.ts`)
Tests high-level o1js functionality with both backends:
- Field operations (arithmetic, assertions)
- Boolean operations
- Poseidon hashing (direct and sponge)
- Elliptic curve operations
- Range checks
- Foreign field operations
- Complex cryptographic operations (SHA256, Keccak)
- Complete zkApp compilation and proving

### 2. Gate Operation Tests (`sparky-gate-tests.test.ts`)
Low-level tests focusing on constraint generation:
- Basic gates (zero, generic, multiplication)
- Boolean constraint generation
- Poseidon gate operations
- EC operation gates
- Range check gates
- Verification key (VK) comparison
- Raw gate interface
- Edge cases and error conditions

### 3. Performance Benchmarks (`sparky-performance-benchmarks.test.ts`)
Performance comparison between backends:
- Field operation throughput
- Witness generation speed
- Constraint generation performance
- Poseidon hashing benchmarks
- EC operation performance
- Foreign field operation speed
- Circuit compilation time
- Proving performance
- Memory usage patterns

## Running the Tests

### Run All Integration Tests
```bash
npm test -- src/test/integration/
```

### Run Individual Test Suites
```bash
# Core integration tests only
npm test -- src/test/integration/sparky-backend-integration.test.ts

# Gate tests only
npm test -- src/test/integration/sparky-gate-tests.test.ts

# Performance benchmarks only
npm test -- src/test/integration/sparky-performance-benchmarks.test.ts
```

### Generate Comprehensive Test Report
```bash
# Run all tests and generate a detailed report
npx tsx src/test/integration/run-sparky-integration-tests.ts
```

The report will be saved to `reports/sparky-integration-report-YYYY-MM-DD.md`.

## Test Configuration

### Backend Switching
Tests automatically switch between Snarky and Sparky backends using:
```typescript
await switchBackend('snarky');
await switchBackend('sparky');
```

### Performance Targets
- **Acceptable Ratio**: Sparky should be within 1.5x of Snarky performance
- **Warning Ratio**: 1.5x - 2.0x (needs optimization)
- **Failure Ratio**: > 2.0x (unacceptable performance)

## Understanding Test Results

### Verification Key (VK) Comparison
The most critical test - ensures that both backends generate identical constraint systems:
```typescript
expect(sparkyResult.verificationKey.hash.toBigInt())
  .toBe(snarkyResult.verificationKey.hash.toBigInt());
```

If VKs don't match, the backends are not compatible!

### Performance Metrics
Each benchmark reports:
- **Snarky Time**: Baseline performance
- **Sparky Time**: Sparky's performance
- **Ratio**: Sparky time / Snarky time (lower is better)

### Feature Parity Status
Tests verify these features work identically:
- ✅ Field operations
- ✅ Boolean operations
- ✅ Poseidon hash
- ✅ EC operations
- ✅ Range checks
- ✅ Foreign fields
- ⚠️ Lookup tables (partial)
- ❌ XOR gate (not implemented)
- ❌ Rotate gate (not implemented)

## Debugging Failed Tests

### 1. Check Backend Switching
Ensure the backend is switching correctly:
```typescript
const backend = await getCurrentBackend();
console.log('Current backend:', backend);
```

### 2. Compare Constraint Systems
For VK mismatches, compare the constraint systems:
```typescript
const cs = await Provable.constraintSystem(() => {
  // Your circuit
});
console.log('Rows:', cs.rows);
console.log('Digest:', cs.digest);
```

### 3. Check WASM Build
If Sparky functions are missing:
```bash
npm run build:all
```

### 4. Enable Debug Logging
Set environment variable:
```bash
DEBUG=sparky npm test
```

## Adding New Tests

When adding features to Sparky, add corresponding tests:

1. **Feature Test**: Add to `sparky-backend-integration.test.ts`
2. **Gate Test**: Add to `sparky-gate-tests.test.ts` 
3. **Benchmark**: Add to `sparky-performance-benchmarks.test.ts`

Example test pattern:
```typescript
it('should handle new feature identically', async () => {
  const results = await runWithBothBackends('new feature', async () => {
    // Test implementation
    return result;
  });
  
  expectEqualResults(results.snarky, results.sparky, 'new feature');
});
```

## Continuous Integration

These tests should be run:
- On every PR to ensure compatibility
- Nightly for performance regression detection
- Before releases to validate feature parity

## Known Issues

1. **Module Resolution**: Some proof generation scenarios have module resolution errors
2. **Lookup Tables**: Not fully implemented in Sparky
3. **Performance**: Some operations are slightly slower in Sparky (within acceptable range)

## Contributing

When fixing a Sparky issue:
1. Add a failing test that demonstrates the issue
2. Fix the issue in Sparky
3. Ensure the test passes with both backends
4. Run the full test suite to ensure no regressions