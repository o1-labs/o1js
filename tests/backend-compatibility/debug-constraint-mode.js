import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';
import { Gadgets } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function debugConstraintMode() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Testing rotate64 in different modes ===');
  
  // Test 1: Witness generation mode (should work)
  console.log('\n1. Witness generation mode:');
  try {
    const result = Provable.witness(Field, () => {
      return rotate64(Field(15), 4, 'left');
    });
    console.log('✅ Witness mode works:', result.toBigInt());
  } catch (e) {
    console.error('❌ Witness mode failed:', e.message);
  }
  
  // Test 2: Constraint system mode (this is where it's failing)
  console.log('\n2. Constraint system mode:');
  try {
    const { constraints } = Provable.constraintSystem(() => {
      const input = Field(15);
      const result = rotate64(input, 4, 'left');
      result.assertEquals(Field(240)); // 15 << 4 = 240
    });
    console.log('✅ Constraint mode works, constraints:', constraints.length);
  } catch (e) {
    console.error('❌ Constraint mode failed:', e.message);
    console.error('Stack:', e.stack);
  }
  
  // Test 3: Mixed mode (constraint system with witness)
  console.log('\n3. Mixed mode (constraint + witness):');
  try {
    const { constraints } = Provable.constraintSystem(() => {
      const input = Provable.witness(Field, () => Field(15));
      const result = rotate64(input, 4, 'left');
      result.assertEquals(Provable.witness(Field, () => Field(240)));
    });
    console.log('✅ Mixed mode works, constraints:', constraints.length);
  } catch (e) {
    console.error('❌ Mixed mode failed:', e.message);
    console.error('Stack:', e.stack);
  }
}

debugConstraintMode().catch(console.error);