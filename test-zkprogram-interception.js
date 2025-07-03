/**
 * Test constraint interception during ZkProgram compilation
 * This is where VKs are actually generated and constraints matter
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testZkProgramInterception() {
  console.log('🧪 Testing Constraint Interception During ZkProgram Compilation\n');
  
  await initializeBindings();
  
  // Enhanced sparkyConstraintBridge to capture ALL constraint activities
  let constraintLog = [];
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend: () => false, // Start with false
    addConstraint: (constraint) => {
      constraintLog.push({
        type: 'addConstraint',
        constraint: constraint,
        backend: getCurrentBackend(),
        timestamp: Date.now()
      });
      console.log('🎯 CONSTRAINT INTERCEPTED:', constraint);
    },
    startConstraintAccumulation: () => {
      constraintLog.push({
        type: 'startAccumulation',
        backend: getCurrentBackend(),
        timestamp: Date.now()
      });
      console.log('📝 Started constraint accumulation');
    },
    endConstraintAccumulation: () => {
      constraintLog.push({
        type: 'endAccumulation',
        backend: getCurrentBackend(),
        timestamp: Date.now()
      });
      console.log('📝 Ended constraint accumulation');
    },
    getAccumulatedConstraints: () => {
      console.log('📊 Retrieved accumulated constraints');
      return []; // Return empty array for now
    }
  };
  
  // Override Snarky.field.assertEqual to track all calls
  const { Snarky } = await import('./dist/node/bindings.js');
  const originalAssertEqual = Snarky.field.assertEqual;
  let snarkyCallCount = 0;
  
  Snarky.field.assertEqual = (x, y) => {
    snarkyCallCount++;
    const isActive = globalThis.sparkyConstraintBridge.isActiveSparkyBackend();
    console.log(`🔧 Snarky.field.assertEqual call #${snarkyCallCount} (Sparky active: ${isActive})`);
    
    if (isActive) {
      console.log('   ⚠️  Snarky call made while Sparky active - interception failed!');
    } else {
      console.log('   ✅ Normal Snarky call');
    }
    
    return originalAssertEqual(x, y);
  };
  
  // Simple circuit that DEFINITELY generates constraints
  const TestCircuit = ZkProgram({
    name: 'TestCircuit',
    publicInput: Field,
    methods: {
      checkEqual: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // This MUST generate a constraint during compilation
          publicInput.assertEquals(privateInput);
        }
      }
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log('🔄 Phase 1: Testing with Snarky backend');
  console.log('═══════════════════════════════════════');
  
  await switchBackend('snarky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Reset counters
  constraintLog = [];
  snarkyCallCount = 0;
  
  try {
    console.log('Compiling TestCircuit with Snarky...');
    await TestCircuit.compile();
    
    console.log('\n📊 Snarky Backend Results:');
    console.log(`   Snarky.field.assertEqual calls: ${snarkyCallCount}`);
    console.log(`   Constraint log entries: ${constraintLog.length}`);
    console.log(`   Constraint types:`, constraintLog.map(entry => entry.type));
    
    const snarkyVk = TestCircuit.verificationKey();
    console.log(`   VK hash: ${snarkyVk?.hash.slice(0, 16)}...`);
    
  } catch (error) {
    console.log(`❌ Snarky compilation failed: ${error.message}`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🔄 Phase 2: Testing with Sparky backend');
  console.log('═══════════════════════════════════════');
  
  // Activate Sparky constraint bridge
  globalThis.sparkyConstraintBridge.isActiveSparkyBackend = () => true;
  
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Reset counters
  constraintLog = [];
  snarkyCallCount = 0;
  
  try {
    console.log('Compiling TestCircuit with Sparky...');
    await TestCircuit.compile();
    
    console.log('\n📊 Sparky Backend Results:');
    console.log(`   Snarky.field.assertEqual calls: ${snarkyCallCount}`);
    console.log(`   Constraint log entries: ${constraintLog.length}`);
    console.log(`   Constraint types:`, constraintLog.map(entry => entry.type));
    
    if (snarkyCallCount > 0) {
      console.log('   ⚠️  CONSTRAINT INTERCEPTION FAILED - Snarky still called!');
    } else {
      console.log('   ✅ CONSTRAINT INTERCEPTION SUCCESS - No Snarky calls!');
    }
    
    const sparkyVk = TestCircuit.verificationKey();
    console.log(`   VK hash: ${sparkyVk?.hash.slice(0, 16)}...`);
    
  } catch (error) {
    console.log(`❌ Sparky compilation failed: ${error.message}`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🎯 CONSTRAINT INTERCEPTION ANALYSIS');
  console.log('═══════════════════════════════════════');
  
  if (snarkyCallCount === 0 && constraintLog.some(entry => entry.type === 'addConstraint')) {
    console.log('✅ SUCCESS: Constraints intercepted and routed to Sparky!');
  } else if (snarkyCallCount > 0) {
    console.log('❌ FAILURE: Constraints still routed to Snarky despite interception');
  } else {
    console.log('⚠️  INCONCLUSIVE: No constraints generated in either backend');
  }
}

testZkProgramInterception().catch(console.error);