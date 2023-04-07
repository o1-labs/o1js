import {
  Bool,
  Field,
  ProvablePure,
  Pickles,
  Circuit,
  Poseidon,
  Provable,
} from '../snarky.js';
import {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  provable,
  toConstant,
} from './circuit_value.js';
import { Context } from './global-context.js';

// public API
export { Proof, SelfProof, ZkProgram, verify };

// internal API
export {
  CompiledTag,
  sortMethodArguments,
  getPreviousProofsForProver,
  MethodInterface,
  GenericArgument,
  picklesRuleFromFunction,
  compileProgram,
  analyzeMethod,
  emptyValue,
  emptyWitness,
  synthesizeMethodArguments,
  methodArgumentsToConstant,
  methodArgumentTypesAndValues,
  isAsFields,
  snarkContext,
  Prover,
  inProver,
  inCompile,
  inAnalyze,
  inCheckedComputation,
  inCompileMode,
};

// global circuit-related context
type SnarkContext = {
  witnesses?: unknown[];
  proverData?: any;
  inProver?: boolean;
  inCompile?: boolean;
  inCheckedComputation?: boolean;
  inAnalyze?: boolean;
  inRunAndCheck?: boolean;
  inWitnessBlock?: boolean;
};
let snarkContext = Context.create<SnarkContext>({ default: {} });

