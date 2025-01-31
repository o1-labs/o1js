import { InferProvable } from '../provable/types/struct.js';
import { Provable } from '../provable/provable.js';
import { ProvableType } from '../provable/types/provable-intf.js';
import { Tuple } from '../util/types.js';
import { Proof } from './proof.js';
import { mapObject, mapToObject, zip } from '../util/arrays.js';
import { Undefined, Void } from './zkprogram.js';
import { Bool } from '../provable/bool.js';

export { Recursive };

function Recursive<
  PublicInputType extends Provable<any>,
  PublicOutputType extends Provable<any>,
  PrivateInputs extends {
    [Key in string]: Tuple<ProvableType>;
  }
>(
  zkprogram: {
    name: string;
    publicInputType: PublicInputType;
    publicOutputType: PublicOutputType;
    privateInputTypes: PrivateInputs;
    rawMethods: {
      [Key in keyof PrivateInputs]: (
        ...args: any
      ) => Promise<{ publicOutput: InferProvable<PublicOutputType> }>;
    };
    maxProofsVerified: () => Promise<0 | 1 | 2>;
  } & {
    [Key in keyof PrivateInputs]: (...args: any) => Promise<{
      proof: Proof<
        InferProvable<PublicInputType>,
        InferProvable<PublicOutputType>
      >;
    }>;
  }
): {
  [Key in keyof PrivateInputs]: RecursiveProver<
    InferProvable<PublicInputType>,
    InferProvable<PublicOutputType>,
    PrivateInputs[Key]
  > & {
    if: ConditionalRecursiveProver<
      InferProvable<PublicInputType>,
      InferProvable<PublicOutputType>,
      PrivateInputs[Key]
    >;
  };
} {
  type PublicInput = InferProvable<PublicInputType>;
  type PublicOutput = InferProvable<PublicOutputType>;
  type MethodKey = keyof PrivateInputs;

  let {
    publicInputType,
    publicOutputType,
    privateInputTypes: privateInputs,
    rawMethods: methods,
  } = zkprogram;

  let hasPublicInput =
    publicInputType !== Undefined && publicInputType !== Void;

  class SelfProof extends Proof<PublicInput, PublicOutput> {
    static publicInputType = publicInputType;
    static publicOutputType = publicOutputType;
    static tag = () => zkprogram;
  }

  let methodKeys: MethodKey[] = Object.keys(methods);

  let regularRecursiveProvers = mapToObject(methodKeys, (key) => {
    return async function proveRecursively_(
      conditionAndConfig: Bool | { condition: Bool; domainLog2?: number },
      publicInput: PublicInput,
      ...args: InferTuple<PrivateInputs[MethodKey]>
    ): Promise<PublicOutput> {
      let condition =
        conditionAndConfig instanceof Bool
          ? conditionAndConfig
          : conditionAndConfig.condition;

      // create the base proof in a witness block
      let proof = await Provable.witnessAsync(SelfProof, async () => {
        // move method args to constants
        let constInput = Provable.toConstant<PublicInput>(
          publicInputType,
          publicInput
        );
        let constArgs = zip(args, privateInputs[key]).map(([arg, type]) =>
          Provable.toConstant(type, arg)
        );

        if (!condition.toBoolean()) {
          let publicOutput: PublicOutput =
            ProvableType.synthesize(publicOutputType);
          let maxProofsVerified = await zkprogram.maxProofsVerified();
          return SelfProof.dummy(
            publicInput,
            publicOutput,
            maxProofsVerified,
            conditionAndConfig instanceof Bool
              ? undefined
              : conditionAndConfig.domainLog2
          );
        }

        let prover = zkprogram[key];

        if (hasPublicInput) {
          let { proof } = await prover(constInput, ...constArgs);
          return proof;
        } else {
          let { proof } = await prover(...constArgs);
          return proof;
        }
      });

      // assert that the witnessed proof has the correct public input (which will be used by Pickles as part of verification)
      if (hasPublicInput) {
        Provable.assertEqual(publicInputType, proof.publicInput, publicInput);
      }

      // declare and verify the proof, and return its public output
      proof.declare();
      proof.verifyIf(condition);
      return proof.publicOutput;
    };
  });

  return mapObject(
    regularRecursiveProvers,
    (
      prover
    ): RecursiveProver<PublicInput, PublicOutput, PrivateInputs[MethodKey]> & {
      if: ConditionalRecursiveProver<
        PublicInput,
        PublicOutput,
        PrivateInputs[MethodKey]
      >;
    } => {
      if (!hasPublicInput) {
        return Object.assign(
          ((...args: any) =>
            prover(new Bool(true), undefined as any, ...args)) as any,
          {
            if: (
              condition: Bool | { condition: Bool; domainLog2?: number },
              ...args: any
            ) => prover(condition, undefined as any, ...args),
          }
        );
      } else {
        return Object.assign(
          ((pi: PublicInput, ...args: any) =>
            prover(new Bool(true), pi, ...args)) as any,
          {
            if: (
              condition: Bool | { condition: Bool; domainLog2?: number },
              pi: PublicInput,
              ...args: any
            ) => prover(condition, pi, ...args),
          }
        );
      }
    }
  );
}

type RecursiveProver<
  PublicInput,
  PublicOutput,
  Args extends Tuple<ProvableType>
> = PublicInput extends undefined
  ? (...args: InferTuple<Args>) => Promise<PublicOutput>
  : (
      publicInput: PublicInput,
      ...args: InferTuple<Args>
    ) => Promise<PublicOutput>;

type ConditionalRecursiveProver<
  PublicInput,
  PublicOutput,
  Args extends Tuple<ProvableType>
> = PublicInput extends undefined
  ? (
      condition: Bool | { condition: Bool; domainLog2?: number },
      ...args: InferTuple<Args>
    ) => Promise<PublicOutput>
  : (
      condition: Bool | { condition: Bool; domainLog2?: number },
      publicInput: PublicInput,
      ...args: InferTuple<Args>
    ) => Promise<PublicOutput>;

type InferTuple<T> = {
  [I in keyof T]: InferProvable<T[I]>;
};
