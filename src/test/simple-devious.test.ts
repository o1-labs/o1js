/**
 * SIMPLE DEVIOUS TEST - Direct Red Team Attack
 * 
 * This is a simplified version of the devious tests to verify
 * the attack infrastructure works correctly.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { Field, Poseidon, switchBackend, getCurrentBackend } from '../../dist/node/index.js';

// Deterministic devious field generator with cycle counter
let evilFieldCounter = 0;
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
  
  // Use deterministic cycle through values instead of Math.random()
  const deterministicEvil = evilValues[evilFieldCounter % evilValues.length];
  evilFieldCounter++;
  return Field(deterministicEvil);
}

// Compare backends with evil intent
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

describe('🔥 Simple Devious Red Team Tests', () => {
  
  beforeAll(async () => {
    console.log('🔥 Starting simple devious attacks on Sparky...');
    await switchBackend('snarky');
  });

  test('Evil Division by Zero Attack', async () => {
    console.log('💀 Launching division by zero attack...');
    
    const evilDividend = createEvilField();
    const result = await compareBackendsEvilly(
      () => evilDividend.div(Field(0)),
      'division_by_zero'
    );
    
    // We expect both backends to error on division by zero
    if (!result.snarkyError || !result.sparkyError) {
      console.log('⚠️  Division by zero should have failed on both backends!');
      console.log(`Snarky: ${result.snarkyError || 'no error'}`);
      console.log(`Sparky: ${result.sparkyError || 'no error'}`);
    }
    
    // Both should behave the same way (both error)
    const bothErrored = result.snarkyError && result.sparkyError;
    expect(bothErrored).toBe(true);
    
    console.log('✅ Division by zero attack completed - both backends failed as expected');
  });

  test('Evil Massive Field Multiplication', async () => {
    console.log('💀 Launching massive field multiplication attack...');
    
    const result = await compareBackendsEvilly(
      () => {
        let accumulator = Field(1);
        const evilFields = Array.from({ length: 20 }, () => createEvilField());
        
        for (const field of evilFields) {
          accumulator = accumulator.mul(field.add(Field(1))); // Avoid zero
        }
        
        return accumulator;
      },
      'massive_multiplication'
    );
    
    if (!result.match) {
      console.log('💥 BACKEND DIFFERENCE DETECTED!');
      console.log(`Snarky result: ${result.snarkyResult?.toString()}`);
      console.log(`Sparky result: ${result.sparkyResult?.toString()}`);
      console.log(`Snarky error: ${result.snarkyError}`);
      console.log(`Sparky error: ${result.sparkyError}`);
      
      throw new Error('Massive multiplication attack exposed backend difference!');
    }
    
    console.log('✅ Massive multiplication attack repelled - backends consistent');
  });

  test('Evil Poseidon Hash Chaos', async () => {
    console.log('💀 Launching Poseidon hash chaos attack...');
    
    const result = await compareBackendsEvilly(
      () => {
        const evilInputs = Array.from({ length: 5 }, () => createEvilField());
        return Poseidon.hash(evilInputs);
      },
      'poseidon_chaos'
    );
    
    if (!result.match) {
      console.log('💥 HASH DIFFERENCE DETECTED!');
      console.log(`Snarky hash: ${result.snarkyResult?.toString()}`);
      console.log(`Sparky hash: ${result.sparkyResult?.toString()}`);
      
      throw new Error('Poseidon hash chaos attack exposed backend difference!');
    }
    
    console.log('✅ Poseidon hash chaos attack repelled - hashes consistent');
  });

  test('Evil Backend Switching Rapid Fire', async () => {
    console.log('💀 Launching rapid backend switching attack...');
    
    const results: string[] = [];
    
    // Rapid switching with operations
    for (let i = 0; i < 10; i++) {
      const targetBackend = i % 2 === 0 ? 'snarky' : 'sparky';
      await switchBackend(targetBackend);
      
      const currentBackend = getCurrentBackend();
      if (currentBackend !== targetBackend) {
        throw new Error(`Backend switch failed: expected ${targetBackend}, got ${currentBackend}`);
      }
      
      // Perform operation during rapid switching
      const field1 = createEvilField();
      const field2 = createEvilField();
      const result = field1.add(field2);
      results.push(result.toString());
    }
    
    console.log(`✅ Rapid switching attack completed - ${results.length} operations successful`);
  });

  test('Evil Memory Pressure Attack', async () => {
    console.log('💀 Launching memory pressure attack...');
    
    const result = await compareBackendsEvilly(
      () => {
        // Create memory pressure with large computations
        let accumulator = Field(1);
        const wasteMemory: Field[] = [];
        
        for (let i = 0; i < 100; i++) {
          const evilField = createEvilField();
          accumulator = accumulator.add(evilField.square());
          
          // Create garbage to pressure memory
          wasteMemory.push(evilField, accumulator);
          
          if (i % 10 === 0 && wasteMemory.length > 50) {
            wasteMemory.splice(0, 20); // Partial cleanup
          }
        }
        
        return accumulator;
      },
      'memory_pressure'
    );
    
    if (!result.match) {
      console.log('💥 MEMORY PRESSURE EXPOSED BACKEND DIFFERENCE!');
      throw new Error('Memory pressure attack exposed backend difference!');
    }
    
    console.log('✅ Memory pressure attack repelled - backends survived');
  });

  test('Evil Performance Asymmetry Detection', async () => {
    console.log('💀 Launching performance asymmetry detection...');
    
    let snarkyTime: number, sparkyTime: number;
    
    // Test Snarky performance
    await switchBackend('snarky');
    const snarkyStart = performance.now();
    let snarkyResult = Field(1);
    for (let i = 0; i < 50; i++) {
      const evil = createEvilField();
      if (!evil.equals(Field(0)).toBoolean()) {
        snarkyResult = snarkyResult.add(evil.inv());
      }
    }
    snarkyTime = performance.now() - snarkyStart;
    
    // Test Sparky performance
    await switchBackend('sparky');
    const sparkyStart = performance.now();
    let sparkyResult = Field(1);
    for (let i = 0; i < 50; i++) {
      const evil = createEvilField();
      if (!evil.equals(Field(0)).toBoolean()) {
        sparkyResult = sparkyResult.add(evil.inv());
      }
    }
    sparkyTime = performance.now() - sparkyStart;
    
    // Check results match
    if (snarkyResult.toString() !== sparkyResult.toString()) {
      throw new Error('Performance test results differ between backends!');
    }
    
    // Check for extreme performance differences
    const performanceRatio = Math.max(snarkyTime, sparkyTime) / Math.min(snarkyTime, sparkyTime);
    
    console.log(`⚡ Performance results:`);
    console.log(`   Snarky: ${snarkyTime.toFixed(2)}ms`);
    console.log(`   Sparky: ${sparkyTime.toFixed(2)}ms`);
    console.log(`   Ratio: ${performanceRatio.toFixed(2)}x`);
    
    if (performanceRatio > 10) {
      console.log('⚠️  EXTREME PERFORMANCE DIFFERENCE DETECTED!');
    }
    
    console.log('✅ Performance asymmetry detection completed');
  });
});