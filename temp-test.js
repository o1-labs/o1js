
import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  await switchBackend('sparky');
  
  const circuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  const cs = await Provable.constraintSystem(circuit);
  console.log('Gates:', cs.gates.length);
  console.log('First gate coeffs:', cs.gates[0].coeffs);
}

test().catch(console.error);
