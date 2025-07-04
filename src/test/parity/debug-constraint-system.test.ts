/**
 * Debug Constraint System Test
 * 
 * Direct low-level debugging of constraint system differences between backends.
 * This test bypasses ZkProgram compilation to focus on raw constraint generation.
 */

import { describe, it, expect } from '@jest/globals';
import { Field, Provable, switchBackend, getCurrentBackend } from 'o1js';
import { Snarky } from '../../bindings.js';

describe('Debug Constraint System', () => {
  /**
   * Direct constraint system capture using low-level APIs
   */
  async function captureConstraintSystemRaw(circuit: () => void): Promise<{
    gates: any[];
    publicInputSize: number;
    digest: string;
    raw: any;
  }> {
    // Enter constraint system mode
    const cs = Snarky.run.enterConstraintSystem();
    
    // Run the circuit
    circuit();
    
    // Get the constraint system
    const constraintSystem = cs();
    
    // Get constraint system data
    const rawCS = Snarky.constraintSystem.toJson(constraintSystem);
    const digest = Snarky.constraintSystem.digest(constraintSystem);
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    
    return {
      gates: rawCS.gates || [],
      publicInputSize: rawCS.public_input_size || 0,
      digest,
      raw: rawCS
    };
  }

  it('should debug minimal constraint generation', async () => {
    console.log('\n🔍 Debugging Minimal Constraint Generation\n');
    
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    };
    
    // Capture with Snarky
    await switchBackend('snarky');
    console.log('=== SNARKY ===');
    const snarkyCS = await captureConstraintSystemRaw(circuit);
    console.log('Gates:', snarkyCS.gates.length);
    console.log('Public input size:', snarkyCS.publicInputSize);
    console.log('Digest:', snarkyCS.digest);
    console.log('Raw CS keys:', Object.keys(snarkyCS.raw));
    
    if (snarkyCS.gates.length > 0) {
      console.log('\nFirst gate:');
      console.log(JSON.stringify(snarkyCS.gates[0], null, 2));
    }
    
    // Capture with Sparky
    await switchBackend('sparky');
    console.log('\n=== SPARKY ===');
    
    try {
      const sparkyCS = await captureConstraintSystemRaw(circuit);
      console.log('Gates:', sparkyCS.gates.length);
      console.log('Public input size:', sparkyCS.publicInputSize);
      console.log('Digest:', sparkyCS.digest);
      console.log('Raw CS keys:', Object.keys(sparkyCS.raw));
      
      if (sparkyCS.gates.length > 0) {
        console.log('\nFirst gate:');
        console.log(JSON.stringify(sparkyCS.gates[0], null, 2));
      }
      
      // Compare
      console.log('\n=== COMPARISON ===');
      console.log('Gate count match:', snarkyCS.gates.length === sparkyCS.gates.length);
      console.log('Digest match:', snarkyCS.digest === sparkyCS.digest);
      
      // If gates differ, show detailed comparison
      if (snarkyCS.gates.length !== sparkyCS.gates.length) {
        console.log('\n❌ Gate count mismatch!');
        console.log(`Snarky: ${snarkyCS.gates.length} gates`);
        console.log(`Sparky: ${sparkyCS.gates.length} gates`);
      }
      
    } catch (error) {
      console.error('\n❌ Sparky constraint system capture failed:', error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
    }
  });

  it('should debug field operation constraint differences', async () => {
    console.log('\n🔍 Debugging Field Operation Constraints\n');
    
    const operations = [
      {
        name: 'Addition',
        circuit: () => {
          const a = Provable.witness(Field, () => Field(3));
          const b = Provable.witness(Field, () => Field(4));
          const c = a.add(b);
          c.assertEquals(Field(7));
        }
      },
      {
        name: 'Multiplication',
        circuit: () => {
          const a = Provable.witness(Field, () => Field(3));
          const b = Provable.witness(Field, () => Field(4));
          const c = a.mul(b);
          c.assertEquals(Field(12));
        }
      },
      {
        name: 'Boolean check',
        circuit: () => {
          const x = Provable.witness(Field, () => Field(1));
          x.assertBool();
        }
      }
    ];
    
    for (const op of operations) {
      console.log(`\n--- Testing ${op.name} ---`);
      
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystemRaw(op.circuit);
      
      // Test with Sparky
      await switchBackend('sparky');
      let sparkyCS;
      try {
        sparkyCS = await captureConstraintSystemRaw(op.circuit);
      } catch (error) {
        console.error(`Sparky failed for ${op.name}:`, error);
        continue;
      }
      
      // Compare
      console.log(`Snarky gates: ${snarkyCS.gates.length}`);
      console.log(`Sparky gates: ${sparkyCS.gates.length}`);
      console.log(`Match: ${snarkyCS.gates.length === sparkyCS.gates.length ? '✅' : '❌'}`);
      
      // Show gate types if they differ
      if (snarkyCS.gates.length !== sparkyCS.gates.length || snarkyCS.gates.length > 0) {
        const snarkyTypes = snarkyCS.gates.map(g => g.typ || g.type).join(', ');
        const sparkyTypes = sparkyCS.gates.map(g => g.typ || g.type).join(', ');
        console.log(`Snarky gate types: ${snarkyTypes}`);
        console.log(`Sparky gate types: ${sparkyTypes}`);
      }
    }
  });

  it('should trace constraint generation step by step', async () => {
    console.log('\n🔍 Tracing Constraint Generation Step by Step\n');
    
    // Very simple circuit with explicit steps
    const traceCircuit = () => {
      console.log('Step 1: Creating witness');
      const x = Provable.witness(Field, () => {
        console.log('  Witness computation callback');
        return Field(5);
      });
      
      console.log('Step 2: Creating constant');
      const five = Field(5);
      
      console.log('Step 3: Calling assertEquals');
      x.assertEquals(five);
      
      console.log('Step 4: Circuit complete');
    };
    
    // Trace with Snarky
    console.log('=== SNARKY TRACE ===');
    await switchBackend('snarky');
    const snarkyCS = await captureConstraintSystemRaw(traceCircuit);
    console.log(`Result: ${snarkyCS.gates.length} gates generated`);
    
    // Trace with Sparky
    console.log('\n=== SPARKY TRACE ===');
    await switchBackend('sparky');
    try {
      const sparkyCS = await captureConstraintSystemRaw(traceCircuit);
      console.log(`Result: ${sparkyCS.gates.length} gates generated`);
    } catch (error) {
      console.error('Sparky trace failed:', error);
    }
  });
});