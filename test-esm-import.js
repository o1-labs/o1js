(async () => {
  try {
    console.log('Testing ESM import only...');
    const module = await import('./dist/node/bindings/compiled/_node_bindings/o1js_node.bc.cjs');
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