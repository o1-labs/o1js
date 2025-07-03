/**
 * Debug the constraint system reset/persistence issue
 * Track when reset happens and what constraint systems are available
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintReset() {
  console.log('🔍 Debugging constraint system reset behavior...\n');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log(`Backend: ${getCurrentBackend()}\n`);

  // Hook into the constraint reset functions to track when they're called
  const originalConsoleLog = console.log;
  let resetCount = 0;
  
  // Patch console.log to catch reset messages
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('runReset') || message.includes('Reset') || message.includes('🔄')) {
      resetCount++;
      originalConsoleLog(`[RESET ${resetCount}]`, ...args);
    } else {
      originalConsoleLog(...args);
    }
  };

  const SimpleAddition = ZkProgram({
    name: 'SimpleAddition',
    publicInput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.add(Field(1)));
        },
      },
    },
  });

  const SimpleMultiplication = ZkProgram({
    name: 'SimpleMultiplication', 
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.mul(Field(2)));
        },
      },
    },
  });

  console.log('🧪 Compiling first circuit (SimpleAddition)...');
  
  // Access Sparky directly to monitor constraint state
  const snarky = globalThis.__snarky?.Snarky;
  
  if (snarky?.getConstraintSystem) {
    console.log('Before compilation:');
    try {
      const cs1 = snarky.getConstraintSystem();
      console.log(`  CS before: ${JSON.stringify(cs1)?.length || 'null'} chars`);
    } catch (e) {
      console.log(`  CS before: ERROR - ${e.message}`);
    }
  }

  const { verificationKey: vk1 } = await SimpleAddition.compile();
  console.log(`VK1 length: ${JSON.stringify(vk1).length}`);
  
  if (snarky?.getConstraintSystem) {
    console.log('After first compilation:');
    try {
      const cs2 = snarky.getConstraintSystem();
      console.log(`  CS after: ${JSON.stringify(cs2)?.length || 'null'} chars`);
    } catch (e) {
      console.log(`  CS after: ERROR - ${e.message}`);
    }
  }

  console.log('\n🧪 Compiling second circuit (SimpleMultiplication)...');
  
  if (snarky?.getConstraintSystem) {
    console.log('Before second compilation:');
    try {
      const cs3 = snarky.getConstraintSystem();
      console.log(`  CS before 2nd: ${JSON.stringify(cs3)?.length || 'null'} chars`);
    } catch (e) {
      console.log(`  CS before 2nd: ERROR - ${e.message}`);
    }
  }

  const { verificationKey: vk2 } = await SimpleMultiplication.compile();
  console.log(`VK2 length: ${JSON.stringify(vk2).length}`);
  
  if (snarky?.getConstraintSystem) {
    console.log('After second compilation:');
    try {
      const cs4 = snarky.getConstraintSystem();
      console.log(`  CS after 2nd: ${JSON.stringify(cs4)?.length || 'null'} chars`);
    } catch (e) {
      console.log(`  CS after 2nd: ERROR - ${e.message}`);
    }
  }

  console.log('\n📊 Analysis:');
  console.log(`VK1 === VK2: ${JSON.stringify(vk1) === JSON.stringify(vk2)}`);
  console.log(`Total resets detected: ${resetCount}`);
  
  // Restore console.log
  console.log = originalConsoleLog;
  
  if (resetCount > 0) {
    console.log('❌ ISSUE: Constraint system is being reset between compilations!');
    console.log('   This would explain why VKs are identical - old constraints are lost.');
  } else {
    console.log('✅ No obvious resets detected in console output');
    console.log('   Issue might be in constraint retrieval/persistence');
  }
}

// Run the debug
debugConstraintReset().catch(console.error);