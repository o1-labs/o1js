/**
 * This module contains basic methods for interacting with OCaml
 */
export { MlArray, MlTuple, MlList, MlOption };

// ocaml types
type MlTuple<X, Y> = [0, X, Y];
type MlArray<T> = [0, ...T[]];
type MlList<T> = [0, T, 0 | MlList<T>];
type MlOption<T> = 0 | [0, T];

const MlArray = {
  to<T>(arr: T[]): MlArray<T> {
    return [0, ...arr];
  },
  from<T>([, ...arr]: MlArray<T>): T[] {
    return arr;
  },
};
