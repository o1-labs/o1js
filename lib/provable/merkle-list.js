"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withHashes = exports.merkleListHash = exports.genericHash = exports.emptyHash = exports.WithHash = exports.MerkleListIterator = exports.MerkleList = exports.MerkleListBase = void 0;
const wrapped_js_1 = require("./wrapped.js");
const provable_js_1 = require("./provable.js");
const struct_js_1 = require("./types/struct.js");
const common_js_1 = require("./gadgets/common.js");
const provable_derivers_js_1 = require("./types/provable-derivers.js");
const poseidon_js_1 = require("./crypto/poseidon.js");
const unconstrained_js_1 = require("./types/unconstrained.js");
const provable_intf_js_1 = require("./types/provable-intf.js");
const option_js_1 = require("./option.js");
// common base types for both MerkleList and MerkleListIterator
const emptyHash = (0, wrapped_js_1.Field)(0);
exports.emptyHash = emptyHash;
function WithHash(type) {
    return (0, struct_js_1.Struct)({ previousHash: wrapped_js_1.Field, element: type });
}
exports.WithHash = WithHash;
function toConstant(type, node) {
    return {
        previousHash: node.previousHash.toConstant(),
        element: provable_js_1.Provable.toConstant(type, node.element),
    };
}
function MerkleListBase() {
    return class extends (0, struct_js_1.Struct)({ hash: wrapped_js_1.Field, data: unconstrained_js_1.Unconstrained }) {
        static empty() {
            return { hash: emptyHash, data: unconstrained_js_1.Unconstrained.from([]) };
        }
    };
}
exports.MerkleListBase = MerkleListBase;
// merkle list
/**
 * Dynamic-length list which is represented as a single hash
 *
 * Supported operations are {@link push()} and {@link pop()} and some variants thereof.
 *
 *
 * A Merkle list is generic over its element types, so before using it you must create a subclass for your element type:
 *
 * ```ts
 * class MyList extends MerkleList.create(MyType) {}
 *
 * // now use it
 * let list = MyList.empty();
 *
 * list.push(new MyType(...));
 *
 * let element = list.pop();
 * ```
 *
 * Internal detail: `push()` adds elements to the _start_ of the internal array and `pop()` removes them from the start.
 * This is so that the hash which represents the list is consistent with {@link MerkleListIterator},
 * and so a `MerkleList` can be used as input to `MerkleListIterator.startIterating(list)`
 * (which will then iterate starting from the last pushed element).
 */
