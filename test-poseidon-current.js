import { Field, Poseidon, Provable, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testPoseidonConstraints() {
  // Initialize bindings
  await initializeBindings();
  
  console.log('Testing Poseidon constraint generation...\n');
  
  // First test the specific case that was failing
  console.log('=== TESTING PREPROCESSED VALUES ===');
  
  // Test on Snarky
  await switchBackend('snarky');
  console.log('\n--- Snarky Backend ---');
  try {
    const field1 = Field(123);
    const field2 = Field(456);
    const preprocessed = field1.add(1);
    console.log('field1:', field1.toString());
    console.log('field2:', field2.toString());
    console.log('preprocessed (field1 + 1):', preprocessed.toString());
    
    const hash1 = Poseidon.hash([field1, field2]);
    console.log('Poseidon.hash([field1, field2]):', hash1.toString());
    
    // This is the test case that was failing
    const hash2 = Poseidon.hash([preprocessed, field2]);
    console.log('Poseidon.hash([preprocessed, field2]):', hash2.toString());
    
    console.log('✅ Snarky Poseidon with preprocessed values passed');
  } catch (error) {
    console.log('❌ Snarky Poseidon with preprocessed values failed:', error.message);
  }
  
  // Test on Sparky
  await switchBackend('sparky');
  console.log('\n--- Sparky Backend ---');
  try {
    const field1 = Field(123);
    const field2 = Field(456);
    const preprocessed = field1.add(1);
    console.log('field1:', field1.toString());
    console.log('field2:', field2.toString());
    console.log('preprocessed (field1 + 1):', preprocessed.toString());
    
    const hash1 = Poseidon.hash([field1, field2]);
    console.log('Poseidon.hash([field1, field2]):', hash1.toString());
    
    // This is the test case that was failing
    const hash2 = Poseidon.hash([preprocessed, field2]);
    console.log('Poseidon.hash([preprocessed, field2]):', hash2.toString());
    
    console.log('✅ Sparky Poseidon with preprocessed values passed');
  } catch (error) {
    console.log('❌ Sparky Poseidon with preprocessed values failed:', error.message);
  }
  
  console.log('\n=== CONSTRAINT GENERATION TESTS ===\n');
  
  // Test with Snarky backend
  console.log('=== SNARKY BACKEND ===');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const snarkyConstraints = await Provable.constraintSystem(() => {
      let x = Provable.witness(Field, () => Field(1));
      let y = Provable.witness(Field, () => Field(2));
      let z = Poseidon.hash([x, y]);
      z.assertEquals(z); // Force constraint generation
    });
    
    console.log('Total constraints:', snarkyConstraints.gates.length);
    console.log('Gate types:');
    const snarkyGateTypes = {};
    snarkyConstraints.gates.forEach(gate => {
      snarkyGateTypes[gate.type] = (snarkyGateTypes[gate.type] || 0) + 1;
    });
    console.log(snarkyGateTypes);
    
    // Also test Poseidon.update
    const updateConstraints = await Provable.constraintSystem(() => {
      let state = [
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0))
      ];
      let input = [
        Provable.witness(Field, () => Field(1)),
        Provable.witness(Field, () => Field(2))
      ];
      let newState = Poseidon.update(state, input);
      newState[0].assertEquals(newState[0]); // Force constraint generation
    });
    
    console.log('\nPoseidon.update constraints:', updateConstraints.gates.length);
    const updateGateTypes = {};
    updateConstraints.gates.forEach(gate => {
      updateGateTypes[gate.type] = (updateGateTypes[gate.type] || 0) + 1;
    });
    console.log('Update gate types:', updateGateTypes);
    
  } catch (e) {
    console.error('Snarky error:', e.message);
  }
  
  // Test with Sparky backend
  console.log('\n=== SPARKY BACKEND ===');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const sparkyConstraints = await Provable.constraintSystem(() => {
      let x = Provable.witness(Field, () => Field(1));
      let y = Provable.witness(Field, () => Field(2));
      let z = Poseidon.hash([x, y]);
      z.assertEquals(z); // Force constraint generation
    });
    
    console.log('Total constraints:', sparkyConstraints.gates.length);
    console.log('Gate types:');
    const sparkyGateTypes = {};
    sparkyConstraints.gates.forEach(gate => {
      sparkyGateTypes[gate.type] = (sparkyGateTypes[gate.type] || 0) + 1;
    });
    console.log(sparkyGateTypes);
    
    // Also test Poseidon.update
    const updateConstraints = await Provable.constraintSystem(() => {
      let state = [
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0))
      ];
      let input = [
        Provable.witness(Field, () => Field(1)),
        Provable.witness(Field, () => Field(2))
      ];
      let newState = Poseidon.update(state, input);
      newState[0].assertEquals(newState[0]); // Force constraint generation
    });
    
    console.log('\nPoseidon.update constraints:', updateConstraints.gates.length);
    const updateGateTypes = {};
    updateConstraints.gates.forEach(gate => {
      updateGateTypes[gate.type] = (updateGateTypes[gate.type] || 0) + 1;
    });
    console.log('Update gate types:', updateGateTypes);
    
  } catch (e) {
    console.error('Sparky error:', e.message);
  }
}

testPoseidonConstraints().catch(console.error);