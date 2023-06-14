import {
  EmptyNull,
  EmptyUndefined,
  EmptyVoid,
} from '../bindings/lib/generic.js';
import { withThreadPool } from '../bindings/js/wrapper.js';
import { ProvablePure, Pickles } from '../snarky.js';
import { Field, Bool } from './core.js';
import {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  ProvablePureExtended,
  provablePure,
  toConstant,
} from './circuit_value.js';
import { Provable } from './provable.js';
import { assert, prettifyStacktracePromise } from './errors.js';
import { snarkContext } from './provable-context.js';
import { hashConstant } from './hash.js';
import { MlArray, MlTuple } from './ml/base.js';
import { MlFieldArray, MlFieldConstArray } from './ml/fields.js';
import { FieldConst, FieldVar } from './field.js';

// public API
export {
  Proof,
  SelfProof,
  JsonProof,
  ZkProgram,
  verify,
  Empty,
  Undefined,
  Void,
};

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
  Prover,
  dummyBase64Proof,
};

type Undefined = undefined;
const Undefined: ProvablePureExtended<undefined, null> =
  EmptyUndefined<Field>();
type Empty = Undefined;
const Empty = Undefined;
type Void = undefined;
const Void: ProvablePureExtended<void, null> = EmptyVoid<Field>();

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
  proof: Pickles.Proof;
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
    proof: Pickles.Proof;
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
  let picklesProof: Pickles.Proof;
  let statement: Pickles.Statement<FieldConst>;
  if (typeof proof.proof === 'string') {
    // json proof
    [, picklesProof] = Pickles.proofOfBase64(
      proof.proof,
      proof.maxProofsVerified
    );
    let input = MlFieldConstArray.to(
      (proof as JsonProof).publicInput.map(Field)
    );
    let output = MlFieldConstArray.to(
      (proof as JsonProof).publicOutput.map(Field)
    );
    statement = MlTuple(input, output);
  } else {
    // proof class
    picklesProof = proof.proof;
    let type = getStatementType(proof.constructor as any);
    let input = toFieldConsts(type.input, proof.publicInput);
    let output = toFieldConsts(type.output, proof.publicOutput);
    statement = MlTuple(input, output);
  }
  return prettifyStacktracePromise(
    withThreadPool(() =>
      Pickles.verify(statement, picklesProof, verificationKey)
    )
  );
}

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
  StatementType extends {
    publicInput?: FlexibleProvablePure<any>;
    publicOutput?: FlexibleProvablePure<any>;
  },
  Types extends {
    // TODO: how to prevent a method called `compile` from type-checking?
    [I in string]: Tuple<PrivateInput>;
  }
