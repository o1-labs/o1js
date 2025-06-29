/**
 * Test architectural compatibility - R1CS vs Kimchi format
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintFormat() {
  console.log('🔍 Testing constraint system format compatibility...');
  
  // Create a simple program
  const SimpleProgram = ZkProgram({
    name: 'formatTest',
    publicInput: Field,
    methods: {
      square: {
        privateInputs: [Field],
        async method(publicInput: Field, x: Field) {
          const result = x.mul(x);
          result.assertEquals(publicInput);
        },
      },
    },
  });
  
  await initializeBindings();
  console.log('Current backend:', getCurrentBackend());
  
  try {
    console.log('\n🔨 Testing with Snarky backend...');
    const { verificationKey: snarkyVK } = await SimpleProgram.compile();
    console.log('✅ Snarky compilation succeeded');
    console.log('VK data structure keys:', Object.keys(JSON.parse(snarkyVK.data)));
    
    // Parse and examine the structure
    const snarkyData = JSON.parse(snarkyVK.data);
    console.log('Snarky format preview:', {
      hasGates: 'gates' in snarkyData,
      hasConstraints: 'constraints' in snarkyData,
      hasPublicInputSize: 'public_input_size' in snarkyData,
      topLevelKeys: Object.keys(snarkyData).slice(0, 5)
    });
    
    console.log('\n🔨 Testing with Sparky backend...');
    await switchBackend('sparky');
    console.log('Current backend:', getCurrentBackend());
    
    const { verificationKey: sparkyVK } = await SimpleProgram.compile();
    console.log('✅ Sparky compilation succeeded');
    
    // Parse and examine the structure
    const sparkyData = JSON.parse(sparkyVK.data);
    console.log('Sparky format preview:', {
      hasGates: 'gates' in sparkyData,
      hasConstraints: 'constraints' in sparkyData,
      hasPublicInputSize: 'public_input_size' in sparkyData,
      topLevelKeys: Object.keys(sparkyData).slice(0, 5)
    });
    
    // Check for architectural incompatibility
    const snarkyHasGates = 'gates' in snarkyData;
    const sparkyHasGates = 'gates' in sparkyData;
    const snarkyHasConstraints = 'constraints' in snarkyData;
    const sparkyHasConstraints = 'constraints' in sparkyData;
    
    console.log('\n📊 Format Compatibility Analysis:');
    console.log('Snarky uses gates format:', snarkyHasGates);
    console.log('Sparky uses gates format:', sparkyHasGates);
    console.log('Snarky uses R1CS constraints:', snarkyHasConstraints);
    console.log('Sparky uses R1CS constraints:', sparkyHasConstraints);
    
    if (snarkyHasGates && sparkyHasGates) {
      console.log('✅ Both use Kimchi gates format - NO INCOMPATIBILITY');
    } else if (snarkyHasGates && sparkyHasConstraints) {
      console.log('❌ ARCHITECTURAL INCOMPATIBILITY CONFIRMED');
      console.log('   Snarky outputs Kimchi gates, Sparky outputs R1CS');
    } else if (snarkyHasConstraints && sparkyHasGates) {
      console.log('❌ REVERSE INCOMPATIBILITY');
      console.log('   Snarky outputs R1CS, Sparky outputs Kimchi gates');
    } else {
      console.log('🤔 Both use same format, investigating...');
    }
    
  } catch (error) {
    console.error('❌ Error during format test:', error.message);
    
    if (error.message.includes('constraints') || error.message.includes('gates')) {
      console.log('📋 This may indicate format incompatibility issues');
    }
  }
}

testConstraintFormat().catch(console.error);