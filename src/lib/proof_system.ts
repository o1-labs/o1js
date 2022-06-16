import { Bool, AsFieldElements, Pickles } from '../snarky';

export { Proof, CompiledTag };

class Proof<T> {
  static publicInputType: AsFieldElements<any> = undefined as any;
  static tag: () => { name: string } = () => {
    throw Error(
      `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput> { ... }`
    );
  };
  publicInput: T;
  proof: RawProof;
  shouldVerify = Bool.false;

  verify() {
    this.shouldVerify = Bool.true;
  }
  verifyIf(condition: Bool) {
    this.shouldVerify = condition;
  }
  toString() {
    return Pickles.proofToString(this.proof);
  }

  constructor({ proof, publicInput }: { proof: RawProof; publicInput: T }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO optionally convert from string?
  }
}
type RawProof = unknown;
type CompiledTag = unknown;

let compiledTags = new WeakMap<any, CompiledTag>();
let CompiledTag = {
  get(tag: any): CompiledTag | undefined {
    return compiledTags.get(tag);
  },
  store(tag: any, compiledTag: CompiledTag) {
    compiledTags.set(tag, compiledTag);
  },
};
