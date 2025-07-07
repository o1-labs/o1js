import { Field, ZkProgram, Void, switchBackend } from './dist/node/index.js';

// Test the exact cases from FIX.md

// Zero constraint test
const EmptyProgram = ZkProgram({
  name: 'EmptyProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // No constraints
      }
    }
  }
});

// One constraint test
const OneConstraintProgram = ZkProgram({
  name: 'OneConstraintProgram', 
  publicInput: Field,
  publicOutput: Void,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(Field(0));
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n=== Testing ${backend} ===`);
  await switchBackend(backend);
  
  // Test 1: Empty program
  console.log('\nTest 1: Zero constraint program');
  try {
    await EmptyProgram.compile();
    const proof = await EmptyProgram.empty();
    console.log('✅ Success');
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
  
  // Test 2: One constraint program
  console.log('\nTest 2: One constraint program');
  try {
    await OneConstraintProgram.compile();
    const proof = await OneConstraintProgram.test(Field(0));
    console.log('✅ Success');
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

async function main() {
  console.log('Testing FIX.md cases...');
  
  await testBackend('snarky');
  await testBackend('sparky');
  
  console.log('\n=== Summary ===');
  console.log('Original issues from FIX.md:');
  console.log('- Zero constraint: "Cannot read properties of undefined (reading \'2\')"');
  console.log('- One constraint: "Cannot read properties of undefined (reading \'toConstant\')"');
}

main().catch(console.error);