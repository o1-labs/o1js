#!/usr/bin/env node
/**
 * Debug constraint generation at a lower level
 */

import { Field, Provable, switchBackend, getCurrentBackend, Circuit } from '../../../dist/node/index.js';

async function debugConstraintGeneration() {
  console.log('\n🔍 LOW-LEVEL CONSTRAINT GENERATION DEBUG\n');

  // Test 1: Use Circuit.constraintSystemFromKeypair to avoid serialization issues
  console.log('📊 Test 1: Using Circuit.constraintSystemFromKeypair');
  
  async function testWithKeypair(backend, name, main) {
    try {
      await switchBackend(backend);
      console.log(`\n${backend.toUpperCase()}:`);
      
      // Generate keypair first
      const keypair = await Circuit.generateKeypair(main);
      console.log('  Keypair generated successfully');
      
      // Get constraint system from keypair
      const cs = Circuit.constraintSystemFromKeypair(keypair);
      console.log(`  Constraint system type: ${typeof cs}`);
      console.log(`  Has digest property: ${cs && 'digest' in cs}`);
      console.log(`  Has toJson method: ${cs && typeof cs.toJson === 'function'}`);
      
      // Try to get gate count
      if (cs && cs.toJson) {
        try {
          const json = cs.toJson();
          const gates = json.gates || [];
          console.log(`  Gates count: ${gates.length}`);
        } catch (e) {
          console.log(`  Error getting gates: ${e.message}`);
        }
      }
      
      return true;
    } catch (error) {
      console.log(`${backend.toUpperCase()} - Error: ${error.message}`);
      return false;
    }
  }

  // Simple test circuit
  const testCircuit = () => {
    const x = Provable.witness(Field, () => Field(5));
    x.assertEquals(Field(5));
  };

  await testWithKeypair('snarky', 'assertEquals test', testCircuit);
  await testWithKeypair('sparky', 'assertEquals test', testCircuit);

  // Test 2: Try direct constraint system generation with error details
  console.log('\n\n📊 Test 2: Direct constraint system with detailed errors');
  
  async function testConstraintSystemDetailed(backend, circuit) {
    try {
      await switchBackend(backend);
      console.log(`\n${backend.toUpperCase()}:`);
      
      const cs = await Provable.constraintSystem(circuit);
      console.log('  Constraint system generated');
      console.log(`  Type: ${cs.constructor.name}`);
      console.log('  Properties:', Object.keys(cs));
      
      // Try different ways to access gates
      if (cs.gates !== undefined) {
        console.log(`  gates property: ${cs.gates.length} items`);
      }
      
      if (cs.toJson) {
        try {
          const json = cs.toJson();
          console.log('  toJson() succeeded');
          console.log(`  JSON type: ${typeof json}`);
          if (json && json.gates) {
            console.log(`  JSON gates: ${json.gates.length}`);
          }
        } catch (e) {
          console.log(`  toJson() error: ${e.message}`);
          console.log(`  Error stack: ${e.stack.split('\n')[0]}`);
        }
      }
      
      if (cs.digest) {
        console.log(`  Has digest: ${cs.digest.substring(0, 10)}...`);
      }
      
    } catch (error) {
      console.log(`${backend.toUpperCase()} - Top level error: ${error.message}`);
      if (error.stack) {
        console.log(`  Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n  ')}`);
      }
    }
  }

  await testConstraintSystemDetailed('snarky', testCircuit);
  await testConstraintSystemDetailed('sparky', testCircuit);

  // Test 3: Check if the issue is specific to witness + assertEquals
  console.log('\n\n📊 Test 3: Different constraint patterns');
  
  const patterns = [
    {
      name: 'Just witness (no constraint)',
      circuit: () => {
        Provable.witness(Field, () => Field(5));
      }
    },
    {
      name: 'Constant assertEquals',
      circuit: () => {
        Field(5).assertEquals(Field(5));
      }
    },
    {
      name: 'Witness + constant assert',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        x.assertEquals(Field(5));
      }
    },
    {
      name: 'Two witnesses assertEquals',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(5));
        x.assertEquals(y);
      }
    }
  ];

  for (const pattern of patterns) {
    console.log(`\n📌 ${pattern.name}`);
    
    // Just try to count constraints, catch any errors
    for (const backend of ['snarky', 'sparky']) {
      try {
        await switchBackend(backend);
        const cs = await Provable.constraintSystem(pattern.circuit);
        const count = cs.gates ? cs.gates.length : '?';
        console.log(`  ${backend}: ${count} constraints`);
      } catch (e) {
        console.log(`  ${backend}: ERROR - ${e.message.split('\n')[0]}`);
      }
    }
  }

  await switchBackend('snarky');
  console.log('\n✅ Debug complete\n');
}

debugConstraintGeneration().catch(console.error);