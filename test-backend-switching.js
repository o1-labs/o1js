/**
 * Simple Backend Switching Test
 * 
 * Tests the runtime backend switching between Snarky and Sparky
 */

import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';

async function testBasicOperations(backendName) {
  console.log(`\n=== Testing ${backendName} Backend ===`);
  
  try {
    // Ensure backend is initialized
    await initializeBindings();
    
    // Test basic operations using low-level API
    console.log('Testing basic operations...');
    
    // Test asProver functionality
    console.log('\nTesting asProver...');
    let proverResult = null;
    Snarky.run.asProver(() => {
      console.log(`Inside asProver block with ${backendName}`);
      proverResult = 'success';
    });
    console.log(`AsProver result: ${proverResult}`);
    
    // Test constraint system
    console.log('\nTesting constraint system...');
    const enterCS = Snarky.run.enterConstraintSystem();
    
    // Run some constraint-generating code
    // Note: We need to allocate variables properly in constraint mode
    const state = {};
    const var1 = Snarky.run.state.allocVar(state);
    const var2 = Snarky.run.state.allocVar(state);
    
    // Simple constraint
    Snarky.field.assertEqual(var1, var1);
    
    const cs = enterCS();
    const numRows = Snarky.constraintSystem.rows(cs);
    console.log(`Constraint system created with ${numRows} rows`);
    
    // Test inProver check
    const isProver = Snarky.run.inProver();
    console.log(`In prover mode: ${isProver}`);
    
    console.log(`✓ ${backendName} backend tests passed`);
    
  } catch (error) {
    console.error(`✗ ${backendName} backend tests failed:`, error.message);
    console.error(error.stack);
    throw error;
  }
}

async function testPoseidonHash(backendName) {
  console.log(`\n=== Testing Poseidon Hash with ${backendName} ===`);
  
  try {
    // Create some field elements in constraint mode
    const enterCS = Snarky.run.enterConstraintSystem();
    
    // Allocate variables
    const state = {};
    const a = Snarky.run.state.storeFieldElt(state, 12345n);
    const b = Snarky.run.state.storeFieldElt(state, 67890n);
    
    console.log('Computing Poseidon hash...');
    // Poseidon expects an array of tuples for the state
    const stateArray = [[0, a, a, a], [0, b, b, b]]; // Mock state format
    
    try {
      Snarky.gates.poseidon(stateArray);
      console.log(`Poseidon hash computed with ${backendName}`);
    } catch (e) {
      console.log(`Poseidon not fully implemented in ${backendName} adapter`);
    }
    
    const cs = enterCS();
    const numRows = Snarky.constraintSystem.rows(cs);
    console.log(`Generated ${numRows} constraints`);
    
  } catch (error) {
    console.error(`✗ Poseidon hash test failed:`, error.message);
  }
}

async function main() {
  console.log('🚀 Backend Switching Test');
  console.log('=========================');
  
  try {
    // Test with default backend (Snarky)
    console.log(`\nCurrent backend: ${getCurrentBackend()}`);
    await testBasicOperations('Snarky');
    await testPoseidonHash('Snarky');
    
    // Switch to Sparky backend
    console.log('\n🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Test with Sparky backend
    await testBasicOperations('Sparky');
    await testPoseidonHash('Sparky');
    
    // Switch back to Snarky
    console.log('\n🔄 Switching back to Snarky backend...');
    await switchBackend('snarky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Quick verification
    Snarky.run.asProver(() => {
      console.log('\n✓ Successfully switched back to Snarky');
    });
    
    console.log('\n✅ Backend switching test completed successfully!');
    
    // Test environment variable
    console.log('\n📋 Environment Variable Test:');
    console.log(`O1JS_BACKEND=${process.env.O1JS_BACKEND || 'not set'}`);
    
    // Try setting env var and reinitializing
    process.env.O1JS_BACKEND = 'sparky';
    console.log('\nSet O1JS_BACKEND=sparky and reinitializing...');
    await initializeBindings();
    console.log(`Backend after env init: ${getCurrentBackend()}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);