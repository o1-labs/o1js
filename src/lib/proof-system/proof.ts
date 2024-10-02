import { EmptyUndefined, EmptyVoid } from '../../bindings/lib/generic.js';
import { Snarky, initializeBindings, withThreadPool } from '../../snarky.js';
import { Pickles, MlFeatureFlags, Gate, GateType } from '../../snarky.js';
import { Field, Bool } from '../provable/wrapped.js';
import {
  FlexibleProvable,
  FlexibleProvablePure,
  InferProvable,
  ProvablePureExtended,
  Struct,
} from '../provable/types/struct.js';
import {
  InferProvableType,
  provable,
  provablePure,
} from '../provable/types/provable-derivers.js';
import { Provable } from '../provable/provable.js';
import { assert, prettifyStacktracePromise } from '../util/errors.js';
import { snarkContext } from '../provable/core/provable-context.js';
import { hashConstant } from '../provable/crypto/poseidon.js';
import {
  MlArray,
  MlBool,
  MlResult,
  MlPair,
  MlOption,
  MlArrayOptionalElements,
} from '../ml/base.js';
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
import { FeatureFlags } from './feature-flags.js';
import type { VerificationKey, JsonProof } from './zkprogram.js';
import { Subclass } from '../util/types.js';

// public API
export { ProofBase, Proof, DynamicProof };

// internal API
export { dummyProof, getStatementType };

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
 * Assertions generally only happen using the vk hash that is part of the `VerificationKey` struct along with the raw vk data as auxiliary data.
 * When using verify() on a `DynamicProof`, Pickles makes sure that the verification key data matches the hash.
 * Therefore all manual assertions have to be made on the vk's hash and it can be assumed that the vk's data is checked to match the hash if it is used with verify().
 */
class DynamicProof<Input, Output> extends ProofBase<Input, Output> {
  public static maxProofsVerified: 0 | 1 | 2;

  private static memoizedCounter: number | undefined;

  /**
   * As the name indicates, feature flags are features of the proof system.
   *
   * If we want to side load proofs and verification keys, we first have to tell Pickles what _shape_ of proofs it should expect.
   *
   * For example, if we want to side load proofs that use foreign field arithmetic custom gates, we have to make Pickles aware of that by defining
   * these custom gates.
   *
   * _Note:_ Only proofs that use the exact same composition of custom gates which were expected by Pickles can be verified using side loading.
   * If you want to verify _any_ proof, no matter what custom gates it uses, you can use {@link FeatureFlags.allMaybe}. Please note that this might incur a significant overhead.
   *
   * You can also toggle specific feature flags manually by specifying them here.
   * Alternatively, you can use {@FeatureFlags.fromZkProgram} to compute the set of feature flags that are compatible with a given program.
   */
  static featureFlags: FeatureFlags = FeatureFlags.allNone;

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

async function dummyProof(maxProofsVerified: 0 | 1 | 2, domainLog2: number) {
  await initializeBindings();
  return withThreadPool(
    async () => Pickles.dummyProof(maxProofsVerified, domainLog2)[1]
  );
}

// helper

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
