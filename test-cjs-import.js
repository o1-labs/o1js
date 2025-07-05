(async () => {
  try {
    const module = await import('./dist/node/bindings/compiled/_node_bindings/o1js_node.bc.cjs');
    console.log('✅ CJS module imported successfully');
    console.log('Module has default:', !!module.default);
    console.log('Module keys:', Object.keys(module));
  } catch(e) {
    console.log('❌ CJS module import failed:', e.message);
  }
})()