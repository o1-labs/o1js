/**
 * {@link ProvableBn254} is
 * - a namespace with tools for writing provable code
 * - the main interface for types that can be used in provable code
 */
import { FieldBn254, BoolBn254 } from './core-bn254.js';
import { ProvableBn254 as Provable_, Snarky } from '../snarky.js';
import type { FlexibleProvable, ProvableExtended } from './circuit-value.js';
import { Context } from './global-context.js';
import {
  HashInput,
  InferJson,
  InferProvable,
  InferredProvable,
} from '../bindings/lib/provable-snarky.js';
import {
  inCheckedComputation,
  inProver,
  snarkContext,
  asProverBn254 as asProver,
  runAndCheckBn254 as runAndCheck,
  runUncheckedBn254 as runUnchecked,
  constraintSystemBn254 as constraintSystem,
} from './provable-context-bn254.js';

// external API
export { ProvableBn254 };

// internal API
export {
  memoizationContext,
  MemoizationContext,
  memoizeWitness,
  getBlindingValue,
};

// TODO move type declaration here
/**
 * `ProvableBn254<T>` is the general circuit type interface. It describes how a type `T` is made up of field elements and auxiliary (non-field element) data.
 *
 * You will find this as the required input type in a few places in o1js. One convenient way to create a `ProvableBn254<T>` is using `Struct`.
 */
type ProvableBn254<T> = Provable_<T>;

const ProvableBn254 = {
  /**
   * Create a new witness. A witness, or variable, is a value that is provided as input
   * by the prover. This provides a flexible way to introduce values from outside into the circuit.
   * However, note that nothing about how the value was created is part of the proof - `ProvableBn254.witness`
   * behaves exactly like user input. So, make sure that after receiving the witness you make any assertions
   * that you want to associate with it.
   * @example
   * Example for re-implementing `FieldBn254.inv` with the help of `witness`:
   * ```ts
   * let invX = ProvableBn254.witness(FieldBn254, () => {
   *   // compute the inverse of `x` outside the circuit, however you like!
   *   return FieldBn254.inv(x));
   * }
   * // prove that `invX` is really the inverse of `x`:
   * invX.mul(x).assertEquals(1);
   * ```
   */
  witness,
  /**
   * Proof-compatible if-statement.
   * This behaves like a ternary conditional statement in JS.
   *
   * **Warning**: Since `ProvableBn254.if()` is a normal JS function call, both the if and the else branch
   * are evaluated before calling it. Therefore, you can't use this function
   * to guard against execution of one of the branches. It only allows you to pick one of two values.
   *
   * @example
   * ```ts
   * const condition = BoolBn254(true);
   * const result = ProvableBn254.if(condition, FieldBn254(1), FieldBn254(2)); // returns FieldBn254(1)
   * ```
   */
  if: if_,
  /**
   * Generalization of {@link ProvableBn254.if} for choosing between more than two different cases.
   * It takes a "mask", which is an array of `BoolBn254`s that contains only one `true` element, a type/constructor, and an array of values of that type.
   * The result is that value which corresponds to the true element of the mask.
   * @example
   * ```ts
   * let x = ProvableBn254.switch([BoolBn254(false), BoolBn254(true)], FieldBn254, [FieldBn254(1), FieldBn254(2)]);
   * x.assertEquals(2);
   * ```
   */
  switch: switch_,

  /**
   * Asserts that two values are equal.
   * @example
   * ```ts
   * class MyStruct extends Struct({ a: FieldBn254, b: BoolBn254 }) {};
   * const a: MyStruct = { a: FieldBn254(0), b: BoolBn254(false) };
   * const b: MyStruct = { a: FieldBn254(1), b: BoolBn254(true) };
   * ProvableBn254.assertEqual(MyStruct, a, b);
   * ```
   */
  assertEqual,
  /**
   * Checks if two elements are equal.
   * @example
   * ```ts
   * class MyStruct extends Struct({ a: FieldBn254, b: BoolBn254 }) {};
   * const a: MyStruct = { a: FieldBn254(0), b: BoolBn254(false) };
   * const b: MyStruct = { a: FieldBn254(1), b: BoolBn254(true) };
   * const isEqual = ProvableBn254.equal(MyStruct, a, b);
   * ```
   */
  equal,
  /**
   * Creates a {@link ProvableBn254} for a generic array.
   * @example
   * ```ts
   * const ProvableArray = ProvableBn254.Array(FieldBn254, 5);
   * ```
   */
  Array: provableArray,
  /**
   * Check whether a value is constant.
   * See {@link FieldVar} for more information about constants and variables.
   *
   * @example
   * ```ts
   * let x = FieldBn254(42);
   * ProvableBn254.isConstant(FieldBn254, x); // true
   * ```
   */
  isConstant,
  /**
   * Interface to log elements within a circuit. Similar to `console.log()`.
   * @example
   * ```ts
   * const element = FieldBn254(42);
   * ProvableBn254.log(element);
   * ```
   */
  log,
  /**
   * Runs code as a prover using Pasta backend.
   * @example
   * ```ts
   * ProvableBn254.asProver(() => {
   *   // Your prover code here
   * });
   * ```
   */
  asProver,
  /**
   * Runs provable code quickly, without creating a proof, but still checking whether constraints are satisfied.
   * @example
   * ```ts
   * ProvableBn254.runAndCheck(() => {
   *   // Your code to check here
   * });
   * ```
   */
  runAndCheck,
  /**
   * Runs provable code quickly, without creating a proof, and not checking whether constraints are satisfied.
   * @example
   * ```ts
   * ProvableBn254.runUnchecked(() => {
   *   // Your code to run here
   * });
   * ```
   */
  runUnchecked,
  /**
   * Returns information about the constraints created by the callback function.
   * @example
   * ```ts
   * const result = ProvableBn254.constraintSystem(circuit);
   * console.log(result);
   * ```
   */
  constraintSystem,
  /**
   * Checks if the code is run in prover mode.
   * @example
   * ```ts
   * if (ProvableBn254.inProver()) {
   *   // Prover-specific code
   * }
   * ```
   */
  inProver,
  /**
   * Checks if the code is run in checked computation mode.
   * @example
   * ```ts
   * if (ProvableBn254.inCheckedComputation()) {
   *   // Checked computation-specific code
   * }
   * ```
   */
  inCheckedComputation,

  /**
   * Returns a constant version of a provable type.
   */
  toConstant<T>(type: ProvableBn254<T>, value: T) {
    return type.fromFields(
      type.toFields(value).map((x) => x.toConstant()),
      type.toAuxiliary(value)
    );
  },
};

