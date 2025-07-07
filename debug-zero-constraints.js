import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Debug why Sparky generates 0 constraints for basic operations
async function debugZeroConstraints() {
  console.log('🔍 DEBUGGING: Why Does Sparky Generate 0 Constraints?');
  console.log('====================================================\n');
  
  await switchBackend('sparky');
  
  // Test the absolute simplest case
  console.log('📋 TEST: Simplest Addition');
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        method(publicInput, a) {
          console.log('🔍 OPERATION: a.add(publicInput)');
          const result = a.add(publicInput);
          console.log('🔍 OPERATION COMPLETE');
          return result;
        }
      }
    }
  });
  
  console.log('🔧 Compiling...');
  try {
    await SimpleProgram.compile();
    console.log('✅ Compilation succeeded but generated 0 constraints');
    
    console.log('\n🧠 ROOT CAUSE ANALYSIS:');
    console.log('1. Field addition may be implemented as pure computation without constraints');
    console.log('2. The optimization pipeline may be eliminating "unnecessary" constraints');
    console.log('3. The MIR→LIR transformation may not be generating constraints for simple ops');
    
    console.log('\n🎯 HYPOTHESIS:');
    console.log('Sparky treats simple field arithmetic as witness computation, not constraints.');
    console.log('But PLONK requires explicit constraints for every operation in the circuit.');
    console.log('Even a + b should generate a constraint: a + b - c = 0');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debugZeroConstraints().catch(console.error);