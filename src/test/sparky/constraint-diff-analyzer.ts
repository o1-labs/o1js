/**
 * PHASE 3: CONSTRAINT DIFF ANALYZER
 * 
 * Created: July 6, 2025 15:45 UTC
 * Last Modified: July 6, 2025 15:45 UTC
 * 
 * Purpose: Direct analysis of constraint generation differences causing VK hash incompatibility.
 * Focus: Simple Arithmetic program with perfect constraint count parity but different digests.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from '../../index.js';

// Simple Arithmetic Program - the perfect test case for VK analysis
const SimpleArithmeticProgram = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        const result = publicInput.add(privateInput);
        return { publicOutput: result };
      },
    },
  },
});

interface DetailedConstraintAnalysis {
  backend: string;
  constraintCount: number;
  digest: string;
  vkHash: string;
  gates: any[];
  constraintDetails: any;
  compilationTime: number;
}

async function analyzeConstraintGeneration(backend: 'snarky' | 'sparky'): Promise<DetailedConstraintAnalysis> {
  console.log(`\n🔍 ANALYZING ${backend.toUpperCase()} CONSTRAINT GENERATION`);
  console.log('━'.repeat(60));
  
  // Switch to target backend
  await switchBackend(backend);
  console.log(`✅ Switched to ${backend} backend`);
  
  // Compile and capture detailed analysis
  const startTime = Date.now();
  const compilationResult = await SimpleArithmeticProgram.compile();
  const compilationTime = Date.now() - startTime;
  
  // Get detailed constraint analysis - this is what the benchmark uses
  const methods = (SimpleArithmeticProgram as any).analyzeMethods();
  const computeMethod = methods?.compute;
  
  if (!computeMethod) {
    throw new Error(`No compute method analysis available for ${backend}`);
  }
  
  console.log(`📊 Constraint count: ${computeMethod.rows}`);
  console.log(`🧮 Digest: ${computeMethod.digest}`);
  console.log(`🔐 VK hash: ${compilationResult.verificationKey?.hash || 'N/A'}`);
  console.log(`🚪 Gates: ${computeMethod.gates?.length || 0}`);
  console.log(`⏱️  Compilation time: ${compilationTime}ms`);
  
  // Log detailed gate information
  if (computeMethod.gates && computeMethod.gates.length > 0) {
    console.log(`\n🔧 GATE DETAILS FOR ${backend.toUpperCase()}:`);
    computeMethod.gates.forEach((gate: any, index: number) => {
      console.log(`  Gate ${index}:`, JSON.stringify(gate, null, 2));
    });
  }
  
  // Log constraint summary if available
  if (computeMethod.summary) {
    console.log(`\n📋 CONSTRAINT SUMMARY FOR ${backend.toUpperCase()}:`);
    computeMethod.summary();
  }
  
  return {
    backend,
    constraintCount: computeMethod.rows,
    digest: computeMethod.digest,
    vkHash: compilationResult.verificationKey?.hash?.toString() || '',
    gates: computeMethod.gates || [],
    constraintDetails: computeMethod,
    compilationTime
  };
}

async function compareConstraintGeneration(
  snarkyAnalysis: DetailedConstraintAnalysis, 
  sparkyAnalysis: DetailedConstraintAnalysis
) {
  console.log(`\n🎯 CONSTRAINT GENERATION COMPARISON`);
  console.log('━'.repeat(60));
  
  // Basic metrics comparison
  console.log(`📊 CONSTRAINT COUNTS:`);
  console.log(`  Snarky: ${snarkyAnalysis.constraintCount}`);
  console.log(`  Sparky: ${sparkyAnalysis.constraintCount}`);
  console.log(`  Status: ${snarkyAnalysis.constraintCount === sparkyAnalysis.constraintCount ? '✅ PERFECT PARITY' : '❌ DIFFERENT'}`);
  
  // Digest comparison - THIS IS THE CORE ISSUE
  console.log(`\n🧮 CONSTRAINT DIGESTS (ROOT CAUSE OF VK DIFFERENCES):`);
  console.log(`  Snarky: ${snarkyAnalysis.digest}`);
  console.log(`  Sparky: ${sparkyAnalysis.digest}`);
  console.log(`  Status: ${snarkyAnalysis.digest === sparkyAnalysis.digest ? '✅ IDENTICAL' : '❌ DIFFERENT - ROOT CAUSE!'}`);
  
  // VK hash comparison
  console.log(`\n🔐 VK HASHES:`);
  console.log(`  Snarky: ${snarkyAnalysis.vkHash}`);
  console.log(`  Sparky: ${sparkyAnalysis.vkHash}`);
  console.log(`  Status: ${snarkyAnalysis.vkHash === sparkyAnalysis.vkHash ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  // Gate structure comparison
  console.log(`\n🚪 GATE STRUCTURES:`);
  console.log(`  Snarky gates: ${snarkyAnalysis.gates.length}`);
  console.log(`  Sparky gates: ${sparkyAnalysis.gates.length}`);
  
  // Detailed gate comparison
  if (snarkyAnalysis.gates.length > 0 || sparkyAnalysis.gates.length > 0) {
    console.log(`\n🔧 DETAILED GATE COMPARISON:`);
    
    const maxGates = Math.max(snarkyAnalysis.gates.length, sparkyAnalysis.gates.length);
    for (let i = 0; i < maxGates; i++) {
      const snarkyGate = snarkyAnalysis.gates[i];
      const sparkyGate = sparkyAnalysis.gates[i];
      
      console.log(`\n  Gate ${i}:`);
      console.log(`    Snarky:`, snarkyGate ? JSON.stringify(snarkyGate, null, 6) : 'MISSING');
      console.log(`    Sparky:`, sparkyGate ? JSON.stringify(sparkyGate, null, 6) : 'MISSING');
      
      if (snarkyGate && sparkyGate) {
        const identical = JSON.stringify(snarkyGate) === JSON.stringify(sparkyGate);
        console.log(`    Status: ${identical ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
        
        if (!identical) {
          console.log(`    🚨 DIFFERENCE DETECTED - Contributing to digest mismatch`);
        }
      }
    }
  }
  
  // Performance comparison
  console.log(`\n⏱️  COMPILATION PERFORMANCE:`);
  console.log(`  Snarky: ${snarkyAnalysis.compilationTime}ms`);
  console.log(`  Sparky: ${sparkyAnalysis.compilationTime}ms`);
  console.log(`  Ratio: ${(sparkyAnalysis.compilationTime / snarkyAnalysis.compilationTime).toFixed(2)}x`);
}

async function identifyRootCauses(
  snarkyAnalysis: DetailedConstraintAnalysis, 
  sparkyAnalysis: DetailedConstraintAnalysis
) {
  console.log(`\n🎯 ROOT CAUSE ANALYSIS FOR VK PARITY CRISIS`);
  console.log('━'.repeat(60));
  
  const issues: string[] = [];
  
  // Primary issue: digest differences
  if (snarkyAnalysis.digest !== sparkyAnalysis.digest) {
    issues.push(`🚨 CRITICAL: Constraint digests differ (${snarkyAnalysis.digest} vs ${sparkyAnalysis.digest})`);
    console.log(`❌ CONSTRAINT DIGEST MISMATCH:`);
    console.log(`   This is the PRIMARY ROOT CAUSE of VK hash incompatibility`);
    console.log(`   Digests represent the mathematical structure of constraints`);
    console.log(`   Different digests = different constraint representations`);
  }
  
  // Secondary issues
  if (snarkyAnalysis.constraintCount !== sparkyAnalysis.constraintCount) {
    issues.push(`Constraint count mismatch: ${snarkyAnalysis.constraintCount} vs ${sparkyAnalysis.constraintCount}`);
  }
  
  if (snarkyAnalysis.gates.length !== sparkyAnalysis.gates.length) {
    issues.push(`Gate count mismatch: ${snarkyAnalysis.gates.length} vs ${sparkyAnalysis.gates.length}`);
  }
  
  // Gate structure analysis
  let gatesDiffer = false;
  const maxGates = Math.max(snarkyAnalysis.gates.length, sparkyAnalysis.gates.length);
  for (let i = 0; i < maxGates; i++) {
    const snarkyGate = snarkyAnalysis.gates[i];
    const sparkyGate = sparkyAnalysis.gates[i];
    
    if (JSON.stringify(snarkyGate) !== JSON.stringify(sparkyGate)) {
      gatesDiffer = true;
      break;
    }
  }
  
  if (gatesDiffer) {
    issues.push(`Gate structure/content differences detected`);
  }
  
  console.log(`\n🚨 IDENTIFIED ROOT CAUSES:`);
  issues.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue}`);
  });
  
  console.log(`\n💡 HYPOTHESIS FOR DIGEST DIFFERENCES:`);
  console.log(`   1. Variable ID assignment differences`);
  console.log(`   2. Constraint ordering differences`);
  console.log(`   3. Field coefficient representation differences`);
  console.log(`   4. Gate type/structure differences`);
  console.log(`   5. Internal constraint system metadata differences`);
  
  console.log(`\n🎯 RECOMMENDED INVESTIGATION PRIORITIES:`);
  console.log(`   1. 🔥 HIGH: Variable ID allocation pattern comparison`);
  console.log(`   2. 🔥 HIGH: Constraint ordering analysis`);
  console.log(`   3. 🔥 HIGH: Gate coefficient comparison`);
  console.log(`   4. 🔺 MED: Field element serialization audit`);
  console.log(`   5. 🔺 MED: Internal metadata structure comparison`);
}

async function main() {
  console.log('🎯 CONSTRAINT DIFF ANALYZER - PHASE 3 VK PARITY INVESTIGATION');
  console.log('═'.repeat(80));
  console.log('Target: Simple Arithmetic Program (perfect constraint parity case)');
  console.log('Goal: Identify why identical constraint counts produce different VK hashes');
  
  try {
    // Analyze Snarky constraint generation
    const snarkyAnalysis = await analyzeConstraintGeneration('snarky');
    
    // Analyze Sparky constraint generation  
    const sparkyAnalysis = await analyzeConstraintGeneration('sparky');
    
    // Compare constraint generation
    await compareConstraintGeneration(snarkyAnalysis, sparkyAnalysis);
    
    // Identify root causes
    await identifyRootCauses(snarkyAnalysis, sparkyAnalysis);
    
    console.log(`\n✅ CONSTRAINT DIFF ANALYSIS COMPLETE`);
    console.log(`📊 Constraint Parity: ${snarkyAnalysis.constraintCount === sparkyAnalysis.constraintCount ? 'MAINTAINED' : 'LOST'}`);
    console.log(`🧮 Digest Parity: ${snarkyAnalysis.digest === sparkyAnalysis.digest ? 'MAINTAINED' : 'LOST - ROOT CAUSE'}`);
    console.log(`🔐 VK Parity: ${snarkyAnalysis.vkHash === sparkyAnalysis.vkHash ? 'ACHIEVED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Constraint diff analysis failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}