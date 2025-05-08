import { Snarky } from '../../../snarky.js';
import type { Field } from '../field.js';
import type { Provable } from '../provable.js';
import { assert } from '../../util/errors.js';
import { asProver, inCheckedComputation } from '../core/provable-context.js';
import { witness } from './witness.js';

export { Unconstrained };

/**
 * Container which holds an unconstrained value. This can be used to pass values
 * between the out-of-circuit blocks in provable code.
 *
 * Invariants:
 * - An `Unconstrained`'s value can only be accessed in auxiliary contexts.
 * - An `Unconstrained` can be empty when compiling, but never empty when running as the prover.
 *   (there is no way to create an empty `Unconstrained` in the prover)
 *
 * @example
 * ```ts
 * let x = Unconstrained.from(0n);
 *
 * class MyContract extends SmartContract {
 *   `@method` myMethod(x: Unconstrained<bigint>) {
 *
 *     Provable.witness(Field, () => {
 *       // we can access and modify `x` here
 *       let newValue = x.get() + otherField.toBigInt();
 *       x.set(newValue);
 *
 *       // ...
 *     });
 *
 *     // throws an error!
 *     x.get();
 *   }
 * ```
 */
class Unconstrained<T> {
  private option: { isSome: true; value: T } | { isSome: false; value: undefined };

  private constructor(isSome: boolean, value?: T) {
    this.option = { isSome, value: value as any };
  }

  /**
   * Read an unconstrained value.
   *
   * Note: Can only be called outside provable code.
   */
  get(): T {
    if (inCheckedComputation() && !Snarky.run.inProverBlock())
      throw Error(`You cannot use Unconstrained.get() in provable code.

The only place where you can read unconstrained values is in Provable.witness()
and Provable.asProver() blocks, which execute outside the proof.
`);
    assert(this.option.isSome, 'Empty `Unconstrained`'); // never triggered
    return this.option.value;
  }

  /**
   * Modify the unconstrained value.
   */
  set(value: T) {
    this.option = { isSome: true, value };
  }

  /**
   * Set the unconstrained value to the same as another `Unconstrained`.
   */
  setTo(value: Unconstrained<T>) {
    this.option = value.option;
  }

  /**
   * Create an `Unconstrained` with the given `value`.
   *
   * Note: If `T` contains provable types, `Unconstrained.from` is an anti-pattern,
   * because it stores witnesses in a space that's intended to be used outside the proof.
   * Something like the following should be used instead:
   *
   * ```ts
   * let xWrapped = Unconstrained.witness(() => Provable.toConstant(type, x));
   * ```
   */
  static from<T>(value: T | Unconstrained<T>) {
    if (value instanceof Unconstrained) return value;
    return new Unconstrained(true, value);
  }

  /**
   * Create an `Unconstrained` from a witness computation.
   */
  static witness<T>(compute: () => T): Unconstrained<T> {
    return witness(Unconstrained, compute);
  }

  /**
   * Update an `Unconstrained` by a witness computation.
   */
  updateAsProver(compute: (value: T) => T) {
    return asProver(() => {
      let value = this.get();
      this.set(compute(value));
    });
  }

  static provable: UnconstrainedProvable<any> & {
    toInput: (x: Unconstrained<any>) => {
      fields?: Field[];
      packed?: [Field, number][];
    };
    empty: () => Unconstrained<any>;
  } = {
    sizeInFields: () => 0,
    toFields: () => [],
    toAuxiliary: (t?: any) => [t ?? new Unconstrained(false)],
    fromFields: (_, [t]) => t,
    check: () => {},
    toValue: (t) => t.get(),
    fromValue: (t) => Unconstrained.from(t),
    toInput: () => ({}),
    empty: (): any => {
      throw Error('There is no default empty value for Unconstrained.');
    },
  };

  static withEmpty<T>(empty: T): Provable<Unconstrained<T>, T> & {
    toInput: (x: Unconstrained<T>) => {
      fields?: Field[];
      packed?: [Field, number][];
    };
    empty: () => Unconstrained<T>;
  } {
    return {
      ...Unconstrained.provable,
      empty: () => Unconstrained.from(empty),
    };
  }
}

type UnconstrainedProvable<T> = Provable<Unconstrained<T>, T>;
