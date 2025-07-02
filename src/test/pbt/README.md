# Property-Based Testing Infrastructure for o1js

This directory contains the property-based testing (PBT) infrastructure for verifying compatibility between the Snarky (OCaml) and Sparky (Rust) backends in o1js.

## Directory Structure

```
pbt/
├── infrastructure/      # Core test runner and framework
├── generators/         # Arbitrary generators for o1js types
├── properties/         # Property definitions and test suites
├── utils/             # Backend utilities and comparison functions
└── index.ts           # Main exports
```

## Quick Start

### 1. Basic Property Test

```typescript
import { createBackendComparisonProperty, BackendCompatibilityTestRunner } from './pbt';
import fc from 'fast-check';

// Create a property that tests both backends
const property = createBackendComparisonProperty(
  fc.integer({ min: 0, max: 1000 }),
  async (value, backend) => {
    // Your test logic here
    return someOperation(value);
  }
);

// Run the test
const runner = new BackendCompatibilityTestRunner();
const result = await runner.runPropertyTest('my-test', property);
```

### 2. Field Operation Testing

```typescript
import { FieldCompare, compareBackends } from './pbt/utils/BackendTestUtils';

const results = await compareBackends(async (backend) => {
  const a = Field(100);
  const b = Field(200);
  return a.add(b);
});

// Compare results
if (!FieldCompare.equals(results.snarky.result, results.sparky.result)) {
  console.error('Field operations differ between backends!');
}
```

### 3. Constraint Count Analysis

```typescript
import { ConstraintCompare } from './pbt/utils/BackendTestUtils';

const results = await compareBackends(async (backend) => {
  // Run some circuit
  return circuit.compile();
});

console.log(ConstraintCompare.format(
  results.snarky.constraintCount!,
  results.sparky.constraintCount!
));
```

## Core Components

### BackendCompatibilityTestRunner

The main test runner that provides:
- Property test execution with fast-check
- Result comparison and logging
- Error handling and shrinking
- Test aggregation and reporting

### BackendTestUtils

Utilities for backend operations:
- `switchBackend()` - Switch between Snarky and Sparky
- `runWithBackend()` - Execute code with a specific backend
- `compareBackends()` - Run code on both backends and compare
- Various comparison utilities for Field, Bool, Group types

### Comparison Utilities

- `FieldCompare` - Compare field elements
- `BoolCompare` - Compare boolean values
- `GroupCompare` - Compare elliptic curve points
- `ConstraintCompare` - Analyze constraint count differences
- `PerformanceCompare` - Check performance regressions

## Writing New Tests

### 1. Create a Generator

```typescript
// In generators/my-type.ts
export const myTypeArbitrary = fc.record({
  field1: fieldArbitrary,
  field2: fc.array(fieldArbitrary, { minLength: 1, maxLength: 10 })
});
```

### 2. Define Properties

```typescript
// In properties/my-feature.ts
export const myFeatureProperty = createBackendComparisonProperty(
  myTypeArbitrary,
  async (input, backend) => {
    // Test implementation
    return myFeature(input);
  },
  (snarky, sparky) => {
    // Custom comparison logic
    return deepCompare(snarky, sparky);
  }
);
```

### 3. Run Tests

```typescript
// In your test file
describe('My Feature Compatibility', () => {
  test('property holds for both backends', async () => {
    const runner = new BackendCompatibilityTestRunner();
    const result = await runner.runPropertyTest(
      'my-feature',
      myFeatureProperty,
      { numRuns: 1000 }
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Known Issues

The PBT infrastructure is designed to help identify and track these known compatibility issues:

1. **VK Hash Mismatch** - All Sparky VKs generate identical hash
2. **Constraint Count Differences** - Missing `reduce_lincom` optimization
3. **Module Resolution Errors** - Proof generation fails with Sparky

## Best Practices

1. **Start Simple** - Begin with atomic operations before testing complex circuits
2. **Use Shrinking** - Let fast-check minimize failing cases automatically
3. **Log Differences** - Use the comparison utilities to understand mismatches
4. **Track Progress** - Use aggregated results to monitor compatibility improvements
5. **Handle Known Issues** - Account for expected differences in your tests

## Running Tests

```bash
# Run all PBT tests
npm run test:pbt

# Run specific test file
npx jest src/test/pbt/properties/field-ops.test.ts

# Run with specific seed for reproduction
npx jest --seed=12345
```

## Next Steps

To use this infrastructure with actual o1js backends:

1. Initialize backend utilities with real switching functions:
   ```typescript
   import { switchBackend, getCurrentBackend } from 'o1js';
   import { initializeBackendUtils } from './pbt/utils/BackendTestUtils';
   
   initializeBackendUtils(switchBackend, getCurrentBackend);
   ```

2. Replace mock types with actual o1js imports
3. Implement constraint system capture functions
4. Add more sophisticated generators for complex types

## Contributing

When adding new tests:
1. Follow the existing structure
2. Document known issues in test comments
3. Use meaningful test names
4. Include shrinking examples for complex failures
5. Update this README with new patterns