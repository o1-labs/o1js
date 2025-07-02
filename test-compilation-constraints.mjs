#!/usr/bin/env node

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    multiply: {
      privateInputs: [Field],
      async method(pub, priv) {
        return pub.mul(priv);
      }
    }
  }
});

async function testCompilationConstraints() {
  console.log('=== Testing constraints during compilation ===\n');
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('Backend:', 'sparky');
  
  // Analyze before compilation
  console.log('\n1. Before compilation:');
  const analysisBefore = await TestProgram.analyzeMethods();
  console.log('   Constraints:', analysisBefore.multiply.rows);
  
  // Compile
  console.log('\n2. During compilation:');
  console.log('   Compiling...');
  const { verificationKey } = await TestProgram.compile();
  console.log('   VK hash:', verificationKey.hash.toString());
  
  // Analyze after compilation
  console.log('\n3. After compilation:');
  const analysisAfter = await TestProgram.analyzeMethods();
  console.log('   Constraints:', analysisAfter.multiply.rows);
  
  // Check the logs above for constraint accumulation messages
  console.log('\n=== Check logs above ===');
  console.log('Look for "[OCaml DEBUG] Found X constraints from Sparky"');
  console.log('This shows constraints ARE being recorded during compilation');
  console.log('But they\'re not visible through analyzeMethods');
}

testCompilationConstraints().catch(console.error);