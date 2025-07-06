/**
 * MASTER VK DEBUG RUNNER
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Comprehensive VK debugging that combines all debug tools
 * Features:
 * - Zero-constraint analysis
 * - Benchmark comparison
 * - Component extraction
 * - Pattern analysis
 * - Detailed reporting
 */

import { runVKDebugHarness } from './vk-debug-harness.js';
import { 
  runVKBenchmarkComparison, 
  analyzeVKPatterns, 
  generateBenchmarkReport 
} from './vk-benchmark-comparison.js';
import { 
  extractDetailedVKComponents,
  compareVKComponents,
  generateVKComponentReport,
  generateHexDump
} from './vk-component-extractor.js';

// =============================================================================
// MASTER DEBUG INTERFACE
// =============================================================================

interface MasterDebugResults {
  zeroConstraintResults: any[];
  benchmarkResults: any;
  componentAnalysis: any[];
  patterns: {
    fundamentalIssue: boolean;
    constraintSystemIssue: boolean;
    permutationIssue: boolean;
    specificCircuitIssues: boolean;
  };
  recommendations: string[];
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

function detectVKPatterns(
  zeroConstraintResults: any[],
  benchmarkResults: any
): MasterDebugResults['patterns'] {
  const patterns = {
    fundamentalIssue: false,
    constraintSystemIssue: false,
    permutationIssue: false,
    specificCircuitIssues: false,
  };

  // Check if even empty circuits fail
  const emptyCircuitFailures = zeroConstraintResults.filter((r: any) => !r.hashMatch && r.circuitName.includes('Empty'));
  if (emptyCircuitFailures.length > 0) {
    patterns.fundamentalIssue = true;
  }

  // Check if constraint counts are consistently wrong
  const constraintMismatches = [
    ...zeroConstraintResults.filter((r: any) => !r.constraintCountMatch),
    ...benchmarkResults.results.filter((r: any) => !r.constraintCountMatch),
  ];
  if (constraintMismatches.length > 0) {
    patterns.constraintSystemIssue = true;
  }

  // Check if VK hashes fail but constraint counts match
  const vkHashFailsButConstraintsMatch = [
    ...zeroConstraintResults.filter((r: any) => !r.hashMatch && r.constraintCountMatch),
    ...benchmarkResults.results.filter((r: any) => !r.vkHashMatch && r.constraintCountMatch),
  ];
  if (vkHashFailsButConstraintsMatch.length > 0) {
    patterns.permutationIssue = true;
  }

  // Check if some circuits work but others don't
  const allResults = [...zeroConstraintResults, ...benchmarkResults.results];
  const matches = allResults.filter((r: any) => r.hashMatch || r.vkHashMatch);
  const mismatches = allResults.filter((r: any) => !r.hashMatch && !r.vkHashMatch);
  if (matches.length > 0 && mismatches.length > 0) {
    patterns.specificCircuitIssues = true;
  }

  return patterns;
}

// =============================================================================
// RECOMMENDATION GENERATION
// =============================================================================

function generateRecommendations(
  patterns: MasterDebugResults['patterns'],
  zeroConstraintResults: any[],
  benchmarkResults: any
): string[] {
  const recommendations = [];

  if (patterns.fundamentalIssue) {
    recommendations.push('🔴 CRITICAL: Fundamental implementation issue detected');
    recommendations.push('  → Empty circuits fail - check basic permutation polynomial construction');
    recommendations.push('  → Verify sigma commitment generation in Sparky WASM');
    recommendations.push('  → Debug domain setup and initialization');
  }

  if (patterns.constraintSystemIssue) {
    recommendations.push('🔴 CRITICAL: Constraint system generation differs between backends');
    recommendations.push('  → Check gate generation and witness handling');
    recommendations.push('  → Verify constraint system serialization');
    recommendations.push('  → Debug equivalence class construction');
  }

  if (patterns.permutationIssue) {
    recommendations.push('🟡 MAJOR: Permutation polynomial issue detected');
    recommendations.push('  → Constraint counts match but VK hashes differ');
    recommendations.push('  → Focus on permutation evaluation in Sparky');
    recommendations.push('  → Check sigma polynomial generation');
    recommendations.push('  → This is the most likely root cause');
  }

  if (patterns.specificCircuitIssues) {
    recommendations.push('🟡 MODERATE: Circuit-specific issues detected');
    recommendations.push('  → Some circuits work, others don\'t');
    recommendations.push('  → Check for circuit complexity thresholds');
    recommendations.push('  → Verify specific gate implementations');
  }

  // Success case
  if (!patterns.fundamentalIssue && !patterns.constraintSystemIssue && !patterns.permutationIssue && !patterns.specificCircuitIssues) {
    recommendations.push('✅ EXCELLENT: All VKs match - implementation is working correctly!');
    recommendations.push('  → Ready for comprehensive testing');
    recommendations.push('  → Consider performance optimization');
  }

  return recommendations;
}

// =============================================================================
// DETAILED COMPONENT ANALYSIS
// =============================================================================

async function performDetailedComponentAnalysis(
  zeroConstraintResults: any[]
): Promise<any[]> {
  const componentAnalysis = [];

  for (const result of zeroConstraintResults) {
    if (result.snarkyAnalysis?.vkComponents?.data && result.sparkyAnalysis?.vkComponents?.data) {
      try {
        const snarkyComponents = extractDetailedVKComponents(result.snarkyAnalysis.vkComponents);
        const sparkyComponents = extractDetailedVKComponents(result.sparkyAnalysis.vkComponents);
        const componentComparison = compareVKComponents(snarkyComponents, sparkyComponents);
        
        componentAnalysis.push({
          circuitName: result.circuitName,
          snarkyComponents,
          sparkyComponents,
          comparison: componentComparison,
          report: generateVKComponentReport(result.circuitName, snarkyComponents, sparkyComponents, componentComparison),
        });
      } catch (error) {
        console.error(`Failed to analyze components for ${result.circuitName}:`, error);
      }
    }
  }

  return componentAnalysis;
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

async function runMasterVKDebugInternal(): Promise<MasterDebugResults> {
  console.log('🚀 MASTER VK DEBUG RUNNER');
  console.log('=' .repeat(80));
  console.log('Starting comprehensive VK debugging analysis...\n');

  const startTime = Date.now();

  // Phase 1: Zero-constraint analysis
  console.log('📋 PHASE 1: ZERO-CONSTRAINT ANALYSIS');
  console.log('─'.repeat(60));
  const zeroConstraintResults = await runVKDebugHarness();

  // Phase 2: Benchmark comparison
  console.log('\n📋 PHASE 2: BENCHMARK COMPARISON');
  console.log('─'.repeat(60));
  const benchmarkResults = await runVKBenchmarkComparison();
  analyzeVKPatterns(benchmarkResults);

  // Phase 3: Detailed component analysis
  console.log('\n📋 PHASE 3: DETAILED COMPONENT ANALYSIS');
  console.log('─'.repeat(60));
  const componentAnalysis = await performDetailedComponentAnalysis(zeroConstraintResults);

  // Phase 4: Pattern detection
  console.log('\n📋 PHASE 4: PATTERN DETECTION');
  console.log('─'.repeat(60));
  const patterns = detectVKPatterns(zeroConstraintResults, benchmarkResults);

  // Phase 5: Recommendation generation
  console.log('\n📋 PHASE 5: RECOMMENDATION GENERATION');
  console.log('─'.repeat(60));
  const recommendations = generateRecommendations(patterns, zeroConstraintResults, benchmarkResults);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Compile results
  const results: MasterDebugResults = {
    zeroConstraintResults,
    benchmarkResults,
    componentAnalysis,
    patterns,
    recommendations,
  };

  // Generate final report
  console.log('\n📊 MASTER DEBUG RESULTS');
  console.log('=' .repeat(80));
  
  console.log(`\n⏱️  Analysis completed in ${duration}ms`);
  console.log(`📊 Zero-constraint tests: ${zeroConstraintResults.length}`);
  console.log(`📊 Benchmark tests: ${benchmarkResults.totalCircuits}`);
  console.log(`📊 Component analyses: ${componentAnalysis.length}`);
  
  const totalZeroMatches = zeroConstraintResults.filter((r: any) => r.hashMatch).length;
  const totalBenchmarkMatches = benchmarkResults.matchingVKs;
  const totalTests = zeroConstraintResults.length + benchmarkResults.totalCircuits;
  const totalMatches = totalZeroMatches + totalBenchmarkMatches;
  
  console.log(`\n🎯 OVERALL RESULTS:`);
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Successful matches: ${totalMatches}`);
  console.log(`  Failed matches: ${totalTests - totalMatches}`);
  console.log(`  Success rate: ${Math.round((totalMatches / totalTests) * 100)}%`);
  
  console.log(`\n🔍 PATTERN ANALYSIS:`);
  console.log(`  Fundamental issue: ${patterns.fundamentalIssue ? '❌ YES' : '✅ NO'}`);
  console.log(`  Constraint system issue: ${patterns.constraintSystemIssue ? '❌ YES' : '✅ NO'}`);
  console.log(`  Permutation issue: ${patterns.permutationIssue ? '❌ YES' : '✅ NO'}`);
  console.log(`  Specific circuit issues: ${patterns.specificCircuitIssues ? '❌ YES' : '✅ NO'}`);
  
  console.log(`\n🎯 RECOMMENDATIONS:`);
  recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });

  // Generate detailed reports if requested
  if (process.env.VK_DEBUG_DETAILED === 'true') {
    console.log('\n📝 DETAILED REPORTS:');
    console.log('─'.repeat(60));
    
    // Component analysis reports
    if (componentAnalysis.length > 0) {
      console.log('\n🔍 COMPONENT ANALYSIS REPORTS:');
      componentAnalysis.forEach((analysis, i) => {
        console.log(`\n${i + 1}. ${analysis.circuitName}:`);
        console.log(analysis.report);
      });
    }
    
    // Benchmark report
    console.log('\n📊 BENCHMARK REPORT:');
    console.log(generateBenchmarkReport(benchmarkResults));
  }

  return results;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    const results = await runMasterVKDebugInternal();
    
    // Exit with appropriate code
    const hasIssues = results.patterns.fundamentalIssue || 
                      results.patterns.constraintSystemIssue || 
                      results.patterns.permutationIssue;
    
    if (hasIssues) {
      console.log('\n❌ DEBUG COMPLETE: Issues detected - see recommendations above');
      process.exit(1);
    } else {
      console.log('\n✅ DEBUG COMPLETE: All VKs match - implementation is working correctly!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Master VK debug failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMasterVKDebugInternal as runMasterVKDebug, MasterDebugResults };