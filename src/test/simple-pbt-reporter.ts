/**
 * Simple PBT Reporter - Lean alternative to overengineered CI/CD system
 * 
 * Generates simple reports for VK parity progress without Docker/nginx complexity
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface VkParityResult {
  testName: string;
  snarkyVkHash: string;
  sparkyVkHash: string;
  matches: boolean;
  error?: string;
  duration: number;
}

export interface TestSummary {
  totalTests: number;
  passing: number;
  failing: number;
  parityRate: number;
  duration: number;
  timestamp: Date;
  commit: string;
}

export class SimplePbtReporter {
  private readonly outputDir: string;

  constructor(outputDir: string = './test-results') {
    this.outputDir = outputDir;
  }

  async generateReport(results: VkParityResult[]): Promise<TestSummary> {
    await fs.mkdir(this.outputDir, { recursive: true });
    
    const summary = this.calculateSummary(results);
    
    // Generate simple JSON report
    await this.generateJsonReport(summary, results);
    
    // Generate simple HTML report
    await this.generateHtmlReport(summary, results);
    
    // Generate terminal-friendly summary
    this.printTerminalSummary(summary, results);
    
    return summary;
  }

  private calculateSummary(results: VkParityResult[]): TestSummary {
    const passing = results.filter(r => r.matches).length;
    const failing = results.length - passing;
    const parityRate = results.length > 0 ? passing / results.length : 0;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      totalTests: results.length,
      passing,
      failing,
      parityRate,
      duration,
      timestamp: new Date(),
      commit: this.getCurrentCommit()
    };
  }

  private async generateJsonReport(summary: TestSummary, results: VkParityResult[]): Promise<void> {
    const report = {
      summary,
      results,
      blockers: this.identifyBlockers(results),
      nextActions: this.getNextActions(summary)
    };
    
    await fs.writeFile(
      join(this.outputDir, 'vk-parity-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  private async generateHtmlReport(summary: TestSummary, results: VkParityResult[]): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VK Parity Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .rate { color: ${summary.parityRate > 0.5 ? '#28a745' : summary.parityRate > 0.2 ? '#ffc107' : '#dc3545'}; }
        .test-results { margin-top: 30px; }
        .test-item { border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px; }
        .test-header { padding: 15px; background: #f8f9fa; font-weight: bold; cursor: pointer; }
        .test-details { padding: 15px; display: none; }
        .test-passing { border-left: 4px solid #28a745; }
        .test-failing { border-left: 4px solid #dc3545; }
        .blockers { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .actions { background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .hash { font-family: monospace; font-size: 0.9em; background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>VK Parity Report</h1>
        <p>Generated: ${summary.timestamp.toLocaleString()}</p>
        <p>Commit: <code>${summary.commit}</code></p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value rate">${(summary.parityRate * 100).toFixed(1)}%</div>
            <div class="metric-label">VK Parity Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value pass">${summary.passing}</div>
            <div class="metric-label">Tests Passing</div>
        </div>
        <div class="metric">
            <div class="metric-value fail">${summary.failing}</div>
            <div class="metric-label">Tests Failing</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.duration.toFixed(0)}ms</div>
            <div class="metric-label">Total Duration</div>
        </div>
    </div>

    ${this.identifyBlockers(results).length > 0 ? `
    <div class="blockers">
        <h3>🚨 Critical Blockers</h3>
        <ul>
            ${this.identifyBlockers(results).map(blocker => `<li>${blocker}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="actions">
        <h3>🎯 Next Actions</h3>
        <ul>
            ${this.getNextActions(summary).map(action => `<li>${action}</li>`).join('')}
        </ul>
    </div>

    <div class="test-results">
        <h2>Test Results</h2>
        ${results.map((result, index) => `
        <div class="test-item ${result.matches ? 'test-passing' : 'test-failing'}">
            <div class="test-header" onclick="toggle(${index})">
                ${result.matches ? '✅' : '❌'} ${result.testName} 
                <span style="float: right;">${result.duration.toFixed(0)}ms</span>
            </div>
            <div class="test-details" id="details-${index}">
                ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                <p><strong>Snarky VK:</strong> <span class="hash">${result.snarkyVkHash}</span></p>
                <p><strong>Sparky VK:</strong> <span class="hash">${result.sparkyVkHash}</span></p>
                <p><strong>Match:</strong> ${result.matches ? 'Yes' : 'No'}</p>
            </div>
        </div>
        `).join('')}
    </div>

    <script>
        function toggle(index) {
            const details = document.getElementById('details-' + index);
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
    </script>
</body>
</html>
    `;
    
    await fs.writeFile(join(this.outputDir, 'vk-parity-report.html'), html);
  }

  private printTerminalSummary(summary: TestSummary, results: VkParityResult[]): void {
    console.log('\n=== VK Parity Test Results ===');
    console.log(`📊 Parity Rate: ${(summary.parityRate * 100).toFixed(1)}% (${summary.passing}/${summary.totalTests})`);
    console.log(`⏱️  Duration: ${summary.duration.toFixed(0)}ms`);
    console.log(`📅 Timestamp: ${summary.timestamp.toISOString()}`);
    
    if (summary.failing > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.matches).forEach(result => {
        console.log(`  • ${result.testName}${result.error ? ` (${result.error})` : ''}`);
      });
    }
    
    const blockers = this.identifyBlockers(results);
    if (blockers.length > 0) {
      console.log('\n🚨 Critical Blockers:');
      blockers.forEach(blocker => console.log(`  • ${blocker}`));
    }
    
    console.log('\n🎯 Next Actions:');
    this.getNextActions(summary).forEach(action => console.log(`  • ${action}`));
    
    console.log(`\n📋 Report saved to: ${this.outputDir}/vk-parity-report.{json,html}`);
  }

  private identifyBlockers(results: VkParityResult[]): string[] {
    const blockers: string[] = [];
    
    // Check for the critical VK hash issue
    const failingResults = results.filter(r => !r.matches);
    const identicalHashes = failingResults.filter(r => 
      r.sparkyVkHash === r.snarkyVkHash && r.sparkyVkHash !== 'error'
    );
    
    if (identicalHashes.length > 0) {
      blockers.push('Multiple Sparky VKs generate identical hashes - VK generation broken');
    }
    
    if (results.length === 0) {
      blockers.push('No test results - test suite may not be running');
    }
    
    const errorCount = results.filter(r => r.error).length;
    if (errorCount > results.length * 0.5) {
      blockers.push(`High error rate: ${errorCount}/${results.length} tests failing with errors`);
    }
    
    return blockers;
  }

  private getNextActions(summary: TestSummary): string[] {
    const actions: string[] = [];
    
    if (summary.parityRate === 0) {
      actions.push('Focus on basic VK generation - no parity achieved yet');
      actions.push('Debug constraint routing bug: globalThis.__snarky not updating');
      actions.push('Investigate why all Sparky VKs generate identical hash');
    } else if (summary.parityRate < 0.5) {
      actions.push('Implement missing reduce_lincom optimization');
      actions.push('Fix constraint count discrepancies between backends');
      actions.push('Debug remaining VK generation differences');
    } else {
      actions.push('Optimize remaining edge cases');
      actions.push('Focus on performance improvements');
    }
    
    if (summary.failing > 0) {
      actions.push(`Fix ${summary.failing} failing tests`);
    }
    
    actions.push('Run: npm run test:simple-vk-parity for quick feedback');
    
    return actions;
  }

  private getCurrentCommit(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 7);
    } catch {
      return 'unknown';
    }
  }
}