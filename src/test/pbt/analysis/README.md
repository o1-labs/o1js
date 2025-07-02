# VK Parity Analysis System

Systematic detection and analysis of the critical VK parity bug where "All Sparky VKs generate identical hash".

## 🎯 Purpose

This system is designed to systematically expose and track the critical blocker preventing 100% VK parity between Snarky (OCaml) and Sparky (Rust) backends. The primary issue is that **all Sparky verification keys generate identical hash values**, making proof verification impossible.

## 🚨 Critical Bug Detection

The system specifically targets the bug where:
- Different ZkPrograms compiled with Sparky produce identical VK hashes
- The same programs compiled with Snarky produce diverse, unique VK hashes  
- This prevents any VK parity between backends
- Root cause: VK generation logic in `sparky-adapter.js`

## 📁 Files

### Core Analysis
- **`VKParityAnalysis.ts`** - Main analysis system with comprehensive VK extraction and bug detection
- **`VKParityAnalysis.test.ts`** - Jest test suite validating all analysis functionality
- **`README.md`** - This documentation

### Quick Testing
- **`../../../test-vk-parity-analysis.mjs`** - Standalone script for immediate bug detection

## 🚀 Quick Start

### Immediate Bug Detection
```bash
# From project root
node test-vk-parity-analysis.mjs
```

### Full Test Suite
```bash
# Run VK parity analysis tests
npm test src/test/pbt/analysis/VKParityAnalysis.test.ts
```

### Programmatic Usage
```typescript
import { createVKParityAnalysis, quickVKParityTest } from './src/test/pbt/analysis/VKParityAnalysis.js';

// Quick test
await quickVKParityTest();

// Detailed analysis
const analysis = createVKParityAnalysis();
const report = await analysis.generateVKDebuggingReport();
console.log(report);
```

## 🔍 Key Features

### 1. VK Hash Extraction
- Extracts VK hashes from real ZkProgram compilation
- Supports both simple circuits and complex programs
- Batch VK generation for multiple test cases
- VK hash comparison utilities

### 2. Identical Hash Bug Detection
```typescript
const bugResult = await analysis.detectIdenticalHashBug();
if (bugResult.bugDetected) {
  console.log('🚨 All Sparky VKs identical:', bugResult.identicalHashValue);
}
```

### 3. Circuit Complexity Analysis
- Generates circuits of varying complexity (8 levels)
- Tracks VK differences across complexity levels
- Identifies at what complexity level VK parity breaks
- Correlation analysis between circuit features and VK parity

### 4. Statistical Analysis
```typescript
const diversity = analysis.analyzeVKDiversity(vkHashes);
console.log('Diversity score:', diversity.diversityScore);
console.log('Suspicious patterns:', diversity.suspiciousPatterns);
```

### 5. Progress Tracking
```typescript
const progress = analysis.trackVKParityProgress();
console.log('Progress:', (progress.progressScore * 100).toFixed(1) + '%');
```

## 📊 Circuit Complexity Levels

The system tests 8 complexity levels to identify where VK parity breaks:

1. **Minimal** (1) - Single field constraint
2. **Simple** (2) - Basic arithmetic operations  
3. **LinearCombination** (3) - Tests reduce_lincom optimization
4. **Moderate** (4) - Multiple intermediate values
5. **Complex** (5) - Multiple operations and constraints
6. **Repetitive** (6) - Loop-like patterns
7. **HighDepth** (7) - Deep computation tree
8. **MultiOutput** (8) - Multiple public outputs

## 🔬 Bug Detection Methods

### Primary Detection: Identical Hash Check
```typescript
const bugResult = await analysis.detectIdenticalHashBug();
// Tests multiple different programs with Sparky
// If all generate identical VK hash → bug confirmed
```

### Secondary Detection: Diversity Analysis
```typescript
const diversity = analysis.analyzeVKDiversity(sparkyHashes);
if (diversity.diversityScore < 0.1) {
  // Very low diversity indicates identical hash bug
}
```

