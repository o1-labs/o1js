#!/usr/bin/env node

// Direct SmartContract compilation test
// Created: July 5, 2025
// Last Modified: July 5, 2025 00:45 UTC

import('./dist/node/index.js').then(async (o1js) => {
  const { SmartContract, State, state, Field, method, Mina, switchBackend, getCurrentBackend } = o1js;
  
  console.log('Direct SmartContract Compilation Test\n');
  
  // Set up LocalBlockchain
  console.log('Setting up LocalBlockchain...');
  try {
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✅ LocalBlockchain setup complete\n');
  } catch (error) {
    console.error('❌ LocalBlockchain setup failed:', error.message);
    return;
  }
  
  // Define SmartContract (avoiding decorator syntax for pure JS)
  class TestContract extends SmartContract {
    constructor() {
      super();
      this.value = State();
    }
    
    init() {
      super.init();
      this.value.set(Field(0));
    }
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = current.add(Field(1));
      this.value.set(newValue);
    }
  }
  
  // Apply decorators manually
  state(Field)(TestContract.prototype, 'value');
  method(TestContract.prototype, 'increment');
  
  // Test with Snarky
  console.log('1. Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('   Compiling SmartContract...');
    const start = Date.now();
    const snarkyResult = await TestContract.compile();
    const duration = Date.now() - start;
    
    console.log(`   ✅ Snarky compilation successful in ${duration}ms`);
    console.log(`   - VK exists: ${!!snarkyResult.verificationKey}`);
    console.log(`   - VK hash: ${snarkyResult.verificationKey?.hash || 'missing'}`);
    console.log(`   - Methods: ${Object.keys(snarkyResult.provers || {}).join(', ')}\n`);
  } catch (error) {
    console.error('   ❌ Snarky compilation failed:', error.message);
  }
  
  // Test with Sparky
  console.log('2. Testing with Sparky backend...');
  await switchBackend('sparky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  // Need to redefine contract for Sparky backend
  class TestContractSparky extends SmartContract {
    constructor() {
      super();
      this.value = State();
    }
    
    init() {
      super.init();
      this.value.set(Field(0));
    }
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = current.add(Field(1));
      this.value.set(newValue);
    }
  }
  
  // Apply decorators manually
  state(Field)(TestContractSparky.prototype, 'value');
  method(TestContractSparky.prototype, 'increment');
  
  try {
    console.log('   Compiling SmartContract...');
    const start = Date.now();
    const sparkyResult = await TestContractSparky.compile();
    const duration = Date.now() - start;
    
    console.log(`   ✅ Sparky compilation successful in ${duration}ms`);
    console.log(`   - VK exists: ${!!sparkyResult.verificationKey}`);
    console.log(`   - VK hash: ${sparkyResult.verificationKey?.hash || 'missing'}`);
    console.log(`   - Methods: ${Object.keys(sparkyResult.provers || {}).join(', ')}`);
    
    // Compare results
    console.log('\n3. Comparison:');
    console.log('   Both backends compiled successfully!');
    
  } catch (error) {
    console.error('   ❌ Sparky compilation failed:', error.message);
    console.error('   Stack:', error.stack);
    
    // Debug info
    console.log('\n   Debug information:');
    if (error.message.includes('rangeCheck0')) {
      console.log('   - Error involves rangeCheck0 function');
    }
    if (error.message.includes('poseidon')) {
      console.log('   - Error involves poseidon function');
    }
    
    // Check Sparky internals
    if (globalThis.sparkyJS?.sparkyInstance) {
      const instance = globalThis.sparkyJS.sparkyInstance;
      console.log('   - rangeCheck0:', typeof instance.rangeCheck0);
      console.log('   - poseidon:', !!instance.poseidon);
      
      if (instance.poseidon) {
        console.log('   - poseidon.hash:', typeof instance.poseidon.hash);
      }
    }
  }
  
}).catch(console.error);