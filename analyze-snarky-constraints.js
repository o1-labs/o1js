import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Minimal program to analyze Snarky constraint generation
const AnalysisProgram = ZkProgram({
  name: 'AnalysisProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    simpleAdd: {
      privateInputs: [Field],
      async method(publicInput, a) {
        console.log('🔍 SNARKY ANALYSIS: a.add(publicInput)');
        const result = a.add(publicInput);
        return result;
      }
    },
    
    simpleMultiply: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        console.log('🔍 SNARKY ANALYSIS: a.mul(b)');
        const result = a.mul(b);
        return result;
      }
    },
    
    addThenMultiply: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        console.log('🔍 SNARKY ANALYSIS: a.add(publicInput).mul(b)');
        const temp = a.add(publicInput);
        const result = temp.mul(b);
        return result;
      }
    }
  }
});

async function analyzeSnarkyConstraints() {
  console.log('🔬 ANALYZING SNARKY CONSTRAINT GENERATION');
  console.log('==========================================\n');
  
  // First analyze with Snarky backend
  console.log('📋 PHASE 1: Analyzing Snarky Backend');
  console.log('─'.repeat(40));
  
  await switchBackend('snarky');
  
  const testCases = [
    { method: 'simpleAdd', inputs: [Field(10), Field(5)] },
    { method: 'simpleMultiply', inputs: [Field(10), Field(5), Field(3)] },
    { method: 'addThenMultiply', inputs: [Field(10), Field(5), Field(3)] }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.method}`);
    console.log('─'.repeat(25));
    
    try {
      console.log('🔧 Compiling with Snarky...');
      await AnalysisProgram.compile();
      console.log('✅ Snarky compilation succeeded');
      
      console.log('🎯 Generating proof...');
      const proof = await AnalysisProgram[testCase.method](...testCase.inputs);
      console.log('✅ Snarky proof generation succeeded');
      console.log(`📊 Result: ${proof.publicOutput.toString()}`);
      
      console.log('🔍 Verifying proof...');
      const verified = await AnalysisProgram.verify(proof);
      console.log(`✅ Snarky verification: ${verified ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`❌ Snarky error: ${error.message}`);
    }
  }
  
  // Now analyze with Sparky backend
  console.log('\n📋 PHASE 2: Analyzing Sparky Backend');
  console.log('─'.repeat(40));
  
  await switchBackend('sparky');
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.method}`);
    console.log('─'.repeat(25));
    
    try {
      console.log('🔧 Compiling with Sparky...');
      await AnalysisProgram.compile();
      console.log('✅ Sparky compilation succeeded');
      
      console.log('🎯 Generating proof...');
      const proof = await AnalysisProgram[testCase.method](...testCase.inputs);
      console.log('✅ Sparky proof generation succeeded');
      console.log(`📊 Result: ${proof.publicOutput.toString()}`);
      
      console.log('🔍 Verifying proof...');
      const verified = await AnalysisProgram.verify(proof);
      console.log(`✅ Sparky verification: ${verified ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`❌ Sparky error: ${error.message}`);
      
      if (error.message.includes('permutation was not constructed correctly')) {
        console.log('🔍 PERMUTATION ERROR: Expected if fix not working');
      }
    }
  }
  
  console.log('\n🧠 CONSTRAINT ANALYSIS SUMMARY:');
  console.log('Look at the compilation logs above to compare:');
  console.log('1. How many constraints each backend generates');
  console.log('2. Whether the outputs match mathematically');
  console.log('3. Whether permutation errors still occur');
}

analyzeSnarkyConstraints().catch(console.error);