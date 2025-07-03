#!/usr/bin/env node

/**
 * COMPARE: How Snarky vs Sparky handle variable creation in assertMul
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';
import { Gates } from './dist/node/lib/provable/gates.js';

async function compareSnarkyVsSparky() {
  console.log('🔬 SNARKY VS SPARKY VARIABLE CREATION COMPARISON');
  console.log('===============================================\n');
  
  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n\n${'='.repeat(50)}`);
    console.log(`📊 TESTING WITH ${backend.toUpperCase()} BACKEND`);
    console.log('='.repeat(50));
    
    await switchBackend(backend);
    
    // Track variable allocations
    let existsOneCalls = 0;
    const varAllocations = [];
    
    // Patch existsOne
    const originalExistsOne = Snarky.run.existsOne;
    Snarky.run.existsOne = function(compute) {
      existsOneCalls++;
      console.log(`\n[${backend}] existsOne call #${existsOneCalls}`);
      const result = originalExistsOne.call(this, compute);
      console.log(`[${backend}] -> Result:`, result);
      varAllocations.push({ call: existsOneCalls, result });
      return result;
    };
    
    // Patch Gates.generic to see constraints
    const originalGeneric = Gates.generic;
    let genericCalls = 0;
    Gates.generic = function(coeffs, vars) {
      genericCalls++;
      console.log(`\n[${backend}] Gates.generic call #${genericCalls}`);
      console.log(`[${backend}] Variables:`, {
        left: vars.left,
        right: vars.right,
        out: vars.out
      });
      return originalGeneric.call(this, coeffs, vars);
    };
    
    console.log(`\n1️⃣ CONSTRAINT GENERATION MODE`);
    console.log('-'.repeat(30));
    
    try {
      existsOneCalls = 0;
      genericCalls = 0;
      varAllocations.length = 0;
      
      const cs = await Provable.constraintSystem(() => {
        console.log(`\n[${backend}] Creating witness a...`);
        const a = Provable.witness(Field, () => Field.from(3));
        
        console.log(`[${backend}] Creating witness b...`);
        const b = Provable.witness(Field, () => Field.from(4));
        
        console.log(`[${backend}] Computing c = a.mul(b)...`);
        const c = a.mul(b);
        
        console.log(`[${backend}] Calling c.assertEquals(12)...`);
        c.assertEquals(Field.from(12));
      });
      
      console.log(`\n[${backend}] ✅ Constraint system generated`);
      console.log(`[${backend}] Total existsOne calls:`, existsOneCalls);
      console.log(`[${backend}] Total Gates.generic calls:`, genericCalls);
      console.log(`[${backend}] Gates in constraint system:`, cs.gates.length);
      
      // Find multiplication constraint
      cs.gates.forEach((gate, i) => {
        if (gate.coeffs && gate.coeffs[3] !== '0000000000000000000000000000000000000000000000000000000000000000') {
          console.log(`\n[${backend}] Multiplication gate at index ${i}`);
        }
      });
      
    } catch (error) {
      console.log(`[${backend}] ❌ Constraint generation failed:`, error.message);
    }
    
    console.log(`\n2️⃣ WITNESS GENERATION MODE`);
    console.log('-'.repeat(30));
    
    try {
      existsOneCalls = 0;
      genericCalls = 0;
      varAllocations.length = 0;
      
      await Provable.runAndCheck(() => {
        console.log(`\n[${backend}] Creating witness a...`);
        const a = Provable.witness(Field, () => Field.from(3));
        
        console.log(`[${backend}] Creating witness b...`);
        const b = Provable.witness(Field, () => Field.from(4));
        
        console.log(`[${backend}] Computing c = a.mul(b)...`);
        const c = a.mul(b);
        
        console.log(`[${backend}] Calling c.assertEquals(12)...`);
        c.assertEquals(Field.from(12));
      });
      
      console.log(`\n[${backend}] ✅ Witness generation passed!`);
      console.log(`[${backend}] Total existsOne calls:`, existsOneCalls);
      
    } catch (error) {
      console.log(`\n[${backend}] ❌ Witness generation failed:`, error.message);
      if (error.message.includes('VarId')) {
        console.log(`[${backend}] -> This is the VarId mismatch issue`);
      }
    }
    
    // Restore originals
    Snarky.run.existsOne = originalExistsOne;
    Gates.generic = originalGeneric;
  }
  
  console.log('\n\n📊 ANALYSIS');
  console.log('===========');
  console.log('Key differences to investigate:');
  console.log('1. Does Snarky use a global variable counter?');
  console.log('2. Does Snarky handle linear combinations differently?');
  console.log('3. Is the TypeScript layer doing something different for each backend?');
}

compareSnarkyVsSparky().catch(console.error);