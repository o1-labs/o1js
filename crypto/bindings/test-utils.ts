import { handleErrors } from '../../../lib/testing/equivalent.js';
import { test, Random } from '../../../lib/testing/property.js';
import { deepEqual } from 'node:assert/strict';

export { id, tuple, equivalentRecord };

// a `Spec` tells us how to compare two functions

type Spec<In1 extends Tuple<any>, Out1, In2 extends Tuple<any>, Out2> = {
  // `generators` create random inputs to the first function
  generators: { [k in keyof In1]: Random<In1[k]> };

  // `there` convert to inputs to the second function
  there: {
    [k in keyof In1]: k extends keyof In2 ? (x: In1[k]) => In2[k] : never;
  };

  // `back` converts outputs of the second function back to match the first function
  back: (x: Out2) => Out1;

  // `assertEqual` to compare outputs against each other; defaults to `deepEqual`
  assertEqual?: (x: Out1, y: Out1, message: string) => void;
};

type SpecFromFunctions<F1 extends AnyFunction, F2 extends AnyFunction> = Spec<
  Parameters<F1>,
  ReturnType<F1>,
  Parameters<F2>,
  ReturnType<F2>
>;

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
  {
    there,
    back,
    generators,
    assertEqual = deepEqual<Out1>,
  }: Spec<In1, Out1, In2, Out2>,
  f1: (...args: In1) => Out1,
  f2: (...args: In2) => Out2
) {
  test(...(generators as any[]), (...args) => {
    args.pop();
    let inputs = args as any as In1;
    handleErrors(
      () => f1(...inputs),
      () => back(f2(...(inputs.map((x, i) => there[i](x)) as any as In2))),
      (x, y) => assertEqual(x, y, label)
    );
  });
}

let id = <T>(x: T) => x;

type AnyFunction = (...args: any) => any;

// make TS infer an array as tuple type
function tuple<T extends Tuple<any>>(t: T) {
  return t;
}

type Tuple<T> = [] | [T, ...T[]];
