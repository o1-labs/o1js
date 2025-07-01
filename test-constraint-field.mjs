#!/usr/bin/env node

/**
 * Constraint Export Test using Field module
 * 
 * This test exports constraints using the high-level Field API
 */

import { Field, Provable } from './dist/node/index.js';
import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';
import fs from 'fs/promises';

async function testBackend(backendName) {
  console.log(`\n🔍 Testing ${backendName}:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Enter constraint system mode
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Run a simple circuit using Field
    await Provable.runUnchecked(() => {
      // Create witness fields
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(5));
      
      // Simple operations
      const sum = x.add(y);
      const product = x.mul(y);
      
      // Add constraints
      sum.assertEquals(Field(8));
      product.assertEquals(Field(15));
      
      // More complex: (x + 2) * (y - 1) = 20
      const xPlus2 = x.add(2);
      const yMinus1 = y.sub(1);
      const result = xPlus2.mul(yMinus1);
      result.assertEquals(Field(20));
    });
    
    // Get constraint system
    let cs;
    if (backendName === 'sparky') {
      cs = Snarky.run.getConstraintSystem();
      finishCS(); // Exit mode
    } else {
      cs = finishCS();
    }
    
    // Extract info
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`  ✅ Success!`);
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  Number of gates: ${json.gates?.length || 0}`);
    
    // Gate type summary
    const gateTypes = {};
    (json.gates || []).forEach(gate => {
      const type = gate.type || gate.kind || 'unknown';
      gateTypes[type] = (gateTypes[type] || 0) + 1;
    });
    console.log(`  Gate types:`, gateTypes);
    
    // Save detailed output
    const outputDir = './constraint-exports-field';
    await fs.mkdir(outputDir, { recursive: true });
    
    await fs.writeFile(
      `${outputDir}/${backendName}-constraints.json`,
      JSON.stringify({
        backend: backendName,
        rows,
        digest,
        gateCount: json.gates?.length || 0,
        gateTypes,
        constraints: json
      }, null, 2)
    );
    
    return { rows, digest, gateCount: json.gates?.length || 0, gateTypes };
    
  } catch (e) {
    console.error(`  ❌ Error:`, e.message);
    console.error(`  Stack:`, e.stack);
    return null;
  }
}

async function testLinearCombination() {
  console.log('\n📊 Testing Linear Combination Optimization:');
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n  ${backend}:`);
    
    if (backend === 'sparky') {
      await switchBackend('sparky');
    } else {
      await initializeBindings('snarky');
    }
    
    try {
      const finishCS = Snarky.run.enterConstraintSystem();
      
      await Provable.runUnchecked(() => {
        const x = Provable.witness(Field, () => Field(7));
        
        // This should optimize to 5*x in Snarky
        const threeX = x.mul(3);
        const twoX = x.mul(2);
        const sum = threeX.add(twoX);
        
        // Compare with direct 5*x
        const fiveX = x.mul(5);
        sum.assertEquals(fiveX);
      });
      
      let cs;
      if (backend === 'sparky') {
        cs = Snarky.run.getConstraintSystem();
        finishCS();
      } else {
        cs = finishCS();
      }
      
      const rows = Snarky.constraintSystem.rows(cs);
      const json = Snarky.constraintSystem.toJson(cs);
      
      console.log(`    Gates: ${json.gates?.length || 0}`);
      console.log(`    Rows: ${rows}`);
      
      // Show gate details
      (json.gates || []).forEach((gate, i) => {
        console.log(`    Gate ${i}: ${gate.type || gate.kind || 'unknown'}`);
      });
      
    } catch (e) {
      console.error(`    Error:`, e.message);
    }
  }
}

async function main() {
  console.log('🚀 Constraint Export Test (using Field module)');
  console.log('===========================================');
  
  // Test both backends
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  // Compare results
  console.log('\n📈 Comparison:');
  if (snarkyResult && sparkyResult) {
    console.log(`  Row difference: ${sparkyResult.rows - snarkyResult.rows}`);
    console.log(`  Gate count difference: ${sparkyResult.gateCount - snarkyResult.gateCount}`);
    console.log(`  Digest match: ${snarkyResult.digest === sparkyResult.digest ? '✅ YES' : '❌ NO'}`);
  }
  
  // Test specific optimization
  await testLinearCombination();
  
  console.log('\n✨ Test complete!');
  console.log('📁 Results saved to: ./constraint-exports-field/');
}

main().catch(console.error);