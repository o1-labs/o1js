/**
 * VK DEBUG HARNESS RUNNER
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Direct execution runner for VK debug harness
 * Usage: npm run build && node dist/node/test/sparky/run-vk-debug-harness.js
 */

import { runVKDebugHarness } from './vk-debug-harness.js';

async function main() {
  console.log('🚀 VK DEBUG HARNESS RUNNER');
  console.log('=' .repeat(80));
  console.log('Starting comprehensive VK comparison analysis...\n');

  try {
    const results = await runVKDebugHarness();
    
    // Generate detailed report
    console.log('\n📝 DETAILED ANALYSIS REPORT');
    console.log('=' .repeat(80));
    
    const mismatches = results.filter(r => !r.hashMatch);
    const matches = results.filter(r => r.hashMatch);
    
    console.log(`✅ Matching VKs: ${matches.length}`);
    console.log(`❌ Mismatched VKs: ${mismatches.length}`);
    
    if (mismatches.length > 0) {
      console.log('\n🔍 MISMATCH DETAILS:');
      mismatches.forEach((mismatch, i) => {
        console.log(`\n${i + 1}. ${mismatch.circuitName}:`);
        console.log(`   Snarky VK Hash: ${mismatch.snarkyAnalysis.vkComponents.hash}`);
        console.log(`   Sparky VK Hash: ${mismatch.sparkyAnalysis.vkComponents.hash}`);
        console.log(`   Constraint Count: ${mismatch.snarkyAnalysis.constraintCount} vs ${mismatch.sparkyAnalysis.constraintCount}`);
        console.log(`   Digest: ${mismatch.snarkyAnalysis.digest} vs ${mismatch.sparkyAnalysis.digest}`);
        
        if (mismatch.differences.length > 0) {
          console.log('   Differences:');
          mismatch.differences.forEach(diff => {
            console.log(`     - ${diff}`);
          });
        }
      });
    }
    
    // Generate recommendation summary
    console.log('\n🎯 RECOMMENDATIONS:');
    if (mismatches.length === 0) {
      console.log('✅ All VKs match - implementation is working correctly!');
    } else {
      console.log('❌ VK mismatches detected. Key areas to investigate:');
      
      // Check if all circuits have same pattern
      const allHaveSameConstraintCount = mismatches.every(m => 
        m.snarkyAnalysis.constraintCount === m.sparkyAnalysis.constraintCount
      );
      
      if (allHaveSameConstraintCount) {
        console.log('  1. 🔍 Constraint counts match - issue likely in permutation polynomial construction');
        console.log('  2. 🔍 Focus on sigma commitment generation in Sparky');
        console.log('  3. 🔍 Check permutation table construction and equivalence classes');
      } else {
        console.log('  1. 🔍 Constraint counts differ - issue in constraint system generation');
        console.log('  2. 🔍 Check gate generation and witness handling');
      }
      
      // Check if empty circuits fail
      const emptyCircuitFails = mismatches.some(m => m.circuitName.includes('Empty'));
      if (emptyCircuitFails) {
        console.log('  3. 🔍 Empty circuits fail - fundamental issue in constraint system setup');
        console.log('  4. 🔍 Check domain initialization and basic permutation setup');
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total tests: ${results.length}`);
    console.log(`Successful: ${matches.length}`);
    console.log(`Failed: ${mismatches.length}`);
    console.log(`Success rate: ${Math.round((matches.length / results.length) * 100)}%`);
    
  } catch (error) {
    console.error('❌ Debug harness failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);