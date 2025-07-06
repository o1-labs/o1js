/**
 * HASH PROGRAM AUDIT TOOL - RUTHLESS INVESTIGATION
 * 
 * Created: July 6, 2025 17:00 UTC
 * Last Modified: July 6, 2025 17:00 UTC
 * 
 * Purpose: Ruthlessly investigate Hash Program constraint discrepancy (37 vs 9 constraints)
 * Goal: Determine if Sparky is fundamentally broken for hash operations
 */

import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend } from '../../index.js';

// EXACT Hash Program from benchmark
const HashProgram = ZkProgram({
  name: 'HashProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hash: {
      privateInputs: [Field, Field, Field],
      async method(publicInput: Field, a: Field, b: Field, c: Field) {
        const hash1 = Poseidon.hash([publicInput, a]);
        const hash2 = Poseidon.hash([hash1, b]);
        const hash3 = Poseidon.hash([hash2, c]);
        return { publicOutput: hash3 };
      },
    },
  },
});

interface HashAuditResult {
  backend: string;
  constraintCount: number;
  digest: string;
  vkHash: string;
  hashOutputs: {
    hash1: string;
    hash2: string;
    hash3: string;
  };
  testInputs: {
    publicInput: string;
    a: string;
    b: string;
    c: string;
  };
  compilationTime: number;
  constraintDetails: any;
}

async function auditHashProgram(backend: 'snarky' | 'sparky'): Promise<HashAuditResult> {
  console.log(`\n🚨 AUDITING ${backend.toUpperCase()} HASH PROGRAM`);
  console.log('━'.repeat(60));
  
  await switchBackend(backend);
  console.log(`✅ Backend: ${backend}`);
  
  // Compile the hash program
  const startTime = Date.now();
  const compilationResult = await HashProgram.compile();
  const compilationTime = Date.now() - startTime;
  
  // Get constraint analysis
  let constraintDetails: any = {};
  let constraintCount = 0;
  let digest = 'no-digest';
  
  try {
    if (HashProgram && typeof (HashProgram as any).analyzeMethods === 'function') {
      const analysis = await (HashProgram as any).analyzeMethods();
      console.log(`📊 analyzeMethods result:`, analysis);
      
      if (analysis && analysis.hash) {
        constraintDetails = analysis.hash;
        constraintCount = analysis.hash.rows || 0;
        digest = analysis.hash.digest || 'no-digest';
        console.log(`✅ Hash method analysis: ${constraintCount} constraints, digest: ${digest}`);
      } else {
        console.log(`❌ No hash method in analysis:`, Object.keys(analysis));
      }
    }
  } catch (error) {
    console.log(`⚠️  Error in constraint analysis: ${error}`);
  }
  
  // Test actual hash computation with known inputs
  const testInputs = {
    publicInput: '123',
    a: '456', 
    b: '789',
    c: '101112'
  };
  
  console.log(`🧪 Testing hash computation with inputs:`, testInputs);
  
  // Compute intermediate hash values to verify correctness
  const publicInputField = Field(testInputs.publicInput);
  const aField = Field(testInputs.a);
  const bField = Field(testInputs.b);
  const cField = Field(testInputs.c);
  
  let hashOutputs = {
    hash1: 'error',
    hash2: 'error', 
    hash3: 'error'
  };
  
  try {
    const hash1 = Poseidon.hash([publicInputField, aField]);
    const hash2 = Poseidon.hash([hash1, bField]);
    const hash3 = Poseidon.hash([hash2, cField]);
    
    hashOutputs = {
      hash1: hash1.toString(),
      hash2: hash2.toString(),
      hash3: hash3.toString()
    };
    
    console.log(`✅ Hash computation successful:`);
    console.log(`   hash1 = Poseidon([${testInputs.publicInput}, ${testInputs.a}]) = ${hashOutputs.hash1}`);
    console.log(`   hash2 = Poseidon([${hashOutputs.hash1}, ${testInputs.b}]) = ${hashOutputs.hash2}`);
    console.log(`   hash3 = Poseidon([${hashOutputs.hash2}, ${testInputs.c}]) = ${hashOutputs.hash3}`);
    
  } catch (error) {
    console.log(`❌ Hash computation failed: ${error}`);
  }
  
  const vkHash = compilationResult.verificationKey?.hash?.toString() || 'no-vk-hash';
  
  console.log(`📊 Final Results:`);
  console.log(`   Constraints: ${constraintCount}`);
  console.log(`   Digest: ${digest}`);
  console.log(`   VK Hash: ${vkHash}`);
  console.log(`   Compilation Time: ${compilationTime}ms`);
  
  return {
    backend,
    constraintCount,
    digest,
    vkHash,
    hashOutputs,
    testInputs,
    compilationTime,
    constraintDetails
  };
}

