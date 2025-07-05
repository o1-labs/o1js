/**
 * Test script to verify Poseidon interface fix in Sparky adapter
 */

async function testPoseidonInterface() {
  try {
    console.log('🧪 Testing Poseidon interface in Sparky adapter...');
    
    // Import o1js with Sparky backend
    const { switchBackend, getCurrentBackend, Field, Poseidon } = await import('./dist/node/index.js');
    
    // Switch to Sparky backend
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    
    const currentBackend = getCurrentBackend();
    console.log(`✅ Current backend: ${currentBackend}`);
    
    if (currentBackend !== 'sparky') {
      throw new Error('Failed to switch to Sparky backend');
    }
    
    // Test basic Poseidon functionality
    console.log('\n🔍 Testing Poseidon.hash() method...');
    
    const input1 = Field(42);
    const input2 = Field(123);
    
    console.log('Input 1:', input1.toString());
    console.log('Input 2:', input2.toString());
    
    // Test Poseidon hash
    const hash = Poseidon.hash([input1, input2]);
    console.log('Poseidon hash result:', hash.toString());
    
    // Test sponge interface
    console.log('\n🔍 Testing Poseidon sponge interface...');
    
    try {
      // Access the underlying snarky interface
      console.log('Available global objects:', Object.keys(globalThis).filter(k => k.includes('snarky') || k.includes('Snarky') || k.includes('sparky')));
      
      const snarky = globalThis.__snarky?.Snarky;
      
      if (!snarky) {
        console.log('globalThis.__snarky:', globalThis.__snarky);
        throw new Error('Snarky interface not available');
      }
      
      console.log('Snarky object keys:', Object.keys(snarky));
      
      if (!snarky.poseidon) {
        throw new Error('Poseidon not available on Snarky interface');
      }
      
      console.log('Poseidon object keys:', Object.keys(snarky.poseidon));
      
      // Test Poseidon.update method
      if (typeof snarky.poseidon.update === 'function') {
        console.log('✅ Poseidon.update method is available');
      } else {
        console.log('❌ Poseidon.update method is NOT available');
      }
      
      // Test Poseidon sponge interface
      if (snarky.poseidon.sponge) {
        console.log('Poseidon sponge object keys:', Object.keys(snarky.poseidon.sponge));
        
        if (typeof snarky.poseidon.sponge.create === 'function') {
          console.log('✅ Poseidon.sponge.create method is available');
        } else {
          console.log('❌ Poseidon.sponge.create method is NOT available');
        }
        
        if (typeof snarky.poseidon.sponge.absorb === 'function') {
          console.log('✅ Poseidon.sponge.absorb method is available');
        } else {
          console.log('❌ Poseidon.sponge.absorb method is NOT available');
        }
        
        if (typeof snarky.poseidon.sponge.squeeze === 'function') {
          console.log('✅ Poseidon.sponge.squeeze method is available');
        } else {
          console.log('❌ Poseidon.sponge.squeeze method is NOT available');
        }
      } else {
        console.log('❌ Poseidon.sponge is NOT available');
      }
      
    } catch (spongeError) {
      console.error('Sponge interface test failed:', spongeError.message);
    }
    
    console.log('\n✅ Poseidon interface test completed successfully!');
    
  } catch (error) {
    console.error('❌ Poseidon interface test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPoseidonInterface();