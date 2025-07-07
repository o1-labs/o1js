import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Test with increasingly complex multiplication chains
const BigMultiplicationChain = ZkProgram({
  name: 'BigMultiplicationChain',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    chain5: {
      privateInputs: [Field, Field, Field, Field, Field],
      method(publicInput, a, b, c, d, e) {
        console.log('Computing 5-multiplication chain: a * b * c * d * e + publicInput');
        // This should create intermediate variables: 
        // temp1 = a * b, temp2 = temp1 * c, temp3 = temp2 * d, temp4 = temp3 * e
        // result = temp4 + publicInput
        const result = a.mul(b).mul(c).mul(d).mul(e).add(publicInput);
        return result;
      }
    },
    
    chain8: {
      privateInputs: [Field, Field, Field, Field, Field, Field, Field, Field],
      method(publicInput, a, b, c, d, e, f, g, h) {
        console.log('Computing 8-multiplication chain: a * b * c * d * e * f * g * h + publicInput');
        // Even more intermediate variables - should definitely force multiple constraints
        const result = a.mul(b).mul(c).mul(d).mul(e).mul(f).mul(g).mul(h).add(publicInput);
        return result;
      }
    },

    explicitIntermediates: {
      privateInputs: [Field, Field, Field, Field],
      method(publicInput, a, b, c, d) {
        console.log('Computing with explicit intermediate assignments');
        // Force separate constraints by explicitly creating intermediates
        const temp1 = a.mul(b);
        const temp2 = temp1.mul(c);  
        const temp3 = temp2.mul(d);
        const result = temp3.add(publicInput);
        return result;
      }
    }
  }
});

async function testBigMultiplicationChain() {
  console.log('🔍 TESTING BIG MULTIPLICATION CHAINS');
  console.log('====================================\\n');
  console.log('🎯 Goal: Force multiple LIR constraints through complex operations\\n');
  
  await switchBackend('sparky');
  
  const testCases = [
    { method: 'chain5', inputs: [Field(1), Field(2), Field(3), Field(4), Field(5), Field(6)] },
    { method: 'chain8', inputs: [Field(1), Field(2), Field(3), Field(4), Field(5), Field(6), Field(7), Field(8), Field(9)] },
    { method: 'explicitIntermediates', inputs: [Field(1), Field(2), Field(3), Field(4), Field(5)] }
  ];
  
  for (const testCase of testCases) {
    console.log(`\\n📋 Testing: ${testCase.method}`);
    console.log('─'.repeat(50));
    
    try {
      console.log('🔧 Compiling...');
      await BigMultiplicationChain.compile();
      console.log('✅ Compilation succeeded');
      
      console.log('🎯 Generating proof...');
      const proof = await BigMultiplicationChain[testCase.method](...testCase.inputs);
      console.log('✅ Proof generation succeeded!');
      
      console.log('🔍 Verifying proof...');
      const verified = await BigMultiplicationChain.verify(proof);
      console.log(`✅ Verification: ${verified ? 'PASSED' : 'FAILED'}`);
      
      if (verified) {
        console.log('🎉 SUCCESS: Complex multiplication chain works with permutation!');
        console.log(`📊 Result: ${proof.publicOutput.toString()}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.message.includes('permutation was not constructed correctly')) {
        console.log('🚨 Still failing - multiplication chain not complex enough');
      } else {
        console.log('⚠️  Different error - may indicate progress');
      }
    }
  }
  
  console.log('\\n🎯 ULTRA-ANALYSIS:');
  console.log('If chain5 or chain8 work, multiplication chains force proper constraint structure.');
  console.log('If they still fail, the optimization is even more aggressive than expected.');
  console.log('The key insight: We need operations that CANNOT be merged into single R1CS gates.');
}

testBigMultiplicationChain().catch(console.error);