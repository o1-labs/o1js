#!/usr/bin/env node

// Simple test for circuit compilation with Sparky backend
// Created: July 5, 2025
// Last Modified: July 5, 2025 00:15 UTC

import * as o1js from './dist/index.js';

async function main() {
  const { Field, Provable, switchBackend, getCurrentBackend } = o1js;
  
  console.log('Testing Circuit Compilation with Sparky Backend\n');
  
  // Test 1: Basic field operations with Sparky
  console.log('1. Testing basic field operations...');
  await switchBackend('sparky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  try {
    const a = Field(3);
    const b = Field(5);
    const c = a.mul(b);
    console.log(`   Field multiplication: 3 * 5 = ${c.toString()}`);
    console.log('   ✅ Basic field operations work\n');
  } catch (error) {
    console.error('   ❌ Basic field operations failed:', error.message);
  }
  
  // Test 2: Witness generation
  console.log('2. Testing witness generation...');
  try {
    const witness = Provable.witness(Field, () => Field(42));
    console.log(`   Witness value: ${witness.toString()}`);
    console.log('   ✅ Witness generation works\n');
  } catch (error) {
    console.error('   ❌ Witness generation failed:', error.message);
  }
  
  // Test 3: Simple constraint creation
  console.log('3. Testing constraint creation...');
  try {
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(7));
      const y = Provable.witness(Field, () => Field(6));
      const z = x.mul(y);
      z.assertEquals(Field(42));
    });
    console.log('   ✅ Constraint creation and checking works\n');
  } catch (error) {
    console.error('   ❌ Constraint creation failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  // Test 4: Complex constraint generation
  console.log('4. Testing complex constraint generation...');
  try {
    const { ZkProgram } = o1js;
    
    const SimpleProgram = ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      
      methods: {
        compute: {
          privateInputs: [Field],
          
          method(pubIn, privIn) {
            // Create some constraints
            const result = pubIn.mul(privIn);
            result.assertEquals(Field(42));
          }
        }
      }
    });
    
    console.log('   ZkProgram defined successfully');
    console.log('   Attempting to compile...');
    
    const startTime = Date.now();
    const compilationResult = await SimpleProgram.compile();
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Compilation successful in ${duration}ms!`);
    console.log(`   - VK exists: ${!!compilationResult.verificationKey}`);
    console.log(`   - VK digest: ${compilationResult.verificationKey?.digest() || 'missing'}`);
    
  } catch (error) {
    console.error('   ❌ Complex constraint generation failed:', error.message);
    console.error('   Stack:', error.stack);
    
    // Additional debugging
    console.log('\n   Debug information:');
    if (globalThis.sparkyJS) {
      console.log('   - Sparky JS loaded: YES');
      const sparky = globalThis.sparkyJS.sparkyInstance;
      if (sparky) {
        console.log('   - Sparky instance exists: YES');
        console.log(`   - rangeCheck0: ${typeof sparky.rangeCheck0}`);
        console.log(`   - poseidon: ${!!sparky.poseidon}`);
      }
    }
  }
  
  // Test 5: SmartContract compilation
  console.log('\n5. Testing SmartContract compilation...');
  try {
    const { SmartContract, state, State, method } = o1js;
    
    // Define a simple contract without decorators
    class SimpleContract extends SmartContract {
      constructor() {
        super();
        this.value = State();
      }
      
      init() {
        super.init();
        this.value.set(Field(0));
      }
      
      updateValue(newValue) {
        const current = this.value.getAndRequireEquals();
        newValue.assertGreaterThan(current);
        this.value.set(newValue);
      }
    }
    
    // Manually set up state and method
    state(Field)(SimpleContract.prototype, 'value');
    method(SimpleContract.prototype, 'updateValue');
    
    console.log('   SmartContract defined successfully');
    console.log('   Attempting to compile...');
    
    const startTime = Date.now();
    const compilationResult = await SimpleContract.compile();
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ SmartContract compilation successful in ${duration}ms!`);
    console.log(`   - VK exists: ${!!compilationResult.verificationKey}`);
    console.log(`   - Methods: ${Object.keys(compilationResult.provers || {}).join(', ')}`);
    
  } catch (error) {
    console.error('   ❌ SmartContract compilation failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

main().catch(console.error);