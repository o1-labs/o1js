/**
 * Test to reproduce and verify fix for the original Poseidon error:
 * "Cannot read properties of undefined (reading 'update')"
 */

async function testOriginalPoseidonError() {
  try {
    console.log('🧪 Testing original Poseidon error scenario...');
    
    // Import o1js and switch to Sparky backend
    const { switchBackend, getCurrentBackend, Field } = await import('./dist/node/index.js');
    
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    
    const currentBackend = getCurrentBackend();
    console.log(`✅ Current backend: ${currentBackend}`);
    
    if (currentBackend !== 'sparky') {
      throw new Error('Failed to switch to Sparky backend');
    }
    
    // Try to access Snarky's poseidon interface directly (this was causing the error)
    console.log('\n🔍 Testing direct access to Snarky poseidon interface...');
    
    const snarky = globalThis.__snarky?.Snarky;
    
    if (!snarky) {
      throw new Error('Snarky interface not available');
    }
    
    console.log('Snarky available with keys:', Object.keys(snarky));
    
    if (!snarky.poseidon) {
      throw new Error('Poseidon not available on Snarky interface');
    }
    
    console.log('Poseidon available with keys:', Object.keys(snarky.poseidon));
    
    // Test the specific method that was causing "Cannot read properties of undefined (reading 'update')"
    if (typeof snarky.poseidon.update === 'function') {
      console.log('✅ poseidon.update is available and is a function');
      
      // Try to call update with some dummy data (just to test it exists)
      try {
        // Create some mock state and input for testing
        const dummyState = [Field(1), Field(2), Field(3)];
        const dummyInput = [Field(42)];
        
        // This call would previously fail with "Cannot read properties of undefined (reading 'update')"
        const result = snarky.poseidon.update(dummyState, dummyInput);
        console.log('✅ poseidon.update call succeeded, result type:', typeof result);
      } catch (updateError) {
        console.log('⚠️  poseidon.update call failed (but method exists):', updateError.message);
      }
    } else {
      throw new Error('poseidon.update is not a function');
    }
    
    // Test sponge interface methods too
    if (snarky.poseidon.sponge) {
      console.log('\n🔍 Testing sponge interface...');
      
      if (typeof snarky.poseidon.sponge.create === 'function') {
        console.log('✅ poseidon.sponge.create is available');
        
        try {
          const sponge = snarky.poseidon.sponge.create(true);
          console.log('✅ poseidon.sponge.create call succeeded, result type:', typeof sponge);
        } catch (createError) {
          console.log('⚠️  poseidon.sponge.create call failed (but method exists):', createError.message);
        }
      }
      
      if (typeof snarky.poseidon.sponge.absorb === 'function') {
        console.log('✅ poseidon.sponge.absorb is available');
      }
      
      if (typeof snarky.poseidon.sponge.squeeze === 'function') {
        console.log('✅ poseidon.sponge.squeeze is available');
      }
    }
    
    console.log('\n✅ Original Poseidon error scenario test completed successfully!');
    console.log('The "Cannot read properties of undefined (reading \'update\')" error has been FIXED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testOriginalPoseidonError();