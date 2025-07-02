#!/usr/bin/env node

/**
 * Unified Test Report Runner
 * 
 * Integrates VK parity framework tests with Sparky integration tests to provide
 * a comprehensive dashboard of backend compatibility and feature parity.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestSuiteResult {
  name: string;
  command: string;
  description: string;
  output: string;
  passed: boolean;
  duration: number;
  passingTests: number;
  failingTests: number;
  totalTests: number;
  successRate: number;
}

interface UnifiedReport {
  timestamp: string;
  totalDuration: number;
  overallSuccessRate: number;
  vkParityStatus: TestSuiteResult;
  infrastructureStatus: TestSuiteResult;
  constraintAnalysisStatus: TestSuiteResult;
  integrationStatus: TestSuiteResult;
  keyFindings: string[];
  prioritizedIssues: string[];
  progressSummary: {
    vkParityRate: number;
    featureCompatibilityRate: number;
    infrastructureHealth: number;
    overallHealth: number;
  };
}

class UnifiedTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime = Date.now();

  async run() {
    console.log('🎯 UNIFIED VK PARITY & COMPATIBILITY DASHBOARD');
    console.log('='.repeat(60));
    console.log('Running comprehensive backend validation suite...\n');
    
    // Ensure we're in the project root
    const projectRoot = join(__dirname, '../..');
    process.chdir(projectRoot);
    
    // Create reports directory
    const reportsDir = join(projectRoot, 'reports');
    mkdirSync(reportsDir, { recursive: true });

    // Run each test suite
    await this.runTestSuite(
      'VK Parity Framework',
      'npm run test:vk-parity',
      'Systematic verification key generation parity testing'
    );

    await this.runTestSuite(
      'Backend Infrastructure',
      'npm run test:backend-infrastructure', 
      'Backend switching and constraint routing validation'
    );

    await this.runTestSuite(
      'Constraint Analysis',
      'npm run test:constraint-analysis',
      'Deep constraint system generation analysis'
    );

    await this.runTestSuite(
      'Sparky Integration',
      'npm run test:sparky',
      'Comprehensive API compatibility and feature parity testing'
    );

    // Generate unified report
    await this.generateUnifiedReport(reportsDir);
    
    // Print summary
    this.printSummary();
  }

  private async runTestSuite(name: string, command: string, description: string) {
    console.log(`📝 Running ${name}...`);
    const startTime = Date.now();
    let output = '';
    let passed = false;
    let passingTests = 0;
    let failingTests = 0;
    let totalTests = 0;

    try {
      output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_OPTIONS: '--experimental-vm-modules'
        },
        maxBuffer: 20 * 1024 * 1024, // 20MB buffer
        timeout: 600000 // 10 minute timeout
      });
      
      passed = true;
      console.log(`✅ ${name}: Completed successfully`);
      
    } catch (error: any) {
      output = (error.stderr || '') + (error.stdout || '') + (error.message || '');
      passed = false;
      console.log(`❌ ${name}: Issues detected`);
    }
    
    const duration = Date.now() - startTime;
    
    // Parse test results
    const testStats = this.parseTestResults(output);
    passingTests = testStats.passed;
    failingTests = testStats.failed;
    totalTests = testStats.total;
    
    const successRate = totalTests > 0 ? (passingTests / totalTests) * 100 : 0;
    
    this.results.push({
      name,
      command,
      description,
      output,
      passed,
      duration,
      passingTests,
      failingTests,
      totalTests,
      successRate
    });
  }

  private parseTestResults(output: string): { passed: number; failed: number; total: number } {
    let passed = 0;
    let failed = 0;
    let total = 0;

    // Try multiple Jest output formats
    
    // Format 1: "Tests:       6 failed, 1 passed, 7 total"
    const format1 = output.match(/Tests:\s*(?:(\d+)\s*failed,?\s*)?(?:(\d+)\s*passed,?\s*)?(\d+)\s*total/);
    if (format1) {
      failed = parseInt(format1[1] || '0');
      passed = parseInt(format1[2] || '0');
      total = parseInt(format1[3] || '0');
      return { passed, failed, total };
    }

    // Format 2: "Passing: 1 ✅\nFailing: 6 ❌"
    const passingMatch = output.match(/Passing:\s*(\d+)/);
    const failingMatch = output.match(/Failing:\s*(\d+)/);
    if (passingMatch || failingMatch) {
      passed = parseInt(passingMatch?.[1] || '0');
      failed = parseInt(failingMatch?.[1] || '0');
      total = passed + failed;
      return { passed, failed, total };
    }

    // Format 3: Look for individual test results
    const passedTests = (output.match(/✓/g) || []).length;
    const failedTests = (output.match(/✕/g) || []).length;
    if (passedTests > 0 || failedTests > 0) {
      return { passed: passedTests, failed: failedTests, total: passedTests + failedTests };
    }

    return { passed: 0, failed: 0, total: 0 };
  }

  private async generateUnifiedReport(reportsDir: string) {
    const totalDuration = Date.now() - this.startTime;
    
    // Calculate overall metrics
    const totalPassing = this.results.reduce((sum, r) => sum + r.passingTests, 0);
    const totalFailing = this.results.reduce((sum, r) => sum + r.failingTests, 0);
    const totalTests = totalPassing + totalFailing;
    const overallSuccessRate = totalTests > 0 ? (totalPassing / totalTests) * 100 : 0;

    // Extract key findings
    const keyFindings = this.extractKeyFindings();
    const prioritizedIssues = this.extractPrioritizedIssues();

    // Create unified report
    const report: UnifiedReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      overallSuccessRate,
      vkParityStatus: this.results.find(r => r.name === 'VK Parity Framework')!,
      infrastructureStatus: this.results.find(r => r.name === 'Backend Infrastructure')!,
      constraintAnalysisStatus: this.results.find(r => r.name === 'Constraint Analysis')!,
      integrationStatus: this.results.find(r => r.name === 'Sparky Integration')!,
      keyFindings,
      prioritizedIssues,
      progressSummary: {
        vkParityRate: this.results.find(r => r.name === 'VK Parity Framework')?.successRate || 0,
        featureCompatibilityRate: this.results.find(r => r.name === 'Sparky Integration')?.successRate || 0,
        infrastructureHealth: this.results.find(r => r.name === 'Backend Infrastructure')?.successRate || 0,
        overallHealth: overallSuccessRate
      }
    };

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    
    // Save reports
    const timestamp = new Date().toISOString().split('T')[0];
    const markdownPath = join(reportsDir, `unified-backend-report-${timestamp}.md`);
    const jsonPath = join(reportsDir, `unified-backend-report-${timestamp}.json`);
    
    writeFileSync(markdownPath, markdownReport);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Unified report saved to: ${markdownPath}`);
    console.log(`📊 JSON data saved to: ${jsonPath}`);
  }

  private extractKeyFindings(): string[] {
    const findings: string[] = [];
    
    // VK Parity findings
    const vkResult = this.results.find(r => r.name === 'VK Parity Framework');
    if (vkResult) {
      if (vkResult.successRate > 0) {
        findings.push(`🎯 VK Parity: ${vkResult.successRate.toFixed(1)}% success rate - some operations already achieve parity`);
      }
      if (vkResult.output.includes('Addition program: ✅')) {
        findings.push(`✅ Addition operations achieve complete VK parity`);
      }
      if (vkResult.output.includes('globalThis.__snarky not updated')) {
        findings.push(`🚨 Critical: Constraint routing bug confirmed - globalThis.__snarky not updated on backend switch`);
      }
    }

    // Infrastructure findings
    const infraResult = this.results.find(r => r.name === 'Backend Infrastructure');
    if (infraResult && infraResult.output.includes('Backend switching: ✅')) {
      findings.push(`✅ Backend switching mechanism works correctly`);
    }

    // Integration findings
    const integrationResult = this.results.find(r => r.name === 'Sparky Integration');
    if (integrationResult && integrationResult.successRate > 40) {
      findings.push(`✅ Strong API compatibility: ${integrationResult.successRate.toFixed(1)}% of integration tests passing`);
    }

    // Constraint analysis findings
    const constraintResult = this.results.find(r => r.name === 'Constraint Analysis');
    if (constraintResult && constraintResult.output.includes('reduce_lincom')) {
      findings.push(`🚨 Missing reduce_lincom optimization causing 2-4x constraint inflation`);
    }

    return findings;
  }

  private extractPrioritizedIssues(): string[] {
    const issues: string[] = [];
    
    // Priority 1: Infrastructure
    if (this.results.find(r => r.name === 'Backend Infrastructure')?.successRate === 0) {
      issues.push(`P1: Fix constraint routing bug - globalThis.__snarky not updated when switching to Sparky`);
    }

    // Priority 2: Optimization
    const constraintResult = this.results.find(r => r.name === 'Constraint Analysis');
    if (constraintResult && constraintResult.successRate < 50) {
      issues.push(`P2: Implement reduce_lincom optimization in Sparky to match Snarky constraint efficiency`);
    }

    // Priority 3: VK Generation
    const vkResult = this.results.find(r => r.name === 'VK Parity Framework');
    if (vkResult && vkResult.successRate < 100) {
      issues.push(`P3: Debug VK generation differences for complex circuit patterns`);
    }

    // Priority 4: API Compatibility
    const integrationResult = this.results.find(r => r.name === 'Sparky Integration');
    if (integrationResult && integrationResult.successRate < 80) {
      issues.push(`P4: Resolve API compatibility issues in ${integrationResult.failingTests} test cases`);
    }

    return issues;
  }

  private generateMarkdownReport(report: UnifiedReport): string {
    const date = new Date(report.timestamp).toLocaleDateString();
    const time = new Date(report.timestamp).toLocaleTimeString();
    
    return `# Unified Backend Compatibility Report

Generated: ${date} at ${time}  
Duration: ${(report.totalDuration / 1000).toFixed(1)}s  
Overall Success Rate: **${report.overallSuccessRate.toFixed(1)}%**

## 🎯 Executive Summary

This unified report combines VK parity testing with comprehensive API compatibility validation to provide a complete picture of Sparky backend readiness.

### Progress Dashboard

| Metric | Score | Status | Target |
|--------|-------|--------|--------|
| **VK Parity Rate** | ${report.progressSummary.vkParityRate.toFixed(1)}% | ${report.progressSummary.vkParityRate > 80 ? '✅' : report.progressSummary.vkParityRate > 50 ? '⚠️' : '❌'} | 100% |
| **Feature Compatibility** | ${report.progressSummary.featureCompatibilityRate.toFixed(1)}% | ${report.progressSummary.featureCompatibilityRate > 80 ? '✅' : report.progressSummary.featureCompatibilityRate > 50 ? '⚠️' : '❌'} | 95% |
| **Infrastructure Health** | ${report.progressSummary.infrastructureHealth.toFixed(1)}% | ${report.progressSummary.infrastructureHealth > 80 ? '✅' : report.progressSummary.infrastructureHealth > 50 ? '⚠️' : '❌'} | 100% |
| **Overall Health** | ${report.progressSummary.overallHealth.toFixed(1)}% | ${report.progressSummary.overallHealth > 80 ? '✅' : report.progressSummary.overallHealth > 50 ? '⚠️' : '❌'} | 95% |

## 🔍 Key Findings

${report.keyFindings.map(finding => `- ${finding}`).join('\n')}

## 🚨 Prioritized Issues

${report.prioritizedIssues.map(issue => `1. ${issue}`).join('\n')}

## 📊 Test Suite Results

### VK Parity Framework
- **Success Rate**: ${report.vkParityStatus.successRate.toFixed(1)}%
- **Tests**: ${report.vkParityStatus.passingTests}/${report.vkParityStatus.totalTests} passing
- **Duration**: ${(report.vkParityStatus.duration / 1000).toFixed(1)}s
- **Focus**: Verification key generation consistency between backends

### Backend Infrastructure
- **Success Rate**: ${report.infrastructureStatus.successRate.toFixed(1)}%
- **Tests**: ${report.infrastructureStatus.passingTests}/${report.infrastructureStatus.totalTests} passing
- **Duration**: ${(report.infrastructureStatus.duration / 1000).toFixed(1)}s
- **Focus**: Backend switching, constraint routing, global state management

### Constraint Analysis
- **Success Rate**: ${report.constraintAnalysisStatus.successRate.toFixed(1)}%
- **Tests**: ${report.constraintAnalysisStatus.passingTests}/${report.constraintAnalysisStatus.totalTests} passing
- **Duration**: ${(report.constraintAnalysisStatus.duration / 1000).toFixed(1)}s
- **Focus**: Constraint generation, optimization parity, gate format compatibility

### Sparky Integration
- **Success Rate**: ${report.integrationStatus.successRate.toFixed(1)}%
- **Tests**: ${report.integrationStatus.passingTests}/${report.integrationStatus.totalTests} passing
- **Duration**: ${(report.integrationStatus.duration / 1000).toFixed(1)}s
- **Focus**: API compatibility, feature parity, performance validation

## 🎯 Next Steps

Based on the current status:

${report.progressSummary.overallHealth < 50 ? `
### Immediate Priority: Infrastructure
The overall health score of ${report.progressSummary.overallHealth.toFixed(1)}% indicates fundamental infrastructure issues that must be resolved first.

1. **Fix constraint routing bug** - Highest priority blocker
2. **Validate backend switching** - Ensure proper state management
3. **Test infrastructure changes** - Use this report to track progress
` : report.progressSummary.overallHealth < 80 ? `
### Focus: Optimization and Compatibility
With ${report.progressSummary.overallHealth.toFixed(1)}% health, focus on optimization and remaining compatibility issues.

1. **Implement missing optimizations** - Particularly reduce_lincom
2. **Resolve API compatibility gaps** - Address failing integration tests
3. **Performance tuning** - Ensure performance targets are met
` : `
### Polish Phase: Edge Cases and Performance
Excellent progress at ${report.progressSummary.overallHealth.toFixed(1)}% health! Focus on final polish.

1. **Edge case resolution** - Handle remaining corner cases
2. **Performance optimization** - Fine-tune performance to target levels
3. **Documentation and validation** - Ensure production readiness
`}

## 📈 Progress Tracking

To track progress toward 100% backend compatibility:

\`\`\`bash
# Run unified report
npm run test:unified-report

# Focus on specific areas
npm run test:vk-parity              # VK generation parity
npm run test:backend-infrastructure # Infrastructure health
npm run test:constraint-analysis    # Optimization parity
npm run test:sparky                 # API compatibility
\`\`\`

Target milestones:
- **Phase 1**: Infrastructure Health > 90% (constraint routing fixed)
- **Phase 2**: VK Parity Rate > 90% (core compatibility achieved)  
- **Phase 3**: Feature Compatibility > 95% (production ready)
- **Phase 4**: Overall Health > 95% (full backend parity)

---
*Generated by Unified Backend Compatibility Dashboard*
`;
  }

  private printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const totalPassing = this.results.reduce((sum, r) => sum + r.passingTests, 0);
    const totalFailing = this.results.reduce((sum, r) => sum + r.failingTests, 0);
    const totalTests = totalPassing + totalFailing;
    const overallSuccessRate = totalTests > 0 ? (totalPassing / totalTests) * 100 : 0;

    console.log('\n' + '='.repeat(60));
    console.log('UNIFIED BACKEND COMPATIBILITY SUMMARY');
    console.log('='.repeat(60));
    console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`Total Tests: ${totalTests} (${totalPassing} ✅, ${totalFailing} ❌)`);
    console.log('='.repeat(60));

    for (const result of this.results) {
      const status = result.successRate > 80 ? '✅' : result.successRate > 50 ? '⚠️' : '❌';
      console.log(`${status} ${result.name}: ${result.successRate.toFixed(1)}% (${result.passingTests}/${result.totalTests})`);
    }

    console.log('='.repeat(60));
    
    if (overallSuccessRate < 50) {
      console.log('❌ Critical infrastructure issues detected');
      console.log('   Priority: Fix constraint routing bug');
    } else if (overallSuccessRate < 80) {
      console.log('⚠️  Good progress, focus on optimization');
      console.log('   Priority: Implement missing optimizations');
    } else {
      console.log('✅ Excellent progress toward full compatibility');
      console.log('   Priority: Polish edge cases and performance');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new UnifiedTestRunner();
  runner.run().catch(console.error);
}

export { UnifiedTestRunner };