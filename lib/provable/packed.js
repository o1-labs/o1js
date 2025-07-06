"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hashed = exports.Packed = void 0;
const provable_derivers_js_1 = require("./types/provable-derivers.js");
const unconstrained_js_1 = require("./types/unconstrained.js");
const field_js_1 = require("./field.js");
const common_js_1 = require("./gadgets/common.js");
const poseidon_js_1 = require("./crypto/poseidon.js");
const provable_js_1 = require("./provable.js");
const fields_js_1 = require("./types/fields.js");
const provable_intf_js_1 = require("./types/provable-intf.js");
/**
 * `Packed<T>` is a "packed" representation of any type `T`.
 *
 * "Packed" means that field elements which take up fewer than 254 bits are packed together into
 * as few field elements as possible.
 *
 * For example, you can pack several Bools (1 bit) or UInt32s (32 bits) into a single field element.
 *
 * Using a packed representation can make sense in provable code where the number of constraints
 * depends on the number of field elements per value.
 *
 * For example, `Provable.if(bool, x, y)` takes O(n) constraints, where n is the number of field
 * elements in x and y.
 *
 * Usage:
 *
 * ```ts
 * // define a packed type from a type
 * let PackedType = Packed.create(MyType);
 *
 * // pack a value
 * let packed = PackedType.pack(value);
 *
 * // ... operations on packed values, more efficient than on plain values ...
 *
 * // unpack a value
 * let value = packed.unpack();
 * ```
 *
 * **Warning**: Packing only makes sense where packing actually reduces the number of field elements.
 * For example, it doesn't make sense to pack a _single_ Bool, because it will be 1 field element before
 * and after packing. On the other hand, it does makes sense to pack a type that holds 10 or 20 Bools.
 *
 * **Warning**: When wrapping a type with `Packed`, make sure that that type is safe to automatically _pack_
 * and _unpack_ in provable code. In particular, do not use `Packed` with types that define a custom `toInput()`
 * (specifying a certain bit packing) but no corresponding `check()` method (that constrains the bit lengths of the packed parts).
 */
class Packed {
    /**
     * Create a packed representation of `type`. You can then use `PackedType.pack(x)` to pack a value.
     */
    static create(type) {
        var _a;
        let provable = provable_intf_js_1.ProvableType.get(type);
        // compute size of packed representation
        let input = provable.toInput(provable.empty());
        let packedSize = countFields(input);
        let packedFields = (0, fields_js_1.fields)(packedSize);
        return _a = class Packed_ extends Packed {
                static pack(x) {
                    let input = provable.toInput(x);
                    let packed = (0, poseidon_js_1.packToFields)(input);
                    let unconstrained = unconstrained_js_1.Unconstrained.witness(() => provable_js_1.Provable.toConstant(provable, x));
                    return new _a(packed, unconstrained);
                }
                static empty() {
                    return _a.pack(provable.empty());
                }
                static get provable() {
                    (0, common_js_1.assert)(this._provable !== undefined, 'Packed not initialized');
                    return this._provable;
                }
            },
            _a._innerProvable = provable,
            _a._provable = (0, provable_derivers_js_1.mapValue)((0, provable_derivers_js_1.provableFromClass)(_a, {
                packed: packedFields,
                value: unconstrained_js_1.Unconstrained,
            }), ({ value }) => provable.toValue(value.get()), (x) => {
                if (x instanceof Packed)
                    return x;
                let { packed, value } = _a.pack(provable.fromValue(x));
                return {
                    packed: packedFields.toValue(packed),
                    value: unconstrained_js_1.Unconstrained.from(value),
                };
            }),
            _a;
    }
    constructor(packed, value) {
        this.packed = packed;
        this.value = value;
    }
    /**
     * Unpack a value.
     */
    unpack() {
        let value = provable_js_1.Provable.witness(this.Constructor.innerProvable, () => this.value.get());
        // prove that the value packs to the packed fields
        let input = this.Constructor.innerProvable.toInput(value);
        let packed = (0, poseidon_js_1.packToFields)(input);
        for (let i = 0; i < this.packed.length; i++) {
            this.packed[i].assertEquals(packed[i]);
        }
        return value;
    }
    toFields() {
        return this.packed;
    }
    get Constructor() {
        return this.constructor;
    }
    static get innerProvable() {
        (0, common_js_1.assert)(this._innerProvable !== undefined, 'Packed not initialized');
        return this._innerProvable;
    }
}
exports.Packed = Packed;
function countFields(input) {
    let n = input.fields?.length ?? 0;
    let pendingBits = 0;
    for (let [, bits] of input.packed ?? []) {
        pendingBits += bits;
        if (pendingBits >= field_js_1.Field.sizeInBits) {
            n++;
            pendingBits = bits;
        }
    }
    if (pendingBits > 0)
        n++;
    return n;
}
/**
 * `Hashed<T>` represents a type `T` by its hash.
 *
 * Since a hash is only a single field element, this can be more efficient in provable code
 * where the number of constraints depends on the number of field elements per value.
 *
 * For example, `Provable.if(bool, x, y)` takes O(n) constraints, where n is the number of field
 * elements in x and y. With Hashed, this is reduced to O(1).
 *
 * The downside is that you will pay the overhead of hashing your values, so it helps to experiment
 * in which parts of your code a hashed representation is beneficial.
 *
 * Usage:
 *
 * ```ts
 * // define a hashed type from a type
 * let HashedType = Hashed.create(MyType);
 *
 * // hash a value
 * let hashed = HashedType.hash(value);
 *
 * // ... operations on hashes, more efficient than on plain values ...
 *
 * // unhash to get the original value
 * let value = hashed.unhash();
 * ```
 *
 * **Warning**: When wrapping a type with `Hashed`, make sure that that type is safe to automatically _pack_
 * and _unpack_ in provable code. In particular, do not use `Hashed` with types that define a custom `toInput()`
 * (specifying a certain bit packing) but no corresponding `check()` method  (that constrains the bit lengths of the packed parts).
 */
