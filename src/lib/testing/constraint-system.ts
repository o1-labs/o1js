/**
 * DSL for testing that a gadget generates the expected constraint system.
 *
 * An essential feature is that `constraintSystem()` automatically generates a
 * variety of fieldvar types for the inputs: constants, variables, and combinators.
 */
import { Gate, GateType } from '../../snarky.js';
import { randomBytes } from '../../bindings/crypto/random.js';
import { Field } from '../provable/field.js';
import { FieldType, FieldVar } from '../provable/core/fieldvar.js';
import { Provable } from '../provable/provable.js';
import { Tuple } from '../util/types.js';
import { Random } from './random.js';
import { test } from './property.js';
import { Undefined, ZkProgram } from '../proof-system/zkprogram.js';
import {
  printGates,
  summarizeGates,
  synchronousRunners,
} from '../provable/core/provable-context.js';

export {
  constraintSystem,
  not,
  and,
  or,
  fulfills,
  equals,
  contains,
  allConstant,
  ifNotAllConstant,
  isEmpty,
  withoutGenerics,
  print,
  repeat,
  ConstraintSystemTest,
};

// TODO get rid of this top-level await by making `test` support async functions
let { constraintSystemSync } = await synchronousRunners();

/**
 * `constraintSystem()` is a test runner to check properties of constraint systems.
 * You give it a description of inputs and a circuit, as well as a `ConstraintSystemTest` to assert
 * properties on the generated constraint system.
 *
 * As input variables, we generate random combinations of constants, variables, add & scale combinators,
 * to poke for the common problem of gate chains broken by unexpected Generic gates.
 *
 * The `constraintSystemTest` is written using a DSL of property assertions, such as {@link equals} and {@link contains}.
 * To run multiple assertions, use the {@link and} / {@link or} combinators.
 * To debug the constraint system, use the {@link print} test or `and(print, ...otherTests)`.
 *
 * @param label description of the constraint system
 * @param inputs input spec in form `{ from: [...provables] }`
 * @param main circuit to test
 * @param constraintSystemTest property test to run on the constraint system
 */
function constraintSystem<Input extends Tuple<CsVarSpec<any>>>(
  label: string,
  inputs: { from: Input },
  main: (...args: CsParams<Input>) => void,
  constraintSystemTest: ConstraintSystemTest
) {
  // create random generators
  let types = inputs.from.map(provable);
  let rngs = types.map(layout);

  test(...rngs, (...args) => {
    let layouts = args.slice(0, -1);

    // compute the constraint system
    let { gates } = constraintSystemSync(() => {
      // each random input "layout" has to be instantiated into vars in this circuit
      let values = types.map((type, i) =>
        instantiate(type, layouts[i])
      ) as CsParams<Input>;
      main(...values);
    });

    // run tests
    let typesAndValues = types.map((type, i) => ({ type, value: layouts[i] }));

    let { ok, failures } = run(constraintSystemTest, gates, typesAndValues);

    if (!ok) {
      console.log('Constraint system:');
      printGates(gates);

      throw Error(
        `Constraint system test: ${label}\n\n${failures
          .map((f) => `FAIL: ${f}`)
          .join('\n')}\n`
      );
    }
  });
}

/**
 * Convenience function to run {@link constraintSystem} on the method of a {@link ZkProgram}.
 *
 * @example
 * ```ts
 * const program = ZkProgram({ methods: { myMethod: ... }, ... });
 *
 * constraintSystem.fromZkProgram(program, 'myMethod', contains('Rot64'));
 * ```
 */
constraintSystem.fromZkProgram = function fromZkProgram<
  T,
  K extends keyof T & string
>(
  program: { privateInputTypes: T },
  methodName: K,
  test: ConstraintSystemTest
) {
  let program_: ZkProgram<any, any> = program as any;
  let from: any = [...program_.privateInputTypes[methodName]];
  if (program_.publicInputType !== Undefined) {
    from.unshift(program_.publicInputType);
  }
  return constraintSystem(
    `${program_.name} / ${methodName}()`,
    { from },
    program_.rawMethods[methodName],
    test
  );
};

// DSL for writing tests

type ConstraintSystemTestBase = {
  run: (cs: Gate[], inputs: TypeAndValue<any>[]) => boolean;
  label: string;
};
type Base = { kind?: undefined } & ConstraintSystemTestBase;
type Not = { kind: 'not' } & ConstraintSystemTestBase;
type And = { kind: 'and'; tests: ConstraintSystemTest[]; label: string };
type Or = { kind: 'or'; tests: ConstraintSystemTest[]; label: string };
type ConstraintSystemTest = Base | Not | And | Or;

type Result = { ok: boolean; failures: string[] };

function run(
  test: ConstraintSystemTest,
  cs: Gate[],
  inputs: TypeAndValue<any>[]
): Result {
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
      let failures = ok ? [] : results.flatMap((r) => r.failures);
      return { ok, failures };
    }
    case 'or': {
      let results = test.tests.map((t) => run(t, cs, inputs));
      let ok = results.some((r) => r.ok);
      let failures = ok ? [] : results.flatMap((r) => r.failures);
      return { ok, failures };
    }
  }
}

/**
 * Negate a test.
 */
