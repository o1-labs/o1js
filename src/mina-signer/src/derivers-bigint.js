import { bigIntToBytes } from '../../bindings/crypto/bigint-helpers.js';
import { createDerivers } from '../../bindings/lib/provable-generic.js';
import { defineBinable, withBits } from '../../bindings/lib/binable.js';
export { signable, SignableBigint, BinableBigint, BinableBool };
let { signable } = createDerivers();
function SignableBigint(check) {
    return {
        toInput(x) {
            return { fields: [x], packed: [] };
        },
        toJSON(x) {
            return x.toString();
        },
        fromJSON(json) {
            if (isNaN(json) || isNaN(parseFloat(json))) {
                throw Error(`fromJSON: expected a numeric string, got "${json}"`);
            }
            let x = BigInt(json);
            check(x);
            return x;
        },
        empty() {
            return 0n;
        },
    };
}
function BinableBigint(sizeInBits, check) {
    let sizeInBytes = Math.ceil(sizeInBits / 8);
    return withBits(defineBinable({
        toBytes(x) {
            return bigIntToBytes(x, sizeInBytes);
        },
        readBytes(bytes, start) {
            let x = 0n;
            let bitPosition = 0n;
            let end = Math.min(start + sizeInBytes, bytes.length);
            for (let i = start; i < end; i++) {
                x += BigInt(bytes[i]) << bitPosition;
                bitPosition += 8n;
            }
            check(x);
            return [x, end];
        },
    }), sizeInBits);
}
function BinableBool(check) {
    return withBits(defineBinable({
        toBytes(x) {
            return [x ? 1 : 0];
        },
        readBytes(bytes, start) {
            let byte = bytes[start];
            check(byte);
            return [byte === 1, start + 1];
        },
    }), 1);
}