### Tertiary Detection: Parity Analysis
```typescript
const parity = await analysis.analyzeVKParity();
if (parity.matchingVKs === 0) {
  // Zero VK parity indicates systematic backend issue
}
```

## 📈 Expected Results

### Current State (Bug Present)
- **Sparky VK Diversity**: ~0% (all identical)
- **VK Parity Rate**: 0% (no matches with Snarky)
- **Bug Detection**: 🚨 DETECTED
- **Progress Score**: 0%

### Fixed State (Bug Resolved)
- **Sparky VK Diversity**: ~100% (unique hashes)
- **VK Parity Rate**: ~100% (matches Snarky) 
- **Bug Detection**: ✅ Not detected
- **Progress Score**: 100%

## 🎯 Critical Debugging Locations

Based on analysis, the bug is likely in:

1. **Primary**: `src/bindings/sparky-adapter.js` - `compile()` method
2. **Secondary**: VK data structure generation in Sparky
3. **Tertiary**: Hash calculation from VK data

## 📝 Example Output

```
=== VK PARITY DEBUGGING REPORT ===
🔍 IDENTICAL HASH BUG DETECTION:
  Status: 🚨 BUG DETECTED
  Analysis: CRITICAL BUG DETECTED: All 3 different Sparky programs generated identical VK hash
  Identical Hash: 14567890123456789012...
  Affected Programs: TestA, TestB, TestC

📊 VK PARITY ANALYSIS:
  Total Programs Tested: 8
  Matching VKs: 0/8 (0.0%)
  Sparky Identical Hash Bug: 🚨 YES
  VK Diversity Score: 12.5%
  Suspected Bug Location: sparky-adapter.js VK generation logic - likely in compile() method

📈 PROGRESS TRACKING:
  Current Progress Score: 0.0%
  Trends:
    - Zero VK parity - fundamental issue in VK generation
  Recommendations:
    - Focus on VK generation pipeline in Sparky backend
    - Compare VK data structures between backends
```

## 🚨 Priority Actions

1. **IMMEDIATE**: Run `node test-vk-parity-analysis.mjs` to confirm bug
2. **HIGH**: Fix VK generation in `sparky-adapter.js`
3. **MEDIUM**: Re-run analysis to verify fix
4. **LOW**: Optimize for edge cases

## 🧪 Testing Strategy

### Manual Testing
```bash
# Quick detection
node test-vk-parity-analysis.mjs

# Full test suite  
npm test src/test/pbt/analysis/VKParityAnalysis.test.ts
```

### Continuous Integration
```bash
# Add to CI pipeline
npm run test:vk-parity-analysis
```

### Progress Monitoring
```bash
# Regular progress checks
npm run test:framework | grep "VK Parity"
```

## 🔧 Extending the System

### Adding New Circuit Patterns
```typescript
const customLevel: CircuitComplexityLevel = {
  name: 'CustomPattern',
  complexity: 9,
  description: 'Custom circuit pattern',
  generator: () => ZkProgram({
    // Your custom program
  })
};
```

### Custom Analysis
```typescript
const analysis = createVKParityAnalysis();
const customProgram = /* your program */;
const result = await analysis.extractVKAnalysis(customProgram, 'sparky');
```

## 📚 Integration with Existing Tests

This system integrates with:
- `src/test/framework/backend-test-framework.ts` - Backend comparison utilities
- `src/test/integration/sparky-vk-comparison.test.ts` - Existing VK tests
- `src/test/vk-parity-comprehensive.test.ts` - Comprehensive VK testing

## 🎉 Success Criteria

The VK parity bug will be considered fixed when:
1. **Identical Hash Bug**: Not detected (different programs → different hashes)
2. **VK Diversity**: >90% (Sparky generates unique hashes)
3. **VK Parity**: >90% (Sparky hashes match Snarky for same programs)
4. **Progress Score**: >90% (systematic backend compatibility)

This system provides the foundation for tracking progress toward 100% VK parity and Sparky backend compatibility.