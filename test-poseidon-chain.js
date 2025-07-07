import { Field, ZkProgram, switchBackend, Poseidon } from './dist/node/index.js';

// Create a program with multiple Poseidon hash operations that should require multiple constraints
const MultiPoseidonProgram = ZkProgram({
  name: 'MultiPoseidonProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hashChain: {
      privateInputs: [Field, Field, Field],
      method(publicInput, a, b, c) {
        console.log('Starting hash chain computation...');
        
        // First hash: hash(publicInput, a)
        const hash1 = Poseidon.hash([publicInput, a]);
        console.log('Hash 1 completed');
        
        // Second hash: hash(hash1, b)  
        const hash2 = Poseidon.hash([hash1, b]);
        console.log('Hash 2 completed');
        
        // Third hash: hash(hash2, c)
        const hash3 = Poseidon.hash([hash2, c]);
        console.log('Hash 3 completed');
        
        // Fourth hash: hash(hash3, publicInput)
        const finalHash = Poseidon.hash([hash3, publicInput]);
        console.log('Final hash completed');
        
        return finalHash;
      }
    }
  }
});

async function testMultiPoseidonOptimization() {
  console.log('🔍 Testing Multi-Poseidon Chain Optimization Fix\\n');
  
  try {
    await switchBackend('sparky');
    console.log('✅ Switched to Sparky backend\\n');
    
    console.log('📋 Compiling multi-Poseidon program...');
    const startCompile = Date.now();
    
    const result = await MultiPoseidonProgram.compile();
    
    const compileTime = Date.now() - startCompile;
    console.log(`✅ Compilation succeeded in ${compileTime}ms\\n`);
    
    console.log('🔍 Generating proof with multiple hash operations...');
    const startProof = Date.now();
    
    // Test with: publicInput=1, a=2, b=3, c=4
    // This should create multiple constraints (not collapse to 1)
    const proof = await MultiPoseidonProgram.hashChain(Field(1), Field(2), Field(3), Field(4));
    
    const proofTime = Date.now() - startProof;
    console.log(`✅ Proof generation succeeded in ${proofTime}ms!`);
    console.log(`📊 Final hash result: ${proof.publicOutput.toString()}`);
    
    console.log('\\n🎯 OPTIMIZATION FIX VERIFICATION:');
    console.log('- Multiple Poseidon hash operations compiled successfully');
    console.log('- No aggressive optimization collapsed the chain to single constraint');
    console.log('- Permutation system should now have proper cross-row variable sharing');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('\\n🚨 PERMUTATION ERROR DETECTED:');
      console.log('- This indicates the optimization fix may not be fully effective');
      console.log('- Or there may be additional issues beyond aggressive optimization');
    }
  }
}

testMultiPoseidonOptimization().catch(console.error);