import { Snarky } from '../../../bindings.js';
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
class Unconstrained {
    constructor(isSome, value) {
        this.option = { isSome, value: value };
    }
    /**
     * Read an unconstrained value.
     *
     * Note: Can only be called outside provable code.
     */
    get() {
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
    set(value) {
        this.option = { isSome: true, value };
    }
    /**
     * Set the unconstrained value to the same as another `Unconstrained`.
     */
    setTo(value) {
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
    static from(value) {
        if (value instanceof Unconstrained)
            return value;
        return new Unconstrained(true, value);
    }
    /**
     * Create an `Unconstrained` from a witness computation.
     */
    static witness(compute) {
        return witness(Unconstrained, compute);
    }
    /**
     * Update an `Unconstrained` by a witness computation.
     */
    updateAsProver(compute) {
        return asProver(() => {
            let value = this.get();
            this.set(compute(value));
        });
    }
    static withEmpty(empty) {
        return {
            ...Unconstrained.provable,
            empty: () => Unconstrained.from(empty),
        };
    }
}
Unconstrained.provable = {
    sizeInFields: () => 0,
    toFields: () => [],
    toAuxiliary: (t) => [t ?? new Unconstrained(false)],
    fromFields: (_, [t]) => t,
    check: () => { },
    toValue: (t) => t.get(),
    fromValue: (t) => Unconstrained.from(t),
    toInput: () => ({}),
    empty: () => {
        throw Error('There is no default empty value for Unconstrained.');
    },
};
