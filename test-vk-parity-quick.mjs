#!/usr/bin/env node

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Simple test program
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [Field],
      async method(pub, priv) {
        return pub.mul(priv);
      }
    }
  }
});

async function checkVKParity() {
  console.log('=== Testing VK Parity ===\n');
  
  // Compile with Snarky
  await switchBackend('snarky');
  console.log('Compiling with Snarky...');
  const { verificationKey: snarkyVK } = await TestProgram.compile();
  console.log('Snarky VK hash:', snarkyVK.hash.toString());
  
  // Analyze constraints
  const snarkyAnalysis = await TestProgram.analyzeMethods();
  console.log('Snarky constraints:', snarkyAnalysis.test.rows);
  
  // Compile with Sparky
  await switchBackend('sparky');
  console.log('\nCompiling with Sparky...');
  const { verificationKey: sparkyVK } = await TestProgram.compile();
  console.log('Sparky VK hash:', sparkyVK.hash.toString());
  
  // Analyze constraints
  const sparkyAnalysis = await TestProgram.analyzeMethods();
  console.log('Sparky constraints:', sparkyAnalysis.test.rows);
  
  // Compare
  console.log('\n=== Results ===');
  console.log('VK Match:', snarkyVK.hash.toString() === sparkyVK.hash.toString() ? '✅' : '❌');
  console.log('Constraint Count Match:', snarkyAnalysis.test.rows === sparkyAnalysis.test.rows ? '✅' : '❌');
  
  if (snarkyVK.hash.toString() !== sparkyVK.hash.toString()) {
    console.log('\nVKs are DIFFERENT - this confirms the issue persists');
    console.log('Sparky generates', sparkyAnalysis.test.rows, 'constraints vs Snarky', snarkyAnalysis.test.rows);
  } else {
    console.log('\nVKs MATCH! 🎉');
  }
}

checkVKParity().catch(console.error);