import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Simple program for constraint inspection
const InspectionProgram = ZkProgram({
  name: 'InspectionProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    justAdd: {
      privateInputs: [Field],
      async method(publicInput, a) {
        console.log('🔍 OPERATION: a.add(publicInput)');
        // Simple addition operation
        const result = a.add(publicInput);
        return result;
      }
    }
  }
});

async function inspectConstraintSystems() {
  console.log('🔍 CONSTRAINT SYSTEM INSPECTION');
  console.log('===============================\n');
  
  // Test Snarky first
  console.log('📋 INSPECTING SNARKY BACKEND');
  console.log('─'.repeat(30));
  
  try {
    await switchBackend('snarky');
    console.log('✅ Snarky backend loaded');
    
    console.log('🔧 Compiling with Snarky...');
    await InspectionProgram.compile();
    console.log('✅ Snarky compilation completed');
    
    // Try to get constraint system info
    console.log('📊 Analyzing Snarky constraints...');
    // The constraint count should be logged during compilation
    
  } catch (error) {
    console.log(`❌ Snarky error: ${error.message}`);
  }
  
  console.log('\n📋 INSPECTING SPARKY BACKEND');
  console.log('─'.repeat(30));
  
  try {
    await switchBackend('sparky');
    console.log('✅ Sparky backend loaded');
    
    console.log('🔧 Compiling with Sparky...');
    await InspectionProgram.compile();
    console.log('✅ Sparky compilation completed');
    
    // Constraint count should be logged during compilation
    console.log('📊 Analyzing Sparky constraints...');
    
  } catch (error) {
    console.log(`❌ Sparky error: ${error.message}`);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('🔍 PERMUTATION ERROR: Constraint system structure issue');
    }
  }
  
  console.log('\n🧠 ANALYSIS:');
  console.log('Compare the constraint counts logged above:');
  console.log('- Snarky should show constraint generation details');
  console.log('- Sparky should show constraint generation details');
  console.log('- Look for differences in constraint structure');
}

inspectConstraintSystems().catch(console.error);