#!/usr/bin/env node

/**
 * Debug comprehensive test failures
 * 
 * Created: July 5, 2025, 1:15 AM UTC
 * Last Modified: July 5, 2025, 1:15 AM UTC
 */

import { switchBackend, getCurrentBackend, SmartContract, State, state, Field, method, Mina, AccountUpdate, PrivateKey, PublicKey } from './dist/node/index.js';

async function testSmartContractCompilation() {
  console.log('🔍 Debugging SmartContract Compilation Issues\n');
  
  // Set up test environment
  console.log('1️⃣ Setting up test environment...');
  
  // Create test keys
  const privateKey = PrivateKey.random();
  const publicKey = privateKey.toPublicKey();
  console.log('   Test keys generated');
  
  // Try to set up Mina instance
  try {
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('   LocalBlockchain initialized');
  } catch (error) {
    console.log('   LocalBlockchain setup failed:', error.message);
  }
  
  // Define a minimal SmartContract
  class MinimalContract extends SmartContract {
    // No state, no methods - just the bare minimum
  }
  
  console.log('\n2️⃣ Testing minimal SmartContract compilation...');
  
  // Test with Snarky
  switchBackend('snarky');
  console.log('   Backend:', getCurrentBackend());
  try {
    const result = await MinimalContract.compile();
    console.log('   ✅ Snarky: Compilation successful');
    console.log('      VK exists:', !!result.verificationKey);
  } catch (error) {
    console.log('   ❌ Snarky: Compilation failed -', error.message);
  }
  
  // Test with Sparky
  switchBackend('sparky');
  console.log('\n   Backend:', getCurrentBackend());
  
  // Debug Sparky state
  const sparkyInstance = globalThis.sparkyWasm || globalThis.sparky;
  if (sparkyInstance) {
    console.log('   Sparky WASM loaded: ✅');
    console.log('   Key compilation functions:');
    console.log('     - constraintSystemFromKeypair:', typeof sparkyInstance.constraintSystemFromKeypair);
    console.log('     - keypairGetVk:', typeof sparkyInstance.keypairGetVk);
    console.log('     - keypairGetConstraintSystemWithAuxiliary:', typeof sparkyInstance.keypairGetConstraintSystemWithAuxiliary);
    console.log('     - keypairCreate:', typeof sparkyInstance.keypairCreate);
    console.log('     - proverDummyLagrangeBasisEvals:', typeof sparkyInstance.proverDummyLagrangeBasisEvals);
  } else {
    console.log('   Sparky WASM loaded: ❌');
  }
  
  try {
    const result = await MinimalContract.compile();
    console.log('   ✅ Sparky: Compilation successful');
    console.log('      VK exists:', !!result.verificationKey);
  } catch (error) {
    console.log('   ❌ Sparky: Compilation failed -', error.message);
    if (error.stack) {
      console.log('   Stack trace (first 5 lines):');
      error.stack.split('\n').slice(0, 5).forEach(line => console.log('     ', line));
    }
  }
  
  // Now test with a contract that has state
  console.log('\n3️⃣ Testing SmartContract with state...');
  
  class ContractWithState extends SmartContract {
    // Use declareState instead of decorators
    static _fields = {
      value: Field
    };
    
    constructor(address) {
      super(address);
      this.value = State();
    }
  }
  
  // Test compilation
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n   Testing ${backend}...`);
    try {
      const result = await ContractWithState.compile();
      console.log(`   ✅ ${backend}: Compilation successful`);
      console.log('      VK hash:', result.verificationKey?.hash?.toString());
    } catch (error) {
      console.log(`   ❌ ${backend}: Compilation failed -`, error.message);
    }
  }
  
  // Test with a contract that has methods
  console.log('\n4️⃣ Testing SmartContract with methods...');
  
  class ContractWithMethod extends SmartContract {
    static _methods = {
      update: {
        privateInputs: [Field]
      }
    };
    
    update(value) {
      // Simple method that just returns the value
      return value;
    }
  }
  
  // Test compilation
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n   Testing ${backend}...`);
    try {
      const result = await ContractWithMethod.compile();
      console.log(`   ✅ ${backend}: Compilation successful`);
      console.log('      Methods compiled:', Object.keys(result.provers || {}));
    } catch (error) {
      console.log(`   ❌ ${backend}: Compilation failed -`, error.message);
    }
  }
  
  // Check OCaml binding status
  console.log('\n5️⃣ Checking OCaml binding status...');
  const Snarky = globalThis.__snarky?.Snarky || globalThis.Snarky;
  if (Snarky) {
    console.log('   OCaml Snarky available: ✅');
    console.log('   Pickles functions:');
    console.log('     - Pickles.compile:', typeof Snarky.pickles?.compile);
    console.log('     - Pickles.compile_promise:', typeof Snarky.pickles?.compile_promise);
    console.log('     - Pickles.dummyBase:', typeof Snarky.pickles?.dummyBase);
    console.log('     - Pickles.dummyScalar:', typeof Snarky.pickles?.dummyScalar);
  } else {
    console.log('   OCaml Snarky available: ❌');
  }
}

// Run the test
testSmartContractCompilation().catch(console.error);