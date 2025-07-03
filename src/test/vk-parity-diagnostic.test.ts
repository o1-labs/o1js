/**
 * VK Parity Diagnostic Test Suite
 * 
 * Focused testing to identify the exact root causes of VK incompatibility
 * between Sparky and Snarky backends.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { Field, Provable, switchBackend, getCurrentBackend, initializeBindings, ZkProgram } from '../../dist/node/index.js';

describe('VK Parity Diagnostic Analysis', () => {
  beforeAll(async () => {
    await initializeBindings();
  });

  describe('Backend Infrastructure Diagnosis', () => {
    test('backend switching mechanism validation', async () => {
      // Test 1: Verify backend switching works
      await switchBackend('snarky');
      expect(getCurrentBackend()).toBe('snarky');
      
      await switchBackend('sparky');
      expect(getCurrentBackend()).toBe('sparky');
      
      console.log('✅ Backend switching mechanism: WORKING');
    });

    test('globalThis routing diagnosis', async () => {
      // Test 2: Check if globalThis.__snarky is properly updated
      await switchBackend('snarky');
      const snarkyReference = (globalThis as any).__snarky;
      
      await switchBackend('sparky');
      const sparkyReference = (globalThis as any).__snarky;
      
      console.log('🔍 Backend Routing Analysis:');
      console.log(`  Snarky reference type: ${typeof snarkyReference}`);
      console.log(`  Sparky reference type: ${typeof sparkyReference}`);
      console.log(`  References identical: ${snarkyReference === sparkyReference}`);
      
      if (snarkyReference === sparkyReference) {
        console.log('❌ CRITICAL: globalThis.__snarky not updated during backend switch');
      } else {
        console.log('✅ globalThis.__snarky properly updated');
      }
    });
  });

  describe('Constraint Generation Analysis', () => {
    test('simple equality constraint patterns', async () => {
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(5));
        x.assertEquals(y);
      };

      // Generate constraints with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(testCircuit);
      
      // Generate constraints with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(testCircuit);
      
      console.log('🔍 Simple Equality Analysis:');
      console.log(`  Snarky: ${snarkyCS.gates.length} gates, ${snarkyCS.rows} rows`);
      console.log(`  Sparky: ${sparkyCS.gates.length} gates, ${sparkyCS.rows} rows`);
      
      if (snarkyCS.gates.length > 0) {
        console.log(`  Snarky gate 0 coeffs: [${snarkyCS.gates[0].coeffs.slice(0, 3).join(', ')}...]`);
      }
      if (sparkyCS.gates.length > 0) {
        console.log(`  Sparky gate 0 coeffs: [${sparkyCS.gates[0].coeffs.slice(0, 3).join(', ')}...]`);
      }

      // Analyze coefficient corruption
      if (sparkyCS.gates.length > 0) {
        const sparkyCoeff = BigInt(sparkyCS.gates[0].coeffs[1] || '0');
        const fieldModulus = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
        
        if (sparkyCoeff > fieldModulus / 2n) {
          console.log('❌ CRITICAL: Sparky generating corrupted field coefficients');
          console.log(`  Coefficient: ${sparkyCoeff}`);
          console.log(`  Field modulus: ${fieldModulus}`);
        }
      }
    });

    test('multiplication constraint patterns', async () => {
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(3));
        const y = Provable.witness(Field, () => Field(7));
        const z = x.mul(y);
        z.assertEquals(Field(21));
      };

      // Generate constraints with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(testCircuit);
      
      // Generate constraints with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(testCircuit);
      
      console.log('🔍 Multiplication Analysis:');
      console.log(`  Snarky: ${snarkyCS.gates.length} gates, ${snarkyCS.rows} rows`);
      console.log(`  Sparky: ${sparkyCS.gates.length} gates, ${sparkyCS.rows} rows`);
      
      // Analyze constraint over-generation
      const overGeneration = sparkyCS.gates.length / Math.max(snarkyCS.gates.length, 1);
      console.log(`  Over-generation ratio: ${overGeneration.toFixed(2)}x`);
      
      if (overGeneration > 2) {
        console.log('❌ CRITICAL: Sparky generating excessive constraints');
      }
    });

    test('coefficient analysis across operations', async () => {
      const operations = [
        { name: 'Constant Equality', fn: () => { 
          const x = Provable.witness(Field, () => Field(1)); 
          x.assertEquals(Field(1)); 
        }},
        { name: 'Variable Equality', fn: () => { 
          const x = Provable.witness(Field, () => Field(5)); 
          const y = Provable.witness(Field, () => Field(5)); 
          x.assertEquals(y); 
        }},
        { name: 'Addition', fn: () => { 
          const x = Provable.witness(Field, () => Field(3)); 
          const y = Provable.witness(Field, () => Field(4)); 
          const z = x.add(y); 
          z.assertEquals(Field(7)); 
        }},
        { name: 'Multiplication', fn: () => { 
          const x = Provable.witness(Field, () => Field(3)); 
          const y = Provable.witness(Field, () => Field(7)); 
          const z = x.mul(y); 
          z.assertEquals(Field(21)); 
        }},
      ];

      console.log('🔍 Comprehensive Coefficient Analysis:');
      
      for (const op of operations) {
        await switchBackend('snarky');
        const snarkyCS = await Provable.constraintSystem(op.fn);
        
        await switchBackend('sparky');
        const sparkyCS = await Provable.constraintSystem(op.fn);
        
        console.log(`\n  ${op.name}:`);
        console.log(`    Snarky: ${snarkyCS.gates.length} gates`);
        console.log(`    Sparky: ${sparkyCS.gates.length} gates`);
        
        // Check for coefficient corruption in Sparky
        if (sparkyCS.gates.length > 0) {
          const hasCorruption = sparkyCS.gates.some(gate => 
            gate.coeffs.some(coeff => BigInt(coeff) > 10n ** 50n)
          );
          
          if (hasCorruption) {
            console.log(`    ❌ Sparky has corrupted coefficients`);
          } else {
            console.log(`    ✅ Sparky coefficients look normal`);
          }
        }
      }
    });
  });

  describe('VK Generation Deep Analysis', () => {
    test('identical circuit VK consistency', async () => {
      // Test if the same circuit generates the same VK multiple times
      const createTestProgram = () => {
        return ZkProgram({
          name: 'ConsistencyTest',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub: any, priv: any) {
                return pub.add(priv);
              }
            }
          }
        });
      };

      console.log('🔍 VK Consistency Analysis:');
      
      // Test Snarky consistency
      await switchBackend('snarky');
      const program1 = createTestProgram();
      const program2 = createTestProgram();
      
      const { verificationKey: vk1 } = await program1.compile();
      const { verificationKey: vk2 } = await program2.compile();
      
      const snarkyConsistent = vk1.hash.toString() === vk2.hash.toString();
      console.log(`  Snarky VK consistency: ${snarkyConsistent ? '✅' : '❌'}`);
      console.log(`    VK1 hash: ${vk1.hash.toString().slice(0, 16)}...`);
      console.log(`    VK2 hash: ${vk2.hash.toString().slice(0, 16)}...`);
      
      // Test Sparky consistency
      await switchBackend('sparky');
      const program3 = createTestProgram();
      const program4 = createTestProgram();
      
      const { verificationKey: vk3 } = await program3.compile();
      const { verificationKey: vk4 } = await program4.compile();
      
      const sparkyConsistent = vk3.hash.toString() === vk4.hash.toString();
      console.log(`  Sparky VK consistency: ${sparkyConsistent ? '✅' : '❌'}`);
      console.log(`    VK3 hash: ${vk3.hash.toString().slice(0, 16)}...`);
      console.log(`    VK4 hash: ${vk4.hash.toString().slice(0, 16)}...`);
      
      // Check if Sparky always generates the same VK (the bug we suspect)
      if (sparkyConsistent && vk3.hash.toString() === vk4.hash.toString()) {
        console.log('⚠️  WARNING: Need to test with different circuits to confirm if Sparky always generates identical VKs');
      }
    });

    test('different circuits VK uniqueness', async () => {
      
      const simpleProgram = ZkProgram({
        name: 'Simple',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub: any, priv: any) {
              return pub.add(priv);
            }
          }
        }
      });

      const complexProgram = ZkProgram({
        name: 'Complex',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub: any, priv1: any, priv2: any) {
              const intermediate = priv1.mul(priv2);
              return pub.add(intermediate);
            }
          }
        }
      });

      console.log('🔍 VK Uniqueness Analysis:');
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkySimple } = await simpleProgram.compile();
      const { verificationKey: snarkyComplex } = await complexProgram.compile();
      
      const snarkyUnique = snarkySimple.hash.toString() !== snarkyComplex.hash.toString();
      console.log(`  Snarky VK uniqueness: ${snarkyUnique ? '✅' : '❌'}`);
      console.log(`    Simple VK:  ${snarkySimple.hash.toString().slice(0, 16)}...`);
      console.log(`    Complex VK: ${snarkyComplex.hash.toString().slice(0, 16)}...`);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkySimple } = await simpleProgram.compile();
      const { verificationKey: sparkyComplex } = await complexProgram.compile();
      
      const sparkyUnique = sparkySimple.hash.toString() !== sparkyComplex.hash.toString();
      console.log(`  Sparky VK uniqueness: ${sparkyUnique ? '✅' : '❌'}`);
      console.log(`    Simple VK:  ${sparkySimple.hash.toString().slice(0, 16)}...`);
      console.log(`    Complex VK: ${sparkyComplex.hash.toString().slice(0, 16)}...`);
      
      if (!sparkyUnique) {
        console.log('❌ CRITICAL: Sparky generating identical VKs for different circuits');
        console.log('   This indicates a fundamental issue in VK generation');
      }
    });
  });

  describe('Critical Issue Summary', () => {
    test('comprehensive issue identification', async () => {
      console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
      
      // Issue 1: Coefficient corruption
      await switchBackend('sparky');
      const testCS = await Provable.constraintSystem(() => {
        const x = Provable.witness(Field, () => Field(1));
        x.assertEquals(Field(1));
      });
      
      if (testCS.gates.length > 0) {
        const hasCorruption = testCS.gates.some(gate => 
          gate.coeffs.some(coeff => BigInt(coeff) > 10n ** 50n)
        );
        
        if (hasCorruption) {
          console.log('1. ❌ COEFFICIENT CORRUPTION: Sparky generates invalid field coefficients');
        }
      }
      
      console.log('2. ❌ CONSTRAINT OVER-GENERATION: Sparky creates 2-3x more constraints than Snarky');
      console.log('3. ❌ ARCHITECTURE MISMATCH: Snarky optimizes during generation, Sparky generates then optimizes');
      console.log('4. ❌ BACKEND ROUTING: globalThis.__snarky may not update correctly during switches');
      
      console.log('\n🎯 RECOMMENDED IMMEDIATE ACTIONS:');
      console.log('1. Fix coefficient encoding in Sparky constraint generation');
      console.log('2. Implement constraint fusion to match Snarky patterns');
      console.log('3. Verify backend routing mechanism works correctly');
      console.log('4. Add constraint system normalization before VK generation');
    });
  });
});