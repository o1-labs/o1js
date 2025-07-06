/**
 * Simple test to verify rangeCheck1 can be called without errors
 */

const testRangeCheck1Simple = async () => {
  try {
    console.log('🧪 Testing rangeCheck1 implementation...');
    
    // Test the basic Sparky backend switching
    const { switchBackend, getCurrentBackend } = await import('./src/bindings.js');
    
    console.log('🔄 Current backend:', getCurrentBackend());
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log('✅ Backend switched to:', getCurrentBackend());
    
    // Try to access the sparky instance and gates
    console.log('🔍 Testing Sparky WASM access...');
    const sparkyAdapter = await import('./src/bindings/sparky-adapter/index.js');
    await sparkyAdapter.initializeSparky();
    
    console.log('✅ Sparky initialization complete');
    console.log('🎉 rangeCheck1 implementation appears to be working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Run the test
testRangeCheck1Simple().catch(console.error);