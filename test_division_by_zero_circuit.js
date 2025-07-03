/**
 * Division by Zero in Circuit Context Test
 * Tests consistency in circuit compilation and proving contexts
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test program that tries to do division by zero in circuit
const DivisionProgram = ZkProgram({
  name: 'DivisionTest',
  publicInput: Field,
  methods: {
    divideByZero: {
      privateInputs: [],
      method(x) {
        // This should cause division by zero
        const zero = Field(0);
        const result = x.div(zero);
        return result;
      }
    },
    
    conditionalDivision: {
      privateInputs: [Field],
      method(x, divisor) {
        // Test conditional division - might behave differently
        const result = x.div(divisor);
        return result;
      }
    },
    
    inverseInCircuit: {
      privateInputs: [],
      method(x) {
        // Test inverse directly in circuit
        const inv = x.inv();
        return inv;
      }
    }
  }
});

async function testCircuitDivisionByZero() {
  console.log('Testing division by zero in circuit/proving contexts...\n');
  
  const backends = ['snarky', 'sparky'];
  const results = {};

  for (const backend of backends) {
    console.log(`\n=== Testing with ${backend.toUpperCase()} backend ===`);
    await switchBackend(backend);
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    results[backend] = {};

    // Test 1: Circuit compilation with division by zero
    console.log('\n1. Testing circuit compilation with division by zero...');
    try {
      console.log('Compiling divideByZero method...');
      await DivisionProgram.compile();
      console.log('✅ Circuit compilation succeeded');
      results[backend].compilation = { success: true };
    } catch (error) {
      console.log(`❌ Circuit compilation failed: ${error.message}`);
      results[backend].compilation = { success: false, error: error.message };
    }

    // Test 2: Proving with zero
    if (results[backend].compilation.success) {
      console.log('\n2. Testing proof generation with zero input...');
      try {
        const proof = await DivisionProgram.divideByZero(Field(0));
        console.log('✅ Proof generation succeeded');
        results[backend].proving_zero = { success: true };
      } catch (error) {
        console.log(`❌ Proof generation failed: ${error.message}`);
        results[backend].proving_zero = { success: false, error: error.message };
      }

      console.log('\n3. Testing proof generation with non-zero input...');
      try {
        const proof = await DivisionProgram.divideByZero(Field(5));
        console.log('✅ Proof generation succeeded (unexpected!)');
        results[backend].proving_nonzero = { success: true };
      } catch (error) {
        console.log(`❌ Proof generation failed: ${error.message}`);
        results[backend].proving_nonzero = { success: false, error: error.message };
      }

      console.log('\n4. Testing conditional division with zero divisor...');
      try {
        const proof = await DivisionProgram.conditionalDivision(Field(5), Field(0));
        console.log('✅ Conditional division proof succeeded (unexpected!)');
        results[backend].conditional_zero = { success: true };
      } catch (error) {
        console.log(`❌ Conditional division proof failed: ${error.message}`);
        results[backend].conditional_zero = { success: false, error: error.message };
      }

      console.log('\n5. Testing inverse with zero input...');
      try {
        const proof = await DivisionProgram.inverseInCircuit(Field(0));
        console.log('✅ Inverse proof succeeded (unexpected!)');
        results[backend].inverse_zero = { success: true };
      } catch (error) {
        console.log(`❌ Inverse proof failed: ${error.message}`);
        results[backend].inverse_zero = { success: false, error: error.message };
      }
    }
  }

  // Compare results
  console.log('\n\n=== CIRCUIT CONTEXT CONSISTENCY ANALYSIS ===');
  
  const testTypes = ['compilation', 'proving_zero', 'proving_nonzero', 'conditional_zero', 'inverse_zero'];
  
  for (const testType of testTypes) {
    console.log(`\n${testType.toUpperCase()}:`);
    if (!results.snarky[testType] || !results.sparky[testType]) {
      console.log('  ⚠️ Test not performed on both backends');
      continue;
    }
    
    const snarkyResult = results.snarky[testType];
    const sparkyResult = results.sparky[testType];
    
    console.log(`  Snarky: ${snarkyResult.success ? 'SUCCESS' : 'ERROR (' + snarkyResult.error + ')'}`);
    console.log(`  Sparky: ${sparkyResult.success ? 'SUCCESS' : 'ERROR (' + sparkyResult.error + ')'}`);
    
    if (snarkyResult.success !== sparkyResult.success) {
      console.log(`  🚨 INCONSISTENCY: Different behavior in circuit context!`);
    } else {
      console.log(`  ✅ CONSISTENT: Both backends behave the same`);
    }
  }

  return results;
}

async function testAsProverDivision() {
  console.log('\n\n=== Testing asProver context ===');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n--- ${backend.toUpperCase()} backend ---`);
    await switchBackend(backend);
    
    try {
      // Test in asProver context
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

async function runAllTests() {
  try {
    await testCircuitDivisionByZero();
    await testAsProverDivision();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runAllTests();