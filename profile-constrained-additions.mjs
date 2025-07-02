#!/usr/bin/env node

/**
 * Performance Profile: Field Additions with Actual Constraint Generation
 * 
 * Creates a program that forces constraint generation for each addition
 * by using witness variables and assertions.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function profileConstrainedAdditions(backend, additionCount = 1000) {
  console.log(`\n🔧 Profiling ${additionCount} constrained field additions with ${backend.toUpperCase()}...`);
  
  await switchBackend(backend);
  
  // Create a circuit that performs constrained additions
  const testCircuit = () => {
    let sum = Provable.witness(Field, () => Field(0));
    
    for (let i = 1; i <= additionCount; i++) {
      const next = Provable.witness(Field, () => Field(i));
      const newSum = sum.add(next);
      
      // Force constraint generation by asserting the result
      newSum.assertEquals(sum.add(next));
      sum = newSum;
    }
    
    return sum;
  };

  const startTime = performance.now();
  
  // Generate constraint system (this is where constraints are actually created)
  console.log(`   Generating constraint system...`);
  const constraintStart = performance.now();
  const constraintSystem = await Provable.constraintSystem(testCircuit);
  const constraintTime = performance.now() - constraintStart;
  
  const totalTime = performance.now() - startTime;
  const constraintCount = constraintSystem.gates.length;
  
  console.log(`✅ ${backend.toUpperCase()} Results:`);
  console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Constraint Generation Time: ${constraintTime.toFixed(2)}ms`);
  console.log(`   Constraints Generated: ${constraintCount}`);
  console.log(`   Time per Addition: ${(constraintTime / additionCount).toFixed(4)}ms`);
  console.log(`   Constraints per Addition: ${(constraintCount / additionCount).toFixed(3)}`);
  
  return {
    backend,
    additionCount,
    totalTime,
    constraintTime,
    constraintCount,
    timePerAddition: constraintTime / additionCount,
    constraintsPerAddition: constraintCount / additionCount
  };
}

async function runConstrainedComparison() {
  console.log('🚀 Constrained Field Addition Performance Comparison');
  console.log('==================================================');
  
  // Use smaller count for constraint generation (it's more expensive)
  const additionCount = 1000;
  
  try {
    // Profile Snarky
    const snarkyResults = await profileConstrainedAdditions('snarky', additionCount);
    
    // Profile Sparky
    const sparkyResults = await profileConstrainedAdditions('sparky', additionCount);
    
    // Calculate performance ratios
    const timeRatio = sparkyResults.constraintTime / snarkyResults.constraintTime;
    const constraintRatio = sparkyResults.constraintCount / snarkyResults.constraintCount;
    
    console.log('\n📊 PERFORMANCE COMPARISON');
    console.log('=========================');
    console.log(`Constraint Generation Time Ratio (Sparky/Snarky): ${timeRatio.toFixed(2)}x`);
    console.log(`Constraint Count Ratio: ${constraintRatio.toFixed(2)}x`);
    
    console.log('\n📈 DETAILED BREAKDOWN');
    console.log('====================');
    console.log(`Snarky: ${snarkyResults.constraintTime.toFixed(2)}ms, ${snarkyResults.constraintCount} constraints`);
    console.log(`Sparky: ${sparkyResults.constraintTime.toFixed(2)}ms, ${sparkyResults.constraintCount} constraints`);
    console.log(`Snarky efficiency: ${(snarkyResults.constraintTime / snarkyResults.constraintCount).toFixed(3)}ms per constraint`);
    console.log(`Sparky efficiency: ${(sparkyResults.constraintTime / sparkyResults.constraintCount).toFixed(3)}ms per constraint`);
    
    console.log('\n🎯 ASSESSMENT');
    console.log('=============');
    
    if (timeRatio < 1.5) {
      console.log('✅ Sparky constraint generation is within target (<1.5x of Snarky)');
    } else if (timeRatio < 2.0) {
      console.log('⚠️  Sparky constraint generation is acceptable but could be improved');
    } else {
      console.log('❌ Sparky constraint generation needs optimization');
    }
    
    if (Math.abs(constraintRatio - 1.0) < 0.1) {
      console.log('✅ Constraint count parity achieved');
    } else if (constraintRatio > 1.0) {
      console.log(`⚠️  Sparky generates ${((constraintRatio - 1.0) * 100).toFixed(1)}% more constraints than Snarky`);
    } else {
      console.log(`❓ Sparky generates ${((1.0 - constraintRatio) * 100).toFixed(1)}% fewer constraints than Snarky`);
    }
    
    // Check for the known constraint inflation issue
    if (constraintRatio > 2.0) {
      console.log('🚨 CRITICAL: Constraint inflation detected - likely missing reduce_lincom optimization');
    }
    
    return { snarkyResults, sparkyResults, timeRatio, constraintRatio };
    
  } catch (error) {
    console.error('❌ Profiling failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the comparison
runConstrainedComparison().catch(console.error);