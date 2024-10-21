import { expect } from 'expect';
import { Provable } from '../provable/provable.js';
import { Field } from '../provable/wrapped.js';
import { Proof } from './proof.js';
import { Void } from './zkprogram.js';
import test from 'node:test';

test('Proof provable', async () => {
  class MyProof extends Proof<Field, Void> {
    static publicInputType = Field;
    static publicOutputType = Void;
  }

  expect(MyProof.provable.sizeInFields()).toEqual(1);

  let proof = await MyProof.dummy(Field(1n), undefined, 0);

  expect(MyProof.provable.toFields(proof)).toEqual([Field(1n)]);
  expect(MyProof.provable.toAuxiliary(proof)).toEqual([
    [],
    [],
    [proof.proof, 0],
  ]);

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
});
