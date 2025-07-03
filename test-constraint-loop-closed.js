/**
 * Test the closed constraint loop - Sparky processing + Pickles VK generation
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintLoopClosed() {
  console.log('🔄 Testing CLOSED Constraint Loop - Sparky + Pickles VK Generation\n');
  
  await initializeBindings();
  
  // Enhanced mock bridge with getLastProcessedConstraint
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend: () => false,
    addConstraint: (constraint) => {
      console.log('🎯 Sparky received constraint:', constraint);
    },
    getLastProcessedConstraint: () => {
      console.log('📤 Sparky returning processed constraint to Pickles');
      return { processed: true, type: 'equal' };
    },
    startConstraintAccumulation: () => {
      console.log('📝 Started constraint accumulation');
    },
    endConstraintAccumulation: () => {
      console.log('📝 Ended constraint accumulation');
    }
  };
  
  // Monitor Snarky calls
  const { Snarky } = await import('./dist/node/bindings.js');
  const originalAssertEqual = Snarky.field.assertEqual;
  let snarkyCallCount = 0;
  
  Snarky.field.assertEqual = (x, y) => {
    snarkyCallCount++;
    const isActive = globalThis.sparkyConstraintBridge.isActiveSparkyBackend();
    console.log(`🔧 Snarky.field.assertEqual call #${snarkyCallCount} (Sparky: ${isActive})`);
    return originalAssertEqual(x, y);
  };
  
  const TestCircuit = ZkProgram({
    name: 'LoopTest',
    publicInput: Field,
    methods: {
      equal: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput);
        }
      }
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log('🟢 Testing Snarky (baseline)');
  console.log('═══════════════════════════════════════');
  
  await switchBackend('snarky');
  snarkyCallCount = 0;
  
  try {
    await TestCircuit.compile();
    console.log(`✅ Snarky calls: ${snarkyCallCount}`);
    
    // Try to access VK
    const vk = TestCircuit.verificationKey;
    console.log(`✅ VK status: ${vk ? 'Generated' : 'undefined'}`);
    
  } catch (error) {
    console.log(`❌ Snarky failed: ${error.message}`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🔥 Testing Sparky with CLOSED LOOP');
  console.log('═══════════════════════════════════════');
  
  // Activate Sparky
  globalThis.sparkyConstraintBridge.isActiveSparkyBackend = () => true;
  await switchBackend('sparky');
  snarkyCallCount = 0;
  
  try {
    console.log('Compiling with closed constraint loop...');
    await TestCircuit.compile();
    
    console.log(`✅ Sparky backend - Snarky calls: ${snarkyCallCount}`);
    console.log('   ^ Should be > 0 now (constraint loop closed!)');
    
    // Try to access VK
    const vk = TestCircuit.verificationKey;
    console.log(`✅ VK status: ${vk ? 'Generated' : 'undefined'}`);
    console.log('   ^ Should be Generated now (Pickles gets constraints!)');
    
  } catch (error) {
    console.log(`❌ Sparky failed: ${error.message}`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🎯 CONSTRAINT LOOP STATUS');
  console.log('═══════════════════════════════════════');
  
  if (snarkyCallCount > 0) {
    console.log('✅ CONSTRAINT LOOP CLOSED!');
    console.log('   - Sparky processes constraints');
    console.log('   - Pickles receives constraints');
    console.log('   - VK generation should work');
  } else {
    console.log('❌ Loop still open - need to debug');
  }
}

testConstraintLoopClosed().catch(console.error);