class MerkleList {
    constructor({ hash, data }) {
        this.hash = hash;
        this.data = data;
    }
    isEmpty() {
        return this.hash.equals(this.Constructor.emptyHash);
    }
    /**
     * Push a new element to the list.
     */
    push(element) {
        let previousHash = this.hash;
        this.hash = this.nextHash(previousHash, element);
        this.data.updateAsProver((data) => [
            toConstant(this.innerProvable, { previousHash, element }),
            ...data,
        ]);
    }
    /**
     * Push a new element to the list, if the `condition` is true.
     */
    pushIf(condition, element) {
        let previousHash = this.hash;
        this.hash = provable_js_1.Provable.if(condition, this.nextHash(previousHash, element), previousHash);
        this.data.updateAsProver((data) => condition.toBoolean()
            ? [toConstant(this.innerProvable, { previousHash, element }), ...data]
            : data);
    }
    popWitness() {
        return provable_js_1.Provable.witness(WithHash(this.innerProvable), () => {
            let [value, ...data] = this.data.get();
            let head = value ?? {
                previousHash: this.Constructor.emptyHash,
                element: this.innerProvable.empty(),
            };
            this.data.set(data);
            return head;
        });
    }
    /**
     * Remove the last element from the list and return it.
     *
     * This proves that the list is non-empty, and fails otherwise.
     */
    popExn() {
        let { previousHash, element } = this.popWitness();
        let currentHash = this.nextHash(previousHash, element);
        this.hash.assertEquals(currentHash);
        this.hash = previousHash;
        return element;
    }
    /**
     * Remove the last element from the list and return it.
     *
     * If the list is empty, returns a dummy element.
     */
    pop() {
        let { previousHash, element } = this.popWitness();
        let isEmpty = this.isEmpty();
        let emptyHash = this.Constructor.emptyHash;
        let currentHash = this.nextHash(previousHash, element);
        currentHash = provable_js_1.Provable.if(isEmpty, emptyHash, currentHash);
        this.hash.assertEquals(currentHash);
        this.hash = provable_js_1.Provable.if(isEmpty, emptyHash, previousHash);
        let provable = this.innerProvable;
        return provable_js_1.Provable.if(isEmpty, provable, provable.empty(), element);
    }
    /**
     * Remove the last element from the list and return it as an option:
     * Some(element) if the list is non-empty, None if the list is empty.
     *
     * **Warning**: If the list is empty, the the option's .value is entirely unconstrained.
     */
    popOption() {
        let { previousHash, element } = this.popWitness();
        let isEmpty = this.isEmpty();
        let emptyHash = this.Constructor.emptyHash;
        let currentHash = this.nextHash(previousHash, element);
        currentHash = provable_js_1.Provable.if(isEmpty, emptyHash, currentHash);
        this.hash.assertEquals(currentHash);
        this.hash = provable_js_1.Provable.if(isEmpty, emptyHash, previousHash);
        let provable = this.innerProvable;
        const OptionT = (0, option_js_1.Option)(provable);
        return new OptionT({ isSome: isEmpty.not(), value: element });
    }
    /**
     * Return the last element, but only remove it if `condition` is true.
     *
     * If the list is empty, returns a dummy element.
     */
    popIf(condition) {
        let originalHash = this.hash;
        let element = this.pop();
        // if the condition is false, we restore the original state
        this.data.updateAsProver((data) => {
            let node = { previousHash: this.hash, element };
            return condition.toBoolean() ? data : [toConstant(this.innerProvable, node), ...data];
        });
        this.hash = provable_js_1.Provable.if(condition, this.hash, originalHash);
        return element;
    }
    /**
     * Low-level, minimal version of `pop()` which lets the _caller_ decide whether there is an element to pop.
     *
     * I.e. this proves:
     * - If the input condition is true, this returns the last element and removes it from the list.
     * - If the input condition is false, the list is unchanged and the return value is garbage.
     *
     * Note that if the caller passes `true` but the list is empty, this will fail.
     * If the caller passes `false` but the list is non-empty, this succeeds and just doesn't pop off an element.
     */
    popIfUnsafe(shouldPop) {
        let { previousHash, element } = provable_js_1.Provable.witness(WithHash(this.innerProvable), () => {
            let dummy = {
                previousHash: this.hash,
                element: this.innerProvable.empty(),
            };
            if (!shouldPop.toBoolean())
                return dummy;
            let [value, ...data] = this.data.get();
            this.data.set(data);
            return value ?? dummy;
        });
        let nextHash = this.nextHash(previousHash, element);
        let currentHash = provable_js_1.Provable.if(shouldPop, nextHash, this.hash);
        this.hash.assertEquals(currentHash);
        this.hash = provable_js_1.Provable.if(shouldPop, previousHash, this.hash);
        return element;
    }
    clone() {
        let data = unconstrained_js_1.Unconstrained.witness(() => [...this.data.get()]);
        return new this.Constructor({ hash: this.hash, data });
    }
    /**
     * Iterate through the list in a fixed number of steps any apply a given callback on each element.
     *
     * Proves that the iteration traverses the entire list.
     * Once past the last element, dummy elements will be passed to the callback.
     *
     * Note: There are no guarantees about the contents of dummy elements, so the callback is expected
     * to handle the `isDummy` flag separately.
     */
    forEach(length, callback) {
        let iter = this.startIterating();
        for (let i = 0; i < length; i++) {
            let { element, isDummy } = iter.Unsafe.next();
            callback(element, isDummy, i);
        }
        iter.assertAtEnd(`Expected MerkleList to have at most ${length} elements, but it has more.`);
    }
    startIterating() {
        let merkleArray = MerkleListIterator.createFromList(this.Constructor);
        return merkleArray.startIterating(this);
    }
    startIteratingFromLast() {
        let merkleArray = MerkleListIterator.createFromList(this.Constructor);
        return merkleArray.startIteratingFromLast(this);
    }
    toArrayUnconstrained() {
        return unconstrained_js_1.Unconstrained.witness(() => [...this.data.get()].reverse().map((x) => x.element));
    }
    lengthUnconstrained() {
        return unconstrained_js_1.Unconstrained.witness(() => this.data.get().length);
    }
    /**
     * Create a Merkle list type
     *
     * Optionally, you can tell `create()` how to do the hash that pushes a new list element, by passing a `nextHash` function.
     *
     * @example
     * ```ts
     * class MyList extends MerkleList.create(Field, (hash, x) =>
     *   Poseidon.hashWithPrefix('custom', [hash, x])
     * ) {}
     * ```
     */
    static create(type, nextHash = merkleListHash(provable_intf_js_1.ProvableType.get(type)), emptyHash_ = emptyHash) {
        let provable = provable_intf_js_1.ProvableType.get(type);
        class MerkleListTBase extends MerkleList {
            static empty() {
                return new this({ hash: emptyHash_, data: unconstrained_js_1.Unconstrained.from([]) });
            }
            static from(array) {
                array = [...array].reverse();
                let { hash, data } = withHashes(array, nextHash, emptyHash_);
                let unconstrained = unconstrained_js_1.Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
                return new this({ data: unconstrained, hash });
            }
            static fromReverse(array) {
                let { hash, data } = withHashes(array, nextHash, emptyHash_);
                let unconstrained = unconstrained_js_1.Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
                return new this({ data: unconstrained, hash });
            }
            static get provable() {
                (0, common_js_1.assert)(this._provable !== undefined, 'MerkleList not initialized');
                return this._provable;
            }
            static set provable(_provable) {
                this._provable = _provable;
            }
        }
        MerkleListTBase._innerProvable = provable;
        MerkleListTBase._provable = (0, provable_derivers_js_1.provableFromClass)(MerkleListTBase, {
            hash: wrapped_js_1.Field,
            data: unconstrained_js_1.Unconstrained,
        });
        MerkleListTBase._nextHash = nextHash;
        MerkleListTBase._emptyHash = emptyHash_;
        // override `instanceof` for subclasses
        return class MerkleListT extends MerkleListTBase {
            static [Symbol.hasInstance](x) {
                return x instanceof MerkleListTBase;
            }
        };
    }
    get Constructor() {
        return this.constructor;
    }
    nextHash(hash, value) {
        (0, common_js_1.assert)(this.Constructor._nextHash !== undefined, 'MerkleList not initialized');
        return this.Constructor._nextHash(hash, value);
    }
    static get emptyHash() {
        (0, common_js_1.assert)(this._emptyHash !== undefined, 'MerkleList not initialized');
        return this._emptyHash;
    }
    get innerProvable() {
        (0, common_js_1.assert)(this.Constructor._innerProvable !== undefined, 'MerkleList not initialized');
        return this.Constructor._innerProvable;
    }
}
exports.MerkleList = MerkleList;
/**
 * MerkleListIterator helps iterating through a Merkle list.
 * This works similar to calling `list.pop()` or `list.push()` repeatedly, but maintaining the entire list instead of removing elements.
 *
 * The core methods that support iteration are {@link next()} and {@link previous()}.
 *
 * ```ts
 * let iterator = MerkleListIterator.startIterating(list);
 *
 * let firstElement = iterator.next();
 * ```
 *
 * We maintain two commitments:
 * - One to the entire array, to be able to prove that we end iteration at the correct point.
 * - One to the array from the current index until the end, to efficiently step forward.
 */
