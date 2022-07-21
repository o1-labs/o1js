import {
  Bool,
  Field,
  AsFieldElements,
  Pickles,
  Circuit,
  Poseidon,
} from '../snarky';
import { toConstant } from './circuit_value';
import { Context } from './global-context';

// public API
export { Proof, SelfProof, ZkProgram, verify };

// internal API
export {
  CompiledTag,
  sortMethodArguments,
  getPreviousProofsForProver,
  MethodInterface,
  picklesRuleFromFunction,
  compileProgram,
  analyzeMethod,
  emptyValue,
  emptyWitness,
  synthesizeMethodArguments,
  methodArgumentsToConstant,
  methodArgumentsToFields,
  isAsFields,
  snarkContext,
  inProver,
  inCompile,
  inAnalyze,
  inCheckedComputation,
};

// global circuit-related context
type SnarkContext = {
  witnesses?: unknown[];
  inProver?: boolean;
  inCompile?: boolean;
  inCheckedComputation?: boolean;
  inAnalyze?: boolean;
  inRunAndCheck?: boolean;
};
let snarkContext = Context.create<SnarkContext>({ default: {} });

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
  maxProofsVerified: 0 | 1 | 2;
  shouldVerify = Bool(false);

  verify() {
    this.shouldVerify = Bool(true);
  }
  verifyIf(condition: Bool) {
    this.shouldVerify = condition;
  }
  toJSON(): JsonProof {
    return {
      publicInput: getPublicInputType(this.constructor as any)
        .toFields(this.publicInput)
        .map(String),
      maxProofsVerified: this.maxProofsVerified,
      proof: Pickles.proofToBase64([this.maxProofsVerified, this.proof]),
    };
  }
  static fromJSON<S extends Subclass<typeof Proof>>(
    this: S,
    {
      maxProofsVerified,
      proof: proofString,
      publicInput: publicInputJson,
    }: JsonProof
  ): Proof<InferInstance<S['publicInputType']>> {
    let [, proof] = Pickles.proofOfBase64(proofString, maxProofsVerified);
    let publicInput = getPublicInputType(this).ofFields(
      publicInputJson.map(Field.fromString)
    );
    return new this({ publicInput, proof, maxProofsVerified }) as any;
  }

  constructor({
    proof,
    publicInput,
    maxProofsVerified,
  }: {
    proof: RawProof;
    publicInput: T;
    maxProofsVerified: 0 | 1 | 2;
  }) {
    this.publicInput = publicInput;
    this.proof = proof; // TODO optionally convert from string?
    this.maxProofsVerified = maxProofsVerified;
  }
}

function verify(proof: Proof<any> | JsonProof, verificationKey: string) {
  if (typeof proof.proof === 'string') {
    // json proof
    let [, picklesProof] = Pickles.proofOfBase64(
      proof.proof,
      proof.maxProofsVerified
    );
    let publicInputFields = (proof as JsonProof).publicInput.map(
      Field.fromString
    );
    return Pickles.verify(publicInputFields, picklesProof, verificationKey);
  } else {
    // proof class
    let publicInputFields = getPublicInputType(
      proof.constructor as any
    ).toFields(proof.publicInput);
    return Pickles.verify(publicInputFields, proof.proof, verificationKey);
  }
}

type RawProof = unknown;
type JsonProof = {
  publicInput: string[];
  maxProofsVerified: 0 | 1 | 2;
  proof: string;
};
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

function ZkProgram<
  PublicInputType extends AsFieldElements<any>,
  Types extends {
    // TODO: how to prevent a method called `compile` from type-checking?
    [I in string]: Tuple<PrivateInput>;
  }
