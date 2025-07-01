// VK comparison test - ES module version
import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Simple test circuit
const TestCircuit = ZkProgram({
  name: 'TestCircuit',
  publicInput: Field,
  
  methods: {
    test: {
      privateInputs: [Field],
      
      async method(publicInput, privateInput) {
        const result = privateInput.mul(2);
        result.assertEquals(publicInput);
      }
    }
  }
});

async function compareVKs() {
  console.log('=== VK Comparison: Snarky vs Sparky ===\n');
  
  try {
    // Compile with Snarky
    console.log('Compiling with Snarky...');
    console.log('Current backend:', getCurrentBackend());
    const snarkyResult = await TestCircuit.compile();
    console.log('Snarky VK hash:', snarkyResult.verificationKey.hash);
    console.log('Snarky VK data length:', snarkyResult.verificationKey.data.length);
    
    // Switch to Sparky
    console.log('\nSwitching to Sparky...');
    await switchBackend('sparky');
    console.log('Current backend:', getCurrentBackend());
    
    console.log('Compiling with Sparky...');
    const sparkyResult = await TestCircuit.compile();
    console.log('Sparky VK hash:', sparkyResult.verificationKey.hash);
    console.log('Sparky VK data length:', sparkyResult.verificationKey.data.length);
    
    // Compare
    console.log('\n--- Results ---');
    if (snarkyResult.verificationKey.hash === sparkyResult.verificationKey.hash) {
      console.log('✅ VKs MATCH! Perfect parity achieved!');
    } else {
      console.log('❌ VKs DO NOT MATCH');
      console.log('\nDifferences:');
      console.log('- Hash mismatch');
      console.log('- Snarky data length:', snarkyResult.verificationKey.data.length);
      console.log('- Sparky data length:', sparkyResult.verificationKey.data.length);
      
      // Show first few characters for debugging
      console.log('\nFirst 100 chars of Snarky VK:', snarkyResult.verificationKey.data.substring(0, 100));
      console.log('First 100 chars of Sparky VK:', sparkyResult.verificationKey.data.substring(0, 100));
    }
    
    // Switch back
    await switchBackend('snarky');
    console.log('\nSwitched back to:', getCurrentBackend());
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
}

compareVKs().catch(console.error);