function not(test: ConstraintSystemTest): ConstraintSystemTest {
  return { kind: 'not', ...test };
}
/**
 * Check that all input tests pass.
 */
function and(...tests: ConstraintSystemTest[]): ConstraintSystemTest {
  return { kind: 'and', tests, label: `and(${tests.map((t) => t.label)})` };
}
/**
 * Check that at least one input test passes.
 */
function or(...tests: ConstraintSystemTest[]): ConstraintSystemTest {
  return { kind: 'or', tests, label: `or(${tests.map((t) => t.label)})` };
}

/**
 * General test
 */
function fulfills(
  label: string,
  run: (cs: Gate[], inputs: TypeAndValue<any>[]) => boolean
): ConstraintSystemTest {
  return { run, label };
}

/**
 * Test for precise equality of the constraint system with a given list of gates.
 */
function equals(gates: readonly GateType[]): ConstraintSystemTest {
  return {
    run(cs) {
      if (cs.length !== gates.length) return false;
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
function contains(
  gates: GateType | readonly GateType[] | readonly GateType[][]
): ConstraintSystemTest {
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
const allConstant: ConstraintSystemTest = {
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
function ifNotAllConstant(test: ConstraintSystemTest): ConstraintSystemTest {
  return or(test, and(allConstant, isEmpty));
}

/**
 * Test whether constraint system is empty.
 */
const isEmpty = fulfills('constraint system is empty', (cs) => cs.length === 0);

/**
 * Modifies a test so that it runs on the constraint system with generic gates filtered out.
 */
function withoutGenerics(test: ConstraintSystemTest): ConstraintSystemTest {
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
 * "Test" that just pretty-prints the constraint system.
 */
const print: ConstraintSystemTest = {
  run(cs) {
    console.log('Constraint system:');
    printGates(cs);
    return true;
  },
  label: '',
};

// Do other useful things with constraint systems

/**
 * Get constraint system as a list of gates.
 */
constraintSystem.gates = function gates<Input extends Tuple<CsVarSpec<any>>>(
  inputs: { from: Input },
  main: (...args: CsParams<Input>) => void
) {
  let types = inputs.from.map(provable);
  let { gates } = constraintSystemSync(() => {
    let values = types.map((type) =>
      Provable.witness(type, (): unknown => {
        throw Error('not needed');
      })
    ) as CsParams<Input>;
    main(...values);
  });
  return gates;
};

function map<T>(transform: (gates: Gate[]) => T) {
  return <Input extends Tuple<CsVarSpec<any>>>(
    inputs: { from: Input },
    main: (...args: CsParams<Input>) => void
  ) => transform(constraintSystem.gates(inputs, main));
}

/**
 * Get size of constraint system.
 */
constraintSystem.size = map((gates) => gates.length);

/**
 * Print constraint system.
 */
constraintSystem.print = map(printGates);

/**
 * Get constraint system summary.
 */
constraintSystem.summary = map(summarizeGates);

function repeat(
  n: number,
  gates: GateType | readonly GateType[]
): readonly GateType[] {
  gates = Array.isArray(gates) ? gates : [gates];
  return Array<readonly GateType[]>(n).fill(gates).flat();
}

function toGatess(
  gateTypes: GateType | readonly GateType[] | readonly GateType[][]
): GateType[][] {
  if (typeof gateTypes === 'string') return [[gateTypes]];
  if (Array.isArray(gateTypes[0])) return gateTypes as GateType[][];
  return [gateTypes as GateType[]];
}

// Random generator for arbitrary provable types

function provable<T>(spec: CsVarSpec<T>): Provable<T, any> {
  return 'provable' in spec ? spec.provable : spec;
}

function layout<T>(type: Provable<T, any>): Random<T> {
  let length = type.sizeInFields();

  return Random(() => {
    let fields = Array.from({ length }, () => new Field(drawFieldVar()));
    return type.fromFields(fields, type.toAuxiliary());
  });
}

function instantiate<T>(type: Provable<T, any>, value: T) {
  let fields = type.toFields(value).map((x) => instantiateFieldVar(x.value));
  return type.fromFields(fields, type.toAuxiliary());
}

// Random generator for fieldvars that exercises constants, variables and combinators

function drawFieldVar(): FieldVar {
  let fieldType = drawFieldType();
  switch (fieldType) {
    case FieldType.Constant: {
      return FieldVar.constant(1n);
    }
    case FieldType.Var: {
      return [FieldType.Var, 0];
    }
    case FieldType.Add: {
      let x = drawFieldVar();
      let y = drawFieldVar();
      // prevent blow-up of constant size
      if (x[0] === FieldType.Constant && y[0] === FieldType.Constant) return x;
      return FieldVar.add(x, y);
    }
    case FieldType.Scale: {
      let x = drawFieldVar();
      // prevent blow-up of constant size
      if (x[0] === FieldType.Constant) return x;
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

// types

type CsVarSpec<T> = Provable<T, any> | { provable: Provable<T, any> };
type InferCsVar<T> = T extends { provable: Provable<infer U, any> }
  ? U
  : T extends Provable<infer U, any>
  ? U
  : never;
type CsParams<In extends Tuple<CsVarSpec<any>>> = {
  [k in keyof In]: InferCsVar<In[k]>;
};
type TypeAndValue<T> = { type: Provable<T, any>; value: T };
