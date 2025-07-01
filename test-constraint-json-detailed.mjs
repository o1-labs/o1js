#!/usr/bin/env node

/**
 * Detailed JSON export test to see the actual constraint structure
 */

import { Field, Provable } from './dist/node/index.js';
import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';
import fs from 'fs/promises';

async function testDetailedJSON() {
  console.log('🔍 Detailed Constraint JSON Export\n');
  
  // Simple circuit for testing
  const circuit = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(5));
    const sum = x.add(y);
    sum.assertEquals(Field(8));
  };
  
  // Test Snarky
  console.log('📘 Snarky:');
  await initializeBindings('snarky');
  
  let snarkyJSON;
  try {
    const cs = Snarky.run.enterConstraintSystem();
    await Provable.runUnchecked(circuit);
    const constraintSystem = cs();
    
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    const digest = Snarky.constraintSystem.digest(constraintSystem);
    snarkyJSON = Snarky.constraintSystem.toJson(constraintSystem);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  JSON type: ${typeof snarkyJSON}`);
    console.log(`  Is string: ${typeof snarkyJSON === 'string'}`);
    console.log(`  Has gates property: ${'gates' in snarkyJSON}`);
    
    if (typeof snarkyJSON === 'string') {
      console.log('  Parsing JSON string...');
      snarkyJSON = JSON.parse(snarkyJSON);
    }
    
    console.log(`  Gates count: ${snarkyJSON.gates?.length || 0}`);
    console.log(`  Full JSON:`, JSON.stringify(snarkyJSON, null, 2));
    
  } catch (e) {
    console.error('  Error:', e.message);
  }
  
  // Test Sparky
  console.log('\n📙 Sparky:');
  await switchBackend('sparky');
  
  let sparkyJSON;
  try {
    const cs = Snarky.run.enterConstraintSystem();
    await Provable.runUnchecked(circuit);
    const constraintSystem = cs();
    
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    const digest = Snarky.constraintSystem.digest(constraintSystem);
    sparkyJSON = Snarky.constraintSystem.toJson(constraintSystem);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  JSON type: ${typeof sparkyJSON}`);
    console.log(`  Is string: ${typeof sparkyJSON === 'string'}`);
    console.log(`  Has gates property: ${'gates' in sparkyJSON}`);
    
    if (typeof sparkyJSON === 'string') {
      console.log('  Parsing JSON string...');
      sparkyJSON = JSON.parse(sparkyJSON);
    }
    
    console.log(`  Gates count: ${sparkyJSON.gates?.length || 0}`);
    
    if (sparkyJSON.gates && sparkyJSON.gates.length > 0) {
      console.log(`  First gate:`, JSON.stringify(sparkyJSON.gates[0], null, 2));
    }
    
    console.log(`  Full JSON:`, JSON.stringify(sparkyJSON, null, 2));
    
  } catch (e) {
    console.error('  Error:', e.message);
  }
  
  // Save for comparison
  const outputDir = './json-export-test';
  await fs.mkdir(outputDir, { recursive: true });
  
  if (snarkyJSON) {
    await fs.writeFile(
      `${outputDir}/snarky-constraints.json`,
      JSON.stringify(snarkyJSON, null, 2)
    );
  }
  
  if (sparkyJSON) {
    await fs.writeFile(
      `${outputDir}/sparky-constraints.json`,
      JSON.stringify(sparkyJSON, null, 2)
    );
  }
  
  console.log(`\n📁 Results saved to: ${outputDir}/`);
}

testDetailedJSON().catch(console.error);