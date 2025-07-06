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
exports.Signature = exports.PublicKey = exports.PrivateKey = void 0;
const wrapped_js_1 = require("../wrapped.js");
const poseidon_js_1 = require("./poseidon.js");
const signature_js_1 = require("../../../mina-signer/src/signature.js");
const curve_bigint_js_1 = require("../../../mina-signer/src/curve-bigint.js");
const field_js_1 = require("../field.js");
const circuit_value_js_1 = require("../types/circuit-value.js");
/**
 * A signing key. You can generate one via {@link PrivateKey.random}.
 */
let PrivateKey = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _s_decorators;
    let _s_initializers = [];
    let _s_extraInitializers = [];
    return class PrivateKey extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _s_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _s_decorators, { kind: "field", name: "s", static: false, private: false, access: { has: obj => "s" in obj, get: obj => obj.s, set: (obj, value) => { obj.s = value; } }, metadata: _metadata }, _s_initializers, _s_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        s = __runInitializers(this, _s_initializers, void 0);
        constructor(s) {
            super(s);
            __runInitializers(this, _s_extraInitializers);
        }
        /**
         * Generate a random private key.
         *
         * You can obtain the associated public key via {@link toPublicKey}.
         * And generate signatures via {@link Signature.create}.
         *
         * Note: This uses node or browser built-in APIs to obtain cryptographically strong randomness,
         * and can be safely used to generate a real private key.
         *
         * @returns a new {@link PrivateKey}.
         */
        static random() {
            return new PrivateKey(wrapped_js_1.Scalar.random());
        }
        /**
         * Create a random keypair `{ privateKey: PrivateKey, publicKey: PublicKey }`.
         *
         * Note: This uses node or browser built-in APIs to obtain cryptographically strong randomness,
         * and can be safely used to generate a real keypair.
         */
        static randomKeypair() {
            let privateKey = PrivateKey.random();
            return { privateKey, publicKey: privateKey.toPublicKey() };
        }
        /**
         * Deserializes a list of bits into a {@link PrivateKey}.
         *
         * @param bs a list of {@link Bool}.
         * @returns a {@link PrivateKey}.
         */
        static fromBits(bs) {
            return new PrivateKey(wrapped_js_1.Scalar.fromBits(bs));
        }
        /**
         * Convert this {@link PrivateKey} to a bigint
         */
        toBigInt() {
            return this.s.toBigInt();
        }
        /**
         * Create a {@link PrivateKey} from a bigint
         *
         * **Warning**: Private keys should be sampled from secure randomness with sufficient entropy.
         * Be careful that you don't use this method to create private keys that were sampled insecurely.
         */
        static fromBigInt(sk) {
            return new PrivateKey(wrapped_js_1.Scalar.from(sk));
        }
        /**
         * Derives the associated public key.
         *
         * @returns a {@link PublicKey}.
         */
        toPublicKey() {
            return PublicKey.fromPrivateKey(this);
        }
        /**
         * Decodes a base58 string into a {@link PrivateKey}.
         *
         * @returns a {@link PrivateKey}.
         */
        static fromBase58(privateKeyBase58) {
            let scalar = curve_bigint_js_1.PrivateKey.fromBase58(privateKeyBase58);
            return new PrivateKey(wrapped_js_1.Scalar.from(scalar));
        }
        /**
         * Encodes a {@link PrivateKey} into a base58 string.
         * @returns a base58 encoded string
         */
        toBase58() {
            return PrivateKey.toBase58(this);
        }
        // static version, to operate on non-class versions of this type
        /**
         * Static method to encode a {@link PrivateKey} into a base58 string.
         * @returns a base58 encoded string
         */
        static toBase58(privateKey) {
            return curve_bigint_js_1.PrivateKey.toBase58(privateKey.s.toBigInt());
        }
        static toValue(v) {
            return v.toBigInt();
        }
        static fromValue(v) {
            if (v instanceof PrivateKey)
                return v;
            return PrivateKey.fromBigInt(v);
        }
    };
})();
exports.PrivateKey = PrivateKey;
// TODO: this doesn't have a non-default check method yet. does it need one?
/**
 * A public key, which is also an address on the Mina network.
 * You can derive a {@link PublicKey} directly from a {@link PrivateKey}.
 */
