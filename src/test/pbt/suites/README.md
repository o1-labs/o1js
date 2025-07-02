# Comprehensive PBT Test Suites

This directory contains comprehensive Property-Based Testing (PBT) suites that systematically analyze backend compatibility between Snarky (OCaml) and Sparky (Rust) backends.

## 🎯 Overview

The Comprehensive Compatibility Test Suite is designed to:

1. **Quantify exact compatibility state** between Snarky and Sparky backends
2. **Provide systematic analysis** with escalating complexity levels
3. **Handle failures gracefully** while still providing useful insights
4. **Generate actionable reports** for achieving 100% backend parity
5. **Track progress over time** toward full compatibility

## 🚀 Quick Start

### Run Quick Compatibility Check

```typescript
import { quickCompatibilityCheck } from './ComprehensiveCompatibilityTestSuite.js';

const result = await quickCompatibilityCheck();
console.log(`Compatibility: ${result.compatibilityPercentage.toFixed(1)}%`);
console.log(`Critical Issues: ${result.criticalIssues.length}`);
```

### Run Full Comprehensive Analysis

```typescript
import { runComprehensiveCompatibilityTests, TestSeverity } from './ComprehensiveCompatibilityTestSuite.js';

const report = await runComprehensiveCompatibilityTests({
  severityLevels: [TestSeverity.MINIMAL, TestSeverity.BASIC, TestSeverity.INTERMEDIATE],
  gracefulFailureHandling: true,
  enableVKTesting: true,
  numRuns: 50
});

console.log(`Overall Compatibility: ${report.compatibilityPercentage.toFixed(1)}%`);
console.log(`VK Parity: ${report.vkParityAnalysis.vkParityPercentage.toFixed(1)}%`);
```

### Run with Custom Configuration

```typescript
import { ComprehensiveCompatibilityTestSuite } from './ComprehensiveCompatibilityTestSuite.js';

const suite = new ComprehensiveCompatibilityTestSuite({
  severityLevels: [TestSeverity.ADVANCED],
  timeoutMs: 120000,
  enableVKTesting: true,
  enablePerformanceTesting: true,
  gracefulFailureHandling: true,
  verboseLogging: false
});

const report = await suite.runComprehensiveTests();
```

## 📊 Test Severity Levels

The test suite runs tests in progressive complexity levels:

### 🟢 MINIMAL
- Basic field operations (add, mul)
- Backend switching verification
- **Focus**: Core functionality validation

### 🟡 BASIC  
- Field property tests (commutative, associative, identity)
- Simple constraint analysis
- **Focus**: Mathematical property verification

### 🟠 INTERMEDIATE
- Complex field expressions
- Cryptographic operations (Poseidon)
- Performance benchmarking
- **Focus**: Real-world operation testing

### 🔴 ADVANCED
- VK parity testing across circuit complexities
- Constraint optimization analysis
- **Focus**: VK generation and optimization differences

### 🟣 COMPREHENSIVE
- All field properties
- Complete VK parity analysis
- Backend infrastructure testing
- **Focus**: Exhaustive compatibility validation

## 📋 Configuration Options

```typescript
interface ComprehensiveTestConfig {
  // Test Selection
  severityLevels: TestSeverity[];        // Which severity levels to run
  skipKnownFailures: boolean;            // Skip tests known to fail
  gracefulFailureHandling: boolean;      // Continue on failures vs crash
  
  // Execution Parameters
  timeoutMs: number;                     // Per-test timeout
  maxRetries: number;                    // Retry failed tests
  parallelExecution: boolean;            // Run tests in parallel
  numRuns: number;                       // Property test iterations
  
  // Backend Configuration
  testBothBackends: boolean;             // Test Snarky and Sparky
  startingBackend: 'snarky' | 'sparky';  // Initial backend
  
  // VK Parity Testing
  enableVKTesting: boolean;              // Enable VK generation tests
  vkTimeoutMs: number;                   // VK-specific timeout
  
  // Performance Analysis
  enablePerformanceTesting: boolean;     // Enable performance comparisons
  performanceThresholds: {               // Performance acceptance criteria
    executionTimeRatio: number;          // Max acceptable slowdown (e.g., 1.5x)
    memoryRatio: number;                 // Max memory usage ratio
    constraintRateRatio: number;         // Min constraint generation rate
  };
  
  // Reporting
  verboseLogging: boolean;               // Detailed logging
  generateDetailedReport: boolean;       // Write report to file
  trackProgressOverTime: boolean;        // Track historical progress
}
```

