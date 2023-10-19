/**
 * This module contains basic methods for interacting with OCaml
 */
export {
  MlArray,
  MlTuple,
  MlList,
  MlOption,
  MlBool,
  MlBytes,
  MlResult,
  MlUnit,
};

// ocaml types

type MlTuple<X, Y> = [0, X, Y];
type MlArray<T> = [0, ...T[]];
type MlList<T> = [0, T, 0 | MlList<T>];
type MlOption<T> = 0 | [0, T];
type MlBool = 0 | 1;
type MlResult<T, E> = [0, T] | [1, E];
type MlUnit = 0;

/**
 * js_of_ocaml representation of a byte array,
 * see https://github.com/ocsigen/js_of_ocaml/blob/master/runtime/mlBytes.js
 */
type MlBytes = { t: number; c: string; l: number };

const MlArray = {
  to<T>(arr: T[]): MlArray<T> {
    return [0, ...arr];
  },
  from<T>([, ...arr]: MlArray<T>): T[] {
    return arr;
  },
  map<T, S>([, ...arr]: MlArray<T>, map: (t: T) => S): MlArray<S> {
    return [0, ...arr.map(map)];
  },
};

const MlTuple = Object.assign(
  function MlTuple<X, Y>(x: X, y: Y): MlTuple<X, Y> {
    return [0, x, y];
  },
  {
    from<X, Y>([, x, y]: MlTuple<X, Y>): [X, Y] {
      return [x, y];
    },
    first<X>(t: MlTuple<X, unknown>): X {
      return t[1];
    },
    second<Y>(t: MlTuple<unknown, Y>): Y {
      return t[2];
    },
  }
);

const MlBool = Object.assign(
  function MlBool(b: boolean): MlBool {
    return b ? 1 : 0;
  },
  {
    from(b: MlBool) {
      return !!b;
    },
  }
);

const MlOption = Object.assign(
  function MlOption<T>(x?: T): MlOption<T> {
    return x === undefined ? 0 : [0, x];
  },
  {
    from<T>(option: MlOption<T>): T | undefined {
      return option === 0 ? undefined : option[1];
    },
    map<T, S>(option: MlOption<T>, map: (t: T) => S): MlOption<S> {
      if (option === 0) return 0;
      return [0, map(option[1])];
    },
    mapFrom<T, S>(option: MlOption<T>, map: (t: T) => S): S | undefined {
      if (option === 0) return undefined;
      return map(option[1]);
    },
    mapTo<T, S>(option: T | undefined, map: (t: T) => S): MlOption<S> {
      if (option === undefined) return 0;
      return [0, map(option)];
    },
    isNone(option: MlOption<unknown>): option is 0 {
      return option === 0;
    },
    isSome<T>(option: MlOption<T>): option is [0, T] {
      return option !== 0;
    },
  }
);

const MlResult = {
  ok<T, E>(t: T): MlResult<T, E> {
    return [0, t];
  },
  unitError<T>(): MlResult<T, 0> {
    return [1, 0];
  },
};
