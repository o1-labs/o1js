(async () => {
  try {
    console.log('=== Testing global bindings ===');
    
    // Step 1: Import crypto bindings (should set up tsBindings)
    console.log('Step 1: Loading crypto bindings...');
    await import('./dist/node/bindings/crypto/bindings.js');
    console.log('✅ Crypto bindings loaded');
    console.log('globalThis.__snarkyTsBindings exists:', typeof globalThis.__snarkyTsBindings !== 'undefined');
    
    if (globalThis.__snarkyTsBindings) {
      console.log('__snarkyTsBindings keys:', Object.keys(globalThis.__snarkyTsBindings).slice(0, 10));
      console.log('caml_bigint_256_bytes_per_limb exists:', typeof globalThis.__snarkyTsBindings.caml_bigint_256_bytes_per_limb !== 'undefined');
    }
    
    // Check if the OCaml code expects tsBindings or __snarkyTsBindings
    console.log('globalThis.tsBindings exists:', typeof globalThis.tsBindings !== 'undefined');
    
  } catch (e) {
    console.log('❌ Binding test failed:', e.message);
  }
})()