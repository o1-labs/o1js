// Simple CommonJS test for existsOne debugging
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

const o1js = require('./dist/node/index.js');
const { Field, switchBackend, getCurrentBackend, Provable } = o1js;

async function testExistsOneDirectly() {
  console.log('=== Testing existsOne directly ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  // Test existsOne in simple context vs ZkProgram context
  console.log('\n1. Testing existsOne in simple constraint context:');
  try {
    const constraintSystem = Provable.constraintSystem(() => {
      console.log('  Inside simple constraint system...');
      
      // Direct access to run module
      const runModule = globalThis.sparkyInstance?.run;
      if (runModule && runModule.existsOne) {
        console.log('  Calling existsOne directly...');
        const result = runModule.existsOne(() => {
          console.log('    Compute function called in simple context');
          return Field(42);
        });
        console.log('  existsOne result:', result);
        console.log('  existsOne result type:', typeof result);
        return result;
      } else {
        console.log('  ❌ runModule.existsOne not available');
        return null;
      }
    });
    
    const finalResult = await constraintSystem;
    console.log('  Final result:', finalResult);
  } catch (error) {
    console.log('  Error in simple context:', error.message);
  }
}

testExistsOneDirectly().catch(console.error);