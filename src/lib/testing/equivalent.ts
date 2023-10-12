/**
 * helpers for testing equivalence of two implementations, one of them on bigints
 */
import { test, Random } from '../testing/property.js';
import { Provable } from '../provable.js';
import { deepEqual } from 'node:assert/strict';

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
  label?: string
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
      (x, y) => assertEqual(x, y, label ?? 'same results'),
      label
    );
  });
}

let id = <T>(x: T) => x;

function createEquivalenceTesters<Field extends { toBigInt(): bigint }>(
  Field: Provable<Field>,
  newField: (x: bigint) => Field
) {
  function equivalent1(
    op1: (x: Field) => Field,
    op2: (x: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, (x0, assert) => {
      let x = newField(x0);
      // outside provable code
      handleErrors(
        () => op1(x),
        () => op2(x0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        handleErrors(
          () => op1(x),
          () => op2(x0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
      });
    });
  }
  function equivalent2(
    op1: (x: Field, y: Field | bigint) => Field,
    op2: (x: bigint, y: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, rng, (x0, y0, assert) => {
      let x = newField(x0);
      let y = newField(y0);
      // outside provable code
      handleErrors(
        () => op1(x, y),
        () => op2(x0, y0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      handleErrors(
        () => op1(x, y0),
        () => op2(x0, y0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        y = Provable.witness(Field, () => y);
        handleErrors(
          () => op1(x, y),
          () => op2(x0, y0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
        handleErrors(
          () => op1(x, y0),
          () => op2(x0, y0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
      });
    });
  }
  function equivalentVoid1(
    op1: (x: Field) => void,
    op2: (x: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, (x0) => {
      let x = newField(x0);
      // outside provable code
      handleErrors(
        () => op1(x),
        () => op2(x0)
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        handleErrors(
          () => op1(x),
          () => op2(x0)
        );
      });
    });
  }
  function equivalentVoid2(
    op1: (x: Field, y: Field | bigint) => void,
    op2: (x: bigint, y: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, rng, (x0, y0) => {
      let x = newField(x0);
      let y = newField(y0);
      // outside provable code
      handleErrors(
        () => op1(x, y),
        () => op2(x0, y0)
      );
      handleErrors(
        () => op1(x, y0),
        () => op2(x0, y0)
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        y = Provable.witness(Field, () => y);
        handleErrors(
          () => op1(x, y),
          () => op2(x0, y0)
        );
        handleErrors(
          () => op1(x, y0),
          () => op2(x0, y0)
        );
      });
    });
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
