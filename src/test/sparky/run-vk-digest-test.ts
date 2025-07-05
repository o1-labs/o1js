#!/usr/bin/env node
/**
 * Direct VK Digest Test Runner
 * 
 * Runs the VK digest test directly to verify digest functionality
 * between Snarky and Sparky backends.
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runVkDigestTest() {
  console.log('🔍 VK DIGEST TEST RUNNER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing digest functionality between Snarky and Sparky backends');
  console.log('');

  try {
    // Import the VK digest test suite
    const vkDigestSuite = await import('./suites/integration/vk-digest.suite.js');
    const tests = vkDigestSuite.tests;
    
    console.log(`📋 Found ${tests.length} VK digest tests`);
    console.log('');
    
    // Results for both backends
    const snarkyResults: any[] = [];
    const sparkyResults: any[] = [];
    
    // Run tests on Snarky backend
    console.log('🔧 Testing Snarky backend...');
    process.env.SPARKY_BACKEND = 'snarky';
    await import('../../index.js');
    
    for (const test of tests) {
      console.log(`   Running: ${test.name}`);
      try {
        const result = await test.testFn('snarky');
        result.backend = 'snarky';
        snarkyResults.push(result);
        console.log(`   ✅ ${test.name} - Snarky completed`);
      } catch (error) {
        console.log(`   ❌ ${test.name} - Snarky failed: ${(error as Error).message}`);
        snarkyResults.push({
          backend: 'snarky',
          testName: test.name,
          error: (error as Error).message,
          success: false
        });
      }
    }
    
    console.log('');
    
    // Run tests on Sparky backend
    console.log('🔧 Testing Sparky backend...');
    process.env.SPARKY_BACKEND = 'sparky';
    // Force reload of o1js with new backend
    await import('../../index.js');
    
    for (const test of tests) {
      console.log(`   Running: ${test.name}`);
      try {
        const result = await test.testFn('sparky');
        result.backend = 'sparky';
        sparkyResults.push(result);
        console.log(`   ✅ ${test.name} - Sparky completed`);
      } catch (error) {
        console.log(`   ❌ ${test.name} - Sparky failed: ${(error as Error).message}`);
        sparkyResults.push({
          backend: 'sparky',
          testName: test.name,
          error: (error as Error).message,
          success: false
        });
      }
    }
    
    console.log('');
    console.log('📊 DIGEST COMPARISON RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Compare results
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const snarkyResult = snarkyResults[i];
      const sparkyResult = sparkyResults[i];
      
      console.log(`🧪 Test: ${test.name}`);
      console.log(`   Snarky digest: ${snarkyResult.digest || 'N/A'}`);
      console.log(`   Sparky digest: ${sparkyResult.digest || 'N/A'}`);
      
      if (snarkyResult.digest && sparkyResult.digest) {
        const snarkyValidMD5 = snarkyResult.isValidMD5;
        const sparkyValidMD5 = sparkyResult.isValidMD5;
        const snarkyIsSuspicious = snarkyResult.isSuspiciousValue;
        const sparkyIsSuspicious = sparkyResult.isSuspiciousValue;
        
        console.log(`   Snarky MD5 valid: ${snarkyValidMD5 ? '✅' : '❌'}`);
        console.log(`   Sparky MD5 valid: ${sparkyValidMD5 ? '✅' : '❌'}`);
        console.log(`   Snarky suspicious: ${snarkyIsSuspicious ? '⚠️' : '✅'}`);
        console.log(`   Sparky suspicious: ${sparkyIsSuspicious ? '⚠️' : '✅'}`);
        
        if (snarkyResult.digest === sparkyResult.digest) {
          console.log(`   Match: ✅ Digests are identical`);
        } else {
          console.log(`   Match: ❌ Digests differ`);
        }
      } else {
        console.log(`   Status: ❌ Could not access digest from one or both backends`);
      }
      
      console.log('');
    }
    
    // Summary
    const snarkySuccess = snarkyResults.filter(r => r.success !== false).length;
    const sparkySuccess = sparkyResults.filter(r => r.success !== false).length;
    const totalTests = tests.length;
    
    console.log('📋 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Snarky tests: ${snarkySuccess}/${totalTests} successful`);
    console.log(`Sparky tests: ${sparkySuccess}/${totalTests} successful`);
    
    // Check for MD5 vs "2" issue
    const sparkyMD5Count = sparkyResults.filter(r => r.isValidMD5).length;
    const sparkySuspiciousCount = sparkyResults.filter(r => r.isSuspiciousValue).length;
    
    console.log('');
    console.log('🔍 DIGEST ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Sparky valid MD5 digests: ${sparkyMD5Count}/${totalTests}`);
    console.log(`Sparky suspicious values: ${sparkySuspiciousCount}/${totalTests}`);
    
    if (sparkySuspiciousCount > 0) {
      console.log('⚠️  ISSUE: Sparky is still returning suspicious digest values');
    } else if (sparkyMD5Count === totalTests) {
      console.log('✅ SUCCESS: All Sparky digests are valid MD5 hashes');
    } else {
      console.log('❓ MIXED: Some Sparky digests are valid, some are not accessible');
    }
    
  } catch (error) {
    console.error('❌ VK digest test failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVkDigestTest();
}

export { runVkDigestTest };