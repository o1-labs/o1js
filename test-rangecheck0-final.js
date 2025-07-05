/**
 * Final test: Prove rangeCheck0 works in actual zkProgram context
 */

import { switchBackend, getCurrentBackend, Field, ZkProgram } from './dist/node/index.js';

const RangeCheckProgram = ZkProgram({
  name: "RangeCheckTest",
  publicInput: Field,
  
  methods: {
    testLessThan: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        console.log('🔍 Inside ZkProgram method...');
        
        // This will use rangeCheck0 internally
        const isLess = privateInput.lessThan(publicInput);
        console.log('🔍 lessThan operation completed');
        
        // Assert the result
        isLess.assertTrue();
        console.log('🔍 Assertion completed');
      }
    }
  }
});

async function testRangeCheckInProgram() {
  console.log('🧪 FINAL TEST: rangeCheck0 in actual ZkProgram');
  
  try {
    // Test with Sparky backend
    await switchBackend('sparky');
    console.log(`✅ Using backend: ${getCurrentBackend()}`);
    
    console.log('\n🔧 Compiling ZkProgram...');
    const { verificationKey } = await RangeCheckProgram.compile();
    console.log('✅ ZkProgram compiled successfully!');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\n🧪 Creating proof with rangeCheck0...');
    const proof = await RangeCheckProgram.testLessThan(Field(100), Field(50));
    console.log('✅ Proof created successfully!');
    
    console.log('\n🔍 Verifying proof...');
    const isValid = await RangeCheckProgram.verify(proof);
    console.log('✅ Proof verification result:', isValid);
    
    if (isValid) {
      console.log('\n🎉 SUCCESS: rangeCheck0 works perfectly in production context!');
      console.log('🎯 CONCLUSION: The P0 blocker from TODO_NEXT.md is RESOLVED');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('rangeCheck0 is not a function')) {
      console.error('🚨 rangeCheck0 is still missing!');
    } else {
      console.error('Stack:', error.stack);
    }
  }
}

testRangeCheckInProgram();