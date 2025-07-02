import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Direct Sparky Access ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Import the Sparky WASM module directly
import sparkyWasm from './src/sparky/sparky-wasm/pkg/sparky_wasm.cjs';
console.log('\nSparky WASM exports:', Object.keys(sparkyWasm));

// Check sparkyInstance
console.log('\nglobalThis.sparkyInstance:', globalThis.sparkyInstance);

// Try to access sparkyInstance through module system
import sparkyAdapter from './dist/node/bindings/sparky-adapter.js';

// Call the constraint bridge directly
const bridge = globalThis.sparkyConstraintBridge;
console.log('\nBridge available:', !!bridge);

if (bridge) {
  console.log('\n1. Start accumulation:');
  bridge.startConstraintAccumulation();
  
  // Create a simple field operation
  console.log('\n2. Create field operation:');
  const x = Field(3);
  const y = Field(4);
  const z = x.mul(y);
  console.log('   Created z = 3 * 4 =', z.toString());
  
  console.log('\n3. Get constraints:');
  const constraints = bridge.getAccumulatedConstraints();
  console.log('   Constraints:', constraints);
  
  console.log('\n4. End accumulation:');
  bridge.endConstraintAccumulation();
}

console.log('\n=== Complete ===\n');