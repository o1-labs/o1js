import { EmptyUndefined, EmptyVoid } from '../../bindings/lib/generic.js';
import { Snarky, initializeBindings, withThreadPool } from '../../snarky.js';
import { Pickles, Gate } from '../../snarky.js';
import { Field } from '../provable/wrapped.js';
import {
  FlexibleProvable,
  InferProvable,
  ProvablePureExtended,
  Struct,
} from '../provable/types/struct.js';
import {
  InferProvableType,
  provable,
} from '../provable/types/provable-derivers.js';
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
import {
  ProvablePure,
  ProvableType,
  ProvableTypePure,
  ToProvable,
} from '../provable/types/provable-intf.js';
import { prefixToField } from '../../bindings/lib/binable.js';
import { prefixes } from '../../bindings/crypto/constants.js';
import { Subclass, Tuple } from '../util/types.js';
import {
  dummyProof,
  DynamicProof,
  extractProofs,
  extractProofTypes,
  Proof,
  ProofBase,
  ProofClass,
  ProofValue,
} from './proof.js';
import {
  featureFlagsFromGates,
  featureFlagsToMlOption,
} from './feature-flags.js';
import { emptyWitness } from '../provable/types/util.js';
import { InferValue } from '../../bindings/lib/provable-generic.js';
import { DeclaredProof, ZkProgramContext } from './zkprogram-context.js';
import { mapObject, mapToObject, zip } from '../util/arrays.js';

// public API
export {
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
  MethodInterface,
  picklesRuleFromFunction,
  compileProgram,
  analyzeMethod,
  Prover,
  dummyBase64Proof,
  computeMaxProofsVerified,
  RegularProver,
  TupleToInstances,
  PrivateInput,
};

type Undefined = undefined;
const Undefined: ProvablePureExtended<undefined, undefined, null> =
  EmptyUndefined<Field>();
type Empty = Undefined;
const Empty = Undefined;
type Void = undefined;
const Void: ProvablePureExtended<void, void, null> = EmptyVoid<Field>();

