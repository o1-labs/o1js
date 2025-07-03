/**
 * Minimal test to debug Sparky constraint generation
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintGeneration() {
  console.log('🔍 Testing constraint generation in both backends...\n');
  
  // Simple circuit that should generate 1 constraint
  const simpleCircuit = () => {
    const a = Field(3);
    const b = Field(4);
    const c = a.mul(b); // This should generate 1 multiplication constraint
    c.assertEquals(Field(12));
  };

  // Test with Snarky backend
  console.log('Testing with Snarky backend:');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  const snarkyCS = await Provable.constraintSystem(simpleCircuit);
  console.log('Snarky constraint count:', snarkyCS.gates.length);
  console.log('Snarky constraints:', snarkyCS.gates.length > 0 ? 'Generated ✅' : 'None generated ❌');
  
  // Test with Sparky backend
  console.log('\nTesting with Sparky backend:');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  console.log('Checking globalThis.__snarky:', typeof globalThis.__snarky);
  console.log('Checking globalThis.__snarky.Snarky:', typeof globalThis.__snarky?.Snarky);
  
  const sparkyCS = await Provable.constraintSystem(simpleCircuit);
  console.log('Sparky constraint count:', sparkyCS.gates.length);
  console.log('Sparky constraints:', sparkyCS.gates.length > 0 ? 'Generated ✅' : 'None generated ❌');
  
  // Debug information
  console.log('\n🔍 Debug Information:');
  console.log('sparkyCS structure:', Object.keys(sparkyCS));
  console.log('sparkyCS.gates type:', typeof sparkyCS.gates);
  console.log('sparkyCS.gates:', sparkyCS.gates);
  
  // Test individual constraint generation
  console.log('\n🔍 Testing individual constraint generation:');
  await switchBackend('sparky');
  
  try {
    // Test direct field operations
    const field = Field(5);
    console.log('Field(5) created successfully');
    
    const squared = field.square();
    console.log('field.square() executed successfully');
    console.log('Result:', squared.toString());
    
    // Test assertion
    squared.assertEquals(Field(25));
    console.log('assertEquals executed successfully');
    
  } catch (error) {
    console.error('Field operations failed:', error.message);
  }
}

testConstraintGeneration().catch(console.error);