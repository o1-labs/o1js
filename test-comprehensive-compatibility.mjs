#!/usr/bin/env node

/**
 * Standalone test runner for the Comprehensive Compatibility Test Suite
 * 
 * This script can be run directly to immediately quantify Snarky-Sparky
 * backend compatibility and identify critical issues.
 * 
 * Usage:
 *   node test-comprehensive-compatibility.mjs [--quick] [--minimal] [--basic] [--intermediate] [--advanced] [--comprehensive]
 */

import { 
  runComprehensiveCompatibilityTests,
  quickCompatibilityCheck,
  TestSeverity
} from './src/test/pbt/suites/ComprehensiveCompatibilityTestSuite.js';

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 o1js Backend Compatibility Analysis');
  console.log('=' .repeat(50));
  console.log('Analyzing Snarky (OCaml) vs Sparky (Rust) backend compatibility...\n');
  
  try {
    if (args.includes('--quick')) {
      console.log('📋 Running Quick Compatibility Check...\n');
      await runQuickCheck();
    } else if (args.includes('--minimal')) {
      console.log('📋 Running MINIMAL Severity Tests...\n');
      await runSeverityTest([TestSeverity.MINIMAL]);
    } else if (args.includes('--basic')) {
      console.log('📋 Running BASIC Severity Tests...\n');
      await runSeverityTest([TestSeverity.BASIC]);
    } else if (args.includes('--intermediate')) {
      console.log('📋 Running INTERMEDIATE Severity Tests...\n');
      await runSeverityTest([TestSeverity.INTERMEDIATE]);
    } else if (args.includes('--advanced')) {
      console.log('📋 Running ADVANCED Severity Tests (VK Focus)...\n');
      await runSeverityTest([TestSeverity.ADVANCED]);
    } else if (args.includes('--comprehensive')) {
      console.log('📋 Running COMPREHENSIVE Analysis (All Tests)...\n');
      await runSeverityTest([
        TestSeverity.MINIMAL,
        TestSeverity.BASIC,
        TestSeverity.INTERMEDIATE,
        TestSeverity.ADVANCED,
        TestSeverity.COMPREHENSIVE
      ]);
    } else {
      console.log('📋 Running Progressive Compatibility Analysis...\n');
      await runProgressiveAnalysis();
    }
    
  } catch (error) {
    console.error('\n❌ Compatibility analysis failed:');
    console.error(error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

async function runQuickCheck() {
  const startTime = Date.now();
  
  try {
    const result = await quickCompatibilityCheck();
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('✨ Quick Compatibility Check Results:');
    console.log('-'.repeat(40));
    console.log(`⚡ Compatibility: ${result.compatibilityPercentage.toFixed(1)}%`);
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    
    if (result.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues Detected:');
      result.criticalIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No critical issues detected');
    }
    
    console.log(`\n📊 Summary: ${result.summary}`);
    
    // Provide next steps based on compatibility level
    if (result.compatibilityPercentage >= 90) {
      console.log('\n🎯 Next Steps: Focus on edge cases and comprehensive testing');
      console.log('   Run: node test-comprehensive-compatibility.mjs --comprehensive');
    } else if (result.compatibilityPercentage >= 70) {
      console.log('\n🎯 Next Steps: Address remaining systematic issues');
      console.log('   Run: node test-comprehensive-compatibility.mjs --advanced');
    } else if (result.compatibilityPercentage >= 50) {
      console.log('\n🎯 Next Steps: Focus on intermediate complexity issues');
      console.log('   Run: node test-comprehensive-compatibility.mjs --intermediate');
    } else {
      console.log('\n🎯 Next Steps: Address fundamental compatibility issues');
      console.log('   Run: node test-comprehensive-compatibility.mjs --basic');
    }
    
  } catch (error) {
    console.error('❌ Quick check failed:', error.message);
    throw error;
  }
}

async function runSeverityTest(severityLevels) {
  const startTime = Date.now();
  
  const config = {
    severityLevels,
    numRuns: severityLevels.includes(TestSeverity.COMPREHENSIVE) ? 20 : 10,
    timeoutMs: 60000,
    gracefulFailureHandling: true,
    verboseLogging: false,
    enableVKTesting: true,
    enablePerformanceTesting: true,
    generateDetailedReport: false,
    skipKnownFailures: true
  };
  
  console.log(`🔧 Configuration:`);
  console.log(`   Severity Levels: ${severityLevels.join(', ')}`);
  console.log(`   Property Test Runs: ${config.numRuns}`);
  console.log(`   Graceful Failure Handling: ${config.gracefulFailureHandling}`);
  console.log(`   VK Testing: ${config.enableVKTesting}`);
  console.log(`   Performance Testing: ${config.enablePerformanceTesting}`);
  console.log('');
  
  try {
    const report = await runComprehensiveCompatibilityTests(config);
    const duration = (Date.now() - startTime) / 1000;
    
    printDetailedReport(report, duration);
    
  } catch (error) {
    console.error(`❌ ${severityLevels.join('/')} severity test failed:`, error.message);
    throw error;
  }
}

async function runProgressiveAnalysis() {
  console.log('📈 Progressive Analysis: Running tests in increasing complexity...\n');
  
  const severitySequence = [
    TestSeverity.MINIMAL,
    TestSeverity.BASIC,
    TestSeverity.INTERMEDIATE
  ];
  
  let overallCompatibility = 0;
  const severityResults = [];
  
  for (const severity of severitySequence) {
    console.log(`🔄 Running ${severity.toUpperCase()} tests...`);
    
    try {
      const config = {
        severityLevels: [severity],
        numRuns: 8,
        timeoutMs: 45000,
        gracefulFailureHandling: true,
        verboseLogging: false,
        enableVKTesting: severity !== TestSeverity.MINIMAL,
        enablePerformanceTesting: severity === TestSeverity.INTERMEDIATE,
        skipKnownFailures: true
      };
      
      const report = await runComprehensiveCompatibilityTests(config);
      
      severityResults.push({
        severity,
        compatibility: report.compatibilityPercentage,
        tests: report.totalTests,
        passed: report.passedTests,
        failed: report.failedTests,
        vkParity: report.vkParityAnalysis.vkParityPercentage
      });
      
      console.log(`   ✅ ${severity}: ${report.compatibilityPercentage.toFixed(1)}% (${report.passedTests}/${report.totalTests})`);
      
    } catch (error) {
      console.log(`   ❌ ${severity}: Failed - ${error.message}`);
      severityResults.push({
        severity,
        compatibility: 0,
        tests: 0,
        passed: 0,
        failed: 1,
        error: error.message
      });
    }
  }
  
  // Calculate overall progressive compatibility
  const totalTests = severityResults.reduce((sum, r) => sum + r.tests, 0);
  const totalPassed = severityResults.reduce((sum, r) => sum + r.passed, 0);
  overallCompatibility = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  console.log('\n📊 Progressive Analysis Results:');
  console.log('='.repeat(50));
  console.log(`Overall Progressive Compatibility: ${overallCompatibility.toFixed(1)}%`);
  console.log(`Total Tests Executed: ${totalTests}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log('');
  
  console.log('Breakdown by Severity:');
  severityResults.forEach(result => {
    if (result.error) {
      console.log(`  ${result.severity.toUpperCase()}: ❌ FAILED (${result.error})`);
    } else {
      console.log(`  ${result.severity.toUpperCase()}: ${result.compatibility.toFixed(1)}% (${result.passed}/${result.tests} tests)`);
      if (result.vkParity !== undefined) {
        console.log(`    VK Parity: ${result.vkParity.toFixed(1)}%`);
      }
    }
  });
  
  // Recommendations based on progressive results
  console.log('\n🎯 Progressive Analysis Recommendations:');
  if (overallCompatibility >= 80) {
    console.log('   ✅ Strong foundation - proceed to advanced VK parity testing');
    console.log('   Next: node test-comprehensive-compatibility.mjs --advanced');
  } else if (overallCompatibility >= 60) {
    console.log('   ⚠️  Good foundation but needs work on intermediate complexity');
    console.log('   Focus: Constraint optimization and complex expressions');
  } else if (overallCompatibility >= 40) {
    console.log('   ⚠️  Basic functionality working but needs fundamental improvements');
    console.log('   Focus: Field properties and basic arithmetic reliability');
  } else {
    console.log('   🚨 Critical compatibility issues detected');
    console.log('   Focus: Backend switching and basic field operations');
  }
}

function printDetailedReport(report, duration) {
  console.log('✨ Comprehensive Compatibility Report:');
  console.log('='.repeat(60));
  
  // Overall metrics
  console.log(`📊 Overall Results:`);
  console.log(`   Compatibility: ${report.compatibilityPercentage.toFixed(1)}%`);
  console.log(`   Tests: ${report.passedTests}/${report.totalTests} passed (${report.failedTests} failed, ${report.skippedTests} skipped)`);
  console.log(`   Duration: ${duration.toFixed(1)}s`);
  console.log('');
  
  // VK Parity Analysis
  if (report.vkParityAnalysis.totalVKTests > 0) {
    console.log(`🔑 VK Parity Analysis:`);
    console.log(`   VK Hash Matches: ${report.vkParityAnalysis.vkHashMatches}/${report.vkParityAnalysis.totalVKTests} (${report.vkParityAnalysis.vkParityPercentage.toFixed(1)}%)`);
    console.log(`   Identical Hash Bug: ${report.vkParityAnalysis.identicalHashBugDetected ? '🚨 DETECTED' : '✅ Not detected'}`);
    console.log(`   Sparky VK Diversity: ${(report.vkParityAnalysis.sparkyVKDiversityScore * 100).toFixed(1)}%`);
    console.log('');
  }
  
  // Performance Analysis
  if (report.performanceAnalysis.averagePerformanceRatio > 0) {
    console.log(`⚡ Performance Analysis:`);
    console.log(`   Average Performance Ratio: ${report.performanceAnalysis.averagePerformanceRatio.toFixed(2)}x`);
    console.log(`   Within Thresholds: ${report.performanceAnalysis.withinThresholds}`);
    console.log(`   Exceeds Thresholds: ${report.performanceAnalysis.exceedsThresholds}`);
    if (report.performanceAnalysis.performanceRegressions.length > 0) {
      console.log(`   Regressions: ${report.performanceAnalysis.performanceRegressions.slice(0, 3).join(', ')}`);
    }
    console.log('');
  }
  
  // Category Breakdown
  console.log(`📋 Category Breakdown:`);
  Object.entries(report.categoryBreakdown).forEach(([category, stats]) => {
    const emoji = stats.percentage >= 80 ? '✅' : stats.percentage >= 60 ? '⚠️' : '❌';
    console.log(`   ${emoji} ${category}: ${stats.percentage.toFixed(1)}% (${stats.passed}/${stats.total})`);
  });
  console.log('');
  
  // Error Analysis
  if (report.errorAnalysis.sparkyCompilationFailures > 0 || 
      report.errorAnalysis.constraintMismatches > 0 ||
      report.errorAnalysis.criticalErrors.length > 0) {
    console.log(`🚨 Error Analysis:`);
    if (report.errorAnalysis.sparkyCompilationFailures > 0) {
      console.log(`   Sparky Compilation Failures: ${report.errorAnalysis.sparkyCompilationFailures}`);
    }
    if (report.errorAnalysis.constraintMismatches > 0) {
      console.log(`   Constraint Mismatches: ${report.errorAnalysis.constraintMismatches}`);
    }
    if (report.errorAnalysis.criticalErrors.length > 0) {
      console.log(`   Critical Errors: ${report.errorAnalysis.criticalErrors.slice(0, 3).join('; ')}`);
    }
    console.log('');
  }
  
  // Current State and Recommendations
  console.log(`🎯 Current State: ${report.summary.currentState}`);
  console.log('');
  
  if (report.summary.criticalBlockers.length > 0) {
    console.log(`🚨 Critical Blockers:`);
    report.summary.criticalBlockers.forEach((blocker, index) => {
      console.log(`   ${index + 1}. ${blocker}`);
    });
    console.log('');
  }
  
  console.log(`📋 Immediate Actions:`);
  report.summary.immediateActions.forEach((action, index) => {
    console.log(`   ${index + 1}. ${action}`);
  });
  console.log('');
  
  console.log(`📈 Progress: ${report.summary.progressToward100Percent}`);
  
  // Next recommendations based on results
  console.log('\n🎯 Recommended Next Steps:');
  if (report.vkParityAnalysis.identicalHashBugDetected) {
    console.log('   🚨 PRIORITY: Fix Sparky VK identical hash bug');
    console.log('   This is blocking all VK parity testing');
  }
  
  if (report.errorAnalysis.sparkyCompilationFailures > report.totalTests * 0.3) {
    console.log('   🔧 HIGH: Improve Sparky compilation stability');
    console.log('   High failure rate is limiting test coverage');
  }
  
  if (report.compatibilityPercentage < 50) {
    console.log('   🔧 Focus on fundamental backend compatibility issues');
  } else if (report.compatibilityPercentage < 80) {
    console.log('   🔧 Address remaining systematic differences');
  } else {
    console.log('   ✨ Good compatibility - focus on edge cases and optimization');
  }
}

function printUsage() {
  console.log('Usage: node test-comprehensive-compatibility.mjs [option]');
  console.log('');
  console.log('Options:');
  console.log('  --quick         Quick compatibility check (fastest)');
  console.log('  --minimal       Run minimal severity tests');
  console.log('  --basic         Run basic severity tests');
  console.log('  --intermediate  Run intermediate severity tests');
  console.log('  --advanced      Run advanced severity tests (VK focus)');
  console.log('  --comprehensive Run all tests (slowest, most thorough)');
  console.log('  (no option)     Progressive analysis (default)');
  console.log('');
  console.log('Examples:');
  console.log('  node test-comprehensive-compatibility.mjs --quick');
  console.log('  node test-comprehensive-compatibility.mjs --advanced');
  console.log('  node test-comprehensive-compatibility.mjs');
}

// Help option
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});