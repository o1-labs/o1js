import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testPublicInputFix() {
  console.log('\n🧪 Testing Public Input Fix\n');
  
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          const result = a.mul(b).add(publicInput);
          return { publicOutput: result };
        },
      },
    },
  });

  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 Testing with ${backend} backend:`);
    
    await switchBackend(backend);
    console.log(`Switched to ${backend} backend`);
    
    // Get constraint system without compiling
    console.log('\nAnalyzing method to get constraint system...');
    const cs = await SimpleProgram.analyzeMethods();
    const methodCS = cs.compute;
    
    console.log(`  Rows: ${methodCS.rows}`);
    console.log(`  Public input size: ${methodCS.publicInputSize}`);
    console.log(`  Digest: ${methodCS.digest}`);
    
    // Check the constraint system JSON
    console.log('\nRaw JSON:', methodCS.json);
    
    if (methodCS.json && methodCS.json !== 'undefined') {
      const csJSON = JSON.parse(methodCS.json);
      console.log('\nConstraint System JSON:');
      console.log(`  gates: ${csJSON.gates ? csJSON.gates.length : 0}`);
      console.log(`  public_input_size: ${csJSON.public_input_size}`);
      console.log(`  constraints: ${csJSON.constraints ? csJSON.constraints.length : 0}`);
    
      if (backend === 'sparky') {
        console.log('\n🎯 PUBLIC INPUT FIX VERIFICATION:');
        if (csJSON.public_input_size === 1) {
          console.log('  ✅ SUCCESS: Public input size is correctly set to 1!');
        } else {
          console.log(`  ❌ FAILED: Public input size is ${csJSON.public_input_size}, expected 1`);
        }
      }
    }
  }
}

testPublicInputFix().catch(console.error);