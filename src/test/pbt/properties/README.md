# Field Properties for Backend Compatibility Testing

This directory contains comprehensive property-based test definitions for testing compatibility between Snarky and Sparky backends in o1js.

## Overview

The `FieldProperties.ts` module defines property-based tests that systematically verify:

1. **Field Arithmetic Parity**: Both backends produce identical results
2. **VK Hash Consistency**: Identical circuits generate the same verification keys
3. **Constraint Count Analysis**: Constraint generation differences within tolerance
4. **Performance Characteristics**: Sparky performance within 1.5x of Snarky
5. **Error Handling Consistency**: Both backends fail identically for invalid operations

## Key Features

### Core Property Tests

- **Commutative Properties**: `a + b = b + a`, `a * b = b * a`
- **Associative Properties**: `(a + b) + c = a + (b + c)`, `(a * b) * c = a * (b * c)`
- **Identity Properties**: `a + 0 = a`, `a * 1 = a`
- **Backend Consistency**: Results identical across Snarky and Sparky

### Critical Issue Detection

- **VK Parity Testing**: Identifies the critical bug where all Sparky VKs generate identical hashes
- **Constraint Routing**: Detects `globalThis.__snarky` routing issues
- **Optimization Differences**: Finds missing optimizations like `reduce_lincom`

### Tolerance-Based Analysis

- **Constraint Count Tolerance**: Allows up to 70% difference for known optimization gaps
- **Performance Bounds**: Accepts up to 1.5x performance difference
- **Error Pattern Matching**: Ensures consistent error handling

## Usage

### Basic Usage

```typescript
import { FieldProperties, createFieldProperties } from './FieldProperties.js';
import { BackendCompatibilityTestRunner } from '../infrastructure/BackendCompatibilityTestRunner.js';

// Create test runner and properties
const runner = new BackendCompatibilityTestRunner();
const fieldProperties = createFieldProperties(runner);

// Run a specific property test
const property = fieldProperties.additionCommutative();
const result = await runner.runPropertyTest('addition_test', property, {
  numRuns: 100,
  timeout: 30000
});
```

### Comprehensive Testing

```typescript
// Run all field properties
const allProperties = fieldProperties.getAllProperties();
const results = await runner.runPropertyTests(allProperties);

console.log(`Success rate: ${(results.passedTests / results.totalTests * 100).toFixed(1)}%`);
```

### Focused VK Parity Testing

```typescript
// Focus on VK parity issues
const vkProperties = fieldProperties.getVKParityProperties();
const vkResults = await runner.runPropertyTests(vkProperties);
```

### Constraint Count Analysis

```typescript
// Analyze constraint count differences
const constraintProperties = fieldProperties.getConstraintCountProperties();
const constraintResults = await runner.runPropertyTests(constraintProperties);
```

## Property Categories

### 1. Algebraic Properties
- `additionCommutative()`: Tests `a + b = b + a`
- `additionAssociative()`: Tests `(a + b) + c = a + (b + c)`
- `multiplicationCommutative()`: Tests `a * b = b * a`
- `multiplicationAssociative()`: Tests `(a * b) * c = a * (b * c)`
- `additiveIdentity()`: Tests `a + 0 = a`
- `multiplicativeIdentity()`: Tests `a * 1 = a`

### 2. Operation Consistency
- `squareConsistency()`: Tests `a.square() = a * a`
- `divisionInverse()`: Tests `(a / b) * b = a`
- `complexExpressionConsistency()`: Tests complex field expressions

### 3. Critical VK Parity Tests
- `vkHashConsistency()`: **Critical** - Tests VK hash equality for identical circuits
- `multiplicationCommutative()` with VK checking
- `complexExpressionConsistency()` with VK verification

### 4. Constraint Analysis
- `constraintCountTolerance()`: Tests constraint counts within bounds
- `divisionInverse()` with constraint counting (detects missing `reduce_lincom`)

