import { withThreadPool } from '../bindings/js/wrapper.js';
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
  dummyBase64Proof,
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

class Proof<Input, Output> {
  static publicInputType: FlexibleProvablePure<any> = undefined as any;
  static publicOutputType: FlexibleProvablePure<any> = undefined as any;
  static tag: () => { name: string } = () => {
    throw Error(
      `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`
    );
  };
  publicInput: Input;
  publicOutput: Output;
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
    let type = getStatementType(this.constructor as any);
    return {
      publicInput: type.input.toFields(this.publicInput).map(String),
      publicOutput: type.output.toFields(this.publicOutput).map(String),
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
      publicOutput: publicOutputJson,
    }: JsonProof
  ): Proof<
    InferProvable<S['publicInputType']>,
    InferProvable<S['publicOutputType']>
  > {
    let [, proof] = Pickles.proofOfBase64(proofString, maxProofsVerified);
    let type = getStatementType(this);
    let publicInput = type.input.fromFields(publicInputJson.map(Field));
    let publicOutput = type.output.fromFields(publicOutputJson.map(Field));
    return new this({
      publicInput,
      publicOutput,
      proof,
      maxProofsVerified,
    }) as any;
  }

  constructor({
    proof,
    publicInput,
    publicOutput,
    maxProofsVerified,
  }: {
    proof: RawProof;
    publicInput: Input;
    publicOutput: Output;
    maxProofsVerified: 0 | 1 | 2;
  }) {
    this.publicInput = publicInput;
    this.publicOutput = publicOutput;
    this.proof = proof; // TODO optionally convert from string?
    this.maxProofsVerified = maxProofsVerified;
  }
}

async function verify(
  proof: Proof<any, any> | JsonProof,
  verificationKey: string
) {
  let picklesProof: unknown;
  let statement: Pickles.Statement;
  if (typeof proof.proof === 'string') {
    // json proof
    [, picklesProof] = Pickles.proofOfBase64(
      proof.proof,
      proof.maxProofsVerified
    );
    statement = {
      input: (proof as JsonProof).publicInput.map(Field),
      output: (proof as JsonProof).publicOutput.map(Field),
    };
  } else {
    // proof class
    picklesProof = proof.proof;
    let type = getStatementType(proof.constructor as any);
    statement = {
      input: type.input.toFields(proof.publicInput),
      output: type.output.toFields(proof.publicOutput),
    };
  }
  return withThreadPool(() =>
    Pickles.verify(statement, picklesProof, verificationKey)
  );
}

