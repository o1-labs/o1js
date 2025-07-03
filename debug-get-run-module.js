/**
 * Debug getRunModule() function and sparkyInstance state
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugGetRunModule() {
  console.log('🔍 Debugging getRunModule() and sparkyInstance...\n');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log(`Backend: ${getCurrentBackend()}\n`);

  const SimpleTest = ZkProgram({
    name: 'SimpleTest',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.add(Field(1)));
        },
      },
    },
  });

  // Access the snarky object to get to the adapter internals
  const snarky = globalThis.__snarky?.Snarky;
  
  if (snarky) {
    console.log('✅ Snarky object available');
    
    // Test if run module exists
    if (snarky.run) {
      console.log('✅ snarky.run available');
      console.log('   run type:', typeof snarky.run);
      console.log('   run keys:', Object.keys(snarky.run));
      
      // Test getConstraintSystem specifically
      if (snarky.run.getConstraintSystem) {
        console.log('✅ snarky.run.getConstraintSystem available');
        console.log('   getConstraintSystem type:', typeof snarky.run.getConstraintSystem);
        
        try {
          console.log('\n🧪 Testing getConstraintSystem before compilation...');
          const csBefore = snarky.run.getConstraintSystem();
          console.log('   Result type:', typeof csBefore);
          console.log('   Result value:', csBefore);
          if (typeof csBefore === 'string') {
            console.log('   String length:', csBefore.length);
          }
        } catch (e) {
          console.log('   ❌ Error:', e.message);
        }
      } else {
        console.log('❌ snarky.run.getConstraintSystem NOT available');
        console.log('   Available methods:', Object.keys(snarky.run).filter(k => typeof snarky.run[k] === 'function'));
      }
    } else {
      console.log('❌ snarky.run NOT available');
    }
  } else {
    console.log('❌ Snarky object NOT available');
  }

  console.log('\n🧪 Compiling circuit...');
  const { verificationKey } = await SimpleTest.compile();

  console.log('\n🧪 Testing getConstraintSystem after compilation...');
  if (snarky?.run?.getConstraintSystem) {
    try {
      const csAfter = snarky.run.getConstraintSystem();
      console.log('   After compilation result type:', typeof csAfter);
      console.log('   After compilation result value:', csAfter);
      
      if (typeof csAfter === 'string') {
        console.log('   After compilation string length:', csAfter.length);
        console.log('   After compilation string preview:', csAfter.substring(0, 200) + '...');
        
        // Try to parse it
        try {
          const parsed = JSON.parse(csAfter);
          console.log('   Parsed successfully, keys:', Object.keys(parsed));
          if (parsed.gates) {
            console.log('   Gates count:', parsed.gates.length);
          }
        } catch (parseError) {
          console.log('   ❌ JSON parse error:', parseError.message);
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
  }

  // Test the getConstraints function that should be used for VK generation
  console.log('\n🧪 Testing getConstraints function for VK generation...');
  try {
    // Import the adapter module to access internal functions
    const sparkyAdapter = await import('./src/bindings/sparky-adapter.js');
    console.log('   Sparky adapter imported');
    
    // Look for getConstraints or similar functions
    const exportedKeys = Object.keys(sparkyAdapter);
    console.log('   Exported functions:', exportedKeys);
    
    // Try to find the function that retrieves constraints
    const constraintFunctions = exportedKeys.filter(k => 
      k.toLowerCase().includes('constraint') || k.toLowerCase().includes('gate')
    );
    console.log('   Constraint-related functions:', constraintFunctions);
    
  } catch (e) {
    console.log('   ❌ Error importing adapter:', e.message);
  }

  console.log(`\nVK length: ${JSON.stringify(verificationKey).length}`);
}

// Run the debug
debugGetRunModule().catch(console.error);