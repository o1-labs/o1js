/**
 * This module contains basic methods for interacting with OCaml
 */
export { MlArray, MlTuple, MlList, MlOption, MlBool, MlBytes };

// ocaml types

type MlTuple<X, Y> = [0, X, Y];
type MlArray<T> = [0, ...T[]];
type MlList<T> = [0, T, 0 | MlList<T>];
type MlOption<T> = 0 | [0, T];
type MlBool = 0 | 1;

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
  }
);
