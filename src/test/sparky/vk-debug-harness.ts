/**
 * VK STRUCTURE COMPARISON DEBUG HARNESS
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Comprehensive VK debugging infrastructure for direct comparison between Snarky and Sparky
 * Features:
 * - Zero-constraint circuit analysis
 * - VK component extraction and comparison
 * - Permutation data debugging
 * - Constraint system detailed analysis
 * - Before/after implementation validation
 */

import { Field, ZkProgram, SmartContract, State, state, method, switchBackend, getCurrentBackend, Provable, Mina } from '../../index.js';

// =============================================================================
// ZERO-CONSTRAINT TEST MATRIX
// =============================================================================

// Test 1: Completely empty circuit (no constraints, no public inputs)
const EmptyCircuit = ZkProgram({
  name: 'EmptyCircuit',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    empty: {
      privateInputs: [],
      async method(publicInput: Field) {
        // NO constraints at all - just return the input
        return { publicOutput: publicInput };
      },
    },
  },
});

// Test 2: Empty circuit with multiple public inputs
const EmptyMultiInputCircuit = ZkProgram({
  name: 'EmptyMultiInput',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    passthrough: {
      privateInputs: [Field, Field],
      async method(publicInput: Field, privateInput1: Field, privateInput2: Field) {
        // NO constraints - just return one of the inputs
        return { publicOutput: publicInput };
      },
    },
  },
});

// Test 3: Single trivial constraint (x = x)
const TrivialConstraintCircuit = ZkProgram({
  name: 'TrivialConstraint',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    trivial: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        // Single trivial constraint: privateInput = privateInput
        privateInput.assertEquals(privateInput);
        return { publicOutput: publicInput };
      },
    },
  },
});

// Test 4: Zero-constraint SmartContract
class EmptyContract extends SmartContract {
  @state(Field) value = State();

  init() {
    super.init();
    this.value.set(Field(0));
  }

  @method async empty() {
    // No constraints - just get the value without using it
    const current = this.value.get();
    // Don't set anything - minimal constraint footprint
  }
}

// =============================================================================
// VK COMPONENT EXTRACTION UTILITIES
// =============================================================================

interface VKComponents {
  hash: string;
  dataLength: number;
  data: string;
  parsedData?: any;
  sigmaCommitments?: any[];
  permutationData?: any;
  domainInfo?: any;
  rawInternalData?: any;
}

interface ConstraintSystemAnalysis {
  backend: string;
  circuitName: string;
  constraintCount: number;
  publicInputCount: number;
  witnessCount: number;
  gateCount: number;
  digest: string;
  vkComponents: VKComponents;
  permutationTable?: any[];
  equivalenceClasses?: any[];
  rawConstraintData?: any;
}

async function extractVKComponents(verificationKey: any): Promise<VKComponents> {
  const components: VKComponents = {
    hash: verificationKey.hash?.toString() || 'missing',
    dataLength: verificationKey.data?.length || 0,
    data: verificationKey.data || 'missing',
  };

  // Try to parse VK data (base64 encoded)
  try {
    if (verificationKey.data) {
      const buffer = Buffer.from(verificationKey.data, 'base64');
      components.parsedData = {
        byteLength: buffer.length,
        firstBytes: Array.from(buffer.slice(0, 32)),
        lastBytes: Array.from(buffer.slice(-32)),
      };
    }
  } catch (e) {
    console.log('Could not parse VK data:', e);
  }

  // Try to access internal VK structure through bindings
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
      const bridge = (globalThis as any).sparkyConstraintBridge;
      if (bridge.getVKComponents) {
        components.rawInternalData = bridge.getVKComponents();
      }
    }
  } catch (e) {
    console.log('Could not access internal VK data:', e);
  }

  return components;
}

