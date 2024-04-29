import {
  EmptyNull,
  EmptyUndefined,
  EmptyVoid,
} from '../../bindings/lib/generic.js';
import { Snarky, initializeBindings, withThreadPool } from '../../snarky.js';
import {
  Pickles,
  FeatureFlags,
  MlFeatureFlags,
  Gate,
  GateType,
} from '../../snarky.js';
import { Field, Bool } from '../provable/wrapped.js';
import {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  ProvablePureExtended,
  Struct,
  provable,
  provablePure,
} from '../provable/types/struct.js';
import { Provable } from '../provable/provable.js';
import { assert, prettifyStacktracePromise } from '../util/errors.js';
import { snarkContext } from '../provable/core/provable-context.js';
import { hashConstant } from '../provable/crypto/poseidon.js';
import { MlArray, MlBool, MlResult, MlPair } from '../ml/base.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { FieldVar, FieldConst } from '../provable/core/fieldvar.js';
import { Cache, readCache, writeCache } from './cache.js';
import {
  decodeProverKey,
  encodeProverKey,
  parseHeader,
} from './prover-keys.js';
import {
  setSrsCache,
  unsetSrsCache,
} from '../../bindings/crypto/bindings/srs.js';
import { ProvablePure } from '../provable/types/provable-intf.js';
import { prefixToField } from '../../bindings/lib/binable.js';
import { prefixes } from '../../bindings/crypto/constants.js';

// public API
export {
  Proof,
  DynamicProof,
  SelfProof,
  JsonProof,
  ZkProgram,
  verify,
  Empty,
  Undefined,
  Void,
  VerificationKey,
};

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
  methodArgumentTypesAndValues,
  isAsFields,
  Prover,
  dummyBase64Proof,
};

type Undefined = undefined;
const Undefined: ProvablePureExtended<undefined, undefined, null> =
  EmptyUndefined<Field>();
type Empty = Undefined;
const Empty = Undefined;
type Void = undefined;
const Void: ProvablePureExtended<void, void, null> = EmptyVoid<Field>();

class ProofBase<Input, Output> {
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