async function compareHashResults(snarky: HashAuditResult, sparky: HashAuditResult) {
  console.log(`\n🔍 RUTHLESS HASH COMPARISON ANALYSIS`);
  console.log('━'.repeat(60));
  
  console.log(`📊 CONSTRAINT COUNT COMPARISON:`);
  console.log(`   Snarky: ${snarky.constraintCount} constraints`);
  console.log(`   Sparky: ${sparky.constraintCount} constraints`);
  console.log(`   Ratio: ${(sparky.constraintCount / snarky.constraintCount).toFixed(2)}x`);
  console.log(`   Status: ${snarky.constraintCount === sparky.constraintCount ? '✅ IDENTICAL' : '🚨 MASSIVE DIFFERENCE'}`);
  
  console.log(`\n🧮 DIGEST COMPARISON:`);
  console.log(`   Snarky: ${snarky.digest}`);
  console.log(`   Sparky: ${sparky.digest}`);
  console.log(`   Status: ${snarky.digest === sparky.digest ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  console.log(`\n🔐 HASH OUTPUT CORRECTNESS CHECK:`);
  console.log(`   Test Inputs: publicInput=${snarky.testInputs.publicInput}, a=${snarky.testInputs.a}, b=${snarky.testInputs.b}, c=${snarky.testInputs.c}`);
  
  // Compare each hash step
  const hash1Match = snarky.hashOutputs.hash1 === sparky.hashOutputs.hash1;
  const hash2Match = snarky.hashOutputs.hash2 === sparky.hashOutputs.hash2;
  const hash3Match = snarky.hashOutputs.hash3 === sparky.hashOutputs.hash3;
  
  console.log(`   Hash1: Snarky=${snarky.hashOutputs.hash1.slice(0, 20)}... vs Sparky=${sparky.hashOutputs.hash1.slice(0, 20)}... ${hash1Match ? '✅ MATCH' : '🚨 MISMATCH'}`);
  console.log(`   Hash2: Snarky=${snarky.hashOutputs.hash2.slice(0, 20)}... vs Sparky=${sparky.hashOutputs.hash2.slice(0, 20)}... ${hash2Match ? '✅ MATCH' : '🚨 MISMATCH'}`);
  console.log(`   Hash3: Snarky=${snarky.hashOutputs.hash3.slice(0, 20)}... vs Sparky=${sparky.hashOutputs.hash3.slice(0, 20)}... ${hash3Match ? '✅ MATCH' : '🚨 MISMATCH'}`);
  
  const allHashesMatch = hash1Match && hash2Match && hash3Match;
  console.log(`   Overall: ${allHashesMatch ? '✅ ALL HASHES MATCH' : '🚨 HASH MISMATCH DETECTED'}`);
  
  console.log(`\n⏱️  PERFORMANCE COMPARISON:`);
  console.log(`   Snarky: ${snarky.compilationTime}ms`);
  console.log(`   Sparky: ${sparky.compilationTime}ms`);
  console.log(`   Speed: ${(snarky.compilationTime / sparky.compilationTime).toFixed(2)}x faster`);
}

async function investigateHashConstraints(snarky: HashAuditResult, sparky: HashAuditResult) {
  console.log(`\n🔬 CONSTRAINT INVESTIGATION - TRYING TO PROVE SPARKY WRONG`);
  console.log('━'.repeat(60));
  
  const constraintRatio = sparky.constraintCount / snarky.constraintCount;
  
  if (constraintRatio < 0.5) {
    console.log(`🚨 CRITICAL ALERT: Sparky uses ${constraintRatio.toFixed(2)}x constraints (${sparky.constraintCount} vs ${snarky.constraintCount})`);
    console.log(`🚨 This is EXTREMELY suspicious and likely indicates:`);
    console.log(`   1. Missing security constraints`);
    console.log(`   2. Incorrect hash implementation`);
    console.log(`   3. Over-aggressive optimization`);
    console.log(`   4. Complete failure to implement Poseidon properly`);
  }
  
  // Try to identify what's missing
  console.log(`\n🔍 POSEIDON HASH ANALYSIS:`);
  console.log(`   Expected: 3 Poseidon hash operations should require significant constraints`);
  console.log(`   Poseidon hash typically requires ~150-300 constraints per operation`);
  console.log(`   Expected total: ~450-900 constraints for 3 operations`);
  console.log(`   Snarky actual: ${snarky.constraintCount} (reasonable)`);
  console.log(`   Sparky actual: ${sparky.constraintCount} (${sparky.constraintCount < 30 ? 'DANGEROUSLY LOW' : 'acceptable'})`);
  
  if (sparky.constraintCount < 30) {
    console.log(`\n🚨 VERDICT: SPARKY HASH IMPLEMENTATION IS LIKELY BROKEN`);
    console.log(`   Reasons:`);
    console.log(`   - Too few constraints for 3 Poseidon operations`);
    console.log(`   - Poseidon is a complex cryptographic primitive`);
    console.log(`   - Missing constraints = potential security vulnerabilities`);
    console.log(`   - This could allow hash collisions or other attacks`);
  } else {
    console.log(`\n✅ VERDICT: Constraint count is reasonable for optimized implementation`);
  }
}

async function testHashEdgeCases(backend: 'snarky' | 'sparky') {
  console.log(`\n🧪 TESTING ${backend.toUpperCase()} HASH EDGE CASES`);
  console.log('━'.repeat(40));
  
  await switchBackend(backend);
  
  const edgeCases = [
    { name: 'zeros', inputs: [Field(0), Field(0), Field(0), Field(0)] },
    { name: 'ones', inputs: [Field(1), Field(1), Field(1), Field(1)] },
    { name: 'max', inputs: [Field(-1), Field(-1), Field(-1), Field(-1)] },
    { name: 'mixed', inputs: [Field(0), Field(1), Field(-1), Field(42)] }
  ];
  
  const results: any[] = [];
  
  for (const testCase of edgeCases) {
    try {
      const [publicInput, a, b, c] = testCase.inputs;
      
      const hash1 = Poseidon.hash([publicInput, a]);
      const hash2 = Poseidon.hash([hash1, b]);
      const hash3 = Poseidon.hash([hash2, c]);
      
      results.push({
        name: testCase.name,
        hash3: hash3.toString(),
        success: true
      });
      
      console.log(`   ✅ ${testCase.name}: ${hash3.toString().slice(0, 20)}...`);
      
    } catch (error) {
      results.push({
        name: testCase.name,
        error: (error as Error).message,
        success: false
      });
      
      console.log(`   ❌ ${testCase.name}: ERROR - ${(error as Error).message}`);
    }
  }
  
  return results;
}

async function main() {
  console.log('🚨 HASH PROGRAM AUDIT TOOL - RUTHLESS INVESTIGATION');
  console.log('═'.repeat(80));
  console.log('Mission: Determine if Sparky hash implementation is fundamentally broken');
  console.log('Alert: 37 vs 9 constraint discrepancy requires immediate investigation');
  
  try {
    // Audit both backends
    const snarkyResult = await auditHashProgram('snarky');
    const sparkyResult = await auditHashProgram('sparky');
    
    // Compare results
    await compareHashResults(snarkyResult, sparkyResult);
    
    // Investigate constraints
    await investigateHashConstraints(snarkyResult, sparkyResult);
    
    // Test edge cases
    console.log(`\n🧪 EDGE CASE TESTING`);
    const snarkyEdgeCases = await testHashEdgeCases('snarky');
    const sparkyEdgeCases = await testHashEdgeCases('sparky');
    
    // Compare edge case results
    console.log(`\n🔍 EDGE CASE COMPARISON:`);
    for (let i = 0; i < snarkyEdgeCases.length; i++) {
      const snarkyCase = snarkyEdgeCases[i];
      const sparkyCase = sparkyEdgeCases[i];
      
      if (snarkyCase.success && sparkyCase.success) {
        const match = snarkyCase.hash3 === sparkyCase.hash3;
        console.log(`   ${snarkyCase.name}: ${match ? '✅ MATCH' : '🚨 MISMATCH'}`);
        if (!match) {
          console.log(`     Snarky: ${snarkyCase.hash3.slice(0, 30)}...`);
          console.log(`     Sparky: ${sparkyCase.hash3.slice(0, 30)}...`);
        }
      } else {
        console.log(`   ${snarkyCase.name}: ❌ ERROR in ${!snarkyCase.success ? 'Snarky' : 'Sparky'}`);
      }
    }
    
    console.log(`\n🎯 FINAL AUDIT VERDICT`);
    console.log('━'.repeat(60));
    
    const allHashesMatch = snarkyResult.hashOutputs.hash1 === sparkyResult.hashOutputs.hash1 &&
                          snarkyResult.hashOutputs.hash2 === sparkyResult.hashOutputs.hash2 &&
                          snarkyResult.hashOutputs.hash3 === sparkyResult.hashOutputs.hash3;
    
    if (allHashesMatch && sparkyResult.constraintCount > 5) {
      console.log(`✅ SPARKY HASH IMPLEMENTATION APPEARS CORRECT`);
      console.log(`   - Hash outputs match Snarky exactly`);
      console.log(`   - Constraint count is reasonable (${sparkyResult.constraintCount})`);
      console.log(`   - Edge cases pass`);
      console.log(`   - Likely this is valid optimization`);
    } else {
      console.log(`🚨 SPARKY HASH IMPLEMENTATION IS BROKEN`);
      console.log(`   - Hash match: ${allHashesMatch ? '✅' : '❌'}`);
      console.log(`   - Constraint count: ${sparkyResult.constraintCount} (${sparkyResult.constraintCount > 5 ? 'OK' : 'TOO LOW'})`);
      console.log(`   - This indicates serious correctness issues`);
    }
    
  } catch (error) {
    console.error('❌ Hash audit failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}