class MerkleListIterator {
    constructor(value) {
        Object.assign(this, value);
    }
    assertAtStart() {
        return this.currentHash.assertEquals(this.Constructor.emptyHash);
    }
    isAtEnd() {
        return this.currentHash.equals(this.hash);
    }
    jumpToEnd() {
        this.currentIndex.setTo(unconstrained_js_1.Unconstrained.witness(() => 0));
        this.currentHash = this.hash;
    }
    jumpToEndIf(condition) {
        provable_js_1.Provable.asProver(() => {
            if (condition.toBoolean()) {
                this.currentIndex.set(0);
            }
        });
        this.currentHash = provable_js_1.Provable.if(condition, this.hash, this.currentHash);
    }
    assertAtEnd(message) {
        return this.currentHash.assertEquals(this.hash, message ?? 'Merkle list iterator is not at the end');
    }
    isAtStart() {
        return this.currentHash.equals(this.Constructor.emptyHash);
    }
    jumpToStart() {
        this.currentIndex.setTo(unconstrained_js_1.Unconstrained.witness(() => this.data.get().length));
        this.currentHash = this.Constructor.emptyHash;
    }
    jumpToStartIf(condition) {
        provable_js_1.Provable.asProver(() => {
            if (condition.toBoolean()) {
                this.currentIndex.set(this.data.get().length);
            }
        });
        this.currentHash = provable_js_1.Provable.if(condition, this.Constructor.emptyHash, this.currentHash);
    }
    _index(direction, i) {
        i ?? (i = this.currentIndex.get());
        if (direction === 'next') {
            return Math.min(Math.max(i, -1), this.data.get().length - 1);
        }
        else {
            return Math.max(Math.min(i, this.data.get().length), 0);
        }
    }
    _updateIndex(direction) {
        this.currentIndex.updateAsProver(() => {
            let i = this._index(direction);
            return this._index(direction, direction === 'next' ? i - 1 : i + 1);
        });
    }
    previous() {
        // `previous()` corresponds to `pop()` in MerkleList
        // it returns a dummy element if we're at the start of the array
        let { previousHash, element } = provable_js_1.Provable.witness(WithHash(this.innerProvable), () => this.data.get()[this._index('previous')] ?? {
            previousHash: this.Constructor.emptyHash,
            element: this.innerProvable.empty(),
        });
        let isDummy = this.isAtStart();
        let emptyHash = this.Constructor.emptyHash;
        let correctHash = this.nextHash(previousHash, element);
        let requiredHash = provable_js_1.Provable.if(isDummy, emptyHash, correctHash);
        this.currentHash.assertEquals(requiredHash);
        this._updateIndex('previous');
        this.currentHash = provable_js_1.Provable.if(isDummy, emptyHash, previousHash);
        return provable_js_1.Provable.if(isDummy, this.innerProvable, this.innerProvable.empty(), element);
    }
    next() {
        // instead of starting from index `0`, we start at index `length - 1` and go in reverse
        // this is like MerkleList.push() but we witness the next element instead of taking it as input,
        // and we return a dummy element if we're at the end of the array
        let element = provable_js_1.Provable.witness(this.innerProvable, () => this.data.get()[this._index('next')]?.element ?? this.innerProvable.empty());
        let isDummy = this.isAtEnd();
        let currentHash = this.nextHash(this.currentHash, element);
        this.currentHash = provable_js_1.Provable.if(isDummy, this.hash, currentHash);
        this._updateIndex('next');
        return provable_js_1.Provable.if(isDummy, this.innerProvable, this.innerProvable.empty(), element);
    }
    /**
     * Low-level APIs for advanced uses
     */
    get Unsafe() {
        let self = this;
        return {
            /**
             * Version of {@link previous} which doesn't guarantee anything about
             * the returned element in case the iterator is at the start.
             *
             * Instead, the `isDummy` flag is also returned so that this case can
             * be handled in a custom way.
             */
            previous() {
                let { previousHash, element } = provable_js_1.Provable.witness(WithHash(self.innerProvable), () => self.data.get()[self._index('previous')] ?? {
                    previousHash: self.Constructor.emptyHash,
                    element: self.innerProvable.empty(),
                });
                let isDummy = self.isAtStart();
                let emptyHash = self.Constructor.emptyHash;
                let correctHash = self.nextHash(previousHash, element);
                let requiredHash = provable_js_1.Provable.if(isDummy, emptyHash, correctHash);
                self.currentHash.assertEquals(requiredHash);
                self._updateIndex('previous');
                self.currentHash = provable_js_1.Provable.if(isDummy, emptyHash, previousHash);
                return { element, isDummy };
            },
            /**
             * Version of {@link next} which doesn't guarantee anything about
             * the returned element in case the iterator is at the end.
             *
             * Instead, the `isDummy` flag is also returned so that this case can
             * be handled in a custom way.
             */
            next() {
                let element = provable_js_1.Provable.witness(self.innerProvable, () => {
                    return self.data.get()[self._index('next')]?.element ?? self.innerProvable.empty();
                });
                let isDummy = self.isAtEnd();
                let currentHash = self.nextHash(self.currentHash, element);
                self.currentHash = provable_js_1.Provable.if(isDummy, self.hash, currentHash);
                self._updateIndex('next');
                return { element, isDummy };
            },
        };
    }
    clone() {
        let data = unconstrained_js_1.Unconstrained.witness(() => [...this.data.get()]);
        let currentIndex = unconstrained_js_1.Unconstrained.witness(() => this.currentIndex.get());
        return new this.Constructor({
            data,
            hash: this.hash,
            currentHash: this.currentHash,
            currentIndex,
        });
    }
    /**
     * Create a Merkle array type
     */
    static create(type, nextHash = merkleListHash(provable_intf_js_1.ProvableType.get(type)), emptyHash_ = emptyHash) {
        var _a;
        let provable = provable_intf_js_1.ProvableType.get(type);
        return _a = class Iterator extends MerkleListIterator {
                static from(array) {
                    let { hash, data } = withHashes(array, nextHash, emptyHash_);
                    let unconstrained = unconstrained_js_1.Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
                    return this.startIterating({ data: unconstrained, hash });
                }
                static fromLast(array) {
                    array = [...array].reverse();
                    let { hash, data } = withHashes(array, nextHash, emptyHash_);
                    let unconstrained = unconstrained_js_1.Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
                    return this.startIteratingFromLast({ data: unconstrained, hash });
                }
                static startIterating({ data, hash }) {
                    return new this({
                        data,
                        hash,
                        currentHash: emptyHash_,
                        // note: for an empty list or any list which is "at the end", the currentIndex is -1
                        currentIndex: unconstrained_js_1.Unconstrained.witness(() => data.get().length - 1),
                    });
                }
                static startIteratingFromLast({ data, hash }) {
                    return new this({
                        data,
                        hash,
                        currentHash: hash,
                        currentIndex: unconstrained_js_1.Unconstrained.from(0),
                    });
                }
                static empty() {
                    return this.from([]);
                }
                static get provable() {
                    (0, common_js_1.assert)(this._provable !== undefined, 'MerkleListIterator not initialized');
                    return this._provable;
                }
            },
            _a._innerProvable = provable_intf_js_1.ProvableType.get(provable),
            _a._provable = (0, provable_derivers_js_1.provableFromClass)(_a, {
                hash: wrapped_js_1.Field,
                data: unconstrained_js_1.Unconstrained,
                currentHash: wrapped_js_1.Field,
                currentIndex: unconstrained_js_1.Unconstrained,
            }),
            _a._nextHash = nextHash,
            _a._emptyHash = emptyHash_,
            _a;
    }
    static createFromList(merkleList) {
        return this.create(merkleList.prototype.innerProvable, merkleList._nextHash, merkleList.emptyHash);
    }
    get Constructor() {
        return this.constructor;
    }
    nextHash(hash, value) {
        (0, common_js_1.assert)(this.Constructor._nextHash !== undefined, 'MerkleListIterator not initialized');
        return this.Constructor._nextHash(hash, value);
    }
    static get emptyHash() {
        (0, common_js_1.assert)(this._emptyHash !== undefined, 'MerkleList not initialized');
        return this._emptyHash;
    }
    get innerProvable() {
        (0, common_js_1.assert)(this.Constructor._innerProvable !== undefined, 'MerkleListIterator not initialized');
        return this.Constructor._innerProvable;
    }
}
exports.MerkleListIterator = MerkleListIterator;
// hash helpers
function genericHash(provable, prefix, value) {
    let input = provable.toInput(value);
    let packed = (0, poseidon_js_1.packToFields)(input);
    return poseidon_js_1.Poseidon.hashWithPrefix(prefix, packed);
}
exports.genericHash = genericHash;
function merkleListHash(provable, prefix = '') {
    return function nextHash(hash, value) {
        let input = provable.toInput(value);
        let packed = (0, poseidon_js_1.packToFields)(input);
        return poseidon_js_1.Poseidon.hashWithPrefix(prefix, [hash, ...packed]);
    };
}
exports.merkleListHash = merkleListHash;
function withHashes(data, nextHash, emptyHash) {
    let n = data.length;
    let arrayWithHashes = Array(n);
    let currentHash = emptyHash;
    for (let i = n - 1; i >= 0; i--) {
        arrayWithHashes[i] = { previousHash: currentHash, element: data[i] };
        currentHash = nextHash(currentHash, data[i]);
    }
    return { data: arrayWithHashes, hash: currentHash };
}
exports.withHashes = withHashes;
