/**
 * VK BENCHMARK COMPARISON UTILITY
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Compare VK generation between simple and complex circuits to identify patterns
 * Strategy: Use the same circuits as existing benchmarks for consistency
 */

import { Field, ZkProgram, switchBackend } from '../../index.js';
import { analyzeConstraintSystem, compareVKs } from './vk-debug-harness.js';

// =============================================================================
// BENCHMARK CIRCUIT DEFINITIONS (from existing benchmarks)
// =============================================================================

// Simple arithmetic circuit (matches run-zkprogram-compilation-benchmark.ts)
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

// Field multiplication circuit
const FieldMultiplicationProgram = ZkProgram({
  name: 'FieldMultiplication',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    multiply: {
      privateInputs: [Field, Field],
      async method(publicInput: Field, a: Field, b: Field) {
        const product = a.mul(b);
        const result = publicInput.add(product);
        return { publicOutput: result };
      },
    },
  },
});

// Hash computation circuit
const HashProgram = ZkProgram({
  name: 'HashProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hash: {
      privateInputs: [Field, Field],
      async method(publicInput: Field, input1: Field, input2: Field) {
        // Simple hash-like computation
        const hash = input1.mul(input2).add(publicInput);
        return { publicOutput: hash };
      },
    },
  },
});

// Range check circuit
const RangeCheckProgram = ZkProgram({
  name: 'RangeCheck',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    checkRange: {
      privateInputs: [Field],
      async method(publicInput: Field, value: Field) {
        // Simple range check: value should be less than 1000
        const maxValue = Field(1000);
        const difference = maxValue.sub(value);
        // This creates a constraint without using assertLessThan
        return { publicOutput: difference };
      },
    },
  },
});

// =============================================================================
// BENCHMARK ANALYSIS INTERFACE
// =============================================================================

interface BenchmarkResult {
  circuitName: string;
  snarkyConstraints: number;
  sparkyConstraints: number;
  snarkyVKHash: string;
  sparkyVKHash: string;
  snarkyDigest: string;
  sparkyDigest: string;
  vkHashMatch: boolean;
  constraintCountMatch: boolean;
  digestMatch: boolean;
  complexity: 'simple' | 'medium' | 'complex';
}

interface BenchmarkSummary {
  totalCircuits: number;
  matchingVKs: number;
  mismatchingVKs: number;
  matchingConstraints: number;
  mismatchingConstraints: number;
  simpleCircuitMatches: number;
  mediumCircuitMatches: number;
  complexCircuitMatches: number;
  results: BenchmarkResult[];
}

// =============================================================================
// BENCHMARK EXECUTION
// =============================================================================

