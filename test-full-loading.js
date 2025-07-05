(async () => {
  try {
    console.log('=== Testing full loading sequence ===');
    
    // Step 1: Import crypto bindings (should set up tsBindings)
    console.log('Step 1: Loading crypto bindings...');
    await import('./dist/node/bindings/crypto/bindings.js');
    console.log('✅ Crypto bindings loaded');
    console.log('tsBindings exists:', typeof globalThis.tsBindings !== 'undefined');
    
    // Step 2: Try to load OCaml module
    console.log('\nStep 2: Loading OCaml module...');
    let snarkyOcaml;
    
    // Test the CJS path first
    console.log('Trying CJS require...');
    if (typeof require !== 'undefined') {
      try {
        // Import the built bindings module instead of internal build artifacts
        const bindings = require('./dist/node/bindings.js');
        snarkyOcaml = bindings.Snarky;
        console.log('✅ CJS require succeeded');
      } catch (e) {
        console.log('❌ CJS require failed:', e.message);
      }
    }
    
    // If CJS failed, try ESM
    if (!snarkyOcaml) {
      console.log('Trying ESM import...');
      try {
        // Import the built bindings module instead of internal build artifacts
        const bindings = await import('./dist/node/bindings.js');
        snarkyOcaml = bindings.Snarky;
        console.log('✅ ESM import succeeded');
      } catch (e) {
        console.log('❌ ESM import failed:', e.message);
      }
    }
    
    if (snarkyOcaml) {
      console.log('Module keys:', Object.keys(snarkyOcaml).slice(0, 5));
    }
    
  } catch (e) {
    console.log('❌ Full loading failed:', e.message);
    console.log('Stack:', e.stack);
  }
})()