function witness<T, S extends FlexibleProvable<T> = FlexibleProvable<T>>(
  type: S,
  compute: () => T
): T {
  let ctx = snarkContext.get();

  // outside provable code, we just call the callback and return its cloned result
  console.log("BN254");
  // !inCheckedComputation should return false but it returns true
  let notInCheckedComputation = !inCheckedComputation();
  console.log("!inCheckedComputation():", notInCheckedComputation);
  console.log("ctx.inWitnessBlock:", ctx.inWitnessBlock);
  console.log("!inCheckedComputation() || ctx.inWitnessBlock:", notInCheckedComputation || ctx.inWitnessBlock);
  if (notInCheckedComputation || ctx.inWitnessBlock) {
    let ret = compute();
    console.log("compute():")
    console.dir(ret, { depth: null });
    return clone(type, ret);
  }
  let proverValue: T | undefined = undefined;
  let fields: FieldBn254[];

  let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
  try {
    let [, ...fieldVars] = Snarky.bn254.exists(type.sizeInFields(), () => {
      proverValue = compute();
      let fields = type.toFields(proverValue);
      let fieldConstants = fields.map((x) => x.toConstant().value[1]);

      // TODO: enable this check
      // currently it throws for Scalar.. which seems to be flexible about what length is returned by toFields
      // if (fields.length !== type.sizeInFields()) {
      //   throw Error(
      //     `Invalid witness. Expected ${type.sizeInFields()} field elements, got ${
      //       fields.length
      //     }.`
      //   );
      // }
      return [0, ...fieldConstants];
    });
    fields = fieldVars.map(FieldBn254);
  } finally {
    snarkContext.leave(id);
  }

  // rebuild the value from its fields (which are now variables) and aux data
  let aux = type.toAuxiliary(proverValue);
  let value = (type as ProvableBn254<T>).fromFields(fields, aux);

  // add type-specific constraints
  type.check(value);

  return value;
}

