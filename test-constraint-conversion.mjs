#!/usr/bin/env node

import { switchBackend } from './dist/node/index.js';
import { SPARKY_TEST_MODULE } from './dist/node/bindings/sparky-adapter.js';

async function runTest() {
  console.log('Testing constraint conversion issue...\n');
  
  await switchBackend('sparky');
  
  // Create a simple constraint system with Equal(5*x + 5*y, 25)
  const cs = SPARKY_TEST_MODULE.api.createConstraintSystem();
  
  // Create variables
  const x = SPARKY_TEST_MODULE.api.addNewVariable(cs);
  const y = SPARKY_TEST_MODULE.api.addNewVariable(cs);
  
  // Create 5*x
  const five_x = {
    type: 'Scale',
    scalar: { limbs: [5n] },
    term: { type: 'Var', value: x }
  };
  
  // Create 5*y
  const five_y = {
    type: 'Scale',
    scalar: { limbs: [5n] },
    term: { type: 'Var', value: y }
  };
  
  // Create 5*x + 5*y
  const sum = {
    type: 'Add',
    left: five_x,
    right: five_y
  };
  
  // Create constant 25
  const twentyfive = {
    type: 'Constant',
    value: { limbs: [25n] }
  };
  
  // Add constraint: 5*x + 5*y = 25
  console.log('Initial constraint count:', SPARKY_TEST_MODULE.api.getConstraintCount(cs));
  console.log('\nAdding Equal constraint: 5*x + 5*y = 25');
  
  SPARKY_TEST_MODULE.api.addConstraint(cs, {
    type: 'Equal',
    left: sum,
    right: twentyfive
  });
  
  console.log('After adding constraint:', SPARKY_TEST_MODULE.api.getConstraintCount(cs));
  
  // Now convert to Kimchi format
  console.log('\nConverting to Kimchi format...');
  const kimchiJson = SPARKY_TEST_MODULE.api.toKimchiJSON(cs);
  
  console.log('After conversion:', SPARKY_TEST_MODULE.api.getConstraintCount(cs));
  
  // Parse and display the result
  const kimchi = JSON.parse(kimchiJson);
  console.log('\nKimchi gates:', kimchi.gates.length);
  console.log('Gates:', JSON.stringify(kimchi.gates, null, 2));
}

runTest().catch(console.error);