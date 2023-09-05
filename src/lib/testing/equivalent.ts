/**
 * helpers for testing equivalence of two implementations, one of them on bigints
 */
import { test, Random } from '../testing/property.js';
import { Provable } from '../provable.js';
import { deepEqual } from 'node:assert/strict';

export { createEquivalenceTesters, throwError, handleErrors };

function createEquivalenceTesters<Field extends { toBigInt(): bigint }>(
  Field: Provable<Field>,
  newField: (x: bigint) => Field
) {
  function equivalent1(
    op1: (x: Field) => Field,
    op2: (x: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, (x0, assert) => {
      let x = newField(x0);
      // outside provable code
      handleErrors(
        () => op1(x),
        () => op2(x0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        handleErrors(
          () => op1(x),
          () => op2(x0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
      });
    });
  }
  function equivalent2(
    op1: (x: Field, y: Field | bigint) => Field,
    op2: (x: bigint, y: bigint) => bigint,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, rng, (x0, y0, assert) => {
      let x = newField(x0);
      let y = newField(y0);
      // outside provable code
      handleErrors(
        () => op1(x, y),
        () => op2(x0, y0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      handleErrors(
        () => op1(x, y0),
        () => op2(x0, y0),
        (a, b) => assert(a.toBigInt() === b, 'equal results')
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        y = Provable.witness(Field, () => y);
        handleErrors(
          () => op1(x, y),
          () => op2(x0, y0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
        handleErrors(
          () => op1(x, y0),
          () => op2(x0, y0),
          (a, b) =>
            Provable.asProver(() => assert(a.toBigInt() === b, 'equal results'))
        );
      });
    });
  }
  function equivalentVoid1(
    op1: (x: Field) => void,
    op2: (x: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, (x0) => {
      let x = newField(x0);
      // outside provable code
      handleErrors(
        () => op1(x),
        () => op2(x0)
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        handleErrors(
          () => op1(x),
          () => op2(x0)
        );
      });
    });
  }
  function equivalentVoid2(
    op1: (x: Field, y: Field | bigint) => void,
    op2: (x: bigint, y: bigint) => void,
    rng: Random<bigint> = Random.field
  ) {
    test(rng, rng, (x0, y0) => {
      let x = newField(x0);
      let y = newField(y0);
      // outside provable code
      handleErrors(
        () => op1(x, y),
        () => op2(x0, y0)
      );
      handleErrors(
        () => op1(x, y0),
        () => op2(x0, y0)
      );
      // inside provable code
      Provable.runAndCheck(() => {
        x = Provable.witness(Field, () => x);
        y = Provable.witness(Field, () => y);
        handleErrors(
          () => op1(x, y),
          () => op2(x0, y0)
        );
        handleErrors(
          () => op1(x, y0),
          () => op2(x0, y0)
        );
      });
    });
  }

  return { equivalent1, equivalent2, equivalentVoid1, equivalentVoid2 };
}

function handleErrors<T, S, R>(
  op1: () => T,
  op2: () => S,
  useResults?: (a: T, b: S) => R
): R | undefined {
  let result1: T, result2: S;
  let error1: Error | undefined;
  let error2: Error | undefined;
  try {
    result1 = op1();
  } catch (err) {
    error1 = err as Error;
  }
  try {
    result2 = op2();
  } catch (err) {
    error2 = err as Error;
  }
  if (!!error1 !== !!error2) {
    error1 && console.log(error1);
    error2 && console.log(error2);
  }
  deepEqual(!!error1, !!error2, 'equivalent errors');
  if (!(error1 || error2) && useResults !== undefined) {
    return useResults(result1!, result2!);
  }
}

function throwError(message?: string): any {
  throw Error(message);
}
