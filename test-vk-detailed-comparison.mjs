// Detailed VK comparison test
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

async function compareVKsDetailed() {
  console.log('=== Detailed VK Comparison: Snarky vs Sparky ===\n');
  
  try {
    // Compile with Snarky
    console.log('Compiling with Snarky...');
    const snarkyResult = await TestCircuit.compile();
    const snarkyVK = snarkyResult.verificationKey;
    
    // Switch to Sparky
    await switchBackend('sparky');
    console.log('Compiling with Sparky...');
    const sparkyResult = await TestCircuit.compile();
    const sparkyVK = sparkyResult.verificationKey;
    
    // Detailed comparison
    console.log('\n--- VK Structure Comparison ---');
    console.log('Snarky VK keys:', Object.keys(snarkyVK));
    console.log('Sparky VK keys:', Object.keys(sparkyVK));
    
    console.log('\n--- Data Comparison ---');
    console.log('Data length match:', snarkyVK.data.length === sparkyVK.data.length);
    console.log('Snarky data length:', snarkyVK.data.length);
    console.log('Sparky data length:', sparkyVK.data.length);
    
    // Find where they differ
    let firstDiffIndex = -1;
    for (let i = 0; i < Math.min(snarkyVK.data.length, sparkyVK.data.length); i++) {
      if (snarkyVK.data[i] !== sparkyVK.data[i]) {
        firstDiffIndex = i;
        break;
      }
    }
    
    if (firstDiffIndex === -1) {
      console.log('\n✅ VK data is IDENTICAL!');
    } else {
      console.log(`\n❌ VK data differs at index ${firstDiffIndex}`);
      console.log(`Context around difference (index ${firstDiffIndex}):`);
      const start = Math.max(0, firstDiffIndex - 20);
      const end = Math.min(snarkyVK.data.length, firstDiffIndex + 20);
      console.log('Snarky:', snarkyVK.data.substring(start, end));
      console.log('Sparky:', sparkyVK.data.substring(start, end));
    }
    
    // Hash comparison
    console.log('\n--- Hash Comparison ---');
    console.log('Snarky hash:', snarkyVK.hash.toString());
    console.log('Sparky hash:', sparkyVK.hash.toString());
    console.log('Hashes match:', snarkyVK.hash.toString() === sparkyVK.hash.toString());
    
    // Check if this is a hash computation issue
    if (snarkyVK.data === sparkyVK.data && snarkyVK.hash.toString() !== sparkyVK.hash.toString()) {
      console.log('\n⚠️  Data is identical but hashes differ - this suggests a hash computation issue!');
    }
    
    // Switch back
    await switchBackend('snarky');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
}

compareVKsDetailed().catch(console.error);