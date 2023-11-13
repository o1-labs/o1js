/**
 * DSL for testing that a gadget generates the expected constraint system.
 *
 * An essential feature is that `constraintSystem()` automatically generates a
 * variety of fieldvar types for the inputs: constants, variables, and combinators.
 */
import { Gate, GateType } from '../../snarky.js';
import { randomBytes } from '../../bindings/crypto/random.js';
import { Field, FieldType, FieldVar } from '../field.js';
import { Provable } from '../provable.js';
import { Tuple } from '../util/types.js';
import { Random } from './random.js';
import { test } from './property.js';

export { constraintSystem, contains, log };

type CsVarSpec<T> = Provable<T> | { provable: Provable<T> };
type InferCsVar<T> = T extends { provable: Provable<infer U> }
  ? U
  : T extends Provable<infer U>
  ? U
  : never;
type CsParams<In extends Tuple<CsVarSpec<any>>> = {
  [k in keyof In]: InferCsVar<In[k]>;
};

type CsTest = { run: (cs: Gate[]) => boolean; label: string };

// main DSL

function constraintSystem<In extends Tuple<CsVarSpec<any>>>(
  inputs: { from: In },
  main: (...args: CsParams<In>) => void,
  tests: CsTest[]
) {
  // create random generators
  let types = inputs.from.map(provable);
  let rngs = types.map(layout);

  test(...rngs, (...args) => {
    let layouts = args.slice(0, -1);

    // compute the constraint system
    let result = Provable.constraintSystem(() => {
      // each random input "layout" has to be instantiated into vars in this circuit
      let values = types.map((type, i) =>
        instantiate(type, layouts[i])
      ) as CsParams<In>;
      main(...values);
    });

    // run tests
    let failures = tests
      .map((test) => [test.run(result.gates), test.label] as const)
      .filter(([ok]) => !ok)
      .map(([, label]) => label);

    if (failures.length > 0) {
      console.log('Constraint system:');
      console.log(result.gates);

      let s = failures.length === 1 ? '' : 's';
      throw Error(
        `Failed constraint system test${s}:\n${failures.join('\n')}\n`
      );
    }
  });
}

// DSL for writing tests

/**
 * Test that constraint system contains each of a list of gates consecutively.
 *
 * You can also pass a list of lists. In that case, the constraint system has to contain
 * each of the lists of gates in the given order, but not necessarily consecutively.
 *
 * @example
 * ```ts
 * // constraint system contains a Rot64 gate
 * contains('Rot64')
 *
 * // constraint system contains a Rot64 gate, followed directly by a RangeCheck0 gate
 * contains(['Rot64', 'RangeCheck0'])
 *
 * // constraint system contains two instances of the combination [Rot64, RangeCheck0]
 * contains([['Rot64', 'RangeCheck0'], ['Rot64', 'RangeCheck0']]])
 * ```
 */
function contains(gates: GateType | GateType[] | GateType[][]): CsTest {
  let expectedGatess = toGatess(gates);
  return {
    run(cs) {
      let gates = cs.map((g) => g.type);
      let i = 0;
      let j = 0;
      for (let gate of gates) {
        if (gate === expectedGatess[i][j]) {
          j++;
          if (j === expectedGatess[i].length) {
            i++;
            j = 0;
            if (i === expectedGatess.length) return true;
          }
        } else if (gate === expectedGatess[i][0]) {
          j = 1;
        } else {
          j = 0;
        }
      }
      return false;
    },
    label: `contains ${JSON.stringify(expectedGatess)}`,
  };
}

/**
 * "Test" that just logs the constraint system.
 */
const log: CsTest = {
  run(cs) {
    console.log('Constraint system:');
    console.log(cs);
    return true;
  },
  label: '',
};

function toGatess(
  gateTypes: GateType | GateType[] | GateType[][]
): GateType[][] {
  if (typeof gateTypes === 'string') return [[gateTypes]];
  if (Array.isArray(gateTypes[0])) return gateTypes as GateType[][];
  return [gateTypes as GateType[]];
}

// Random generator for arbitrary provable types

function provable<T>(spec: CsVarSpec<T>): Provable<T> {
  return 'provable' in spec ? spec.provable : spec;
}

function layout<T>(type: Provable<T>): Random<T> {
  let length = type.sizeInFields();

  return Random(() => {
    let fields = Array.from({ length }, () => new Field(drawFieldVar()));
    return type.fromFields(fields, type.toAuxiliary());
  });
}

function instantiate<T>(type: Provable<T>, value: T) {
  let fields = type.toFields(value).map((x) => instantiateFieldVar(x.value));
  return type.fromFields(fields, type.toAuxiliary());
}

// Random generator for fieldvars that exercises constants, variables and combinators

function drawFieldVar(): FieldVar {
  let fieldType = drawFieldType();
  switch (fieldType) {
    case FieldType.Constant: {
      return [FieldType.Constant, [0, 17n]];
    }
    case FieldType.Var: {
      return [FieldType.Var, 0];
    }
    case FieldType.Add: {
      let x = drawFieldVar();
      let y = drawFieldVar();
      return [FieldType.Add, x, y];
    }
    case FieldType.Scale: {
      let x = drawFieldVar();
      return [FieldType.Scale, [0, 3n], x];
    }
  }
}

function instantiateFieldVar(x: FieldVar): Field {
  switch (x[0]) {
    case FieldType.Constant: {
      return new Field(x);
    }
    case FieldType.Var: {
      return Provable.witness(Field, () => Field.from(0n));
    }
    case FieldType.Add: {
      let a = instantiateFieldVar(x[1]);
      let b = instantiateFieldVar(x[2]);
      return a.add(b);
    }
    case FieldType.Scale: {
      let a = instantiateFieldVar(x[2]);
      return a.mul(x[1][1]);
    }
  }
}

function drawFieldType(): FieldType {
  let oneOf8 = randomBytes(1)[0] & 0b111;
  if (oneOf8 < 4) return FieldType.Var;
  if (oneOf8 < 6) return FieldType.Constant;
  if (oneOf8 === 6) return FieldType.Scale;
  return FieldType.Add;
}
