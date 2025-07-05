// Test after initialization
import { isReady } from './src/bindings.js';
import { Snarky } from './src/bindings.js';

console.log('Testing inProver after initialization...\n');

async function test() {
  // Wait for bindings to be ready
  await isReady;
  console.log('Bindings ready!\n');
  
  console.log('=== Checking Snarky.run ===');
  console.log('Snarky type:', typeof Snarky);
  console.log('Snarky.run type:', typeof Snarky.run);
  
  if (Snarky.run) {
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
  } else {
    console.log('❌ Snarky.run is undefined');
  }
  
  console.log('\n=== Checking Field ===');
  // Import Field after isReady
  const { Field } = await import('./src/lib/provable/field.js');
  console.log('Field type:', typeof Field);
  console.log('Field.inProver type:', typeof Field.inProver);
  
  if (typeof Field.inProver === 'function') {
    try {
      const result = Field.inProver();
      console.log('Field.inProver() result:', result);
      console.log('✅ Field.inProver() works');
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  }
}

test().catch(console.error);