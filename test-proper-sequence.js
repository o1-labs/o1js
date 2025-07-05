(async () => {
  try {
    console.log('=== Testing proper loading sequence from bindings.js ===');
    
    // This simulates the exact sequence in bindings.js
    console.log('Step 1: Import crypto bindings first...');
    await import('./dist/node/bindings/crypto/bindings.js');
    console.log('✅ Crypto bindings loaded');
    console.log('globalThis.__snarkyTsBindings exists:', typeof globalThis.__snarkyTsBindings !== 'undefined');
    
    console.log('\nStep 2: Import WASM + thread pool...');
    const { wasm } = await import('./dist/node/bindings/js/node/node-backend.js');
    console.log('✅ WASM bindings loaded');
    
    console.log('\nStep 3: Try both loading approaches...');
    
    // Test CJS approach (if require is available)
    let snarkyOcaml = null;
    if (typeof require !== 'undefined') {
      try {
        console.log('Trying CJS require...');
        // Import the built bindings module instead of internal build artifacts
        const bindings = require('./dist/node/bindings.js');
        snarkyOcaml = bindings;
        console.log('✅ CJS require succeeded');
      } catch (e) {
        console.log('❌ CJS require failed:', e.message);
      }
    }
    
    // Test ESM approach (if CJS failed)
    if (!snarkyOcaml) {
      try {
        console.log('Trying ESM import...');
        // Import the built bindings module instead of internal build artifacts
        const bindings = await import('./dist/node/bindings.js');
        snarkyOcaml = bindings;
        console.log('✅ ESM import succeeded');
      } catch (e) {
        console.log('❌ ESM import failed:', e.message);
      }
    }
    
    if (snarkyOcaml) {
      console.log('\nStep 4: Check loaded modules...');
      console.log('Snarky keys:', Object.keys(snarkyOcaml).slice(0, 5));
      console.log('Has Pickles:', !!snarkyOcaml.Pickles);
      console.log('Has Snarky:', !!snarkyOcaml.Snarky);
      console.log('Has Test:', !!snarkyOcaml.Test);
      console.log('Has Ledger:', !!snarkyOcaml.Ledger);
    }
    
  } catch (e) {
    console.log('❌ Proper sequence test failed:', e.message);
    console.log('Stack:', e.stack);
  }
})()