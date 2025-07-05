(async () => {
  try {
    console.log('Testing ESM import only...');
    // Import from the main bindings module instead of internal build artifacts
    const module = await import('./dist/node/bindings.js');
    // If you need the raw OCaml module, you can access it from the bindings
    // But typically you should use the high-level bindings API
    const snarkyOcaml = module.default;
    console.log('✅ ESM import succeeded');
    console.log('Default export exists:', !!snarkyOcaml);
    if (snarkyOcaml) {
      console.log('Default export keys:', Object.keys(snarkyOcaml).slice(0, 5));
    }
  } catch(e) {
    console.log('❌ ESM import failed:', e.message);
    console.log('Stack:', e.stack);
  }
})()