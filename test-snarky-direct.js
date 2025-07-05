// Test Snarky directly from bindings
import { Snarky } from './src/bindings.js';

console.log('Testing Snarky.field.inProver directly...\n');

console.log('=== SNARKY MODULE ===');
console.log('Snarky type:', typeof Snarky);
console.log('Snarky.field type:', typeof Snarky.field);

if (Snarky.field) {
  console.log('\n=== TESTING inProver ===');
  console.log('Snarky.field.inProver type:', typeof Snarky.field.inProver);
  console.log('Snarky.field.inProverBlock type:', typeof Snarky.field.inProverBlock);
  
  try {
    // Test calling inProver as a function
    const result = Snarky.field.inProver();
    console.log('Snarky.field.inProver() result:', result);
    console.log('✅ inProver() works as function');
  } catch (e) {
    console.error('❌ Error calling inProver():', e.message);
  }
  
  try {
    // Test calling inProverBlock as a function
    const result = Snarky.field.inProverBlock();
    console.log('Snarky.field.inProverBlock() result:', result);
    console.log('✅ inProverBlock() works as function');
  } catch (e) {
    console.error('❌ Error calling inProverBlock():', e.message);
  }
} else {
  console.log('❌ Snarky.field is not defined');
}