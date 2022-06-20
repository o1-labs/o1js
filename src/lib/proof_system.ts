import { Bool, Field, AsFieldElements, Pickles } from '../snarky';

// public API
export { Proof };

// internal API
export {
  CompiledTag,
  sortMethodArguments,
  getPublicInputType,
  MethodInterface,
};

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
    let publicInputType = getPublicInputType<T>(this);
    let publicInput = publicInputType.ofFields(
      Array(publicInputType.sizeInFields()).fill(Field.zero)
    );
    let proof = ''; // TODO
    return new this({ publicInput, proof });
  }

  constructor({ proof, publicInput }: { proof: RawProof; publicInput: T }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO optionally convert from string?
  }
}

function getPublicInputType<T, P extends Subclass<typeof Proof> = typeof Proof>(
  Proof: P
): AsFieldElements<T> {
  if (Proof.publicInputType === undefined) {
    throw Error(
      `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput> { ... }`
    );
  }
  return Proof.publicInputType;
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

type Tuple<T> = [T, ...T[]] | [];

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
    [I in string]: Tuple<PrivateInput>;
  }
>({
  publicInput,
  methods,
}: {
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
  let keys: (keyof Types & string)[] = Object.keys(methods).sort(); // need to have methods in (any) fixed order
  let methodFunctions = keys.map((key) => methods[key].method);
  let methodIntfs = keys.map((key) =>
    sortMethodArguments('Program', key, methods[key].privateInput)
  );

  throw Error('todo');
}

function sortMethodArguments(
  programName: string,
  methodName: string,
  privateInputs: unknown[]
): MethodInterface {
  let witnessArgs: AsFieldElements<unknown>[] = [];
  let proofArgs: Subclass<typeof Proof>[] = [];
  let allArgs: { type: 'proof' | 'witness'; index: number }[] = [];
  for (let i = 0; i < privateInputs.length; i++) {
    let privateInput = privateInputs[i];
    if (isProof(privateInput)) {
      if (privateInput === Proof) {
        throw Error(
          `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
            `class MyProof extends Proof<PublicInput> { ... }`
        );
      }
      allArgs.push({ type: 'proof', index: proofArgs.length });
      proofArgs.push(privateInput);
    } else if (isAsFields(privateInput)) {
      allArgs.push({ type: 'witness', index: witnessArgs.length });
      witnessArgs.push(privateInput);
    } else {
      throw Error(
        `Argument ${
          i + 1
        } of method ${methodName} is not a valid circuit value: ${privateInput}`
      );
    }
  }
  if (proofArgs.length > 2) {
    throw Error(
      `${programName}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  return { methodName, witnessArgs, proofArgs, allArgs };
}

function isAsFields(
  type: unknown
): type is AsFieldElements<unknown> & ObjectConstructor {
  return (
    typeof type === 'function' &&
    ['toFields', 'ofFields', 'sizeInFields'].every((s) => s in type)
  );
}
function isProof(type: unknown): type is typeof Proof {
  // the second case covers subclasses
  return (
    type === Proof ||
    (typeof type === 'function' && type.prototype instanceof Proof)
  );
}

type MethodInterface = {
  methodName: string;
  witnessArgs: AsFieldElements<unknown>[];
  proofArgs: Subclass<typeof Proof>[];
  allArgs: { type: 'witness' | 'proof'; index: number }[];
};

type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };

type PrivateInput = AsFieldElements<any> | Subclass<typeof Proof>;

type Circuit<PublicInput, Args extends Tuple<PrivateInput>> = {
  privateInput: Args;
  method(publicInput: PublicInput, ...args: TupleToInstances<Args>): void;
};

type Prover<PublicInput, Args extends Tuple<PrivateInput>> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<Proof<PublicInput>>;

import { UInt32 } from './int';

async function test() {
  class MyProof extends Proof<UInt32> {
    static publicInputType = UInt32;
    static tag: () => { name: string } = () => MyProgram;
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
  await MyProgram.compile();

  let p = await MyProgram.someMethod(UInt32.one, Bool.true, Proof.dummy());
  p.verify();
  let x: UInt32 = p.publicInput;
  let p2 = await MyProgram.otherMethod(UInt32.one);
}
