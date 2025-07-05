/**
 * Direct Compilation Test
 * 
 * Run compilation tests directly without parallel infrastructure
 * to debug Sparky issues more clearly.
 */

import { SmartContract, State, state, Field, method, UInt64, Bool, Poseidon, ZkProgram, Provable, switchBackend } from '../../index.js';

console.log('🚀 Starting Direct Compilation Test');

async function testBasicSmartContract() {
  console.log('\n📦 Testing Basic SmartContract Compilation...');
  
  // Switch to Sparky backend
  await switchBackend('sparky' as any);
  console.log('✅ Switched to Sparky backend');
  
  class TestContract extends SmartContract {
    @state(Field) value = State();
    
    init() {
      super.init();
      this.value.set(Field(0));
    }
    
    @method async increment() {
      console.log('🔍 increment method: Getting current value...');
      const current = this.value.getAndRequireEquals();
      console.log('🔍 increment method: Adding 1 to current value...');
      const newValue = (current as any).add(Field(1));
      console.log('🔍 increment method: Setting new value...');
      this.value.set(newValue);
    }
  }
  
  try {
    console.log('🔨 Starting compilation...');
    const startTime = Date.now();
    const result = await TestContract.compile();
    const endTime = Date.now();
    
    console.log('✅ Compilation successful!');
    console.log(`⏱️  Compilation time: ${endTime - startTime}ms`);
    console.log(`🔑 Verification key exists: ${!!result.verificationKey}`);
    console.log(`📊 Method count: ${Object.keys(result.provers || {}).length}`);
    
    return { success: true, time: endTime - startTime };
  } catch (error) {
    console.error('❌ Compilation failed:', error);
    console.error('Stack trace:', (error as Error).stack);
    return { success: false, error: (error as Error).message };
  }
}

async function testSimpleZkProgram() {
  console.log('\n📦 Testing Simple ZkProgram Compilation...');
  
  const SimpleProgram = ZkProgram({
    name: 'simple-program',
    publicInput: Field,
    
    methods: {
      simple: {
        privateInputs: [Field],
        method(publicInput, secret) {
          console.log('🔍 simple method: Adding public and secret...');
          // Very simple operation to avoid multi-term linear combinations
          return publicInput.add(secret);
        }
      }
    }
  });
  
  try {
    console.log('🔨 Starting compilation...');
    const startTime = Date.now();
    await SimpleProgram.compile();
    const endTime = Date.now();
    
    console.log('✅ Compilation successful!');
    console.log(`⏱️  Compilation time: ${endTime - startTime}ms`);
    
    return { success: true, time: endTime - startTime };
  } catch (error) {
    console.error('❌ Compilation failed:', error);
    console.error('Stack trace:', (error as Error).stack);
    return { success: false, error: (error as Error).message };
  }
}

async function testComplexOperations() {
  console.log('\n📦 Testing Complex Operations to Find Limit...');
  
  const ComplexProgram = ZkProgram({
    name: 'complex-program',
    publicInput: Field,
    
    methods: {
      twoTerms: {
        privateInputs: [Field],
        method(publicInput, secret) {
          console.log('🔍 twoTerms: Testing 2-term linear combination...');
          // This should work: a + b
          return publicInput.add(secret);
        }
      },
      
      threeTerms: {
        privateInputs: [Field, Field],
        method(publicInput, a, b) {
          console.log('🔍 threeTerms: Testing 3-term linear combination...');
          // This might fail: pub + a + b
          return publicInput.add(a).add(b);
        }
      },
      
      multiplication: {
        privateInputs: [Field],
        method(publicInput, secret) {
          console.log('🔍 multiplication: Testing multiplication...');
          // Test multiplication which creates quadratic constraints
          return publicInput.mul(secret);
        }
      },
      
      witness: {
        privateInputs: [],
        method(publicInput) {
          console.log('🔍 witness: Testing witness creation...');
          // Test witness variable
          const w = Provable.witness(Field, () => Field(42));
          return publicInput.add(w);
        }
      }
    }
  });
  
  try {
    console.log('🔨 Starting compilation...');
    const startTime = Date.now();
    await ComplexProgram.compile();
    const endTime = Date.now();
    
    console.log('✅ Compilation successful!');
    console.log(`⏱️  Compilation time: ${endTime - startTime}ms`);
    
    return { success: true, time: endTime - startTime };
  } catch (error) {
    console.error('❌ Compilation failed:', error);
    console.error('Stack trace:', (error as Error).stack);
    return { success: false, error: (error as Error).message };
  }
}

async function testConstraintSystem() {
  console.log('\n📦 Testing Constraint System Generation...');
  
  // Let's see what constraints are generated for simple operations
  await switchBackend('sparky' as any);
  
  console.log('🔍 Testing Field.add constraint generation...');
  try {
    const cs1 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(1));
      const b = Provable.witness(Field, () => Field(2));
      const c = a.add(b);
      c.assertEquals(Field(3));
    });
    console.log('✅ Field.add constraints:', cs1.gates.length, 'gates');
  } catch (error) {
    console.error('❌ Field.add constraint generation failed:', error);
  }
  
  console.log('\n🔍 Testing multiple additions constraint generation...');
  try {
    const cs2 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(1));
      const b = Provable.witness(Field, () => Field(2));
      const c = Provable.witness(Field, () => Field(3));
      const result = a.add(b).add(c);
      result.assertEquals(Field(6));
    });
    console.log('✅ Multiple additions constraints:', cs2.gates.length, 'gates');
  } catch (error) {
    console.error('❌ Multiple additions constraint generation failed:', error);
  }
}

// Run all tests
async function main() {
  console.log('🔬 Running Direct Compilation Tests\n');
  
  const results = {
    basicSmartContract: await testBasicSmartContract(),
    simpleZkProgram: await testSimpleZkProgram(),
    complexOperations: await testComplexOperations(),
  };
  
  await testConstraintSystem();
  
  console.log('\n📊 Test Results Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.success ? `${result.time}ms` : result.error}`);
  });
}

main().catch(console.error);