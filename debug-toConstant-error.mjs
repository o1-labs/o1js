import { Field, ZkProgram, Void } from './dist/node/index.js';
import { MlFieldConstArray } from './dist/node/lib/ml/fields.js';

// Test 1: Simple field toConstant test
console.log('Test 1: Testing Field.toConstant()');
try {
  const field = Field(42);
  console.log('Created field:', field);
  console.log('Field value:', field.value);
  console.log('Field isConstant:', field.isConstant());
  
  const constant = field.toConstant();
  console.log('Converted to constant successfully:', constant);
} catch (e) {
  console.error('Error in simple toConstant test:', e.message);
  console.error('Stack:', e.stack);
}

// Test 2: Testing with array
console.log('\nTest 2: Testing Field array conversion');
try {
  const fields = [Field(1), Field(2), Field(3)];
  console.log('Created fields array');
  
  // Try to map toConstant
  const constants = fields.map(f => {
    console.log('Processing field:', f);
    console.log('Field type:', typeof f);
    console.log('Field constructor:', f.constructor.name);
    console.log('Has toConstant?', typeof f.toConstant);
    return f.toConstant();
  });
  console.log('Converted array successfully:', constants);
} catch (e) {
  console.error('Error in array toConstant test:', e.message);
  console.error('Stack:', e.stack);
}

// Test 3: Test with undefined/null field
console.log('\nTest 3: Testing with undefined field');
try {
  const undefinedField = undefined;
  console.log('Trying to call toConstant on undefined...');
  undefinedField.toConstant();
} catch (e) {
  console.error('Expected error:', e.message);
}

// Test 4: Test ML array conversion (similar to what happens in fields.js)
console.log('\nTest 4: Testing ML array conversion');
try {
  const fields = [Field(1), Field(2), Field(3)];
  console.log('Fields to convert:', fields);
  
  // Check each field
  fields.forEach((f, i) => {
    console.log(`Field ${i}:`, f);
    console.log(`  - type:`, typeof f);
    console.log(`  - has toConstant:`, typeof f.toConstant);
    console.log(`  - value:`, f.value);
  });
  
  const mlArray = MlFieldConstArray.to(fields);
  console.log('Converted to ML array successfully:', mlArray);
} catch (e) {
  console.error('Error in ML array conversion:', e.message);
  console.error('Stack:', e.stack);
}

// Test 5: Test with empty program
console.log('\nTest 5: Testing empty ZkProgram');
const EmptyProgram = ZkProgram({
  name: 'EmptyProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // No constraints
      }
    }
  }
});

(async () => {
  try {
    console.log('Compiling empty program...');
    await EmptyProgram.compile();
    console.log('Compilation successful');
    
    console.log('Creating proof...');
    const proof = await EmptyProgram.empty();
    console.log('Proof created successfully');
  } catch (e) {
    console.error('Error in empty program:', e.message);
    console.error('Stack:', e.stack);
  }
})();