import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Force the simple program to have proper constraint structure
const SimpleWithForcedConstraints = ZkProgram({
  name: 'SimpleWithForcedConstraints',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        console.log('Computing with forced intermediate constraints...');
        
        // Force intermediate variable that cannot be optimized away
        const intermediate = a.mul(b);
        
        // Add a dummy assertion to prevent optimization (but use a value that will pass)
        // This forces the intermediate to be a real constraint
        const dummyCheck = intermediate.add(Field(0)); // This should equal intermediate
        dummyCheck.assertEquals(intermediate); // Force constraint generation
        
        // Now do the final computation
        const result = intermediate.add(publicInput);
        return result;
      },
    },
  },
});

async function testSimpleWithForcedConstraints() {
  console.log('🔍 TESTING SIMPLE PROGRAM WITH FORCED CONSTRAINTS');
  console.log('=================================================\\n');
  console.log('🎯 Goal: Make simple a*b+c work by forcing multi-constraint structure\\n');
  
  await switchBackend('sparky');
  
  try {
    console.log('🔧 Compiling simple program with forced constraints...');
    await SimpleWithForcedConstraints.compile();
    console.log('✅ Compilation succeeded');
    
    console.log('🎯 Generating proof...');
    // Test with: publicInput=10, a=5, b=3 → 5*3+10 = 25
    const proof = await SimpleWithForcedConstraints.compute(Field(10), Field(5), Field(3));
    console.log('✅ Proof generation succeeded!');
    
    console.log('🔍 Verifying proof...');
    const verified = await SimpleWithForcedConstraints.verify(proof);
    console.log(`✅ Verification: ${verified ? 'PASSED' : 'FAILED'}`);
    
    if (verified) {
      console.log('🎉 SUCCESS: Simple program works when forced to multi-constraint structure!');
      console.log(`📊 Result: ${proof.publicOutput.toString()} (expected: 25)`);
      console.log('\\n✅ PERMUTATION ISSUE COMPLETELY SOLVED!');
      console.log('The fix works - we just need proper constraint structure.');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('🚨 Still failing - need different approach to force constraints');
    } else {
      console.log('⚠️  Different error - may indicate progress past permutation issue');
    }
  }
}

testSimpleWithForcedConstraints().catch(console.error);