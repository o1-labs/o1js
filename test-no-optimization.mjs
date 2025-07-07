import { ZkProgram, Field, switchBackend } from './dist/node/index.js';

// Program with public inputs that was failing before
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [],
      async method(x) {
        return { publicOutput: x.add(Field(1)) };
      }
    }
  }
});

async function test(backend, optimizationMode = null) {
  console.log(`\n=== Testing ${backend} ${optimizationMode ? `(${optimizationMode} mode)` : ''} ===`);
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
    
    if (optimizationMode && globalThis.sparkyInstance?.setOptimizationMode) {
      console.log(`🔧 Setting Sparky optimization mode to ${optimizationMode.toUpperCase()}`);
      globalThis.sparkyInstance.setOptimizationMode(optimizationMode);
      console.log('Current mode:', globalThis.sparkyInstance.getOptimizationMode());
    }
  }
  
  try {
    console.log('Analyzing method...');
    const analysis = await TestProgram.analyzeMethods();
    console.log('Constraint analysis:', analysis.add);
    
    console.log('\nCompiling...');
    await TestProgram.compile();
    console.log('✅ Compilation successful');
    
    console.log('\nCreating proof...');
    const result = await TestProgram.add(Field(5));
    console.log('✅ Proof created');
    console.log('Result:', result.proof.publicOutput.toString());
    
    console.log('\nVerifying...');
    const isValid = await TestProgram.verify(result.proof);
    console.log('✅ Verified:', isValid);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing with different optimization modes');
  
  // Test Snarky
  const snarkyOk = await test('snarky');
  
  // Test Sparky with different modes
  await switchBackend('snarky'); // Reset
  const sparkyAggressiveOk = await test('sparky', 'aggressive');
  
  await switchBackend('snarky'); // Reset
  const sparkyCompatibleOk = await test('sparky', 'snarky_compatible');
  
  await switchBackend('snarky'); // Reset  
  const sparkyDebugOk = await test('sparky', 'debug');
  
  console.log('\n=== RESULTS ===');
  console.log('Snarky:                    ', snarkyOk ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky (aggressive):       ', sparkyAggressiveOk ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky (snarky_compatible):', sparkyCompatibleOk ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky (debug):            ', sparkyDebugOk ? '✅ PASS' : '❌ FAIL');
}

main();