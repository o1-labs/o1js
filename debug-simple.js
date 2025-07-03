import { Field, Provable, switchBackend } from './dist/node/index.js';

async function debugSimpleEquality() {
  console.log('\n=== Debugging Simple Equality ===\n');

  // Test just witness creation
  console.log('Test: Simple witness creation');
  await switchBackend('sparky');
  const sparkyWitness = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    // Don't do anything with x, just create it
  });
  console.log(`Creating witness: ${sparkyWitness.gates.length} constraints\n`);

  // Test direct field creation
  console.log('Test: Direct field creation');
  const sparkyDirect = await Provable.constraintSystem(() => {
    const x = Field(5);
    const y = Field(5);
    // Don't assert anything, just create them
  });
  console.log(`Creating constants: ${sparkyDirect.gates.length} constraints\n`);

  // Test one witness equals another witness
  console.log('Test: Two witnesses of same value');
  const sparkyTwoWitnesses = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    // Don't assert anything yet
  });
  console.log(`Two witnesses: ${sparkyTwoWitnesses.gates.length} constraints\n`);

  // Test witness equals constant
  console.log('Test: Witness equals constant');
  const sparkyWitnessConstant = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const five = Field(5);
    x.assertEquals(five);
  });
  console.log(`Witness equals constant: ${sparkyWitnessConstant.gates.length} constraints\n`);

  // Test two witnesses equal
  console.log('Test: Two witnesses equal');
  const sparkyTwoEqual = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Two witnesses equal: ${sparkyTwoEqual.gates.length} constraints\n`);

  // Compare with Snarky
  await switchBackend('snarky');
  const snarkyTwoEqual = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Snarky two witnesses equal: ${snarkyTwoEqual.gates.length} constraints\n`);

  console.log('=== Analysis ===');
  console.log('If Sparky generates more constraints than Snarky for simple equality,');
  console.log('the union-find optimization is not working correctly.');
}

debugSimpleEquality().catch(console.error);