#!/usr/bin/env node

/**
 * Test script to verify constraint parity optimizations
 * This tests whether the new optimization passes successfully reduce
 * Sparky's constraint count to match Snarky's
 * 
 * Created: July 5, 2025, 12:05 AM UTC
 * Last Modified: July 5, 2025, 12:40 AM UTC
 */

import { switchBackend, Provable, Field, Bool } from './dist/node/index.js';

async function getConstraintCount(backend, operation) {
  switchBackend(backend);
  
  // Reset constraint system
  await Provable.constraintSystem(() => {
    // Just to clear any previous state
  });
  
  // Capture constraints for the operation
  const { rows } = await Provable.constraintSystem(operation);
  return rows;
}

async function testOperations() {
  console.log('🧪 Testing Constraint Parity Optimizations\n');
  console.log('Testing key operations that showed differences:\n');
  
  const tests = [
    {
      name: 'Multiplication Chain (3 terms)',
      operation: () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = Provable.witness(Field, () => Field(4));
        const temp = a.mul(b);
        const result = temp.mul(c);
        return result;
      }
    },
    {
      name: 'Boolean OR',
      operation: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const result = a.or(b);
        return result;
      }
    },
    {
      name: 'Field Conditional',
      operation: () => {
        const condition = Provable.witness(Bool, () => Bool(true));
        const thenVal = Provable.witness(Field, () => Field(10));
        const elseVal = Provable.witness(Field, () => Field(20));
        const result = Provable.if(condition, thenVal, elseVal);
        return result;
      }
    },
    {
      name: 'Complex Boolean Circuit',
      operation: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = Provable.witness(Bool, () => Bool(true));
        const ab = a.and(b);
        const bc = b.or(c);
        const result = ab.or(bc);
        return result;
      }
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const snarkyCount = await getConstraintCount('snarky', test.operation);
    const sparkyCount = await getConstraintCount('sparky', test.operation);
    
    const parity = snarkyCount === sparkyCount;
    const improvement = snarkyCount > 0 ? ((1 - sparkyCount/snarkyCount) * 100).toFixed(1) : 0;
    
    results.push({
      name: test.name,
      snarky: snarkyCount,
      sparky: sparkyCount,
      parity,
      improvement
    });
    
    console.log(`${parity ? '✅' : '❌'} ${test.name}`);
    console.log(`   Snarky: ${snarkyCount} constraints`);
    console.log(`   Sparky: ${sparkyCount} constraints`);
    if (!parity) {
      console.log(`   Difference: ${sparkyCount - snarkyCount} extra constraints`);
      if (sparkyCount < snarkyCount) {
        console.log(`   🎉 Sparky is MORE efficient! (${Math.abs(improvement)}% fewer constraints)`);
      } else {
        console.log(`   📊 Overhead: ${improvement}%`);
      }
    }
    console.log();
  }
  
  // Summary
  const parityCount = results.filter(r => r.parity).length;
  const totalTests = results.length;
  const parityPercentage = (parityCount / totalTests * 100).toFixed(1);
  
  console.log('\n📊 Summary:');
  console.log(`Constraint Parity: ${parityCount}/${totalTests} (${parityPercentage}%)`);
  
  // Show improvements
  const improvements = results.filter(r => !r.parity && r.sparky > r.snarky);
  if (improvements.length > 0) {
    console.log('\n🔧 Operations needing optimization:');
    improvements.forEach(r => {
      console.log(`  - ${r.name}: ${r.sparky - r.snarky} extra constraints`);
    });
  }
  
  const optimized = results.filter(r => r.sparky < r.snarky);
  if (optimized.length > 0) {
    console.log('\n🎉 Sparky optimizations (better than Snarky):');
    optimized.forEach(r => {
      console.log(`  - ${r.name}: ${r.snarky - r.sparky} fewer constraints`);
    });
  }
}

// Run the tests
testOperations().catch(console.error);