## 📈 Report Structure

The comprehensive test suite generates detailed reports with:

### Overall Metrics
- Total compatibility percentage
- Tests passed/failed/skipped breakdown
- Test execution duration

### Category Breakdown
```typescript
categoryBreakdown: {
  'field_arithmetic': { total: 12, passed: 10, failed: 2, percentage: 83.3 },
  'vk_parity': { total: 8, passed: 1, failed: 7, percentage: 12.5 },
  'constraint_analysis': { total: 5, passed: 3, failed: 2, percentage: 60.0 }
}
```

### VK Parity Analysis
- VK hash match percentage
- Detection of "identical hash bug" (all Sparky VKs identical)
- VK diversity score
- Per-complexity-level breakdown

### Performance Analysis
- Average performance ratio (Sparky vs Snarky)
- Tests within/exceeding performance thresholds
- Specific performance regressions

### Error Analysis
- Sparky/Snarky compilation failure counts
- Constraint count mismatches
- Timeout occurrences
- Critical vs recoverable errors

### Actionable Summary
- Current compatibility state assessment
- Critical blockers to 100% parity
- Immediate recommended actions
- Progress tracking toward full compatibility

## 🔧 Usage Examples

### Monitor VK Parity Progress

```typescript
// Focus on VK parity issues
const vkFocusedConfig = {
  severityLevels: [TestSeverity.ADVANCED],
  enableVKTesting: true,
  gracefulFailureHandling: true,
  numRuns: 100,
  vkTimeoutMs: 180000
};

const report = await runComprehensiveCompatibilityTests(vkFocusedConfig);

console.log('VK Parity Analysis:');
console.log(`- Hash Matches: ${report.vkParityAnalysis.vkHashMatches}/${report.vkParityAnalysis.totalVKTests}`);
console.log(`- Identical Hash Bug: ${report.vkParityAnalysis.identicalHashBugDetected ? 'DETECTED' : 'Not detected'}`);
console.log(`- Diversity Score: ${(report.vkParityAnalysis.sparkyVKDiversityScore * 100).toFixed(1)}%`);
```

### Performance Benchmarking

```typescript
// Focus on performance analysis
const perfConfig = {
  severityLevels: [TestSeverity.INTERMEDIATE],
  enablePerformanceTesting: true,
  performanceThresholds: {
    executionTimeRatio: 1.5,  // Allow 1.5x slowdown
    memoryRatio: 2.0,         // Allow 2x memory usage
    constraintRateRatio: 0.5  // Require 50% constraint rate
  },
  numRuns: 30
};

const report = await runComprehensiveCompatibilityTests(perfConfig);

console.log('Performance Analysis:');
console.log(`- Average Performance Ratio: ${report.performanceAnalysis.averagePerformanceRatio.toFixed(2)}x`);
console.log(`- Within Thresholds: ${report.performanceAnalysis.withinThresholds}`);
console.log(`- Exceeds Thresholds: ${report.performanceAnalysis.exceedsThresholds}`);
```

### Constraint System Analysis

```typescript
// Focus on constraint differences
const constraintConfig = {
  severityLevels: [TestSeverity.BASIC, TestSeverity.INTERMEDIATE],
  gracefulFailureHandling: true,
  numRuns: 50,
  skipKnownFailures: false  // Test even known failing patterns
};

const report = await runComprehensiveCompatibilityTests(constraintConfig);

console.log('Constraint Analysis:');
console.log(`- Constraint Mismatches: ${report.errorAnalysis.constraintMismatches}`);

// Examine specific constraint differences
report.testResults
  .filter(r => r.backendComparison && !r.backendComparison.constraintsEqual)
  .forEach(r => {
    console.log(`- ${r.name}: ${r.backendComparison.differences.join(', ')}`);
  });
```

### Continuous Integration Usage

```typescript
// CI-friendly configuration
const ciConfig = {
  severityLevels: [TestSeverity.MINIMAL, TestSeverity.BASIC],
  timeoutMs: 60000,
  numRuns: 25,
  gracefulFailureHandling: true,
  verboseLogging: false,
  generateDetailedReport: true
};

const report = await runComprehensiveCompatibilityTests(ciConfig);

// Exit with error code if compatibility is too low
if (report.compatibilityPercentage < 80) {
  console.error(`Compatibility ${report.compatibilityPercentage.toFixed(1)}% is below threshold`);
  process.exit(1);
}
```

