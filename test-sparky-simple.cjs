/**
 * Simple test to verify Sparky backend switching
 */

async function testBasicSwitching() {
  console.log('🚀 Testing basic backend switching...\n');
  
  try {
    // Import the bindings
    const { switchBackend, getCurrentBackend } = await import('./src/bindings.js');
    
    console.log(`Initial backend: ${getCurrentBackend()}`);
    
    // Try switching to Sparky
    console.log('Attempting to switch to Sparky...');
    await switchBackend('sparky');
    console.log(`After switch: ${getCurrentBackend()}`);
    
    // Try switching back to Snarky
    console.log('Switching back to Snarky...');
    await switchBackend('snarky');
    console.log(`After switch back: ${getCurrentBackend()}`);
    
    console.log('\n✅ Basic backend switching test passed!');
    
  } catch (error) {
    console.error('\n❌ Backend switching test failed:', error.message);
    console.error('Full error:', error);
  }
}

testBasicSwitching();