async function runBenchmarkCircuit(
  name: string,
  compileFunction: () => Promise<any>,
  complexity: 'simple' | 'medium' | 'complex'
): Promise<BenchmarkResult> {
  console.log(`\n🔍 BENCHMARKING: ${name} (${complexity})`);
  console.log('─'.repeat(60));

  const snarkyAnalysis = await analyzeConstraintSystem('snarky', name, compileFunction);
  const sparkyAnalysis = await analyzeConstraintSystem('sparky', name, compileFunction);
  const comparison = compareVKs(snarkyAnalysis, sparkyAnalysis);

  const result: BenchmarkResult = {
    circuitName: name,
    snarkyConstraints: snarkyAnalysis.constraintCount,
    sparkyConstraints: sparkyAnalysis.constraintCount,
    snarkyVKHash: snarkyAnalysis.vkComponents.hash,
    sparkyVKHash: sparkyAnalysis.vkComponents.hash,
    snarkyDigest: snarkyAnalysis.digest,
    sparkyDigest: sparkyAnalysis.digest,
    vkHashMatch: comparison.hashMatch,
    constraintCountMatch: comparison.constraintCountMatch,
    digestMatch: comparison.digestMatch,
    complexity,
  };

  console.log(`📊 Constraints: ${result.snarkyConstraints} (Snarky) vs ${result.sparkyConstraints} (Sparky)`);
  console.log(`📊 VK Hash: ${result.vkHashMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
  console.log(`📊 Digest: ${result.digestMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  return result;
}

export async function runVKBenchmarkComparison(): Promise<BenchmarkSummary> {
  console.log('🚀 VK BENCHMARK COMPARISON');
  console.log('=' .repeat(80));

  const circuits = [
    { name: 'SimpleArithmetic', compileFunction: () => SimpleArithmeticProgram.compile(), complexity: 'simple' as const },
    { name: 'FieldMultiplication', compileFunction: () => FieldMultiplicationProgram.compile(), complexity: 'simple' as const },
    { name: 'HashProgram', compileFunction: () => HashProgram.compile(), complexity: 'medium' as const },
    { name: 'RangeCheck', compileFunction: () => RangeCheckProgram.compile(), complexity: 'medium' as const },
  ];

  const results: BenchmarkResult[] = [];

  for (const circuit of circuits) {
    try {
      const result = await runBenchmarkCircuit(circuit.name, circuit.compileFunction, circuit.complexity);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to benchmark ${circuit.name}:`, error);
    }
  }

  // Generate summary
  const summary: BenchmarkSummary = {
    totalCircuits: results.length,
    matchingVKs: results.filter(r => r.vkHashMatch).length,
    mismatchingVKs: results.filter(r => !r.vkHashMatch).length,
    matchingConstraints: results.filter(r => r.constraintCountMatch).length,
    mismatchingConstraints: results.filter(r => !r.constraintCountMatch).length,
    simpleCircuitMatches: results.filter(r => r.complexity === 'simple' && r.vkHashMatch).length,
    mediumCircuitMatches: results.filter(r => r.complexity === 'medium' && r.vkHashMatch).length,
    complexCircuitMatches: results.filter(r => r.complexity === 'complex' && r.vkHashMatch).length,
    results,
  };

  return summary;
}

// =============================================================================
// PATTERN ANALYSIS
// =============================================================================

export function analyzeVKPatterns(summary: BenchmarkSummary): void {
  console.log('\n🔍 VK PATTERN ANALYSIS');
  console.log('=' .repeat(80));

  // Check if all simple circuits match
  const simpleCircuits = summary.results.filter(r => r.complexity === 'simple');
  const simpleMatches = simpleCircuits.filter(r => r.vkHashMatch);
  
  console.log(`📊 Simple Circuits: ${simpleMatches.length}/${simpleCircuits.length} VK matches`);
  
  if (simpleMatches.length === 0) {
    console.log('❌ PATTERN: Even simple circuits don\'t match - fundamental issue');
  } else if (simpleMatches.length === simpleCircuits.length) {
    console.log('✅ PATTERN: All simple circuits match - issue may be with complexity');
  } else {
    console.log('⚠️  PATTERN: Some simple circuits match - inconsistent behavior');
  }

  // Check constraint count patterns
  const constraintMismatches = summary.results.filter(r => !r.constraintCountMatch);
  if (constraintMismatches.length > 0) {
    console.log(`❌ CONSTRAINT MISMATCH: ${constraintMismatches.length} circuits have different constraint counts`);
    constraintMismatches.forEach(r => {
      console.log(`  - ${r.circuitName}: ${r.snarkyConstraints} vs ${r.sparkyConstraints}`);
    });
  } else {
    console.log('✅ CONSTRAINT CONSISTENCY: All circuits have matching constraint counts');
  }

  // Check digest patterns
  const digestMismatches = summary.results.filter(r => !r.digestMatch);
  if (digestMismatches.length > 0) {
    console.log(`❌ DIGEST MISMATCH: ${digestMismatches.length} circuits have different digests`);
    digestMismatches.forEach(r => {
      console.log(`  - ${r.circuitName}: ${r.snarkyDigest} vs ${r.sparkyDigest}`);
    });
  } else {
    console.log('✅ DIGEST CONSISTENCY: All circuits have matching digests');
  }

  // Generate recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  
  if (summary.matchingVKs === 0) {
    console.log('🔍 CRITICAL: No VK matches found - fundamental implementation issue');
    console.log('  1. Check basic permutation polynomial generation');
    console.log('  2. Verify sigma commitment construction');
    console.log('  3. Debug domain setup and initialization');
  } else if (summary.matchingVKs === summary.totalCircuits) {
    console.log('✅ EXCELLENT: All VKs match - implementation is working correctly!');
  } else {
    console.log('⚠️  PARTIAL: Some VKs match - circuit-specific issues');
    console.log('  1. Focus on failing circuits to identify patterns');
    console.log('  2. Check for circuit complexity thresholds');
    console.log('  3. Verify specific gate implementations');
  }
}

// =============================================================================
// DETAILED REPORTING
// =============================================================================

export function generateBenchmarkReport(summary: BenchmarkSummary): string {
  const report = [];
  
  report.push('VK BENCHMARK COMPARISON REPORT');
  report.push('=' .repeat(80));
  
  report.push(`\n📊 SUMMARY:`);
  report.push(`  Total circuits tested: ${summary.totalCircuits}`);
  report.push(`  VK matches: ${summary.matchingVKs}`);
  report.push(`  VK mismatches: ${summary.mismatchingVKs}`);
  report.push(`  Constraint matches: ${summary.matchingConstraints}`);
  report.push(`  Constraint mismatches: ${summary.mismatchingConstraints}`);
  report.push(`  Success rate: ${Math.round((summary.matchingVKs / summary.totalCircuits) * 100)}%`);
  
  report.push(`\n📊 BY COMPLEXITY:`);
  report.push(`  Simple circuit matches: ${summary.simpleCircuitMatches}`);
  report.push(`  Medium circuit matches: ${summary.mediumCircuitMatches}`);
  report.push(`  Complex circuit matches: ${summary.complexCircuitMatches}`);
  
  report.push(`\n📋 DETAILED RESULTS:`);
  summary.results.forEach((result, i) => {
    report.push(`\n${i + 1}. ${result.circuitName} (${result.complexity}):`);
    report.push(`   VK Hash: ${result.vkHashMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    report.push(`   Constraints: ${result.snarkyConstraints} vs ${result.sparkyConstraints} ${result.constraintCountMatch ? '✅' : '❌'}`);
    report.push(`   Digest: ${result.digestMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    if (!result.vkHashMatch) {
      report.push(`   Snarky VK Hash: ${result.snarkyVKHash}`);
      report.push(`   Sparky VK Hash: ${result.sparkyVKHash}`);
    }
  });
  
  return report.join('\n');
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export {
  SimpleArithmeticProgram,
  FieldMultiplicationProgram,
  HashProgram,
  RangeCheckProgram,
  BenchmarkResult,
  BenchmarkSummary,
};