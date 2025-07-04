import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testConstraintSystem() {
  console.log('Testing constraint system generation with Sparky...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  try {
    // Test case that was failing: witness + assertEquals
    const result = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    });
    
    console.log('✅ Constraint system generated successfully!');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result || {}));
    console.log('\nConstraint system details:');
    console.log('- Gates:', result.gates?.length || 0);
    console.log('- Public input size:', result.publicInputSize);
    
    if (result.gates && result.gates.length > 0) {
      console.log('\nFirst gate:', JSON.stringify(result.gates[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Test with Snarky for comparison
  console.log('\n\nTesting with Snarky for comparison...');
  await switchBackend('snarky');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    });
    
    console.log('✅ Snarky constraint system:');
    console.log('- Gates:', result.gates?.length || 0);
    console.log('- Public input size:', result.publicInputSize);
  } catch (error) {
    console.error('❌ Snarky error:', error.message);
  }
}

testConstraintSystem().catch(console.error);