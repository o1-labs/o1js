import { Bool, Field, AsFieldElements, Pickles } from '../snarky';

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
  static dummy<T>(): Proof<T> {
    let publicInput = this.publicInputType.ofFields(
      Array(this.publicInputType.sizeInFields()).fill(Field.zero)
    );
    let proof = ''; // TODO
    return new this({ publicInput, proof });
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

type AnyTuple = readonly [any, ...any[]] | readonly [];

// TODO: inference of AsFieldElements shouldn't just use InstanceType
// but the alternatives will be messier (see commented code below for some ideas)
type InferInstance<T> = T extends new (...args: any) => any
  ? InstanceType<T>
  : never;
type TupleToInstances<T> = {
  [I in keyof T]: InferInstance<T[I]>;
};

/* type TupleToInstances_<T> =
  {[I in keyof T]: T[I] extends AsFieldElements<any> ? InferAsFields<T[I]> : T[I] extends typeof Proof<infer W> ? Proof<W> : T[I]}
this is a workaround for TS bug https://github.com/microsoft/TypeScript/issues/29919
type TupleToInstances<
  A extends AnyTuple,
  T extends (...args: A) => any
> = T extends (...args: infer P) => any ? TupleToInstances_<P> : never;
if the bug is resolved, this should just be TupleToInstances_<P>

// TODO: this only works for Field / Bool / UInt32 / UInt64 / Int64 because they have a custom `check` method
// doesn't work for general CircuitValue
// we need a robust method for infering the type from a CircuitValue subclass!
type InferInstance<T extends AsFieldElements<any>> = T['check'] extends (
  x: infer U
) => void
  ? U
  : never;
*/

function Program<
  PublicInput extends AsFieldElements<any>,
  Types extends {
    // TODO: how to prevent a method called `compile` from type-checking?
    [I in string]: AnyTuple;
  }
>(c: {
  publicInput: PublicInput;
  methods: {
    [I in keyof Types]: Circuit<InferInstance<PublicInput>, Types[I]>;
  };
}): {
  name: string;
  compile(): Promise<void>;
} & {
  [I in keyof Types]: Prover<InferInstance<PublicInput>, Types[I]>;
} {
  return c as never;
}

type Circuit<PublicInput, Args extends AnyTuple> = {
  privateInput: Args;
  // GetProofOrAsFieldElements<Args>
  // {
  //   [K in keyof Args]: Args[K] extends Proof<infer U> ? (typeof Proof<U>) : AsFieldElements<Args[K]>;
  // };
  method(publicInput: PublicInput, ...args: TupleToInstances<Args>): void;
};

type Prover<PublicInput, Args extends AnyTuple> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<Proof<PublicInput>>;

/* import { UInt32 } from './int';

class MyProof extends Proof<UInt32> {
  static publicInputType = UInt32;
  static tag = () => MyProgram;
}

let MyProgram = Program({
  publicInput: UInt32,

  methods: {
    otherMethod: {
      privateInput: [],

      method(publicInput: UInt32) {},
    },

    someMethod: {
      privateInput: [Bool, MyProof],

      method(publicInput: UInt32, b: Bool, x: MyProof) {
        x.publicInput;
        publicInput.add(9).equals(UInt32.from(10)).and(b).assertTrue();
      },
    },
  },
});

let p = await MyProgram.someMethod(UInt32.one, Bool.true, MyProof.dummy());
p.verify();
let x: UInt32 = p.publicInput; */
