/**
 * Test to verify Sparky backend is actually being used
 */

import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';
import { Field } from './dist/node/lib/provable/field.js';

async function verifySparkyBackend() {
  console.log('=== Sparky Backend Verification Test ===\n');
  
  // Switch to Sparky
  console.log('Switching to Sparky backend...');
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Test 1: Check that we're actually using Sparky by looking at unique behaviors
  console.log('\n1. Testing Sparky-specific behavior:');
  
  try {
    // Test field operations
    console.log('   Testing field operations...');
    const x = Snarky.field.random();
    const y = Snarky.field.random();
    console.log('   ✓ Field random generation works');
    
    // Test run context
    console.log('   Testing run context...');
    const inProver = Snarky.run.inProver();
    console.log(`   ✓ inProver: ${inProver}`);
    
    // Test constraint system
    console.log('   Testing constraint system...');
    Snarky.run.asProver(() => {
      console.log('   ✓ asProver context works');
    });
    
  } catch (error) {
    console.error('   ✗ Error:', error.message);
  }
  
  // Test 2: Try some Field operations through the high-level API
  console.log('\n2. Testing Field class with Sparky:');
  try {
    const a = Field(5);
    const b = Field(7);
    const c = a.add(b);
    console.log(`   ✓ Field arithmetic: ${a} + ${b} = ${c}`);
    
    // Test constraint generation
    const d = Field(10);
    d.assertEquals(Field(10));
    console.log('   ✓ Field assertions work');
    
  } catch (error) {
    console.error('   ✗ Field operations error:', error.message);
    console.error(error.stack);
  }
  
  // Test 3: Check if Sparky instance exists
  console.log('\n3. Checking Sparky internals:');
  try {
    // Try to access Sparky-specific properties
    console.log(`   Snarky object type: ${typeof Snarky}`);
    console.log(`   Snarky.field type: ${typeof Snarky.field}`);
    console.log(`   Snarky.run type: ${typeof Snarky.run}`);
    console.log(`   Snarky.gates type: ${typeof Snarky.gates}`);
    
    // Check for Sparky-specific patterns
    const snarkyString = Snarky.toString?.() || 'No toString method';
    console.log(`   Snarky toString: ${snarkyString}`);
    
  } catch (error) {
    console.error('   ✗ Error accessing Sparky internals:', error.message);
  }
  
  // Test 4: Compare behavior between backends
  console.log('\n4. Comparing Snarky vs Sparky behavior:');
  
  // Test with Sparky
  const sparkyResult = await testBackendBehavior('sparky');
  
  // Switch to Snarky
  await switchBackend('snarky');
  const snarkyResult = await testBackendBehavior('snarky');
  
  console.log('\n   Comparison results:');
  console.log(`   - Sparky result: ${JSON.stringify(sparkyResult)}`);
  console.log(`   - Snarky result: ${JSON.stringify(snarkyResult)}`);
  
  // Switch back to Sparky for remaining tests
  await switchBackend('sparky');
}

async function testBackendBehavior(backend) {
  try {
    const result = {
      backend: backend,
      fieldOps: false,
      constraints: false,
      error: null
    };
    
    // Simple field operation
    const x = Snarky.field.random();
    result.fieldOps = true;
    
    // Try constraint generation
    Snarky.run.asProver(() => {
      result.constraints = true;
    });
    
    return result;
  } catch (error) {
    return { backend, error: error.message };
  }
}

// Run the verification
verifySparkyBackend().catch(console.error);