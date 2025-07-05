/**
 * Debug: Investigate Field object structure
 */

import { Field } from './dist/node/index.js';
import { MlFieldArray } from './dist/node/lib/ml/fields.js';

console.log('🔍 DEBUG: Field object structure investigation\n');

// Create a simple Field
const field = new Field(42);

console.log('Field object analysis:');
console.log('typeof field:', typeof field);
console.log('field.constructor.name:', field.constructor.name);
console.log('field.value:', field.value);
console.log('typeof field.value:', typeof field.value);
console.log('Array.isArray(field.value):', Array.isArray(field.value));

if (Array.isArray(field.value)) {
  console.log('field.value.length:', field.value.length);
  console.log('field.value structure:', JSON.stringify(field.value));
}

console.log('\nMlFieldArray investigation:');
const fields = [new Field(1), new Field(2), new Field(3)];
const mlArray = MlFieldArray.to(fields);

console.log('Original fields:', fields.map(f => ({ value: f.value })));
console.log('MLArray structure:', JSON.stringify(mlArray, (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  return value;
}, 2));

// Show what's inside the MLArray
const [tag, ...elements] = mlArray;
console.log('\nMLArray breakdown:');
console.log('Tag:', tag);
console.log('Elements count:', elements.length);
elements.forEach((element, i) => {
  console.log(`Element ${i}:`, {
    type: typeof element,
    isArray: Array.isArray(element),
    hasValueProp: element && typeof element === 'object' && 'value' in element,
    value: element?.value
  });
});