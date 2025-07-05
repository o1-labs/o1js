#!/usr/bin/env node

/**
 * Simple constraint system JSON comparison test
 * 
 * A minimal script for testing constraint system JSON comparison between
 * Snarky and Sparky backends for specific operations.
 * 
 * Created: January 5, 2025, 00:25 UTC
 */

import { Field, Bool, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function compareConstraintJSON(operationName, operation, inputs) {
  console.log(`\n🔬 Comparing constraint systems for: ${operationName}`);
  console.log('═'.repeat(60));
  
  const results = {};
  
  // Helper to get constraint system JSON
  async function getConstraintJSON(backend) {
    await switchBackend(backend);
    console.log(`\n📍 Current backend: ${getCurrentBackend()}`);
    
    try {
      const cs = await Provable.constraintSystem(() => {
        // Create witness variables
        const witnessInputs = inputs.map((input) => {
          if (input instanceof Field) {
            return Provable.witness(Field, () => input);
          } else if (input instanceof Bool) {
            return Provable.witness(Bool, () => input);
          } else {
            return input;
          }
        });
        
        // Run operation
        const result = operation(...witnessInputs);
        
        // Ensure result is constrained
        if (result instanceof Field) {
          result.assertEquals(result);
        } else if (result instanceof Bool) {
          result.assertEquals(result);
        }
        
        return result;
      });
      
      // The constraint system already contains the gates in JSON format
      console.log(`✅ Generated constraint system with ${cs.gates.length} gates`);
      
      // Print gate type distribution
      const gateTypes = {};
      cs.gates.forEach(gate => {
        gateTypes[gate.type] = (gateTypes[gate.type] || 0) + 1;
      });
      
      console.log('📊 Gate types:');
      Object.entries(gateTypes).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count}`);
      });
      
      // Return the constraint system in the expected format
      return {
        gates: cs.gates,
        public_input_size: cs.publicInputSize
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate constraint system: ${error.message}`);
      return null;
    }
  }
  
  // Get constraint systems from both backends
  results.snarky = await getConstraintJSON('snarky');
  results.sparky = await getConstraintJSON('sparky');
  
  // Compare results
  console.log('\n📋 COMPARISON RESULTS');
  console.log('═'.repeat(60));
  
  if (!results.snarky || !results.sparky) {
    console.log('❌ Failed to generate constraint systems for comparison');
    return;
  }
  
  // Basic comparison
  const snarkyGates = results.snarky.gates.length;
  const sparkyGates = results.sparky.gates.length;
  
  console.log(`\nGate count:`);
  console.log(`  • Snarky: ${snarkyGates}`);
  console.log(`  • Sparky: ${sparkyGates}`);
  console.log(`  • Difference: ${sparkyGates - snarkyGates} (${sparkyGates < snarkyGates ? '✅ optimization' : sparkyGates > snarkyGates ? '⚠️ regression' : '🟰 same'})`);
  
  console.log(`\nPublic input size:`);
  console.log(`  • Snarky: ${results.snarky.public_input_size}`);
  console.log(`  • Sparky: ${results.sparky.public_input_size}`);
  
  // Deep comparison
  const jsonEqual = JSON.stringify(results.snarky) === JSON.stringify(results.sparky);
  console.log(`\n${jsonEqual ? '✅' : '❌'} JSON structures are ${jsonEqual ? 'IDENTICAL' : 'DIFFERENT'}`);
  
  if (!jsonEqual) {
    // Find first difference
    console.log('\n🔍 Finding differences...');
    
    // Compare gate by gate
    const maxGates = Math.max(snarkyGates, sparkyGates);
    let differencesFound = 0;
    const maxDifferencesToShow = 3;
    
    for (let i = 0; i < maxGates && differencesFound < maxDifferencesToShow; i++) {
      const snarkyGate = results.snarky.gates[i];
      const sparkyGate = results.sparky.gates[i];
      
      if (!snarkyGate || !sparkyGate) {
        console.log(`\n  Gate ${i}: One backend has no gate at this index`);
        differencesFound++;
        continue;
      }
      
      const snarkyType = snarkyGate.type || snarkyGate.typ;
      const sparkyType = sparkyGate.type || sparkyGate.typ;
      
      if (snarkyType !== sparkyType) {
        console.log(`\n  Gate ${i} type mismatch:`);
        console.log(`    • Snarky: ${snarkyType}`);
        console.log(`    • Sparky: ${sparkyType}`);
        differencesFound++;
        continue;
      }
      
      if (JSON.stringify(snarkyGate.wires) !== JSON.stringify(sparkyGate.wires)) {
        console.log(`\n  Gate ${i} wires mismatch:`);
        console.log(`    • Snarky: ${JSON.stringify(snarkyGate.wires)}`);
        console.log(`    • Sparky: ${JSON.stringify(sparkyGate.wires)}`);
        differencesFound++;
        continue;
      }
      
      if (JSON.stringify(snarkyGate.coeffs) !== JSON.stringify(sparkyGate.coeffs)) {
        console.log(`\n  Gate ${i} coefficients mismatch:`);
        console.log(`    • Snarky: ${JSON.stringify(snarkyGate.coeffs)}`);
        console.log(`    • Sparky: ${JSON.stringify(sparkyGate.coeffs)}`);
        differencesFound++;
        continue;
      }
    }
    
    if (differencesFound === 0 && snarkyGates === sparkyGates) {
      console.log('  Structures appear identical, difference may be in formatting');
    } else if (differencesFound < maxDifferencesToShow && snarkyGates !== sparkyGates) {
      console.log(`\n  ... and more differences (gate count mismatch)`);
    }
  }
  
  // Save detailed JSON for inspection
  console.log('\n💾 Saving constraint system JSONs...');
  const fs = await import('fs');
  
  fs.writeFileSync('constraint-snarky.json', JSON.stringify(results.snarky, null, 2));
  fs.writeFileSync('constraint-sparky.json', JSON.stringify(results.sparky, null, 2));
  
  console.log('  • constraint-snarky.json');
  console.log('  • constraint-sparky.json');
  
  console.log('\n✨ Comparison complete!\n');
}

// Example usage - test specific operations
async function runTests() {
  console.log('🧪 Constraint System JSON Comparison Tool');
  console.log('========================================');
  
  // Test 1: Simple addition
  await compareConstraintJSON(
    'Field Addition',
    (a, b) => a.add(b),
    [Field(10), Field(20)]
  );
  
  // Test 2: Boolean operations
  await compareConstraintJSON(
    'Boolean AND',
    (a, b) => a.and(b),
    [Bool(true), Bool(false)]
  );
  
  // Test 3: Conditional
  await compareConstraintJSON(
    'Provable.if',
    (cond, a, b) => Provable.if(cond, a, b),
    [Bool(true), Field(42), Field(17)]
  );
  
  // Test 4: Complex expression
  await compareConstraintJSON(
    'Complex Arithmetic',
    (a, b, c) => {
      // (a + b) * c - a
      const sum = a.add(b);
      const product = sum.mul(c);
      return product.sub(a);
    },
    [Field(2), Field(3), Field(4)]
  );
  
  // Test 5: Comparison operation
  await compareConstraintJSON(
    'Field Less Than',
    (a, b) => a.lessThan(b),
    [Field(10), Field(20)]
  );
}

// Run tests
runTests().catch(console.error);