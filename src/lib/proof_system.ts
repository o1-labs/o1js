import { Bool, AsFieldElements } from '../snarky';

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

type Circuit<PublicInput, Args extends readonly [any, ...any[]]> = {
  privateInput: {
    [K in keyof Args]: AsFieldElements<Args[K]>;
  };
  circuit(publicInput: PublicInput, ...args: Args): void;
};

type Prover<PublicInput, Args extends readonly [any, ...any[]]> = (
  publicInput: PublicInput,
  ...args: Args
) => Promise<Proof<PublicInput>>;

// TODO: this only works for Field / Bool / UInt32 / UInt64 / Int64 because they have a custom `check` method
// doesn't work for general CircuitValue
// we need a robust method for infering the type from a CircuitValue subclass!
type InferAsFields<T extends AsFieldElements<any>> = T['check'] extends (
  x: infer U
) => void
  ? U
  : never;

function MultiCircuit<
  PublicInput extends AsFieldElements<any>,
  Types extends {
    [I in string]: readonly [any, ...any[]];
  }
>(c: {
  publicInput: PublicInput;
  circuits: {
    [I in keyof Types]: Circuit<InferAsFields<PublicInput>, Types[I]>;
  };
}): {
  [I in keyof Types]: Prover<InferAsFields<PublicInput>, Types[I]>;
} {
  return c as never;
}

/* let myCircuit = MultiCircuit({
  publicInput: UInt32,
  circuits: {
    someCircuit: {
      privateInput: [Bool],
      circuit(publicInput: UInt32, b: Bool) {
        publicInput.add(9).equals(UInt32.from(10)).and(b).assertTrue();
      },
    },
  },
});

let p: Proof<UInt32> = await myCircuit.someCircuit(UInt32.one, Bool.true);
p.verify();
p.publicInput; */
