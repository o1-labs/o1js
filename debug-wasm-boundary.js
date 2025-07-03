/**
 * Debug the WASM boundary constraint system retrieval
 * Test exactly what getRunModule().getConstraintSystem() returns
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugWASMBoundary() {
  console.log('🔍 Debugging WASM boundary constraint retrieval...\n');

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

  console.log('🧪 Inspecting WASM modules and functions...\n');

  // Access the sparky adapter internals
  const snarky = globalThis.__snarky?.Snarky;
  
  if (snarky) {
    console.log('Snarky object available');
    console.log('Snarky type:', typeof snarky);
    console.log('Snarky keys:', Object.keys(snarky));
    
    // Try to access the underlying WASM instance
    if (globalThis.sparkyInstance) {
      console.log('\nSparky instance available');
      console.log('sparkyInstance type:', typeof globalThis.sparkyInstance);
      console.log('sparkyInstance keys:', Object.keys(globalThis.sparkyInstance));
      
      // Check if run module exists
      if (globalThis.sparkyInstance.run) {
        console.log('\nRun module available');
        console.log('run type:', typeof globalThis.sparkyInstance.run);
        console.log('run keys:', Object.keys(globalThis.sparkyInstance.run));
        
        // Test getConstraintSystem directly
        if (globalThis.sparkyInstance.run.getConstraintSystem) {
          console.log('\ngetConstraintSystem method exists');
          console.log('getConstraintSystem type:', typeof globalThis.sparkyInstance.run.getConstraintSystem);
          
          try {
            console.log('Testing getConstraintSystem before compilation...');
            const csBefore = globalThis.sparkyInstance.run.getConstraintSystem();
            console.log('CS before compilation:', typeof csBefore, csBefore);
          } catch (e) {
            console.log('Error calling getConstraintSystem before compilation:', e.message);
          }
        } else {
          console.log('getConstraintSystem method NOT found');
        }
      } else {
        console.log('Run module NOT available');
      }
    } else {
      console.log('Sparky instance NOT available');
    }
  }

  console.log('\n🧪 Compiling circuit and monitoring WASM calls...\n');
  
  // Hook into console.log to capture WASM debug output
  const originalConsoleLog = console.log;
  let manualJsonFound = false;
  let lastConstraintJson = null;
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Manual JSON string:')) {
      manualJsonFound = true;
      // Extract the JSON part
      const jsonMatch = message.match(/Manual JSON string: (.+)$/);
      if (jsonMatch) {
        lastConstraintJson = jsonMatch[1];
        originalConsoleLog('🎯 CAPTURED CONSTRAINT JSON:', lastConstraintJson.substring(0, 200) + '...');
      }
    }
    // Don't spam with debug output, just capture the important parts
    if (!message.includes('DEBUG sparky-wasm')) {
      originalConsoleLog(...args);
    }
  };

  // Compile the circuit
  const { verificationKey } = await SimpleTest.compile();
  
  // Restore console.log
  console.log = originalConsoleLog;
  
  console.log('\n📊 Post-compilation WASM state analysis:');
  
  // Test getConstraintSystem after compilation
  if (globalThis.sparkyInstance?.run?.getConstraintSystem) {
    try {
      console.log('Testing getConstraintSystem after compilation...');
      const csAfter = globalThis.sparkyInstance.run.getConstraintSystem();
      console.log('CS after compilation:', typeof csAfter);
      
      if (typeof csAfter === 'string') {
        console.log('CS string length:', csAfter.length);
        console.log('CS string preview:', csAfter.substring(0, 200) + '...');
      } else if (csAfter && typeof csAfter === 'object') {
        console.log('CS object keys:', Object.keys(csAfter));
        console.log('CS object:', JSON.stringify(csAfter));
      } else {
        console.log('CS value:', csAfter);
      }
    } catch (e) {
      console.log('Error calling getConstraintSystem after compilation:', e.message);
    }
  }
  
  // Compare with what we captured from debug output
  console.log('\n🔍 Comparison:');
  console.log('Manual JSON found in debug output:', manualJsonFound);
  if (manualJsonFound && lastConstraintJson) {
    console.log('Debug JSON length:', lastConstraintJson.length);
    console.log('Debug JSON preview:', lastConstraintJson.substring(0, 200) + '...');
  }
  
  // Test the adapter's getConstraints function directly
  console.log('\n🧪 Testing adapter getConstraints function...');
  try {
    // This should be the same function that VK generation calls
    const constraints = snarky?.getConstraints?.();
    console.log('Adapter getConstraints returned:', typeof constraints);
    if (constraints) {
      console.log('Constraints length:', Array.isArray(constraints) ? constraints.length : 'not array');
      console.log('Constraints preview:', JSON.stringify(constraints).substring(0, 200) + '...');
    }
  } catch (e) {
    console.log('Error calling adapter getConstraints:', e.message);
  }

  console.log(`\nVK length: ${JSON.stringify(verificationKey).length}`);
}

// Run the debug
debugWASMBoundary().catch(console.error);