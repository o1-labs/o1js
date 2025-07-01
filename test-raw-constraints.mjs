#!/usr/bin/env node

/**
 * Raw Constraint Export Test
 * 
 * This test captures the raw constraint system JSON from both backends
 * to see exactly how constraints differ before being passed to Kimchi
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';
import fs from 'fs/promises';

async function captureRawConstraints(backendName, circuitFn) {
  console.log(`\n📊 ${backendName} Raw Constraints:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Enter constraint system mode
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Run the circuit
    circuitFn(Snarky);
    
    // Get constraint system
    let cs;
    if (backendName === 'sparky') {
      cs = Snarky.run.getConstraintSystem();
      finishCS(); // Exit mode
    } else {
      cs = finishCS();
    }
    
    // Get raw JSON
    const json = Snarky.constraintSystem.toJson(cs);
    const digest = Snarky.constraintSystem.digest(cs);
    const rows = Snarky.constraintSystem.rows(cs);
    
    console.log(`  Rows: ${rows}`);
    console.log(`  Digest: ${digest}`);
    console.log(`  Gates: ${json.gates?.length || 0}`);
    
    return { 
      backend: backendName,
      rows, 
      digest, 
      constraintSystem: json,
      rawCS: cs 
    };
    
  } catch (e) {
    console.error(`  ❌ Error:`, e.message);
    return null;
  }
}

// Test cases at the raw Snarky API level
const rawTests = [
  {
    name: 'simple_addition',
    description: 'x + y = 8 using generic gate',
    circuit: (Snarky) => {
      // Create witness variables
      const x = Snarky.run.existsOne(() => 3n);
      const y = Snarky.run.existsOne(() => 5n);
      
      // Add constraint: x + y - 8 = 0
      // Generic gate: sl*l + sr*r + so*o + sm*l*r + sc = 0
      Snarky.gates.generic(
        1, x,     // sl=1, l=x
        1, y,     // sr=1, r=y
        0, x,     // so=0, o=x (dummy)
        0,        // sm=0 (no multiplication)
        -8        // sc=-8
      );
    }
  },
  
  {
    name: 'multiplication',
    description: 'x * y = 15 using generic gate',
    circuit: (Snarky) => {
      const x = Snarky.run.existsOne(() => 3n);
      const y = Snarky.run.existsOne(() => 5n);
      const z = Snarky.run.existsOne(() => 15n);
      
      // x * y - z = 0
      // Using: 0*x + 0*y + (-1)*z + 1*(x*y) + 0 = 0
      Snarky.gates.generic(
        0, x,     // sl=0, l=x
        0, y,     // sr=0, r=y
        -1, z,    // so=-1, o=z
        1,        // sm=1 (x*y coefficient)
        0         // sc=0
      );
    }
  },
  
  {
    name: 'linear_combination',
    description: '3*x + 2*x should optimize to 5*x',
    circuit: (Snarky) => {
      const x = Snarky.run.existsOne(() => 7n);
      
      // First: 3*x
      const threeX = Snarky.run.existsOne(() => 21n);
      Snarky.gates.generic(
        3, x,       // 3*x
        0, x,       // 0*x (dummy)
        -1, threeX, // -1*threeX
        0,          // no multiplication
        0           // no constant
      );
      
      // Second: 2*x  
      const twoX = Snarky.run.existsOne(() => 14n);
      Snarky.gates.generic(
        2, x,      // 2*x
        0, x,      // 0*x (dummy)
        -1, twoX,  // -1*twoX
        0,         // no multiplication
        0          // no constant
      );
      
      // Sum: threeX + twoX
      const sum = Snarky.run.existsOne(() => 35n);
      Snarky.gates.generic(
        1, threeX, // 1*threeX
        1, twoX,   // 1*twoX
        -1, sum,   // -1*sum
        0,         // no multiplication
        0          // no constant
      );
      
      // Compare with 5*x
      const fiveX = Snarky.run.existsOne(() => 35n);
      Snarky.gates.generic(
        5, x,       // 5*x
        0, x,       // 0*x (dummy)
        -1, fiveX,  // -1*fiveX
        0,          // no multiplication
        0           // no constant
      );
      
      // Assert sum = fiveX
      Snarky.gates.generic(
        1, sum,     // 1*sum
        -1, fiveX,  // -1*fiveX
        0, x,       // 0*x (dummy)
        0,          // no multiplication
        0           // no constant
      );
    }
  }
];

async function main() {
  console.log('🔬 Raw Constraint System Export');
  console.log('==============================\n');
  
  const outputDir = './raw-constraints';
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const test of rawTests) {
    console.log(`\n🧪 Test: ${test.name}`);
    console.log(`   ${test.description}`);
    
    // Capture from both backends
    const snarkyResult = await captureRawConstraints('snarky', test.circuit);
    const sparkyResult = await captureRawConstraints('sparky', test.circuit);
    
    // Compare
    if (snarkyResult && sparkyResult) {
      console.log(`\n  📈 Comparison:`);
      console.log(`     Gate difference: ${sparkyResult.constraintSystem.gates.length - snarkyResult.constraintSystem.gates.length}`);
      console.log(`     Digest match: ${snarkyResult.digest === sparkyResult.digest ? '✅' : '❌'}`);
      
      // Save results
      const testDir = `${outputDir}/${test.name}`;
      await fs.mkdir(testDir, { recursive: true });
      
      await fs.writeFile(
        `${testDir}/snarky.json`,
        JSON.stringify(snarkyResult, null, 2)
      );
      
      await fs.writeFile(
        `${testDir}/sparky.json`,
        JSON.stringify(sparkyResult, null, 2)
      );
      
      // Create comparison file
      await fs.writeFile(
        `${testDir}/comparison.json`,
        JSON.stringify({
          test: test.name,
          description: test.description,
          snarky: {
            gates: snarkyResult.constraintSystem.gates.length,
            rows: snarkyResult.rows,
            digest: snarkyResult.digest
          },
          sparky: {
            gates: sparkyResult.constraintSystem.gates.length,
            rows: sparkyResult.rows,
            digest: sparkyResult.digest
          },
          differences: {
            gates: sparkyResult.constraintSystem.gates.length - snarkyResult.constraintSystem.gates.length,
            digestMatch: snarkyResult.digest === sparkyResult.digest
          }
        }, null, 2)
      );
    }
  }
  
  console.log(`\n\n📁 Results saved to: ${outputDir}/`);
  console.log('\n✨ Test complete!');
}

main().catch(console.error);