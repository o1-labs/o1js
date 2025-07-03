/**
 * POSEIDON DETERMINISTIC REGRESSION TEST
 * 
 * This test validates that Poseidon hash produces identical results between
 * Snarky and Sparky backends using fixed, known inputs. This test was created
 * to address "Poseidon hash corruption" reports that were actually caused by
 * non-deterministic test inputs using Math.random().
 * 
 * CRITICAL: This test uses ONLY deterministic inputs to ensure reproducible
 * results across test runs and backend comparisons.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { Field, Poseidon, switchBackend, getCurrentBackend } from '../../dist/node/index.js';

// Fixed deterministic test vectors for Poseidon hash
const DETERMINISTIC_TEST_VECTORS = [
  // Single input tests
  {
    name: 'single_zero',
    inputs: [0n],
    description: 'Hash of single zero field element'
  },
  {
    name: 'single_one', 
    inputs: [1n],
    description: 'Hash of single one field element'
  },
  {
    name: 'single_max_field',
    inputs: [28948022309329048855892746252171976963363056481941560715954676764349967630336n], // FIELD_MAX
    description: 'Hash of maximum field value'
  },
  
  // Two input tests
  {
    name: 'two_sequential',
    inputs: [1n, 2n],
    description: 'Hash of two sequential numbers'
  },
  {
    name: 'two_identical',
    inputs: [42n, 42n],
    description: 'Hash of two identical values'
  },
  {
    name: 'two_boundary',
    inputs: [0n, 28948022309329048855892746252171976963363056481941560715954676764349967630336n],
    description: 'Hash of zero and max field value'
  },
  
  // Multiple input tests  
  {
    name: 'three_ascending',
    inputs: [1n, 2n, 3n],
    description: 'Hash of three ascending values'
  },
  {
    name: 'four_powers_of_two',
    inputs: [1n, 2n, 4n, 8n],
    description: 'Hash of powers of two'
  },
  {
    name: 'five_fibonacci',
    inputs: [1n, 1n, 2n, 3n, 5n],
    description: 'Hash of Fibonacci sequence'
  },
  
  // Special pattern tests
  {
    name: 'alternating_pattern',
    inputs: [0xAAAAAAAAAAAAAAAAn, 0x5555555555555555n, 0xAAAAAAAAAAAAAAAAn],
    description: 'Hash of alternating bit patterns'
  },
  {
    name: 'evil_bit_patterns',
    inputs: [0xDEADBEEFn, 0xCAFEBABEn, 0xFEEDFACEn],
    description: 'Hash of classic evil bit patterns'
  },
  
  // Large arrays
  {
    name: 'ten_sequential',
    inputs: [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n],
    description: 'Hash of ten sequential numbers'
  }
];

// Expected results storage for regression tracking
interface DeterministicResult {
  testName: string;
  snarkyHash: string;
  sparkyHash: string;
  matches: boolean;
  timestamp: number;
}

const testResults: DeterministicResult[] = [];

describe('🔒 Poseidon Hash Deterministic Regression Tests', () => {
  
  beforeAll(async () => {
    console.log('🔒 Starting deterministic Poseidon hash validation...');
    console.log(`📊 Testing ${DETERMINISTIC_TEST_VECTORS.length} fixed test vectors`);
    await switchBackend('snarky');
  });

  describe('Fixed Input Vector Tests', () => {
    
    DETERMINISTIC_TEST_VECTORS.forEach((vector) => {
      test(`Deterministic: ${vector.name}`, async () => {
        console.log(`🧪 Testing: ${vector.description}`);
        console.log(`   Inputs: [${vector.inputs.join(', ')}]`);
        
        // Convert to Field elements
        const fieldInputs = vector.inputs.map(x => Field(x));
        
        // Test with Snarky backend
        await switchBackend('snarky');
        const currentBackend1 = getCurrentBackend();
        expect(currentBackend1).toBe('snarky');
        
        const snarkyHash = Poseidon.hash(fieldInputs);
        const snarkyHashString = snarkyHash.toString();
        
        // Test with Sparky backend
        await switchBackend('sparky');
        const currentBackend2 = getCurrentBackend();
        expect(currentBackend2).toBe('sparky');
        
        const sparkyHash = Poseidon.hash(fieldInputs);
        const sparkyHashString = sparkyHash.toString();
        
        // Record results for analysis
        const result: DeterministicResult = {
          testName: vector.name,
          snarkyHash: snarkyHashString,
          sparkyHash: sparkyHashString,
          matches: snarkyHashString === sparkyHashString,
          timestamp: Date.now()
        };
        testResults.push(result);
        
        // Log detailed comparison
        console.log(`   Snarky hash: ${snarkyHashString}`);
        console.log(`   Sparky hash: ${sparkyHashString}`);
        console.log(`   Match: ${result.matches ? '✅' : '❌'}`);
        
        if (!result.matches) {
          console.error(`❌ DETERMINISTIC HASH MISMATCH for ${vector.name}:`);
          console.error(`   Description: ${vector.description}`);
          console.error(`   Inputs: [${vector.inputs.join(', ')}]`);
          console.error(`   Expected (Snarky): ${snarkyHashString}`);
          console.error(`   Actual (Sparky):   ${sparkyHashString}`);
          
          // This should not happen if backends are truly compatible
          throw new Error(
            `Poseidon hash deterministic test failed for ${vector.name}. ` +
            `This indicates a real backend difference, not test framework issues.`
          );
        }
        
        // Test passes if hashes match
        expect(sparkyHashString).toBe(snarkyHashString);
      });
    });
  });

  describe('Deterministic Reproducibility Tests', () => {
    
    test('Multiple runs produce identical results', async () => {
      console.log('🔄 Testing reproducibility across multiple runs...');
      
      // Test a subset of vectors multiple times
      const testVector = DETERMINISTIC_TEST_VECTORS[0]; // Use first vector
      const fieldInputs = testVector.inputs.map(x => Field(x));
      
      const snarkyResults: string[] = [];
      const sparkyResults: string[] = [];
      
      // Run same test 5 times
      for (let run = 0; run < 5; run++) {
        console.log(`   Run ${run + 1}/5`);
        
        // Snarky
        await switchBackend('snarky');
        const snarkyHash = Poseidon.hash(fieldInputs).toString();
        snarkyResults.push(snarkyHash);
        
        // Sparky  
        await switchBackend('sparky');
        const sparkyHash = Poseidon.hash(fieldInputs).toString();
        sparkyResults.push(sparkyHash);
      }
      
      // All Snarky results should be identical
      const snarkyConsistent = snarkyResults.every(hash => hash === snarkyResults[0]);
      console.log(`   Snarky consistency: ${snarkyConsistent ? '✅' : '❌'}`);
      
      // All Sparky results should be identical  
      const sparkyConsistent = sparkyResults.every(hash => hash === sparkyResults[0]);
      console.log(`   Sparky consistency: ${sparkyConsistent ? '✅' : '❌'}`);
      
      // Snarky and Sparky should produce same result
      const crossConsistent = snarkyResults[0] === sparkyResults[0];
      console.log(`   Cross-backend consistency: ${crossConsistent ? '✅' : '❌'}`);
      
      if (!snarkyConsistent) {
        throw new Error('Snarky backend produces non-deterministic Poseidon hashes!');
      }
      
      if (!sparkyConsistent) {
        throw new Error('Sparky backend produces non-deterministic Poseidon hashes!');
      }
      
      if (!crossConsistent) {
        throw new Error('Snarky and Sparky produce different Poseidon hashes for identical inputs!');
      }
      
      expect(snarkyConsistent).toBe(true);
      expect(sparkyConsistent).toBe(true);
      expect(crossConsistent).toBe(true);
    });
  });

  describe('Empty and Edge Case Tests', () => {
    
    test('Single field element edge cases', async () => {
      const edgeCases = [
        { name: 'zero', value: 0n },
        { name: 'one', value: 1n },
        { name: 'two', value: 2n },
        { name: 'field_half', value: 28948022309329048855892746252171976963363056481941560715954676764349967630337n / 2n },
        { name: 'field_max_minus_one', value: 28948022309329048855892746252171976963363056481941560715954676764349967630336n - 1n },
        { name: 'field_max', value: 28948022309329048855892746252171976963363056481941560715954676764349967630336n }
      ];
      
      for (const edgeCase of edgeCases) {
        console.log(`🔍 Testing edge case: ${edgeCase.name} (${edgeCase.value})`);
        
        const fieldInput = Field(edgeCase.value);
        
        // Test with both backends
        await switchBackend('snarky');
        const snarkyHash = Poseidon.hash([fieldInput]).toString();
        
        await switchBackend('sparky');
        const sparkyHash = Poseidon.hash([fieldInput]).toString();
        
        console.log(`   Snarky: ${snarkyHash}`);
        console.log(`   Sparky: ${sparkyHash}`);
        console.log(`   Match: ${snarkyHash === sparkyHash ? '✅' : '❌'}`);
        
        expect(sparkyHash).toBe(snarkyHash);
      }
    });
  });

  // Generate final report
  afterAll(() => {
    console.log('\n📊 DETERMINISTIC POSEIDON REGRESSION REPORT');
    console.log('='.repeat(50));
    
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.matches).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : '0.0';
    
    console.log(`📈 TOTAL TESTS: ${totalTests}`);
    console.log(`✅ PASSED: ${passedTests}`);
    console.log(`❌ FAILED: ${failedTests}`);
    console.log(`📊 SUCCESS RATE: ${successRate}%`);
    
    if (failedTests === 0) {
      console.log('\n🎉 ALL DETERMINISTIC TESTS PASSED!');
      console.log('✅ Poseidon hash is consistent between Snarky and Sparky backends');
      console.log('✅ No "hash corruption" detected - previous issues were due to non-deterministic test inputs');
    } else {
      console.log('\n⚠️  DETERMINISTIC TEST FAILURES DETECTED');
      console.log('❌ This indicates genuine backend differences in Poseidon implementation');
      
      testResults
        .filter(r => !r.matches)
        .forEach(failure => {
          console.log(`   ❌ ${failure.testName}: Snarky=${failure.snarkyHash.slice(0, 20)}... vs Sparky=${failure.sparkyHash.slice(0, 20)}...`);
        });
    }
    
    console.log('='.repeat(50));
  });
});