import { Field, ZkProgram, switchBackend, Provable } from './dist/node/index.js';

// Create a program that forces multiple constraints by using multiple assertEquals
const MultiConstraintProgram = ZkProgram({
  name: 'MultiConstraintProgram',
  publicInput: Field,
  methods: {
    testMethod: {
      privateInputs: [Field, Field],
      method(pub, a, b) {
        // Force multiple constraints by using explicit assertEquals calls
        const intermediate1 = a.mul(b);
        intermediate1.assertEquals(Field(15)); // Constraint 1
        
        const intermediate2 = intermediate1.add(pub);
        intermediate2.assertEquals(Field(25)); // Constraint 2
        
        const result = intermediate2.mul(Field(2));
        result.assertEquals(Field(50)); // Constraint 3
        
        return result;
      }
    }
  }
});

async function testMultipleConstraints() {
  console.log('🔍 Testing Multiple Constraints for Permutation\n');
  
  await switchBackend('sparky');
  
  try {
    console.log('Compiling program with multiple explicit constraints...');
    const result = await MultiConstraintProgram.compile();
    console.log('✅ Compilation succeeded\n');
    
    console.log('Generating proof with inputs that should satisfy all constraints...');
    // a=3, b=5 -> a*b=15 -> 15+10=25 -> 25*2=50
    const proof = await MultiConstraintProgram.testMethod(Field(10), Field(3), Field(5));
    console.log('✅ Proof generation succeeded!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Also test with a simpler version
    console.log('\n--- Testing simpler multi-constraint version ---');
    
    const SimpleMultiProgram = ZkProgram({
      name: 'SimpleMultiProgram', 
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          method(pub, x) {
            // Two explicit equality assertions
            x.assertEquals(Field(5));
            pub.assertEquals(Field(10));
            return x.add(pub);
          }
        }
      }
    });
    
    try {
      console.log('Compiling simpler program...');
      await SimpleMultiProgram.compile();
      console.log('✅ Simple compilation succeeded');
      
      const proof = await SimpleMultiProgram.test(Field(10), Field(5));
      console.log('✅ Simple proof succeeded!');
    } catch (error2) {
      console.error('❌ Simple error:', error2.message);
    }
  }
}

testMultipleConstraints().catch(console.error);