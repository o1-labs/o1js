import { Bool, AsFieldElements } from '../snarky';

export { Proof };

class Proof<T> {
  publicInputType: AsFieldElements<T> = undefined as any;
  publicInput: T;
  proof: RawProof;
  shouldVerify = Bool.false;

  verify() {
    this.shouldVerify = Bool.true;
  }
  verifyIf(condition: Bool) {
    this.shouldVerify = condition;
  }

  toString(): string {
    throw 'todo';
  }

  constructor({
    proof,
    publicInput,
    publicInputType,
  }: {
    proof: RawProof;
    publicInput: T;
    publicInputType?: AsFieldElements<T>;
  }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO optionally convert from string?
    if (publicInputType !== undefined) this.publicInputType = publicInputType;
  }
}
type RawProof = unknown;
