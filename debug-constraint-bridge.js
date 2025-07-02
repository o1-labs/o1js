import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Constraint Bridge Test ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Check if constraint bridge is available
if (globalThis.sparkyConstraintBridge) {
  console.log('Constraint bridge available:', Object.keys(globalThis.sparkyConstraintBridge));
  
  // Test bridge functions
  console.log('\n1. Testing isActiveSparkyBackend:');
  console.log('   Result:', globalThis.sparkyConstraintBridge.isActiveSparkyBackend());
  
  console.log('\n2. Testing startConstraintAccumulation:');
  globalThis.sparkyConstraintBridge.startConstraintAccumulation();
  
  // Create a simple circuit
  console.log('\n3. Creating simple circuit...');
  Provable.runAndCheck(() => {
    let x = Provable.witness(Field, () => Field(3));
    let y = Provable.witness(Field, () => Field(4));
    let z = x.mul(y);
    z.assertEquals(Field(12));
    console.log('   Circuit executed: 3 * 4 = 12');
  });
  
  console.log('\n4. Testing getAccumulatedConstraints:');
  const constraints = globalThis.sparkyConstraintBridge.getAccumulatedConstraints();
  console.log('   Constraints retrieved:', constraints.length);
  if (constraints.length > 0) {
    console.log('   First constraint:', JSON.stringify(constraints[0], null, 2));
  }
  
  console.log('\n5. Testing endConstraintAccumulation:');
  globalThis.sparkyConstraintBridge.endConstraintAccumulation();
  
} else {
  console.log('ERROR: Constraint bridge not available!');
}

console.log('\n=== Test Complete ===\n');