async function analyzeConstraintSystem(
  backend: 'snarky' | 'sparky',
  circuitName: string,
  compileFunction: () => Promise<any>
): Promise<ConstraintSystemAnalysis> {
  console.log(`\n🔍 ANALYZING ${circuitName} [${backend.toUpperCase()}]`);
  console.log('━'.repeat(60));

  await switchBackend(backend);

  const analysis: ConstraintSystemAnalysis = {
    backend,
    circuitName,
    constraintCount: 0,
    publicInputCount: 0,
    witnessCount: 0,
    gateCount: 0,
    digest: 'no-digest',
    vkComponents: {
      hash: 'missing',
      dataLength: 0,
      data: 'missing',
    },
  };

  try {
    // Compile the circuit
    const compilationResult = await compileFunction();
    
    // Extract VK components
    if (compilationResult.verificationKey) {
      analysis.vkComponents = await extractVKComponents(compilationResult.verificationKey);
      console.log(`✅ VK Hash: ${analysis.vkComponents.hash}`);
      console.log(`✅ VK Data Length: ${analysis.vkComponents.dataLength}`);
    } else {
      console.log('❌ No verification key in compilation result');
    }

    // Try to get detailed constraint analysis
    if (compilationResult.analyzeMethods && typeof compilationResult.analyzeMethods === 'function') {
      const methodAnalysis = await compilationResult.analyzeMethods();
      if (methodAnalysis) {
        const methods = Object.values(methodAnalysis);
        if (methods.length > 0) {
          const firstMethod = methods[0] as any;
          analysis.constraintCount = firstMethod.rows || 0;
          analysis.digest = firstMethod.digest || 'no-digest';
          analysis.publicInputCount = firstMethod.publicInputs || 0;
          analysis.witnessCount = firstMethod.witnesses || 0;
          analysis.gateCount = firstMethod.gates || 0;
        }
      }
    }

    // Try to access constraint system via global bridge
    if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
      const bridge = (globalThis as any).sparkyConstraintBridge;
      if (bridge.getFullConstraintSystem) {
        analysis.rawConstraintData = bridge.getFullConstraintSystem();
        if (analysis.rawConstraintData) {
          analysis.constraintCount = analysis.rawConstraintData.constraintCount || analysis.constraintCount;
          analysis.digest = analysis.rawConstraintData.digest || analysis.digest;
          analysis.permutationTable = analysis.rawConstraintData.permutationTable || [];
          analysis.equivalenceClasses = analysis.rawConstraintData.equivalenceClasses || [];
        }
      }
    }

    console.log(`📊 Constraints: ${analysis.constraintCount}`);
    console.log(`📊 Public Inputs: ${analysis.publicInputCount}`);
    console.log(`📊 Witnesses: ${analysis.witnessCount}`);
    console.log(`📊 Gates: ${analysis.gateCount}`);
    console.log(`📊 Digest: ${analysis.digest}`);
    console.log(`📊 Permutation Table Entries: ${analysis.permutationTable?.length || 0}`);
    console.log(`📊 Equivalence Classes: ${analysis.equivalenceClasses?.length || 0}`);

  } catch (error) {
    console.error(`❌ Analysis failed: ${error}`);
    analysis.digest = 'error';
  }

  return analysis;
}

// =============================================================================
// VK COMPARISON UTILITIES
// =============================================================================

interface VKComparison {
  circuitName: string;
  snarkyAnalysis: ConstraintSystemAnalysis;
  sparkyAnalysis: ConstraintSystemAnalysis;
  hashMatch: boolean;
  dataMatch: boolean;
  constraintCountMatch: boolean;
  digestMatch: boolean;
  differences: string[];
}

