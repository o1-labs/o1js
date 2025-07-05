// Test the correct inProver location
// Import from the built distribution instead of source files
import { Snarky } from './dist/node/bindings.js';

console.log('Testing correct inProver location...\n');

console.log('=== Checking Snarky.run ===');
console.log('Snarky.run type:', typeof Snarky.run);
console.log('Snarky.run.inProver type:', typeof Snarky.run.inProver);
console.log('Snarky.run.inProverBlock type:', typeof Snarky.run.inProverBlock);

if (typeof Snarky.run.inProver === 'function') {
  try {
    const result = Snarky.run.inProver();
    console.log('Snarky.run.inProver() result:', result);
    console.log('✅ Snarky.run.inProver() works as function');
  } catch (e) {
    console.error('❌ Error calling Snarky.run.inProver():', e.message);
  }
}

console.log('\n=== Checking Snarky.field ===');
console.log('Snarky.field type:', typeof Snarky.field);
console.log('Snarky.field.inProver type:', typeof Snarky.field.inProver);

// List all properties of Snarky.field
console.log('\nSnarky.field properties:');
const fieldProps = Object.getOwnPropertyNames(Snarky.field);
console.log(fieldProps.filter(p => typeof Snarky.field[p] === 'function'));