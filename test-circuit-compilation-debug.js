#!/usr/bin/env node

// Test circuit compilation with Sparky backend
// Created: July 5, 2025
// Last Modified: July 5, 2025 00:00 UTC

async function main() {
  console.log('🔍 Testing circuit compilation with Sparky backend\n');
  
  // Import o1js
  const o1js = await import('./build/dist/index.js');
  const { SmartContract, state, State, Field, method, switchBackend, getCurrentBackend } = o1js;
  
  // Test Snarky first (baseline)
  console.log('1️⃣ Testing with Snarky backend...');
  
  try {
    await switchBackend('snarky');
    console.log(`   Current backend: ${getCurrentBackend()}`);
    
    // Test simple field operations
    const a = Field(3);
    const b = Field(5);
    const c = a.mul(b);
    console.log(`   Field operations: 3 * 5 = ${c.toString()}`);
    console.log('   ✅ Snarky basic operations work');
  } catch (error) {
    console.error('   ❌ Snarky basic operations failed:', error);
  }
  
  // Switch to Sparky
  console.log('\n2️⃣ Testing with Sparky backend...');
  
  try {
    await switchBackend('sparky');
    console.log(`   Current backend: ${getCurrentBackend()}`);
    
    // Test simple field operations
    const a = Field(3);
    const b = Field(5);
    const c = a.mul(b);
    console.log(`   Field operations: 3 * 5 = ${c.toString()}`);
    console.log('   ✅ Sparky basic operations work');
    
    // Check if we have access to sparky internals
    if (globalThis.sparkyJS) {
      console.log('   - Sparky JS loaded: YES');
      console.log(`   - Sparky instance: ${!!globalThis.sparkyJS.sparkyInstance}`);
      if (globalThis.sparkyJS.sparkyInstance) {
        console.log(`   - rangeCheck0 available: ${typeof globalThis.sparkyJS.sparkyInstance.rangeCheck0}`);
        console.log(`   - poseidon available: ${!!globalThis.sparkyJS.sparkyInstance.poseidon}`);
      }
    }
  } catch (error) {
    console.error('   ❌ Sparky basic operations failed:', error);
    console.error('   Stack trace:', error.stack);
  }
  
  // Test a simpler circuit
  console.log('\n3️⃣ Testing with a simpler ZkProgram...');
  const { ZkProgram, Provable } = o1js;
  
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        method(pubIn, privIn) {
          const result = pubIn.mul(privIn);
          result.assertEquals(Field(42));
        }
      }
    }
  });
  
  try {
    console.log('   Compiling ZkProgram...');
    const programCompileResult = await SimpleProgram.compile();
    console.log('   ✅ ZkProgram compilation successful!');
    console.log(`   - Verification key exists: ${!!programCompileResult.verificationKey}`);
    console.log(`   - VK digest: ${programCompileResult.verificationKey?.digest() || 'missing'}`);
  } catch (error) {
    console.error('   ❌ ZkProgram compilation failed:', error);
    console.error('   Stack trace:', error.stack);
  }
  
  // Test an even simpler case - just constraint generation
  console.log('\n4️⃣ Testing simple constraint generation...');
  try {
    const witness = Provable.witness(Field, () => Field(5));
    const result = witness.mul(witness);
    console.log('   ✅ Simple multiplication constraint created');
    console.log(`   - Result: ${result.toString()}`);
  } catch (error) {
    console.error('   ❌ Simple constraint generation failed:', error);
  }
}

main().catch(console.error);