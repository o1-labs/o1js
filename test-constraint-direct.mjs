// Direct constraint system comparison
import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function compareConstraints() {
  console.log('=== Direct Constraint System Comparison ===\n');
  
  const testCases = [
    {
      name: 'Simple multiplication',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(3));
        const y = Provable.witness(Field, () => Field(4));
        const z = x.mul(y);
        z.assertEquals(Field(12));
      }
    },
    {
      name: 'Linear combination: x + 2*x + 3*x',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const expr = x.add(x.mul(2)).add(x.mul(3));
        expr.assertEquals(Field(30)); // 5 + 10 + 15 = 30
      }
    },
    {
      name: 'Nested expression: (a + b) * (c + d)',
      circuit: () => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(2));
        const c = Provable.witness(Field, () => Field(3));
        const d = Provable.witness(Field, () => Field(4));
        const sum1 = a.add(b); // 3
        const sum2 = c.add(d); // 7
        const result = sum1.mul(sum2); // 21
        result.assertEquals(Field(21));
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log('='.repeat(50));
    
    // Snarky
    await switchBackend('snarky');
    console.log('\nSnarky backend:');
    const snarkyGates = await captureGates(test.circuit);
    
    // Sparky
    await switchBackend('sparky');
    console.log('\nSparky backend:');
    const sparkyGates = await captureGates(test.circuit);
    
    // Compare
    console.log('\nComparison:');
    if (snarkyGates.count === sparkyGates.count) {
      console.log(`✅ Gate count matches: ${snarkyGates.count}`);
    } else {
      console.log(`❌ Gate count mismatch:`);
      console.log(`   Snarky: ${snarkyGates.count} gates`);
      console.log(`   Sparky: ${sparkyGates.count} gates`);
      console.log(`   Difference: ${sparkyGates.count - snarkyGates.count} extra gates in Sparky`);
      
      // Analyze gate types
      console.log('\nGate type breakdown:');
      console.log('Snarky:', JSON.stringify(snarkyGates.types, null, 2));
      console.log('Sparky:', JSON.stringify(sparkyGates.types, null, 2));
    }
  }
  
  // Switch back
  await switchBackend('snarky');
}

async function captureGates(circuit) {
  try {
    // Enter constraint system mode
    const cs = Snarky.run.enterConstraintSystem();
    
    // Run the circuit
    await Provable.runAndCheck(circuit);
    
    // Get constraint system
    const constraintSystem = cs();
    
    // Analyze gates
    const gateTypes = {};
    let gateCount = 0;
    
    if (constraintSystem && constraintSystem.gates) {
      gateCount = constraintSystem.gates.length;
      
      constraintSystem.gates.forEach(gate => {
        const type = gate.type || 'Unknown';
        gateTypes[type] = (gateTypes[type] || 0) + 1;
      });
    }
    
    console.log(`Gates: ${gateCount}`);
    if (Object.keys(gateTypes).length > 0) {
      console.log('Types:', Object.entries(gateTypes).map(([k,v]) => `${k}:${v}`).join(', '));
    }
    
    return {
      count: gateCount,
      types: gateTypes,
      raw: constraintSystem
    };
    
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return { count: -1, types: {}, raw: null };
  }
}

// Additional test: Check constraint reduction effectiveness
async function testConstraintReduction() {
  console.log('\n\n=== Constraint Reduction Analysis ===\n');
  
  // Test case that should benefit from reduction
  const reductionTest = async () => {
    await Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(7));
      
      // Build expression: x + x + x + x + x (should reduce to 5*x)
      let expr = x;
      for (let i = 1; i < 5; i++) {
        expr = expr.add(x);
      }
      
      // This should be optimized
      expr.assertEquals(Field(35)); // 7 * 5 = 35
    });
  };
  
  console.log('Testing expression: x + x + x + x + x');
  console.log('Expected optimization: 5*x (single Scale constraint)\n');
  
  await switchBackend('snarky');
  console.log('Snarky:');
  const snarkyResult = await captureGates(reductionTest);
  
  await switchBackend('sparky');
  console.log('\nSparky:');
  const sparkyResult = await captureGates(reductionTest);
  
  console.log('\nReduction effectiveness:');
  if (sparkyResult.count <= snarkyResult.count) {
    console.log('✅ Sparky reduction is working effectively');
  } else {
    console.log('⚠️  Sparky may not be applying reduction optimally');
    console.log(`   Generating ${sparkyResult.count - snarkyResult.count} extra gates`);
  }
}

async function main() {
  await compareConstraints();
  await testConstraintReduction();
}

main().catch(console.error);