import { Field, Provable } from './dist/node/index.js';

console.log('Testing minimal constraint generation...\n');

try {
  // Test 1: Simple witness generation
  console.log('1. Testing witness generation...');
  Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log('✅ Witness generation works\n');
  
  // Test 2: Simple constraint with constants
  console.log('2. Testing constraint with constants...');
  Provable.runAndCheck(() => {
    const x = Field(5);
    const y = Field(5);
    x.assertEquals(y);
  });
  console.log('✅ Constant constraint works\n');
  
  // Test 3: Mixed constraint
  console.log('3. Testing mixed constraint...');
  Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(10));
    x.assertEquals(Field(10));
  });
  console.log('✅ Mixed constraint works\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}