#!/usr/bin/env node

/**
 * ZKPROGRAM CONSTRAINT GENERATION TEST
 * 
 * Tests if ZkProgram compilation generates constraints (alternative to Provable.constraintSystem)
 */

import { switchBackend, ZkProgram, Field, Provable } from './dist/node/index.js';

async function testZkProgramConstraints() {
  console.log('\n🧪 ZKPROGRAM CONSTRAINT GENERATION TEST');
  console.log('='.repeat(60));
  console.log('Testing if ZkProgram compilation generates constraints');
  console.log('='.repeat(60));

  // Simple ZkProgram with basic operations
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        method(publicInput, privateInput) {
          // This should generate constraints
          const result = publicInput.mul(privateInput);
          return result;
        },
      },
    },
  });

  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔧 Testing ZkProgram compilation with ${backend.toUpperCase()}`);
    console.log('-'.repeat(50));
    
    try {
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      // Attempt to compile the program
      console.log('🔨 Compiling ZkProgram...');
      const startTime = Date.now();
      
      try {
        await SimpleProgram.compile();
        const compileTime = Date.now() - startTime;
        console.log(`✅ Compilation successful in ${compileTime}ms`);
        
        // Try to get verification key info
        const vk = SimpleProgram.verificationKey;
        if (vk) {
          console.log(`📋 Verification key available`);
          console.log(`   VK data length: ${vk.data.length} elements`);
          console.log(`   VK hash: ${vk.hash}`);
        } else {
          console.log(`⚠️ No verification key available`);
        }
        
        // Try to generate a proof
        console.log('🔍 Attempting proof generation...');
        const proofStartTime = Date.now();
        
        try {
          const proof = await SimpleProgram.multiply(Field(5), Field(10));
          const proofTime = Date.now() - proofStartTime;
          console.log(`🎉 Proof generation successful in ${proofTime}ms`);
          console.log(`   Public input: ${proof.publicInput}`);
          console.log(`   Public output: ${proof.publicOutput}`);
          console.log(`   Proof verification: ${await SimpleProgram.verify(proof) ? '✅ VALID' : '❌ INVALID'}`);
          
          // This suggests constraints were actually generated
          console.log(`🚀 SUCCESS: ${backend} can generate and verify proofs!`);
          
        } catch (proofError) {
          console.log(`⚠️ Proof generation failed: ${proofError.message}`);
          console.log(`   This might indicate constraint generation issues`);
        }
        
      } catch (compileError) {
        console.log(`💥 Compilation failed: ${compileError.message}`);
        console.log(`   Stack: ${compileError.stack}`);
      }
      
    } catch (error) {
      console.log(`💥 Backend switching failed: ${error.message}`);
    }
  }

  // Test 2: More complex program
  console.log(`\n🔗 Testing Complex ZkProgram`);
  console.log('-'.repeat(40));
  
  const ComplexProgram = ZkProgram({
    name: 'ComplexProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      complexOperation: {
        privateInputs: [Field, Field],
        method(publicInput, a, b) {
          // Multiple operations that should generate many constraints
          let result = publicInput;
          
          // Several multiplications
          for (let i = 0; i < 3; i++) {
            result = result.mul(a.add(Field(i)));
          }
          
          // Add some conditional logic
          const condition = result.greaterThan(Field(100));
          result = Provable.if(condition, result.mul(b), result.add(b));
          
          return result;
        },
      },
    },
  });

  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔧 Testing complex program with ${backend.toUpperCase()}`);
    
    try {
      await switchBackend(backend);
      
      console.log('🔨 Compiling complex ZkProgram...');
      const startTime = Date.now();
      
      await ComplexProgram.compile();
      const compileTime = Date.now() - startTime;
      console.log(`✅ Complex compilation successful in ${compileTime}ms`);
      
      // Try proof generation
      console.log('🔍 Attempting complex proof generation...');
      const proof = await ComplexProgram.complexOperation(Field(2), Field(3), Field(7));
      console.log(`🎉 Complex proof generated successfully`);
      console.log(`   Result: ${proof.publicOutput}`);
      
    } catch (error) {
      console.log(`💥 Complex program failed: ${error.message}`);
    }
  }

  console.log('\n🎯 ZKPROGRAM TEST CONCLUSIONS');
  console.log('='.repeat(50));
  console.log('If ZkPrograms compile and generate proofs successfully,');
  console.log('then constraint generation IS working, but Provable.constraintSystem()');
  console.log('API is broken or not the right interface for measuring constraints.');
  console.log('');
  console.log('If ZkPrograms also fail, then there\'s a deeper system issue.');
}

async function main() {
  try {
    await testZkProgramConstraints();
  } catch (error) {
    console.error('💥 ZkProgram test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}