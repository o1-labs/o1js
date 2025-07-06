/**
 * Quick test to examine constraint count extraction methods
 */

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

const SimpleTest = ZkProgram({
  name: 'SimpleTest',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        return { publicOutput: publicInput.add(privateInput) };
      },
    },
  },
});

async function testConstraintExtraction() {
  console.log('🔍 Testing constraint extraction methods...\n');
  
  // Test with Snarky first
  console.log('📊 Testing with Snarky backend:');
  await switchBackend('snarky');
  
  console.log('Available methods on SimpleTest:', Object.getOwnPropertyNames(SimpleTest));
  console.log('typeof analyzeMethods:', typeof SimpleTest.analyzeMethods);
  
  if (typeof SimpleTest.analyzeMethods === 'function') {
    try {
      console.log('Calling analyzeMethods...');
      const analysis = SimpleTest.analyzeMethods();
      console.log('Analysis result:', analysis);
      console.log('Analysis result type:', typeof analysis);
      if (analysis && typeof analysis === 'object') {
        console.log('Analysis keys:', Object.keys(analysis));
        const methodNames = Object.keys(analysis);
        if (methodNames.length > 0) {
          console.log(`First method "${methodNames[0]}" analysis:`, analysis[methodNames[0]]);
        }
      }
    } catch (error) {
      console.log('analyzeMethods error:', error.message);
    }
  }
  
  console.log('\nCompiling...');
  const result = await SimpleTest.compile();
  console.log('Compilation result keys:', Object.keys(result));
  console.log('VK keys:', Object.keys(result.verificationKey));
  
  if (result.verificationKey.data) {
    console.log('VK data keys:', Object.keys(result.verificationKey.data));
  }
  
  // Test if there are other methods to get constraint info
  console.log('\nOther potential methods:');
  console.log('result.constraintCount:', result.constraintCount);
  console.log('result.constraints:', result.constraints ? 'exists' : 'undefined');
  console.log('result.cs:', result.cs ? 'exists' : 'undefined');
}

testConstraintExtraction().catch(console.error);