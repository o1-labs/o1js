#!/usr/bin/env node
/**
 * VK Test Runner Script
 * Runs the comprehensive VK compatibility test suite and generates detailed reports
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== VK COMPATIBILITY TEST RUNNER ===\n');
console.log('This will test EVERY WASM API entry function for VK compatibility.\n');

// Helper to run command and capture output
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });
    
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Build the project
    console.log('Step 1: Building o1js...\n');
    await runCommand('npm', ['run', 'build']);
    console.log('\n✅ Build complete\n');
    
    // Step 2: Run the comprehensive test suite
    console.log('Step 2: Running VK compatibility tests...\n');
    await runCommand('./jest', ['src/test/sparky-vk-comprehensive.test.ts', '--forceExit']);
    
    // Step 3: Generate summary report
    console.log('\n\nStep 3: Generating summary report...\n');
    
    // Read the test results if they exist
    const resultsPath = path.join(__dirname, 'vk-comprehensive-test-results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // Generate markdown report
      let report = '# VK Compatibility Test Report\n\n';
      report += `Generated: ${new Date().toISOString()}\n\n`;
      report += '## Summary\n\n';
      
      const passed = results.filter(r => r.match && !r.error).length;
      const failed = results.filter(r => !r.match && !r.error).length;
      const errors = results.filter(r => r.error).length;
      
      report += `| Status | Count | Percentage |\n`;
      report += `|--------|-------|------------|\n`;
      report += `| ✅ Passed | ${passed} | ${((passed/results.length)*100).toFixed(1)}% |\n`;
      report += `| ❌ Failed | ${failed} | ${((failed/results.length)*100).toFixed(1)}% |\n`;
      report += `| 🚨 Errors | ${errors} | ${((errors/results.length)*100).toFixed(1)}% |\n`;
      report += `| **Total** | **${results.length}** | **100%** |\n\n`;
      
      // Check for critical issue
      const sparkyVKs = results.filter(r => r.sparkyVK).map(r => r.sparkyVK);
      const uniqueSparkyVKs = new Set(sparkyVKs);
      if (uniqueSparkyVKs.size === 1 && sparkyVKs.length > 1) {
        report += '## 🚨 CRITICAL ISSUE\n\n';
        report += 'All Sparky VKs are generating the same hash! This indicates a fundamental issue with the Sparky constraint system generation.\n\n';
        report += `The identical VK hash is: \`${sparkyVKs[0]}\`\n\n`;
      }
      
      // Detailed results
      report += '## Detailed Results\n\n';
      report += '| Test Name | Snarky Gates | Sparky Gates | Match | Notes |\n';
      report += '|-----------|--------------|--------------|-------|-------|\n';
      
      for (const result of results) {
        const status = result.error ? '🚨' : (result.match ? '✅' : '❌');
        const notes = result.error || (result.match ? 'VKs match' : 'VK mismatch');
        report += `| ${result.testName} | ${result.snarkyGates || '-'} | ${result.sparkyGates || '-'} | ${status} | ${notes} |\n`;
      }
      
      // Failed tests detail
      const failedTests = results.filter(r => !r.match && !r.error);
      if (failedTests.length > 0) {
        report += '\n## Failed Tests Detail\n\n';
        for (const test of failedTests) {
          report += `### ${test.testName}\n\n`;
          report += `- **Snarky VK**: \`${test.snarkyVK.substring(0, 40)}...\`\n`;
          report += `- **Sparky VK**: \`${test.sparkyVK.substring(0, 40)}...\`\n`;
          report += `- **Gates**: Snarky=${test.snarkyGates}, Sparky=${test.sparkyGates}\n\n`;
        }
      }
      
      // Error details
      const errorTests = results.filter(r => r.error);
      if (errorTests.length > 0) {
        report += '\n## Errors\n\n';
        for (const test of errorTests) {
          report += `### ${test.testName}\n\n`;
          report += `\`\`\`\n${test.error}\n\`\`\`\n\n`;
        }
      }
      
      // Recommendations
      report += '\n## Recommendations\n\n';
      
      if (uniqueSparkyVKs.size === 1 && sparkyVKs.length > 1) {
        report += '1. **Fix Sparky constraint system generation**: The fact that all programs generate the same VK indicates the constraint system is not being properly captured or transmitted to the VK generation logic.\n\n';
        report += '2. **Debug the Sparky → Pickles interface**: The issue likely lies in how Sparky constraint systems are converted to the format expected by Pickles for VK generation.\n\n';
        report += '3. **Check the constraint system JSON**: Compare the constraint system JSON output between Snarky and Sparky for the same program.\n\n';
      } else if (failed > 0) {
        report += '1. **Investigate constraint generation differences**: Even if VKs are different, mismatches indicate differences in how constraints are generated.\n\n';
        report += '2. **Check gate optimization**: Different optimization strategies between Snarky and Sparky could lead to different constraint systems.\n\n';
        report += '3. **Verify field arithmetic**: Ensure all field operations produce identical results in both backends.\n\n';
      }
      
      // Save report
      const reportPath = path.join(__dirname, 'VK-COMPATIBILITY-REPORT.md');
      fs.writeFileSync(reportPath, report);
      console.log(`\n✅ Report saved to ${reportPath}\n`);
      
      // Also save a JSON summary
      const summary = {
        timestamp: new Date().toISOString(),
        total: results.length,
        passed,
        failed,
        errors,
        criticalIssue: uniqueSparkyVKs.size === 1 && sparkyVKs.length > 1,
        results: results.map(r => ({
          test: r.testName,
          match: r.match,
          error: r.error,
          snarkyGates: r.snarkyGates,
          sparkyGates: r.sparkyGates
        }))
      };
      
      fs.writeFileSync(
        path.join(__dirname, 'vk-test-summary.json'),
        JSON.stringify(summary, null, 2)
      );
    }
    
  } catch (error) {
    console.error('\n❌ Test runner failed:', error);
    process.exit(1);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTotal time: ${duration}s`);
}

main().catch(console.error);