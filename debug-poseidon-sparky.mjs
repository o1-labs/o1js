#!/usr/bin/env node

/**
 * Debug Poseidon Hash in Sparky Backend
 * 
 * Investigates why Poseidon hash fails silently in Sparky
 */

console.log('🔍 DEBUG: Poseidon Hash in Sparky Backend');
console.log('='.repeat(50));

async function debugPoseidonSparky() {
  try {
    const o1js = await import('./dist/node/index.js');
    const { Field, Poseidon, switchBackend, getCurrentBackend, Provable } = o1js;
    
    // Switch to Sparky
    await switchBackend('sparky');
    console.log(`✅ Switched to: ${getCurrentBackend()}`);
    
    const input = Field(12345);
    console.log(`📥 Input: ${input.toString()}`);
    
    console.log('\n🔍 Testing direct Poseidon.hash call...');
    try {
      const result = Poseidon.hash([input]);
      console.log(`✅ Direct hash result: ${result.toString()}`);
    } catch (error) {
      console.error(`❌ Direct hash failed:`, error);
      console.error(`   Error type:`, typeof error);
      console.error(`   Error constructor:`, error?.constructor?.name);
      console.error(`   Stack:`, error.stack);
    }
    
    console.log('\n🔍 Testing Poseidon in constraint system...');
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        console.log('  📋 Inside constraint system context');
        const witnessInput = Provable.witness(Field, () => input);
        console.log('  ✅ Witness created');
        
        console.log('  🎯 Calling Poseidon.hash...');
        const result = Poseidon.hash([witnessInput]);
        console.log('  ✅ Poseidon.hash completed');
        
        result.assertEquals(result);
        console.log('  ✅ Assertion completed');
        return result;
      });
      
      console.log(`✅ Constraint system completed`);
      console.log(`   Constraints: ${constraintSystem.gates.length}`);
      console.log(`   Gate types: ${constraintSystem.gates.map(g => g.type).join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Constraint system failed:`, error);
      console.error(`   Error message:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
    
    console.log('\n🔍 Testing Sparky WASM Poseidon binding...');
    try {
      // Check if Sparky instance has Poseidon
      if (globalThis.sparkyInstance) {
        console.log('✅ Sparky instance exists');
        
        if (globalThis.sparkyInstance.poseidon) {
          console.log('✅ Poseidon property exists on sparky instance');
          console.log('   Type:', typeof globalThis.sparkyInstance.poseidon);
          
          if (globalThis.sparkyInstance.poseidon.hash) {
            console.log('✅ Poseidon.hash method exists');
            console.log('   Type:', typeof globalThis.sparkyInstance.poseidon.hash);
          } else {
            console.log('❌ Poseidon.hash method missing');
          }
        } else {
          console.log('❌ Poseidon property missing on sparky instance');
        }
        
        // Check sparky adapter
        if (globalThis.sparkyConstraintBridge) {
          console.log('✅ Sparky constraint bridge exists');
          
          if (globalThis.sparkyConstraintBridge.poseidon) {
            console.log('✅ Poseidon in constraint bridge');
          } else {
            console.log('❌ Poseidon missing from constraint bridge');
          }
        } else {
          console.log('❌ Sparky constraint bridge missing');
        }
        
      } else {
        console.log('❌ Sparky instance not found');
      }
      
    } catch (error) {
      console.error(`❌ WASM binding check failed:`, error);
    }
    
  } catch (error) {
    console.error('💥 Debug setup failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

debugPoseidonSparky().then(() => {
  console.log('\n🔍 Poseidon debug complete');
}).catch(error => {
  console.error('💥 Unexpected error:', error);
});