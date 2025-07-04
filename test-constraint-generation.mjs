#!/usr/bin/env node

// Test constraint generation and counting
import { initializeBindings, switchBackend, Field } from './dist/node/index.js';

async function testConstraintGeneration() {
  console.log('🧪 Testing constraint generation and counting...');
  
  await initializeBindings();
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Import Provable to create constraint contexts
  const { Provable } = await import('./dist/node/index.js');
  
  console.log('🔍 Testing constraint generation with simple field operation...');
  
  // Generate constraints by using Provable.constraintSystem
  const constraintSystem = await Provable.constraintSystem(() => {
    // Create some field variables and operations that should generate constraints
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(3));
    
    // This should generate a multiplication constraint
    const product = a.mul(b);
    
    // This should generate an equality constraint
    product.assertEquals(Field(15));
    
    console.log('🔢 Generated field operations: a * b = 15');
  });
  
  console.log('📊 Constraint system result:');
  console.log('  - Rows:', constraintSystem.rows);
  console.log('  - Gates:', constraintSystem.gates?.length || 0);
  
  if (constraintSystem.rows > 0) {
    console.log('✅ SUCCESS: Sparky generated', constraintSystem.rows, 'constraints');
  } else {
    console.log('❌ FAILURE: Sparky generated 0 constraints');
  }
}

testConstraintGeneration().catch(console.error);