>({
  publicInput: publicInputType,
  methods,
}: {
  publicInput: PublicInputType;
  methods: {
    [I in keyof Types]: Method<InferInstance<PublicInputType>, Types[I]>;
  };
}): {
  name: string;
  compile: () => Promise<{ verificationKey: string }>;
  verify: (proof: Proof<InferInstance<PublicInputType>>) => Promise<boolean>;
  digest: () => string;
  publicInputType: PublicInputType;
} & {
  [I in keyof Types]: Prover<InferInstance<PublicInputType>, Types[I]>;
} {
  let selfTag = { name: `Program${i++}` };

  type PublicInput = InferInstance<PublicInputType>;
  class SelfProof extends Proof<PublicInput> {
    static publicInputType = publicInputType;
    static tag = () => selfTag;
  }

  let keys: (keyof Types & string)[] = Object.keys(methods).sort(); // need to have methods in (any) fixed order
  let methodIntfs = keys.map((key) =>
    sortMethodArguments('program', key, methods[key].privateInputs, SelfProof)
  );
  let methodFunctions = keys.map((key) => methods[key].method);
  let maxProofsVerified = methodIntfs.reduce(
    (acc, { proofArgs }) => Math.max(acc, proofArgs.length),
    0
  ) as any as 0 | 1 | 2;

  let compileOutput:
    | {
        provers: Pickles.Prover[];
        verify: (publicInput: Field[], proof: unknown) => Promise<boolean>;
      }
    | undefined;

  async function compile() {
    let { provers, verify, getVerificationKeyArtifact } = compileProgram(
      publicInputType,
      methodIntfs,
      methodFunctions,
      selfTag
    );
    compileOutput = { provers, verify };
    return { verificationKey: getVerificationKeyArtifact().data };
  }

  function toProver<K extends keyof Types & string>(
    key: K,
    i: number
  ): [K, Prover<PublicInput, Types[K]>] {
    async function prove(
      publicInput: PublicInput,
      ...args: TupleToInstances<Types[typeof key]>
    ): Promise<Proof<PublicInput>> {
      let picklesProver = compileOutput?.provers?.[i];
      if (picklesProver === undefined) {
        throw Error(
          `Cannot prove execution of program.${key}(), no prover found. ` +
            `Try calling \`await program.compile()\` first, this will cache provers in the background.`
        );
      }
      let publicInputFields = publicInputType.toFields(publicInput);
      let previousProofs = getPreviousProofsForProver(args, methodIntfs[i]);

      let [, proof] = await snarkContext.runWithAsync(
        { witnesses: args, inProver: true },
        () => picklesProver!(publicInputFields, previousProofs)
      );
      class ProgramProof extends Proof<PublicInput> {
        static publicInputType = publicInputType;
        static tag = () => selfTag;
      }
      return new ProgramProof({ publicInput, proof, maxProofsVerified });
    }
    return [key, prove];
  }
  let provers = Object.fromEntries(keys.map(toProver)) as {
    [I in keyof Types]: Prover<PublicInput, Types[I]>;
  };

  function verify(proof: Proof<PublicInput>) {
    if (compileOutput?.verify === undefined) {
      throw Error(
        `Cannot verify proof, verification key not found. Try calling \`await program.compile()\` first.`
      );
    }
    return compileOutput.verify(
      publicInputType.toFields(proof.publicInput),
      proof.proof
    );
  }

  function digest() {
    let methodData = methodIntfs.map((methodEntry, i) =>
      analyzeMethod(publicInputType, methodEntry, methodFunctions[i])
    );
    let hash = Poseidon.hash(
      Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest))),
      false
    );
    return hash.toBigInt().toString(16);
  }

  return Object.assign(
    selfTag,
    { compile, verify, digest, publicInputType },
    provers
  );
}

let i = 0;

class SelfProof<T> extends Proof<T> {}

