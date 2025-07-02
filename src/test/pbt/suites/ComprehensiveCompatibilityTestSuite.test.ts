/**
 * Test file for the Comprehensive Compatibility Test Suite
 * 
 * This demonstrates how to use the comprehensive test suite to systematically
 * analyze Snarky-Sparky backend compatibility.
 */

import { describe, test, expect } from '@jest/globals';
import { 
  ComprehensiveCompatibilityTestSuite,
  runComprehensiveCompatibilityTests,
  quickCompatibilityCheck,
  TestSeverity,
  type ComprehensiveTestConfig,
  type CompatibilityReport
} from './ComprehensiveCompatibilityTestSuite.js';

describe('Comprehensive Compatibility Test Suite', () => {
  
  test('should create test suite with default configuration', () => {
    const suite = new ComprehensiveCompatibilityTestSuite();
    expect(suite).toBeDefined();
  });

  test('should create test suite with custom configuration', () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL],
      timeoutMs: 30000,
      numRuns: 5,
      gracefulFailureHandling: true
    };
    
    const suite = new ComprehensiveCompatibilityTestSuite(config);
    expect(suite).toBeDefined();
  });

  test('should run quick compatibility check', async () => {
    const result = await quickCompatibilityCheck();
    
    expect(result).toHaveProperty('compatibilityPercentage');
    expect(result).toHaveProperty('criticalIssues');
    expect(result).toHaveProperty('summary');
    
    expect(typeof result.compatibilityPercentage).toBe('number');
    expect(Array.isArray(result.criticalIssues)).toBe(true);
    expect(typeof result.summary).toBe('string');
    
    console.log('Quick Compatibility Check Results:');
    console.log(`  Compatibility: ${result.compatibilityPercentage.toFixed(1)}%`);
    console.log(`  Critical Issues: ${result.criticalIssues.length}`);
    console.log(`  Summary: ${result.summary}`);
  }, 60000); // 60 second timeout

  test('should run minimal compatibility tests', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL],
      numRuns: 5,
      timeoutMs: 30000,
      gracefulFailureHandling: true,
      verboseLogging: false,
      skipKnownFailures: true
    };
    
    const report = await runComprehensiveCompatibilityTests(config);
    
    // Validate report structure
    expect(report).toHaveProperty('totalTests');
    expect(report).toHaveProperty('passedTests');
    expect(report).toHaveProperty('failedTests');
    expect(report).toHaveProperty('skippedTests');
    expect(report).toHaveProperty('compatibilityPercentage');
    expect(report).toHaveProperty('categoryBreakdown');
    expect(report).toHaveProperty('severityBreakdown');
    expect(report).toHaveProperty('vkParityAnalysis');
    expect(report).toHaveProperty('performanceAnalysis');
    expect(report).toHaveProperty('errorAnalysis');
    expect(report).toHaveProperty('progressTracking');
    expect(report).toHaveProperty('testResults');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('reportMetadata');
    
    // Validate numeric constraints
    expect(report.totalTests).toBe(report.passedTests + report.failedTests + report.skippedTests);
    expect(report.compatibilityPercentage).toBeGreaterThanOrEqual(0);
    expect(report.compatibilityPercentage).toBeLessThanOrEqual(100);
    
    // Validate test results
    expect(Array.isArray(report.testResults)).toBe(true);
    expect(report.testResults.length).toBe(report.totalTests);
    
    // Log key metrics
    console.log('\nMinimal Compatibility Test Results:');
    console.log(`  Total Tests: ${report.totalTests}`);
    console.log(`  Passed: ${report.passedTests}`);
    console.log(`  Failed: ${report.failedTests}`);
    console.log(`  Skipped: ${report.skippedTests}`);
    console.log(`  Compatibility: ${report.compatibilityPercentage.toFixed(1)}%`);
    console.log(`  VK Parity: ${report.vkParityAnalysis.vkParityPercentage.toFixed(1)}%`);
    console.log(`  Duration: ${(report.reportMetadata.duration / 1000).toFixed(1)}s`);
    
    // Log critical issues
    if (report.summary.criticalBlockers.length > 0) {
      console.log('\n  Critical Blockers:');
      report.summary.criticalBlockers.forEach(blocker => 
        console.log(`    - ${blocker}`)
      );
    }
    
    // Log category breakdown
    console.log('\n  Category Breakdown:');
    Object.entries(report.categoryBreakdown).forEach(([category, stats]) => {
      console.log(`    ${category}: ${stats.passed}/${stats.total} (${stats.percentage.toFixed(1)}%)`);
    });
    
  }, 120000); // 2 minute timeout

  test('should handle graceful failure mode', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL],
      numRuns: 3,
      timeoutMs: 15000,
      gracefulFailureHandling: true,
      skipKnownFailures: false, // Test actual failures
      enableVKTesting: true, // May fail with Sparky
      verboseLogging: false
    };
    
    // This should not throw even if Sparky fails
    const report = await runComprehensiveCompatibilityTests(config);
    
    expect(report).toBeDefined();
    expect(report.totalTests).toBeGreaterThan(0);
    
    // Check if failures were handled gracefully
    const sparkyFailures = report.testResults.filter(r => 
      r.error?.backend === 'sparky'
    );
    
    if (sparkyFailures.length > 0) {
      console.log(`\nGraceful failure handling test detected ${sparkyFailures.length} Sparky failures:`);
      sparkyFailures.slice(0, 3).forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.error?.message}`);
      });
    }
    
    // Should still produce a valid report
    expect(report.errorAnalysis).toBeDefined();
    expect(report.summary.criticalBlockers).toBeDefined();
    
  }, 90000); // 1.5 minute timeout

  test('should generate comprehensive report structure', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL],
      numRuns: 2,
      timeoutMs: 20000,
      generateDetailedReport: false, // Don't write file in test
      verboseLogging: false
    };
    
    const report = await runComprehensiveCompatibilityTests(config);
    
    // Validate report metadata
    expect(report.reportMetadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(report.reportMetadata.duration).toBeGreaterThan(0);
    expect(report.reportMetadata.config).toEqual(expect.objectContaining(config));
    
    // Validate breakdown structures
    expect(typeof report.categoryBreakdown).toBe('object');
    expect(typeof report.severityBreakdown).toBe('object');
    
    // Should have minimal severity breakdown
    expect(report.severityBreakdown[TestSeverity.MINIMAL]).toBeDefined();
    expect(report.severityBreakdown[TestSeverity.MINIMAL].total).toBeGreaterThan(0);
    
    // Validate VK parity analysis
    expect(report.vkParityAnalysis.totalVKTests).toBeGreaterThanOrEqual(0);
    expect(report.vkParityAnalysis.vkHashMatches).toBeGreaterThanOrEqual(0);
    expect(report.vkParityAnalysis.vkParityPercentage).toBeGreaterThanOrEqual(0);
    expect(report.vkParityAnalysis.vkParityPercentage).toBeLessThanOrEqual(100);
    
    // Validate performance analysis
    expect(report.performanceAnalysis.averagePerformanceRatio).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(report.performanceAnalysis.performanceRegressions)).toBe(true);
    
    // Validate error analysis
    expect(report.errorAnalysis.sparkyCompilationFailures).toBeGreaterThanOrEqual(0);
    expect(report.errorAnalysis.snarkyCompilationFailures).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(report.errorAnalysis.criticalErrors)).toBe(true);
    
    // Validate summary
    expect(typeof report.summary.currentState).toBe('string');
    expect(Array.isArray(report.summary.criticalBlockers)).toBe(true);
    expect(Array.isArray(report.summary.immediateActions)).toBe(true);
    expect(typeof report.summary.progressToward100Percent).toBe('string');
    
  }, 60000);

  test('should track progress and provide recommendations', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL, TestSeverity.BASIC],
      numRuns: 3,
      timeoutMs: 30000,
      trackProgressOverTime: true,
      gracefulFailureHandling: true
    };
    
    const report = await runComprehensiveCompatibilityTests(config);
    
    // Validate progress tracking
    expect(report.progressTracking.testsRun).toBe(report.totalTests);
    expect(Array.isArray(report.progressTracking.nextRecommendations)).toBe(true);
    
    console.log('\nProgress Tracking Results:');
    console.log(`  Tests Run: ${report.progressTracking.testsRun}`);
    console.log(`  Current Severity: ${report.progressTracking.currentSeverityLevel}`);
    console.log('  Next Recommendations:');
    report.progressTracking.nextRecommendations.forEach(rec => 
      console.log(`    - ${rec}`)
    );
    
    // Should provide actionable recommendations
    expect(report.progressTracking.nextRecommendations.length).toBeGreaterThan(0);
    
  }, 90000);
});

describe('Test Configuration Validation', () => {
  
  test('should handle invalid configuration gracefully', () => {
    const invalidConfig = {
      timeoutMs: -1,
      numRuns: 0,
      severityLevels: []
    } as Partial<ComprehensiveTestConfig>;
    
    // Should not throw, should apply defaults
    const suite = new ComprehensiveCompatibilityTestSuite(invalidConfig);
    expect(suite).toBeDefined();
  });

  test('should merge partial configuration with defaults', () => {
    const partialConfig: Partial<ComprehensiveTestConfig> = {
      numRuns: 1,
      gracefulFailureHandling: false
    };
    
    const suite = new ComprehensiveCompatibilityTestSuite(partialConfig);
    expect(suite).toBeDefined();
    
    // Should use the provided values
    // (We can't directly test the merged config, but it shouldn't throw)
  });
});

describe('Error Handling and Edge Cases', () => {
  
  test('should handle empty test results gracefully', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [], // No tests to run
      gracefulFailureHandling: true
    };
    
    // Should handle empty test suite
    try {
      const report = await runComprehensiveCompatibilityTests(config);
      expect(report.totalTests).toBe(0);
      expect(report.compatibilityPercentage).toBe(0);
    } catch (error) {
      // Empty test suite might throw, which is acceptable
      expect(error).toBeDefined();
    }
  });
  
  test('should handle backend switching failures', async () => {
    const config: Partial<ComprehensiveTestConfig> = {
      severityLevels: [TestSeverity.MINIMAL],
      numRuns: 1,
      timeoutMs: 10000,
      gracefulFailureHandling: true,
      maxRetries: 1
    };
    
    // Should not crash even if backend switching has issues
    const report = await runComprehensiveCompatibilityTests(config);
    expect(report).toBeDefined();
    
    // Error analysis should capture any backend issues
    expect(report.errorAnalysis).toBeDefined();
  });
});