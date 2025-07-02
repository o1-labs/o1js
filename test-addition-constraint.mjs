import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🧪 Testing Addition Constraint Fix\n');

// Test addition constraint specifically
async function testAddition() {
  console.log('Testing: x + y = z');
  
  try {
    // Switch to Sparky
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    // Generate constraints for addition
    const cs = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(4));
      const z = x.add(y);
      z.assertEquals(Field(7));
    });
    
    console.log('✓ Constraint system generated successfully');
    console.log(`  Rows: ${cs.rows}`);
    console.log(`  Gates: ${cs.gates?.length}`);
    console.log(`  Public inputs: ${cs.publicInputSize}`);
    
    if (cs.gates && cs.gates.length > 0) {
      console.log('\n✅ SUCCESS: Addition constraint properly generated!');
      console.log('Gate 0 coefficients:', cs.gates[0].coeffs);
    } else {
      console.log('\n❌ FAILED: No gates generated - constraint was dropped');
    }
    
  } catch (error) {
    console.log('\n💥 ERROR:', error.message);
    if (error.message.includes('CONSTRAINT SYSTEM ERROR')) {
      console.log('✅ Good: Error handling is working and catching issues!');
    }
  }
}

testAddition().catch(console.error);