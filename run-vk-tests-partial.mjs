#!/usr/bin/env node
/**
 * Partial VK Test Runner
 * Runs specific test groups to avoid timeouts
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testGroup = process.argv[2] || 'all';

console.log('=== PARTIAL VK TEST RUNNER ===\n');
console.log(`Running test group: ${testGroup}\n`);

// Define test groups
const testGroups = {
  field: ['Field Operations'],
  bool: ['Bool Operations'],
  hash: ['Hash Functions'],
  ec: ['EC Operations'],
  range: ['Range Checks'],
  foreign: ['Foreign Field Operations'],
  advanced: ['Advanced Gates'],
  constraint: ['Constraint System Operations'],
  complex: ['Complex Programs']
};

// Helper to run specific tests
function runTests(pattern) {
  return new Promise((resolve, reject) => {
    const args = [
      'src/test/sparky-vk-comprehensive.test.ts',
      '--testNamePattern',
      pattern,
      '--forceExit',
      '--verbose'
    ];
    
    const proc = spawn('./jest', args, { 
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
      resolve({ code, stdout, stderr });
    });
  });
}

async function main() {
  try {
    // First ensure project is built
    console.log('Building project...\n');
    await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
      build.on('close', (code) => {
        if (code !== 0) reject(new Error(`Build failed with code ${code}`));
        else resolve();
      });
    });
    
    console.log('\n✅ Build complete\n');
    
    // Determine which tests to run
    let patterns = [];
    if (testGroup === 'all') {
      patterns = Object.values(testGroups).flat();
    } else if (testGroups[testGroup]) {
      patterns = testGroups[testGroup];
    } else {
      patterns = [testGroup]; // Custom pattern
    }
    
    // Run tests for each pattern
    const results = [];
    for (const pattern of patterns) {
      console.log(`\n========== Running: ${pattern} ==========\n`);
      const result = await runTests(pattern);
      results.push({ pattern, ...result });
      
      // Small delay between test groups
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate summary
    console.log('\n\n=== SUMMARY ===\n');
    for (const result of results) {
      const status = result.code === 0 ? '✅' : '❌';
      console.log(`${status} ${result.pattern}`);
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const resultsFile = `vk-test-results-${testGroup}-${timestamp}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsFile}`);
    
  } catch (error) {
    console.error('\n❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Show usage if needed
if (process.argv[2] === '--help') {
  console.log('Usage: ./run-vk-tests-partial.mjs [group]');
  console.log('\nAvailable groups:');
  Object.keys(testGroups).forEach(g => console.log(`  ${g}`));
  console.log('  all (default)');
  console.log('\nOr provide a custom test name pattern');
  process.exit(0);
}

main().catch(console.error);