class Proof<T> {
  static publicInputType: FlexibleProvablePure<any> = undefined as any;
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
  ): Proof<InferProvable<S['publicInputType']>> {
    let [, proof] = Pickles.proofOfBase64(proofString, maxProofsVerified);
    let publicInput = getPublicInputType(this).fromFields(
      publicInputJson.map(Field)
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
    let publicInputFields = (proof as JsonProof).publicInput.map(Field);
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
  PublicInputType extends FlexibleProvablePure<any>,
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
    [I in keyof Types]: Method<InferProvable<PublicInputType>, Types[I]>;
  };
}): {
  name: string;
  compile: () => Promise<{ verificationKey: string }>;
  verify: (proof: Proof<InferProvable<PublicInputType>>) => Promise<boolean>;
  digest: () => string;
  analyzeMethods: () => ReturnType<typeof analyzeMethod>[];
  publicInputType: PublicInputType;
} & {
  [I in keyof Types]: Prover<InferProvable<PublicInputType>, Types[I]>;
} {
  let selfTag = { name: `Program${i++}` };

  type PublicInput = InferProvable<PublicInputType>;
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

  function analyzeMethods() {
    return methodIntfs.map((methodEntry, i) =>
      analyzeMethod(publicInputType, methodEntry, methodFunctions[i])
    );
  }

  return Object.assign(
    selfTag,
    { compile, verify, digest, publicInputType, analyzeMethods },
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
  let witnessArgs: Provable<unknown>[] = [];
  let proofArgs: Subclass<typeof Proof>[] = [];
  let allArgs: { type: 'proof' | 'witness' | 'generic'; index: number }[] = [];
  let genericArgs: Subclass<typeof GenericArgument>[] = [];
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
    } else if (isGeneric(privateInput)) {
      allArgs.push({ type: 'generic', index: genericArgs.length });
      genericArgs.push(privateInput);
    } else {
      throw Error(
        `Argument ${
          i + 1
        } of method ${methodName} is not a provable type: ${privateInput}`
      );
    }
  }
  if (proofArgs.length > 2) {
    throw Error(
      `${programName}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  return {
    methodName,
    witnessArgs,
    proofArgs,
    allArgs,
    genericArgs,
  };
}

function isAsFields(
  type: unknown
): type is Provable<unknown> & ObjectConstructor {
  return (
    (typeof type === 'function' || typeof type === 'object') &&
    type !== null &&
    ['toFields', 'fromFields', 'sizeInFields', 'toAuxiliary'].every(
      (s) => s in type
    )
  );
}
function isProof(type: unknown): type is typeof Proof {
  // the second case covers subclasses
  return (
    type === Proof ||
    (typeof type === 'function' && type.prototype instanceof Proof)
  );
}

class GenericArgument {
  isEmpty: boolean;
  constructor(isEmpty = false) {
    this.isEmpty = isEmpty;
  }
}
let emptyGeneric = () => new GenericArgument(true);

function isGeneric(type: unknown): type is typeof GenericArgument {
  // the second case covers subclasses
  return (
    type === GenericArgument ||
    (typeof type === 'function' && type.prototype instanceof GenericArgument)
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
  // TODO: unify types of arguments
  // "circuit types" should be flexible enough to encompass proofs and callback arguments
  witnessArgs: Provable<unknown>[];
  proofArgs: Subclass<typeof Proof>[];
  genericArgs: Subclass<typeof GenericArgument>[];
  allArgs: { type: 'witness' | 'proof' | 'generic'; index: number }[];
  returnType?: Provable<any>;
};

function compileProgram(
  publicInputType: ProvablePure<any>,
  methodIntfs: MethodInterface[],
  methods: ((...args: any) => void)[],
  proofSystemTag: { name: string }
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
    snarkContext.runWith({ inCompile: true }, () =>
      Pickles.compile(rules, publicInputType.sizeInFields())
    );
  CompiledTag.store(proofSystemTag, tag);
  return { getVerificationKeyArtifact, provers, verify, tag };
}

function analyzeMethod<T>(
  publicInputType: ProvablePure<any>,
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
  publicInputType: ProvablePure<any>,
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
      } else if (arg.type === 'proof') {
        let Proof = proofArgs[arg.index];
        let publicInput = getPublicInputType(Proof).fromFields(
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
      } else if (arg.type === 'generic') {
        finalArgs[i] = argsWithoutPublicInput?.[i] ?? emptyGeneric();
      }
    }
    func(publicInputType.fromFields(publicInput), ...finalArgs);
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
    } else if (arg.type === 'proof') {
      let Proof = proofArgs[arg.index];
      let publicInput = empty(getPublicInputType(Proof));
      args.push(new Proof({ publicInput, proof: undefined }));
    } else if (arg.type === 'generic') {
      args.push(emptyGeneric());
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
    } else if (type === 'proof') {
      let Proof = proofArgs[index];
      let publicInput = toConstant(getPublicInputType(Proof), arg.publicInput);
      constArgs.push(new Proof({ publicInput, proof: arg.proof }));
    } else if (type === 'generic') {
      constArgs.push(arg);
    }
  }
  return constArgs;
}

let Generic = provable(null);

type TypeAndValue<T> = { type: Provable<T>; value: T };

function methodArgumentTypesAndValues(
  { allArgs, proofArgs, witnessArgs }: MethodInterface,
  args: unknown[]
) {
  let typesAndValues: TypeAndValue<any>[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = args[i];
    let { type, index } = allArgs[i];
    if (type === 'witness') {
      typesAndValues.push({ type: witnessArgs[index], value: arg });
    } else if (type === 'proof') {
      let Proof = proofArgs[index];
      typesAndValues.push({
        type: getPublicInputType(Proof),
        value: (arg as Proof<any>).publicInput,
      });
    } else if (type === 'generic') {
      typesAndValues.push({ type: Generic, value: arg });
    }
  }
  return typesAndValues;
}

function emptyValue<T>(type: FlexibleProvable<T>): T;
function emptyValue<T>(type: Provable<T>) {
  return type.fromFields(
    Array(type.sizeInFields()).fill(Field(0)),
    type.toAuxiliary()
  );
}

function emptyWitness<T>(type: FlexibleProvable<T>): T;
function emptyWitness<T>(type: Provable<T>) {
  return Circuit.witness(type, () => emptyValue(type));
}

function getPublicInputType<T, P extends Subclass<typeof Proof> = typeof Proof>(
  Proof: P
): ProvablePure<T> {
  if (Proof.publicInputType === undefined) {
    throw Error(
      `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput> { ... }`
    );
  }
  return Proof.publicInputType as any;
}

ZkProgram.Proof = function <
  PublicInputType extends FlexibleProvablePure<any>
>(program: { name: string; publicInputType: PublicInputType }) {
  type PublicInput = InferProvable<PublicInputType>;
  return class ZkProgramProof extends Proof<PublicInput> {
    static publicInputType = program.publicInputType;
    static tag = () => program;
  };
};

// helpers for circuit context

function Prover<ProverData>() {
  return {
    async run<Result>(
      witnesses: unknown[],
      proverData: ProverData,
      callback: () => Promise<Result>
    ) {
      return snarkContext.runWithAsync(
        { witnesses, proverData, inProver: true },
        callback
      );
    },
    getData(): ProverData {
      return snarkContext.get().proverData;
    },
  };
}

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
  let ctx = snarkContext.get();
  return !!ctx.inCompile || !!ctx.inProver || !!ctx.inCheckedComputation;
}
function inCompileMode() {
  let ctx = snarkContext.get();
  return !!ctx.inCompile || !!ctx.inAnalyze;
}

// helper types

type Infer<T> = T extends Subclass<typeof Proof>
  ? InstanceType<T>
  : InferProvable<T>;

type Tuple<T> = [T, ...T[]] | [];
type TupleToInstances<T> = {
  [I in keyof T]: Infer<T[I]>;
} & any[];

type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };

type PrivateInput = Provable<any> | Subclass<typeof Proof>;

type Method<PublicInput, Args extends Tuple<PrivateInput>> = {
  privateInputs: Args;
  method(publicInput: PublicInput, ...args: TupleToInstances<Args>): void;
};

type Prover<PublicInput, Args extends Tuple<PrivateInput>> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<Proof<PublicInput>>;
