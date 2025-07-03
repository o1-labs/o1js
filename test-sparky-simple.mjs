import { Field, Provable, switchBackend } from './dist/node/index.js';

async function countConstraints(circuit) {
  const cs = await Provable.constraintSystem(circuit);
  return cs.gates.length;
}

async function runTest() {
  console.log('Running constraint count comparison...');
  
  // Test with Snarky
  await switchBackend('snarky');
  console.log('Backend: snarky');
  
  const snarkyCount = await countConstraints(() => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.add(y);
    z.assertEquals(Field(7));
  });
  console.log('Snarky constraint count:', snarkyCount);

  // Test with Sparky
  await switchBackend('sparky');
  console.log('Backend: sparky');
  
  const sparkyCount = await countConstraints(() => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.add(y);
    z.assertEquals(Field(7));
  });
  console.log('Sparky constraint count:', sparkyCount);

  console.log('');
  console.log('Summary:');
  console.log('  Snarky:', snarkyCount, 'constraints');
  console.log('  Sparky:', sparkyCount, 'constraints');  
  console.log('  Match:', snarkyCount === sparkyCount ? 'YES ✅' : 'NO ❌');
  
  if (snarkyCount !== sparkyCount) {
    console.log('  Difference:', Math.abs(snarkyCount - sparkyCount), 'constraints');
  }
}

runTest().catch(console.error);