"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleMapWitness = exports.MerkleMap = void 0;
const circuit_value_js_1 = require("./types/circuit-value.js");
const wrapped_js_1 = require("./wrapped.js");
const poseidon_js_1 = require("./crypto/poseidon.js");
const merkle_tree_js_1 = require("./merkle-tree.js");
const provable_js_1 = require("./provable.js");
const field_bigint_js_1 = require("../../mina-signer/src/field-bigint.js");
class MerkleMap {
    tree;
    /**
     * Creates a new, empty Merkle Map.
     *
     * A Merkle Map is a data structure that allows for efficient storage and
     * retrieval of key-value pairs. The values are stored in a Merkle tree,
     * and the keys are formed by using the first 254 bits of the key as an index.
     * The inner Merkle tree has a height of 256.
     *
     * @returns A new MerkleMap
     * @example
     * ```ts
     * const merkleMap = new MerkleMap();
     * ```
     */
    constructor() {
        this.tree = new merkle_tree_js_1.MerkleTree(256);
    }
    _keyToIndex(key) {
        // the bit map is reversed to make reconstructing the key during proving more convenient
        let bits = field_bigint_js_1.BinableFp.toBits(key.toBigInt()).reverse();
        // Make sure that the key fits in 254 bits, in order to avoid collisions since the Pasta field modulus is smaller than 2^255
        if (bits[0]) {
            throw Error('Key must be less than 2^254, to avoid collisions in the field modulus. Please use a smaller key.');
        }
        let n = 0n;
        for (let i = bits.length - 1; i >= 0; i--) {
            n = (n << 1n) | BigInt(bits[i]);
        }
        return n;
    }
    /**
     * Sets a key of the merkle map to a given value.
     * @param key The key to set in the map.
     * @param value The value to set.
     * @example
     * ```ts
     * const key = Field(5);
     * const value = Field(10);
     * merkleMap.set(key, value);
     * ```
     */
    set(key, value) {
        const index = this._keyToIndex(key);
        this.tree.setLeaf(index, value);
    }
    /**
     * Returns a value given a key. Values are by default Field(0).
     * @param key The key to get the value from.
     * @returns The value stored at the key.
     * @example
     * ```ts
     * const key = Field(5);
     * const value = merkleMap.get(key);
     * console.log(value); // Output: the value at key 5 or Field(0) if key does not exist
     * ```
     */
    get(key) {
        const index = this._keyToIndex(key);
        return this.tree.getNode(0, index);
    }
    /**
     * Returns the root of the Merkle Map.
     * @returns The root of the Merkle Map.
     * @example
     * ```ts
     * const root = merkleMap.getRoot();
     * ```
     */
    getRoot() {
        return this.tree.getRoot();
    }
    /**
     * Returns a circuit-compatible witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the given key.
     * @param key The key to make a witness for.
     * @returns A MerkleMapWitness, which can be used to assert changes to the MerkleMap, and the witness's key.
     * @example
     * ```ts
     * const key = Field(5);
     * const witness = merkleMap.getWitness(key);
     * ```
     */
    getWitness(key) {
        const index = this._keyToIndex(key);
        class MyMerkleWitness extends (0, merkle_tree_js_1.MerkleWitness)(256) {
        }
        const witness = new MyMerkleWitness(this.tree.getWitness(index));
        return new MerkleMapWitness(witness.isLeft, witness.path);
    }
}
exports.MerkleMap = MerkleMap;
let MerkleMapWitness = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _isLefts_decorators;
    let _isLefts_initializers = [];
    let _isLefts_extraInitializers = [];
    let _siblings_decorators;
    let _siblings_initializers = [];
    let _siblings_extraInitializers = [];
    return class MerkleMapWitness extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _isLefts_decorators = [(0, circuit_value_js_1.arrayProp)(wrapped_js_1.Bool, 255)];
            _siblings_decorators = [(0, circuit_value_js_1.arrayProp)(wrapped_js_1.Field, 255)];
            __esDecorate(null, null, _isLefts_decorators, { kind: "field", name: "isLefts", static: false, private: false, access: { has: obj => "isLefts" in obj, get: obj => obj.isLefts, set: (obj, value) => { obj.isLefts = value; } }, metadata: _metadata }, _isLefts_initializers, _isLefts_extraInitializers);
            __esDecorate(null, null, _siblings_decorators, { kind: "field", name: "siblings", static: false, private: false, access: { has: obj => "siblings" in obj, get: obj => obj.siblings, set: (obj, value) => { obj.siblings = value; } }, metadata: _metadata }, _siblings_initializers, _siblings_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        isLefts = __runInitializers(this, _isLefts_initializers, void 0);
        siblings = (__runInitializers(this, _isLefts_extraInitializers), __runInitializers(this, _siblings_initializers, void 0));
        constructor(isLefts, siblings) {
            super();
            __runInitializers(this, _siblings_extraInitializers);
            this.isLefts = isLefts;
            this.siblings = siblings;
        }
        /**
         * Computes the merkle tree root for a given value and the key for this witness
         * @param value The value to compute the root for.
         * @returns A tuple of the computed merkle root, and the key that is connected to the path updated by this witness.
         */
        computeRootAndKey(value) {
            // Check that the computed key is less than 2^254, in order to avoid collisions since the Pasta field modulus is smaller than 2^255
            this.isLefts[0].assertTrue();
            let hash = value;
            const isLeft = this.isLefts;
            const siblings = this.siblings;
            let key = (0, wrapped_js_1.Field)(0);
            for (let i = 0; i < 255; i++) {
                const left = provable_js_1.Provable.if(isLeft[i], hash, siblings[i]);
                const right = provable_js_1.Provable.if(isLeft[i], siblings[i], hash);
                hash = poseidon_js_1.Poseidon.hash([left, right]);
                const bit = provable_js_1.Provable.if(isLeft[i], (0, wrapped_js_1.Field)(0), (0, wrapped_js_1.Field)(1));
                key = key.mul(2).add(bit);
            }
            return [hash, key];
        }
    };
})();
exports.MerkleMapWitness = MerkleMapWitness;
