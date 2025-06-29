/**
 * Backend Switching Demo
 * 
 * Demonstrates how to switch between Snarky and Sparky backends at runtime
 * and shows the performance and compatibility of different operations.
 */

import {
  BackendType,
  getBackend,
  setBackend,
  getBackendInfo,
  configureForPerformance,
  configureForDebugging,
  setBackendConfig
} from '../lib/backend/index.js';

/**
 * Basic field arithmetic test
 */
async function testFieldArithmetic(backendName: string) {
  console.log(`\n=== Field Arithmetic Test (${backendName}) ===`);
  
  try {
    const backend = await getBackend();
    
    // Create field elements
    const a = backend.field.constant(100);
    const b = backend.field.constant(200);
    
    console.log('Created field elements a=100, b=200');
    
    // Test operations
    const sum = a.add(b);
    const product = a.mul(b);
    const difference = b.sub(a);
    const quotient = b.div(a);
    
    console.log('Performed basic arithmetic operations');
    
    // Test special operations
    const squared = a.square();
    const negated = a.neg();
    
    console.log('Performed special operations (square, negate)');
    
    // Test comparisons
    const equal = a.equals(a);
    const notEqual = a.equals(b);
    
    console.log('Performed equality tests');
    console.log('✓ Field arithmetic test passed');
    
    return {
      sum: sum.toBigInt(),
      product: product.toBigInt(),
      difference: difference.toBigInt(),
      quotient: quotient.toBigInt(),
      squared: squared.toBigInt(),
      equal: equal.toBoolean(),
      notEqual: notEqual.toBoolean()
    };
  } catch (error) {
    console.error(`✗ Field arithmetic test failed: ${error}`);
    throw error;
  }
}

/**
 * Boolean logic test
 */
async function testBooleanLogic(backendName: string) {
  console.log(`\n=== Boolean Logic Test (${backendName}) ===`);
  
  try {
    const backend = await getBackend();
    
    // Create boolean values
    const trueVal = backend.bool.true();
    const falseVal = backend.bool.false();
    
    console.log('Created boolean values');
    
    // Test logical operations
    const andResult = trueVal.and(falseVal);
    const orResult = trueVal.or(falseVal);
    const notResult = trueVal.not();
    
    console.log('Performed logical operations');
    
    // Test conversions
    const trueAsField = trueVal.toField();
    const falseAsField = falseVal.toField();
    
    console.log('Performed boolean-to-field conversions');
    console.log('✓ Boolean logic test passed');
    
    return {
      and: andResult.toBoolean(),
      or: orResult.toBoolean(),
      not: notResult.toBoolean(),
      trueAsField: trueAsField.toBigInt(),
      falseAsField: falseAsField.toBigInt()
    };
  } catch (error) {
    console.error(`✗ Boolean logic test failed: ${error}`);
    throw error;
  }
}

/**
 * Cryptographic operations test
 */
async function testCryptographicOperations(backendName: string) {
  console.log(`\n=== Cryptographic Operations Test (${backendName}) ===`);
  
  try {
    const backend = await getBackend();
    
    // Create input fields
    const input1 = backend.field.constant(12345);
    const input2 = backend.field.constant(67890);
    
    console.log('Created input fields for Poseidon hash');
    
    // Test Poseidon hash
    const hash = backend.crypto.poseidon([input1, input2]);
    const hashValue = hash.toBigInt();
    
    console.log(`Poseidon hash result: ${hashValue}`);
    console.log('✓ Cryptographic operations test passed');
    
    return {
      poseidonHash: hashValue
    };
  } catch (error) {
    console.error(`✗ Cryptographic operations test failed: ${error}`);
    throw error;
  }
}

/**
 * Constraint system test
 */
async function testConstraintSystem(backendName: string) {
  console.log(`\n=== Constraint System Test (${backendName}) ===`);
  
  try {
    const backend = await getBackend();
    
    // Test constraint system information
    let constraintCount = 0;
    let variableCount = 0;
    
    try {
      constraintCount = backend.constraintSystem.numConstraints();
      variableCount = backend.constraintSystem.numVariables();
    } catch (error) {
      console.log('Note: Constraint counting not available outside circuit context');
    }
    
    console.log(`Constraints: ${constraintCount}, Variables: ${variableCount}`);
    
    // Test prover mode
    const proverResult = backend.constraintSystem.asProver(() => {
      console.log('Executing in prover mode');
      return 42;
    });
    
    console.log(`Prover result: ${proverResult}`);
    console.log('✓ Constraint system test passed');
    
    return {
      constraints: constraintCount,
      variables: variableCount,
      proverResult
    };
  } catch (error) {
    console.error(`✗ Constraint system test failed: ${error}`);
    throw error;
  }
}

/**
 * Performance timing utility
 */
