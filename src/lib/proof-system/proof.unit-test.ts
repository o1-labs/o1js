import { expect } from 'expect';
import { Provable } from '../provable/provable.js';
import { Field } from '../provable/wrapped.js';
import { Proof } from './proof.js';
import { Void } from './zkprogram.js';

class MyProof extends Proof<Field, Void> {
  static publicInputType = Field;
  static publicOutputType = Void;
}

async function circuit() {
  let publicInput = Provable.witness(Field, () => 5n);

  let proof = await Provable.witnessAsync(MyProof, () => {
    return MyProof.dummy(publicInput, undefined, 0);
  });

  expect(proof).toBeInstanceOf(MyProof);
  expect(proof.publicOutput).toBeUndefined();
  expect(proof.maxProofsVerified).toEqual(0);

  Provable.asProver(() => {
    expect(proof.publicInput.toBigInt()).toEqual(5n);

    let value = MyProof.provable.toValue(proof);
    expect(value.publicInput).toEqual(5n);
    expect(value.proof).toBe(proof.proof);
  });
}

await Provable.runAndCheck(circuit);