function sortMethodArguments(
  programName: string,
  methodName: string,
  privateInputs: unknown[],
  selfProof: Subclass<typeof Proof>
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
      if (privateInput === SelfProof) {
        proofArgs.push(selfProof);
      } else {
        proofArgs.push(privateInput);
      }
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
    (typeof type === 'function' || typeof type === 'object') &&
    type !== null &&
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

function getPreviousProofsForProver(
  methodArgs: any[],
  { allArgs, proofArgs }: MethodInterface
) {
  let previousProofs: Pickles.ProofWithPublicInput[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = allArgs[i];
    if (arg.type === 'proof') {
      let { proof, publicInput } = methodArgs[i] as Proof<any>;
      let publicInputType = getPublicInputType(proofArgs[arg.index]);
      previousProofs[arg.index] = {
        publicInput: publicInputType.toFields(publicInput),
        proof,
      };
    }
  }
  return previousProofs;
}

type MethodInterface = {
  methodName: string;
  witnessArgs: AsFieldElements<unknown>[];
  proofArgs: Subclass<typeof Proof>[];
  allArgs: { type: 'witness' | 'proof'; index: number }[];
  returnType?: AsFieldElements<unknown>;
};

function compileProgram(
  publicInputType: AsFieldElements<any>,
  methodIntfs: MethodInterface[],
  methods: ((...args: any) => void)[],
  proofSystemTag: { name: string },
  additionalContext?: { self: any } | undefined
) {
  let rules = methodIntfs.map((methodEntry, i) =>
    picklesRuleFromFunction(
      publicInputType,
      methods[i],
      proofSystemTag,
      methodEntry
    )
  );
  let [, { getVerificationKeyArtifact, provers, verify, tag }] =
    snarkContext.runWith({ inCompile: true, ...additionalContext }, () =>
      Pickles.compile(rules, publicInputType.sizeInFields())
    );
  CompiledTag.store(proofSystemTag, tag);
  return { getVerificationKeyArtifact, provers, verify, tag };
}

function analyzeMethod<T>(
  publicInputType: AsFieldElements<any>,
  methodIntf: MethodInterface,
  method: (...args: any) => T
) {
  return Circuit.constraintSystem(() => {
    let args = synthesizeMethodArguments(methodIntf, true);
    let publicInput = emptyWitness(publicInputType);
    return method(publicInput, ...args);
  });
}

function picklesRuleFromFunction(
  publicInputType: AsFieldElements<any>,
  func: (...args: unknown[]) => void,
  proofSystemTag: { name: string },
  { methodName, witnessArgs, proofArgs, allArgs }: MethodInterface
): Pickles.Rule {
  function main(
    publicInput: Pickles.PublicInput,
    previousInputs: Pickles.PublicInput[]
  ) {
    let { witnesses: argsWithoutPublicInput } = snarkContext.get();
    let finalArgs = [];
    let proofs: Proof<any>[] = [];
    for (let i = 0; i < allArgs.length; i++) {
      let arg = allArgs[i];
      if (arg.type === 'witness') {
        let type = witnessArgs[arg.index];
        finalArgs[i] = argsWithoutPublicInput
          ? Circuit.witness(type, () => argsWithoutPublicInput![i])
          : emptyWitness(type);
      } else {
        let Proof = proofArgs[arg.index];
        let publicInput = getPublicInputType(Proof).ofFields(
          previousInputs[arg.index]
        );
        let proofInstance: Proof<any>;
        if (argsWithoutPublicInput) {
          let { proof }: Proof<any> = argsWithoutPublicInput[i] as any;
          proofInstance = new Proof({ publicInput, proof });
        } else {
          proofInstance = new Proof({ publicInput, proof: undefined });
        }
        finalArgs[i] = proofInstance;
        proofs.push(proofInstance);
      }
    }
    func(publicInputType.ofFields(publicInput), ...finalArgs);
    return proofs.map((proof) => proof.shouldVerify);
  }

  if (proofArgs.length > 2) {
    throw Error(
      `${proofSystemTag.name}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  let proofsToVerify = proofArgs.map((Proof) => {
    let tag = Proof.tag();
    if (tag === proofSystemTag) return { isSelf: true as const };
    else {
      let compiledTag = CompiledTag.get(tag);
      if (compiledTag === undefined) {
        throw Error(
          `${proofSystemTag.name}.compile() depends on ${tag.name}, but we cannot find compilation output for ${tag.name}.\n` +
            `Try to run ${tag.name}.compile() first.`
        );
      }
      return { isSelf: false, tag: compiledTag };
    }
  });
  return { identifier: methodName, main, proofsToVerify };
}

function synthesizeMethodArguments(
  { allArgs, proofArgs, witnessArgs }: MethodInterface,
  asVariables = false
) {
  let args = [];
  let empty = asVariables ? emptyWitness : emptyValue;
  for (let arg of allArgs) {
    if (arg.type === 'witness') {
      args.push(empty(witnessArgs[arg.index]));
    } else {
      let Proof = proofArgs[arg.index];
      let publicInput = empty(getPublicInputType(Proof));
      args.push(new Proof({ publicInput, proof: undefined }));
    }
  }
  return args;
}

function methodArgumentsToConstant(
  { allArgs, proofArgs, witnessArgs }: MethodInterface,
  args: any[]
) {
  let constArgs = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = args[i];
    let { type, index } = allArgs[i];
    if (type === 'witness') {
      constArgs.push(toConstant(witnessArgs[index], arg));
    } else {
      let Proof = proofArgs[index];
      let publicInput = toConstant(getPublicInputType(Proof), arg.publicInput);
      constArgs.push(new Proof({ publicInput, proof: arg.proof }));
    }
  }
  return constArgs;
}
function methodArgumentsToFields(
  { allArgs, proofArgs, witnessArgs }: MethodInterface,
  args: any[]
) {
  let fields: Field[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = args[i];
    let { type, index } = allArgs[i];
    if (type === 'witness') {
      fields.push(...witnessArgs[index].toFields(arg));
    } else {
      let Proof = proofArgs[index];
      let publicInput = getPublicInputType(Proof).toFields(arg.publicInput);
      fields.push(...publicInput);
    }
  }
  return fields;
}

function emptyValue<T>(type: AsFieldElements<T>) {
  return type.ofFields(Array(type.sizeInFields()).fill(Field.zero));
}

function emptyWitness<T>(type: AsFieldElements<T>) {
  return Circuit.witness(type, () => emptyValue(type));
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

ZkProgram.Proof = function <
  PublicInputType extends AsFieldElements<any>
>(program: { name: string; publicInputType: PublicInputType }) {
  type PublicInput = InferInstance<PublicInputType>;
  return class ZkProgramProof extends Proof<PublicInput> {
    static publicInputType = program.publicInputType;
    static tag = () => program;
  };
};

// helpers for circuit context

function inProver() {
  return !!snarkContext.get().inProver;
}
function inCompile() {
  return !!snarkContext.get().inCompile;
}
function inAnalyze() {
  return !!snarkContext.get().inAnalyze;
}
function inCheckedComputation() {
  return (
    !!snarkContext.get().inCompile ||
    !!snarkContext.get().inProver ||
    !!snarkContext.get().inCheckedComputation
  );
}

// helper types

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

type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };

type PrivateInput = AsFieldElements<any> | Subclass<typeof Proof>;

type Method<PublicInput, Args extends Tuple<PrivateInput>> = {
  privateInputs: Args;
  method(publicInput: PublicInput, ...args: TupleToInstances<Args>): void;
};

type Prover<PublicInput, Args extends Tuple<PrivateInput>> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<Proof<PublicInput>>;