### 5. Error Handling
- `divisionByZeroConsistency()`: Both backends should fail identically
- `errorHandlingConsistency()`: Comprehensive error pattern matching

### 6. Performance Testing
- `performanceWithinBounds()`: Tests Sparky ≤ 1.5x slower than Snarky

## Expected Results (Current State)

Based on the current backend compatibility issues:

### ✅ Expected to Pass
- Basic algebraic properties (addition/multiplication commutativity/associativity)
- Identity properties
- Error handling consistency
- Performance within bounds (mostly)

### 🚨 Expected to Fail (Known Issues)
- **VK Hash Consistency**: All Sparky VKs generate identical hashes
- **Constraint Count Tolerance**: Missing `reduce_lincom` optimization (Sparky: 5, Snarky: 3)
- **Complex Expression VK Parity**: Structural differences in circuit generation

### ⚠️ May Fail (Investigation Needed)
- Division operations (constraint routing issues)
- Complex expressions (optimization differences)

## Integration with Test Framework

### Jest Integration

```typescript
// FieldProperties.example.test.ts shows complete Jest integration
describe('Backend Compatibility', () => {
  test('field properties', async () => {
    const properties = fieldProperties.getAllProperties();
    const results = await runner.runPropertyTests(properties);
    
    // Log detailed analysis of failures
    logBackendCompatibilityReport(results);
  });
});
```

### Command Line Usage

```bash
# Run property-based tests
npm run test:pbt

# Run with specific focus
npm run test:pbt:vk-parity
npm run test:pbt:constraints
```

## Configuration Options

### Test Configuration

```typescript
interface TestConfig {
  seed?: number;           // Deterministic test runs
  numRuns?: number;        // Number of property test iterations
  timeout?: number;        // Test timeout in milliseconds
  verbose?: boolean;       // Detailed logging
  beforeEach?: () => void; // Setup hook
  afterEach?: () => void;  // Cleanup hook
}
```

### Tolerance Settings

```typescript
// Constraint count tolerance (default: 50%)
const constraintTolerance = 70; // Allow 70% difference for known issues

// Performance tolerance (default: 1.5x)
const performanceTolerance = 1.5; // Sparky ≤ 1.5x slower than Snarky
```

## Debugging and Analysis

### VK Parity Debugging

```typescript
const comparison = await compareVKs(snarkyVK, sparkyVK, circuitType);
if (!comparison.hashesEqual) {
  console.error('VK PARITY ISSUE:');
  console.error(`Snarky VK: ${comparison.snarkyVK}`);
  console.error(`Sparky VK: ${comparison.sparkyVK}`);
  console.error('Differences:', comparison.differences);
}
```

### Constraint Count Analysis

```typescript
const constraintComparison = compareConstraintCounts(snarkyCount, sparkyCount);
if (!constraintComparison.withinTolerance) {
  console.warn(`Constraint difference: ${constraintComparison.differencePercentage}%`);
  console.warn('Likely missing optimization in Sparky');
}
```

## Future Enhancements

### When VK Parity is Fixed
1. Remove tolerance for VK hash mismatches
2. Tighten constraint count tolerances
3. Add more complex circuit pattern tests

### Additional Property Categories
1. **Foreign Field Operations**: Cross-chain compatibility
2. **Lookup Table Properties**: Efficient table operations
3. **Recursive Proof Properties**: Proof composition
4. **Range Check Properties**: Constraint optimization

## Contributing

When adding new properties:

1. Follow the existing pattern in `FieldProperties.ts`
2. Include both positive and negative test cases
3. Add comprehensive error handling
4. Document expected failure modes
5. Include performance expectations
6. Add examples in the test file

### Property Test Best Practices

1. **Shrinking-Friendly**: Use generators that shrink to minimal counterexamples
2. **Deterministic**: Support seeded runs for reproducible failures
3. **Timeout-Aware**: Handle long-running operations gracefully
4. **Backend-Agnostic**: Properties should work with any backend implementation
5. **Error-Descriptive**: Provide detailed failure information for debugging