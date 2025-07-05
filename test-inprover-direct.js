// Direct test of inProver function change
import { getCurrentBackend, switchBackend } from './src/bindings.js';

console.log('Testing inProver function implementation...\n');

// Test 1: Snarky backend
console.log('=== SNARKY BACKEND ===');
switchBackend('snarky');
const snarkyBackend = getCurrentBackend();
console.log('Backend type:', snarkyBackend.constructor.name);

try {
  // Test if inProver is a function
  console.log('typeof backend.field.inProver:', typeof snarkyBackend.field.inProver);
  
  // Call inProver as a function
  const snarkyResult = snarkyBackend.field.inProver();
  console.log('inProver() result:', snarkyResult);
  console.log('✅ Snarky backend: inProver() works as function\n');
} catch (e) {
  console.error('❌ Snarky backend error:', e.message, '\n');
}

// Test 2: Sparky backend
console.log('=== SPARKY BACKEND ===');
switchBackend('sparky');
const sparkyBackend = getCurrentBackend();
console.log('Backend type:', sparkyBackend.constructor.name);

try {
  // Test if inProver is a function
  console.log('typeof backend.field.inProver:', typeof sparkyBackend.field.inProver);
  
  // Call inProver as a function
  const sparkyResult = sparkyBackend.field.inProver();
  console.log('inProver() result:', sparkyResult);
  console.log('✅ Sparky backend: inProver() works as function\n');
} catch (e) {
  console.error('❌ Sparky backend error:', e.message, '\n');
}

// Test 3: Check inProverBlock too
console.log('=== TESTING inProverBlock ===');
try {
  console.log('Snarky inProverBlock():', snarkyBackend.field.inProverBlock());
  console.log('Sparky inProverBlock():', sparkyBackend.field.inProverBlock());
  console.log('✅ inProverBlock() works as function for both backends\n');
} catch (e) {
  console.error('❌ inProverBlock error:', e.message, '\n');
}

console.log('Test completed!');