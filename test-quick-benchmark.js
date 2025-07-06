/**
 * Quick benchmark test for constraint extraction
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

async function measureCompilation(name, compileFn, program) {
  const backend = getCurrentBackend();
  const start = performance.now();
  try {
    const result = await compileFn();
    const time = performance.now() - start;
    
    // Extract verification key hash and constraint count
    let vkHash;
    let constraintCount;
    
    if (result && result.verificationKey) {
      // Handle different VK hash formats - Field objects need special handling
      if (typeof result.verificationKey.hash === 'string') {
        vkHash = result.verificationKey.hash;
      } else if (result.verificationKey.hash && typeof result.verificationKey.hash === 'object') {
        // Handle Field objects by extracting the underlying value
        if (result.verificationKey.hash.value && Array.isArray(result.verificationKey.hash.value) && 
            result.verificationKey.hash.value.length >= 2 && 
            Array.isArray(result.verificationKey.hash.value[1]) &&
            result.verificationKey.hash.value[1].length >= 2) {
          // Extract the bigint value from Field structure: [0, [0, bigint_value]]
          vkHash = result.verificationKey.hash.value[1][1].toString();
        } else {
          // Fallback to JSON stringify for other object formats
          vkHash = JSON.stringify(result.verificationKey.hash);
        }
      } else {
        // Fallback: use the entire VK as hash indicator
        vkHash = 'VK_PRESENT';
      }
    }
    
    // Try to get constraint count using analyzeMethods
    try {
      if (program && typeof program.analyzeMethods === 'function') {
        const analysis = await program.analyzeMethods();
        console.log(`🔍 DEBUG analyzeMethods result for ${name}:`, analysis);
        if (analysis && typeof analysis === 'object') {
          const methodNames = Object.keys(analysis);
          if (methodNames.length > 0) {
            const firstMethod = analysis[methodNames[0]];
            if (firstMethod && firstMethod.rows) {
              constraintCount = firstMethod.rows;
            }
          }
        }
      }
    } catch (analysisError) {
      console.log(`⚠️ analyzeMethods failed for ${name}:`, analysisError.message);
    }
    
    return { name, time, backend, vkHash, constraintCount };
  } catch (error) {
    console.error(`❌ Compilation failed for ${name} on ${backend}:`, error);
    return { name, time: -1, backend };
  }
}

async function quickTest() {
  console.log('🔍 Quick constraint extraction test...\n');
  
  // Test with Snarky
  console.log('📊 Testing with Snarky backend...');
  await switchBackend('snarky');
  
  const snarkyResult = await measureCompilation('Simple Arithmetic', () => SimpleArithmetic.compile(), SimpleArithmetic);
  const snarkyVkPreview = snarkyResult.vkHash ? (typeof snarkyResult.vkHash === 'string' ? snarkyResult.vkHash.substring(0, 8) : 'Object') : 'N/A';
  console.log(`Snarky result: ${snarkyResult.time.toFixed(2)}ms, VK: ${snarkyVkPreview}..., Constraints: ${snarkyResult.constraintCount || 'N/A'}`);
  
  // Test with Sparky
  console.log('\n📊 Testing with Sparky backend...');
  await switchBackend('sparky');
  
  const sparkyResult = await measureCompilation('Simple Arithmetic', () => SimpleArithmetic.compile(), SimpleArithmetic);
  const sparkyVkPreview = sparkyResult.vkHash ? (typeof sparkyResult.vkHash === 'string' ? sparkyResult.vkHash.substring(0, 8) : 'Object') : 'N/A';
  console.log(`Sparky result: ${sparkyResult.time.toFixed(2)}ms, VK: ${sparkyVkPreview}..., Constraints: ${sparkyResult.constraintCount || 'N/A'}`);
  
  console.log('\n🔍 Comparison:');
  console.log(`VK Match: ${snarkyResult.vkHash === sparkyResult.vkHash ? '✅' : '❌'}`);
  console.log(`Constraint Match: ${snarkyResult.constraintCount === sparkyResult.constraintCount ? '✅' : '❌'} (${snarkyResult.constraintCount} vs ${sparkyResult.constraintCount})`);
}

quickTest().catch(console.error);