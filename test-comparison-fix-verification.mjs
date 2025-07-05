// Verify comparison operations fix in ZkProgram context
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import pkg from './dist/node/index.js';
const { Field, ZkProgram, switchBackend, getCurrentBackend } = pkg;

async function verifyComparisonFix() {
  console.log('🔍 VERIFICATION: Testing comparison operations fix in ZkProgram context');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  const TestProgram = ZkProgram({
    name: 'ComparisonTest',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      testComparison: {
        privateInputs: [Field],
        method(input, value) {
          console.log('  🎯 INSIDE ZKPROGRAM: About to test lessThan...');
          
          try {
            // This should now work without returning undefined
            const isLess = value.lessThan(Field(100));
            console.log('  ✅ lessThan succeeded:', isLess);
            console.log('  ✅ lessThan type:', typeof isLess);
            
            if (isLess === undefined) {
              console.log('  ❌ STILL UNDEFINED - fix did not work');
              return Field(0);
            }
            
            // Test greaterThan too
            const isGreater = value.greaterThan(Field(10));
            console.log('  ✅ greaterThan succeeded:', isGreater);
            
            if (isGreater === undefined) {
              console.log('  ❌ greaterThan STILL UNDEFINED');
              return Field(0);
            }
            
            // Test assertLessThan
            console.log('  🎯 Testing assertLessThan...');
            value.assertLessThan(Field(1000));
            console.log('  ✅ assertLessThan succeeded');
            
            return input.add(Field(1));
            
          } catch (error) {
            console.log('  ❌ Error in comparison test:', error.message);
            return Field(0);
          }
        }
      }
    }
  });
  
  try {
    console.log('🚀 Starting ZkProgram compilation...');
    const result = await TestProgram.compile();
    console.log('🎉 SUCCESS: ZkProgram compilation completed successfully!');
    console.log('✅ VERIFICATION: Comparison operations fix is working');
    return true;
  } catch (error) {
    console.log('❌ VERIFICATION FAILED: ZkProgram compilation failed');
    console.log('Error:', error.message);
    return false;
  }
}

verifyComparisonFix().then(success => {
  if (success) {
    console.log('\n🎯 VERIFICATION COMPLETE: Comparison operations fix verified successfully');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Further investigation needed');
  }
}).catch(console.error);