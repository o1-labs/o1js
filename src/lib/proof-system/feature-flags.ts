import { MlFeatureFlags, Gate, GateType } from '../../snarky.js';
import { MlBool, MlOption, MlArrayOptionalElements } from '../ml/base.js';
import type { analyzeMethod } from './zkprogram.js';

// public API
export { FeatureFlags };

// internal API
export { featureFlagsToMlOption, featureFlagsFromGates };

type AnalysableProgram = {
  analyzeMethods: () => Promise<{
    [I in keyof any]: Awaited<ReturnType<typeof analyzeMethod>>;
  }>;
};

type FeatureFlags = {
  rangeCheck0: boolean | undefined;
  rangeCheck1: boolean | undefined;
  foreignFieldAdd: boolean | undefined;
  foreignFieldMul: boolean | undefined;
  xor: boolean | undefined;
  rot: boolean | undefined;
  lookup: boolean | undefined;
  runtimeTables: boolean | undefined;
};
/**
 * Feature flags indicate what custom gates are used in a proof of circuit.
 * Side loading, for example, requires a set of feature flags in advance (at compile time) in order to verify and side load proofs.
 * If the side loaded proofs and verification keys do not match the specified feature flag configurations, the verification will fail.
 * Flags specified as `undefined` are considered as `maybe` by Pickles. This means, proofs can be sided loaded that can, but don't have to, use a specific custom gate.
 * _Note:_ `Maybe` feature flags incur a proving overhead.
 */
const FeatureFlags = {
  /**
   * Returns a feature flag configuration where all flags are set to false.
   */
  allNone: {
    rangeCheck0: false,
    rangeCheck1: false,
    foreignFieldAdd: false,
    foreignFieldMul: false,
    xor: false,
    rot: false,
    lookup: false,
    runtimeTables: false,
  },
  /**
   * Returns a feature flag configuration where all flags are optional.
   */
  allMaybe: {
    rangeCheck0: undefined,
    rangeCheck1: undefined,
    foreignFieldAdd: undefined,
    foreignFieldMul: undefined,
    xor: undefined,
    rot: undefined,
    lookup: undefined,
    runtimeTables: undefined,
  },

  /**
   * Given a list of gates, returns the feature flag configuration that the gates use.
   */
  fromGates: featureFlagsFromGates,

  /**
   * Given a ZkProgram, return the feature flag configuration that fits the given program.
   * This function considers all methods of the specified ZkProgram and finds a configuration that fits all.
   */
  fromZkProgram: async (program: AnalysableProgram) =>
    await fromZkProgramList([program]),

  /**
   * Given a list of ZkPrograms, return the feature flag configuration that fits the given set of programs.
   * This function considers all methods of all specified ZkPrograms and finds a configuration that fits all.
   */
  fromZkProgramList,
};

async function fromZkProgramList(programs: Array<AnalysableProgram>) {
  let flatMethodIntfs: Array<Awaited<ReturnType<typeof analyzeMethod>>> = [];
  for (const program of programs) {
    let methodInterface = await program.analyzeMethods();
    flatMethodIntfs.push(...Object.values(methodInterface));
  }

  return featureFlagsfromFlatMethodIntfs(flatMethodIntfs);
}

async function featureFlagsfromFlatMethodIntfs(
  methodIntfs: Array<Awaited<ReturnType<typeof analyzeMethod>>>
): Promise<FeatureFlags> {
  // compute feature flags that belong to each method
  let flags = methodIntfs.map(({ gates }) => {
    return featureFlagsFromGates(gates);
  });
  if (flags.length === 0)
    throw Error(
      'The ZkProgram has no methods, in order to calculate feature flags, please attach a method to your ZkProgram.'
    );

  // initialize feature flags to all false
  let globalFlags: Record<string, boolean | undefined> = {
    rangeCheck0: false,
    rangeCheck1: false,
    foreignFieldAdd: false,
    foreignFieldMul: false,
    xor: false,
    rot: false,
    lookup: false,
    runtimeTables: false,
  };

  // if there's only one method that means it defines the feature flags for the entire program
  if (flags.length === 1) return flags[0];

  // calculating the crossover between all methods, compute the shared feature flag set
  flags.forEach((featureFlags, i) => {
    for (const [flagType, currentFlag] of Object.entries(featureFlags)) {
      if (i === 0) {
        // initialize first iteration of flags freely
        globalFlags[flagType] = currentFlag;
      } else if (globalFlags[flagType] != currentFlag) {
        // if flags conflict, set them to undefined to account for both cases (true and false) ^= maybe
        // otherwise side loading couldn't verify some proofs of some method branches!
        globalFlags[flagType] = undefined;
      }
    }
  });
  return globalFlags as FeatureFlags;
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

function featureFlagsFromGates(gates: Gate[]): FeatureFlags {
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
  return flags;
}

function featureFlagsToMlOption(
  flags: FeatureFlags
): MlArrayOptionalElements<MlFeatureFlags> {
  const {
    rangeCheck0,
    rangeCheck1,
    foreignFieldAdd,
    foreignFieldMul,
    xor,
    rot,
    lookup,
    runtimeTables,
  } = flags;

  return [
    0,
    MlOption.mapTo(rangeCheck0, MlBool),
    MlOption.mapTo(rangeCheck1, MlBool),
    MlOption.mapTo(foreignFieldAdd, MlBool),
    MlOption.mapTo(foreignFieldMul, MlBool),
    MlOption.mapTo(xor, MlBool),
    MlOption.mapTo(rot, MlBool),
    MlOption.mapTo(lookup, MlBool),
    MlOption.mapTo(runtimeTables, MlBool),
  ];
}
