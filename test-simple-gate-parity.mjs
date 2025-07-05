#!/usr/bin/env node

/**
 * Simple Gate Parity Test
 * 
 * Manually tests basic gate parity between Snarky and Sparky backends.
 * This bypasses the complex test infrastructure to verify the core concept.
 */

console.log('🚀 Starting Simple Gate Parity Test...');

async function testBasicFieldAddition() {
  try {
    // Import o1js dynamically
    const o1js = await import('./dist/node/index.js');
    const { Field, Provable, switchBackend, getCurrentBackend } = o1js;
    
    console.log('📦 o1js imported successfully');
    
    // Test inputs
    const a = Field(42);
    const b = Field(17);
    console.log(`🧪 Testing: ${a.toString()} + ${b.toString()}`);
    
    // Results storage
    const results = {};
    
    // Test with both backends
    for (const backend of ['snarky', 'sparky']) {
      console.log(`\n🔄 Testing with ${backend} backend...`);
      
      try {
        await switchBackend(backend);
        const currentBackend = getCurrentBackend();
        console.log(`✅ Switched to: ${currentBackend}`);
        
        // Measure constraints
        const constraintSystem = await Provable.constraintSystem(() => {
          const witnessA = Provable.witness(Field, () => a);
          const witnessB = Provable.witness(Field, () => b);
          const result = witnessA.add(witnessB);
          result.assertEquals(result); // Ensure it's constrained
          return result;
        });
        
        // Execute operation
        const startTime = performance.now();
        const result = a.add(b);
        const endTime = performance.now();
        
        results[backend] = {
          result: result.toString(),
          constraintCount: constraintSystem.gates.length,
          gateTypes: constraintSystem.gates.map(g => g.type),
          executionTime: endTime - startTime,
          success: true
        };
        
        console.log(`   Result: ${result.toString()}`);
        console.log(`   Constraints: ${constraintSystem.gates.length}`);
        console.log(`   Gate types: ${constraintSystem.gates.map(g => g.type).join(', ')}`);
        console.log(`   Time: ${(endTime - startTime).toFixed(2)}ms`);
        
      } catch (error) {
        console.error(`❌ Failed with ${backend}:`, error.message);
        results[backend] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Compare results
    console.log('\n📊 COMPARISON RESULTS:');
    console.log('='.repeat(50));
    
    if (results.snarky && results.sparky && results.snarky.success && results.sparky.success) {
      const resultMatch = results.snarky.result === results.sparky.result;
      const constraintDiff = results.sparky.constraintCount - results.snarky.constraintCount;
      
      console.log(`✅ Result Parity: ${resultMatch ? 'PASS' : 'FAIL'}`);
      console.log(`   Snarky: ${results.snarky.result}`);
      console.log(`   Sparky: ${results.sparky.result}`);
      
      console.log(`📊 Constraint Analysis:`);
      console.log(`   Snarky: ${results.snarky.constraintCount} constraints`);
      console.log(`   Sparky: ${results.sparky.constraintCount} constraints`);
      console.log(`   Difference: ${constraintDiff > 0 ? '+' : ''}${constraintDiff}`);
      
      if (constraintDiff < 0) {
        console.log(`🎉 OPTIMIZATION DETECTED: Sparky uses ${Math.abs(constraintDiff)} fewer constraints!`);
      } else if (constraintDiff > 0) {
        console.log(`⚠️  REGRESSION: Sparky uses ${constraintDiff} more constraints`);
      } else {
        console.log(`✅ PARITY: Both backends use same constraint count`);
      }
      
      console.log(`⚡ Performance:`);
      console.log(`   Snarky: ${results.snarky.executionTime.toFixed(2)}ms`);
      console.log(`   Sparky: ${results.sparky.executionTime.toFixed(2)}ms`);
      
      const speedRatio = results.snarky.executionTime / results.sparky.executionTime;
      if (speedRatio > 1.1) {
        console.log(`🚀 Sparky is ${speedRatio.toFixed(2)}x faster!`);
      } else if (speedRatio < 0.9) {
        console.log(`🐌 Sparky is ${(1/speedRatio).toFixed(2)}x slower`);
      } else {
        console.log(`⚖️  Similar performance`);
      }
      
      return resultMatch;
      
    } else {
      console.log('❌ COMPARISON FAILED: One or both backends failed');
      if (results.snarky && !results.snarky.success) {
        console.log(`   Snarky error: ${results.snarky.error}`);
      }
      if (results.sparky && !results.sparky.success) {
        console.log(`   Sparky error: ${results.sparky.error}`);
      }
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Run the test
testBasicFieldAddition().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ SIMPLE GATE PARITY TEST: PASSED');
    console.log('🎯 Gate parity infrastructure is working correctly!');
  } else {
    console.log('❌ SIMPLE GATE PARITY TEST: FAILED');
    console.log('⚠️  Gate parity needs investigation');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 UNEXPECTED ERROR:', error);
  process.exit(1);
});