/**
 * helpers for testing equivalence of two implementations, one of them on bigints
 */
import { test, Random } from '../testing/property.js';
import { Provable } from '../provable.js';
import { deepEqual } from 'node:assert/strict';
import { Field } from '../core.js';

export {
  equivalent,
  createEquivalenceTesters,
  throwError,
  handleErrors,
  deepEqual as defaultAssertEqual,
  id,
};
export { Spec, ToSpec, FromSpec, SpecFromFunctions };

// a `Spec` tells us how to compare two functions

type FromSpec<In1, In2> = {
  // `rng` creates random inputs to the first function
  rng: Random<In1>;

  // `there` converts to inputs to the second function
  there: (x: In1) => In2;
};

type ToSpec<Out1, Out2> = {
  // `back` converts outputs of the second function back to match the first function
  back: (x: Out2) => Out1;

  // `assertEqual` to compare outputs against each other; defaults to `deepEqual`
  assertEqual?: (x: Out1, y: Out1, message: string) => void;
};

type Spec<T1, T2> = FromSpec<T1, T2> & ToSpec<T1, T2>;

type FuncSpec<In1 extends Tuple<any>, Out1, In2 extends Tuple<any>, Out2> = {
  from: {
    [k in keyof In1]: k extends keyof In2 ? FromSpec<In1[k], In2[k]> : never;
  };
  to: ToSpec<Out1, Out2>;
};

type SpecFromFunctions<
  F1 extends AnyFunction,
  F2 extends AnyFunction
> = FuncSpec<Parameters<F1>, ReturnType<F1>, Parameters<F2>, ReturnType<F2>>;

function equivalent<In1 extends Tuple<any>, Out1, In2 extends Tuple<any>, Out2>(
  { from, to }: FuncSpec<In1, Out1, In2, Out2>,
  f1: (...args: In1) => Out1,
  f2: (...args: In2) => Out2,
  label = 'expect equal results'
) {
  let generators = from.map((spec) => spec.rng);
  let assertEqual = to.assertEqual ?? deepEqual;
  test(...(generators as any[]), (...args) => {
    args.pop();
    let inputs = args as any as In1;
    handleErrors(
      () => f1(...inputs),
      () =>
        to.back(f2(...(inputs.map((x, i) => from[i].there(x)) as any as In2))),
      (x, y) => assertEqual(x, y, label),
      label
    );
  });
}

function id<T>(x: T) {
  return x;
}

// equivalence in provable code

type ProvableSpec<T1, T2> = Spec<T1, T2> & { provable: Provable<T2> };
type MaybeProvableFromSpec<T1, T2> = FromSpec<T1, T2> & {
  provable?: Provable<T2>;
};

function equivalentProvable<
  In extends Tuple<MaybeProvableFromSpec<any, any>>,
  Out extends ToSpec<any, any>
>({ from, to }: { from: In; to: Out }) {
  return function run(
    f1: (...args: Params1<In>) => Result1<Out>,
    f2: (...args: Params2<In>) => Result2<Out>,
    label = 'expect equal results'
  ) {
    let generators = from.map((spec) => spec.rng);
    let assertEqual = to.assertEqual ?? deepEqual;
    test(...(generators as any[]), (...args) => {
      args.pop();
      let inputs = args as any as Params1<In>;
      let inputs2 = inputs.map((x, i) =>
        from[i].there(x)
      ) as any as Params2<In>;

      // outside provable code
      handleErrors(
        () => f1(...inputs),
        () => f2(...inputs2),
        (x, y) => assertEqual(x, to.back(y), label),
        label
      );

      // inside provable code
      Provable.runAndCheck(() => {
        let inputWitnesses = inputs2.map((x, i) => {
          let provable = from[i].provable;
          return provable !== undefined
            ? Provable.witness(provable, () => x)
            : x;
        }) as any as Params2<In>;
        handleErrors(
          () => f1(...inputs),
          () => f2(...inputWitnesses),
          (x, y) => Provable.asProver(() => assertEqual(x, to.back(y), label))
        );
      });
    });
  };
}

// some useful specs

let unit: ToSpec<void, void> = { back: id, assertEqual() {} };

let field: ProvableSpec<bigint, Field> = {
  rng: Random.field,
  there: (x) => new Field(x),
  back: (x) => x.toBigInt(),
  provable: Field,
};

let fieldBigint: Spec<bigint, bigint> = {
  rng: Random.field,
  there: id,
  back: id,
};

// old equivalence testers

function createEquivalenceTesters() {
  function equivalent1(
    f1: (x: Field) => Field,
    f2: (x: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    let field_ = { ...field, rng };
    equivalentProvable({ from: [field_], to: field_ })(f2, f1);
  }
  function equivalent2(
    f1: (x: Field, y: Field | bigint) => Field,
    f2: (x: bigint, y: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    let field_ = { ...field, rng };
    let fieldBigint_ = { ...fieldBigint, rng };
    equivalentProvable({ from: [field_, field_], to: field_ })(f2, f1);
    equivalentProvable({ from: [field_, fieldBigint_], to: field_ })(f2, f1);
  }
  function equivalentVoid1(
    f1: (x: Field) => void,
    f2: (x: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    let field_ = { ...field, rng };
    equivalentProvable({ from: [field_], to: unit })(f2, f1);
  }
  function equivalentVoid2(
    f1: (x: Field, y: Field | bigint) => void,
    f2: (x: bigint, y: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    let field_ = { ...field, rng };
    let fieldBigint_ = { ...fieldBigint, rng };
    equivalentProvable({ from: [field_, field_], to: unit })(f2, f1);
    equivalentProvable({ from: [field_, fieldBigint_], to: unit })(f2, f1);
  }

  return { equivalent1, equivalent2, equivalentVoid1, equivalentVoid2 };
}

function handleErrors<T, S, R>(
  op1: () => T,
  op2: () => S,
  useResults?: (a: T, b: S) => R,
  label?: string
): R | undefined {
  let result1: T, result2: S;
  let error1: Error | undefined;
  let error2: Error | undefined;
  try {
    result1 = op1();
  } catch (err) {
    error1 = err as Error;
  }
  try {
    result2 = op2();
  } catch (err) {
    error2 = err as Error;
  }
  if (!!error1 !== !!error2) {
    error1 && console.log(error1);
    error2 && console.log(error2);
  }
  let message = `${(label && `${label}: `) || ''}equivalent errors`;
  deepEqual(!!error1, !!error2, message);
  if (!(error1 || error2) && useResults !== undefined) {
    return useResults(result1!, result2!);
  }
}

function throwError(message?: string): any {
  throw Error(message);
}

// helper types

type AnyFunction = (...args: any) => any;

type Tuple<T> = [] | [T, ...T[]];

// infer input types from specs

type Params1<Ins extends Tuple<FromSpec<any, any>>> = {
  [k in keyof Ins]: Ins[k] extends FromSpec<infer In, any> ? In : never;
};
type Params2<Ins extends Tuple<FromSpec<any, any>>> = {
  [k in keyof Ins]: Ins[k] extends FromSpec<any, infer In> ? In : never;
};
type Result1<Out extends ToSpec<any, any>> = Out extends ToSpec<infer Out1, any>
  ? Out1
  : never;
type Result2<Out extends ToSpec<any, any>> = Out extends ToSpec<any, infer Out2>
  ? Out2
  : never;
