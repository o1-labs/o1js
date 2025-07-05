// Direct test of sparky-adapter comparison function
// Created: July 4, 2025 12:00 AM UTC

// This test bypasses o1js module loading to directly test the sparky-adapter

console.log('=== Direct Sparky Adapter Test ===');

// Mock the required globals
global.globalThis = global;

// First load the sparky WASM
async function testAdapterDirect() {
  try {
    // Load WASM directly
    const sparkyWasm = require('./sparky_wasm.js');
    
    console.log('1. Loading sparky WASM...');
    const sparkyInstance = await sparkyWasm.default();
    console.log('   ✅ WASM loaded');
    
    // Set up global state
    globalThis.sparkyInstance = sparkyInstance;
    globalThis.__sparkyActive = true;
    
    // Load adapter
    console.log('2. Loading sparky adapter...');
    const adapter = require('./src/bindings/sparky-adapter/index.js');
    
    console.log('3. Testing field operations...');
    
    // Create field adapter instance
    const field = adapter.field;
    
    // Test simple constant creation
    console.log('   Testing constant creation...');
    const x = field.constant('5');
    const y = field.constant('10');
    console.log('   x =', x);
    console.log('   y =', y);
    
    // Test comparison
    console.log('   Testing comparison...');
    const compareResult = field.compare(8, x, y);
    console.log('   Compare result:', compareResult);
    console.log('   Compare result type:', typeof compareResult);
    
    if (compareResult) {
      console.log('   less:', compareResult.less);
      console.log('   less_or_equal:', compareResult.less_or_equal);
    }
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAdapterDirect();