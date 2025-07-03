/**
 * POSEIDON EVIL TEST - Replicating Red Team Attack Conditions
 * 
 * This test replicates the exact conditions from the simple devious test
 * that exposed the Poseidon hash divergence to understand the root cause.
 */

import { Field, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Replicate the evil field generator from the red team tests
function createEvilField(): Field {
  const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
  const evilValues = [
    0n,                    // Zero (division by zero trap)
    1n,                    // One 
    FIELD_MODULUS - 1n,    // Field max (overflow trap)
    FIELD_MODULUS - 2n,    // Near field max
    FIELD_MODULUS / 2n,    // Field half
    0xDEADBEEFn,          // Evil bit pattern
    0xAAAAAAAAn,          // Alternating bits
  ];
  
  const randomEvil = evilValues[Math.floor(Math.random() * evilValues.length)];
  return Field(randomEvil);
}

// Compare backends with evil intent (replicated from simple-devious.test.ts)
async function compareBackendsEvilly<T>(
  operation: () => Promise<T> | T,
  attackName: string
): Promise<{ match: boolean; snarkyResult: any; sparkyResult: any; snarkyError?: string; sparkyError?: string }> {
  let snarkyResult: any, sparkyResult: any;
  let snarkyError: string | undefined, sparkyError: string | undefined;
  
  // Test with Snarky
  await switchBackend('snarky');
  try {
    snarkyResult = await operation();
  } catch (error) {
    snarkyError = (error as Error).message;
  }
  
  // Test with Sparky
  await switchBackend('sparky');
  try {
    sparkyResult = await operation();
  } catch (error) {
    sparkyError = (error as Error).message;
  }
  
  // Compare results
  let match = false;
  if (snarkyError && sparkyError) {
    match = true; // Both errored consistently
  } else if (!snarkyError && !sparkyError) {
    if (typeof snarkyResult === 'object' && snarkyResult?.toString) {
      match = snarkyResult.toString() === sparkyResult.toString();
    } else {
      match = snarkyResult === sparkyResult;
    }
  }
  
  return { match, snarkyResult, sparkyResult, snarkyError, sparkyError };
}

async function runEvilPoseidonTest() {
  console.log('🔥 RUNNING EVIL POSEIDON HASH CHAOS TEST...\n');
  
  // Try multiple iterations to catch the divergence
  for (let iteration = 0; iteration < 20; iteration++) {
    console.log(`\n🎯 Iteration ${iteration + 1}:`);
    
    const result = await compareBackendsEvilly(
      () => {
        const evilInputs = Array.from({ length: 5 }, () => createEvilField());
        console.log(`Evil inputs: [${evilInputs.map(f => f.toString()).join(', ')}]`);
        return Poseidon.hash(evilInputs);
      },
      'poseidon_chaos'
    );
    
    if (!result.match) {
      console.log('💥 HASH DIFFERENCE DETECTED!');
      console.log(`Snarky hash: ${result.snarkyResult?.toString()}`);
      console.log(`Sparky hash: ${result.sparkyResult?.toString()}`);
      console.log(`Snarky error: ${result.snarkyError}`);
      console.log(`Sparky error: ${result.sparkyError}`);
      
      // Detailed analysis of the divergence
      if (result.snarkyResult && result.sparkyResult) {
        const snarkyBigInt = result.snarkyResult.toBigInt();
        const sparkyBigInt = result.sparkyResult.toBigInt();
        console.log(`Snarky (BigInt): ${snarkyBigInt}`);
        console.log(`Sparky (BigInt): ${sparkyBigInt}`);
        console.log(`XOR difference: ${(snarkyBigInt ^ sparkyBigInt).toString(16)}`);
        console.log(`Bit difference count: ${(snarkyBigInt ^ sparkyBigInt).toString(2).split('1').length - 1}`);
      }
      
      return; // Stop on first difference
    } else {
      console.log(`✅ Hashes match: ${result.snarkyResult?.toString()}`);
    }
  }
  
  console.log('\n🏁 No divergence found in 20 iterations.');
  
  // Test with specific problematic patterns
  console.log('\n🔬 Testing specific problematic patterns...');
  
  const problematicPatterns = [
    // All max values
    [Field('28948022309329048855892746252171976963363056481941560715954676764349967630336')],
    // Mix of max and zero
    [Field(0), Field('28948022309329048855892746252171976963363056481941560715954676764349967630336')],
    // Evil bit patterns
    [Field(0xDEADBEEF), Field(0xAAAAAAAA), Field(0x55555555)],
    // Large sequential values
    Array.from({ length: 10 }, (_, i) => Field(BigInt(i) * 10000000000000000000n)),
  ];
  
  for (let i = 0; i < problematicPatterns.length; i++) {
    console.log(`\n🧪 Testing pattern ${i + 1}:`);
    const pattern = problematicPatterns[i];
    console.log(`Pattern: [${pattern.map(f => f.toString()).join(', ')}]`);
    
    const result = await compareBackendsEvilly(
      () => Poseidon.hash(pattern),
      `problematic_pattern_${i + 1}`
    );
    
    if (!result.match) {
      console.log('💥 PATTERN DIVERGENCE DETECTED!');
      console.log(`Snarky: ${result.snarkyResult?.toString()}`);
      console.log(`Sparky: ${result.sparkyResult?.toString()}`);
      return;
    } else {
      console.log(`✅ Pattern consistent: ${result.snarkyResult?.toString()}`);
    }
  }
  
  console.log('\n🤔 No Poseidon divergence detected. The red team failure might be context-dependent.');
  console.log('Possible causes:');
  console.log('1. State corruption during rapid backend switching');
  console.log('2. Memory pressure affecting computation');
  console.log('3. Circuit compilation context affecting hash computation');
  console.log('4. Race conditions in concurrent operations');
}

// Run the evil test
runEvilPoseidonTest()
  .then(() => console.log('\n🏁 Evil Poseidon test complete.'))
  .catch(error => console.error('❌ Evil test failed:', error));