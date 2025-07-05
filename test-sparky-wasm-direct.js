// Test Sparky WASM directly
import sparkyWasm from './src/bindings/compiled/_node_bindings/sparky_wasm.cjs';

console.log('Testing Sparky WASM directly...\n');

try {
  // Create Sparky instance
  const sparky = new sparkyWasm.Snarky();
  console.log('✅ Created Sparky instance');
  
  // Check run property
  console.log('\n=== Testing run property ===');
  console.log('typeof sparky.run:', typeof sparky.run);
  console.log('sparky.run:', sparky.run);
  
  if (sparky.run) {
    console.log('\n=== Testing run methods ===');
    console.log('typeof sparky.run.inProver:', typeof sparky.run.inProver);
    console.log('typeof sparky.run.inProverBlock:', typeof sparky.run.inProverBlock);
    
    if (typeof sparky.run.inProver === 'function') {
      const result = sparky.run.inProver();
      console.log('sparky.run.inProver() result:', result);
      console.log('✅ inProver() works as function');
    } else {
      console.log('❌ inProver is not a function');
      
      // Try to list all properties
      console.log('\nAll properties of sparky.run:');
      for (const key in sparky.run) {
        console.log(`  ${key}: ${typeof sparky.run[key]}`);
      }
      
      // Check prototype
      console.log('\nPrototype properties:');
      const proto = Object.getPrototypeOf(sparky.run);
      for (const key in proto) {
        console.log(`  ${key}: ${typeof proto[key]}`);
      }
    }
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  console.error(e.stack);
}