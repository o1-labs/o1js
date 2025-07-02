#!/usr/bin/env node

/**
 * Standalone VK Parity Analysis Script
 * 
 * Immediately tests the VK hash extraction system to detect the critical
 * "All Sparky VKs generate identical hash" bug.
 * 
 * Usage: node test-vk-parity-analysis.mjs
 */

import { createVKParityAnalysis } from './dist/node/test/pbt/analysis/VKParityAnalysis.js';

async function main() {
  console.log('🚀 VK Parity Analysis - Detecting Critical Backend Bug');
  console.log('=' .repeat(60));
  
  try {
    const analysis = createVKParityAnalysis();
    
    // Step 1: Quick identical hash bug detection
    console.log('\n🔍 Step 1: Quick Identical Hash Bug Detection');
    console.log('-'.repeat(50));
    
    const bugResult = await analysis.detectIdenticalHashBug();
    
    if (bugResult.bugDetected) {
      console.log('🚨 CRITICAL BUG DETECTED!');
      console.log(`   All Sparky VKs generate identical hash: ${bugResult.identicalHash}`);
      console.log(`   This is the root cause preventing VK parity`);
      console.log(`   Affected programs: ${bugResult.affectedPrograms.join(', ')}`);
    } else {
      console.log('✅ No identical hash bug detected');
      console.log('   Sparky is generating diverse VK hashes');
    }
    
    // Step 2: Minimal circuit VK extraction
    console.log('\n🔬 Step 2: Minimal Circuit VK Analysis');
    console.log('-'.repeat(50));
    
    try {
      const minimal = await analysis.minimizeCircuitForVKDebugging(null);
      console.log(`✅ Minimal circuit baseline VK: ${minimal.vkHash.substring(0, 20)}...`);
      console.log('   Debugging steps:');
      minimal.steps.forEach(step => console.log(`     ${step}`));
    } catch (error) {
      console.log(`❌ Minimal circuit analysis failed: ${error.message}`);
    }
    
    // Step 3: Complexity-based VK generation
    console.log('\n📊 Step 3: Complexity-Based VK Analysis');
    console.log('-'.repeat(50));
    
    const complexityLevels = analysis.getComplexityLevels();
    console.log(`Testing ${complexityLevels.length} complexity levels...`);
    
    // Test first few levels for speed
    const testLevels = complexityLevels.slice(0, 3);
    const programs = testLevels.map(level => level.generator());
    
    const results = await analysis.batchVKGeneration(programs, true);
    
    // Analyze results
    const snarkyResults = results.filter(r => r.backend === 'snarky' && r.success);
    const sparkyResults = results.filter(r => r.backend === 'sparky' && r.success);
    
    console.log(`   Snarky successful compilations: ${snarkyResults.length}`);
    console.log(`   Sparky successful compilations: ${sparkyResults.length}`);
    
    if (snarkyResults.length > 0 && sparkyResults.length > 0) {
      const snarkyHashes = snarkyResults.map(r => r.vkHash);
      const sparkyHashes = sparkyResults.map(r => r.vkHash);
      
      const snarkyUnique = new Set(snarkyHashes).size;
      const sparkyUnique = new Set(sparkyHashes).size;
      
      console.log(`   Snarky unique VK hashes: ${snarkyUnique}/${snarkyHashes.length}`);
      console.log(`   Sparky unique VK hashes: ${sparkyUnique}/${sparkyHashes.length}`);
      
      if (sparkyUnique === 1 && sparkyHashes.length > 1) {
        console.log('🚨 CONFIRMED: All Sparky VKs are identical!');
        console.log(`   Identical hash: ${sparkyHashes[0].substring(0, 20)}...`);
      } else if (sparkyUnique < sparkyHashes.length) {
        console.log('⚠️  Some Sparky VKs are identical (partial bug)');
      } else {
        console.log('✅ Sparky VKs are diverse');
      }
      
      // VK parity check
      let matches = 0;
      for (let i = 0; i < Math.min(snarkyResults.length, sparkyResults.length); i++) {
        if (snarkyResults[i].vkHash === sparkyResults[i].vkHash) {
          matches++;
        }
      }
      
      const parityRate = matches / Math.max(snarkyResults.length, sparkyResults.length);
      console.log(`   VK Parity Rate: ${(parityRate * 100).toFixed(1)}% (${matches} matches)`);
      
      if (parityRate === 0) {
        console.log('🚨 ZERO VK PARITY - Fundamental backend issue');
      } else if (parityRate < 0.5) {
        console.log('⚠️  Low VK parity - Systematic differences');
      } else {
        console.log('✅ Good VK parity');
      }
    }
    
    // Step 4: Progress assessment
    console.log('\n📈 Step 4: Progress Assessment');
    console.log('-'.repeat(50));
    
    const progress = analysis.trackVKParityProgress();
    console.log(`Current Progress Score: ${(progress.progressScore * 100).toFixed(1)}%`);
    
    if (progress.trends.length > 0) {
      console.log('Trends:');
      progress.trends.forEach(trend => console.log(`  - ${trend}`));
    }
    
    if (progress.recommendations.length > 0) {
      console.log('Recommendations:');
      progress.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    // Final summary
    console.log('\n🎯 SUMMARY');
    console.log('=' .repeat(60));
    
    if (bugResult.bugDetected) {
      console.log('🚨 CRITICAL ISSUE IDENTIFIED:');
      console.log('   All Sparky VKs generate identical hash');
      console.log('   This prevents any VK parity with Snarky');
      console.log('   Root cause: VK generation logic in Sparky backend');
      console.log('   Priority: FIX IMMEDIATELY');
      console.log('   Location: src/bindings/sparky-adapter.js compile() method');
    } else if (progress.progressScore < 0.2) {
      console.log('⚠️  SYSTEMATIC BACKEND DIFFERENCES:');
      console.log('   VK parity is very low but not due to identical hashes');
      console.log('   Likely constraint system differences');
      console.log('   Priority: HIGH');
    } else if (progress.progressScore < 0.8) {
      console.log('📊 PARTIAL COMPATIBILITY:');
      console.log('   Some circuits achieve VK parity');
      console.log('   Focus on failing patterns');
      console.log('   Priority: MEDIUM');  
    } else {
      console.log('✅ NEAR COMPLETION:');
      console.log('   High VK parity achieved');  
      console.log('   Focus on edge cases');
      console.log('   Priority: LOW');
    }
    
    console.log('\n✨ Analysis Complete!');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };