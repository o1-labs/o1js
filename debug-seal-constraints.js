import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Test if seal() generates constraints
const SealProgram = ZkProgram({
  name: 'SealProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput, a) {
        console.log('🔍 TESTING: a.add(publicInput).seal()');
        
        // Force constraint generation with seal()
        const result = a.add(publicInput).seal();
        
        console.log('🔍 SEAL COMPLETED');
        return result;
      }
    }
  }
});

async function debugSealConstraints() {
  console.log('🚨 TESTING: Does seal() Generate Constraints?');
  console.log('===============================================\n');
  
  await switchBackend('sparky');
  
  try {
    console.log('🔧 Compiling program with explicit seal()...');
    await SealProgram.compile();
    console.log('✅ Compilation completed');
    
    console.log('\n🎯 Attempting proof generation...');
    const proof = await SealProgram.compute(Field(10), Field(5));
    
    console.log('🎉 SUCCESS! Proof generated with seal()');
    console.log(`📊 Result: ${proof.publicOutput.toString()}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('\n🔍 ANALYSIS: seal() still fails with permutation error');
      console.log('This means either:');
      console.log('1. assertEquals() is not generating constraints in Sparky');
      console.log('2. The constraint system is malformed even with explicit constraints');
    } else {
      console.log('\n✅ Different error - seal() may have solved permutation issue');
    }
  }
}

debugSealConstraints().catch(console.error);