// Simple VK comparison test that works with the current build
const o1js = require('./dist/node/index.js');
const { Field, ZkProgram } = o1js;

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
    const snarkyResult = await TestCircuit.compile();
    console.log('Snarky VK hash:', snarkyResult.verificationKey.hash);
    
    // Try Sparky if available
    if (o1js.switchBackend) {
      console.log('\nSwitching to Sparky...');
      await o1js.switchBackend('sparky');
      
      console.log('Compiling with Sparky...');
      const sparkyResult = await TestCircuit.compile();
      console.log('Sparky VK hash:', sparkyResult.verificationKey.hash);
      
      // Compare
      if (snarkyResult.verificationKey.hash === sparkyResult.verificationKey.hash) {
        console.log('\n✅ VKs MATCH!');
      } else {
        console.log('\n❌ VKs DO NOT MATCH');
        console.log('Snarky VK length:', snarkyResult.verificationKey.data.length);
        console.log('Sparky VK length:', sparkyResult.verificationKey.data.length);
      }
      
      // Switch back
      await o1js.switchBackend('snarky');
    } else {
      console.log('\nBackend switching not available');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

compareVKs().catch(console.error);