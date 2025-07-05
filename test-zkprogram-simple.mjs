import { ZkProgram, Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 Simple ZkProgram Compilation Test');

// Test with Snarky first
console.log('\n📦 Testing with snarky backend...');
switchBackend('snarky');

try {
  // Create a simple ZkProgram
  const SimpleProgram = ZkProgram({
    name: 'simple-program',
    publicInput: Field,
    
    methods: {
      double: {
        privateInputs: [],
        async method(publicInput) {
          return publicInput.mul(2);
        }
      }
    }
  });
  
  // Try to compile with Snarky
  console.log('⚙️  Compiling SimpleProgram with Snarky...');
  const snarkyStart = Date.now();
  const snarkyResult = await SimpleProgram.compile();
  const snarkyTime = Date.now() - snarkyStart;
  
  console.log('✅ Snarky compilation successful!');
  console.log(`  - Compilation time: ${snarkyTime}ms`);
  console.log(`  - VK exists: ${!!snarkyResult.verificationKey}`);
  console.log(`  - VK hash: ${snarkyResult.verificationKey?.hash || 'missing'}`);
  
  // Now test with Sparky
  console.log('\n📦 Testing with sparky backend...');
  switchBackend('sparky');
  
  // Re-create the program for Sparky
  const SimpleProgramSparky = ZkProgram({
    name: 'simple-program',
    publicInput: Field,
    
    methods: {
      double: {
        privateInputs: [],
        async method(publicInput) {
          return publicInput.mul(2);
        }
      }
    }
  });
  
  console.log('⚙️  Compiling SimpleProgram with Sparky...');
  const sparkyStart = Date.now();
  const sparkyResult = await SimpleProgramSparky.compile();
  const sparkyTime = Date.now() - sparkyStart;
  
  console.log('✅ Sparky compilation successful!');
  console.log(`  - Compilation time: ${sparkyTime}ms`);
  console.log(`  - VK exists: ${!!sparkyResult.verificationKey}`);
  console.log(`  - VK hash: ${sparkyResult.verificationKey?.hash || 'missing'}`);
  
  // Compare results
  console.log('\n📊 Comparison:');
  console.log(`  - VK Match: ${snarkyResult.verificationKey?.hash === sparkyResult.verificationKey?.hash ? '✅' : '❌'}`);
  console.log(`  - Compilation Speed: Sparky is ${(snarkyTime / sparkyTime).toFixed(2)}x`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}