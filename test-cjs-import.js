(async () => {
  try {
    // Import from the main bindings module instead of internal build artifacts
    const module = await import('./dist/node/bindings.js');
    console.log('✅ CJS module imported successfully');
    console.log('Module has default:', !!module.default);
    console.log('Module keys:', Object.keys(module));
  } catch(e) {
    console.log('❌ CJS module import failed:', e.message);
  }
})()