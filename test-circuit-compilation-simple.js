#!/usr/bin/env node

async function testSimpleCircuitCompilation() {
  console.log('=== Simple Circuit Compilation Debug Test ===\n');
  
  // Import o1js with backend switching
  const o1js = await import('./dist/node/index.js');
  const { ZkProgram, Field, switchBackend, getCurrentBackend } = o1js;
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Testing with ${backend} backend...`);
    await switchBackend(backend);
    const currentBackend = getCurrentBackend();
    console.log(`✅ Backend set to: ${currentBackend}`);
    
    try {
      // Define simple ZkProgram
      const SimpleProgram = ZkProgram({
        name: 'simple-program',
        publicInput: Field,
        
        methods: {
          double: {
            privateInputs: [Field],
            async method(publicInput, x) {
              x.mul(2).assertEquals(publicInput);
            }
          }
        }
      });
      
      console.log('🔧 Compiling SimpleProgram...');
      const startTime = Date.now();
      
      try {
        const result = await SimpleProgram.compile();
        const endTime = Date.now();
        
        console.log(`✅ Compilation successful in ${endTime - startTime}ms`);
        console.log(`   - Verification key exists: ${!!result.verificationKey}`);
        if (result.verificationKey) {
          console.log(`   - VK hash: ${result.verificationKey.hash}`);
          console.log(`   - VK data length: ${result.verificationKey.data.length} chars`);
        }
        console.log(`   - Method count: ${Object.keys(result.proofs || {}).length}`);
        console.log(`   - Methods: ${Object.keys(result.proofs || {}).join(', ')}`);
      } catch (error) {
        console.error(`❌ Compilation failed: ${error.message}`);
        console.error(`   Stack trace:`);
        console.error(error.stack);
      }
      
    } catch (error) {
      console.error(`❌ Setup failed: ${error.message}`);
      console.error(error.stack);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testSimpleCircuitCompilation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});