let PublicKey = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _x_decorators;
    let _x_initializers = [];
    let _x_extraInitializers = [];
    let _isOdd_decorators;
    let _isOdd_initializers = [];
    let _isOdd_extraInitializers = [];
    return class PublicKey extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _x_decorators = [circuit_value_js_1.prop];
            _isOdd_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _x_decorators, { kind: "field", name: "x", static: false, private: false, access: { has: obj => "x" in obj, get: obj => obj.x, set: (obj, value) => { obj.x = value; } }, metadata: _metadata }, _x_initializers, _x_extraInitializers);
            __esDecorate(null, null, _isOdd_decorators, { kind: "field", name: "isOdd", static: false, private: false, access: { has: obj => "isOdd" in obj, get: obj => obj.isOdd, set: (obj, value) => { obj.isOdd = value; } }, metadata: _metadata }, _isOdd_initializers, _isOdd_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // compressed representation of a curve point, where `isOdd` is the least significant bit of `y`
        x = __runInitializers(this, _x_initializers, void 0);
        isOdd = (__runInitializers(this, _x_extraInitializers), __runInitializers(this, _isOdd_initializers, void 0));
        /**
         * Returns the {@link Group} representation of this {@link PublicKey}.
         * @returns A {@link Group}
         */
        toGroup() {
            // compute y from elliptic curve equation y^2 = x^3 + 5
            let { x, isOdd } = this;
            let y = x.square().mul(x).add(5).sqrt();
            // negate y if its parity is different from the public key's
            let sameParity = y.isOdd().equals(isOdd).toField();
            let sign = sameParity.mul(2).sub(1); // (2*sameParity - 1) == 1 if same parity, -1 if different parity
            y = y.mul(sign);
            return new wrapped_js_1.Group({ x, y });
        }
        /**
         * Creates a {@link PublicKey} from a {@link Group} element.
         * @returns a {@link PublicKey}.
         */
        static fromGroup({ x, y }) {
            return PublicKey.fromObject({ x, isOdd: y.isOdd() });
        }
        /**
         * Derives a {@link PublicKey} from a {@link PrivateKey}.
         * @returns a {@link PublicKey}.
         */
        static fromPrivateKey({ s }) {
            return PublicKey.fromGroup(wrapped_js_1.Group.generator.scale(s));
        }
        /**
         * Creates a {@link PublicKey} from a JSON structure element.
         * @returns a {@link PublicKey}.
         */
        static from(g) {
            return PublicKey.fromObject({ x: wrapped_js_1.Field.from(g.x), isOdd: (0, wrapped_js_1.Bool)(g.isOdd) });
        }
        /**
         * Creates an empty {@link PublicKey}.
         * @returns an empty {@link PublicKey}
         */
        static empty() {
            return PublicKey.from({ x: 0n, isOdd: false });
        }
        /**
         * Checks if a {@link PublicKey} is empty.
         * @returns a {@link Bool}
         */
        isEmpty() {
            // there are no curve points with x === 0
            return this.x.equals(0);
        }
        /**
         * Decodes a base58 encoded {@link PublicKey} into a {@link PublicKey}.
         * @returns a {@link PublicKey}
         */
        static fromBase58(publicKeyBase58) {
            let { x, isOdd } = curve_bigint_js_1.PublicKey.fromBase58(publicKeyBase58);
            return PublicKey.from({ x: (0, wrapped_js_1.Field)(x), isOdd: (0, wrapped_js_1.Bool)(!!isOdd) });
        }
        /**
         * Encodes a {@link PublicKey} in base58 format.
         * @returns a base58 encoded {@link PublicKey}
         */
        toBase58() {
            return PublicKey.toBase58(this);
        }
        /**
         * Static method to encode a {@link PublicKey} into base58 format.
         * @returns a base58 encoded {@link PublicKey}
         */
        static toBase58({ x, isOdd }) {
            x = (0, field_js_1.toConstantField)(x, 'toBase58', 'pk', 'public key');
            return curve_bigint_js_1.PublicKey.toBase58({
                x: x.toBigInt(),
                isOdd: isOdd.toBoolean(),
            });
        }
        /**
         * Serializes a {@link PublicKey} into its JSON representation.
         * @returns a JSON string
         */
        static toJSON(publicKey) {
            return publicKey.toBase58();
        }
        /**
         * Deserializes a JSON string into a {@link PublicKey}.
         * @returns a JSON string
         */
        static fromJSON(publicKey) {
            return PublicKey.fromBase58(publicKey);
        }
        static toValue({ x, isOdd }) {
            return { x: x.toBigInt(), isOdd: isOdd.toBoolean() };
        }
        static fromValue({ x, isOdd }) {
            return PublicKey.from({ x: wrapped_js_1.Field.from(x), isOdd: (0, wrapped_js_1.Bool)(isOdd) });
        }
        constructor() {
            super(...arguments);
            __runInitializers(this, _isOdd_extraInitializers);
        }
    };
})();
exports.PublicKey = PublicKey;
/**
 * A Schnorr {@link Signature} over the Pasta Curves.
 */
