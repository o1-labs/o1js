/**
 * Exact reproduction of the inconsistency found in the circuit test
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function reproduceInconsistency() {
  console.log('Reproducing the exact inconsistency from the circuit test...\n');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n--- ${backend.toUpperCase()} backend ---`);
    await switchBackend(backend);
    
    try {
      // This is the exact code from the failing test
      const result = await Provable.runAndCheck(() => {
        const x = Provable.witness(Field, () => Field(5));
        const zero = Provable.witness(Field, () => Field(0));
        
        // This might behave differently in asProver
        return Provable.asProver(() => {
          try {
            const division = x.div(zero);
            console.log(`  Division result: ${division}`);
            return division;
          } catch (error) {
            console.log(`  Division error in asProver: ${error.message}`);
            throw error;
          }
        });
      });
      console.log(`✅ asProver test succeeded: ${result}`);
    } catch (error) {
      console.log(`❌ asProver test failed: ${error.message}`);
    }
  }
}

async function testDifferentContexts() {
  console.log('\n\n=== Testing different execution contexts ===');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n--- ${backend.toUpperCase()} backend ---`);
    await switchBackend(backend);
    
    // Test 1: Plain asProver
    console.log('\n1. Plain asProver:');
    try {
      const result = Provable.asProver(() => {
        return Field(5).div(Field(0));
      });
      console.log(`   ✅ SUCCESS: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Test 2: asProver within runAndCheck
    console.log('\n2. asProver within runAndCheck:');
    try {
      const result = await Provable.runAndCheck(() => {
        return Provable.asProver(() => {
          return Field(5).div(Field(0));
        });
      });
      console.log(`   ✅ SUCCESS: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Test 3: With witnesses in runAndCheck
    console.log('\n3. With witnesses in runAndCheck:');
    try {
      const result = await Provable.runAndCheck(() => {
        const x = Provable.witness(Field, () => Field(5));
        const zero = Provable.witness(Field, () => Field(0));
        
        return Provable.asProver(() => {
          return x.div(zero);
        });
      });
      console.log(`   ✅ SUCCESS: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Test 4: Direct witness with division by zero
    console.log('\n4. Direct witness with division by zero:');
    try {
      const result = await Provable.runAndCheck(() => {
        const badWitness = Provable.witness(Field, () => Field(5).div(Field(0)));
        return badWitness;
      });
      console.log(`   ✅ SUCCESS: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

async function testConstantVsVariable() {
  console.log('\n\n=== Testing constant vs variable division ===');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n--- ${backend.toUpperCase()} backend ---`);
    await switchBackend(backend);
    
    // Test with constant zero
    console.log('\n1. Division by constant zero:');
    try {
      const zero = Field(0);
      console.log(`   Zero is constant: ${zero.isConstant()}`);
      const result = Field(5).div(zero);
      console.log(`   ✅ SUCCESS: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Test with variable zero in prover context
    console.log('\n2. Division by variable zero:');
    try {
      await Provable.runAndCheck(() => {
        const zero = Provable.witness(Field, () => Field(0));
        console.log(`   Zero is constant: ${zero.isConstant()}`);
        const result = Field(5).div(zero);
        console.log(`   ✅ SUCCESS: ${result}`);
        return result;
      });
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

async function runAllTests() {
  try {
    await reproduceInconsistency();
    await testDifferentContexts();
    await testConstantVsVariable();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runAllTests();