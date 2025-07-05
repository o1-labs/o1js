#!/usr/bin/env node

/**
 * Test SmartContract compilation with proper method decorators
 * 
 * Created: July 5, 2025, 1:20 AM UTC
 * Last Modified: July 5, 2025, 1:20 AM UTC
 */

import { switchBackend, getCurrentBackend, SmartContract, State, state, Field, method, Mina, Provable, decorators } from './dist/node/index.js';

async function testProperSmartContract() {
  console.log('🔍 Testing SmartContract Compilation with Proper Decorators\n');
  
  // Define a proper SmartContract using decorators
  const { state: stateDecorator, method: methodDecorator } = decorators;
  
  class ProperContract extends SmartContract {
    // Initialize state in constructor
    constructor(address) {
      super(address);
      // Define state field
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
    
    async update(newValue) {
      const current = this.value.getAndRequireEquals();
      newValue.assertGreaterThan(current);
      this.value.set(newValue);
    }
  }
  
  // Apply decorators programmatically
  stateDecorator(Field)(ProperContract.prototype, 'value');
  methodDecorator(ProperContract.prototype, 'increment');
  methodDecorator(ProperContract.prototype, 'update');
  
  console.log('Contract defined with:');
  console.log('  - State field: value (Field)');
  console.log('  - Methods: increment(), update(newValue)');
  
  // Test compilation with both backends
  const results = {};
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📦 Testing ${backend} backend...`);
    switchBackend(backend);
    console.log('   Current backend:', getCurrentBackend());
    
    try {
      // Check constraint generation before compilation
      console.log('\n   Testing constraint generation for increment method...');
      const { rows } = await Provable.constraintSystem(() => {
        const contract = new ProperContract(Field(0));
        contract.increment();
      });
      console.log(`   Constraints generated: ${rows}`);
      
      // Compile the contract
      console.log('\n   Starting compilation...');
      const startTime = Date.now();
      const compilationResult = await ProperContract.compile();
      const endTime = Date.now();
      
      console.log(`   ✅ ${backend}: Compilation successful`);
      console.log('      VK hash:', compilationResult.verificationKey?.hash?.toString());
      console.log('      VK data length:', compilationResult.verificationKey?.data?.length);
      console.log('      Methods compiled:', Object.keys(compilationResult.provers || {}));
      console.log('      Compilation time:', endTime - startTime, 'ms');
      
      results[backend] = {
        success: true,
        vkHash: compilationResult.verificationKey?.hash?.toString(),
        vkDataLength: compilationResult.verificationKey?.data?.length,
        methods: Object.keys(compilationResult.provers || {}),
        time: endTime - startTime,
        constraints: rows
      };
      
    } catch (error) {
      console.log(`   ❌ ${backend}: Compilation failed`);
      console.log('      Error:', error.message);
      if (error.stack) {
        console.log('      Stack (first 3 lines):');
        error.stack.split('\n').slice(0, 3).forEach(line => console.log('       ', line));
      }
      
      results[backend] = {
        success: false,
        error: error.message
      };
    }
  }
  
  // Compare results
  console.log('\n📊 Compilation Comparison:');
  console.log('===========================');
  
  if (results.snarky?.success && results.sparky?.success) {
    // VK comparison
    const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    console.log(`\nVK Hash Match: ${vkMatch ? '✅' : '❌'}`);
    if (!vkMatch) {
      console.log(`  Snarky: ${results.snarky.vkHash}`);
      console.log(`  Sparky: ${results.sparky.vkHash}`);
    }
    
    // Performance comparison
    console.log(`\nPerformance:`);
    console.log(`  Snarky: ${results.snarky.time}ms`);
    console.log(`  Sparky: ${results.sparky.time}ms`);
    const speedup = results.snarky.time / results.sparky.time;
    console.log(`  Speedup: ${speedup.toFixed(2)}x`);
    
    // Method comparison
    console.log(`\nMethods Compiled:`);
    console.log(`  Snarky: ${results.snarky.methods.join(', ')}`);
    console.log(`  Sparky: ${results.sparky.methods.join(', ')}`);
    
    // Constraint comparison
    if (results.snarky.constraints !== undefined && results.sparky.constraints !== undefined) {
      console.log(`\nConstraints:`);
      console.log(`  Snarky: ${results.snarky.constraints}`);
      console.log(`  Sparky: ${results.sparky.constraints}`);
    }
  } else {
    // Show failures
    if (!results.snarky?.success) {
      console.log(`\nSnarky: ❌ Failed`);
      console.log(`  Error: ${results.snarky?.error}`);
    }
    if (!results.sparky?.success) {
      console.log(`\nSparky: ❌ Failed`);
      console.log(`  Error: ${results.sparky?.error}`);
    }
  }
  
  // Test a more complex contract
  console.log('\n\n🔍 Testing Complex SmartContract...');
  
  class ComplexContract extends SmartContract {
    constructor(address) {
      super(address);
      this.counter = State();
      this.isActive = State();
    }
    
    init() {
      super.init();
      this.counter.set(Field(0));
      this.isActive.set(Field(1)); // Using Field instead of Bool for simplicity
    }
    
    async incrementCounter() {
      const current = this.counter.getAndRequireEquals();
      const witnessValue = Provable.witness(Field, () => Field(5));
      witnessValue.assertGreaterThan(Field(0));
      const newCounter = current.add(Field(1)).add(witnessValue);
      this.counter.set(newCounter);
    }
    
    async conditionalUpdate(condition, thenVal, elseVal) {
      const result = Provable.if(condition, thenVal, elseVal);
      this.counter.set(result);
    }
  }
  
  // Apply decorators
  stateDecorator(Field)(ComplexContract.prototype, 'counter');
  stateDecorator(Field)(ComplexContract.prototype, 'isActive');
  methodDecorator(ComplexContract.prototype, 'incrementCounter');
  methodDecorator(ComplexContract.prototype, 'conditionalUpdate');
  
  console.log('\nComplex contract defined with multiple states and methods');
  
  // Test only with Sparky for the complex contract
  switchBackend('sparky');
  try {
    console.log('\nCompiling complex contract with Sparky...');
    const result = await ComplexContract.compile();
    console.log('✅ Complex contract compilation successful');
    console.log('   Methods:', Object.keys(result.provers || {}));
  } catch (error) {
    console.log('❌ Complex contract compilation failed:', error.message);
  }
}

// Run the test
testProperSmartContract().catch(console.error);