let Signature = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _r_decorators;
    let _r_initializers = [];
    let _r_extraInitializers = [];
    let _s_decorators;
    let _s_initializers = [];
    let _s_extraInitializers = [];
    return class Signature extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _r_decorators = [circuit_value_js_1.prop];
            _s_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _r_decorators, { kind: "field", name: "r", static: false, private: false, access: { has: obj => "r" in obj, get: obj => obj.r, set: (obj, value) => { obj.r = value; } }, metadata: _metadata }, _r_initializers, _r_extraInitializers);
            __esDecorate(null, null, _s_decorators, { kind: "field", name: "s", static: false, private: false, access: { has: obj => "s" in obj, get: obj => obj.s, set: (obj, value) => { obj.s = value; } }, metadata: _metadata }, _s_initializers, _s_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        r = __runInitializers(this, _r_initializers, void 0);
        s = (__runInitializers(this, _r_extraInitializers), __runInitializers(this, _s_initializers, void 0));
        /**
         * Signs a message using a {@link PrivateKey}.
         * @returns a {@link Signature}
         */
        static create(privKey, msg) {
            let publicKey = PublicKey.fromPrivateKey(privKey).toGroup();
            let d = privKey.s;
            // we chose an arbitrary prefix for the signature
            // there's no consequences in practice and the signatures can be used with any network
            // if there needs to be a custom nonce, include it in the message itself
            let kPrime = wrapped_js_1.Scalar.from((0, signature_js_1.deriveNonce)({ fields: msg.map((f) => f.toBigInt()) }, { x: publicKey.x.toBigInt(), y: publicKey.y.toBigInt() }, d.toBigInt(), 'devnet'));
            let { x: r, y: ry } = wrapped_js_1.Group.generator.scale(kPrime);
            let k = ry.isOdd().toBoolean() ? kPrime.neg() : kPrime;
            let h = (0, poseidon_js_1.hashWithPrefix)((0, signature_js_1.signaturePrefix)('devnet'), msg.concat([publicKey.x, publicKey.y, r]));
            let e = wrapped_js_1.Scalar.fromField(h);
            let s = e.mul(d).add(k);
            return new Signature(r, s);
        }
        /**
         * Verifies the {@link Signature} using a message and the corresponding {@link PublicKey}.
         * @returns a {@link Bool}
         */
        verify(publicKey, msg) {
            let point = publicKey.toGroup();
            // we chose an arbitrary prefix for the signature
            // there's no consequences in practice and the signatures can be used with any network
            // if there needs to be a custom nonce, include it in the message itself
            let h = (0, poseidon_js_1.hashWithPrefix)((0, signature_js_1.signaturePrefix)('devnet'), msg.concat([point.x, point.y, this.r]));
            let r = point.scale(h).neg().add(wrapped_js_1.Group.generator.scale(this.s));
            return r.x.equals(this.r).and(r.y.isEven());
        }
        /**
         * Decodes a base58 encoded signature into a {@link Signature}.
         */
        static fromBase58(signatureBase58) {
            let { r, s } = signature_js_1.Signature.fromBase58(signatureBase58);
            return Signature.fromObject({ r: (0, wrapped_js_1.Field)(r), s: wrapped_js_1.Scalar.from(s) });
        }
        /**
         * Encodes a {@link Signature} in base58 format.
         */
        toBase58() {
            let r = this.r.toBigInt();
            let s = this.s.toBigInt();
            return signature_js_1.Signature.toBase58({ r, s });
        }
        static fromValue({ r, s }) {
            return Signature.fromObject({ r: wrapped_js_1.Field.from(r), s: wrapped_js_1.Scalar.from(s) });
        }
        constructor() {
            super(...arguments);
            __runInitializers(this, _s_extraInitializers);
        }
    };
})();
exports.Signature = Signature;
