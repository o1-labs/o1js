/**
 * Verify that reduce_lincom optimization is working correctly
 * This script tests that both backends generate the same optimized constraint counts
 */

import { Field, Provable, switchBackend, getCurrentBackend, initializeBindings } from '../dist/node/index.js';

async function main() {
  await initializeBindings();
  
  console.log('🔍 Verifying reduce_lincom optimization...\n');

  // Test cases that benefit from linear combination optimization
  const testCases = [
    {
      name: 'Simple addition chain',
      circuit: () => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(2));
        const c = Provable.witness(Field, () => Field(3));
        a.add(b).add(c).assertEquals(Field(6));
      }
    },
    {
      name: 'Linear combination (x + 2*x + 3*x)',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        // Expression: x + 2*x + 3*x should be optimized to 6*x
        const expr = x.add(x.mul(2)).add(x.mul(3));
        expr.assertEquals(Field(30)); // 5 * 6 = 30
      }
    },
    {
      name: 'Multiple linear operations',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const result = x.add(Field(1)).add(Field(2)).add(Field(3));
        result.assertEquals(Field(11));
      }
    }
  ];

  for (const test of testCases) {
    console.log(`📝 Testing: ${test.name}`);
    
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(test.circuit);
    
    // Test with Sparky
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(test.circuit);
    
    const match = snarkyCS.gates.length === sparkyCS.gates.length;
    const status = match ? '✅' : '❌';
    
    console.log(`  Snarky: ${snarkyCS.gates.length} constraints`);
    console.log(`  Sparky: ${sparkyCS.gates.length} constraints`);
    console.log(`  Match: ${status}\n`);
    
    if (!match) {
      console.log('  🚨 Optimization not working correctly!');
      console.log(`  Expected both to generate ${snarkyCS.gates.length} constraints\n`);
    }
  }
  
  // Reset to default backend
  await switchBackend('snarky');
  console.log('✅ Verification complete');
}

main().catch(console.error);