/**
 * Minimal Reproduction: Sparky Permutation Construction Failure
 * 
 * This test creates the absolute simplest possible zkProgram to isolate
 * where permutation construction fails in the Sparky backend.
 */

// Simple minimal test case
async function debugMinimalPermutation() {
  console.log('🔍 MINIMAL PERMUTATION DEBUGGING');
  console.log('================================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, switchBackend, getCurrentBackend } = o1js;

  // Define the absolutely simplest possible zkProgram
  const MinimalProgram = ZkProgram({
    name: 'MinimalProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Simple field addition - no debug logging during compilation
          const result = publicInput.add(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });

  const testInputs = [5, 3]; // 5 + 3 = 8
  const results = {};

  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Testing ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(40));
    
    try {
      // Switch backend
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      // Compile with detailed logging
      console.log('\n📋 Compiling MinimalProgram...');
      const compilationStart = performance.now();
      const compilationResult = await MinimalProgram.compile();
      const compilationTime = performance.now() - compilationStart;
      
      console.log(`✅ Compilation completed in ${compilationTime.toFixed(2)}ms`);
      console.log(`📊 Compilation result keys: ${Object.keys(compilationResult)}`);
      
      // Extract constraint system information
      if (compilationResult.cs) {
        console.log(`🔧 Constraint system: ${JSON.stringify(compilationResult.cs, null, 2)}`);
      }
      
      // Test proof generation
      console.log('\n🧪 Testing proof generation...');
      console.log(`📥 Inputs: publicInput=${testInputs[0]}, privateInput=${testInputs[1]}`);
      
      const proofStart = performance.now();
      
      try {
        const proofResult = await MinimalProgram.add(testInputs[0], testInputs[1]);
        const proofTime = performance.now() - proofStart;
        
        console.log(`✅ Proof generation completed in ${proofTime.toFixed(2)}ms`);
        console.log(`📋 Proof result type: ${typeof proofResult}`);
        console.log(`📋 Proof result keys: ${Object.keys(proofResult)}`);
        
        const proof = proofResult.proof || proofResult;
        
        // Verify the proof
        console.log('\n🔍 Verifying proof...');
        const verifyStart = performance.now();
        const verified = await MinimalProgram.verify(proof);
        const verifyTime = performance.now() - verifyStart;
        
        console.log(`${verified ? '✅' : '❌'} Verification ${verified ? 'PASSED' : 'FAILED'} in ${verifyTime.toFixed(2)}ms`);
        
        if (verified) {
          console.log(`📤 Public output: ${proof.publicOutput}`);
          console.log(`🧮 Expected: ${testInputs[0] + testInputs[1]}, Got: ${proof.publicOutput}`);
        }
        
        results[backend] = {
          success: verified,
          compilationTime,
          proofTime,
          verifyTime,
          publicOutput: proof.publicOutput,
          error: null
        };
        
      } catch (proofError) {
        const proofTime = performance.now() - proofStart;
        console.log(`❌ Proof generation FAILED in ${proofTime.toFixed(2)}ms`);
        console.log(`📋 Error: ${proofError.message}`);
        console.log(`📋 Error stack: ${proofError.stack}`);
        
        results[backend] = {
          success: false,
          compilationTime,
          proofTime,
          verifyTime: 0,
          publicOutput: null,
          error: proofError.message
        };
      }
      
    } catch (error) {
      console.log(`❌ ${backend} backend test FAILED: ${error.message}`);
      console.log(`📋 Error stack: ${error.stack}`);
      
      results[backend] = {
        success: false,
        compilationTime: 0,
        proofTime: 0,
        verifyTime: 0,
        publicOutput: null,
        error: error.message
      };
    }
  }

  // Generate comparison report
  console.log('\n📊 MINIMAL REPRODUCTION RESULTS');
  console.log('===============================\n');
  
  console.log('Backend | Status | Compilation | Proof Gen | Verify | Output | Error');
  console.log('--------|--------|-------------|-----------|--------|--------|------');
  
  for (const [backend, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const compTime = result.compilationTime.toFixed(0) + 'ms';
    const proofTime = result.proofTime.toFixed(0) + 'ms';
    const verifyTime = result.verifyTime.toFixed(0) + 'ms';
    const output = result.publicOutput ? String(result.publicOutput) : 'N/A';
    const error = result.error ? result.error.substring(0, 30) + '...' : 'None';
    
    console.log(`${backend.padEnd(7)} | ${status.padEnd(6)} | ${compTime.padEnd(11)} | ${proofTime.padEnd(9)} | ${verifyTime.padEnd(6)} | ${output.padEnd(6)} | ${error}`);
  }

  // Analysis
  console.log('\n🔍 ANALYSIS');
  console.log('===========\n');
  
  if (results.snarky && results.sparky) {
    if (results.snarky.success && !results.sparky.success) {
      console.log('❌ CRITICAL: Sparky fails where Snarky succeeds');
      console.log(`📋 Sparky error: ${results.sparky.error}`);
      console.log('🔧 This confirms the permutation construction bug in Sparky');
      
      if (results.sparky.error.includes('permutation')) {
        console.log('🎯 CONFIRMED: Permutation construction is the root cause');
        console.log('📋 Next steps: Deep dive into Sparky constraint system implementation');
      }
    } else if (results.snarky.success && results.sparky.success) {
      console.log('✅ Both backends work - issue may be in more complex circuits');
    } else {
      console.log('⚠️  Both backends fail - may be test setup issue');
    }
  }
  
  return results;
}

// Run the minimal reproduction
debugMinimalPermutation().catch(console.error);