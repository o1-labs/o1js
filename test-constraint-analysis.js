#!/usr/bin/env node

async function analyzeConstraintDifferences() {
  console.log('=== Constraint System Analysis ===\n');
  
  const o1js = await import('./dist/node/index.js');
  const { ZkProgram, Field, Provable, switchBackend, getCurrentBackend } = o1js;
  
  // Simple test program
  const TestProgram = ZkProgram({
    name: 'constraint-test',
    publicInput: Field,
    
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, x) {
          // Simple multiplication constraint: x * 2 = publicInput
          x.mul(2).assertEquals(publicInput);
        }
      }
    }
  });
  
  const results = {};
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Analyzing ${backend} backend...`);
    await switchBackend(backend);
    
    try {
      // Track constraints during compilation
      const originalConsole = console.log;
      const constraints = [];
      console.log = (...args) => {
        const str = args.join(' ');
        if (str.includes('constraint') || str.includes('R1CS') || str.includes('gate')) {
          constraints.push(str);
        }
        originalConsole(...args);
      };
      
      const startTime = Date.now();
      const compilationResult = await TestProgram.compile();
      const endTime = Date.now();
      
      // Restore console
      console.log = originalConsole;
      
      results[backend] = {
        success: true,
        vkHash: compilationResult.verificationKey?.hash,
        vkDataLength: compilationResult.verificationKey?.data.length,
        compilationTime: endTime - startTime,
        constraintCount: constraints.filter(c => c.includes('constraint')).length,
        gateCount: constraints.filter(c => c.includes('gate')).length
      };
      
      console.log(`✅ Compilation successful`);
      console.log(`   - VK Hash: ${results[backend].vkHash}`);
      console.log(`   - VK Data Length: ${results[backend].vkDataLength}`);
      console.log(`   - Compilation Time: ${results[backend].compilationTime}ms`);
      console.log(`   - Constraint mentions: ${results[backend].constraintCount}`);
      console.log(`   - Gate mentions: ${results[backend].gateCount}`);
      
    } catch (error) {
      console.error(`❌ ${backend} compilation failed: ${error.message}`);
      results[backend] = { success: false, error: error.message };
    }
  }
  
  // Compare results
  console.log('\n=== Comparison ===');
  if (results.snarky?.success && results.sparky?.success) {
    const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    console.log(`\nVerification Key Match: ${vkMatch ? '✅' : '❌'}`);
    if (!vkMatch) {
      console.log('  Snarky VK Hash:', results.snarky.vkHash);
      console.log('  Sparky VK Hash:', results.sparky.vkHash);
    }
    
    console.log(`\nVK Data Length Match: ${results.snarky.vkDataLength === results.sparky.vkDataLength ? '✅' : '❌'}`);
    console.log('  Snarky:', results.snarky.vkDataLength);
    console.log('  Sparky:', results.sparky.vkDataLength);
    
    console.log(`\nCompilation Speed:`);
    console.log('  Snarky:', results.snarky.compilationTime + 'ms');
    console.log('  Sparky:', results.sparky.compilationTime + 'ms');
    const speedup = (results.snarky.compilationTime / results.sparky.compilationTime).toFixed(2);
    console.log('  Sparky is', speedup + 'x faster');
  }
  
  console.log('\n=== Analysis Complete ===');
}

analyzeConstraintDifferences().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});