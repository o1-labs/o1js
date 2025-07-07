import { ZkProgram, Field, switchBackend } from './dist/node/index.js';

// Test program that was failing before
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    simpleAdd: {
      privateInputs: [],
      async method(x) {
        const result = x.add(Field(1));
        return { publicOutput: result };
      }
    },
    multipleOps: {
      privateInputs: [Field],
      async method(x, y) {
        const a = x.add(y);
        const b = a.mul(Field(2));
        const c = b.sub(Field(3));
        return { publicOutput: c };
      }
    }
  }
});

async function test(backend) {
  console.log(`\n=== Testing ${backend} ===`);
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
    
    // Check the default optimization mode
    if (globalThis.sparkyInstance?.getOptimizationMode) {
      console.log('Current optimization mode:', globalThis.sparkyInstance.getOptimizationMode());
    }
  }
  
  try {
    console.log('\nAnalyzing methods...');
    const analysis = await TestProgram.analyzeMethods();
    console.log('simpleAdd constraints:', analysis.simpleAdd.rows);
    console.log('multipleOps constraints:', analysis.multipleOps.rows);
    
    console.log('\nCompiling...');
    await TestProgram.compile();
    console.log('✅ Compilation successful');
    
    console.log('\nTesting simpleAdd(5)...');
    const result1 = await TestProgram.simpleAdd(Field(5));
    console.log('Result:', result1.proof.publicOutput.toString());
    
    console.log('\nTesting multipleOps(10, 20)...');
    const result2 = await TestProgram.multipleOps(Field(10), Field(20));
    console.log('Result:', result2.proof.publicOutput.toString());
    
    console.log('\n✅ All tests passed');
    return true;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return false;
  }
}

async function main() {
  console.log('Testing with Debug mode as default');
  
  // Test Snarky
  const snarkyOk = await test('snarky');
  
  // Test Sparky (should use Debug mode by default now)
  await switchBackend('snarky');
  const sparkyOk = await test('sparky');
  
  console.log('\n=== RESULTS ===');
  console.log('Snarky:', snarkyOk ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky:', sparkyOk ? '✅ PASS' : '❌ FAIL');
}

main();