class Hashed {
    /**
     * Create a hashed representation of `type`. You can then use `HashedType.hash(x)` to wrap a value in a `Hashed`.
     */
    static create(type, hash) {
        var _a;
        let provable = provable_intf_js_1.ProvableType.get(type);
        let _hash = hash ?? ((t) => poseidon_js_1.Poseidon.hashPacked(provable, t));
        return _a = class Hashed_ extends Hashed {
                static empty() {
                    let empty = provable.empty();
                    return new this(_hash(empty), unconstrained_js_1.Unconstrained.from(empty));
                }
                static get provable() {
                    (0, common_js_1.assert)(this._provable !== undefined, 'Hashed not initialized');
                    return this._provable;
                }
            },
            _a._innerProvable = provable,
            _a._provable = (0, provable_derivers_js_1.provableFromClass)(_a, {
                hash: (0, fields_js_1.modifiedField)({ empty: () => _hash(provable.empty()) }),
                value: unconstrained_js_1.Unconstrained,
            }),
            _a._hash = _hash,
            _a;
    }
    constructor(hash, value) {
        this.hash = hash;
        this.value = value;
    }
    static _hash(_) {
        (0, common_js_1.assert)(false, 'Hashed not initialized');
    }
    /**
     * Wrap a value, and represent it by its hash in provable code.
     *
     * ```ts
     * let hashed = HashedType.hash(value);
     * ```
     *
     * Optionally, if you already have the hash, you can pass it in and avoid recomputing it.
     */
    static hash(value, hash) {
        hash ?? (hash = this._hash(value));
        let unconstrained = unconstrained_js_1.Unconstrained.witness(() => provable_js_1.Provable.toConstant(this.innerProvable, value));
        return new this(hash, unconstrained);
    }
    /**
     * Unwrap a value from its hashed variant.
     */
    unhash() {
        let value = provable_js_1.Provable.witness(this.Constructor.innerProvable, () => this.value.get());
        // prove that the value hashes to the hash
        let hash = this.Constructor._hash(value);
        this.hash.assertEquals(hash);
        return value;
    }
    toFields() {
        return [this.hash];
    }
    get Constructor() {
        return this.constructor;
    }
    static get innerProvable() {
        (0, common_js_1.assert)(this._innerProvable !== undefined, 'Hashed not initialized');
        return this._innerProvable;
    }
}
exports.Hashed = Hashed;
