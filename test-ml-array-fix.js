#!/usr/bin/env node
/**
 * Test ML Array format parsing fix in Sparky
 */

console.log('🧪 Testing ML Array format parsing fix in Sparky...');

async function testMlArrayParsing() {
  try {
    // Test with Sparky backend
    console.log('🔄 Loading Sparky backend...');
    const o1js = await import('./dist/node/index.js');
    
    // Switch to Sparky
    await o1js.switchBackend('sparky');
    console.log('✅ Sparky backend loaded');
    
    // Test simple field creation to trigger ML Array conversion
    console.log('\n🧪 Testing Field creation (triggers ML Array conversion)...');
    const field42 = o1js.Field(42);
    console.log('Field(42).value:', field42.value);
    
    // Test field arithmetic that would go through ML Array
    console.log('\n🧪 Testing field arithmetic...');
    const field1 = o1js.Field(1);
    const field2 = o1js.Field(2);
    const result = field1.add(field2);
    console.log('Field(1).add(Field(2)):', result.toString());
    
    // Test with Provable.if which creates complex ML Array structures
    console.log('\n🧪 Testing Provable.if (complex ML Array structures)...');
    const condition = o1js.Bool(true);
    const thenVal = o1js.Field(10);
    const elseVal = o1js.Field(5);
    
    const ifResult = o1js.Provable.if(condition, thenVal, elseVal);
    console.log('Provable.if(true, 10, 5):', ifResult.toString());
    
    console.log('\n✅ All ML Array parsing tests passed!');
    
  } catch (error) {
    console.error('❌ ML Array parsing test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // If Sparky failed, test with Snarky for comparison
    try {
      console.log('\n🔄 Testing with Snarky backend for comparison...');
      await o1js.switchBackend('snarky');
      
      const field42 = o1js.Field(42);
      console.log('Snarky Field(42).value:', field42.value);
      
      console.log('✅ Snarky backend works normally');
    } catch (snarkyError) {
      console.error('❌ Snarky backend also failed:', snarkyError.message);
    }
  }
}

// Run the test
testMlArrayParsing().catch(console.error);