type RawProof = unknown;
type JsonProof = {
  publicInput: string[];
  publicOutput: string[];
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
  verify: (
    // TODO don't hard-code public output type
    proof: Proof<InferProvable<PublicInputType>, Field>
  ) => Promise<boolean>;
  digest: () => string;
  analyzeMethods: () => ReturnType<typeof analyzeMethod>[];
  publicInputType: PublicInputType;
} & {
  // TODO don't hard-code public output type
  [I in keyof Types]: Prover<InferProvable<PublicInputType>, Field, Types[I]>;
} {
  // TODO don't hard-code public output type
  type PublicOutput = Field;
  let publicOutputType = Field;

  let selfTag = { name: `Program${i++}` };

  type PublicInput = InferProvable<PublicInputType>;
  class SelfProof extends Proof<PublicInput, PublicOutput> {
    static publicInputType = publicInputType;
    static publicOutputType = publicOutputType;
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
        verify: (
          statement: Pickles.Statement,
          proof: unknown
        ) => Promise<boolean>;
      }
    | undefined;

  async function compile() {
    let { provers, verify, verificationKey } = await compileProgram(
      publicInputType,
      publicOutputType,
      methodIntfs,
      methodFunctions,
      selfTag
    );
    compileOutput = { provers, verify };
    return { verificationKey: verificationKey.data };
  }

  function toProver<K extends keyof Types & string>(
    key: K,
    i: number
  ): [K, Prover<PublicInput, PublicOutput, Types[K]>] {
    async function prove(
      publicInput: PublicInput,
      ...args: TupleToInstances<Types[typeof key]>
    ): // TODO public output should come out as `PublicOutput`
    Promise<{
      proof: Proof<PublicInput, PublicOutput>;
      publicOutput: PublicOutput;
    }> {
      let picklesProver = compileOutput?.provers?.[i];
      if (picklesProver === undefined) {
        throw Error(
          `Cannot prove execution of program.${key}(), no prover found. ` +
            `Try calling \`await program.compile()\` first, this will cache provers in the background.`
        );
      }
      let publicInputFields = publicInputType.toFields(publicInput);
      let previousProofs = getPreviousProofsForProver(args, methodIntfs[i]);

      let [, { proof, publicOutput: publicOutputFields }] =
        await snarkContext.runWithAsync(
          { witnesses: args, inProver: true },
          () => picklesProver!(publicInputFields, previousProofs)
        );
      let publicOutput = publicOutputType.fromFields(publicOutputFields);
      class ProgramProof extends Proof<PublicInput, PublicOutput> {
        static publicInputType = publicInputType;
        static publicOutputType = publicOutputType;
        static tag = () => selfTag;
      }
      return {
        proof: new ProgramProof({
          publicInput,
          publicOutput,
          proof,
          maxProofsVerified,
        }),
        publicOutput,
      };
    }
    return [key, prove];
  }
  let provers = Object.fromEntries(keys.map(toProver)) as {
    [I in keyof Types]: Prover<PublicInput, PublicOutput, Types[I]>;
  };

  function verify(proof: Proof<PublicInput, PublicOutput>) {
    if (compileOutput?.verify === undefined) {
      throw Error(
        `Cannot verify proof, verification key not found. Try calling \`await program.compile()\` first.`
      );
    }
    let statement = {
      input: publicInputType.toFields(proof.publicInput),
      output: publicOutputType.toFields(proof.publicOutput),
    };
    return compileOutput.verify(statement, proof.proof);
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

class SelfProof<PublicInput, PublicOutput> extends Proof<
  PublicInput,
  PublicOutput
> {}

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
            `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`
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
  let previousProofs: Pickles.ProofWithStatement[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = allArgs[i];
    if (arg.type === 'proof') {
      let { proof, publicInput, publicOutput } = methodArgs[i] as Proof<
        any,
        any
      >;
      let type = getStatementType(proofArgs[arg.index]);
      previousProofs[arg.index] = {
        publicInput: type.input.toFields(publicInput),
        publicOutput: type.output.toFields(publicOutput),
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

async function compileProgram(
  publicInputType: ProvablePure<any>,
  publicOutputType: ProvablePure<any>,
  methodIntfs: MethodInterface[],
  methods: ((...args: any) => void)[],
  proofSystemTag: { name: string }
) {
  let rules = methodIntfs.map((methodEntry, i) =>
    picklesRuleFromFunction(
      publicInputType,
      publicOutputType,
      methods[i],
      proofSystemTag,
      methodEntry
    )
  );
  let { verificationKey, provers, verify, tag } = await withThreadPool(
    async () => {
      let [, { getVerificationKeyArtifact, provers, verify, tag }] =
        snarkContext.runWith({ inCompile: true }, () =>
          Pickles.compile(rules, {
            publicInputSize: publicInputType.sizeInFields(),
            publicOutputSize: publicOutputType.sizeInFields(),
          })
        );
      CompiledTag.store(proofSystemTag, tag);
      let verificationKey = getVerificationKeyArtifact();
      return { verificationKey, provers, verify, tag };
    }
  );
  // wrap provers
  let wrappedProvers = provers.map(
    (prover) =>
      async function picklesProver(
        publicInput: Field[],
        previousProofs: Pickles.ProofWithStatement[]
      ) {
        return withThreadPool(() => prover(publicInput, previousProofs));
      }
  );
  // wrap verify
  let wrappedVerify = async function picklesVerify(
    statement: Pickles.Statement,
    proof: Pickles.Proof
  ) {
    return withThreadPool(() => verify(statement, proof));
  };
  return {
    verificationKey,
    provers: wrappedProvers,
    verify: wrappedVerify,
    tag,
  };
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
  publicOutputType: ProvablePure<any>,
  func: (...args: unknown[]) => void,
  proofSystemTag: { name: string },
  { methodName, witnessArgs, proofArgs, allArgs }: MethodInterface
): Pickles.Rule {
  function main(
    publicInput: Field[],
    previousInputsAndOutputs: Field[][]
  ): ReturnType<Pickles.Rule['main']> {
    let { witnesses: argsWithoutPublicInput } = snarkContext.get();
    let finalArgs = [];
    let proofs: Proof<any, any>[] = [];
    for (let i = 0; i < allArgs.length; i++) {
      let arg = allArgs[i];
      if (arg.type === 'witness') {
        let type = witnessArgs[arg.index];
        finalArgs[i] = argsWithoutPublicInput
          ? Circuit.witness(type, () => argsWithoutPublicInput![i])
          : emptyWitness(type);
      } else if (arg.type === 'proof') {
        let Proof = proofArgs[arg.index];
        // TODO: split in input & output
        // console.log(previousInputsAndOutputs[arg.index]);
        let type = getStatementType(Proof);
        let previousStatement = previousInputsAndOutputs[arg.index];
        let inputFields = previousStatement.slice(0, type.input.sizeInFields());
        let outputFields = previousStatement.slice(type.input.sizeInFields());
        let publicInput = type.input.fromFields(inputFields);
        let publicOutput = type.output.fromFields(outputFields);
        let proof: unknown;
        if (argsWithoutPublicInput) {
          ({ proof } = argsWithoutPublicInput[i] as any);
        }
        let proofInstance = new Proof({ publicInput, publicOutput, proof });
        finalArgs[i] = proofInstance;
        proofs.push(proofInstance);
      } else if (arg.type === 'generic') {
        finalArgs[i] = argsWithoutPublicInput?.[i] ?? emptyGeneric();
      }
    }
    func(publicInputType.fromFields(publicInput), ...finalArgs);
    // TODO get public output from function return
    let publicOutput = Array<Field>(publicOutputType.sizeInFields()).fill(
      Field(1)
    );
    return {
      publicOutput,
      shouldVerify: proofs.map((proof) => proof.shouldVerify),
    };
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
      let type = getStatementType(Proof);
      let publicInput = empty(type.input);
      let publicOutput = empty(type.output);
      args.push(new Proof({ publicInput, publicOutput, proof: undefined }));
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
      let type = getStatementType(Proof);
      let publicInput = toConstant(type.input, arg.publicInput);
      let publicOutput = toConstant(type.output, arg.publicOutput);
      constArgs.push(
        new Proof({ publicInput, publicOutput, proof: arg.proof })
      );
    } else if (type === 'generic') {
      constArgs.push(arg);
    }
  }
  return constArgs;
}

let Generic = provable(null);

type TypeAndValue<T> = { type: Provable<T>; value: T };

// TODO this ignores public output; works because we know that this function is only usewd by zkapps which have no public output
// but should be fixed when we unify public input + public output into one "statement" type
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
      let type = getStatementType(Proof);
      typesAndValues.push({
        type: type.input,
        value: (arg as Proof<any, any>).publicInput,
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

function getStatementType<
  T,
  O,
  P extends Subclass<typeof Proof> = typeof Proof
>(Proof: P): { input: ProvablePure<T>; output: ProvablePure<O> } {
  if (
    Proof.publicInputType === undefined ||
    Proof.publicOutputType === undefined
  ) {
    throw Error(
      `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`
    );
  }
  return {
    input: Proof.publicInputType as any,
    output: Proof.publicOutputType as any,
  };
}

ZkProgram.Proof = function <
  PublicInputType extends FlexibleProvablePure<any>
>(program: { name: string; publicInputType: PublicInputType }) {
  type PublicInput = InferProvable<PublicInputType>;
  // TODO don't hard code
  return class ZkProgramProof extends Proof<PublicInput, Field> {
    static publicInputType = program.publicInputType;
    // TODO don't hard code
    static publicOutputType = Field;
    static tag = () => program;
  };
};

function dummyBase64Proof() {
  return withThreadPool(async () => Pickles.dummyBase64Proof());
}

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

type Prover<PublicInput, PublicOutput, Args extends Tuple<PrivateInput>> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<{
  publicOutput: PublicOutput;
  proof: Proof<PublicInput, PublicOutput>;
}>;
