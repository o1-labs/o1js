#!/usr/bin/env node
/**
 * Debug triple nesting issue - find where extra wrapping happens
 */

console.log('🔍 Debugging triple nesting in FieldVar creation...');

async function testFieldCreation() {
  console.log('\n🧪 Testing Field value creation...');
  
  // Import the necessary modules
  const o1js = await import('./dist/node/index.js');
  const { Field } = o1js;
  
  console.log('🔍 Creating Field(42)...');
  const field = Field(42);
  console.log('Field.value:', field.value);
  console.log('Type analysis:');
  
  function analyzeStructure(obj, path = 'root') {
    if (Array.isArray(obj)) {
      console.log(`  ${path}: Array[${obj.length}] = [${obj.map(x => typeof x === 'bigint' ? `${x}n` : x).join(', ')}]`);
      obj.forEach((item, index) => {
        if (typeof item === 'object' || Array.isArray(item)) {
          analyzeStructure(item, `${path}[${index}]`);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      console.log(`  ${path}: Object with keys: ${Object.keys(obj)}`);
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' || Array.isArray(value)) {
          analyzeStructure(value, `${path}.${key}`);
        }
      });
    }
  }
  
  analyzeStructure(field.value);
  
  // Test with different values
  console.log('\n🔍 Testing Field(0)...');
  const field0 = Field(0);
  console.log('Field(0).value:', field0.value);
  analyzeStructure(field0.value, 'field0');
  
  // Test with string
  console.log('\n🔍 Testing Field("42")...');
  const fieldStr = Field("42");
  console.log('Field("42").value:', fieldStr.value);
  analyzeStructure(fieldStr.value, 'fieldStr');
  
  // Test with bigint
  console.log('\n🔍 Testing Field(42n)...');
  const fieldBig = Field(42n);
  console.log('Field(42n).value:', fieldBig.value);
  analyzeStructure(fieldBig.value, 'fieldBig');
  
  // Test FieldConst directly
  console.log('\n🔍 Testing Field([0, 42n])...');
  const fieldConst = Field([0, 42n]);
  console.log('Field([0, 42n]).value:', fieldConst.value);
  analyzeStructure(fieldConst.value, 'fieldConst');
  
  // Test what happens with ML Array conversion
  console.log('\n🔍 Testing MlFieldArray.to([field])...');
  const { MlFieldArray } = await import('./dist/node/lib/ml/fields.js');
  const mlArray = MlFieldArray.to([field]);
  console.log('MlFieldArray.to([field]):', mlArray);
  analyzeStructure(mlArray, 'mlArray');
}

testFieldCreation().catch(console.error);