function compareVKs(snarkyAnalysis: ConstraintSystemAnalysis, sparkyAnalysis: ConstraintSystemAnalysis): VKComparison {
  const comparison: VKComparison = {
    circuitName: snarkyAnalysis.circuitName,
    snarkyAnalysis,
    sparkyAnalysis,
    hashMatch: snarkyAnalysis.vkComponents.hash === sparkyAnalysis.vkComponents.hash,
    dataMatch: snarkyAnalysis.vkComponents.data === sparkyAnalysis.vkComponents.data,
    constraintCountMatch: snarkyAnalysis.constraintCount === sparkyAnalysis.constraintCount,
    digestMatch: snarkyAnalysis.digest === sparkyAnalysis.digest,
    differences: [],
  };

  // Detailed difference analysis
  if (!comparison.hashMatch) {
    comparison.differences.push(`VK Hash: Snarky=${snarkyAnalysis.vkComponents.hash} vs Sparky=${sparkyAnalysis.vkComponents.hash}`);
  }

  if (!comparison.dataMatch) {
    comparison.differences.push(`VK Data Length: Snarky=${snarkyAnalysis.vkComponents.dataLength} vs Sparky=${sparkyAnalysis.vkComponents.dataLength}`);
  }

  if (!comparison.constraintCountMatch) {
    comparison.differences.push(`Constraint Count: Snarky=${snarkyAnalysis.constraintCount} vs Sparky=${sparkyAnalysis.constraintCount}`);
  }

  if (!comparison.digestMatch) {
    comparison.differences.push(`Digest: Snarky=${snarkyAnalysis.digest} vs Sparky=${sparkyAnalysis.digest}`);
  }

  // Permutation data comparison
  const snarkyPermutations = snarkyAnalysis.permutationTable?.length || 0;
  const sparkyPermutations = sparkyAnalysis.permutationTable?.length || 0;
  if (snarkyPermutations !== sparkyPermutations) {
    comparison.differences.push(`Permutation Table: Snarky=${snarkyPermutations} vs Sparky=${sparkyPermutations}`);
  }

  const snarkyEquivalenceClasses = snarkyAnalysis.equivalenceClasses?.length || 0;
  const sparkyEquivalenceClasses = sparkyAnalysis.equivalenceClasses?.length || 0;
  if (snarkyEquivalenceClasses !== sparkyEquivalenceClasses) {
    comparison.differences.push(`Equivalence Classes: Snarky=${snarkyEquivalenceClasses} vs Sparky=${sparkyEquivalenceClasses}`);
  }

  return comparison;
}

// =============================================================================
// PERMUTATION DATA DEBUGGING
// =============================================================================

async function debugPermutationData(backend: 'snarky' | 'sparky', circuitName: string) {
  console.log(`\n🔍 PERMUTATION DEBUG [${backend.toUpperCase()}] - ${circuitName}`);
  console.log('━'.repeat(60));

  // Enable verbose permutation logging if available
  if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
    const bridge = (globalThis as any).sparkyConstraintBridge;
    if (bridge.enablePermutationDebug) {
      bridge.enablePermutationDebug(true);
      console.log('✅ Permutation debug logging enabled');
    }
  }

  // Try to access permutation construction logs
  if (typeof globalThis !== 'undefined' && (globalThis as any).sparkyConstraintBridge) {
    const bridge = (globalThis as any).sparkyConstraintBridge;
    if (bridge.getPermutationLogs) {
      const logs = bridge.getPermutationLogs();
      console.log('📋 Permutation construction logs:');
      logs.forEach((log: string, i: number) => {
        console.log(`  ${i + 1}. ${log}`);
      });
    }
  }
}

// =============================================================================
// MAIN DEBUG HARNESS
// =============================================================================