function createProgramState() {
  let methodCache: Map<string, unknown> = new Map();
  return {
    setNonPureOutput(value: any[]) {
      methodCache.set('__nonPureOutput__', value);
    },
    getNonPureOutput(): any[] {
      let entry = methodCache.get('__nonPureOutput__');
      if (entry === undefined) return [];
      return entry as any[];
    },
    setAuxiliaryOutput(value: unknown, methodName: string) {
      methodCache.set(methodName, value);
    },
    getAuxiliaryOutput(methodName: string): unknown {
      let entry = methodCache.get(methodName);
      if (entry === undefined)
        throw Error(`Auxiliary value for method ${methodName} not defined`);
      return entry;
    },
    reset(key: string) {
      methodCache.delete(key);
    },
  };
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
    let fields = (proof as ProofBase).publicFields();
    let input = MlFieldConstArray.to(fields.input);
    let output = MlFieldConstArray.to(fields.output);
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
  Config extends {
    publicInput?: ProvableType;
    publicOutput?: ProvableType;
    methods: {
      [I in string]: {
        privateInputs: Tuple<PrivateInput>;
        auxiliaryOutput?: ProvableType;
      };
    };
  },
  Methods extends {
    [I in keyof Config['methods']]: Method<
      InferProvableOrUndefined<Get<Config, 'publicInput'>>,
      InferProvableOrVoid<Get<Config, 'publicOutput'>>,
      Config['methods'][I]
    >;
  },
  // derived types for convenience
  MethodSignatures extends Config['methods'] = Config['methods'],
  PrivateInputs extends {
    [I in keyof Config['methods']]: Config['methods'][I]['privateInputs'];
  } = {
    [I in keyof Config['methods']]: Config['methods'][I]['privateInputs'];
  },
  AuxiliaryOutputs extends {
    [I in keyof MethodSignatures]: Get<MethodSignatures[I], 'auxiliaryOutput'>;
  } = {
    [I in keyof MethodSignatures]: Get<MethodSignatures[I], 'auxiliaryOutput'>;
  }
>(
  config: Config & {
    name: string;
    methods: {
      [I in keyof Config['methods']]: Methods[I];
    };
    overrideWrapDomain?: 0 | 1 | 2;
  }
): {
  name: string;
  maxProofsVerified(): Promise<0 | 1 | 2>;

  compile: (options?: {
    cache?: Cache;
    forceRecompile?: boolean;
    proofsEnabled?: boolean;
  }) => Promise<{
    verificationKey: { data: string; hash: Field };
  }>;
  verify: (
    proof: Proof<
      InferProvableOrUndefined<Get<Config, 'publicInput'>>,
      InferProvableOrVoid<Get<Config, 'publicOutput'>>
    >
  ) => Promise<boolean>;
  digest: () => Promise<string>;
  analyzeMethods: () => Promise<{
    [I in keyof Config['methods']]: UnwrapPromise<
      ReturnType<typeof analyzeMethod>
    >;
  }>;

  publicInputType: ProvableOrUndefined<Get<Config, 'publicInput'>>;
  publicOutputType: ProvableOrVoid<Get<Config, 'publicOutput'>>;
  privateInputTypes: PrivateInputs;
  auxiliaryOutputTypes: AuxiliaryOutputs;
  rawMethods: {
    [I in keyof Config['methods']]: Methods[I]['method'];
  };

  Proof: typeof Proof<
    InferProvableOrUndefined<Get<Config, 'publicInput'>>,
    InferProvableOrVoid<Get<Config, 'publicOutput'>>
  >;

  proofsEnabled: boolean;
  setProofsEnabled(proofsEnabled: boolean): void;
} & {
  [I in keyof Config['methods']]: Prover<
    InferProvableOrUndefined<Get<Config, 'publicInput'>>,
    InferProvableOrVoid<Get<Config, 'publicOutput'>>,
    PrivateInputs[I],
    InferProvableOrUndefined<AuxiliaryOutputs[I]>
  >;
} {
  let doProving = true;

  let methods = config.methods;
  let publicInputType: Provable<any> = ProvableType.get(
    config.publicInput ?? Undefined
  );
  let hasPublicInput =
    publicInputType !== Undefined && publicInputType !== Void;
  let publicOutputType: Provable<any> = ProvableType.get(
    config.publicOutput ?? Void
  );

  let selfTag = { name: config.name };
  type PublicInput = InferProvableOrUndefined<Get<Config, 'publicInput'>>;
  type PublicOutput = InferProvableOrVoid<Get<Config, 'publicOutput'>>;

  class SelfProof extends Proof<PublicInput, PublicOutput> {
    static publicInputType = publicInputType;
    static publicOutputType = publicOutputType;
    static tag = () => selfTag;
  }

  type MethodKey = keyof Config['methods'];
  // TODO remove sort()! Object.keys() has a deterministic order
  let methodKeys: MethodKey[] = Object.keys(methods).sort(); // need to have methods in (any) fixed order
  let methodIntfs = methodKeys.map((key) =>
    sortMethodArguments(
      'program',
      key as string,
      methods[key].privateInputs,
      ProvableType.get(methods[key].auxiliaryOutput) ?? Undefined,
      SelfProof
    )
  );
  let methodFunctions = methodKeys.map((key) => methods[key].method);
  let maxProofsVerified: undefined | 0 | 1 | 2 = undefined;

  async function getMaxProofsVerified() {
    if (maxProofsVerified !== undefined) return maxProofsVerified;
    let methodsMeta = await analyzeMethods();
    let proofs = methodKeys.map((k) => methodsMeta[k].proofs.length);
    maxProofsVerified = computeMaxProofsVerified(proofs);
    return maxProofsVerified;
  }

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
      [I in keyof Methods]: UnwrapPromise<ReturnType<typeof analyzeMethod>>;
    };
  }

  let compileOutput:
    | {
        provers: Pickles.Prover[];
        maxProofsVerified: 0 | 1 | 2;
        verify: (
          statement: Pickles.Statement<FieldConst>,
          proof: Pickles.Proof
        ) => Promise<boolean>;
      }
    | undefined;

  const programState = createProgramState();

  async function compile({
    cache = Cache.FileSystemDefault,
    forceRecompile = false,
    proofsEnabled = undefined as boolean | undefined,
  } = {}) {
    doProving = proofsEnabled ?? doProving;

    if (doProving) {
      let methodsMeta = await analyzeMethods();
      let gates = methodKeys.map((k) => methodsMeta[k].gates);
      let proofs = methodKeys.map((k) => methodsMeta[k].proofs);
      maxProofsVerified = computeMaxProofsVerified(proofs.map((p) => p.length));

      let { provers, verify, verificationKey } = await compileProgram({
        publicInputType,
        publicOutputType,
        methodIntfs,
        methods: methodFunctions,
        gates,
        proofs,
        proofSystemTag: selfTag,
        cache,
        forceRecompile,
        overrideWrapDomain: config.overrideWrapDomain,
        state: programState,
      });

      compileOutput = { provers, verify, maxProofsVerified };
      return { verificationKey };
    } else {
      return {
        verificationKey: VerificationKey.empty(),
      };
    }
  }

  // for each of the methods, create a prover function.
  // in the first step, these are "regular" in that they always expect the public input as the first argument,
  // which is easier to use internally.
  type RegularProver_<K extends MethodKey> = RegularProver<
    PublicInput,
    PublicOutput,
    PrivateInputs[K],
    InferProvableOrUndefined<AuxiliaryOutputs[K]>
  >;

  function toRegularProver<K extends MethodKey>(
    key: K,
    i: number
  ): RegularProver_<K> {
    return async function prove_(publicInput, ...args) {
      if (!doProving) {
        // we step into a ZkProgramContext here to match the context nesting
        // that would happen if proofs were enabled -- otherwise, proofs declared
        // in an inner program could be counted to the outer program
        let id = ZkProgramContext.enter();
        try {
          let { publicOutput, auxiliaryOutput } =
            (hasPublicInput
              ? await (methods[key].method as any)(publicInput, ...args)
              : await (methods[key].method as any)(...args)) ?? {};

          let proof = await SelfProof.dummy(
            publicInput,
            publicOutput,
            await getMaxProofsVerified()
          );
          return { proof, auxiliaryOutput };
        } finally {
          ZkProgramContext.leave(id);
        }
      }

      if (compileOutput === undefined) {
        throw Error(
          `Cannot prove execution of program.${String(
            key
          )}(), no prover found. ` +
            `Try calling \`await program.compile()\` first, this will cache provers in the background.\nIf you compiled your zkProgram with proofs disabled (\`proofsEnabled = false\`), you have to compile it with proofs enabled first.`
        );
      }
      let picklesProver = compileOutput.provers[i];
      let maxProofsVerified = compileOutput.maxProofsVerified;

      let { publicInputFields, publicInputAux } = toFieldAndAuxConsts(
        publicInputType,
        publicInput
      );

      let id = snarkContext.enter({
        witnesses: args,
        inProver: true,
        auxInputData: publicInputAux,
      });

      let result: UnwrapPromise<ReturnType<typeof picklesProver>>;
      try {
        result = await picklesProver(publicInputFields);
      } finally {
        snarkContext.leave(id);
      }

      let auxiliaryType = methodIntfs[i].auxiliaryType;
      let auxiliaryOutputExists =
        auxiliaryType && auxiliaryType.sizeInFields() !== 0;

      let auxiliaryOutput;
      if (auxiliaryOutputExists) {
        auxiliaryOutput = programState.getAuxiliaryOutput(
          methodIntfs[i].methodName
        );

        programState.reset(methodIntfs[i].methodName);
      }

      let [publicOutputFields, proof] = MlPair.from(result);

      let nonPureOutput = programState.getNonPureOutput();

      let publicOutput = fromFieldConsts(
        publicOutputType,
        publicOutputFields,
        nonPureOutput
      );

      programState.reset('__nonPureOutput__');

      return {
        proof: new SelfProof({
          publicInput,
          publicOutput,
          proof,
          maxProofsVerified,
        }),
        auxiliaryOutput,
      };
    };
  }
  let regularProvers = mapToObject(methodKeys, toRegularProver);

  // wrap "regular" provers to remove an `undefined` public input argument,
  // this matches how the method itself was defined in the case of no public input
  type Prover_<K extends MethodKey = MethodKey> = Prover<
    PublicInput,
    PublicOutput,
    PrivateInputs[K],
    InferProvableOrUndefined<AuxiliaryOutputs[K]>
  >;
  type Provers = {
    [K in MethodKey]: Prover_<K>;
  };
  let provers: Provers = mapObject(regularProvers, (prover): Prover_ => {
    if (publicInputType === Undefined || publicInputType === Void) {
      return ((...args: any) => prover(undefined as any, ...args)) as any;
    } else {
      return prover as any;
    }
  });

  function verify(proof: Proof<PublicInput, PublicOutput>) {
    if (!doProving) {
      return Promise.resolve(true);
    }
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

  const program = Object.assign(
    selfTag,
    {
      maxProofsVerified: getMaxProofsVerified,

      compile,
      verify,
      digest,
      analyzeMethods,

      publicInputType: publicInputType as ProvableOrUndefined<
        Get<Config, 'publicInput'>
      >,
      publicOutputType: publicOutputType as ProvableOrVoid<
        Get<Config, 'publicOutput'>
      >,
      privateInputTypes: Object.fromEntries(
        methodKeys.map((key) => [key, methods[key].privateInputs])
      ) as any,
      auxiliaryOutputTypes: Object.fromEntries(
        methodKeys.map((key) => [key, methods[key].auxiliaryOutput])
      ) as any,
      rawMethods: Object.fromEntries(
        methodKeys.map((key) => [key, methods[key].method])
      ) as any,

      Proof: SelfProof,

      proofsEnabled: doProving,
      setProofsEnabled(proofsEnabled: boolean) {
        doProving = proofsEnabled;
      },
    },
    provers
  );

  // Object.assign only shallow-copies, hence we cant use this getter and have to define it explicitly
  Object.defineProperty(program, 'proofsEnabled', {
    get: () => doProving,
  });

  return program;
}

