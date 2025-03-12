export { withPrefix, mapTuple };

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
