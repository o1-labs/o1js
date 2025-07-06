/**
 * PHASE 3: VK PARITY CRISIS ANALYSIS TOOL
 * 
 * Created: July 6, 2025 15:30 UTC
 * Last Modified: July 6, 2025 15:30 UTC
 * 
 * Purpose: Deep analysis of constraint differences causing VK hash incompatibility
 * between Snarky and Sparky backends despite optimal constraint count parity.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from '../../index.js';

// Simple Arithmetic Program - Perfect 1:1 constraint parity but different VK hashes
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

interface ConstraintDetail {
  backend: string;
  constraintCount: number;
  vkHash: string;
  gates: any[];
  compilationTime: number;
  constraintSystem: any;
  digest: string;
}

async function analyzeConstraintDetails(backend: 'snarky' | 'sparky'): Promise<ConstraintDetail> {
  console.log(`\n🔍 ANALYZING ${backend.toUpperCase()} CONSTRAINT DETAILS`);
  console.log('━'.repeat(50));
  
  // Switch to target backend
  await switchBackend(backend);
  console.log(`✅ Switched to ${backend} backend`);
  
  // Compile and capture details
  const startTime = Date.now();
  const result = await SimpleArithmeticProgram.compile();
  const compilationTime = Date.now() - startTime;
  
  // Extract detailed constraint information
  const constraintCount = result.verificationKey?.data?.length || 0;
  const vkHash = result.verificationKey?.hash?.toString() || 'N/A';
  
  // Try to get more detailed constraint system info
  let constraintSystem: any = {};
  let digest = 'N/A';
  let gates: any[] = [];
  
  try {
    // Access the constraint system details
    const methods = (SimpleArithmeticProgram as any).analyzeMethods();
    if (methods?.compute) {
      constraintSystem = methods.compute;
      digest = methods.compute.digest || 'N/A';
      gates = methods.compute.gates || [];
      
      console.log(`📊 Constraint count: ${methods.compute.rows}`);
      console.log(`🔐 VK hash: ${vkHash}`);
      console.log(`🧮 Digest: ${digest}`);
      console.log(`🚪 Gates count: ${gates.length}`);
      
      // Log gate details if available
      if (gates.length > 0) {
        console.log(`🔧 Gate details:`);
        gates.forEach((gate, index) => {
          console.log(`  Gate ${index}:`, gate);
        });
      }
      
      // Log constraint system summary
      if (methods.compute.summary) {
        console.log(`📋 Constraint summary:`);
        methods.compute.summary();
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not extract detailed constraint system: ${error}`);
  }
  
  return {
    backend,
    constraintCount: constraintSystem.rows || constraintCount,
    vkHash,
    gates,
    compilationTime,
    constraintSystem,
    digest
  };
}

async function compareConstraintStructures(snarkyDetails: ConstraintDetail, sparkyDetails: ConstraintDetail) {
  console.log(`\n🔬 CONSTRAINT STRUCTURE COMPARISON`);
  console.log('━'.repeat(50));
  
  console.log(`📊 CONSTRAINT COUNTS:`);
  console.log(`  Snarky: ${snarkyDetails.constraintCount}`);
  console.log(`  Sparky: ${sparkyDetails.constraintCount}`);
  console.log(`  Ratio: ${(sparkyDetails.constraintCount / snarkyDetails.constraintCount).toFixed(2)}x`);
  console.log(`  Status: ${snarkyDetails.constraintCount === sparkyDetails.constraintCount ? '✅ PERFECT PARITY' : '❌ DIFFERENT'}`);
  
  console.log(`\n🔐 VK HASH COMPARISON:`);
  console.log(`  Snarky: ${snarkyDetails.vkHash}`);
  console.log(`  Sparky: ${sparkyDetails.vkHash}`);
  console.log(`  Status: ${snarkyDetails.vkHash === sparkyDetails.vkHash ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  console.log(`\n🧮 DIGEST COMPARISON:`);
  console.log(`  Snarky: ${snarkyDetails.digest}`);
  console.log(`  Sparky: ${sparkyDetails.digest}`);
  console.log(`  Status: ${snarkyDetails.digest === sparkyDetails.digest ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  console.log(`\n🚪 GATE STRUCTURE COMPARISON:`);
  console.log(`  Snarky gates: ${snarkyDetails.gates.length}`);
  console.log(`  Sparky gates: ${sparkyDetails.gates.length}`);
  
  // Compare gate structures in detail
  if (snarkyDetails.gates.length > 0 && sparkyDetails.gates.length > 0) {
    console.log(`\n🔧 DETAILED GATE ANALYSIS:`);
    
    const maxGates = Math.max(snarkyDetails.gates.length, sparkyDetails.gates.length);
    for (let i = 0; i < maxGates; i++) {
      const snarkyGate = snarkyDetails.gates[i];
      const sparkyGate = sparkyDetails.gates[i];
      
      console.log(`\n  Gate ${i}:`);
      if (snarkyGate) {
        console.log(`    Snarky:`, JSON.stringify(snarkyGate, null, 2));
      } else {
        console.log(`    Snarky: MISSING`);
      }
      
      if (sparkyGate) {
        console.log(`    Sparky:`, JSON.stringify(sparkyGate, null, 2));
      } else {
        console.log(`    Sparky: MISSING`);
      }
      
      if (snarkyGate && sparkyGate) {
        const identical = JSON.stringify(snarkyGate) === JSON.stringify(sparkyGate);
        console.log(`    Status: ${identical ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
      }
    }
  }
  
  console.log(`\n⏱️  COMPILATION TIME COMPARISON:`);
  console.log(`  Snarky: ${snarkyDetails.compilationTime}ms`);
  console.log(`  Sparky: ${sparkyDetails.compilationTime}ms`);
  console.log(`  Ratio: ${(sparkyDetails.compilationTime / snarkyDetails.compilationTime).toFixed(2)}x`);
}

async function identifyVKDifferences(snarkyDetails: ConstraintDetail, sparkyDetails: ConstraintDetail) {
  console.log(`\n🎯 VK PARITY CRISIS ROOT CAUSE ANALYSIS`);
  console.log('━'.repeat(50));
  
  const issues: string[] = [];
  
  // Check constraint count parity
  if (snarkyDetails.constraintCount !== sparkyDetails.constraintCount) {
    issues.push(`Constraint count mismatch: ${snarkyDetails.constraintCount} vs ${sparkyDetails.constraintCount}`);
  }
  
  // Check digest differences
  if (snarkyDetails.digest !== sparkyDetails.digest) {
    issues.push(`Constraint digest mismatch: ${snarkyDetails.digest} vs ${sparkyDetails.digest}`);
  }
  
  // Check gate structure differences
  if (snarkyDetails.gates.length !== sparkyDetails.gates.length) {
    issues.push(`Gate count mismatch: ${snarkyDetails.gates.length} vs ${sparkyDetails.gates.length}`);
  }
  
  // Check for gate content differences
  let gatesDiffer = false;
  const maxGates = Math.max(snarkyDetails.gates.length, sparkyDetails.gates.length);
  for (let i = 0; i < maxGates; i++) {
    const snarkyGate = snarkyDetails.gates[i];
    const sparkyGate = sparkyDetails.gates[i];
    
    if (JSON.stringify(snarkyGate) !== JSON.stringify(sparkyGate)) {
      gatesDiffer = true;
      break;
    }
  }
  
  if (gatesDiffer) {
    issues.push(`Gate structure/content differences detected`);
  }
  
  console.log(`🚨 IDENTIFIED ISSUES:`);
  if (issues.length === 0) {
    console.log(`  🤔 NO OBVIOUS STRUCTURAL DIFFERENCES DETECTED`);
    console.log(`  💡 VK hash difference may be due to:`);
    console.log(`     - Variable ID assignment differences`);
    console.log(`     - Coefficient representation differences`);
    console.log(`     - Internal constraint system metadata`);
    console.log(`     - Field element serialization differences`);
  } else {
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  console.log(`\n💡 RECOMMENDED NEXT STEPS:`);
  console.log(`  1. Variable ID allocation analysis`);
  console.log(`  2. Constraint coefficient comparison`);
  console.log(`  3. Field element representation audit`);
  console.log(`  4. Internal constraint system metadata inspection`);
}

async function main() {
  console.log('🎯 VK PARITY CRISIS ANALYSIS TOOL');
  console.log('================================');
  console.log('Purpose: Identify root causes of VK hash incompatibility');
  console.log('Target: Simple Arithmetic Program (perfect constraint parity case)');
  
  try {
    // Analyze Snarky backend
    const snarkyDetails = await analyzeConstraintDetails('snarky');
    
    // Analyze Sparky backend  
    const sparkyDetails = await analyzeConstraintDetails('sparky');
    
    // Compare structures
    await compareConstraintStructures(snarkyDetails, sparkyDetails);
    
    // Identify VK differences
    await identifyVKDifferences(snarkyDetails, sparkyDetails);
    
    console.log(`\n✅ ANALYSIS COMPLETE`);
    console.log(`📊 Results: ${snarkyDetails.constraintCount === sparkyDetails.constraintCount ? 'Constraint parity maintained' : 'Constraint parity lost'}`);
    console.log(`🔐 VK Status: ${snarkyDetails.vkHash === sparkyDetails.vkHash ? 'VK hashes match' : 'VK hashes differ'}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}