import { Field, switchBackend } from './dist/node/index.js';

async function debugConstraintBridge() {
  console.log('Debugging constraint bridge\n');
  
  await switchBackend('sparky');
  
  // Check what's available globally
  console.log('Global sparky objects:');
  console.log('- sparkyConstraintBridge:', typeof globalThis.sparkyConstraintBridge);
  console.log('- sparkyInstance:', typeof globalThis.sparkyInstance);
  console.log('- __snarky:', typeof globalThis.__snarky);
  
  if (globalThis.sparkyConstraintBridge) {
    console.log('\nConstraint bridge methods:');
    console.log(Object.keys(globalThis.sparkyConstraintBridge));
  }
  
  if (globalThis.__snarky?.Snarky) {
    console.log('\nSnarky backend methods:');
    console.log('- run:', Object.keys(globalThis.__snarky.Snarky.run));
    console.log('- field:', Object.keys(globalThis.__snarky.Snarky.field).slice(0, 10), '...');
    console.log('- constraintSystem:', Object.keys(globalThis.__snarky.Snarky.constraintSystem));
  }
  
  // Test constraint accumulation through backend
  const backend = globalThis.__snarky?.Snarky;
  if (backend) {
    console.log('\n=== Testing constraint accumulation ===');
    
    // Enter constraint mode
    const handle = backend.run.enterConstraintSystem();
    
    // Get initial system
    const cs1 = backend.run.getConstraintSystem();
    console.log('Initial rows:', backend.constraintSystem.rows(cs1));
    
    // Create some variables and constraints
    const v1 = backend.field.exists(null);
    const v2 = backend.field.exists(null);
    
    console.log('After creating variables:');
    const cs2 = backend.run.getConstraintSystem();
    console.log('- Same CS object rows:', backend.constraintSystem.rows(cs1));
    console.log('- Fresh CS object rows:', backend.constraintSystem.rows(cs2));
    
    // Add a constraint
    backend.field.assertEqual(v1, v2);
    
    console.log('After assertEqual:');
    const cs3 = backend.run.getConstraintSystem();
    console.log('- Original CS object rows:', backend.constraintSystem.rows(cs1));
    console.log('- Fresh CS object rows:', backend.constraintSystem.rows(cs3));
    
    // Exit and get final
    const finalCs = handle();
    console.log('\nFinal constraint system:');
    console.log('- Rows:', backend.constraintSystem.rows(finalCs));
    
    // Check the JSON representation
    const json = backend.constraintSystem.toJson(finalCs);
    console.log('- Public inputs:', json?.public_input_size);
    console.log('- Gates:', json?.gates?.length);
  }
}

debugConstraintBridge().catch(console.error);