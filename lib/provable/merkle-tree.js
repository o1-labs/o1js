"use strict";
/**
 * This file contains all code related to the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) implementation available in o1js.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionalSwap = exports.BaseMerkleWitness = exports.MerkleWitness = exports.MerkleTree = void 0;
const circuit_value_js_1 = require("./types/circuit-value.js");
const poseidon_js_1 = require("./crypto/poseidon.js");
const wrapped_js_1 = require("./wrapped.js");
const provable_js_1 = require("./provable.js");
/**
 * A [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) is a binary tree in which every leaf is the cryptography hash of a piece of data,
 * and every node is the hash of the concatenation of its two child nodes.
 *
 * A Merkle Tree allows developers to easily and securely verify the integrity of large amounts of data.
 *
 * Take a look at our [documentation](https://docs.minaprotocol.com/en/zkapps) on how to use Merkle Trees in combination with zkApps and zero knowledge programming!
 *
 * Levels are indexed from leaves (level 0) to root (level N - 1).
 */
class MerkleTree {
    /**
     * Creates a new, empty [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @param height The height of Merkle Tree.
     * @returns A new MerkleTree
     */
    constructor(height) {
        this.height = height;
        this.nodes = {};
        this.zeroes = new Array(height);
        this.zeroes[0] = (0, wrapped_js_1.Field)(0);
        for (let i = 1; i < height; i += 1) {
            this.zeroes[i] = poseidon_js_1.Poseidon.hash([this.zeroes[i - 1], this.zeroes[i - 1]]);
        }
    }
    /**
     * Return a new MerkleTree with the same contents as this one.
     */
    clone() {
        let newTree = new MerkleTree(this.height);
        for (let [level, nodes] of Object.entries(this.nodes)) {
            newTree.nodes[level] = { ...nodes };
        }
        return newTree;
    }
    /**
     * Returns a node which lives at a given index and level.
     * @param level Level of the node.
     * @param index Index of the node.
     * @returns The data of the node.
     */
    getNode(level, index) {
        return this.nodes[level]?.[index.toString()] ?? this.zeroes[level];
    }
    /**
     * Returns a leaf at a given index.
     * @param index Index of the leaf.
     * @returns The data of the leaf.
     */
    getLeaf(index) {
        return this.getNode(0, index);
    }
    /**
     * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @returns The root of the Merkle Tree.
     */
    getRoot() {
        return this.getNode(this.height - 1, 0n);
    }
    // TODO: this allows to set a node at an index larger than the size. OK?
    setNode(level, index, value) {
        var _a;
        ((_a = this.nodes)[level] ?? (_a[level] = {}))[index.toString()] = value;
    }
    // TODO: if this is passed an index bigger than the max, it will set a couple of out-of-bounds nodes but not affect the real Merkle root. OK?
    /**
     * Sets the value of a leaf node at a given index to a given value.
     * @param index Position of the leaf node.
     * @param leaf New value.
     */
    setLeaf(index, leaf) {
        if (index >= this.leafCount) {
            throw new Error(`index ${index} is out of range for ${this.leafCount} leaves.`);
        }
        this.setNode(0, index, leaf);
        let currIndex = index;
        for (let level = 1; level < this.height; level++) {
            currIndex /= 2n;
            const left = this.getNode(level - 1, currIndex * 2n);
            const right = this.getNode(level - 1, currIndex * 2n + 1n);
            this.setNode(level, currIndex, poseidon_js_1.Poseidon.hash([left, right]));
        }
    }
    /**
     * Returns the witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the leaf at the given index.
     * @param index Position of the leaf node.
     * @returns The witness that belongs to the leaf.
     */
    getWitness(index) {
        if (index >= this.leafCount) {
            throw new Error(`index ${index} is out of range for ${this.leafCount} leaves.`);
        }
        const witness = [];
        for (let level = 0; level < this.height - 1; level++) {
            const isLeft = index % 2n === 0n;
            const sibling = this.getNode(level, isLeft ? index + 1n : index - 1n);
            witness.push({ isLeft, sibling });
            index /= 2n;
        }
        return witness;
    }
    // TODO: this will always return true if the merkle tree was constructed normally; seems to be only useful for testing. remove?
    /**
     * Checks if the witness that belongs to the leaf at the given index is a valid witness.
     * @param index Position of the leaf node.
     * @returns True if the witness for the leaf node is valid.
     */
    validate(index) {
        const path = this.getWitness(index);
        let hash = this.getNode(0, index);
        for (const node of path) {
            hash = poseidon_js_1.Poseidon.hash(node.isLeft ? [hash, node.sibling] : [node.sibling, hash]);
        }
        return hash.toString() === this.getRoot().toString();
    }
    // TODO: should this take an optional offset? should it fail if the array is too long?
    /**
     * Fills all leaves of the tree.
     * @param leaves Values to fill the leaves with.
     */
    fill(leaves) {
        leaves.forEach((value, index) => {
            this.setLeaf(BigInt(index), value);
        });
    }
    /**
     * Returns the amount of leaf nodes.
     * @returns Amount of leaf nodes.
     */
    get leafCount() {
        return 2n ** BigInt(this.height - 1);
    }
}
exports.MerkleTree = MerkleTree;
/**
 * The {@link BaseMerkleWitness} class defines a circuit-compatible base class for [Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof).
 */