function timeExecution<T>(fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Run performance comparison between backends
 */
async function runPerformanceComparison() {
  console.log('\n🏃 Running Performance Comparison...');
  
  const results: Record<string, { snarky?: number; sparky?: number }> = {};
  
  for (const backendType of [BackendType.SNARKY, BackendType.SPARKY]) {
    try {
      console.log(`\nSwitching to ${backendType} backend...`);
      await setBackend(backendType);
      
      const backend = await getBackend();
      
      // Time field operations
      const { time: fieldTime } = timeExecution(() => {
        const a = backend.field.constant(1000);
        const b = backend.field.constant(2000);
        for (let i = 0; i < 1000; i++) {
          a.add(b).mul(a).square();
        }
      });
      
      results.fieldOperations = results.fieldOperations || {};
      results.fieldOperations[backendType] = fieldTime;
      
      // Time Poseidon hash
      const { time: hashTime } = timeExecution(() => {
        const input1 = backend.field.constant(12345);
        const input2 = backend.field.constant(67890);
        for (let i = 0; i < 100; i++) {
          backend.crypto.poseidon([input1, input2]);
        }
      });
      
      results.poseidonHash = results.poseidonHash || {};
      results.poseidonHash[backendType] = hashTime;
      
      console.log(`Field operations (1000x): ${fieldTime.toFixed(2)}ms`);
      console.log(`Poseidon hash (100x): ${hashTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`Performance test failed for ${backendType}: ${error}`);
    }
  }
  
  return results;
}

/**
 * Run compatibility tests across backends
 */
async function runCompatibilityTests() {
  console.log('\n🔍 Running Compatibility Tests...');
  
  const results: Record<string, any> = {};
  
  for (const backendType of [BackendType.SNARKY, BackendType.SPARKY]) {
    try {
      console.log(`\nTesting ${backendType} backend...`);
      await setBackend(backendType);
      
      results[backendType] = {
        fieldArithmetic: await testFieldArithmetic(backendType),
        booleanLogic: await testBooleanLogic(backendType),
        cryptographicOps: await testCryptographicOperations(backendType),
        constraintSystem: await testConstraintSystem(backendType)
      };
      
    } catch (error) {
      console.error(`Compatibility test failed for ${backendType}: ${error}`);
      results[backendType] = { error: error.message };
    }
  }
  
  return results;
}

/**
 * Compare results between backends
 */
function compareResults(results: Record<string, any>) {
  console.log('\n📊 Comparing Results...');
  
  const snarkyResults = results[BackendType.SNARKY];
  const sparkyResults = results[BackendType.SPARKY];
  
  if (!snarkyResults || !sparkyResults) {
    console.log('Cannot compare - one or both backends failed');
    return;
  }
  
  let allMatch = true;
  
  // Compare field arithmetic
  const snarkyField = snarkyResults.fieldArithmetic;
  const sparkyField = sparkyResults.fieldArithmetic;
  
  if (snarkyField && sparkyField) {
    for (const [key, value] of Object.entries(snarkyField)) {
      if (sparkyField[key] !== value) {
        console.log(`❌ Field ${key}: Snarky=${value}, Sparky=${sparkyField[key]}`);
        allMatch = false;
      } else {
        console.log(`✅ Field ${key}: Both=${value}`);
      }
    }
  }
  
  // Compare Poseidon hashes
  const snarkyHash = snarkyResults.cryptographicOps?.poseidonHash;
  const sparkyHash = sparkyResults.cryptographicOps?.poseidonHash;
  
  if (snarkyHash && sparkyHash) {
    if (snarkyHash === sparkyHash) {
      console.log(`✅ Poseidon hash: Both=${snarkyHash}`);
    } else {
      console.log(`❌ Poseidon hash: Snarky=${snarkyHash}, Sparky=${sparkyHash}`);
      allMatch = false;
    }
  }
  
  if (allMatch) {
    console.log('\n🎉 All compatibility tests passed! Backends produce identical results.');
  } else {
    console.log('\n⚠️  Some compatibility tests failed. Results differ between backends.');
  }
}

/**
 * Main demo function
 */
async function main() {
  console.log('🚀 O1JS Backend Switching Demo');
  console.log('==============================');
  
  try {
    // Show current backend info
    const info = getBackendInfo();
    console.log(`Available backends: ${info.available.join(', ')}`);
    console.log(`Current backend: ${info.current || 'none'}`);
    
    // Configure for performance testing
    configureForPerformance();
    console.log('✅ Configured for performance testing');
    
    // Run compatibility tests
    const compatibilityResults = await runCompatibilityTests();
    
    // Compare results
    compareResults(compatibilityResults);
    
    // Run performance comparison
    const performanceResults = await runPerformanceComparison();
    
    // Display performance summary
    console.log('\n📈 Performance Summary:');
    for (const [operation, times] of Object.entries(performanceResults)) {
      console.log(`\n${operation}:`);
      for (const [backend, time] of Object.entries(times)) {
        console.log(`  ${backend}: ${time.toFixed(2)}ms`);
      }
    }
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runBackendSwitchingDemo };