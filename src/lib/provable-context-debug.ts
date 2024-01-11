import { Snarky } from '../snarky.js';
import { prettifyStacktrace } from './errors.js';
import { FieldConst, FieldVar } from './field.js';
import { assert } from './gadgets/common.js';
import {
  KimchiGateType,
  KimchiGateTypeString,
  gateTypeToString,
} from './gates.js';
import { MlArray, MlBool, MlOption, MlString, MlTuple } from './ml/base.js';
import { SnarkContext, snarkContext } from './provable-context.js';
import { deepEqual, stringify } from './util/nested.js';

export { runCircuit, SnarkyConstraint, ConstraintLog, MlConstraintSystem };

function runCircuit(
  main: () => void,
  {
    withWitness,
    evalConstraints = true,
    expectedConstraints,
    unexpectedConstraintMessage,
    snarkContext: ctx = {},
    createDebugTraces = false,
  }: {
    withWitness: boolean;
    evalConstraints?: boolean;
    expectedConstraints?: ConstraintLog[];
    unexpectedConstraintMessage?: string;
    snarkContext?: SnarkContext;
    createDebugTraces?: boolean;
  }
) {
  const snarkyState = Snarky.lowLevel.state;
  let numInputs = 0;
  let constraints: ConstraintLog[] = [];

  let [, state, input, aux, system] = Snarky.lowLevel.createState(
    numInputs,
    MlBool(evalConstraints),
    MlBool(withWitness),
    MlOption(function collectConstraints(_label, maybeConstraint) {
      let mlConstraint = MlOption.from(maybeConstraint);
      if (mlConstraint === undefined) return;
      let constraint = getGateTypeAndData(mlConstraint);
      let debug = createDebugTraces ? new Error(constraint.type) : undefined;
      constraints.push({ constraint, debug });

      if (expectedConstraints !== undefined) {
        let expected = expectedConstraints[constraints.length - 1];
        let ok = deepEqual(constraint, expected.constraint);
        if (ok) return;

        let message =
          unexpectedConstraintMessage ??
          'Generated constraint generated did not match expected constraint..\n' +
            'See the stack traces below for where this constraint originated.';

        let expectedStackTrace =
          expected.debug?.stack !== undefined
            ? `\nStack trace for the expected constraint:\n\n${expected.debug.stack}\n`
            : '';

        let fullMessage = `${message}\n\nDeep equality failed:\n
actual:   ${stringify(constraint)}
expected: ${stringify(expected.constraint)}
${expectedStackTrace}
Stack trace for the actual constraint:
`;
        throw Error(fullMessage);
      }
    })
  );

  let id = snarkContext.enter({ inCheckedComputation: true, ...ctx });
  let [, oldState] = snarkyState;
  snarkyState[1] = state;
  let counters = Snarky.lowLevel.pushActiveCounter();
  try {
    main();
  } catch (error) {
    throw prettifyStacktrace(error);
  } finally {
    Snarky.lowLevel.resetActiveCounter(counters);
    snarkyState[1] = oldState;
    snarkContext.leave(id);
  }

  let publicInput = MlArray.mapFrom(input, FieldConst.toBigint);
  let witness = MlArray.mapFrom(aux, FieldConst.toBigint);

  return { constraints, publicInput, witness, system };
}

class MlConstraintSystem {
  // opaque
}

type ConstraintLog = {
  constraint: { type: ConstraintType; data: any };
  debug?: Error;
};

type ConstraintType =
  | KimchiGateTypeString
  | 'Boolean'
  | 'Equal'
  | 'Square'
  | 'R1CS';

