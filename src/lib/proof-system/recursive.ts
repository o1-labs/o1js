import { InferProvable } from '../provable/types/struct.js';
import { Provable } from '../provable/provable.js';
import { ProvableType } from '../provable/types/provable-intf.js';
import { Tuple } from '../util/types.js';
import { Proof } from './proof.js';
import { mapToObject, zip } from '../util/arrays.js';
import { Undefined, Void } from './zkprogram.js';
import { From } from '../../bindings/lib/provable-generic.js';

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
    PublicInputType,
    InferProvable<PublicOutputType>,
    PrivateInputs[Key]
  >;
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

  let regularRecursiveProvers = mapToObject(methodKeys, (key, i) => {
    return async function proveRecursively_(
      publicInput: PublicInput,
      ...args: TupleFrom<PrivateInputs[MethodKey]>
    ) {
      // create the base proof in a witness block
      let proof = await Provable.witnessAsync(SelfProof, async () => {
        // move method args to constants
        let constInput = Provable.toConstant<PublicInput>(
          publicInputType,
          publicInputType.fromValue(publicInput)
        );
        let constArgs = zip(args, privateInputs[key]).map(([arg, type]) =>
          Provable.toConstant(type, ProvableType.get(type).fromValue(arg))
        );

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
      proof.verify();
      return proof.publicOutput;
    };
  });

  type RecursiveProver_<K extends MethodKey> = RecursiveProver<
    PublicInput,
    PublicInputType,
    PublicOutput,
    PrivateInputs[K]
  >;
  type RecursiveProvers = {
    [K in MethodKey]: RecursiveProver_<K>;
  };
  let proveRecursively: RecursiveProvers = mapToObject(
    methodKeys,
    (key: MethodKey) => {
      if (!hasPublicInput) {
        return ((...args: any) =>
          regularRecursiveProvers[key](undefined as any, ...args)) as any;
      } else {
        return regularRecursiveProvers[key] as any;
      }
    }
  );

  return proveRecursively;
}

type RecursiveProver<
  PublicInput,
  PublicInputType,
  PublicOutput,
  Args extends Tuple<ProvableType>
> = PublicInput extends undefined
  ? (...args: TupleFrom<Args>) => Promise<PublicOutput>
  : (
      publicInput: From<PublicInputType>,
      ...args: TupleFrom<Args>
    ) => Promise<PublicOutput>;

type TupleFrom<T> = {
  [I in keyof T]: From<T[I]>;
};