type ToFieldable = { toFields(): FieldBn254[] };

// general provable methods

function assertEqual<T>(type: FlexibleProvable<T>, x: T, y: T): void;
function assertEqual<T extends ToFieldable>(x: T, y: T): void;
function assertEqual(typeOrX: any, xOrY: any, yOrUndefined?: any) {
  if (yOrUndefined === undefined) {
    return assertEqualImplicit(typeOrX, xOrY);
  } else {
    return assertEqualExplicit(typeOrX, xOrY, yOrUndefined);
  }
}
function assertEqualImplicit<T extends ToFieldable>(x: T, y: T) {
  let xs = x.toFields();
  let ys = y.toFields();
  let n = checkLength('ProvableBn254.assertEqual', xs, ys);
  for (let i = 0; i < n; i++) {
    xs[i].assertEquals(ys[i]);
  }
}
function assertEqualExplicit<T>(type: ProvableBn254<T>, x: T, y: T) {
  let xs = type.toFields(x);
  let ys = type.toFields(y);
  for (let i = 0; i < xs.length; i++) {
    xs[i].assertEquals(ys[i]);
  }
}

function equal<T>(type: FlexibleProvable<T>, x: T, y: T): BoolBn254;
function equal<T extends ToFieldable>(x: T, y: T): BoolBn254;
function equal(typeOrX: any, xOrY: any, yOrUndefined?: any) {
  if (yOrUndefined === undefined) {
    return equalImplicit(typeOrX, xOrY);
  } else {
    return equalExplicit(typeOrX, xOrY, yOrUndefined);
  }
}
// TODO: constraints can be reduced by up to 2x for large structures by using a variant
// of the `equals` argument where we return 1 - z(x0 - y0)(x1 - y1)...(xn - yn)
// current version will do (1 - z0(x0 - y0))(1 - z1(x1 - y1))... + constrain each factor
function equalImplicit<T extends ToFieldable>(x: T, y: T) {
  let xs = x.toFields();
  let ys = y.toFields();
  checkLength('ProvableBn254.equal', xs, ys);
  return xs.map((x, i) => x.equals(ys[i])).reduce(BoolBn254.and);
}
function equalExplicit<T>(type: ProvableBn254<T>, x: T, y: T) {
  let xs = type.toFields(x);
  let ys = type.toFields(y);
  return xs.map((x, i) => x.equals(ys[i])).reduce(BoolBn254.and);
}

function if_<T>(condition: BoolBn254, type: FlexibleProvable<T>, x: T, y: T): T;
function if_<T extends ToFieldable>(condition: BoolBn254, x: T, y: T): T;
function if_(condition: BoolBn254, typeOrX: any, xOrY: any, yOrUndefined?: any) {
  if (yOrUndefined === undefined) {
    return ifImplicit(condition, typeOrX, xOrY);
  } else {
    return ifExplicit(condition, typeOrX, xOrY, yOrUndefined);
  }
}

function ifField(b: FieldBn254, x: FieldBn254, y: FieldBn254) {
  // b*(x - y) + y
  // NOTE: the R1CS constraint used by FieldBn254.if_ in snarky-ml
  // leads to a different but equivalent layout (same # constraints)
  // https://github.com/o1-labs/snarky/blob/14f8e2ff981a9c9ea48c94b2cc1d8c161301537b/src/base/utils.ml#L171
  // in the case x, y are constant, the layout is the same
  return b.mul(x.sub(y)).add(y).seal();
}

function ifExplicit<T>(condition: BoolBn254, type: ProvableBn254<T>, x: T, y: T): T {
  let xs = type.toFields(x);
  let ys = type.toFields(y);
  let b = condition.toField();

  // simple case: b is constant - it's like a normal if statement
  if (b.isConstant()) {
    return clone(type, condition.toBoolean() ? x : y);
  }

  // if b is variable, we compute if as follows:
  // if(b, x, y)[i] = b*(x[i] - y[i]) + y[i]
  let fields = xs.map((xi, i) => ifField(b, xi, ys[i]));
  let aux = auxiliary(type, () => (condition.toBoolean() ? x : y));
  return type.fromFields(fields, aux);
}

