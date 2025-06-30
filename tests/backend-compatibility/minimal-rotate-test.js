import { Field, initializeBindings, switchBackend, ZkProgram, Cache } from '../../dist/node/index.js';
import { Gadgets } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function minimalTest() {
  await initializeBindings();
  
  console.log('=== Testing Snarky vs Sparky ===');
  
  // Test with Snarky first
  console.log('\n1. Testing with Snarky:');
  await switchBackend('snarky');
  
  const MinimalProgram = ZkProgram({
    name: 'minimal-snarky',
    publicInput: undefined,
    methods: {
      test: {
        privateInputs: [],
        async method() {
          const rotated = rotate64(Field(15), 4, 'left');
          rotated.assertEquals(Field(240)); // 15 << 4 = 240
        }
      }
    }
  });
  
  try {
    const snarkyResult = await MinimalProgram.compile({ cache: Cache.None });
    console.log('✅ Snarky compilation succeeded');
  } catch (e) {
    console.error('❌ Snarky compilation failed:', e.message);
  }
  
  // Test with Sparky
  console.log('\n2. Testing with Sparky:');
  await switchBackend('sparky');
  
  const MinimalProgramSparky = ZkProgram({
    name: 'minimal-sparky',
    publicInput: undefined,
    methods: {
      test: {
        privateInputs: [],
        async method() {
          const rotated = rotate64(Field(15), 4, 'left');
          rotated.assertEquals(Field(240)); // 15 << 4 = 240
        }
      }
    }
  });
  
  try {
    const sparkyResult = await MinimalProgramSparky.compile({ cache: Cache.None });
    console.log('✅ Sparky compilation succeeded');
  } catch (e) {
    console.error('❌ Sparky compilation failed:', e.message);
    
    // Check if this is our specific error
    if (e.message.includes('rotate gate failed: undefined')) {
      console.error('🔍 Found the undefined error!');
      console.error('This means the Rust raw_gate is returning an undefined error');
    }
  }
}

minimalTest().catch(console.error);