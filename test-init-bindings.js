// Test with initialization
import { initializeBindings, Snarky, switchBackend } from './src/bindings.js';

console.log('Testing inProver with proper initialization...\n');

async function test() {
  // Initialize with snarky backend first
  console.log('Initializing snarky backend...');
  await initializeBindings('snarky');
  
  console.log('\n=== SNARKY BACKEND ===');
  console.log('Snarky type:', typeof Snarky);
  console.log('Snarky.run type:', typeof Snarky.run);
  
  if (Snarky.run) {
    console.log('Snarky.run.inProver type:', typeof Snarky.run.inProver);
    
    if (typeof Snarky.run.inProver === 'function') {
      try {
        const result = Snarky.run.inProver();
        console.log('Snarky.run.inProver() result:', result);
        console.log('✅ Snarky backend: inProver() works as function');
      } catch (e) {
        console.error('❌ Snarky backend error:', e.message);
      }
    }
  }
  
  // Switch to sparky backend
  console.log('\n=== SPARKY BACKEND ===');
  console.log('Switching to sparky backend...');
  await switchBackend('sparky');
  
  console.log('Snarky type:', typeof Snarky);
  console.log('Snarky.run type:', typeof Snarky.run);
  
  if (Snarky.run) {
    console.log('Snarky.run.inProver type:', typeof Snarky.run.inProver);
    
    if (typeof Snarky.run.inProver === 'function') {
      try {
        const result = Snarky.run.inProver();
        console.log('Snarky.run.inProver() result:', result);
        console.log('✅ Sparky backend: inProver() works as function');
      } catch (e) {
        console.error('❌ Sparky backend error:', e.message);
      }
    }
  }
}

test().catch(console.error);