function ifImplicit<T extends ToFieldable>(condition: BoolBn254, x: T, y: T): T {
  let type = x.constructor;
  if (type === undefined)
    throw Error(
      `You called ProvableBn254.if(bool, x, y) with an argument x that has no constructor, which is not supported.\n` +
      `If x, y are Structs or other custom types, you can use the following:\n` +
      `ProvableBn254.if(bool, MyType, x, y)`
    );
  if (type !== y.constructor) {
    throw Error(
      'ProvableBn254.if: Mismatched argument types. Try using an explicit type argument:\n' +
      `ProvableBn254.if(bool, MyType, x, y)`
    );
  }
  if (!('fromFields' in type && 'toFields' in type)) {
    throw Error(
      'ProvableBn254.if: Invalid argument type. Try using an explicit type argument:\n' +
      `ProvableBn254.if(bool, MyType, x, y)`
    );
  }
  return ifExplicit(condition, type as any as ProvableBn254<T>, x, y);
}

function switch_<T, A extends FlexibleProvable<T>>(
  mask: BoolBn254[],
  type: A,
  values: T[]
): T {
  // picks the value at the index where mask is true
  let nValues = values.length;
  if (mask.length !== nValues)
    throw Error(
      `ProvableBn254.switch: \`values\` and \`mask\` have different lengths (${values.length} vs. ${mask.length}), which is not allowed.`
    );
  let checkMask = () => {
    let nTrue = mask.filter((b) => b.toBoolean()).length;
    if (nTrue > 1) {
      throw Error(
        `ProvableBn254.switch: \`mask\` must have 0 or 1 true element, found ${nTrue}.`
      );
    }
  };
  if (mask.every((b) => b.toField().isConstant())) checkMask();
  else ProvableBn254.asProver(checkMask);
  let size = type.sizeInFields();
  let fields = Array(size).fill(FieldBn254(0));
  for (let i = 0; i < nValues; i++) {
    let valueFields = type.toFields(values[i]);
    let maskField = mask[i].toField();
    for (let j = 0; j < size; j++) {
      let maybeField = valueFields[j].mul(maskField);
      fields[j] = fields[j].add(maybeField);
    }
  }
  let aux = auxiliary(type as ProvableBn254<T>, () => {
    let i = mask.findIndex((b) => b.toBoolean());
    if (i === -1) return undefined;
    return values[i];
  });
  return (type as ProvableBn254<T>).fromFields(fields, aux);
}

function isConstant<T>(type: ProvableBn254<T>, x: T): boolean {
  return type.toFields(x).every((x) => x.isConstant());
}

// logging in provable code

function log(...args: any) {
  asProver(() => {
    let prettyArgs = [];
    for (let arg of args) {
      if (arg?.toPretty !== undefined) prettyArgs.push(arg.toPretty());
      else {
        try {
          prettyArgs.push(JSON.parse(JSON.stringify(arg)));
        } catch {
          prettyArgs.push(arg);
        }
      }
    }
    console.log(...prettyArgs);
  });
}

// helpers

function checkLength(name: string, xs: FieldBn254[], ys: FieldBn254[]) {
  let n = xs.length;
  let m = ys.length;
  if (n !== m) {
    throw Error(
      `${name}: inputs must contain the same number of field elements, got ${n} !== ${m}`
    );
  }
  return n;
}

function clone<T, S extends FlexibleProvable<T>>(type: S, value: T): T {
  let fields = type.toFields(value);
  let aux = type.toAuxiliary?.(value) ?? [];
  return (type as ProvableBn254<T>).fromFields(fields, aux);
}

function auxiliary<T>(type: ProvableBn254<T>, compute: () => T | undefined) {
  let aux;
  // TODO: this accepts types without .toAuxiliary(), should be changed when all snarky types are moved to TS
  ProvableBn254.asProver(() => {
    let value = compute();
    if (value !== undefined) {
      aux = type.toAuxiliary?.(value);
    }
  });
  return aux ?? type.toAuxiliary?.() ?? [];
}