function getGateTypeAndData(
  constraint: SnarkyConstraint
): ConstraintLog['constraint'] {
  let [, basic] = constraint;
  switch (basic[1][1].c) {
    case SnarkyConstraintType.Boolean:
      return { type: 'Boolean', data: basic.slice(2) };
    case SnarkyConstraintType.Equal:
      return { type: 'Equal', data: basic.slice(2) };
    case SnarkyConstraintType.Square:
      return { type: 'Square', data: basic.slice(2) };
    case SnarkyConstraintType.R1CS:
      return { type: 'R1CS', data: basic.slice(2) };
    case SnarkyConstraintType.Added:
      // why can't TS narrow this?
      let [plonkConstraint, ...data] = basic[2] as [PlonkConstraint, ...any];
      let kimchiGateType = plonkConstraintToKimchiGateType[plonkConstraint];
      assert(kimchiGateType !== undefined, 'unimplemented');
      return { type: gateTypeToString(kimchiGateType), data };
    default:
      assert(false);
  }
}

type SnarkyConstraint = [
  _: 0,
  basic: SnarkyConstraintBasic,
  annotation: MlOption<MlString>
];

// types that are defined by `type t = ..`, `type t += <some type>`, etc
type MlIncrementalTypeEnum<T extends string> = [
  248,
  { t: number; c: T; l: number },
  number
];

// matches Snarky_backendless.Constraint.basic
type SnarkyConstraintBasic =
  | [0, MlIncrementalTypeEnum<SnarkyConstraintType.Boolean>, FieldVar]
  | [0, MlIncrementalTypeEnum<SnarkyConstraintType.Equal>, MlTuple<FieldVar, 2>]
  | [
      0,
      MlIncrementalTypeEnum<SnarkyConstraintType.Square>,
      MlTuple<FieldVar, 2>
    ]
  | [0, MlIncrementalTypeEnum<SnarkyConstraintType.R1CS>, MlTuple<FieldVar, 3>]
  | [
      0,
      MlIncrementalTypeEnum<'Snarky_backendless__Constraint.Add_kind(C).T'>,
      [PlonkConstraint, ...any]
    ];

enum SnarkyConstraintType {
  Boolean = 'Snarky_backendless__Constraint.Boolean',
  Equal = 'Snarky_backendless__Constraint.Equal',
  Square = 'Snarky_backendless__Constraint.Square',
  R1CS = 'Snarky_backendless__Constraint.R1CS',
  Added = 'Snarky_backendless__Constraint.Add_kind(C).T',
}

// matches Plonk_constraint_system.Plonk_constraint.t
enum PlonkConstraint {
  Basic,
  Poseidon,
  EC_add_complete,
  EC_scale,
  EC_endoscale,
  EC_endoscalar,
  Lookup,
  RangeCheck0,
  RangeCheck1,
  Xor,
  ForeignFieldAdd,
  ForeignFieldMul,
  Rot64,
  AddFixedLookupTable,
  AddRuntimeTableCfg,
  Raw,
}

const plonkConstraintToKimchiGateType = {
  [PlonkConstraint.Basic]: KimchiGateType.Generic,
  [PlonkConstraint.Poseidon]: KimchiGateType.Poseidon,
  [PlonkConstraint.EC_add_complete]: KimchiGateType.CompleteAdd,
  [PlonkConstraint.EC_scale]: KimchiGateType.VarBaseMul,
  [PlonkConstraint.EC_endoscale]: KimchiGateType.EndoMul,
  [PlonkConstraint.EC_endoscalar]: KimchiGateType.EndoMulScalar,
  [PlonkConstraint.Lookup]: KimchiGateType.Lookup,
  [PlonkConstraint.RangeCheck0]: KimchiGateType.RangeCheck0,
  [PlonkConstraint.RangeCheck1]: KimchiGateType.RangeCheck1,
  [PlonkConstraint.Xor]: KimchiGateType.Xor16,
  [PlonkConstraint.ForeignFieldAdd]: KimchiGateType.ForeignFieldAdd,
  [PlonkConstraint.ForeignFieldMul]: KimchiGateType.ForeignFieldMul,
  [PlonkConstraint.Rot64]: KimchiGateType.Rot64,
  [PlonkConstraint.AddFixedLookupTable]: undefined,
  [PlonkConstraint.AddRuntimeTableCfg]: undefined,
  // isn't used for other stuff
  [PlonkConstraint.Raw]: KimchiGateType.Zero,
} as const;
