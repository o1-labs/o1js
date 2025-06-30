import { switchBackend, getCurrentBackend, initializeBindings, Field, Poseidon, ZkProgram, Provable } from './dist/node/index.js';

async function testPoseidonInZkProgram(backendName) {
  console.log(`\n=== Testing ${backendName} backend ===`);
  
  await switchBackend(backendName);
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Define a simple program that uses Poseidon
  const TestProgram = ZkProgram({
    name: `TestProgram_${backendName}`,
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      testPoseidon: {
        privateInputs: [Field],
        method(publicInput, privateInput) {
          // Use Poseidon hash with the inputs
          console.log(`[DEBUG] About to call Poseidon.hash with:`);
          console.log(`  publicInput:`, publicInput);
          console.log(`  privateInput:`, privateInput);
          
          const hash = Poseidon.hash([publicInput, privateInput]);
          console.log(`[DEBUG] Hash result:`, hash);
          
          return { publicOutput: hash };
        }
      }
    }
  });
  
  console.log('\nCompiling program...');
  
  try {
    // First, let's test constraint system generation
    console.log('Analyzing method...');
    const analysis = await TestProgram.analyzeSingleMethod('testPoseidon');
    console.log(`  Gates: ${analysis.gates}`);
    console.log(`  Rows: ${analysis.rows}`);
    console.log(`  Digest: ${analysis.digest.slice(0, 16)}...`);
    
    return {
      backend: backendName,
      gates: analysis.gates,
      rows: analysis.rows,
      digest: analysis.digest
    };
    
  } catch (error) {
    console.error(`✗ Error with ${backendName} backend:`, error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

async function main() {
  try {
    console.log('=== Sparky vs Snarky ZkProgram Poseidon Test ===');
    console.log('Testing Poseidon inside ZkProgram constraint generation...\n');
    
    // Initialize bindings first
    await initializeBindings();
    
    // Test both backends
    const results = [];
    
    try {
      const snarkyResult = await testPoseidonInZkProgram('snarky');
      results.push(snarkyResult);
    } catch (error) {
      console.error('Snarky backend failed:', error.message);
    }
    
    try {
      const sparkyResult = await testPoseidonInZkProgram('sparky');
      results.push(sparkyResult);
    } catch (error) {
      console.error('Sparky backend failed:', error.message);
    }
    
    // Display comparison
    if (results.length === 2) {
      console.log('\n=== Results Comparison ===');
      console.log(`Snarky gates: ${results[0].gates}, rows: ${results[0].rows}`);
      console.log(`Sparky gates: ${results[1].gates}, rows: ${results[1].rows}`);
      console.log(`Digests match: ${results[0].digest === results[1].digest ? '✓ YES' : '✗ NO'}`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);