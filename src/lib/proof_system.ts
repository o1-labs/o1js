import { Bool, AsFieldElements } from '../snarky';

export { Proof };

class Proof<T> {
  static publicInputType: AsFieldElements<any> = undefined as any;
  static tag: () => any = () => undefined;
  publicInput: T;
  proof: RawProof;
  shouldVerify = Bool.false;

  verify() {
    this.shouldVerify = Bool.true;
  }
  verifyIf(condition: Bool) {
    this.shouldVerify = condition;
  }

  constructor({ proof, publicInput }: { proof: RawProof; publicInput: T }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO optionally convert from string?
  }
}
type RawProof = unknown;
