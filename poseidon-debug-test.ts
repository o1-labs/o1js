/**
 * POSEIDON HASH CORRUPTION ANALYSIS TEST
 * 
 * This test isolates the exact differences between Snarky and Sparky Poseidon implementations
 * to understand the root cause of the hash corruption vulnerability.
 */

import { Field, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugPoseidonDivergence() {
  console.log('🔍 ANALYZING POSEIDON HASH CORRUPTION...\n');
  
  // Test with simple, predictable inputs to isolate the issue
  const testCases = [
    {
      name: 'All zeros',
      inputs: [Field(0), Field(0), Field(0)]
    },
    {
      name: 'Simple sequence',
      inputs: [Field(1), Field(2), Field(3)]
    },
    {
      name: 'All ones',
      inputs: [Field(1), Field(1), Field(1)]
    },
    {
      name: 'Large values',
      inputs: [Field(12345678901234567890n), Field(9876543210987654321n), Field(1111111111111111111n)]
    },
    {
      name: 'Field boundary values',
      inputs: [Field(0), Field(1), Field('28948022309329048855892746252171976963363056481941560715954676764349967630336')] // p-1
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`Input: [${testCase.inputs.map(f => f.toString()).join(', ')}]`);
    
    // Test with Snarky
    await switchBackend('snarky');
    console.log(`Backend: ${getCurrentBackend()}`);
    const snarkyHash = Poseidon.hash(testCase.inputs);
    console.log(`Snarky hash: ${snarkyHash.toString()}`);
    
    // Test with Sparky
    await switchBackend('sparky');
    console.log(`Backend: ${getCurrentBackend()}`);
    const sparkyHash = Poseidon.hash(testCase.inputs);
    console.log(`Sparky hash: ${sparkyHash.toString()}`);
    
    // Compare
    const match = snarkyHash.toString() === sparkyHash.toString();
    console.log(`Match: ${match ? '✅' : '❌'}`);
    
    if (!match) {
      console.log('💥 HASH DIVERGENCE DETECTED!');
      console.log(`Difference detected in: ${testCase.name}`);
      
      // Convert to BigInt for detailed analysis
      const snarkyBigInt = snarkyHash.toBigInt();
      const sparkyBigInt = sparkyHash.toBigInt();
      console.log(`Snarky (BigInt): ${snarkyBigInt}`);
      console.log(`Sparky (BigInt): ${sparkyBigInt}`);
      console.log(`XOR difference: ${(snarkyBigInt ^ sparkyBigInt).toString(2)}`);
    }
  }
  
  // Test individual Poseidon operations
  console.log('\n🔬 TESTING INDIVIDUAL POSEIDON OPERATIONS...\n');
  
  // Test initial state
  console.log('Testing initial state:');
  const testInput = [Field(42)];
  
  // Snarky
  await switchBackend('snarky');
  const snarkyInitialState = Poseidon.initialState();
  const snarkyUpdate = Poseidon.update(snarkyInitialState, testInput);
  console.log(`Snarky initial state: [${snarkyInitialState.map(f => f.toString()).join(', ')}]`);
  console.log(`Snarky update result: [${snarkyUpdate.map(f => f.toString()).join(', ')}]`);
  
  // Sparky
  await switchBackend('sparky');
  const sparkyInitialState = Poseidon.initialState();
  const sparkyUpdate = Poseidon.update(sparkyInitialState, testInput);
  console.log(`Sparky initial state: [${sparkyInitialState.map(f => f.toString()).join(', ')}]`);
  console.log(`Sparky update result: [${sparkyUpdate.map(f => f.toString()).join(', ')}]`);
  
  // Compare states
  const initialStateMatch = snarkyInitialState.every((f, i) => f.toString() === sparkyInitialState[i].toString());
  const updateMatch = snarkyUpdate.every((f, i) => f.toString() === sparkyUpdate[i].toString());
  
  console.log(`Initial state match: ${initialStateMatch ? '✅' : '❌'}`);
  console.log(`Update result match: ${updateMatch ? '✅' : '❌'}`);
  
  if (!updateMatch) {
    console.log('💥 POSEIDON UPDATE DIVERGENCE DETECTED!');
    for (let i = 0; i < 3; i++) {
      if (snarkyUpdate[i].toString() !== sparkyUpdate[i].toString()) {
        console.log(`State element ${i} differs:`);
        console.log(`  Snarky: ${snarkyUpdate[i].toString()}`);
        console.log(`  Sparky: ${sparkyUpdate[i].toString()}`);
      }
    }
  }
}

// Run the analysis
debugPoseidonDivergence()
  .then(() => console.log('\n🏁 Analysis complete.'))
  .catch(error => console.error('❌ Analysis failed:', error));