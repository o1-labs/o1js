#!/usr/bin/env node

/**
 * DEBUG: Constraint generation to see what constraints are actually created
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testConstraintGenerationDebug() {
  console.log('🔬 CONSTRAINT GENERATION DEBUG');
  console.log('==============================');
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 Testing ${backend.toUpperCase()} constraint generation:`);
    console.log('----------------------------------------');
    
    await switchBackend(backend);
    
    try {
      // Compile a simple multiplication circuit
      console.log('🔍 Compiling circuit...');
      
      // Enter constraint generation mode
      const csHandle = Snarky.run.enterConstraintSystem();
      
      // Create the circuit: a * b = c
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      c.assertEquals(Field.from(12));
      
      // Get constraint system
      const cs = csHandle();
      
      console.log('🔍 Constraint system generated');
      console.log('🔍 Constraint system type:', typeof cs);
      console.log('🔍 Constraint system:', JSON.stringify(cs, null, 2).slice(0, 500) + '...');
      
      // Try to extract gate information
      if (cs && cs.gates) {
        console.log(`\n📊 Gates summary:`);
        console.log(`- Total gates: ${cs.gates.length}`);
        console.log(`- Public inputs: ${cs.public_input_size || 0}`);
        
        // Show first few gates
        console.log('\n🔍 First 3 gates:');
        cs.gates.slice(0, 3).forEach((gate, i) => {
          console.log(`Gate ${i}:`, JSON.stringify(gate, null, 2));
        });
      }
      
      // Now test constraint satisfaction
      console.log('\n🔍 Testing constraint satisfaction...');
      
      const result = await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.mul(b);
        c.assertEquals(Field.from(12));
        return { a, b, c };
      });
      
      console.log('✅ Constraint satisfaction test passed');
      console.log('🔍 Result:', { 
        a: result.a.toString(), 
        b: result.b.toString(), 
        c: result.c.toString() 
      });
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      if (error.stack) {
        console.log('Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
  }
}

testConstraintGenerationDebug().catch(console.error);