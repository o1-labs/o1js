#!/usr/bin/env node

// Test compilation comparison between backends
// Created: July 5, 2025
// Last Modified: July 5, 2025 01:00 UTC

import('./dist/node/index.js').then(async (o1js) => {
  const { Field, ZkProgram, switchBackend, getCurrentBackend, Provable, Poseidon } = o1js;
  
  console.log('Circuit Compilation Comparison Test\n');
  
  // Define a complex ZkProgram that uses various features
  const createComplexProgram = (name) => {
    return ZkProgram({
      name: name,
      publicInput: Field,
      
      methods: {
        simple: {
          privateInputs: [Field],
          method(pubIn, privIn) {
            const result = pubIn.mul(privIn);
            result.assertEquals(Field(42));
          }
        },
        
        withWitness: {
          privateInputs: [Field],
          method(pubIn, privIn) {
            // Create witness variables
            const w1 = Provable.witness(Field, () => Field(10));
            const w2 = Provable.witness(Field, () => Field(20));
            
            // Add constraints
            w1.assertGreaterThan(Field(5));
            w2.assertLessThan(Field(30));
            
            const result = pubIn.add(privIn).add(w1).sub(w2);
            return result;
          }
        },
        
        withHash: {
          privateInputs: [Field, Field],
          method(pubIn, x, y) {
            // Test Poseidon hash
            const hash = Poseidon.hash([pubIn, x, y]);
            return hash;
          }
        }
      }
    });
  };
  
  // Test Snarky
  console.log('1. Compiling with Snarky backend...');
  await switchBackend('snarky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  const SnarkyProgram = createComplexProgram('SnarkyProgram');
  let snarkyResult = null;
  
  try {
    const start = Date.now();
    snarkyResult = await SnarkyProgram.compile();
    const duration = Date.now() - start;
    
    console.log(`   ✅ Snarky compilation successful in ${duration}ms`);
    console.log(`   - Analyzed methods:`, Object.keys(SnarkyProgram.analyzeMethods ? await SnarkyProgram.analyzeMethods() : {}));
    
  } catch (error) {
    console.error('   ❌ Snarky compilation failed:', error.message);
  }
  
  // Test Sparky
  console.log('\n2. Compiling with Sparky backend...');
  await switchBackend('sparky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  const SparkyProgram = createComplexProgram('SparkyProgram');
  let sparkyResult = null;
  
  try {
    const start = Date.now();
    sparkyResult = await SparkyProgram.compile();
    const duration = Date.now() - start;
    
    console.log(`   ✅ Sparky compilation successful in ${duration}ms`);
    console.log(`   - Analyzed methods:`, Object.keys(SparkyProgram.analyzeMethods ? await SparkyProgram.analyzeMethods() : {}));
    
  } catch (error) {
    console.error('   ❌ Sparky compilation failed:', error.message);
    console.error('   Error type:', error.constructor.name);
    
    // Check if specific functions are missing
    if (error.message.includes('rangeCheck0')) {
      console.log('\n   🔍 RangeCheck0 issue detected');
      if (globalThis.sparkyJS?.sparkyInstance) {
        console.log('   - rangeCheck0 type:', typeof globalThis.sparkyJS.sparkyInstance.rangeCheck0);
        console.log('   - rangeCheck0 exists:', !!globalThis.sparkyJS.sparkyInstance.rangeCheck0);
      }
    }
    
    if (error.message.includes('poseidon')) {
      console.log('\n   🔍 Poseidon issue detected');
      if (globalThis.sparkyJS?.sparkyInstance) {
        console.log('   - poseidon exists:', !!globalThis.sparkyJS.sparkyInstance.poseidon);
        if (globalThis.sparkyJS.sparkyInstance.poseidon) {
          console.log('   - poseidon.hash type:', typeof globalThis.sparkyJS.sparkyInstance.poseidon.hash);
        }
      }
    }
    
    // Show partial stack trace for debugging
    const stackLines = error.stack.split('\n').slice(0, 10);
    console.log('\n   Stack trace (first 10 lines):');
    stackLines.forEach(line => console.log('   ', line));
  }
  
  // Compare results
  console.log('\n3. Results Summary:');
  if (snarkyResult && sparkyResult) {
    console.log('   ✅ Both backends compiled successfully!');
    console.log('   This indicates the comprehensive test failures might be due to:');
    console.log('   - Test comparison logic');
    console.log('   - SmartContract-specific features');
    console.log('   - Timeout issues in the test framework');
  } else if (snarkyResult && !sparkyResult) {
    console.log('   ❌ Sparky compilation failed while Snarky succeeded');
    console.log('   This indicates missing functionality in Sparky backend');
  } else {
    console.log('   ❌ Unexpected compilation results');
  }
  
}).catch(console.error);