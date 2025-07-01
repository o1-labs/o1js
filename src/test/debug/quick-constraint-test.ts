#!/usr/bin/env node

/**
 * Quick test to demonstrate constraint extraction and comparison
 */

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

async function quickTest() {
  console.log('🔍 Quick Constraint Comparison Test\n');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  try {
    // Test with Snarky
    console.log('📊 Testing with Snarky backend...');
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Snarky Results:');
    console.log(`  Rows: ${snarkyCS.rows}`);
    console.log(`  Digest: ${snarkyCS.digest}`);
    console.log(`  Public Input Size: ${snarkyCS.publicInputSize}`);
    console.log(`  Gates: ${snarkyCS.gates?.length || 'N/A'}`);
    
    if (snarkyCS.gates && snarkyCS.gates.length > 0) {
      console.log('  First gate:', JSON.stringify(snarkyCS.gates[0], null, 2));
    }
    
    // Test with Sparky
    console.log('\n📊 Testing with Sparky backend...');
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Sparky Results:');
    console.log(`  Rows: ${sparkyCS.rows}`);
    console.log(`  Digest: ${sparkyCS.digest}`);
    console.log(`  Public Input Size: ${sparkyCS.publicInputSize}`);
    console.log(`  Gates: ${sparkyCS.gates?.length || 'N/A'}`);
    
    if (sparkyCS.gates && sparkyCS.gates.length > 0) {
      console.log('  First gate:', JSON.stringify(sparkyCS.gates[0], null, 2));
    }
    
    // Compare
    console.log('\n🔍 Comparison:');
    console.log(`  Rows match: ${snarkyCS.rows === sparkyCS.rows ? '✅' : '❌'} (${snarkyCS.rows} vs ${sparkyCS.rows})`);
    console.log(`  Digest match: ${snarkyCS.digest === sparkyCS.digest ? '✅' : '❌'}`);
    console.log(`  Public input match: ${snarkyCS.publicInputSize === sparkyCS.publicInputSize ? '✅' : '❌'}`);
    
    if (snarkyCS.digest !== sparkyCS.digest) {
      console.log(`    Snarky digest:  ${snarkyCS.digest}`);
      console.log(`    Sparky digest:  ${sparkyCS.digest}`);
    }
    
    // Pretty print both constraint systems
    console.log('\n📋 Snarky Constraint System:');
    snarkyCS.print();
    
    console.log('\n📋 Sparky Constraint System:');
    sparkyCS.print();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

quickTest().catch(console.error);