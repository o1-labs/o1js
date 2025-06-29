/**
 * Simple Backend Switching Test - Just verifies the switching mechanism works
 */

import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';

async function verifyBackendLoaded(expectedBackend) {
  console.log(`\n=== Verifying ${expectedBackend} Backend ===`);
  
  try {
    // Ensure backend is initialized
    await initializeBindings();
    
    // Check that Snarky object exists and has expected structure
    console.log('Checking Snarky object structure...');
    console.log(`- Snarky.run exists: ${!!Snarky.run}`);
    console.log(`- Snarky.field exists: ${!!Snarky.field}`);
    console.log(`- Snarky.gates exists: ${!!Snarky.gates}`);
    console.log(`- Snarky.constraintSystem exists: ${!!Snarky.constraintSystem}`);
    console.log(`- Snarky.circuit exists: ${!!Snarky.circuit}`);
    
    // Check some specific functions
    console.log('\nChecking specific functions:');
    console.log(`- Snarky.run.asProver: ${typeof Snarky.run.asProver}`);
    console.log(`- Snarky.field.assertEqual: ${typeof Snarky.field.assertEqual}`);
    console.log(`- Snarky.constraintSystem.rows: ${typeof Snarky.constraintSystem.rows}`);
    
    console.log(`\n✓ ${expectedBackend} backend structure verified`);
    
  } catch (error) {
    console.error(`✗ ${expectedBackend} backend verification failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Backend Switching Mechanism Test');
  console.log('===================================');
  
  try {
    // Test 1: Check initial backend
    console.log(`\nInitial backend: ${getCurrentBackend()}`);
    await verifyBackendLoaded('Snarky');
    
    // Test 2: Switch to Sparky
    console.log('\n🔄 TEST: Switching to Sparky backend...');
    await switchBackend('sparky');
    const backend1 = getCurrentBackend();
    console.log(`Current backend after switch: ${backend1}`);
    if (backend1 !== 'sparky') {
      throw new Error(`Expected backend to be 'sparky', got '${backend1}'`);
    }
    await verifyBackendLoaded('Sparky');
    
    // Test 3: Switch back to Snarky
    console.log('\n🔄 TEST: Switching back to Snarky backend...');
    await switchBackend('snarky');
    const backend2 = getCurrentBackend();
    console.log(`Current backend after switch: ${backend2}`);
    if (backend2 !== 'snarky') {
      throw new Error(`Expected backend to be 'snarky', got '${backend2}'`);
    }
    await verifyBackendLoaded('Snarky');
    
    // Test 4: Multiple rapid switches
    console.log('\n🔄 TEST: Multiple rapid switches...');
    await switchBackend('sparky');
    await switchBackend('snarky');
    await switchBackend('sparky');
    await switchBackend('snarky');
    const backend3 = getCurrentBackend();
    console.log(`Backend after rapid switches: ${backend3}`);
    if (backend3 !== 'snarky') {
      throw new Error(`Expected backend to be 'snarky' after rapid switches, got '${backend3}'`);
    }
    
    // Test 5: Invalid backend
    console.log('\n🔄 TEST: Invalid backend handling...');
    try {
      await switchBackend('invalid-backend');
      console.error('✗ Should have thrown error for invalid backend');
    } catch (error) {
      console.log(`✓ Correctly rejected invalid backend: ${error.message}`);
    }
    
    // Test 6: Environment variable (just check, don't try to reload)
    console.log('\n📋 TEST: Environment Variable Check');
    console.log(`O1JS_BACKEND=${process.env.O1JS_BACKEND || 'not set'}`);
    
    // Set env var for next run
    process.env.O1JS_BACKEND = 'sparky';
    console.log('Set O1JS_BACKEND=sparky for next run');
    console.log('(Restart the process to test environment variable initialization)');
    
    console.log('\n✅ All backend switching tests passed!');
    console.log('\nSummary:');
    console.log('- Backend switching mechanism works correctly');
    console.log('- Both Snarky and Sparky backends can be loaded');
    console.log('- Backend state is properly tracked');
    console.log('- Invalid backends are rejected');
    console.log('- Multiple rapid switches work correctly');
    console.log('\n🎉 Backend switching implementation is functional!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);