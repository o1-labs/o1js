#!/usr/bin/env node

/**
 * Direct Sparky compilation error debugging
 */

async function debugSparkyCompilation() {
  console.log("🔍 DEBUGGING SPARKY COMPILATION ERROR");
  
  try {
    // Import o1js
    const o1js = await import('./dist/node/index.js');
    console.log("✅ o1js imported successfully");
    
    // Switch to Sparky backend
    console.log("🔄 Switching to Sparky backend...");
    await o1js.switchBackend('sparky');
    console.log("✅ Switched to Sparky backend");
    
    // Try to compile a simple ZkProgram
    const { ZkProgram, Field, Mina, Provable } = o1js;
    
    console.log("🏗️  Setting up LocalBlockchain...");
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log("✅ LocalBlockchain set up");
    
    // Try to compile a simple ZkProgram instead (no decorators needed)
    
    // Use the EXACT same pattern as the comprehensive tests
    
    const TestProgram = ZkProgram({
      name: 'test-program',
      publicInput: Field,
      
      methods: {
        double: {
          privateInputs: [Field],
          method(publicInput, secret) {
            // Test witness constraints like in comprehensive tests
            const witnessValue = Provable.witness(Field, () => Field(7));
            witnessValue.assertLessThan(Field(100));
            
            const result = publicInput.mul(Field(2)).add(secret).sub(witnessValue);
            return result;
          }
        }
      }
    });
    
    console.log("🎯 Attempting TestProgram.compile() on Sparky backend...");
    console.log("🎯 This is where the error should occur:");
    
    const compilationResult = await TestProgram.compile();
    
    console.log("✅ UNEXPECTED SUCCESS! Compilation succeeded on Sparky backend!");
    console.log("📋 Compilation result:", compilationResult);
    console.log("📋 VK exists:", !!compilationResult.verificationKey);
    console.log("📋 Method count:", Object.keys(compilationResult.provers || {}).length);
    
  } catch (error) {
    console.log("❌ COMPILATION ERROR CAUGHT:");
    console.log("❌ Error type:", typeof error);
    console.log("❌ Error constructor:", error?.constructor?.name);
    console.log("❌ Error message:", error?.message);
    console.log("❌ Error stack:", error?.stack);
    console.log("❌ Full error object:", error);
    
    // Try to get more details
    if (error.message) {
      console.log("🔍 Detailed error message:", error.message);
    }
    if (error.cause) {
      console.log("🔍 Error cause:", error.cause);
    }
  }
}

// Run the debug
debugSparkyCompilation().catch(error => {
  console.error("🚨 DEBUG SCRIPT FAILED:", error);
  process.exit(1);
});