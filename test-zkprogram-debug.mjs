import { ZkProgram, Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 ZkProgram Method Debug Test');

// Test with both backends
for (const backend of ['snarky', 'sparky']) {
  console.log(`\n📦 Testing with ${backend} backend...`);
  switchBackend(backend);
  
  // Create ZkProgram with more complex method
  const TestProgram = ZkProgram({
    name: `test-program-${backend}`,
    publicInput: Field,
    
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          console.log(`  🔧 Method executing in ${backend}...`);
          
          // This should generate constraints
          const x = publicInput.mul(privateInput);
          const y = x.add(Field(1));
          y.assertEquals(Field(10));
          
          return y;
        }
      }
    }
  });
  
  // Analyze the method to see constraint generation
  console.log('📊 Analyzing method constraints...');
  const analysis = await TestProgram.analyzeMethods();
  console.log(`  - Method 'compute' constraints: ${analysis.compute.rows}`);
  
  // Now compile
  console.log('⚙️  Compiling program...');
  const result = await TestProgram.compile();
  console.log(`✅ Compilation complete`);
  console.log(`  - VK exists: ${!!result.verificationKey}`);
  console.log(`  - VK hash: ${result.verificationKey?.hash || 'missing'}`);
}