export async function runVKDebugHarness() {
  console.log('🚀 VK STRUCTURE COMPARISON DEBUG HARNESS');
  console.log('=' .repeat(80));

  const results: VKComparison[] = [];

  // Test 1: Empty Circuit
  console.log('\n🧪 TEST 1: EMPTY CIRCUIT');
  const emptyCompileFunction = () => EmptyCircuit.compile();
  const snarkyEmptyAnalysis = await analyzeConstraintSystem('snarky', 'EmptyCircuit', emptyCompileFunction);
  const sparkyEmptyAnalysis = await analyzeConstraintSystem('sparky', 'EmptyCircuit', emptyCompileFunction);
  results.push(compareVKs(snarkyEmptyAnalysis, sparkyEmptyAnalysis));

  // Test 2: Empty Multi-Input Circuit
  console.log('\n🧪 TEST 2: EMPTY MULTI-INPUT CIRCUIT');
  const multiCompileFunction = () => EmptyMultiInputCircuit.compile();
  const snarkyMultiAnalysis = await analyzeConstraintSystem('snarky', 'EmptyMultiInput', multiCompileFunction);
  const sparkyMultiAnalysis = await analyzeConstraintSystem('sparky', 'EmptyMultiInput', multiCompileFunction);
  results.push(compareVKs(snarkyMultiAnalysis, sparkyMultiAnalysis));

  // Test 3: Trivial Constraint Circuit
  console.log('\n🧪 TEST 3: TRIVIAL CONSTRAINT CIRCUIT');
  const trivialCompileFunction = () => TrivialConstraintCircuit.compile();
  const snarkyTrivialAnalysis = await analyzeConstraintSystem('snarky', 'TrivialConstraint', trivialCompileFunction);
  const sparkyTrivialAnalysis = await analyzeConstraintSystem('sparky', 'TrivialConstraint', trivialCompileFunction);
  results.push(compareVKs(snarkyTrivialAnalysis, sparkyTrivialAnalysis));

  // Test 4: Empty SmartContract
  console.log('\n🧪 TEST 4: EMPTY SMART CONTRACT');
  const contractCompileFunction = () => EmptyContract.compile();
  const snarkyContractAnalysis = await analyzeConstraintSystem('snarky', 'EmptyContract', contractCompileFunction);
  const sparkyContractAnalysis = await analyzeConstraintSystem('sparky', 'EmptyContract', contractCompileFunction);
  results.push(compareVKs(snarkyContractAnalysis, sparkyContractAnalysis));

  // Permutation debugging for each test
  console.log('\n🔍 PERMUTATION DATA DEBUGGING');
  await debugPermutationData('snarky', 'EmptyCircuit');
  await debugPermutationData('sparky', 'EmptyCircuit');

  // =============================================================================
  // RESULTS SUMMARY
  // =============================================================================

  console.log('\n📊 VK COMPARISON RESULTS SUMMARY');
  console.log('=' .repeat(80));

  let allMatch = true;
  results.forEach((result, i) => {
    const testNum = i + 1;
    const status = result.hashMatch ? '✅ MATCH' : '❌ MISMATCH';
    console.log(`\nTest ${testNum}: ${result.circuitName} - ${status}`);
    
    if (!result.hashMatch) {
      allMatch = false;
      console.log('  Differences:');
      result.differences.forEach(diff => {
        console.log(`    - ${diff}`);
      });
    }
  });

  console.log('\n🎯 OVERALL RESULT:', allMatch ? '✅ ALL VKs MATCH' : '❌ VK MISMATCHES DETECTED');

  // Generate targeted test recommendations
  console.log('\n🔧 TARGETED TEST RECOMMENDATIONS:');
  if (!allMatch) {
    console.log('  1. Focus on empty circuits to isolate permutation issues');
    console.log('  2. Check permutation polynomial construction in Sparky');
    console.log('  3. Compare sigma commitment generation between backends');
    console.log('  4. Verify domain setup consistency');
  } else {
    console.log('  1. VK parity achieved - ready for comprehensive testing');
    console.log('  2. Test more complex circuits to ensure scalability');
  }

  return results;
}

// =============================================================================
// IMPLEMENTATION VALIDATION TOOLS
// =============================================================================

export async function validateImplementation() {
  console.log('\n🔬 IMPLEMENTATION VALIDATION');
  console.log('=' .repeat(80));

  // Run before/after comparison
  const beforeResults = await runVKDebugHarness();
  
  // TODO: After implementing the fix, run again and compare
  console.log('\n📈 VALIDATION COMPLETE');
  console.log('  Before Fix Results: Available');
  console.log('  After Fix Results: Ready for comparison');
  
  return beforeResults;
}

// Export individual test circuits for reuse
export {
  EmptyCircuit,
  EmptyMultiInputCircuit,
  TrivialConstraintCircuit,
  EmptyContract,
  analyzeConstraintSystem,
  compareVKs,
  debugPermutationData,
  extractVKComponents,
};