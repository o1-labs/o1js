import { Pickles, Bool, Field, AsFieldElements } from '../snarky';
import { UInt32, UInt64 } from './int';

export { Proof };

class Proof<T> {
  publicInputType: AsFieldElements<T> = undefined as any;
  publicInput: T;
  shouldVerify = Bool.false;
  private proof: RawProof | undefined;

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
    publicInput,
    proof,
    publicInputType,
  }: {
    publicInput: T;
    proof?: string;
    publicInputType?: AsFieldElements<T>;
  }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO convert from string
    if (publicInputType !== undefined) this.publicInputType = publicInputType;
  }
}
type RawProof = unknown;
