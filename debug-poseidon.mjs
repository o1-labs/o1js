#!/usr/bin/env node

import { Field, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugPoseidonBasic() {
  console.log("=== BASIC POSEIDON DEBUG ===");
  
  try {
    // Test basic Poseidon with Snarky first
    await switchBackend('snarky');
    console.log("Testing Poseidon with Snarky backend...");
    
    const input = Field(42);
    const snarkyHash = Poseidon.hash([input]);
    console.log(`✓ Snarky Poseidon.hash([Field(42)]) = ${snarkyHash.toString()}`);
    
    // Test with Sparky
    await switchBackend('sparky');
    console.log("Testing Poseidon with Sparky backend...");
    
    const sparkyHash = Poseidon.hash([input]);
    console.log(`✓ Sparky Poseidon.hash([Field(42)]) = ${sparkyHash.toString()}`);
    
    console.log(`Results match: ${snarkyHash.toString() === sparkyHash.toString()}`);
    
  } catch (error) {
    console.error("Basic Poseidon test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

async function debugPoseidonConstraints() {
  console.log("\n=== POSEIDON CONSTRAINT DEBUG ===");
  
  try {
    await switchBackend('sparky');
    console.log("Testing Poseidon constraint generation with Sparky...");
    
    // Try to understand what breaks during constraint generation
    const input1 = Field(1);
    const input2 = Field(2);
    const input3 = Field(3);
    
    console.log("Testing single input...");
    const hash1 = Poseidon.hash([input1]);
    console.log(`✓ Single input hash: ${hash1.toString()}`);
    
    console.log("Testing two inputs...");
    const hash2 = Poseidon.hash([input1, input2]);
    console.log(`✓ Two inputs hash: ${hash2.toString()}`);
    
    console.log("Testing three inputs...");
    const hash3 = Poseidon.hash([input1, input2, input3]);
    console.log(`✓ Three inputs hash: ${hash3.toString()}`);
    
  } catch (error) {
    console.error("Poseidon constraint test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

async function debugPoseidonInCircuit() {
  console.log("\n=== POSEIDON IN CIRCUIT DEBUG ===");
  
  // Test minimal circuit with Poseidon
  const { ZkProgram } = await import('./dist/node/index.js');
  
  try {
    await switchBackend('snarky');
    console.log("Creating minimal Poseidon circuit with Snarky...");
    
    const snarkyProgram = ZkProgram({
      name: 'MinimalPoseidon',
      publicInput: Field,
      methods: {
        hash: {
          privateInputs: [],
          async method(publicInput) {
            const hash = Poseidon.hash([Field(1)]);
            console.log("Snarky: Poseidon.hash computed");
            hash.assertEquals(publicInput);
            console.log("Snarky: assertEquals completed");
          }
        }
      }
    });
    
    console.log("Compiling Snarky Poseidon program...");
    const { verificationKey: snarkyVk } = await snarkyProgram.compile();
    console.log("✓ Snarky compilation successful");
    
    // Now test with Sparky
    await switchBackend('sparky');
    console.log("Creating minimal Poseidon circuit with Sparky...");
    
    const sparkyProgram = ZkProgram({
      name: 'MinimalPoseidon',
      publicInput: Field,
      methods: {
        hash: {
          privateInputs: [],
          async method(publicInput) {
            console.log("Sparky: Starting Poseidon.hash");
            const hash = Poseidon.hash([Field(1)]);
            console.log("Sparky: Poseidon.hash computed");
            hash.assertEquals(publicInput);
            console.log("Sparky: assertEquals completed");
          }
        }
      }
    });
    
    console.log("Compiling Sparky Poseidon program...");
    const { verificationKey: sparkyVk } = await sparkyProgram.compile();
    console.log("✓ Sparky compilation successful");
    
  } catch (error) {
    console.error("Circuit Poseidon test failed:", error.message);
    console.error("Stack:", error.stack);
    
    // Try to identify where exactly it fails
    if (error.message.includes('unreachable')) {
      console.error("🚨 UNREACHABLE ERROR: Sparky hit unimplemented code path");
    }
    if (error.message.includes('panic')) {
      console.error("🚨 PANIC ERROR: Sparky WASM panic occurred");
    }
    if (error.message.includes('time not implemented')) {
      console.error("🚨 TIME ERROR: WASM time issue still present");
    }
  }
}

async function debugPoseidonStepByStep() {
  console.log("\n=== STEP-BY-STEP POSEIDON DEBUG ===");
  
  try {
    await switchBackend('sparky');
    console.log("Testing Poseidon step by step...");
    
    // Step 1: Create field elements
    console.log("Step 1: Creating Field elements...");
    const input = Field(42);
    console.log(`✓ Created Field(42): ${input.toString()}`);
    
    // Step 2: Test field array
    console.log("Step 2: Creating field array...");
    const inputs = [input];
    console.log(`✓ Created array: [${inputs.map(f => f.toString()).join(', ')}]`);
    
    // Step 3: Try calling Poseidon.hash with detailed logging
    console.log("Step 3: Calling Poseidon.hash...");
    
    // Enable verbose logging if possible
    if (global.DEBUG_SPARKY) {
      global.DEBUG_SPARKY = true;
    }
    
    const hash = Poseidon.hash(inputs);
    console.log(`✓ Poseidon.hash succeeded: ${hash.toString()}`);
    
  } catch (error) {
    console.error("Step-by-step Poseidon test failed at:", error.message);
    console.error("Full error:", error);
    
    // Try to extract more debugging info
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      console.error("Error occurred in:");
      stackLines.slice(0, 5).forEach(line => console.error(`  ${line}`));
    }
  }
}

async function runAllPoseidonDebug() {
  console.log("POSEIDON DEBUG SUITE");
  console.log("===================");
  
  await debugPoseidonBasic();
  await debugPoseidonConstraints();
  await debugPoseidonStepByStep();
  await debugPoseidonInCircuit();
  
  console.log("\n=== DEBUG COMPLETE ===");
}

runAllPoseidonDebug().catch(console.error);