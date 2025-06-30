/**
 * Debug script to understand what Sparky WASM poseidon.update returns
 */

import { switchBackend, getCurrentBackend, Poseidon } from './dist/node/index.js';

async function debugPoseidonWasm() {
  try {
    console.log('Current backend:', getCurrentBackend());
    
    // Switch to Sparky
    await switchBackend('sparky');
    console.log('Switched to backend:', getCurrentBackend());
    
    // Try to call a simple poseidon operation and see what happens
    console.log('Testing poseidon operations with Sparky...');
    
    // Import Field after switching backend
    const { Field } = await import('./dist/node/index.js');
    
    // Create some test field values
    console.log('Creating test field values...');
    const f1 = Field(1);
    const f2 = Field(2);
    
    console.log('f1:', f1.constructor.name, typeof f1);
    console.log('f2:', f2.constructor.name, typeof f2);
    
    console.log('Testing Poseidon.hash with Sparky backend...');
    try {
      const hash = Poseidon.hash([f1, f2]);
      console.log('Poseidon hash result:', hash);
      console.log('Hash type:', typeof hash, hash.constructor.name);
    } catch (poseidonError) {
      console.error('Poseidon error:', poseidonError);
      console.error('Poseidon stack:', poseidonError.stack);
    }
    
    // Now let's test poseidon.update directly
    console.log('\nTesting poseidon.update directly...');
    try {
      // Test the internals - let's import the snarky adapter directly
      const sparkyAdapter = await import('./dist/node/bindings/sparky-adapter.js');
      const snarkyInstance = sparkyAdapter.Snarky;
      
      console.log('Snarky instance:', typeof snarkyInstance);
      console.log('Snarky poseidon:', typeof snarkyInstance.poseidon);
      
      // Create test state and input in the right format
      const testState = [0, f1.value, f2.value, Field(3).value]; // MlArray format
      const testInput = [0, Field(4).value]; // MlArray format
      
      console.log('Test state:', testState);
      console.log('Test input:', testInput);
      
      // Let's also check what the WASM module exports directly
      console.log('Checking WASM exports...');
      const wasmModule = await import('./dist/node/bindings/compiled/sparky_node/sparky_wasm.js');
      console.log('WASM module keys:', Object.keys(wasmModule));
      
      // First let's try to understand the internal call without the adapter conversion
      console.log('Testing direct WASM call...');
      const sparkyInternalInstance = new wasmModule.Snarky();
      console.log('Direct Sparky instance created');
      
      // Try to create FieldVar objects directly
      console.log('Testing FieldVar creation...');
      const fieldVar1 = wasmModule.FieldVar.constant(1n);
      console.log('FieldVar1:', fieldVar1);
      console.log('FieldVar1 type:', fieldVar1.type);
      console.log('FieldVar1 value:', fieldVar1.value);
      
      // Try to create the state array using FieldVar objects
      const wasmStateArray = [
        0,
        wasmModule.FieldVar.constant(1n),
        wasmModule.FieldVar.constant(2n),
        wasmModule.FieldVar.constant(3n)
      ];
      const wasmInputArray = [0, wasmModule.FieldVar.constant(4n)];
      
      console.log('WASM state array:', wasmStateArray);
      console.log('WASM input array:', wasmInputArray);
      
      // For now, let's try to work around this by passing bigint values directly
      // to see what the poseidon update returns
      console.log('Trying simplified direct approach...');
      try {
        // Try with string values since WASM expects string or number
        // The error says "Expected 3 state elements, got 4", so let's try different formats
        console.log('Trying different state formats...');
        
        // Try 1: Without the 0 marker
        const simpleState1 = ["1", "2", "3"];
        const simpleInput1 = ["4"];
        console.log('Attempt 1 - no markers:', { state: simpleState1, input: simpleInput1 });
        
        try {
          const result1 = sparkyInternalInstance.poseidonUpdate(simpleState1, simpleInput1);
          console.log('SUCCESS with format 1:', result1);
        } catch (err1) {
          console.log('Format 1 error:', err1.message);
        }
        
        // Try 2: With 0 marker but only 2 elements after
        const simpleState2 = [0, "1", "2"];
        const simpleInput2 = [0, "4"];
        console.log('Attempt 2 - with markers, 2 elements:', { state: simpleState2, input: simpleInput2 });
        
        try {
          const result2 = sparkyInternalInstance.poseidonUpdate(simpleState2, simpleInput2);
          console.log('SUCCESS with format 2:', result2);
        } catch (err2) {
          console.log('Format 2 error:', err2.message);
        }
        
        // Original format for reference
        const simpleState = [0, "1", "2", "3"];
        const simpleInput = [0, "4"];
        
        console.log('Simple state:', simpleState);
        console.log('Simple input:', simpleInput);
        
        const simpleResult = sparkyInternalInstance.poseidonUpdate(simpleState, simpleInput);
        console.log('Simple result:', simpleResult);
        console.log('Simple result type:', typeof simpleResult);
        
        // If that worked, check what we get back
        if (Array.isArray(simpleResult)) {
          console.log('Simple result array length:', simpleResult.length);
          for (let i = 0; i < simpleResult.length; i++) {
            const item = simpleResult[i];
            console.log(`  simpleResult[${i}]:`, item);
            console.log(`    Type:`, typeof item);
            console.log(`    Constructor:`, item?.constructor?.name);
            
            // Check if it's a FieldVar instance
            if (item && item.__wbg_ptr) {
              console.log(`    *** HAS __wbg_ptr: ${item.__wbg_ptr} ***`);
              console.log(`    Is FieldVar:`, item instanceof wasmModule.FieldVar);
              if (item instanceof wasmModule.FieldVar) {
                console.log(`    FieldVar type:`, item.type);
                console.log(`    FieldVar value:`, item.value);
                console.log(`    FieldVar index:`, item.index);
              }
            }
          }
        }
      } catch (simpleError) {
        console.error('Simple approach error:', simpleError);
      }
      
      const directResult = undefined; // Skip the original failing call
      console.log('Direct poseidon result:', directResult);
      console.log('Direct result type:', typeof directResult);
      
      if (Array.isArray(directResult)) {
        console.log('Direct result array length:', directResult.length);
        for (let i = 0; i < directResult.length; i++) {
          const item = directResult[i];
          console.log(`  directResult[${i}]:`, item);
          console.log(`    Type:`, typeof item);
          console.log(`    Constructor:`, item?.constructor?.name);
          console.log(`    Keys:`, Object.keys(item || {}));
          
          // Check if it's a FieldVar instance
          if (item instanceof wasmModule.FieldVar) {
            console.log(`    *** IS FieldVar instance ***`);
            console.log(`    FieldVar type:`, item.type);
            console.log(`    FieldVar value:`, item.value);
            console.log(`    FieldVar index:`, item.index);
          }
        }
      }
      
      const result = snarkyInstance.poseidon.update(testState, testInput);
      console.log('poseidon.update result:', result);
      console.log('Result type:', typeof result);
      console.log('Result constructor:', result?.constructor?.name);
      
      if (Array.isArray(result)) {
        console.log('Result is array, length:', result.length);
        for (let i = 0; i < result.length; i++) {
          console.log(`  result[${i}]:`, result[i], typeof result[i], result[i]?.constructor?.name);
          if (result[i] && typeof result[i] === 'object' && '__wbg_ptr' in result[i]) {
            console.log(`    *** FOUND WASM OBJECT WITH __wbg_ptr at index ${i} ***`);
            console.log(`    Object keys:`, Object.keys(result[i]));
            
            // Try to see if it has any methods that might convert it
            console.log(`    Checking if object has methods...`);
            const proto = Object.getPrototypeOf(result[i]);
            if (proto) {
              console.log(`    Prototype methods:`, Object.getOwnPropertyNames(proto));
            }
          }
        }
      }
      
    } catch (updateError) {
      console.error('poseidon.update error:', updateError);
      console.error('Update stack:', updateError.stack);
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
    console.error('Stack:', error.stack);
  }
}

debugPoseidonWasm();