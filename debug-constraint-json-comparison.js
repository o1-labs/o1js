#!/usr/bin/env node

/**
 * Debug script for constraint system JSON comparison
 * 
 * This script runs the constraint system JSON comparison tests and provides
 * detailed output about differences between Snarky and Sparky backends.
 * 
 * Created: January 5, 2025, 00:20 UTC
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { tests, ConstraintSystemJSONComparer } from './dist/node/test/sparky/suites/integration/constraint-system-json-comparison.suite.js';
import fs from 'fs';

async function runConstraintJSONComparison() {
  console.log('🧪 Constraint System JSON Comparison Test');
  console.log('=========================================\n');
  
  const results = [];
  const detailedDifferences = [];
  
  // Run each test on both backends
  for (const test of tests) {
    console.log(`\n📋 Running test: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      // Run on Snarky backend
      await switchBackend('snarky');
      console.log('  • Running on Snarky backend...');
      const snarkyResult = await test.testFn('snarky');
      
      // Run on Sparky backend
      await switchBackend('sparky');
      console.log('  • Running on Sparky backend...');
      const sparkyResult = await test.testFn('sparky');
      
      // Compare results
      if (snarkyResult.success && sparkyResult.success) {
        const comparison = ConstraintSystemJSONComparer.compareConstraintJSONs(
          snarkyResult.constraintJSON,
          sparkyResult.constraintJSON,
          test.name
        );
        
        const result = {
          testName: test.name,
          snarkySuccess: snarkyResult.success,
          sparkySuccess: sparkyResult.success,
          comparison: comparison,
          snarkyStats: snarkyResult.stats,
          sparkyStats: sparkyResult.stats
        };
        
        results.push(result);
        
        // Print summary
        if (comparison.identical) {
          console.log('  ✅ Constraint systems are IDENTICAL');
        } else {
          console.log('  ❌ Constraint systems DIFFER');
          console.log(`     ${comparison.summary}`);
          
          // Store detailed differences
          detailedDifferences.push({
            testName: test.name,
            differences: comparison.differences
          });
        }
        
        // Print stats
        if (snarkyResult.stats && sparkyResult.stats) {
          console.log(`  📊 Stats:`);
          console.log(`     • Snarky gates: ${snarkyResult.stats.gateCount}`);
          console.log(`     • Sparky gates: ${sparkyResult.stats.gateCount}`);
          console.log(`     • Gate difference: ${sparkyResult.stats.gateCount - snarkyResult.stats.gateCount}`);
          
          // Print gate type distribution if different
          const snarkyTypes = Object.keys(snarkyResult.stats.gateTypes).sort();
          const sparkyTypes = Object.keys(sparkyResult.stats.gateTypes).sort();
          
          if (JSON.stringify(snarkyTypes) !== JSON.stringify(sparkyTypes)) {
            console.log(`  🔍 Gate type differences detected:`);
            const allTypes = new Set([...snarkyTypes, ...sparkyTypes]);
            for (const type of allTypes) {
              const snarkyCount = snarkyResult.stats.gateTypes[type] || 0;
              const sparkyCount = sparkyResult.stats.gateTypes[type] || 0;
              if (snarkyCount !== sparkyCount) {
                console.log(`     • ${type}: Snarky=${snarkyCount}, Sparky=${sparkyCount} (diff=${sparkyCount - snarkyCount})`);
              }
            }
          }
        }
        
      } else {
        // Handle failures
        const result = {
          testName: test.name,
          snarkySuccess: snarkyResult.success,
          sparkySuccess: sparkyResult.success,
          snarkyError: snarkyResult.error,
          sparkyError: sparkyResult.error
        };
        
        results.push(result);
        
        console.log('  ⚠️  Test failed on one or both backends');
        if (!snarkyResult.success) {
          console.log(`     • Snarky error: ${snarkyResult.error}`);
        }
        if (!sparkyResult.success) {
          console.log(`     • Sparky error: ${sparkyResult.error}`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Test failed with error: ${error.message}`);
      results.push({
        testName: test.name,
        error: error.message
      });
    }
  }
  
  // Print summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========\n');
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.snarkySuccess && r.sparkySuccess).length;
  const identicalTests = results.filter(r => r.comparison && r.comparison.identical).length;
  const differentTests = results.filter(r => r.comparison && !r.comparison.identical).length;
  const failedTests = results.filter(r => !r.snarkySuccess || !r.sparkySuccess).length;
  
  console.log(`Total tests: ${totalTests}`);
  console.log(`✅ Successful on both backends: ${successfulTests}`);
  console.log(`🟰 Identical constraint systems: ${identicalTests}`);
  console.log(`⚠️  Different constraint systems: ${differentTests}`);
  console.log(`❌ Failed tests: ${failedTests}`);
  
  // Print optimization summary
  if (differentTests > 0) {
    console.log('\n🔧 OPTIMIZATION ANALYSIS');
    console.log('========================\n');
    
    const optimizations = results
      .filter(r => r.comparison && !r.comparison.identical)
      .filter(r => r.sparkyStats && r.snarkyStats && r.sparkyStats.gateCount < r.snarkyStats.gateCount);
    
    if (optimizations.length > 0) {
      console.log(`Found ${optimizations.length} cases where Sparky uses fewer gates:`);
      for (const opt of optimizations) {
        const reduction = opt.snarkyStats.gateCount - opt.sparkyStats.gateCount;
        const percentage = ((reduction / opt.snarkyStats.gateCount) * 100).toFixed(1);
        console.log(`  • ${opt.testName}: ${reduction} fewer gates (${percentage}% reduction)`);
      }
    }
    
    const regressions = results
      .filter(r => r.comparison && !r.comparison.identical)
      .filter(r => r.sparkyStats && r.snarkyStats && r.sparkyStats.gateCount > r.snarkyStats.gateCount);
    
    if (regressions.length > 0) {
      console.log(`\nFound ${regressions.length} cases where Sparky uses more gates:`);
      for (const reg of regressions) {
        const increase = reg.sparkyStats.gateCount - reg.snarkyStats.gateCount;
        const percentage = ((increase / reg.snarkyStats.gateCount) * 100).toFixed(1);
        console.log(`  • ${reg.testName}: ${increase} more gates (${percentage}% increase)`);
      }
    }
  }
  
  // Write detailed differences to file if any exist
  if (detailedDifferences.length > 0) {
    const filename = 'constraint-json-differences.json';
    console.log(`\n📝 Writing detailed differences to ${filename}`);
    fs.writeFileSync(filename, JSON.stringify(detailedDifferences, null, 2));
  }
  
  // Write full results
  const resultsFilename = 'constraint-json-comparison-results.json';
  console.log(`📝 Writing full results to ${resultsFilename}`);
  fs.writeFileSync(resultsFilename, JSON.stringify(results, null, 2));
  
  // Print example of differences for the first differing test
  if (detailedDifferences.length > 0) {
    console.log('\n🔍 EXAMPLE DIFFERENCES');
    console.log('=====================\n');
    
    const firstDiff = detailedDifferences[0];
    console.log(`Test: ${firstDiff.testName}`);
    console.log(`\nGate count difference:`);
    console.log(`  • Snarky: ${firstDiff.differences.gateCount.snarky}`);
    console.log(`  • Sparky: ${firstDiff.differences.gateCount.sparky}`);
    
    if (firstDiff.differences.gateDifferences && firstDiff.differences.gateDifferences.length > 0) {
      console.log(`\nFirst 3 gate differences:`);
      const maxDiffs = Math.min(3, firstDiff.differences.gateDifferences.length);
      for (let i = 0; i < maxDiffs; i++) {
        const diff = firstDiff.differences.gateDifferences[i];
        console.log(`  Gate ${diff.index}:`);
        console.log(`    Type: ${diff.type}`);
        console.log(`    Details:`, JSON.stringify(diff, null, 2).split('\n').map(l => '      ' + l).join('\n'));
      }
      
      if (firstDiff.differences.gateDifferences.length > 3) {
        console.log(`  ... and ${firstDiff.differences.gateDifferences.length - 3} more differences`);
      }
    }
  }
  
  console.log('\n✨ Constraint JSON comparison complete!');
}

// Run the comparison
runConstraintJSONComparison().catch(console.error);