type ZkProgram<
  Config extends {
    publicInput?: ProvableTypePure;
    publicOutput?: ProvableTypePure;
    methods: {
      [I in string]: {
        privateInputs: Tuple<PrivateInput>;
        auxiliaryOutput?: ProvableType;
      };
    };
  },
  Methods extends {
    [I in keyof Config['methods']]: Method<
      InferProvableOrUndefined<Get<Config, 'publicInput'>>,
      InferProvableOrVoid<Get<Config, 'publicOutput'>>,
      Config['methods'][I]
    >;
  }
> = ReturnType<typeof ZkProgram<Config, Methods>>;

class SelfProof<PublicInput, PublicOutput> extends Proof<
  PublicInput,
  PublicOutput
> {}

class VerificationKey extends Struct({
  ...provable({ data: String, hash: Field }),
  toJSON({ data }: { data: string }) {
    return data;
  },
}) {
  static async dummy(): Promise<VerificationKey> {
    await initializeBindings();
    const [, data, hash] = Pickles.dummyVerificationKey();
    return new VerificationKey({
      data,
      hash: Field(hash),
    });
  }
}

function sortMethodArguments(
  programName: string,
  methodName: string,
  privateInputs: unknown[],
  auxiliaryType: Provable<any> | undefined,
  selfProof: Subclass<typeof Proof>
): MethodInterface {
  // replace SelfProof with the actual selfProof
  // TODO this does not handle SelfProof nested in inputs
  privateInputs = privateInputs.map((input) =>
    input === SelfProof ? selfProof : input
  );

  // check if all arguments are provable
  let args: ProvableType<unknown>[] = privateInputs.map((input, i) => {
    if (isProvable(input)) return input;

    throw Error(
      `Argument ${
        i + 1
      } of method ${methodName} is not a provable type: ${input}`
    );
  });

  // extract input proofs to count them and for sanity checks
  // WARNING: this doesn't include internally declared proofs!
  let proofs = args.flatMap(extractProofTypes);
  let numberOfProofs = proofs.length;

  // don't allow base classes for proofs
  proofs.forEach((proof) => {
    if (proof === ProofBase || proof === Proof || proof === DynamicProof) {
      throw Error(
        `You cannot use the \`${proof.name}\` class directly. Instead, define a subclass:\n` +
          `class MyProof extends ${proof.name}<PublicInput, PublicOutput> { ... }`
      );
    }
  });

  // don't allow more than 2 proofs
  if (numberOfProofs > 2) {
    throw Error(
      `${programName}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  return { methodName, args, auxiliaryType };
}

function isProvable(type: unknown): type is ProvableType<unknown> {
  let type_ = ProvableType.get(type);
  return (
    (typeof type_ === 'function' || typeof type_ === 'object') &&
    type_ !== null &&
    ['toFields', 'fromFields', 'sizeInFields', 'toAuxiliary'].every(
      (s) => s in type_
    )
  );
}

function isDynamicProof(
  type: Subclass<typeof ProofBase>
): type is Subclass<typeof DynamicProof> {
  return typeof type === 'function' && type.prototype instanceof DynamicProof;
}

type MethodInterface = {
  methodName: string;
  args: ProvableType<unknown>[];
  returnType?: Provable<any>;
  auxiliaryType?: Provable<any>;
};

// reasonable default choice for `overrideWrapDomain`
const maxProofsToWrapDomain = { 0: 0, 1: 1, 2: 1 } as const;

async function compileProgram({
  publicInputType,
  publicOutputType,
  methodIntfs,
  methods,
  gates,
  proofs,
  proofSystemTag,
  cache,
  forceRecompile,
  overrideWrapDomain,
  state,
}: {
  publicInputType: Provable<any>;
  publicOutputType: Provable<any>;
  methodIntfs: MethodInterface[];
  methods: ((...args: any) => unknown)[];
  gates: Gate[][];
  proofs: ProofClass[][];
  proofSystemTag: { name: string };
  cache: Cache;
  forceRecompile: boolean;
  overrideWrapDomain?: 0 | 1 | 2;
  state?: ReturnType<typeof createProgramState>;
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
      gates[i],
      proofs[i],
      state
    )
  );

  let maxProofs = computeMaxProofsVerified(proofs.map((p) => p.length));
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
      async function picklesProver(publicInput: MlFieldConstArray) {
        return prettifyStacktracePromise(
          withThreadPool(() => prover(publicInput))
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

async function analyzeMethod(
  publicInputType: Provable<any>,
  methodIntf: MethodInterface,
  method: (...args: any) => unknown
) {
  let result: Awaited<ReturnType<typeof Provable.constraintSystem>>;
  let proofs: ProofClass[];
  let id = ZkProgramContext.enter();
  try {
    result = await Provable.constraintSystem(() => {
      let args = methodIntf.args.map(emptyWitness);
      args.forEach((value) =>
        extractProofs(value).forEach((proof) => proof.declare())
      );

      let publicInput = emptyWitness(publicInputType);
      // note: returning the method result here makes this handle async methods
      if (publicInputType === Undefined || publicInputType === Void)
        return method(...args);
      return method(publicInput, ...args);
    });
    proofs = ZkProgramContext.getDeclaredProofs().map(
      ({ ProofClass }) => ProofClass
    );
  } finally {
    ZkProgramContext.leave(id);
  }
  return { ...result, proofs };
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
  publicInputType: Provable<unknown>,
  publicOutputType: Provable<unknown>,
  func: (...args: unknown[]) => unknown,
  proofSystemTag: { name: string },
  { methodName, args, auxiliaryType }: MethodInterface,
  gates: Gate[],
  verifiedProofs: ProofClass[],
  state?: ReturnType<typeof createProgramState>
): Pickles.Rule {
  async function main(
    publicInput: MlFieldArray
  ): ReturnType<Pickles.Rule['main']> {
    let {
      witnesses: argsWithoutPublicInput,
      inProver,
      auxInputData,
    } = snarkContext.get();
    assert(!(inProver && argsWithoutPublicInput === undefined));

    // witness private inputs and declare input proofs
    let id = ZkProgramContext.enter();
    let finalArgs = [];
    for (let i = 0; i < args.length; i++) {
      try {
        let type = args[i];
        let value = Provable.witness(type, () => {
          return argsWithoutPublicInput?.[i] ?? ProvableType.synthesize(type);
        });
        finalArgs[i] = value;

        extractProofs(value).forEach((proof) => proof.declare());
      } catch (e: any) {
        ZkProgramContext.leave(id);
        e.message = `Error when witnessing in ${methodName}, argument ${i}: ${e.message}`;
        throw e;
      }
    }

    // run the user circuit
    let result: { publicOutput?: any; auxiliaryOutput?: any };
    let proofs: DeclaredProof[];

    try {
      if (publicInputType === Undefined || publicInputType === Void) {
        result = (await func(...finalArgs)) as any;
      } else {
        let input = fromFieldVars(publicInputType, publicInput, auxInputData);
        result = (await func(input, ...finalArgs)) as any;
      }
      proofs = ZkProgramContext.getDeclaredProofs();
    } finally {
      ZkProgramContext.leave(id);
    }

    if (result?.publicOutput) {
      // store the nonPure auxiliary data in program state cache if it exists
      let nonPureOutput = publicOutputType.toAuxiliary(result.publicOutput);
      state?.setNonPureOutput(nonPureOutput);
    }

    // now all proofs are declared - check that we got as many as during compile time
    assert(
      proofs.length === verifiedProofs.length,
      `Expected ${verifiedProofs.length} proofs, but got ${proofs.length}`
    );

    // extract proof statements for Pickles
    let previousStatements = proofs.map(
      ({ proofInstance }): Pickles.Statement<FieldVar> => {
        let fields = proofInstance.publicFields();
        let input = MlFieldArray.to(fields.input);
        let output = MlFieldArray.to(fields.output);
        return MlPair(input, output);
      }
    );

    // handle dynamic proofs
    proofs.forEach(({ ProofClass, proofInstance }) => {
      if (!(proofInstance instanceof DynamicProof)) return;

      // Initialize side-loaded verification key
      const tag = ProofClass.tag();
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

    // if the output is empty, we don't evaluate `toFields(result)` to allow the function to return something else in that case
    let hasPublicOutput = publicOutputType.sizeInFields() !== 0;
    let publicOutput = hasPublicOutput
      ? publicOutputType.toFields(result.publicOutput)
      : [];

    if (
      state !== undefined &&
      auxiliaryType !== undefined &&
      auxiliaryType.sizeInFields() !== 0
    ) {
      Provable.asProver(() => {
        let { auxiliaryOutput } = result;
        assert(
          auxiliaryOutput !== undefined,
          `${proofSystemTag.name}.${methodName}(): Auxiliary output is undefined even though the method declares it.`
        );
        state.setAuxiliaryOutput(
          Provable.toConstant(auxiliaryType, auxiliaryOutput),
          methodName
        );
      });
    }

    return {
      publicOutput: MlFieldArray.to(publicOutput),
      previousStatements: MlArray.to(previousStatements),
      previousProofs: MlArray.to(proofs.map((p) => p.proofInstance.proof)),
      shouldVerify: MlArray.to(
        proofs.map((proof) => proof.proofInstance.shouldVerify.toField().value)
      ),
    };
  }

  if (verifiedProofs.length > 2) {
    throw Error(
      `${proofSystemTag.name}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  let proofsToVerify = verifiedProofs.map((Proof) => {
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
          Proof.publicOutputType?.sizeInFields() ?? 0,
          featureFlagsToMlOption(Proof.featureFlags)
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

  let featureFlags = featureFlagsToMlOption(featureFlagsFromGates(gates));

  return {
    identifier: methodName,
    main,
    featureFlags,
    proofsToVerify: MlArray.to(proofsToVerify),
  };
}

function computeMaxProofsVerified(proofs: number[]) {
  return proofs.reduce((acc: number, n) => {
    assert(n <= 2, 'Too many proofs');
    return Math.max(acc, n);
  }, 0) as 0 | 1 | 2;
}

function fromFieldVars<T>(
  type: Provable<T>,
  fields: MlFieldArray,
  auxData: any[] = []
) {
  return type.fromFields(MlFieldArray.from(fields), auxData);
}

function fromFieldConsts<T>(
  type: Provable<T>,
  fields: MlFieldConstArray,
  aux: any[] = []
) {
  return type.fromFields(MlFieldConstArray.from(fields), aux);
}

function toFieldConsts<T>(type: Provable<T>, value: T) {
  return MlFieldConstArray.to(type.toFields(value));
}

function toFieldAndAuxConsts<T>(type: Provable<T>, value: T) {
  return {
    publicInputFields: MlFieldConstArray.to(type.toFields(value)),
    publicInputAux: type.toAuxiliary(value),
  };
}

ZkProgram.Proof = function <
  PublicInputType extends FlexibleProvable<any>,
  PublicOutputType extends FlexibleProvable<any>
>(program: {
  name: string;
  publicInputType: PublicInputType;
  publicOutputType: PublicOutputType;
}): typeof Proof<
  InferProvable<PublicInputType>,
  InferProvable<PublicOutputType>
> & {
  provable: Provable<
    Proof<InferProvable<PublicInputType>, InferProvable<PublicOutputType>>,
    ProofValue<InferValue<PublicInputType>, InferValue<PublicOutputType>>
  >;
} {
  return class ZkProgramProof extends Proof<any, any> {
    static publicInputType = program.publicInputType;
    static publicOutputType = program.publicOutputType;
    static tag = () => program;
  };
};

let dummyProofCache: string | undefined;

async function dummyBase64Proof() {
  if (dummyProofCache) return dummyProofCache;
  let proof = await dummyProof(2, 15);
  let base64Proof = Pickles.proofToBase64([2, proof]);
  dummyProofCache = base64Proof;
  return base64Proof;
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
  : T extends ProvableType
  ? InferProvableType<T>
  : never;

type TupleToInstances<T> = {
  [I in keyof T]: Infer<T[I]>;
};

type PrivateInput = ProvableType | Subclass<typeof ProofBase>;

type MethodReturnType<PublicOutput, AuxiliaryOutput> = PublicOutput extends void
  ? AuxiliaryOutput extends undefined
    ? void
    : {
        auxiliaryOutput: AuxiliaryOutput;
      }
  : AuxiliaryOutput extends undefined
  ? {
      publicOutput: PublicOutput;
    }
  : {
      publicOutput: PublicOutput;
      auxiliaryOutput: AuxiliaryOutput;
    };

type Method<
  PublicInput,
  PublicOutput,
  MethodSignature extends {
    privateInputs: Tuple<PrivateInput>;
    auxiliaryOutput?: ProvableType;
  }
> = PublicInput extends undefined
  ? {
      method(
        ...args: TupleToInstances<MethodSignature['privateInputs']>
      ): Promise<
        MethodReturnType<
          PublicOutput,
          InferProvableOrUndefined<Get<MethodSignature, 'auxiliaryOutput'>>
        >
      >;
    }
  : {
      method(
        publicInput: PublicInput,
        ...args: TupleToInstances<MethodSignature['privateInputs']>
      ): Promise<
        MethodReturnType<
          PublicOutput,
          InferProvableOrUndefined<Get<MethodSignature, 'auxiliaryOutput'>>
        >
      >;
    };

type RegularProver<
  PublicInput,
  PublicOutput,
  Args extends Tuple<PrivateInput>,
  AuxiliaryOutput
> = (
  publicInput: PublicInput,
  ...args: TupleToInstances<Args>
) => Promise<{
  proof: Proof<PublicInput, PublicOutput>;
  auxiliaryOutput: AuxiliaryOutput;
}>;

type Prover<
  PublicInput,
  PublicOutput,
  Args extends Tuple<PrivateInput>,
  AuxiliaryOutput
> = PublicInput extends undefined
  ? (...args: TupleToInstances<Args>) => Promise<{
      proof: Proof<PublicInput, PublicOutput>;
      auxiliaryOutput: AuxiliaryOutput;
    }>
  : (
      publicInput: PublicInput,
      ...args: TupleToInstances<Args>
    ) => Promise<{
      proof: Proof<PublicInput, PublicOutput>;
      auxiliaryOutput: AuxiliaryOutput;
    }>;

type ProvableOrUndefined<A> = A extends undefined
  ? typeof Undefined
  : ToProvable<A>;
type ProvableOrVoid<A> = A extends undefined ? typeof Void : ToProvable<A>;

type InferProvableOrUndefined<A> = A extends undefined
  ? undefined
  : A extends ProvableType
  ? InferProvable<A>
  : InferProvable<A> | undefined;
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
