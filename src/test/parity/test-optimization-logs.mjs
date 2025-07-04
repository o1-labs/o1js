#!/usr/bin/env node

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

async function testOptimizationLogs() {
  console.log('\n🔧 Testing optimization logs\n');

  await switchBackend('sparky');
  
  // Test a circuit that should trigger optimizations
  const cs = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const z = x.add(y);
    z.assertEquals(Field(12));
  });
  
  console.log(`Final constraint count: ${cs.gates.length}`);
}

testOptimizationLogs().catch(console.error);