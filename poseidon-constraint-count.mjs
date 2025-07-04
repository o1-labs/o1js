#!/usr/bin/env node

import { Field, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function countPoseidonConstraints() {
  console.log("=== POSEIDON CONSTRAINT COUNT ANALYSIS ===");
  
  const { ZkProgram } = await import('./dist/node/index.js');
  
  // Test with Snarky first
  await switchBackend('snarky');
  console.log("\n🔍 SNARKY CONSTRAINT COUNT:");
  
  const snarkyProgram = ZkProgram({
    name: 'PoseidonCount',
    publicInput: Field,
    methods: {
      hash: {
        privateInputs: [Field],
        async method(publicInput, preimage) {
          console.log("Snarky: About to call Poseidon.hash");
          const hash = Poseidon.hash([preimage]);
          console.log("Snarky: Poseidon.hash completed");
          hash.assertEquals(publicInput);
          console.log("Snarky: assertEquals completed");
        }
      }
    }
  });
  
  try {
    console.log("Compiling Snarky Poseidon program...");
    const { verificationKey: snarkyVk } = await snarkyProgram.compile();
    console.log("✓ Snarky compilation completed");
    
    // Get constraint count - this might need to be accessed differently
    console.log("Snarky VK data (first 200 chars):", JSON.stringify(snarkyVk).substring(0, 200));
    
  } catch (error) {
    console.error("Snarky compilation failed:", error.message);
  }
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log("\n🔍 SPARKY CONSTRAINT COUNT:");
  
  const sparkyProgram = ZkProgram({
    name: 'PoseidonCount',
    publicInput: Field,
    methods: {
      hash: {
        privateInputs: [Field],
        async method(publicInput, preimage) {
          console.log("Sparky: About to call Poseidon.hash");
          const hash = Poseidon.hash([preimage]);
          console.log("Sparky: Poseidon.hash completed");
          hash.assertEquals(publicInput);
          console.log("Sparky: assertEquals completed");
        }
      }
    }
  });
  
  try {
    console.log("Compiling Sparky Poseidon program...");
    const { verificationKey: sparkyVk } = await sparkyProgram.compile();
    console.log("✓ Sparky compilation completed");
    
    // Get constraint count
    console.log("Sparky VK data (first 200 chars):", JSON.stringify(sparkyVk).substring(0, 200));
    
  } catch (error) {
    console.error("Sparky compilation failed:", error.message);
  }
}

async function directConstraintCount() {
  console.log("\n=== DIRECT CONSTRAINT SYSTEM ANALYSIS ===");
  
  // Test constraint generation directly
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 ${backend.toUpperCase()} Direct Constraint Generation:`);
    
    try {
      // Access constraint system directly if possible
      const { Circuit } = await import('./dist/node/index.js');
      
      let constraintCount = 0;
      
      if (Circuit && Circuit.runAndCheck) {
        const result = Circuit.runAndCheck(() => {
          const preimage = Field(42);
          const hash = Poseidon.hash([preimage]);
          return hash;
        });
        
        console.log(`${backend}: Circuit.runAndCheck result:`, result);
      } else {
        console.log(`${backend}: Circuit.runAndCheck not available`);
      }
      
    } catch (error) {
      console.error(`${backend} direct constraint test failed:`, error.message);
    }
  }
}

async function manualConstraintTracking() {
  console.log("\n=== MANUAL CONSTRAINT TRACKING ===");
  
  // Track constraints manually by observing the logs
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 ${backend.toUpperCase()} Manual Tracking:`);
    
    try {
      let constraintsBefore = 0;
      let constraintsAfter = 0;
      
      // For Sparky, we can see the constraint logs
      if (backend === 'sparky') {
        console.log("Sparky: Monitoring constraint generation logs...");
      }
      
      const preimage = Field(42);
      console.log(`${backend}: Creating Poseidon hash...`);
      const hash = Poseidon.hash([preimage]);
      console.log(`${backend}: Poseidon hash created: ${hash.toString()}`);
      
      if (backend === 'sparky') {
        console.log("Sparky: Check logs above for constraint count");
      }
      
    } catch (error) {
      console.error(`${backend} manual tracking failed:`, error.message);
    }
  }
}

async function runConstraintAnalysis() {
  console.log("POSEIDON CONSTRAINT COUNT INVESTIGATION");
  console.log("======================================");
  console.log("Expected: ~660 constraints for proper Poseidon implementation");
  console.log("Observed: 0 constraints in Sparky (SECURITY BUG!)");
  
  await countPoseidonConstraints();
  await directConstraintCount();
  await manualConstraintTracking();
  
  console.log("\n=== ANALYSIS COMPLETE ===");
  console.log("🚨 CRITICAL FINDING: If Sparky generates 0 constraints for Poseidon,");
  console.log("   it means the hash computation is NOT being proven!");
  console.log("   This is a critical security vulnerability.");
}

runConstraintAnalysis().catch(console.error);