  toJSON(): JsonProof {
    let type = getStatementType(this.constructor as any);
    return {
      publicInput: type.input.toFields(this.publicInput).map(String),
      publicOutput: type.output.toFields(this.publicOutput).map(String),
      maxProofsVerified: this.maxProofsVerified,
      proof: Pickles.proofToBase64([this.maxProofsVerified, this.proof]),
    };
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

class Proof<Input, Output> extends ProofBase<Input, Output> {
  verify() {
    this.shouldVerify = Bool(true);
  }
  verifyIf(condition: Bool) {
    this.shouldVerify = condition;
  }

  static async fromJSON<S extends Subclass<typeof Proof>>(
    this: S,
    {
      maxProofsVerified,
      proof: proofString,
      publicInput: publicInputJson,
      publicOutput: publicOutputJson,
    }: JsonProof
  ): Promise<
    Proof<
      InferProvable<S['publicInputType']>,
      InferProvable<S['publicOutputType']>
    >
  > {
    await initializeBindings();
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

  /**
   * Dummy proof. This can be useful for ZkPrograms that handle the base case in the same
   * method as the inductive case, using a pattern like this:
   *
   * ```ts
   * method(proof: SelfProof<I, O>, isRecursive: Bool) {
   *   proof.verifyIf(isRecursive);
   *   // ...
   * }
   * ```
   *
   * To use such a method in the base case, you need a dummy proof:
   *
   * ```ts
   * let dummy = await MyProof.dummy(publicInput, publicOutput, 1);
   * await myProgram.myMethod(dummy, Bool(false));
   * ```
   *
   * **Note**: The types of `publicInput` and `publicOutput`, as well as the `maxProofsVerified` parameter,
   * must match your ZkProgram. `maxProofsVerified` is the maximum number of proofs that any of your methods take as arguments.
   */
  static async dummy<Input, OutPut>(
    publicInput: Input,
    publicOutput: OutPut,
    maxProofsVerified: 0 | 1 | 2,
    domainLog2: number = 14
  ): Promise<Proof<Input, OutPut>> {
    let dummyRaw = await dummyProof(maxProofsVerified, domainLog2);
    return new this({
      publicInput,
      publicOutput,
      proof: dummyRaw,
      maxProofsVerified,
    });
  }
}

var sideloadedKeysCounter = 0;

/**
 * The `DynamicProof` class enables circuits to verify proofs using in-ciruit verfication keys.
 * This is opposed to the baked-in verification keys of the `Proof` class.
 *
 * In order to use this, a subclass of DynamicProof that specifies the public input and output types along with the maxProofsVerified number has to be created.
 *
 * ```ts
 * export class SideloadedProgramProof extends DynamicProof<MyStruct, Field> {
 *   static publicInputType = MyStruct;
 *   static publicOutputType = Field;
 *   static maxProofsVerified = 0 as const;
 * }
 * ```
 *
 * The `maxProofsVerified` constant is a product of the child circuit and indicates the maximum number that that circuit verifies itself.
 * If you are unsure about what that is for you, you should use `2`.
 *
 * Any `DynamicProof` subclass can be used as private input to ZkPrograms or SmartContracts along with a `VerificationKey` input.
 * ```ts
 * proof.verify(verificationKey)
 * ```
 *
 * NOTE: In the case of `DynamicProof`s, the circuit makes no assertions about the verificationKey used on its own.
 * This is the responsibility of the application developer and should always implement appropriate checks.
 * This pattern differs a lot from the usage of normal `Proof`, where the verification key is baked into the compiled circuit.
 * @see {@link src/examples/zkprogram/dynamic-keys-merkletree.ts} for an example of how this can be done using merkle trees
 *
 * Assertions generally only happen using the vk hash that is part of the `VerificationKey` struct along with the raw vk data as auxilary data.
 * When using verify() on a `DynamicProof`, Pickles makes sure that the verification key data matches the hash.
 * Therefore all manual assertions have to be made on the vk's hash and it can be assumed that the vk's data is checked to match the hash if it is used with verify().
 */
class DynamicProof<Input, Output> extends ProofBase<Input, Output> {
  public static maxProofsVerified: 0 | 1 | 2;

  private static memoizedCounter: number | undefined;

  static tag() {
    let counter: number;
    if (this.memoizedCounter !== undefined) {
      counter = this.memoizedCounter;
    } else {
      counter = sideloadedKeysCounter++;
      this.memoizedCounter = counter;
    }
    return { name: `o1js-sideloaded-${counter}` };
  }

  usedVerificationKey?: VerificationKey;

  /**
   * Verifies this DynamicProof using a given verification key
   * @param vk The verification key this proof will be verified against
   */
  verify(vk: VerificationKey) {
    this.shouldVerify = Bool(true);
    this.usedVerificationKey = vk;
  }
  verifyIf(vk: VerificationKey, condition: Bool) {
    this.shouldVerify = condition;
    this.usedVerificationKey = vk;
  }

  static async fromJSON<S extends Subclass<typeof DynamicProof>>(
    this: S,
    {
      maxProofsVerified,
      proof: proofString,
      publicInput: publicInputJson,
      publicOutput: publicOutputJson,
    }: JsonProof
  ): Promise<
    DynamicProof<
      InferProvable<S['publicInputType']>,
      InferProvable<S['publicOutputType']>
    >
  > {
    await initializeBindings();
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

  static async dummy<S extends Subclass<typeof DynamicProof>>(
    this: S,
    publicInput: InferProvable<S['publicInputType']>,
    publicOutput: InferProvable<S['publicOutputType']>,
    maxProofsVerified: 0 | 1 | 2,
    domainLog2: number = 14
  ): Promise<InstanceType<S>> {
    return this.fromProof(
      await Proof.dummy<
        InferProvable<S['publicInputType']>,
        InferProvable<S['publicOutputType']>
      >(publicInput, publicOutput, maxProofsVerified, domainLog2)
    );
  }

  /**
   * Converts a Proof into a DynamicProof carrying over all relevant data.
   * This method can be used to convert a Proof computed by a ZkProgram
   * into a DynamicProof that is accepted in a circuit that accepts DynamicProofs
   */
  static fromProof<S extends Subclass<typeof DynamicProof>>(
    this: S,
    proof: Proof<
      InferProvable<S['publicInputType']>,
      InferProvable<S['publicOutputType']>
    >
  ): InstanceType<S> {
    return new this({
      publicInput: proof.publicInput,
      publicOutput: proof.publicOutput,
      maxProofsVerified: proof.maxProofsVerified,
      proof: proof.proof,
    }) as InstanceType<S>;
  }
}

async function verify(
  proof: ProofBase<any, any> | JsonProof,
  verificationKey: string | VerificationKey
) {
  await initializeBindings();
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
    statement = MlPair(input, output);
  } else {
    // proof class
    picklesProof = proof.proof;
    let type = getStatementType(proof.constructor as any);
    let input = toFieldConsts(type.input, proof.publicInput);
    let output = toFieldConsts(type.output, proof.publicOutput);
    statement = MlPair(input, output);
  }
  let vk =
    typeof verificationKey === 'string'
      ? verificationKey
      : verificationKey.data;
  return prettifyStacktracePromise(
    withThreadPool(() => Pickles.verify(statement, picklesProof, vk))
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

let sideloadedKeysMap: Record<string, unknown> = {};
let SideloadedTag = {
  get(tag: string): unknown | undefined {
    return sideloadedKeysMap[tag];
  },
  store(tag: string, compiledTag: unknown) {
    sideloadedKeysMap[tag] = compiledTag;
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
    name: string;
    methods: {
      [I in keyof Types]: Method<
        InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
        InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
        Types[I]
      >;
    };
    overrideWrapDomain?: 0 | 1 | 2;
  }
): {
  name: string;
  compile: (options?: { cache?: Cache; forceRecompile?: boolean }) => Promise<{
    verificationKey: { data: string; hash: Field };
  }>;
  verify: (
    proof: Proof<
      InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
      InferProvableOrVoid<Get<StatementType, 'publicOutput'>>
    >
  ) => Promise<boolean>;
  digest: () => Promise<string>;
  analyzeMethods: () => Promise<{
    [I in keyof Types]: UnwrapPromise<ReturnType<typeof analyzeMethod>>;
  }>;
  publicInputType: ProvableOrUndefined<Get<StatementType, 'publicInput'>>;
  publicOutputType: ProvableOrVoid<Get<StatementType, 'publicOutput'>>;
  privateInputTypes: {
    [I in keyof Types]: Method<
      InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
      InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
      Types[I]
    >['privateInputs'];
  };
  rawMethods: {
    [I in keyof Types]: Method<
      InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
      InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
      Types[I]
    >['method'];
  };
} & {
  [I in keyof Types]: Prover<
    InferProvableOrUndefined<Get<StatementType, 'publicInput'>>,
    InferProvableOrVoid<Get<StatementType, 'publicOutput'>>,
    Types[I]
  >;
} {
  let methods = config.methods;
  let publicInputType: ProvablePure<any> = config.publicInput ?? Undefined;
  let publicOutputType: ProvablePure<any> = config.publicOutput ?? Void;

  let selfTag = { name: config.name };
  type PublicInput = InferProvableOrUndefined<
    Get<StatementType, 'publicInput'>
  >;
  type PublicOutput = InferProvableOrVoid<Get<StatementType, 'publicOutput'>>;

  class SelfProof extends Proof<PublicInput, PublicOutput> {
    static publicInputType = publicInputType;
    static publicOutputType = publicOutputType;
    static tag = () => selfTag;
  }

  // TODO remove sort()! Object.keys() has a deterministic order
  let methodKeys: (keyof Types & string)[] = Object.keys(methods).sort(); // need to have methods in (any) fixed order
  let methodIntfs = methodKeys.map((key) =>
    sortMethodArguments('program', key, methods[key].privateInputs, SelfProof)
  );
  let methodFunctions = methodKeys.map((key) => methods[key].method);
  let maxProofsVerified = getMaxProofsVerified(methodIntfs);

  async function analyzeMethods() {
    let methodsMeta: Record<
      string,
      UnwrapPromise<ReturnType<typeof analyzeMethod>>
    > = {};
    for (let i = 0; i < methodIntfs.length; i++) {
      let methodEntry = methodIntfs[i];
      methodsMeta[methodEntry.methodName] = await analyzeMethod(
        publicInputType,
        methodEntry,
        methodFunctions[i]
      );
    }
    return methodsMeta as {
      [I in keyof Types]: UnwrapPromise<ReturnType<typeof analyzeMethod>>;
    };
  }

  let compileOutput:
    | {
        provers: Pickles.Prover[];
        verify: (
          statement: Pickles.Statement<FieldConst>,
          proof: Pickles.Proof
        ) => Promise<boolean>;
      }
    | undefined;

  async function compile({
    cache = Cache.FileSystemDefault,
    forceRecompile = false,
  } = {}) {
    let methodsMeta = await analyzeMethods();
    let gates = methodKeys.map((k) => methodsMeta[k].gates);
    let { provers, verify, verificationKey } = await compileProgram({
      publicInputType,
      publicOutputType,
      methodIntfs,
      methods: methodFunctions,
      gates,
      proofSystemTag: selfTag,
      cache,
      forceRecompile,
      overrideWrapDomain: config.overrideWrapDomain,
    });
    compileOutput = { provers, verify };
    return { verificationKey };
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
      let [publicOutputFields, proof] = MlPair.from(result);
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
  let provers = Object.fromEntries(methodKeys.map(toProver)) as {
    [I in keyof Types]: Prover<PublicInput, PublicOutput, Types[I]>;
  };

  function verify(proof: Proof<PublicInput, PublicOutput>) {
    if (compileOutput?.verify === undefined) {
      throw Error(
        `Cannot verify proof, verification key not found. Try calling \`await program.compile()\` first.`
      );
    }
    let statement = MlPair(
      toFieldConsts(publicInputType, proof.publicInput),
      toFieldConsts(publicOutputType, proof.publicOutput)
    );
    return compileOutput.verify(statement, proof.proof);
  }

  async function digest() {
    let methodsMeta = await analyzeMethods();
    let digests: Field[] = methodKeys.map((k) =>
      Field(BigInt('0x' + methodsMeta[k].digest))
    );
    return hashConstant(digests).toBigInt().toString(16);
  }

  return Object.assign(
    selfTag,
    {
      compile,
      verify,
      digest,
      analyzeMethods,
      publicInputType: publicInputType as ProvableOrUndefined<
        Get<StatementType, 'publicInput'>
      >,
      publicOutputType: publicOutputType as ProvableOrVoid<
        Get<StatementType, 'publicOutput'>
      >,
      privateInputTypes: Object.fromEntries(
        methodKeys.map((key) => [key, methods[key].privateInputs])
      ) as any,
      rawMethods: Object.fromEntries(
        methodKeys.map((key) => [key, methods[key].method])
      ) as any,
    },
    provers
  );
}

type ZkProgram<
  S extends {
    publicInput?: FlexibleProvablePure<any>;
    publicOutput?: FlexibleProvablePure<any>;
  },
  T extends {
    [I in string]: Tuple<PrivateInput>;
  }
> = ReturnType<typeof ZkProgram<S, T>>;

let i = 0;

class SelfProof<PublicInput, PublicOutput> extends Proof<
  PublicInput,
  PublicOutput
> {}

class VerificationKey extends Struct({
  ...provable({ data: String, hash: Field }),
  toJSON({ data }: { data: string }) {
    return data;
  },
}) {}

function sortMethodArguments(
  programName: string,
  methodName: string,
  privateInputs: unknown[],
  selfProof: Subclass<typeof Proof>
): MethodInterface {
  let witnessArgs: Provable<unknown>[] = [];
  let proofArgs: Subclass<typeof ProofBase>[] = [];
  let allArgs: { type: 'proof' | 'witness'; index: number }[] = [];
  for (let i = 0; i < privateInputs.length; i++) {
    let privateInput = privateInputs[i];
    if (isProof(privateInput)) {
      if (
        privateInput === ProofBase ||
        privateInput === Proof ||
        privateInput === DynamicProof
      ) {
        const proofClassName = privateInput.name;
        throw Error(
          `You cannot use the \`${proofClassName}\` class directly. Instead, define a subclass:\n` +
            `class MyProof extends ${proofClassName}<PublicInput, PublicOutput> { ... }`
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
    } else if (isAsFields((privateInput as any)?.provable)) {
      allArgs.push({ type: 'witness', index: witnessArgs.length });
      witnessArgs.push((privateInput as any).provable);
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
  return { methodName, witnessArgs, proofArgs, allArgs };
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
function isProof(type: unknown): type is typeof ProofBase {
  // the third case covers subclasses
  return (
    type === Proof ||
    type === DynamicProof ||
    (typeof type === 'function' && type.prototype instanceof ProofBase)
  );
}

function isDynamicProof(
  type: Subclass<typeof ProofBase>
): type is Subclass<typeof DynamicProof> {
  return typeof type === 'function' && type.prototype instanceof DynamicProof;
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
  // proofs should just be `Provable<T>` as well
  witnessArgs: Provable<unknown>[];
  proofArgs: Subclass<typeof ProofBase>[];
  allArgs: { type: 'witness' | 'proof'; index: number }[];
  returnType?: Provable<any>;
};

// reasonable default choice for `overrideWrapDomain`
const maxProofsToWrapDomain = { 0: 0, 1: 1, 2: 1 } as const;

async function compileProgram({
  publicInputType,
  publicOutputType,
  methodIntfs,
  methods,
  gates,
  proofSystemTag,
  cache,
  forceRecompile,
  overrideWrapDomain,
}: {
  publicInputType: ProvablePure<any>;
  publicOutputType: ProvablePure<any>;
  methodIntfs: MethodInterface[];
  methods: ((...args: any) => unknown)[];
  gates: Gate[][];
  proofSystemTag: { name: string };
  cache: Cache;
  forceRecompile: boolean;
  overrideWrapDomain?: 0 | 1 | 2;
}) {
  await initializeBindings();
  if (methodIntfs.length === 0)
    throw Error(`The Program you are trying to compile has no methods. 
Try adding a method to your ZkProgram or SmartContract.
If you are using a SmartContract, make sure you are using the @method decorator.`);

  let rules = methodIntfs.map((methodEntry, i) =>
    picklesRuleFromFunction(
      publicInputType,
      publicOutputType,
      methods[i],
      proofSystemTag,
      methodEntry,
      gates[i]
    )
  );
  let maxProofs = getMaxProofsVerified(methodIntfs);
  overrideWrapDomain ??= maxProofsToWrapDomain[maxProofs];

  let picklesCache: Pickles.Cache = [
    0,
    function read_(mlHeader) {
      if (forceRecompile) return MlResult.unitError();
      let header = parseHeader(proofSystemTag.name, methodIntfs, mlHeader);
      let result = readCache(cache, header, (bytes) =>
        decodeProverKey(mlHeader, bytes)
      );
      if (result === undefined) return MlResult.unitError();
      return MlResult.ok(result);
    },
    function write_(mlHeader, value) {
      if (!cache.canWrite) return MlResult.unitError();

      let header = parseHeader(proofSystemTag.name, methodIntfs, mlHeader);
      let didWrite = writeCache(cache, header, encodeProverKey(value));

      if (!didWrite) return MlResult.unitError();
      return MlResult.ok(undefined);
    },
    MlBool(cache.canWrite),
  ];

  let { verificationKey, provers, verify, tag } =
    await prettifyStacktracePromise(
      withThreadPool(async () => {
        let result: ReturnType<typeof Pickles.compile>;
        let id = snarkContext.enter({ inCompile: true });
        setSrsCache(cache);
        try {
          result = Pickles.compile(MlArray.to(rules), {
            publicInputSize: publicInputType.sizeInFields(),
            publicOutputSize: publicOutputType.sizeInFields(),
            storable: picklesCache,
            overrideWrapDomain,
          });
          let { getVerificationKey, provers, verify, tag } = result;
          CompiledTag.store(proofSystemTag, tag);
          let [, data, hash] = await getVerificationKey();
          let verificationKey = { data, hash: Field(hash) };
          return {
            verificationKey,
            provers: MlArray.from(provers),
            verify,
            tag,
          };
        } finally {
          snarkContext.leave(id);
          unsetSrsCache();
        }
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

function analyzeMethod(
  publicInputType: ProvablePure<any>,
  methodIntf: MethodInterface,
  method: (...args: any) => unknown
) {
  return Provable.constraintSystem(() => {
    let args = synthesizeMethodArguments(methodIntf, true);
    let publicInput = emptyWitness(publicInputType);
    // note: returning the method result here makes this handle async methods
    if (publicInputType === Undefined || publicInputType === Void)
      return method(...args);
    return method(publicInput, ...args);
  });
}

function inCircuitVkHash(inCircuitVk: unknown): Field {
  const digest = Pickles.sideLoaded.vkDigest(inCircuitVk);

  const salt = Snarky.poseidon.update(
    MlFieldArray.to([Field(0), Field(0), Field(0)]),
    MlFieldArray.to([prefixToField(Field, prefixes.sideLoadedVK)])
  );

  const newState = Snarky.poseidon.update(salt, digest);
  const stateFields = MlFieldArray.from(newState) as [Field, Field, Field];
  return stateFields[0];
}

function picklesRuleFromFunction(
  publicInputType: ProvablePure<unknown>,
  publicOutputType: ProvablePure<unknown>,
  func: (...args: unknown[]) => unknown,
  proofSystemTag: { name: string },
  { methodName, witnessArgs, proofArgs, allArgs }: MethodInterface,
  gates: Gate[]
): Pickles.Rule {
  async function main(
    publicInput: MlFieldArray
  ): ReturnType<Pickles.Rule['main']> {
    let { witnesses: argsWithoutPublicInput, inProver } = snarkContext.get();
    assert(!(inProver && argsWithoutPublicInput === undefined));
    let finalArgs = [];
    let proofs: {
      proofInstance: ProofBase<any, any>;
      classReference: Subclass<typeof ProofBase<any, any>>;
    }[] = [];
    let previousStatements: Pickles.Statement<FieldVar>[] = [];
    for (let i = 0; i < allArgs.length; i++) {
      let arg = allArgs[i];
      if (arg.type === 'witness') {
        let type = witnessArgs[arg.index];
        try {
          finalArgs[i] = Provable.witness(type, () => {
            return argsWithoutPublicInput?.[i] ?? emptyValue(type);
          });
        } catch (e: any) {
          e.message = `Error when witnessing in ${methodName}, argument ${i}: ${e.message}`;
          throw e;
        }
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
        proofs.push({ proofInstance, classReference: Proof });
        let input = toFieldVars(type.input, publicInput);
        let output = toFieldVars(type.output, publicOutput);
        previousStatements.push(MlPair(input, output));
      }
    }
    let result: any;
    if (publicInputType === Undefined || publicInputType === Void) {
      result = await func(...finalArgs);
    } else {
      let input = fromFieldVars(publicInputType, publicInput);
      result = await func(input, ...finalArgs);
    }

    proofs.forEach(({ proofInstance, classReference }) => {
      if (!(proofInstance instanceof DynamicProof)) {
        return;
      }
      // Initialize side-loaded verification key
      const tag = classReference.tag();
      const computedTag = SideloadedTag.get(tag.name);
      const vk = proofInstance.usedVerificationKey;

      if (vk === undefined) {
        throw new Error(
          'proof.verify() not called, call it at least once in your circuit'
        );
      }

      if (Provable.inProver()) {
        Pickles.sideLoaded.inProver(computedTag, vk.data);
      }
      const circuitVk = Pickles.sideLoaded.vkToCircuit(() => vk.data);

      // Assert the validity of the auxiliary vk-data by comparing the witnessed and computed hash
      const hash = inCircuitVkHash(circuitVk);
      Field(hash).assertEquals(
        vk.hash,
        'Provided VerificationKey hash not correct'
      );
      Pickles.sideLoaded.inCircuit(computedTag, circuitVk);
    });

    // if the public output is empty, we don't evaluate `toFields(result)` to allow the function to return something else in that case
    let hasPublicOutput = publicOutputType.sizeInFields() !== 0;
    let publicOutput = hasPublicOutput ? publicOutputType.toFields(result) : [];
    return {
      publicOutput: MlFieldArray.to(publicOutput),
      previousStatements: MlArray.to(previousStatements),
      shouldVerify: MlArray.to(
        proofs.map((proof) => proof.proofInstance.shouldVerify.toField().value)
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
    else if (isDynamicProof(Proof)) {
      let computedTag: unknown;
      // Only create the tag if it hasn't already been created for this specific Proof class
      if (SideloadedTag.get(tag.name) === undefined) {
        computedTag = Pickles.sideLoaded.create(
          tag.name,
          Proof.maxProofsVerified,
          Proof.publicInputType?.sizeInFields() ?? 0,
          Proof.publicOutputType?.sizeInFields() ?? 0
        );
        SideloadedTag.store(tag.name, computedTag);
      } else {
        computedTag = SideloadedTag.get(tag.name);
      }
      return { isSelf: false, tag: computedTag };
    } else {
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

  let featureFlags = computeFeatureFlags(gates);

  return {
    identifier: methodName,
    main,
    featureFlags,
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
      constArgs.push(Provable.toConstant(witnessArgs[index], arg));
    } else if (type === 'proof') {
      let Proof = proofArgs[index];
      let type = getStatementType(Proof);
      let publicInput = Provable.toConstant(type.input, arg.publicInput);
      let publicOutput = Provable.toConstant(type.output, arg.publicOutput);
      constArgs.push(
        new Proof({ publicInput, publicOutput, proof: arg.proof })
      );
    }
  }
  return constArgs;
}

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
      let proof = arg as ProofBase<any, any>;
      let types = getStatementType(Proof);
      // TODO this is cumbersome, would be nicer to have a single Provable for the statement stored on Proof
      let type = provablePure({ input: types.input, output: types.output });
      let value = { input: proof.publicInput, output: proof.publicOutput };
      typesAndValues.push({ type, value });
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
  P extends Subclass<typeof ProofBase> = typeof ProofBase
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

function getMaxProofsVerified(methodIntfs: MethodInterface[]) {
  return methodIntfs.reduce(
    (acc, { proofArgs }) => Math.max(acc, proofArgs.length),
    0
  ) as any as 0 | 1 | 2;
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

async function dummyProof(maxProofsVerified: 0 | 1 | 2, domainLog2: number) {
  await initializeBindings();
  return withThreadPool(
    async () => Pickles.dummyProof(maxProofsVerified, domainLog2)[1]
  );
}

let dummyProofCache: string | undefined;

async function dummyBase64Proof() {
  if (dummyProofCache) return dummyProofCache;
  let proof = await dummyProof(2, 15);
  let base64Proof = Pickles.proofToBase64([2, proof]);
  dummyProofCache = base64Proof;
  return base64Proof;
}

// what feature flags to set to enable certain gate types

const gateToFlag: Partial<Record<GateType, keyof FeatureFlags>> = {
  RangeCheck0: 'rangeCheck0',
  RangeCheck1: 'rangeCheck1',
  ForeignFieldAdd: 'foreignFieldAdd',
  ForeignFieldMul: 'foreignFieldMul',
  Xor16: 'xor',
  Rot64: 'rot',
  Lookup: 'lookup',
};

function computeFeatureFlags(gates: Gate[]): MlFeatureFlags {
  let flags: FeatureFlags = {
    rangeCheck0: false,
    rangeCheck1: false,
    foreignFieldAdd: false,
    foreignFieldMul: false,
    xor: false,
    rot: false,
    lookup: false,
    runtimeTables: false,
  };
  for (let gate of gates) {
    let flag = gateToFlag[gate.type];
    if (flag !== undefined) flags[flag] = true;
  }
  return [
    0,
    MlBool(flags.rangeCheck0),
    MlBool(flags.rangeCheck1),
    MlBool(flags.foreignFieldAdd),
    MlBool(flags.foreignFieldMul),
    MlBool(flags.xor),
    MlBool(flags.rot),
    MlBool(flags.lookup),
    MlBool(flags.runtimeTables),
  ];
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

type Infer<T> = T extends Subclass<typeof ProofBase>
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

type PrivateInput = Provable<any> | Subclass<typeof ProofBase>;

type Method<
  PublicInput,
  PublicOutput,
  Args extends Tuple<PrivateInput>
> = PublicInput extends undefined
  ? {
      privateInputs: Args;
      method(...args: TupleToInstances<Args>): Promise<PublicOutput>;
    }
  : {
      privateInputs: Args;
      method(
        publicInput: PublicInput,
        ...args: TupleToInstances<Args>
      ): Promise<PublicOutput>;
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