>(
  config: StatementType & {
    methods: {
      [I in keyof Types]: Method<
        InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
        InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
        Types[I]
      >;
    };
  }
): {
  name: string;
  compile: () => Promise<{ verificationKey: string }>;
  verify: (
    proof: Proof<
      InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
      InferProvableOrVoid<Get<StatementType, 'publicOutput'>>
    >
  ) => Promise<boolean>;
  digest: () => string;
  analyzeMethods: () => ReturnType<typeof analyzeMethod>[];
  publicInputType: ProvableOrUndefined<Get<StatementType, 'publicInput'>>;
  publicOutputType: ProvableOrVoid<Get<StatementType, 'publicOutput'>>;
} & {
  [I in keyof Types]: Prover<
    InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
    InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
    Types[I]
  >;
} {
  let methods = config.methods;
  let publicInputType: ProvablePure<any> = config.publicInput! ?? Undefined;
  let publicOutputType: ProvablePure<any> = config.publicOutput! ?? Void;

  let selfTag = { name: `Program${i++}` };
  type PublicInput = InferProvableOrUndefined<
    Get<StatementType, 'publicInput'>
  >;
  type PublicOutput = InferProvableOrVoid<Get<StatementType, 'publicOutput'>>;

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
          statement: Pickles.Statement<FieldConst>,
          proof: Pickles.Proof
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
    async function prove_(
      publicInput: PublicInput,
      ...args: TupleToInstances<Types[typeof key]>
    ): Promise<Proof<PublicInput, PublicOutput>> {
      let picklesProver = compileOutput?.provers?.[i];
      if (picklesProver === undefined) {
        throw Error(
          `Cannot prove execution of program.${key}(), no prover found. ` +
            `Try calling \`await program.compile()\` first, this will cache provers in the background.`
        );
      }
      let publicInputFields = toFieldConsts(publicInputType, publicInput);
      let previousProofs = MlArray.to(
        getPreviousProofsForProver(args, methodIntfs[i])
      );

      let id = snarkContext.enter({ witnesses: args, inProver: true });
      let result: UnwrapPromise<ReturnType<typeof picklesProver>>;
      try {
        result = await picklesProver(publicInputFields, previousProofs);
      } finally {
        snarkContext.leave(id);
      }
      let [publicOutputFields, proof] = MlTuple.from(result);
      let publicOutput = fromFieldConsts(publicOutputType, publicOutputFields);
      class ProgramProof extends Proof<PublicInput, PublicOutput> {
        static publicInputType = publicInputType;
        static publicOutputType = publicOutputType;
        static tag = () => selfTag;
      }
      return new ProgramProof({
        publicInput,
        publicOutput,
        proof,
        maxProofsVerified,
      });
    }
    let prove: Prover<PublicInput, PublicOutput, Types[K]>;
    if (
      (publicInputType as any) === Undefined ||
      (publicInputType as any) === Void
    ) {
      prove = ((...args: TupleToInstances<Types[typeof key]>) =>
        (prove_ as any)(undefined, ...args)) as any;
    } else {
      prove = prove_ as any;
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
    let statement = MlTuple(
      toFieldConsts(publicInputType, proof.publicInput),
      toFieldConsts(publicOutputType, proof.publicOutput)
    );
    return compileOutput.verify(statement, proof.proof);
  }

  function digest() {
    let methodData = methodIntfs.map((methodEntry, i) =>
      analyzeMethod(publicInputType, methodEntry, methodFunctions[i])
    );
    let hash = hashConstant(
      Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest)))
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
    {
      compile,
      verify,
      digest,
      publicInputType: publicInputType as ProvableOrUndefined<
        Get<StatementType, 'publicInput'>
      >,
      publicOutputType: publicOutputType as ProvableOrVoid<
        Get<StatementType, 'publicOutput'>
      >,
      analyzeMethods,
    },
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
  { allArgs }: MethodInterface
) {
  let previousProofs: Pickles.Proof[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    let arg = allArgs[i];
    if (arg.type === 'proof') {
      previousProofs[arg.index] = (methodArgs[i] as Proof<any, any>).proof;
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
  let { verificationKey, provers, verify, tag } =
    await prettifyStacktracePromise(
      withThreadPool(async () => {
        let result: ReturnType<typeof Pickles.compile>;
        let id = snarkContext.enter({ inCompile: true });
        try {
          result = Pickles.compile(MlArray.to(rules), {
            publicInputSize: publicInputType.sizeInFields(),
            publicOutputSize: publicOutputType.sizeInFields(),
          });
        } finally {
          snarkContext.leave(id);
        }
        let { getVerificationKey, provers, verify, tag } = result;
        CompiledTag.store(proofSystemTag, tag);
        let [, data, hash] = getVerificationKey();
        let verificationKey = { data, hash: Field(hash) };
        return { verificationKey, provers: MlArray.from(provers), verify, tag };
      })
    );
  // wrap provers
  let wrappedProvers = provers.map(
    (prover): Pickles.Prover =>
      async function picklesProver(
        publicInput: MlFieldConstArray,
        previousProofs: MlArray<Pickles.Proof>
      ) {
        return prettifyStacktracePromise(
          withThreadPool(() => prover(publicInput, previousProofs))
        );
      }
  );
  // wrap verify
  let wrappedVerify = async function picklesVerify(
    statement: Pickles.Statement<FieldConst>,
    proof: Pickles.Proof
  ) {
    return prettifyStacktracePromise(
      withThreadPool(() => verify(statement, proof))
    );
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
  return Provable.constraintSystem(() => {
    let args = synthesizeMethodArguments(methodIntf, true);
    let publicInput = emptyWitness(publicInputType);
    if (publicInputType === Undefined || publicInputType === Void)
      return method(...args);
    return method(publicInput, ...args);
  });
}

function picklesRuleFromFunction(
  publicInputType: ProvablePure<unknown>,
  publicOutputType: ProvablePure<unknown>,
  func: (...args: unknown[]) => any,
  proofSystemTag: { name: string },
  { methodName, witnessArgs, proofArgs, allArgs }: MethodInterface
): Pickles.Rule {
  function main(publicInput: MlFieldArray): ReturnType<Pickles.Rule['main']> {
    let { witnesses: argsWithoutPublicInput, inProver } = snarkContext.get();
    assert(!(inProver && argsWithoutPublicInput === undefined));
    let finalArgs = [];
    let proofs: Proof<any, any>[] = [];
    let previousStatements: Pickles.Statement<FieldVar>[] = [];
    for (let i = 0; i < allArgs.length; i++) {
      let arg = allArgs[i];
      if (arg.type === 'witness') {
        let type = witnessArgs[arg.index];
        finalArgs[i] = Provable.witness(type, () => {
          return argsWithoutPublicInput?.[i] ?? emptyValue(type);
        });
      } else if (arg.type === 'proof') {
        let Proof = proofArgs[arg.index];
        let type = getStatementType(Proof);
        let proof_ = (argsWithoutPublicInput?.[i] as Proof<any, any>) ?? {
          proof: undefined,
          publicInput: emptyValue(type.input),
          publicOutput: emptyValue(type.output),
        };
        let { proof, publicInput, publicOutput } = proof_;
        publicInput = Provable.witness(type.input, () => publicInput);
        publicOutput = Provable.witness(type.output, () => publicOutput);
        let proofInstance = new Proof({ publicInput, publicOutput, proof });
        finalArgs[i] = proofInstance;
        proofs.push(proofInstance);
        let input = toFieldVars(type.input, publicInput);
        let output = toFieldVars(type.output, publicOutput);
        previousStatements.push(MlTuple(input, output));
      } else if (arg.type === 'generic') {
        finalArgs[i] = argsWithoutPublicInput?.[i] ?? emptyGeneric();
      }
    }
    let result: any;
    if (publicInputType === Undefined || publicInputType === Void) {
      result = func(...finalArgs);
    } else {
      let input = fromFieldVars(publicInputType, publicInput);
      result = func(input, ...finalArgs);
    }
    // if the public output is empty, we don't evaluate `toFields(result)` to allow the function to return something else in that case
    let hasPublicOutput = publicOutputType.sizeInFields() !== 0;
    let publicOutput = hasPublicOutput ? publicOutputType.toFields(result) : [];
    return {
      publicOutput: MlFieldArray.to(publicOutput),
      previousStatements: MlArray.to(previousStatements),
      shouldVerify: MlArray.to(
        proofs.map((proof) => proof.shouldVerify.toField().value)
      ),
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
  return {
    identifier: methodName,
    main,
    proofsToVerify: MlArray.to(proofsToVerify),
  };
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

let Generic = EmptyNull<Field>();

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
      let proof = arg as Proof<any, any>;
      let types = getStatementType(Proof);
      // TODO this is cumbersome, would be nicer to have a single Provable for the statement stored on Proof
      let type = provablePure({ input: types.input, output: types.output });
      let value = { input: proof.publicInput, output: proof.publicOutput };
      typesAndValues.push({ type, value });
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
  return Provable.witness(type, () => emptyValue(type));
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

function fromFieldVars<T>(type: ProvablePure<T>, fields: MlFieldArray) {
  return type.fromFields(MlFieldArray.from(fields));
}
function toFieldVars<T>(type: ProvablePure<T>, value: T) {
  return MlFieldArray.to(type.toFields(value));
}

function fromFieldConsts<T>(type: ProvablePure<T>, fields: MlFieldConstArray) {
  return type.fromFields(MlFieldConstArray.from(fields));
}
function toFieldConsts<T>(type: ProvablePure<T>, value: T) {
  return MlFieldConstArray.to(type.toFields(value));
}

ZkProgram.Proof = function <
  PublicInputType extends FlexibleProvablePure<any>,
  PublicOutputType extends FlexibleProvablePure<any>
>(program: {
  name: string;
  publicInputType: PublicInputType;
  publicOutputType: PublicOutputType;
}) {
  type PublicInput = InferProvable<PublicInputType>;
  type PublicOutput = InferProvable<PublicOutputType>;
  return class ZkProgramProof extends Proof<PublicInput, PublicOutput> {
    static publicInputType = program.publicInputType;
    static publicOutputType = program.publicOutputType;
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
      let id = snarkContext.enter({ witnesses, proverData, inProver: true });
      try {
        return await callback();
      } finally {
        snarkContext.leave(id);
      }
    },
    getData(): ProverData {
      return snarkContext.get().proverData;
    },
  };
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

type Method<
  PublicInput,
  PublicOutput,
  Args extends Tuple<PrivateInput>
> = PublicInput extends undefined
  ? {
      privateInputs: Args;
      method(...args: TupleToInstances<Args>): PublicOutput;
    }
  : {
      privateInputs: Args;
      method(
        publicInput: PublicInput,
        ...args: TupleToInstances<Args>
      ): PublicOutput;
    };

type Prover<
  PublicInput,
  PublicOutput,
  Args extends Tuple<PrivateInput>
> = PublicInput extends undefined
  ? (
      ...args: TupleToInstances<Args>
    ) => Promise<Proof<PublicInput, PublicOutput>>
  : (
      publicInput: PublicInput,
      ...args: TupleToInstances<Args>
    ) => Promise<Proof<PublicInput, PublicOutput>>;

type ProvableOrUndefined<A> = A extends undefined ? typeof Undefined : A;
type ProvableOrVoid<A> = A extends undefined ? typeof Void : A;

type InferProvableOrUndefined<A> = A extends undefined
  ? undefined
  : InferProvable<A>;
type InferProvableOrVoid<A> = A extends undefined ? void : InferProvable<A>;

type UnwrapPromise<P> = P extends Promise<infer T> ? T : never;

/**
 * helper to get property type from an object, in place of `T[Key]`
 *
 * assume `T extends { Key?: Something }`.
 * if we use `Get<T, Key>` instead of `T[Key]`, we allow `T` to be inferred _without_ the `Key` key,
 * and thus retain the precise type of `T` during inference
 */
type Get<T, Key extends string> = T extends { [K in Key]: infer Value }
  ? Value
  : undefined;
