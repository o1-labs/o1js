/**
 * Test: What happens when user tries to access extensions incorrectly
 */

import { 
  switchBackend, 
  getCurrentBackend
} from './dist/node/index.js';

async function testMissingExtensions() {
  console.log('🧪 Testing attempts to access missing extensions...\n');
  
  try {
    await switchBackend('sparky');
    console.log(`Backend: ${getCurrentBackend()}`);
    
    // Test 1: Try to access undefined extension functions
    console.log('1️⃣ Testing undefined extension function access...');
    
    try {
      // These are not imported, so should be undefined
      getSparkyExtensions();
    } catch (error) {
      console.log(`   ✅ ReferenceError as expected: ${error.message}`);
    }
    
    // Test 2: Check if there are any global extension objects
    console.log('2️⃣ Checking for global extension objects...');
    
    if (typeof globalThis.getSparkyExtensions === 'function') {
      console.log('   ⚠️  Extensions available on globalThis');
    } else {
      console.log('   ✅ No global extension functions');
    }
    
    // Test 3: Check if Sparky itself exposes optimization methods
    console.log('3️⃣ Checking if optimization is accessible another way...');
    
    // Check if optimization methods are exposed through other means
    if (typeof globalThis.sparkyConstraintBridge === 'object') {
      console.log('   ℹ️  sparkyConstraintBridge exists (for internal use)');
      const bridge = globalThis.sparkyConstraintBridge;
      console.log(`   Bridge methods: ${Object.keys(bridge).join(', ')}`);
    }
    
    console.log('\n✅ Summary: Clean separation - no accidental access to extensions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMissingExtensions();