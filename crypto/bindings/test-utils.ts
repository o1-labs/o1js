import { handleErrors } from '../../../lib/testing/equivalent.js';
import { test, Random } from '../../../lib/testing/property.js';
import { deepEqual } from 'node:assert/strict';

export { id, equivalentRecord, Spec };

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

function equivalentRecord<
  T extends Record<string, AnyFunction>,
  S extends Record<keyof T, AnyFunction>,
  Spec extends {
    [k in keyof T]: SpecFromFunctions<T[k], S[k]> | undefined;
  }
>(t: T, s: S, spec: Spec) {
  for (let k in spec) {
    let spec_ = spec[k];
    if (spec_ === undefined) continue;
    same(k, spec_, t[k], s[k]);
  }
}

function same<In1 extends Tuple<any>, Out1, In2 extends Tuple<any>, Out2>(
  label: string,
  { from, to }: FuncSpec<In1, Out1, In2, Out2>,
  f1: (...args: In1) => Out1,
  f2: (...args: In2) => Out2
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
      (x, y) => assertEqual(x, y, label)
    );
  });
}

let id = <T>(x: T) => x;

type AnyFunction = (...args: any) => any;

type Tuple<T> = [] | [T, ...T[]];
