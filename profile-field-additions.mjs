#!/usr/bin/env node

/**
 * Performance Profile: 10,000 Field Additions with Constraint Generation
 * 
 * Compares Snarky vs Sparky performance for field addition operations
 * including constraint generation overhead.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function profileFieldAdditions(backend, iterations = 10000) {
  console.log(`\n🔧 Profiling ${iterations} field additions with ${backend.toUpperCase()}...`);
  
  await switchBackend(backend);
  
  // Create a ZkProgram that performs many field additions
  const AdditionProgram = ZkProgram({
    name: `FieldAdditions${backend}`,
    publicInput: Field,
    methods: {
      addManyFields: {
        privateInputs: [Field],
        async method(publicInput, privateField) {
          let result = publicInput;
          
          // Perform many additions to stress test the backend
          for (let i = 0; i < iterations; i++) {
            result = result.add(privateField);
          }
          
          return result;
        }
      }
    }
  });

  const startTime = performance.now();
  
  // Compile the program (this generates constraints)
  const compileStart = performance.now();
  await AdditionProgram.compile();
  const compileTime = performance.now() - compileStart;
  
  // Analyze the constraint system
  const analyzeStart = performance.now();
  const analysis = await AdditionProgram.analyzeMethods();
  const analyzeTime = performance.now() - analyzeStart;
  
  const totalTime = performance.now() - startTime;
  
  const constraintCount = Object.values(analysis)[0]?.rows || 0;
  
  console.log(`✅ ${backend.toUpperCase()} Results:`);
  console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Compile Time: ${compileTime.toFixed(2)}ms`);
  console.log(`   Analysis Time: ${analyzeTime.toFixed(2)}ms`);
  console.log(`   Constraints Generated: ${constraintCount}`);
  console.log(`   Time per Addition: ${(totalTime / iterations).toFixed(4)}ms`);
  console.log(`   Constraints per Addition: ${(constraintCount / iterations).toFixed(3)}`);
  
  return {
    backend,
    iterations,
    totalTime,
    compileTime,
    analyzeTime,
    constraintCount,
    timePerAddition: totalTime / iterations,
    constraintsPerAddition: constraintCount / iterations
  };
}

async function runComparison() {
  console.log('🚀 Field Addition Performance Comparison');
  console.log('==========================================');
  
  const iterations = 10000;
  
  try {
    // Profile Snarky
    const snarkyResults = await profileFieldAdditions('snarky', iterations);
    
    // Profile Sparky
    const sparkyResults = await profileFieldAdditions('sparky', iterations);
    
    // Calculate performance ratios
    const timeRatio = sparkyResults.totalTime / snarkyResults.totalTime;
    const compileRatio = sparkyResults.compileTime / snarkyResults.compileTime;
    const constraintRatio = sparkyResults.constraintCount / snarkyResults.constraintCount;
    
    console.log('\n📊 PERFORMANCE COMPARISON');
    console.log('=========================');
    console.log(`Total Time Ratio (Sparky/Snarky): ${timeRatio.toFixed(2)}x`);
    console.log(`Compile Time Ratio: ${compileRatio.toFixed(2)}x`);
    console.log(`Constraint Count Ratio: ${constraintRatio.toFixed(2)}x`);
    
    console.log('\n📈 DETAILED BREAKDOWN');
    console.log('====================');
    console.log(`Snarky: ${snarkyResults.totalTime.toFixed(2)}ms total, ${snarkyResults.constraintCount} constraints`);
    console.log(`Sparky: ${sparkyResults.totalTime.toFixed(2)}ms total, ${sparkyResults.constraintCount} constraints`);
    
    if (timeRatio < 1.5) {
      console.log('\n✅ Sparky performance is within target (<1.5x of Snarky)');
    } else if (timeRatio < 2.0) {
      console.log('\n⚠️  Sparky performance is acceptable but could be improved');
    } else {
      console.log('\n❌ Sparky performance needs optimization');
    }
    
    if (Math.abs(constraintRatio - 1.0) < 0.1) {
      console.log('✅ Constraint generation parity achieved');
    } else {
      console.log(`❌ Constraint generation differs by ${((constraintRatio - 1.0) * 100).toFixed(1)}%`);
    }
    
    return { snarkyResults, sparkyResults, timeRatio, constraintRatio };
    
  } catch (error) {
    console.error('❌ Profiling failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the comparison
runComparison().catch(console.error);