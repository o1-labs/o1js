import { areBindingsInitialized, initializeBindings, withThreadPool } from '../../snarky.js';
import { Pickles, Base64ProofString } from '../../snarky.js';
import { Field, Bool } from '../provable/wrapped.js';
import type { FlexibleProvable, InferProvable } from '../provable/types/struct.js';
import { FeatureFlags } from './feature-flags.js';
import type { VerificationKey, JsonProof } from './zkprogram.js';
import { Subclass } from '../util/types.js';
import type { Provable } from '../provable/provable.js';
import { assert } from '../util/assert.js';
import { Unconstrained } from '../provable/types/unconstrained.js';
import { ProvableType } from '../provable/types/provable-intf.js';
import { ZkProgramContext } from './zkprogram-context.js';

// public API
export { ProofBase, Proof, DynamicProof, ProofClass };

// internal API
export { dummyProof, extractProofs, extractProofTypes, type ProofValue };

type MaxProofs = 0 | 1 | 2;

type ProofClass = Subclass<typeof ProofBase>;

class ProofBase<Input = any, Output = any> {
  static publicInputType: FlexibleProvable<any> = undefined as any;
  static publicOutputType: FlexibleProvable<any> = undefined as any;
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

  /**
   * To verify a recursive proof inside a ZkProgram method, it has to be "declared" as part of
   * the method. This is done by calling `declare()` on the proof.
   *
   * Note: `declare()` is a low-level method that most users will not have to call directly.
   * For proofs that are inputs to the ZkProgram, it is done automatically.
   *
   * You can think of declaring a proof as a similar step as witnessing a variable, which introduces
   * that variable to the circuit. Declaring a proof will tell Pickles to add the additional constraints
   * for recursive proof verification.
   *
   * Similar to `Provable.witness()`, `declare()` is a no-op when run outside ZkProgram compilation or proving.
   * It returns `false` in that case, and `true` if the proof was actually declared.
   */
  declare() {
    if (!ZkProgramContext.has()) return false;
    const ProofClass = this.constructor as Subclass<typeof ProofBase>;
    ZkProgramContext.declareProof({ ProofClass, proofInstance: this });
    return true;
  }

