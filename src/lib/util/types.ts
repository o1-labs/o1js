import { assert } from '../errors.js';

export { Tuple, TupleN, AnyTuple };

type Tuple<T> = [T, ...T[]] | [];
type AnyTuple = Tuple<any>;

const Tuple = {
  map<T extends Tuple<any>, B>(
    tuple: T,
    f: (a: T[number]) => B
  ): [...{ [i in keyof T]: B }] {
    return tuple.map(f) as any;
  },
};

/**
 * tuple type that has the length as generic parameter
 */
type TupleN<T, N extends number> = N extends N
  ? number extends N
    ? [...T[]] // N is not typed as a constant => fall back to array
    : [...TupleRec<T, N, []>]
  : never;

const TupleN = {
  map<T extends Tuple<any>, B>(
    tuple: T,
    f: (a: T[number]) => B
  ): [...{ [i in keyof T]: B }] {
    return tuple.map(f) as any;
  },

  fromArray<T, N extends number>(n: N, arr: T[]): TupleN<T, N> {
    assert(
      arr.length === n,
      `Expected array of length ${n}, got ${arr.length}`
    );
    return arr as any;
  },
};

type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : TupleRec<T, N, [T, ...R]>;
