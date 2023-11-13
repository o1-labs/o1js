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

export {
  constraintSystem,
  not,
  and,
  or,
  equals,
  contains,
  allConstant,
  ifNotAllConstant,
  isEmpty,
  withoutGenerics,
  log,
};

type CsVarSpec<T> = Provable<T> | { provable: Provable<T> };
type InferCsVar<T> = T extends { provable: Provable<infer U> }
  ? U
  : T extends Provable<infer U>
  ? U
  : never;
type CsParams<In extends Tuple<CsVarSpec<any>>> = {
  [k in keyof In]: InferCsVar<In[k]>;
};
type TypeAndValue<T> = { type: Provable<T>; value: T };

// main DSL

function constraintSystem<In extends Tuple<CsVarSpec<any>>>(
  inputs: { from: In },
  main: (...args: CsParams<In>) => void,
  csTest: CsTest
) {
  // create random generators
  let types = inputs.from.map(provable);
  let rngs = types.map(layout);

  test(...rngs, (...args) => {
    let layouts = args.slice(0, -1);

    // compute the constraint system
    let { gates } = Provable.constraintSystem(() => {
      // each random input "layout" has to be instantiated into vars in this circuit
      let values = types.map((type, i) =>
        instantiate(type, layouts[i])
      ) as CsParams<In>;
      main(...values);
    });

    // run tests
    let typesAndValues = types.map((type, i) => ({ type, value: layouts[i] }));

    let { ok, failures } = run(csTest, gates, typesAndValues);

    if (!ok) {
      console.log('Constraint system:');
      console.log(gates);

      let s = failures.length === 1 ? '' : 's';
      throw Error(
        `Failed constraint system test${s}:\n${failures.join('\n')}\n`
      );
    }
  });
}

// DSL for writing tests

type CsTestBase = {
  run: (cs: Gate[], inputs: TypeAndValue<any>[]) => boolean;
  label: string;
};
type Base = { kind?: undefined } & CsTestBase;
type Not = { kind: 'not' } & CsTestBase;
type And = { kind: 'and'; tests: CsTest[]; label: string };
type Or = { kind: 'or'; tests: CsTest[]; label: string };
type CsTest = Base | Not | And | Or;

type Result = { ok: boolean; failures: string[] };

function run(test: CsTest, cs: Gate[], inputs: TypeAndValue<any>[]): Result {
  switch (test.kind) {
    case undefined: {
      let ok = test.run(cs, inputs);
      let failures = ok ? [] : [test.label];
      return { ok, failures };
    }
    case 'not': {
      let ok = test.run(cs, inputs);
      let failures = ok ? [`not(${test.label})`] : [];
      return { ok: !ok, failures };
    }
    case 'and': {
      let results = test.tests.map((t) => run(t, cs, inputs));
      let ok = results.every((r) => r.ok);
      let failures = results.flatMap((r) => r.failures);
      return { ok, failures };
    }
    case 'or': {
      let results = test.tests.map((t) => run(t, cs, inputs));
      let ok = results.some((r) => r.ok);
      let failures = results.flatMap((r) => r.failures);
      return { ok, failures };
    }
  }
}

/**
 * Negate a test.
 */
function not(test: CsTest): CsTest {
  return { kind: 'not', ...test };
}
/**
 * Check that all input tests pass.
 */
function and(...tests: CsTest[]): CsTest {
  return { kind: 'and', tests, label: `and(${tests.map((t) => t.label)})` };
}
/**
 * Check that at least one input test passes.
 */
function or(...tests: CsTest[]): CsTest {
  return { kind: 'or', tests, label: `or(${tests.map((t) => t.label)})` };
}

/**
 * Test for precise equality of the constraint system with a given list of gates.
 */
function equals(gates: GateType[]): CsTest {
  return {
    run(cs) {
      return cs.every((g, i) => g.type === gates[i]);
    },
    label: `equals ${JSON.stringify(gates)}`,
  };
}

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
 * Test whether all inputs are constant.
 */
const allConstant: CsTest = {
  run(cs, inputs) {
    return inputs.every(({ type, value }) =>
      type.toFields(value).every((x) => x.isConstant())
    );
  },
  label: 'all inputs constant',
};

/**
 * Modifies a test so that it doesn't fail if all inputs are constant, and instead
 * checks that the constraint system is empty in that case.
 */
function ifNotAllConstant(test: CsTest): CsTest {
  return or(test, and(allConstant, isEmpty));
}

/**
 * Test whether all inputs are constant.
 */
const isEmpty: CsTest = {
  run(cs) {
    return cs.length === 0;
  },
  label: 'cs is empty',
};

/**
 * Modifies a test so that it runs on the constraint system with generic gates filtered out.
 */
function withoutGenerics(test: CsTest): CsTest {
  return {
    run(cs, inputs) {
      return run(
        test,
        cs.filter((g) => g.type !== 'Generic'),
        inputs
      ).ok;
    },
    label: `withoutGenerics(${test.label})`,
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
      return FieldVar.constant(17n);
    }
    case FieldType.Var: {
      return [FieldType.Var, 0];
    }
    case FieldType.Add: {
      let x = drawFieldVar();
      let y = drawFieldVar();
      return FieldVar.add(x, y);
    }
    case FieldType.Scale: {
      let x = drawFieldVar();
      return FieldVar.scale(3n, x);
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
