import { assert } from './errors.js';

export { Guard, AnyFunction, Tuple, TupleN, AnyTuple, TupleMap };

type Guard<T, U extends T> = (value: T) => value is U;

type AnyFunction = (...args: any) => any;

type Tuple<T> = [T, ...T[]] | [];
type AnyTuple = Tuple<any>;

type TupleMap<T extends Tuple<any>, B> = [
  ...{
    [i in keyof T]: B;
  }
];

const Tuple = {
  map<T extends Tuple<any>, B>(
    tuple: T,
    f: (a: T[number]) => B
  ): TupleMap<T, B> {
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
  ): TupleMap<T, B> {
    return tuple.map(f) as any;
  },

  fromArray<T, N extends number>(n: N, arr: T[]): TupleN<T, N> {
    assert(
      arr.length === n,
      `Expected array of length ${n}, got ${arr.length}`
    );
    return arr as any;
  },

  hasLength<T, N extends number>(n: N, tuple: T[]): tuple is TupleN<T, N> {
    return tuple.length === n;
  },
};

type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : TupleRec<T, N, [T, ...R]>;
