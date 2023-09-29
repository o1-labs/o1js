export { withPrefix, mapTuple, mapMlTuple, MlTupleN };

function withPrefix<prefix extends string, T extends Record<string, any>>(
  prefix: prefix,
  obj: T
) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      return [`${prefix}_${k}`, v];
    })
  ) as {
    [k in keyof T & string as `${prefix}_${k}`]: T[k];
  };
}

type Tuple<T> = [T, ...T[]] | [];

function mapTuple<T extends Tuple<any>, B>(
  tuple: T,
  f: (a: T[number]) => B
): { [i in keyof T]: B } {
  return tuple.map(f) as any;
}

function mapMlTuple<T extends Tuple<any>, B>(
  [, ...mlTuple]: [0, ...T],
  f: (a: T[number]) => B
): [0, ...{ [i in keyof T]: B }] {
  return [0, ...mlTuple.map(f)] as any;
}

/**
 * tuple type that has the length as generic parameter
 */
type MlTupleN<T, N extends number> = N extends N
  ? number extends N
    ? [0, ...T[]] // N is not typed as a constant => fall back to array
    : [0, ...TupleRec<T, N, []>]
  : never;

type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : TupleRec<T, N, [T, ...R]>;
