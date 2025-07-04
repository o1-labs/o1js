#!/usr/bin/env node

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

async function traceAssertEquals() {
  console.log('\n🔍 TRACING ASSERTEQUALS COMPILATION\n');
  
  await switchBackend('sparky');
  
  // Test: Addition + assertEquals
  console.log('=== ADDITION + ASSERTEQUALS ===');
  
  const cs = await Provable.constraintSystem(() => {
    console.log('Creating x = witness(5)');
    const x = Provable.witness(Field, () => Field(5));
    console.log('  x =', x);
    
    console.log('Creating y = witness(7)');
    const y = Provable.witness(Field, () => Field(7));
    console.log('  y =', y);
    
    console.log('Computing z = x.add(y)');
    const z = x.add(y);
    console.log('  z =', z);
    
    console.log('Creating expected = Field(12)');
    const expected = Field(12);
    console.log('  expected =', expected);
    
    console.log('Calling z.assertEquals(expected)');
    z.assertEquals(expected);
    console.log('  assertEquals completed');
  });
  
  console.log(`\nFinal constraint count: ${cs.gates.length}`);
  
  // Also test a simple constraint for comparison
  console.log('\n=== SIMPLE ASSERTEQUALS (NO ADDITION) ===');
  const cs2 = await Provable.constraintSystem(() => {
    console.log('Creating x = witness(12)');
    const x = Provable.witness(Field, () => Field(12));
    console.log('  x =', x);
    
    console.log('Creating expected = Field(12)');
    const expected = Field(12);
    console.log('  expected =', expected);
    
    console.log('Calling x.assertEquals(expected)');
    x.assertEquals(expected);
    console.log('  assertEquals completed');
  });
  
  console.log(`\nSimple constraint count: ${cs2.gates.length}`);
  
  // And test a constant assertEquals
  console.log('\n=== CONSTANT ASSERTEQUALS ===');
  const cs3 = await Provable.constraintSystem(() => {
    console.log('Creating constant1 = Field(12)');
    const constant1 = Field(12);
    console.log('  constant1 =', constant1);
    
    console.log('Creating constant2 = Field(12)');
    const constant2 = Field(12);
    console.log('  constant2 =', constant2);
    
    console.log('Calling constant1.assertEquals(constant2)');
    constant1.assertEquals(constant2);
    console.log('  assertEquals completed');
  });
  
  console.log(`\nConstant constraint count: ${cs3.gates.length}`);
}

traceAssertEquals().catch(console.error);