## 🎯 Key Features

### 1. **Systematic Testing**
- Progressive complexity levels
- Comprehensive property coverage
- Real backend integration

### 2. **Graceful Failure Handling**
- Continues testing even when Sparky compilation fails
- Distinguishes recoverable vs critical errors
- Provides partial results for analysis

### 3. **VK Parity Focus**
- Detects "identical hash bug" where all Sparky VKs are identical
- Tests across circuit complexity levels
- Pinpoints specific VK generation issues

### 4. **Performance Analysis**
- Backend performance comparison
- Configurable performance thresholds
- Regression detection

### 5. **Actionable Reporting**
- Quantified compatibility percentages
- Specific error categorization
- Immediate action recommendations

### 6. **Progress Tracking**
- Historical compatibility trends
- Specific areas of improvement/regression
- Roadmap to 100% compatibility

## 🔍 Understanding Results

### Compatibility Percentage Interpretation

- **90-100%**: Near-complete compatibility, focus on edge cases
- **70-89%**: Good compatibility, address remaining systematic issues  
- **50-69%**: Moderate compatibility, significant work needed
- **25-49%**: Low compatibility, fundamental issues present
- **0-24%**: Critical compatibility issues, major architectural work required

### VK Parity Analysis

- **identicalHashBugDetected: true**: Critical - all Sparky VKs generate same hash
- **vkParityPercentage < 25%**: Major VK generation differences
- **sparkyVKDiversityScore < 0.5**: Sparky not generating diverse VK hashes

### Critical Blockers

Common critical blockers include:
- Sparky generates identical VK hashes for all circuits
- High Sparky compilation failure rate (>30%)
- Constraint routing bug (globalThis.__snarky not updated)
- Missing reduce_lincom optimization causing constraint count differences

## 🚦 Running Tests

### Command Line
```bash
# Run minimal test suite
npm run test src/test/pbt/suites/ComprehensiveCompatibilityTestSuite.test.ts

# Run with specific Jest options
npx jest --testPathPattern=ComprehensiveCompatibilityTestSuite --verbose

# Run single test
npx jest --testNamePattern="should run quick compatibility check"
```

### Programmatic Usage
```typescript
import { runComprehensiveCompatibilityTests } from './ComprehensiveCompatibilityTestSuite.js';

// In your test file or script
const report = await runComprehensiveCompatibilityTests({
  severityLevels: [TestSeverity.MINIMAL],
  gracefulFailureHandling: true
});

console.log(`Compatibility: ${report.compatibilityPercentage}%`);
```

## 📝 Contributing

When adding new test cases:

1. **Choose appropriate severity level** based on complexity
2. **Implement graceful failure handling** for Sparky compilation issues
3. **Add proper categorization** for reporting
4. **Include shrinking support** for property tests where applicable
5. **Document expected behavior** and known issues

### Example Test Case Addition

```typescript
// Add to getAdvancedTests() method
{
  name: 'poseidon_hash_vk_parity',
  category: 'cryptographic_vk_parity',
  type: 'vk_parity',
  shrinkable: false,
  programGenerator: () => ZkProgram({
    name: 'PoseidonHashProgram',
    publicInput: Field,
    methods: {
      hash: {
        privateInputs: [Field, Field],
        async method(pub, a, b) {
          const hash = Poseidon.hash([a, b]);
          hash.assertEquals(pub);
        }
      }
    }
  })
}
```

## 🎯 Goals and Roadmap

### Current State (July 2025)
- ✅ Comprehensive test framework implemented
- ✅ Graceful failure handling for Sparky issues
- ✅ Systematic compatibility quantification
- ⚠️ VK parity critical blocker: identical hash bug
- ⚠️ Constraint routing bug in backend switching

### Near-term Goals
1. Fix Sparky VK generation to produce unique hashes
2. Resolve constraint routing bug (globalThis.__snarky)
3. Implement missing reduce_lincom optimization
4. Achieve 80% compatibility on basic tests

### Long-term Goals
1. 100% VK parity across all circuit types
2. Performance within 1.5x of Snarky for all operations
3. Zero compilation failures with graceful error handling
4. Complete constraint system compatibility

The comprehensive test suite provides systematic tracking toward these goals with quantified metrics and actionable insights.