class BaseMerkleWitness extends circuit_value_js_1.CircuitValue {
    height() {
        return this.constructor.height;
    }
    /**
     * Takes a {@link Witness} and turns it into a circuit-compatible Witness.
     * @param witness Witness.
     * @returns A circuit-compatible Witness.
     */
    constructor(witness) {
        super();
        let height = witness.length + 1;
        if (height !== this.height()) {
            throw Error(`Length of witness ${height}-1 doesn't match static tree height ${this.height()}.`);
        }
        this.path = witness.map((item) => item.sibling);
        this.isLeft = witness.map((item) => (0, wrapped_js_1.Bool)(item.isLeft));
    }
    /**
     * Calculates a root depending on the leaf value.
     * @param leaf Value of the leaf node that belongs to this Witness.
     * @returns The calculated root.
     */
    calculateRoot(leaf) {
        let hash = leaf;
        let n = this.height();
        for (let i = 1; i < n; ++i) {
            let isLeft = this.isLeft[i - 1];
            const [left, right] = conditionalSwap(isLeft, hash, this.path[i - 1]);
            hash = poseidon_js_1.Poseidon.hash([left, right]);
        }
        return hash;
    }
    /**
     * Calculates the index of the leaf node that belongs to this Witness.
     * @returns Index of the leaf.
     */
    calculateIndex() {
        let powerOfTwo = (0, wrapped_js_1.Field)(1);
        let index = (0, wrapped_js_1.Field)(0);
        let n = this.height();
        for (let i = 1; i < n; ++i) {
            index = provable_js_1.Provable.if(this.isLeft[i - 1], index, index.add(powerOfTwo));
            powerOfTwo = powerOfTwo.mul(2);
        }
        return index;
    }
}
exports.BaseMerkleWitness = BaseMerkleWitness;
/**
 * Returns a circuit-compatible Witness for a specific Tree height.
 * @param height Height of the Merkle Tree that this Witness belongs to.
 * @returns A circuit-compatible Merkle Witness.
 */
function MerkleWitness(height) {
    class MerkleWitness_ extends BaseMerkleWitness {
    }
    MerkleWitness_.height = height;
    (0, circuit_value_js_1.arrayProp)(wrapped_js_1.Field, height - 1)(MerkleWitness_.prototype, 'path');
    (0, circuit_value_js_1.arrayProp)(wrapped_js_1.Bool, height - 1)(MerkleWitness_.prototype, 'isLeft');
    return MerkleWitness_;
}
exports.MerkleWitness = MerkleWitness;
// swap two values if the boolean is false, otherwise keep them as they are
// more efficient than 2x `Provable.if()` by reusing an intermediate variable
function conditionalSwap(b, x, y) {
    let m = b.toField().mul(x.sub(y)); // b*(x - y)
    const x_ = y.add(m); // y + b*(x - y)
    const y_ = x.sub(m); // x - b*(x - y) = x + b*(y - x)
    return [x_, y_];
}
exports.conditionalSwap = conditionalSwap;
