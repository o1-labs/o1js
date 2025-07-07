import { ZkProgram, Field, Void, switchBackend } from './dist/node/index.js';

// Minimal program with zero public inputs
const MinimalProgram = ZkProgram({
  name: 'MinimalProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    test: {
      privateInputs: [Field],
      async method(x) {
        // Single constraint: x = 5
        x.assertEquals(Field(5));
      }
    }
  }
});

async function test(backend) {
  console.log(`\n=== Testing ${backend} ===`);
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
    
    // Disable optimizations for debugging
    const sparkyInstance = globalThis.sparkyInstance;
    if (sparkyInstance?.setOptimizationMode) {
      console.log('🔧 Setting Sparky optimization mode to DEBUG (no optimizations)');
      sparkyInstance.setOptimizationMode('debug');
      console.log('Current optimization mode:', sparkyInstance.getOptimizationMode());
    }
  }
  
  try {
    console.log('Compiling...');
    await MinimalProgram.compile();
    console.log('✅ Compilation successful');
    
    console.log('Creating proof with x=5...');
    const result = await MinimalProgram.test(Field(5));
    console.log('✅ Proof created');
    
    console.log('Verifying...');
    const isValid = await MinimalProgram.verify(result.proof);
    console.log('✅ Verified:', isValid);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing minimal program with zero public inputs');
  
  const snarkyOk = await test('snarky');
  const sparkyOk = await test('sparky');
  
  console.log('\n=== RESULTS ===');
  console.log('Snarky:', snarkyOk ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky:', sparkyOk ? '✅ PASS' : '❌ FAIL');
}

main();