import {
  equivalent,
  SpecFromFunctions,
} from '../../../lib/testing/equivalent.js';

export { equivalentRecord };

type AnyFunction = (...args: any) => any;

function equivalentRecord<
  T extends Record<string, AnyFunction>,
  S extends Record<keyof T, AnyFunction>,
  Specs extends {
    [k in keyof T]: SpecFromFunctions<T[k], S[k]> | undefined;
  }
>(t: T, s: S, specs: Specs) {
  for (let key in specs) {
    let spec = specs[key];
    if (spec === undefined) continue;
    equivalent(spec as any)(t[key], s[key], key);
  }
}