type MemoizationContext = {
  memoized: { fields: FieldBn254[]; aux: any[] }[];
  currentIndex: number;
  blindingValue: FieldBn254;
};
let memoizationContext = Context.create<MemoizationContext>();

/**
 * Like ProvableBn254.witness, but memoizes the witness during transaction construction
 * for reuse by the prover. This is needed to witness non-deterministic values.
 */
function memoizeWitness<T>(type: FlexibleProvable<T>, compute: () => T) {
  return ProvableBn254.witness<T>(type as ProvableBn254<T>, () => {
    if (!memoizationContext.has()) return compute();
    let context = memoizationContext.get();
    let { memoized, currentIndex } = context;
    let currentValue = memoized[currentIndex];
    if (currentValue === undefined) {
      let value = compute();
      let fields = type.toFields(value).map((x) => x.toConstant());
      let aux = type.toAuxiliary(value);
      currentValue = { fields, aux };
      memoized[currentIndex] = currentValue;
    }
    context.currentIndex += 1;
    return (type as ProvableBn254<T>).fromFields(
      currentValue.fields,
      currentValue.aux
    );
  });
}

function getBlindingValue() {
  if (!memoizationContext.has()) return FieldBn254.random();
  let context = memoizationContext.get();
  if (context.blindingValue === undefined) {
    context.blindingValue = FieldBn254.random();
  }
  return context.blindingValue;
}

// TODO this should return a class, like Struct, so you can just use `class Array3 extends ProvableBn254.Array(FieldBn254, 3) {}`
function provableArray<A extends FlexibleProvable<any>>(
  elementType: A,
  length: number
): InferredProvable<A[]> {
  type T = InferProvable<A>;
  type TJson = InferJson<A>;
  let type = elementType as ProvableExtended<T>;
  return {
    /**
     * Returns the size of this structure in {@link FieldBn254} elements.
     * @returns size of this structure
     */
    sizeInFields() {
      let elementLength = type.sizeInFields();
      return elementLength * length;
    },
    /**
     * Serializes this structure into {@link FieldBn254} elements.
     * @returns an array of {@link FieldBn254} elements
     */
    toFields(array: T[]) {
      return array.map((e) => type.toFields(e)).flat();
    },
    /**
     * Serializes this structure's auxiliary data.
     * @returns auxiliary data
     */
    toAuxiliary(array?) {
      let array_ = array ?? Array<undefined>(length).fill(undefined);
      return array_?.map((e) => type.toAuxiliary(e));
    },

    /**
     * Deserializes an array of {@link FieldBn254} elements into this structure.
     */
    fromFields(fields: FieldBn254[], aux?: any[]) {
      let array = [];
      let size = type.sizeInFields();
      let n = length;
      for (let i = 0, offset = 0; i < n; i++, offset += size) {
        array[i] = type.fromFields(
          fields.slice(offset, offset + size),
          aux?.[i]
        );
      }
      return array;
    },
    check(array: T[]) {
      for (let i = 0; i < length; i++) {
        (type as any).check(array[i]);
      }
    },
    /**
     * Encodes this structure into a JSON-like object.
     */
    toJSON(array) {
      if (!('toJSON' in type)) {
        throw Error('circuitArray.toJSON: element type has no toJSON method');
      }
      return array.map((v) => type.toJSON(v));
    },

    /**
     * Decodes a JSON-like object into this structure.
     */
    fromJSON(json) {
      if (!('fromJSON' in type)) {
        throw Error(
          'circuitArray.fromJSON: element type has no fromJSON method'
        );
      }
      return json.map((a) => type.fromJSON(a));
    },
    toInput(array) {
      if (!('toInput' in type)) {
        throw Error('circuitArray.toInput: element type has no toInput method');
      }
      return array.reduce(
        (curr, value) => HashInput.append(curr, type.toInput(value)),
        HashInput.empty
      );
    },

    empty() {
      if (!('empty' in type)) {
        throw Error('circuitArray.empty: element type has no empty() method');
      }
      return Array.from({ length }, () => type.empty());
    },
  } satisfies ProvableExtended<T[], TJson[]> as any;
}
