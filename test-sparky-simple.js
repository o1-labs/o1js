import { switchBackend, getCurrentBackend, initializeBindings, Field, Poseidon } from './dist/node/index.js';

async function testPoseidonHash(backendName) {
  console.log(`\n=== Testing ${backendName} backend ===`);
  
  await switchBackend(backendName);
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  console.log('\nTesting Poseidon hash...');
  
  try {
    // Test with constant values
    const input1 = Field(123);
    const input2 = Field(456);
    
    console.log(`  Input 1: ${input1.toString()}`);
    console.log(`  Input 2: ${input2.toString()}`);
    
    const startHash = Date.now();
    const hash = Poseidon.hash([input1, input2]);
    const hashTime = Date.now() - startHash;
    
    console.log(`✓ Hash computed in ${hashTime}ms`);
    console.log(`  Result: ${hash.toString().slice(0, 20)}...`);
    
    // Test Poseidon.update directly
    console.log('\nTesting Poseidon.update...');
    const state = Poseidon.initialState();
    console.log(`  Initial state: [${state.map(f => f.toString().slice(0, 10)).join(', ')}]`);
    
    const startUpdate = Date.now();
    const newState = Poseidon.update(state, [input1, input2]);
    const updateTime = Date.now() - startUpdate;
    
    console.log(`✓ Update completed in ${updateTime}ms`);
    console.log(`  New state: [${newState.map(f => f.toString().slice(0, 10)).join(', ')}]`);
    
    return {
      backend: backendName,
      hashTime,
      updateTime,
      hash: hash.toString(),
      totalTime: hashTime + updateTime
    };
    
  } catch (error) {
    console.error(`✗ Error with ${backendName} backend:`, error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

async function main() {
  try {
    console.log('=== Sparky vs Snarky Poseidon Test ===');
    console.log('Testing basic Poseidon hash operations...\n');
    
    // Initialize bindings first
    await initializeBindings();
    
    // Test both backends
    const results = [];
    
    try {
      const snarkyResult = await testPoseidonHash('snarky');
      results.push(snarkyResult);
    } catch (error) {
      console.error('Snarky backend failed:', error.message);
    }
    
    try {
      const sparkyResult = await testPoseidonHash('sparky');
      results.push(sparkyResult);
    } catch (error) {
      console.error('Sparky backend failed:', error.message);
    }
    
    // Display comparison
    if (results.length === 2) {
      console.log('\n=== Results Comparison ===');
      console.log(`Snarky hash: ${results[0].hash.slice(0, 20)}...`);
      console.log(`Sparky hash: ${results[1].hash.slice(0, 20)}...`);
      console.log(`Hashes match: ${results[0].hash === results[1].hash ? '✓ YES' : '✗ NO'}`);
      
      console.log('\n=== Performance Comparison ===');
      console.log('┌─────────────┬──────────────┬──────────────┐');
      console.log('│ Operation   │ Snarky       │ Sparky       │');
      console.log('├─────────────┼──────────────┼──────────────┤');
      console.log(`│ Hash        │ ${results[0].hashTime.toString().padEnd(10)}ms │ ${results[1].hashTime.toString().padEnd(10)}ms │`);
      console.log(`│ Update      │ ${results[0].updateTime.toString().padEnd(10)}ms │ ${results[1].updateTime.toString().padEnd(10)}ms │`);
      console.log(`│ Total       │ ${results[0].totalTime.toString().padEnd(10)}ms │ ${results[1].totalTime.toString().padEnd(10)}ms │`);
      console.log('└─────────────┴──────────────┴──────────────┘');
      
      const speedup = ((results[0].totalTime - results[1].totalTime) / results[0].totalTime * 100).toFixed(1);
      if (speedup > 0) {
        console.log(`\nSparky is ${speedup}% faster than Snarky`);
      } else {
        console.log(`\nSnarky is ${Math.abs(speedup)}% faster than Sparky`);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);