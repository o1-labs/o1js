import { assert } from './errors.js';

export { AnyFunction, Tuple, TupleN, AnyTuple, TupleMap, Subclass };

type AnyFunction = (...args: any) => any;

type Tuple<T> = [T, ...T[]] | [];
type AnyTuple = Tuple<any>;

type TupleMap<T extends Tuple<any>, B> = [
  ...{
    [i in keyof T]: B;
  }
];

const Tuple = {
  map<T extends Tuple<any>, B>(tuple: T, f: (a: T[number]) => B): TupleMap<T, B> {
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
  map<T extends Tuple<any>, B>(tuple: T, f: (a: T[number]) => B): TupleMap<T, B> {
    return tuple.map(f) as any;
  },

  fromArray<T, N extends number>(n: N, arr: T[]): TupleN<T, N> {
    assert(arr.length === n, `Expected array of length ${n}, got ${arr.length}`);
    return arr as any;
  },

  hasLength<T, N extends number>(n: N, tuple: T[]): tuple is TupleN<T, N> {
    return tuple.length === n;
  },
};

type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : TupleRec<T, N, [T, ...R]>;

// classes

type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };
