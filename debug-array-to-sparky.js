// Debug script to trace the MlFieldConstArray conversion issue

import { Field } from './dist/node/index.js';
import { MlFieldConstArray } from './dist/node/lib/ml/fields.js';

// Create some test Field objects
console.log('Creating test Field objects...');
const field0 = Field(0);
const field1 = Field(1);
const field2 = Field(2);

console.log('\nField objects:');
console.log('field0:', field0);
console.log('field0.value:', field0.value);
console.log('field0.toString():', field0.toString());
console.log('field0.toConstant():', field0.toConstant());
console.log('field0.toConstant().value:', field0.toConstant().value);

console.log('\nTesting MlFieldConstArray.to():');
try {
  const fieldArray = [field0, field1, field2];
  console.log('Input array:', fieldArray);
  
  // Log what happens in the conversion
  const convertedArray = fieldArray.map((x, i) => {
    console.log(`\nProcessing field[${i}]:`, x);
    console.log(`  typeof x: ${typeof x}`);
    console.log(`  x.toConstant: ${typeof x.toConstant}`);
    if (x.toConstant) {
      const constant = x.toConstant();
      console.log(`  x.toConstant():`, constant);
      console.log(`  x.toConstant().value:`, constant.value);
      console.log(`  x.toConstant().value[1]:`, constant.value ? constant.value[1] : 'undefined');
    }
    return x.toConstant().value[1];
  });
  
  console.log('\nConverted values:', convertedArray);
  
  const mlArray = MlFieldConstArray.to(fieldArray);
  console.log('\nFinal MlFieldConstArray:', mlArray);
} catch (error) {
  console.error('\nError during conversion:', error);
  console.error('Stack trace:', error.stack);
}