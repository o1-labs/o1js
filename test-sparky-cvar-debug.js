#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

// Patch the sparky field module to log Cvar operations
async function testCvarDebug() {
  console.log('🔍 Testing Cvar Creation\n');
  
  await switchBackend('sparky');
  
  // Get access to internal modules through a hack
  // Import the sparky adapter to get access to the modules
  const { getFieldModule } = await import('./src/bindings/sparky-adapter.js');
  
  // Get the field module
  let fieldModule;
  try {
    fieldModule = getFieldModule();
  } catch (e) {
    console.error('Could not get field module:', e);
    return;
  }
  
  // Patch the add function to log
  const originalAdd = fieldModule.add;
  fieldModule.add = function(x, y) {
    console.log('🔍 Field.add called:');
    console.log('  x:', JSON.stringify(x));
    console.log('  y:', JSON.stringify(y));
    const result = originalAdd.call(this, x, y);
    console.log('  result:', JSON.stringify(result));
    return result;
  };
  
  // Patch assertEqual to log
  const originalAssertEqual = fieldModule.assertEqual;
  fieldModule.assertEqual = function(x, y) {
    console.log('🔍 Field.assertEqual called:');
    console.log('  x:', JSON.stringify(x));
    console.log('  y:', JSON.stringify(y));
    return originalAssertEqual.call(this, x, y);
  };
  
  console.log('Running circuit...\n');
  
  const circuit = () => {
    console.log('Creating witness a...');
    const a = Provable.witness(Field, () => Field(5));
    console.log('a.value:', a.value);
    
    console.log('\nCreating witness b...');
    const b = Provable.witness(Field, () => Field(7));
    console.log('b.value:', b.value);
    
    console.log('\nCreating witness c...');
    const c = Provable.witness(Field, () => Field(12));
    console.log('c.value:', c.value);
    
    console.log('\nCalling a.add(b)...');
    const sum = a.add(b);
    console.log('sum.value:', sum.value);
    
    console.log('\nCalling sum.assertEquals(c)...');
    sum.assertEquals(c);
  };
  
  const cs = await Provable.constraintSystem(circuit);
  console.log('\n📊 Result:');
  console.log('Gates:', cs.gates.length);
  console.log('First gate coeffs:', cs.gates[0].coeffs);
}

testCvarDebug().catch(console.error);