import { Field } from './dist/node/index.js';
import { MlFieldConstArray } from './dist/node/lib/ml/fields.js';

console.log('=== Testing Field Conversion ===\n');

// Test 1: Create Field objects
console.log('1. Creating Field objects:');
const field0 = Field(0);
const field1 = Field(1);
const field2 = Field(2);

console.log('field0:', field0);
console.log('field1:', field1); 
console.log('field2:', field2);

// Test 2: Check Field properties
console.log('\n2. Field properties:');
console.log('field0 instanceof Field:', field0 instanceof Field);
console.log('field0.constructor.name:', field0.constructor.name);
console.log('typeof field0:', typeof field0);
console.log('field0.value:', field0.value);

// Test 3: Test toString
console.log('\n3. Field toString():');
console.log('field0.toString():', field0.toString());
console.log('String(field0):', String(field0));
console.log('`${field0}`:', `${field0}`);

// Test 4: Test array creation
console.log('\n4. Creating array of Fields:');
const fieldArray = [field0, field1, field2];
console.log('fieldArray:', fieldArray);
console.log('JSON.stringify(fieldArray):', JSON.stringify(fieldArray));

// Test 5: Test what happens if we create fake Field objects
console.log('\n5. Creating fake Field objects:');
const fakeField0 = { toString: () => 'Field[0]' };
const fakeField1 = { toString: () => 'Field[1]' };
const fakeField2 = { toString: () => 'Field[2]' };

console.log('fakeField0:', fakeField0);
console.log('String(fakeField0):', String(fakeField0));

// Test 6: What happens if toConstant doesn't work
console.log('\n6. Testing toConstant:');
try {
  console.log('field0.toConstant():', field0.toConstant());
  console.log('field0.toConstant().value:', field0.toConstant().value);
  console.log('field0.toConstant().value[1]:', field0.toConstant().value[1]);
} catch (e) {
  console.error('Error calling toConstant():', e);
}

// Test 7: Test MlFieldConstArray conversion
console.log('\n7. Testing MlFieldConstArray.to():');
globalThis.DEBUG_ML_FIELD_CONST_ARRAY = true;
try {
  const mlArray = MlFieldConstArray.to(fieldArray);
  console.log('Success! mlArray:', mlArray);
} catch (e) {
  console.error('Error in MlFieldConstArray.to():', e.message);
  console.error('Stack:', e.stack);
}

// Test 8: Test with array that might cause the error
console.log('\n8. Testing with problematic array:');
const problematicArray = [fakeField0, fakeField1, fakeField2];
try {
  const mlArray2 = MlFieldConstArray.to(problematicArray);
  console.log('Success with fake fields! mlArray2:', mlArray2);
} catch (e) {
  console.error('Error with fake fields:', e.message);
}

// Test 9: Test if Field objects are being replaced somewhere
console.log('\n9. Testing Field object replacement:');
const testObj = {
  field0: Field(0),
  field1: Field(1),
  field2: Field(2)
};

console.log('Original testObj:', testObj);
console.log('JSON.stringify(testObj):', JSON.stringify(testObj));
console.log('JSON.parse(JSON.stringify(testObj)):', JSON.parse(JSON.stringify(testObj)));