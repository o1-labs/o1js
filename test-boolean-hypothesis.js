#!/usr/bin/env node

/**
 * Test hypothesis about Boolean constraint generation
 * 
 * Created: July 5, 2025, 2:05 AM UTC
 * Last Modified: July 5, 2025, 2:05 AM UTC
 */

import { switchBackend, getCurrentBackend, Bool, Field, Provable, Circuit } from './dist/node/index.js';

async function testBooleanHypothesis() {
  console.log('🔬 Testing Boolean Constraint Generation Hypothesis\n');
  console.log('Hypothesis: Sparky generates redundant boolean checks that can be optimized away\n');
  
  // Test 1: Simple Boolean AND
  console.log('📊 Test 1: Simple Boolean AND');
  console.log('=' .repeat(50));
  
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n${backend}:`);
    
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Bool, () => Bool(true));
      const b = Provable.witness(Bool, () => Bool(false));
      const result = a.and(b);
      return result;
    });
    
    console.log(`  Constraints: ${cs.rows}`);
    if (cs.gates) {
      console.log(`  Gate breakdown:`);
      cs.gates.forEach((gate, i) => {
        console.log(`    ${i}: ${gate.type || 'Unknown'}`);
      });
    }
  }
  
  // Test 2: Chained Boolean operations (should reuse boolean constraints)
  console.log('\n\n📊 Test 2: Chained Boolean Operations');
  console.log('=' .repeat(50));
  console.log('Testing if boolean constraints are reused in chained operations...');
  
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n${backend}:`);
    
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Bool, () => Bool(true));
      const b = Provable.witness(Bool, () => Bool(false));
      const c = Provable.witness(Bool, () => Bool(true));
      
      // First AND
      const and1 = a.and(b);
      // Second AND using result of first
      const and2 = and1.and(c);
      // Third AND using original inputs
      const and3 = a.and(c);
      
      return [and1, and2, and3];
    });
    
    console.log(`  Total constraints: ${cs.rows}`);
    console.log(`  Expected if reusing boolean checks: ~5-6`);
    console.log(`  Expected if not reusing: ~9`);
  }
  
  // Test 3: Boolean from Field conversion
  console.log('\n\n📊 Test 3: Boolean from Field Conversion');
  console.log('=' .repeat(50));
  console.log('Testing constraints when converting Field to Bool...');
  
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n${backend}:`);
    
    const cs = await Provable.constraintSystem(() => {
      // Create Field values that are 0 or 1
      const f1 = Provable.witness(Field, () => Field(1));
      const f2 = Provable.witness(Field, () => Field(0));
      
      // Convert to Bool (should add boolean constraints)
      const b1 = Bool.fromFields([f1]);
      const b2 = Bool.fromFields([f2]);
      
      // AND operation
      const result = b1.and(b2);
      
      return result;
    });
    
    console.log(`  Constraints: ${cs.rows}`);
  }
  
  // Test 4: Pre-constrained booleans
  console.log('\n\n📊 Test 4: Pre-constrained Booleans');
  console.log('=' .repeat(50));
  console.log('Testing if we can avoid boolean checks for pre-constrained values...');
  
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n${backend}:`);
    
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Bool, () => Bool(true));
      const b = Provable.witness(Bool, () => Bool(false));
      
      // Force boolean constraints explicitly
      a.assertEquals(a); // This might add a boolean check
      b.assertEquals(b); // This might add a boolean check
      
      // Now do AND - should it skip boolean checks?
      const result = a.and(b);
      
      return result;
    });
    
    console.log(`  Constraints: ${cs.rows}`);
  }
  
  // Test 5: Analyze actual constraint structure
  console.log('\n\n📊 Test 5: Detailed Constraint Structure Analysis');
  console.log('=' .repeat(50));
  
  // Simple function to create boolean constraints manually
  async function analyzeManualConstraints() {
    console.log('\nManual constraint generation:');
    
    for (const backend of ['snarky', 'sparky']) {
      switchBackend(backend);
      console.log(`\n${backend}:`);
      
      // Test just the AND operation without boolean checks
      const cs1 = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(0));
        // Direct multiplication (AND without boolean checks)
        const result = a.mul(b);
        return result;
      });
      console.log(`  Just multiplication (a * b): ${cs1.rows} constraints`);
      
      // Test boolean check pattern
      const cs2 = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(1));
        // Boolean check: a * a = a (ensures a ∈ {0,1})
        const a_squared = a.mul(a);
        a_squared.assertEquals(a);
        return a;
      });
      console.log(`  Just boolean check (a * a = a): ${cs2.rows} constraints`);
      
      // Test full boolean AND pattern
      const cs3 = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(0));
        
        // Boolean checks
        const a_squared = a.mul(a);
        a_squared.assertEquals(a);
        const b_squared = b.mul(b);
        b_squared.assertEquals(b);
        
        // AND operation
        const result = a.mul(b);
        return result;
      });
      console.log(`  Full pattern (2 bool checks + AND): ${cs3.rows} constraints`);
    }
  }
  
  await analyzeManualConstraints();
  
  // Summary and recommendations
  console.log('\n\n📊 SUMMARY & RECOMMENDATIONS');
  console.log('=' .repeat(60));
  console.log('\n1. Sparky generates explicit boolean checks for each Bool input');
  console.log('2. These checks are: a * a = a and b * b = b');
  console.log('3. Snarky appears to use a different approach with fewer constraints');
  console.log('\nOptimization opportunities:');
  console.log('- Track which variables are already boolean-constrained');
  console.log('- Skip redundant checks in subsequent operations');
  console.log('- Use semantic Boolean operations for optimal patterns');
  console.log('- Consider backend-specific boolean handling strategies');
}

// Run the hypothesis test
testBooleanHypothesis().catch(console.error);