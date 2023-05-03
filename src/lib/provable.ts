/**
 * {@link Provable} is
 * - a namespace with tools for writing provable code
 * - the main interface for types that can be used in provable code
 */
import { Field, Provable as Provable_, Snarky } from '../snarky.js';
import { FlexibleProvable } from './circuit_value.js';
import { Context } from './global-context.js';
import { inCheckedComputation, snarkContext } from './proof_system.js';

// external API
export { Provable };

// internal API
export { memoizationContext, memoizeWitness, getBlindingValue };

// TODO move type declaration here
type Provable<T> = Provable_<T>;

const Provable = {
  /**
   * Create a new witness. A witness, or variable, is a value that is provided as input
   * by the prover. This provides a flexible way to introduce values from outside into the circuit.
   * However, note that nothing about how the value was created is part of the proof - `Circuit.witness`
   * behaves exactly like user input. So, make sure that after receiving the witness you make any assertions
   * that you want to associate with it.
   * @example
   * Example for re-implementing `Field.inv` with the help of `witness`:
   * ```ts
   * let invX = Circuit.witness(Field, () => {
   *   // compute the inverse of `x` outside the circuit, however you like!
   *   return Field.inv(x));
   * }
   * // prove that `invX` is really the inverse of `x`:
   * invX.mul(x).assertEquals(1);
   * ```
   */
  witness<T, S extends FlexibleProvable<T> = FlexibleProvable<T>>(
    type: S,
    compute: () => T
  ): T {
    let ctx = snarkContext.get();

    // outside provable code, we just call the callback and return its cloned result
    if (!inCheckedComputation() || ctx.inWitnessBlock) {
      return clone(type, compute());
    }
    let proverValue: T | undefined = undefined;
    let fields: Field[];

    let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
    try {
      fields = Snarky.exists(type.sizeInFields(), () => {
        proverValue = compute();
        let fields = type.toFields(proverValue);

        // TODO currently not needed, because fields are converted in OCaml, but will be
        // fields = fields.map((x) => x.toConstant());

        // TODO: enable this check
        // currently it throws for Scalar.. which seems to be flexible about what length is returned by toFields
        // if (fields.length !== type.sizeInFields()) {
        //   throw Error(
        //     `Invalid witness. Expected ${type.sizeInFields()} field elements, got ${
        //       fields.length
        //     }.`
        //   );
        // }
        return fields;
      });
    } finally {
      snarkContext.leave(id);
    }

    // rebuild the value from its fields (which are now variables) and aux data
    let aux = type.toAuxiliary(proverValue);
    let value = (type as Provable<T>).fromFields(fields, aux);

    // add type-specific constraints
    type.check(value);

    return value;
  },
};

// helpers

function clone<T, S extends FlexibleProvable<T>>(type: S, value: T): T {
  let fields = type.toFields(value);
  let aux = type.toAuxiliary(value);
  return (type as Provable<T>).fromFields(fields, aux);
}

let memoizationContext = Context.create<{
  memoized: { fields: Field[]; aux: any[] }[];
  currentIndex: number;
  blindingValue: Field;
}>();

/**
 * Like Circuit.witness, but memoizes the witness during transaction construction
 * for reuse by the prover. This is needed to witness non-deterministic values.
 */
function memoizeWitness<T>(type: FlexibleProvable<T>, compute: () => T) {
  return Provable.witness<T>(type as Provable<T>, () => {
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
    return (type as Provable<T>).fromFields(
      currentValue.fields,
      currentValue.aux
    );
  });
}

function getBlindingValue() {
  if (!memoizationContext.has()) return Field.random();
  let context = memoizationContext.get();
  if (context.blindingValue === undefined) {
    context.blindingValue = Field.random();
  }
  return context.blindingValue;
}
