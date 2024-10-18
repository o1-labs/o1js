import { EmptyUndefined, EmptyVoid } from '../../bindings/lib/generic.js';
import { Snarky, initializeBindings, withThreadPool } from '../../snarky.js';
import { Pickles, Gate } from '../../snarky.js';
import { Field } from '../provable/wrapped.js';
import {
  FlexibleProvablePure,
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
  ProofValue,
} from './proof.js';
import {
  featureFlagsFromGates,
  featureFlagsToMlOption,
} from './feature-flags.js';
import { emptyWitness } from '../provable/types/util.js';
import { InferValue } from '../../bindings/lib/provable-generic.js';

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
  getPreviousProofsForProver,
  MethodInterface,
  picklesRuleFromFunction,
  compileProgram,
  analyzeMethod,
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

function createProgramState() {
  let methodCache: Map<string, unknown> = new Map();

  return {
    setAuxiliaryOutput(value: unknown, methodName: string) {
      methodCache.set(methodName, value);
    },
    getAuxiliaryOutput(methodName: string): unknown {
      let entry = methodCache.get(methodName);
      if (entry === undefined)
        throw Error(`Auxiliary value for method ${methodName} not defined`);
      return entry;
    },
    reset(methodName: string) {
      methodCache.delete(methodName);
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
  },
  // derived types for convenience
  MethodSignatures extends Config['methods'] = Config['methods'],
  PrivateInputs extends {
    [I in keyof MethodSignatures]: MethodSignatures[I]['privateInputs'];
  } = {
    [I in keyof MethodSignatures]: MethodSignatures[I]['privateInputs'];
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
  let publicInputType: ProvablePure<any> = ProvableType.get(
    config.publicInput ?? Undefined
  );
  let publicOutputType: ProvablePure<any> = ProvableType.get(
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

  // TODO remove sort()! Object.keys() has a deterministic order
  let methodKeys: (keyof Methods & string)[] = Object.keys(methods).sort(); // need to have methods in (any) fixed order
  let methodIntfs = methodKeys.map((key) =>
    sortMethodArguments(
      'program',
      key,
      methods[key].privateInputs,
      ProvableType.get(methods[key].auxiliaryOutput) ?? Undefined,
      SelfProof
    )
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
      [I in keyof Methods]: UnwrapPromise<ReturnType<typeof analyzeMethod>>;
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

  const programState = createProgramState();

  async function compile({
    cache = Cache.FileSystemDefault,
    forceRecompile = false,
    proofsEnabled = undefined,
  } = {}) {
    doProving = proofsEnabled ?? doProving;

    if (doProving) {
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
        state: programState,
      });

      compileOutput = { provers, verify };
      return { verificationKey };
    } else {
      return {
        verificationKey: VerificationKey.empty(),
      };
    }
  }

  function toProver<K extends keyof Methods & string>(
    key: K,
    i: number
  ): [
    K,
    Prover<
      PublicInput,
      PublicOutput,
      PrivateInputs[K],
      InferProvableOrUndefined<AuxiliaryOutputs[K]>
    >
  ] {
    async function prove_(
      publicInput: PublicInput,
      ...args: TupleToInstances<PrivateInputs[K]>
    ): Promise<{
      proof: Proof<PublicInput, PublicOutput>;
      auxiliaryOutput: any;
    }> {
      class ProgramProof extends Proof<PublicInput, PublicOutput> {
        static publicInputType = publicInputType;
        static publicOutputType = publicOutputType;
        static tag = () => selfTag;
      }

      if (!doProving) {
        let previousProofs = MlArray.to(getPreviousProofsForProver(args));

        let { publicOutput, auxiliaryOutput } =
          (await (methods[key].method as any)(publicInput, previousProofs)) ??
          {};

        let proof = await ProgramProof.dummy(
          publicInput,
          publicOutput,
          maxProofsVerified
        );
        return { proof, auxiliaryOutput };
      }

      let picklesProver = compileOutput?.provers?.[i];
      if (picklesProver === undefined) {
        throw Error(
          `Cannot prove execution of program.${key}(), no prover found. ` +
            `Try calling \`await program.compile()\` first, this will cache provers in the background.\nIf you compiled your zkProgram with proofs disabled (\`proofsEnabled = false\`), you have to compile it with proofs enabled first.`
        );
      }
      let publicInputFields = toFieldConsts(publicInputType, publicInput);
      let previousProofs = MlArray.to(getPreviousProofsForProver(args));

      let id = snarkContext.enter({ witnesses: args, inProver: true });
      let result: UnwrapPromise<ReturnType<typeof picklesProver>>;
      try {
        result = await picklesProver(publicInputFields, previousProofs);
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
      let publicOutput = fromFieldConsts(publicOutputType, publicOutputFields);

      return {
        proof: new ProgramProof({
          publicInput,
          publicOutput,
          proof,
          maxProofsVerified,
        }),
        auxiliaryOutput,
      };
    }

    let prove: Prover<
      PublicInput,
      PublicOutput,
      PrivateInputs[K],
      InferProvableOrUndefined<AuxiliaryOutputs[K]>
    >;
    if (
      (publicInputType as any) === Undefined ||
      (publicInputType as any) === Void
    ) {
      prove = ((...args: any) => prove_(undefined as any, ...args)) as any;
    } else {
      prove = prove_ as any;
    }
    return [key, prove];
  }

  let provers = Object.fromEntries(methodKeys.map(toProver)) as {
    [I in keyof Config['methods']]: Prover<
      PublicInput,
      PublicOutput,
      PrivateInputs[I],
      InferProvableOrUndefined<AuxiliaryOutputs[I]>
    >;
  };

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

  return program as any;
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

  // extract proofs to count them and for sanity checks
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
  return { methodName, args, numberOfProofs, auxiliaryType };
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

function getPreviousProofsForProver(methodArgs: any[]) {
  return methodArgs.flatMap(extractProofs).map((proof) => proof.proof);
}

type MethodInterface = {
  methodName: string;
  args: ProvableType<unknown>[];
  numberOfProofs: number;
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
  proofSystemTag,
  cache,
  forceRecompile,
  overrideWrapDomain,
  state,
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
      state
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
    let args = methodIntf.args.map(emptyWitness);
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
  { methodName, args, auxiliaryType }: MethodInterface,
  gates: Gate[],
  state?: ReturnType<typeof createProgramState>
): Pickles.Rule {
  async function main(
    publicInput: MlFieldArray
  ): ReturnType<Pickles.Rule['main']> {
    let { witnesses: argsWithoutPublicInput, inProver } = snarkContext.get();
    assert(!(inProver && argsWithoutPublicInput === undefined));
    let finalArgs = [];
    let proofs: {
      Proof: Subclass<typeof ProofBase<any, any>>;
      proof: ProofBase<any, any>;
    }[] = [];
    let previousStatements: Pickles.Statement<FieldVar>[] = [];
    for (let i = 0; i < args.length; i++) {
      let type = args[i];
      try {
        let value = Provable.witness(type, () => {
          return argsWithoutPublicInput?.[i] ?? ProvableType.synthesize(type);
        });
        finalArgs[i] = value;

        for (let proof of extractProofs(value)) {
          let Proof = proof.constructor as Subclass<typeof ProofBase<any, any>>;
          proofs.push({ Proof, proof });
          let fields = proof.publicFields();
          let input = MlFieldArray.to(fields.input);
          let output = MlFieldArray.to(fields.output);
          previousStatements.push(MlPair(input, output));
        }
      } catch (e: any) {
        e.message = `Error when witnessing in ${methodName}, argument ${i}: ${e.message}`;
        throw e;
      }
    }
    let result: {
      publicOutput?: any;
      auxiliaryOutput?: any;
    };
    if (publicInputType === Undefined || publicInputType === Void) {
      result = (await func(...finalArgs)) as any;
    } else {
      let input = fromFieldVars(publicInputType, publicInput);
      result = (await func(input, ...finalArgs)) as any;
    }

    proofs.forEach(({ Proof, proof }) => {
      if (!(proof instanceof DynamicProof)) return;

      // Initialize side-loaded verification key
      const tag = Proof.tag();
      const computedTag = SideloadedTag.get(tag.name);
      const vk = proof.usedVerificationKey;

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
      shouldVerify: MlArray.to(
        proofs.map((proof) => proof.proof.shouldVerify.toField().value)
      ),
    };
  }

  let proofs: Subclass<typeof ProofBase>[] = args.flatMap(extractProofTypes);
  if (proofs.length > 2) {
    throw Error(
      `${proofSystemTag.name}.${methodName}() has more than two proof arguments, which is not supported.\n` +
        `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`
    );
  }
  let proofsToVerify = proofs.map((Proof) => {
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

function getMaxProofsVerified(methodIntfs: MethodInterface[]) {
  return methodIntfs.reduce(
    (acc, { numberOfProofs }) => Math.max(acc, numberOfProofs),
    0
  ) as any as 0 | 1 | 2;
}

function fromFieldVars<T>(type: ProvablePure<T>, fields: MlFieldArray) {
  return type.fromFields(MlFieldArray.from(fields));
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
} & any[];

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
