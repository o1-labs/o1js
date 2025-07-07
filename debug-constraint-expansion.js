import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Test different complexity levels to see constraint generation
const programs = [
  {
    name: 'SimpleAdd',
    program: ZkProgram({
      name: 'SimpleAdd',
      publicInput: Field,
      methods: {
        compute: {
          privateInputs: [Field],
          method(publicInput, a) {
            return publicInput.add(a); // Should be 1 constraint  
          }
        }
      }
    })
  },
  {
    name: 'SimpleMul', 
    program: ZkProgram({
      name: 'SimpleMul',
      publicInput: Field,
      methods: {
        compute: {
          privateInputs: [Field, Field],
          method(publicInput, a, b) {
            return a.mul(b); // Should be 1 constraint
          }
        }
      }
    })
  },
  {
    name: 'MulThenAdd',
    program: ZkProgram({
      name: 'MulThenAdd', 
      publicInput: Field,
      methods: {
        compute: {
          privateInputs: [Field, Field],
          method(publicInput, a, b) {
            const temp = a.mul(b);     // Constraint 1: a * b = temp
            return temp.add(publicInput); // Constraint 2: temp + publicInput = result
          }
        }
      }
    })
  },
  {
    name: 'ExplicitIntermediate',
    program: ZkProgram({
      name: 'ExplicitIntermediate',
      publicInput: Field,
      methods: {
        compute: {
          privateInputs: [Field, Field],
          method(publicInput, a, b) {
            const intermediate = a.mul(b);
            intermediate.assertEquals(Field(15)); // Force intermediate to be real constraint
            const result = intermediate.add(publicInput);
            return result;
          }
        }
      }
    })
  }
];

async function debugConstraintExpansion() {
  console.log('🔍 DEBUGGING CONSTRAINT EXPANSION');
  console.log('=================================\\n');
  
  await switchBackend('sparky');
  
  for (const {name, program} of programs) {
    console.log(`\\n📋 Testing: ${name}`);
    console.log('─'.repeat(40));
    
    try {
      await program.compile();
      console.log('✅ Compilation succeeded');
      
      // Look for the MIR and LIR constraint counts in the logs
      console.log('   Check above for MIR/LIR constraint counts');
      
    } catch (error) {
      console.log(`❌ Compilation failed: ${error.message}`);
    }
  }
  
  console.log('\\n🎯 ANALYSIS:');
  console.log('If MulThenAdd shows only 1 LIR constraint, the MIR→LIR transformation is incorrectly merging operations.');
  console.log('If ExplicitIntermediate shows 2+ constraints, we can force proper expansion.');
}

debugConstraintExpansion().catch(console.error);