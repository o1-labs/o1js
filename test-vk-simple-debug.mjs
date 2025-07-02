import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('=== VK SIMPLE DEBUG TEST ===');

// Ultra-simple program
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(x); // Simple assertion
      }
    }
  }
});

async function debugTest() {
  try {
    console.log('Testing Snarky compilation...');
    await switchBackend('snarky');
    console.log('Backend:', getCurrentBackend());
    
    const { verificationKey } = await TestProgram.compile();
    console.log('✅ Snarky compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
  } catch (error) {
    console.error('❌ Snarky failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  try {
    console.log('\nTesting Sparky compilation...');
    await switchBackend('sparky');
    console.log('Backend:', getCurrentBackend());
    
    const { verificationKey } = await TestProgram.compile();
    console.log('✅ Sparky compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
  } catch (error) {
    console.error('❌ Sparky failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTest().catch(console.error);