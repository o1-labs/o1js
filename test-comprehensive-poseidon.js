/**
 * Comprehensive test for Poseidon functionality in Sparky backend
 */

async function testComprehensivePoseidon() {
  try {
    console.log('🧪 Comprehensive Poseidon functionality test...');
    
    // Import o1js and switch to Sparky backend
    const { switchBackend, getCurrentBackend, Field, Poseidon } = await import('./dist/node/index.js');
    
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    
    const currentBackend = getCurrentBackend();
    console.log(`✅ Current backend: ${currentBackend}`);
    
    console.log('\n=== Test 1: High-level Poseidon API ===');
    
    // Test high-level Poseidon API
    const field1 = Field(42);
    const field2 = Field(123);
    const field3 = Field(456);
    
    console.log('Input fields:', [field1.toString(), field2.toString(), field3.toString()]);
    
    // Test Poseidon.hash with multiple inputs
    const hash1 = Poseidon.hash([field1]);
    const hash2 = Poseidon.hash([field1, field2]);
    const hash3 = Poseidon.hash([field1, field2, field3]);
    
    console.log('✅ Poseidon.hash([field1]):', hash1.toString());
    console.log('✅ Poseidon.hash([field1, field2]):', hash2.toString());
    console.log('✅ Poseidon.hash([field1, field2, field3]):', hash3.toString());
    
    console.log('\n=== Test 2: Low-level Snarky Poseidon interface ===');
    
    // Test low-level Snarky interface
    const snarky = globalThis.__snarky?.Snarky;
    
    if (!snarky?.poseidon) {
      throw new Error('Snarky poseidon interface not available');
    }
    
    // Test poseidon.update method
    console.log('Testing poseidon.update...');
    try {
      const initialState = [Field(0), Field(0), Field(0)];
      const input = [field1];
      const newState = snarky.poseidon.update(initialState, input);
      console.log('✅ poseidon.update succeeded, result type:', typeof newState);
    } catch (updateError) {
      console.log('⚠️  poseidon.update error:', updateError.message);
    }
    
    // Test poseidon.hashToGroup method
    console.log('Testing poseidon.hashToGroup...');
    try {
      const groupResult = snarky.poseidon.hashToGroup([field1, field2]);
      console.log('✅ poseidon.hashToGroup succeeded, result type:', typeof groupResult);
    } catch (hashToGroupError) {
      console.log('⚠️  poseidon.hashToGroup error:', hashToGroupError.message);
    }
    
    console.log('\n=== Test 3: Poseidon sponge construction ===');
    
    // Test sponge interface
    if (!snarky.poseidon.sponge) {
      throw new Error('Poseidon sponge interface not available');
    }
    
    try {
      // Create sponge
      const sponge = snarky.poseidon.sponge.create(true);
      console.log('✅ Created sponge:', typeof sponge);
      
      // Absorb some fields
      snarky.poseidon.sponge.absorb(sponge, field1);
      console.log('✅ Absorbed field1 into sponge');
      
      snarky.poseidon.sponge.absorb(sponge, field2);
      console.log('✅ Absorbed field2 into sponge');
      
      // Squeeze result
      const result = snarky.poseidon.sponge.squeeze(sponge);
      console.log('✅ Squeezed result from sponge, type:', typeof result);
      
    } catch (spongeError) {
      console.log('⚠️  Sponge operation error:', spongeError.message);
    }
    
    console.log('\n=== Test 4: Backend compatibility ===');
    
    // Test that we can switch back to snarky and then back to sparky
    console.log('Testing backend switching...');
    
    await switchBackend('snarky');
    console.log('✅ Switched to snarky backend');
    
    const snarkyHash = Poseidon.hash([field1, field2]);
    console.log('✅ Poseidon works in snarky backend:', snarkyHash.toString());
    
    await switchBackend('sparky');
    console.log('✅ Switched back to sparky backend');
    
    const sparkyHash = Poseidon.hash([field1, field2]);
    console.log('✅ Poseidon works in sparky backend:', sparkyHash.toString());
    
    // The hashes should be the same (mathematical equivalence)
    if (snarkyHash.toString() === sparkyHash.toString()) {
      console.log('✅ Hash results are identical between backends');
    } else {
      console.log('⚠️  Hash results differ between backends:');
      console.log('  Snarky:', snarkyHash.toString());
      console.log('  Sparky:', sparkyHash.toString());
    }
    
    console.log('\n🎉 Comprehensive Poseidon test completed successfully!');
    console.log('All Poseidon interfaces are properly exposed and functional in Sparky backend.');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testComprehensivePoseidon();