  toJSON(): JsonProof {
    let fields = this.publicFields();
    return {
      publicInput: fields.input.map(String),
      publicOutput: fields.output.map(String),
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

  static get provable(): Provable<any> {
    if (this.publicInputType === undefined || this.publicOutputType === undefined) {
      throw Error(
        `You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
          `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`
      );
    }
    return provableProof(
      this,
      this.publicInputType,
      this.publicOutputType,
      (this as any).maxProofsVerified
    );
  }

  static publicFields(value: ProofBase) {
    let fields = this.provable.toFields(value);
    let inputSize = this.publicInputType.sizeInFields();
    return {
      input: fields.slice(0, inputSize),
      output: fields.slice(inputSize),
    };
  }
  publicFields() {
    return (this.constructor as typeof ProofBase).publicFields(this);
  }

  static _proofFromBase64(proofString: Base64ProofString, maxProofsVerified: 0 | 1 | 2) {
    assertBindingsInitialized();
    return Pickles.proofOfBase64(proofString, maxProofsVerified)[1];
  }
  static _proofToBase64(proof: Pickles.Proof, maxProofsVerified: 0 | 1 | 2) {
    assertBindingsInitialized();
    return Pickles.proofToBase64([maxProofsVerified, proof]);
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
  ): Promise<Proof<InferProvable<S['publicInputType']>, InferProvable<S['publicOutputType']>>> {
    await initializeBindings();
    let [, proof] = Pickles.proofOfBase64(proofString, maxProofsVerified);
    let fields = publicInputJson.map(Field).concat(publicOutputJson.map(Field));
    return this.provable.fromFields(fields, [[], [], [proof, maxProofsVerified]]) as any;
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

  static get provable(): ProvableProof<Proof<any, any>> {
    return super.provable as any;
  }
}

let sideloadedKeysCounter = 0;

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
   * Alternatively, you can use {@link FeatureFlags.fromZkProgram} to compute the set of feature flags that are compatible with a given program.
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
    DynamicProof<InferProvable<S['publicInputType']>, InferProvable<S['publicOutputType']>>
  > {
    await initializeBindings();
    let [, proof] = Pickles.proofOfBase64(proofString, maxProofsVerified);
    let fields = publicInputJson.map(Field).concat(publicOutputJson.map(Field));
    return this.provable.fromFields(fields, [[], [], [proof, maxProofsVerified]]) as any;
  }

  static async dummy<S extends Subclass<typeof DynamicProof>>(
    this: S,
    publicInput: InferProvable<S['publicInputType']>,
    publicOutput: InferProvable<S['publicOutputType']>,
    maxProofsVerified: 0 | 1 | 2,
    domainLog2: number = 14
  ): Promise<InstanceType<S>> {
    return this.fromProof(
      await Proof.dummy<InferProvable<S['publicInputType']>, InferProvable<S['publicOutputType']>>(
        publicInput,
        publicOutput,
        maxProofsVerified,
        domainLog2
      )
    );
  }

  /**
   * Converts a Proof into a DynamicProof carrying over all relevant data.
   * This method can be used to convert a Proof computed by a ZkProgram
   * into a DynamicProof that is accepted in a circuit that accepts DynamicProofs
   */
  static fromProof<S extends Subclass<typeof DynamicProof>>(
    this: S,
    proof: Proof<InferProvable<S['publicInputType']>, InferProvable<S['publicOutputType']>>
  ): InstanceType<S> {
    return new this({
      publicInput: proof.publicInput,
      publicOutput: proof.publicOutput,
      maxProofsVerified: proof.maxProofsVerified,
      proof: proof.proof,
    }) as InstanceType<S>;
  }

  static get provable(): ProvableProof<DynamicProof<any, any>> {
    return super.provable as any;
  }
}

async function dummyProof(maxProofsVerified: 0 | 1 | 2, domainLog2: number) {
  await initializeBindings();
  return withThreadPool(async () => Pickles.dummyProof(maxProofsVerified, domainLog2)[1]);
}

type ProofValue<Input, Output> = {
  publicInput: Input;
  publicOutput: Output;
  proof: Pickles.Proof;
  maxProofsVerified: 0 | 1 | 2;
};

type ProvableProof<Proof extends ProofBase, InputV = any, OutputV = any> = Provable<
  Proof,
  ProofValue<InputV, OutputV>
>;

function provableProof<
  Class extends Subclass<typeof ProofBase<Input, Output>>,
  Input = any,
  Output = any,
  InputV = any,
  OutputV = any
>(
  Class: Class,
  input: Provable<Input>,
  output: Provable<Output>,
  defaultMaxProofsVerified?: MaxProofs
): Provable<ProofBase<Input, Output>, ProofValue<InputV, OutputV>> {
  return {
    sizeInFields() {
      return input.sizeInFields() + output.sizeInFields();
    },
    toFields(value) {
      return input.toFields(value.publicInput).concat(output.toFields(value.publicOutput));
    },
    toAuxiliary(value) {
      let inputAux = input.toAuxiliary(value?.publicInput);
      let outputAux = output.toAuxiliary(value?.publicOutput);
      let proofAux = [
        value?.proof ?? undefined,
        value?.maxProofsVerified ?? defaultMaxProofsVerified ?? 0,
      ];
      return [inputAux, outputAux, proofAux];
    },
    fromFields(fields, aux) {
      let inputFields = fields.slice(0, input.sizeInFields());
      let outputFields = fields.slice(input.sizeInFields());
      assert(outputFields.length === output.sizeInFields());
      let [inputAux, outputAux, [proof, maxProofsVerified]] = aux;
      let publicInput = input.fromFields(inputFields, inputAux);
      let publicOutput = output.fromFields(outputFields, outputAux);
      return new Class({
        publicInput,
        publicOutput,
        proof,
        maxProofsVerified,
      });
    },
    check(value) {
      input.check(value.publicInput);
      output.check(value.publicOutput);
    },
    toValue(value) {
      let inputV = input.toValue(value.publicInput);
      let outputV = output.toValue(value.publicOutput);
      return {
        publicInput: inputV,
        publicOutput: outputV,
        proof: value.proof,
        maxProofsVerified: value.maxProofsVerified,
      };
    },
    fromValue(value) {
      let inputT = input.fromValue(value.publicInput);
      let outputT = output.fromValue(value.publicOutput);
      return new Class({
        publicInput: inputT,
        publicOutput: outputT,
        proof: value.proof,
        maxProofsVerified: value.maxProofsVerified,
      });
    },
  };
}

function extractProofs(value: unknown): ProofBase[] {
  if (value instanceof ProofBase) {
    return [value];
  }
  if (value instanceof Unconstrained) return [];
  if (value instanceof Field) return [];
  if (value instanceof Bool) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractProofs(item));
  }

  if (value === null) return [];
  if (typeof value === 'object') {
    return extractProofs(Object.values(value));
  }

  // functions, primitives
  return [];
}

function extractProofTypes(type: ProvableType) {
  let value = ProvableType.synthesize(type);
  let proofValues = extractProofs(value);
  return proofValues.map((proof) => proof.constructor as typeof ProofBase);
}

function assertBindingsInitialized() {
  assert(
    areBindingsInitialized,
    'Bindings are not initialized. Try calling `await initializeBindings()` first.'
  );
}
