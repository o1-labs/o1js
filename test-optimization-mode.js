// Test script to verify o1js Sparky optimization mode
import { switchBackend, getCurrentBackend, Field, Provable } from './dist/node/index.js';

async function testOptimizationMode() {
  console.log('🔧 Testing o1js Sparky Optimization Mode');
  
  // Switch to Sparky backend
  console.log('Switching to Sparky backend...');
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Check if we can access the optimization mode functions
  let currentMode = 'unknown';
  try {
    // Access the WASM module directly through global state
    const sparkyModule = globalThis.__snarky?.Snarky?.constructor?.getOptimizationMode;
    
    if (sparkyModule) {
      console.log('✅ Found getOptimizationMode function');
      currentMode = sparkyModule();
      console.log(`🎯 Current optimization mode: ${currentMode}`);
    } else {
      console.log('❌ Could not access getOptimizationMode function');
      
      // Try alternative access through module loading
      const { initializeSparky } = await import('./src/bindings/sparky-adapter.js');
      console.log('Checking sparky-adapter access...');
    }
  } catch (error) {
    console.log(`❌ Error accessing optimization mode: ${error.message}`);
  }
  
  // Test circuit compilation to see if aggressive optimization is working
  console.log('\n🧪 Testing multiplication constraint optimization:');
  
  const testMultiplicationOptimization = () => {
    const a = Provable.witness(Field, () => Field(3));
    const b = Provable.witness(Field, () => Field(4));
    
    // This should optimize to 1 constraint if aggressive mode is active
    a.mul(b).assertEquals(Field(12));
  };
  
  // Compile with Sparky to see constraint count
  const sparkyResult = await Provable.constraintSystem(testMultiplicationOptimization);
  const sparkyConstraints = sparkyResult.constraints || sparkyResult.gates || [];
  console.log(`Sparky constraint count: ${sparkyConstraints.length}`);
  console.log(`Sparky result:`, sparkyResult);
  
  // Switch to Snarky for comparison
  console.log('\nSwitching to Snarky for comparison...');
  await switchBackend('snarky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  const snarkyResult = await Provable.constraintSystem(testMultiplicationOptimization);
  const snarkyConstraints = snarkyResult.constraints || snarkyResult.gates || [];
  console.log(`Snarky constraint count: ${snarkyConstraints.length}`);
  console.log(`Snarky result:`, snarkyResult);
  
  // Analysis
  console.log('\n📊 Analysis:');
  console.log(`Sparky optimization mode: ${currentMode}`);
  console.log(`Constraint count comparison: Sparky=${sparkyConstraints.length}, Snarky=${snarkyConstraints.length}`);
  
  if (sparkyConstraints.length === snarkyConstraints.length) {
    console.log('✅ SUCCESS: Both backends generate same number of constraints');
    console.log('✅ Sparky multiplication optimization is working correctly');
  } else if (sparkyConstraints.length < snarkyConstraints.length) {
    console.log('🚀 Sparky is MORE optimized than Snarky (this could be expected with aggressive mode)');
  } else {
    console.log('❌ WARNING: Sparky generated MORE constraints than Snarky');
    console.log('This suggests optimization might not be working optimally');
  }
  
  console.log('\n🎯 Recommendation:');
  if (currentMode === 'aggressive') {
    console.log('✅ o1js is correctly using aggressive optimization mode by default');
  } else if (currentMode === 'snarky_compatible') {
    console.log('⚠️  o1js is using snarky_compatible mode - this preserves VK parity but may not apply all optimizations');
  } else if (currentMode === 'debug') {
    console.log('❌ o1js is using debug mode - no optimizations are applied!');
  } else {
    console.log('❓ Could not determine optimization mode - check WASM module access');
  }
}

testOptimizationMode().catch(console.error);