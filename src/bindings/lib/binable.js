// generic encoding infrastructure
import { assertNonNegativeInteger, } from '../crypto/non-negative.js';
import { bytesToBigInt, bigIntToBytes } from '../crypto/bigint-helpers.js';
export { defineBinable, withVersionNumber, tuple, record, enumWithArgument, prefixToField, bytesToBits, bitsToBytes, withBits, withCheck, stringToBytes, stringFromBytes, stringLengthInBytes, BinableString, BinableInt32, BinableInt64, BinableUint32, BinableUint64, };
function defineBinable({ toBytes, readBytes, }) {
    // spec: input offset has to be a non-negative integer, and be smaller than the bytes length
    // output offset has to be greater or equal input, and not exceed the bytes length
    let readBytes_ = (bytes, offset) => {
        assertNonNegativeInteger(offset, 'readBytes: offset must be integer >= 0');
        if (offset >= bytes.length)
            throw Error('readBytes: offset must be within bytes length');
        let [value, end] = readBytes(bytes, offset);
        if (end < offset)
            throw Error('offset returned by readBytes must be greater than initial offset');
        if (end > bytes.length)
            throw Error('offset returned by readBytes must not exceed bytes length');
        return [value, end];
    };
    return {
        toBytes,
        readBytes: readBytes_,
        // spec: fromBytes throws if the input bytes are not all used
        fromBytes(bytes) {
            let [value, offset] = readBytes_(bytes, 0);
            if (offset < bytes.length)
                throw Error('fromBytes: input bytes left over');
            return value;
        },
    };
}
function withVersionNumber(binable, versionNumber) {
    return defineBinable({
        toBytes(t) {
            let bytes = binable.toBytes(t);
            bytes.unshift(versionNumber);
            return bytes;
        },
        readBytes(bytes, offset) {
            let version = bytes[offset++];
            if (version !== versionNumber) {
                throw Error(`fromBytes: Invalid version byte. Expected ${versionNumber}, got ${version}.`);
            }
            return binable.readBytes(bytes, offset);
        },
    });
}
function withCheck({ toBytes, readBytes }, check) {
    return defineBinable({
        toBytes,
        readBytes(bytes, start) {
            let [value, end] = readBytes(bytes, start);
            check(value);
            return [value, end];
        },
    });
}
function record(binables, keys) {
    let binablesTuple = keys.map((key) => binables[key]);
    let tupleBinable = tuple(binablesTuple);
    return defineBinable({
        toBytes(t) {
            let array = keys.map((key) => t[key]);
            return tupleBinable.toBytes(array);
        },
        readBytes(bytes, start) {
            let [tupleValue, end] = tupleBinable.readBytes(bytes, start);
            let value = Object.fromEntries(keys.map((key, i) => [key, tupleValue[i]]));
            return [value, end];
        },
    });
}
function tuple(binables) {
    let n = binables.length;
    return defineBinable({
        toBytes(t) {
            let bytes = [];
            for (let i = 0; i < n; i++) {
                let subBytes = binables[i].toBytes(t[i]);
                bytes.push(...subBytes);
            }
            return bytes;
        },
        readBytes(bytes, offset) {
            let values = [];
            for (let i = 0; i < n; i++) {
                let [value, newOffset] = binables[i].readBytes(bytes, offset);
                offset = newOffset;
                values.push(value);
            }
            return [values, offset];
        },
    });
}
function enumWithArgument(types) {
    let typeToIndex = Object.fromEntries(types.map(({ type }, i) => [type, i]));
    return defineBinable({
        toBytes(en) {
            let i = typeToIndex[en.type];
            let type = types[i];
            if ('value' in type) {
                let binable = type.value;
                return [i, ...binable.toBytes(en.value)];
            }
            return [i];
        },
        readBytes(bytes, offset) {
            let i = bytes[offset];
            offset++;
            let type = types[i];
            if ('value' in type) {
                let [value, end] = type.value.readBytes(bytes, offset);
                return [{ type: type.type, value }, end];
            }
            return [{ type: type.type }, offset];
        },
    });
}
const BinableString = defineBinable({
    toBytes(t) {
        return [stringLengthInBytes(t), ...stringToBytes(t)];
    },
    readBytes(bytes, offset) {
        let length = bytes[offset++];
        let end = offset + length;
        let string = stringFromBytes(bytes.slice(offset, end));
        return [string, end];
    },
});
const CODE_NEG_INT8 = 0xff;
const CODE_INT16 = 0xfe;
const CODE_INT32 = 0xfd;
const CODE_INT64 = 0xfc;
function BinableInt(bits) {
    let maxValue = 1n << BigInt(bits - 1);
    let nBytes = bits >> 3;
    if (nBytes * 8 !== bits)
        throw Error('bits must be evenly divisible by 8');
    return defineBinable({
        toBytes(n) {
            if (n < -maxValue || n >= maxValue)
                throw Error(`int${bits} out of range, got ${n}`);
            if (n >= 0) {
                if (n < 0x80n)
                    return bigIntToBytes(n, 1);
                if (n < 0x8000n)
                    return [CODE_INT16, ...bigIntToBytes(n, 2)];
                if (n < 0x80000000)
                    return [CODE_INT32, ...bigIntToBytes(n, 4)];
                else
                    return [CODE_INT64, ...bigIntToBytes(n, 8)];
            }
            else {
                let M = 1n << 64n;
                if (n >= -0x80n)
                    return [CODE_NEG_INT8, ...bigIntToBytes((M + n) & 0xffn, 1)];
                if (n >= -0x8000n)
                    return [CODE_INT16, ...bigIntToBytes((M + n) & 0xffffn, 2)];
                if (n >= -0x80000000)
                    return [CODE_INT32, ...bigIntToBytes((M + n) & 0xffffffffn, 4)];
                else
                    return [CODE_INT64, ...bigIntToBytes(M + n, 8)];
            }
        },
        readBytes(bytes, offset) {
            let code = bytes[offset++];
            if (code < 0x80)
                return [BigInt(code), offset];
            let size = {
                [CODE_NEG_INT8]: 1,
                [CODE_INT16]: 2,
                [CODE_INT32]: 4,
                [CODE_INT64]: 8,
            }[code];
            if (size === undefined) {
                throw Error('binable integer: invalid start byte');
            }
            let end = offset + size;
            let x = fillUInt(bytes.slice(offset, end), nBytes);
            // map from uint to int range
            if (x >= maxValue) {
                x -= 2n * maxValue;
            }
            if (x < -maxValue || x >= maxValue) {
                throw Error(`int${bits} out of range, got ${x}`);
            }
            return [x, end];
        },
    });
}
function fillUInt(startBytes, nBytes) {
    let n = startBytes.length;
    // fill up int with the highest bit of startBytes
    let lastBit = startBytes[n - 1] >> 7;
    let fillByte = lastBit === 1 ? 0xff : 0x00;
    let intBytes = startBytes.concat(Array(nBytes - n).fill(fillByte));
    // interpret result as a bigint > 0
    let x = bytesToBigInt(intBytes);
    return x;
}
function BinableUint(bits) {
    let binableInt = BinableInt(bits);
    let maxValue = 1n << BigInt(bits - 1);
    return iso(binableInt, {
        to(uint) {
            if (uint < 0n || uint >= 2n * maxValue)
                throw Error(`uint${bits} out of range, got ${uint}`);
            let ret = uint >= maxValue ? uint - 2n * maxValue : uint;
            return ret;
        },
        from(int) {
            let uint = int < 0n ? int + 2n * maxValue : int;
            if (uint < 0n || uint >= 2n * maxValue)
                throw Error(`uint${bits} out of range, got ${uint}`);
            return uint;
        },
    });
}
const BinableInt64 = BinableInt(64);
const BinableInt32 = BinableInt(32);
const BinableUint64 = BinableUint(64);
const BinableUint32 = BinableUint(32);
// same as Random_oracle.prefix_to_field in OCaml
// converts string to bytes and bytes to field; throws if bytes don't fit in one field
function prefixToField(Field, prefix) {
    let fieldSize = Field.sizeInBytes;
    if (prefix.length >= fieldSize)
        throw Error('prefix too long');
    let stringBytes = stringToBytes(prefix);
    return Field.fromBytes(stringBytes.concat(Array(fieldSize - stringBytes.length).fill(0)));
}
function bitsToBytes([...bits]) {
    let bytes = [];
    while (bits.length > 0) {
        let byteBits = bits.splice(0, 8);
        let byte = 0;
        for (let i = 0; i < 8; i++) {
            if (!byteBits[i])
                continue;
            byte |= 1 << i;
        }
        bytes.push(byte);
    }
    return bytes;
}
function bytesToBits(bytes) {
    return bytes
        .map((byte) => {
        let bits = Array(8);
        for (let i = 0; i < 8; i++) {
            bits[i] = !!(byte & 1);
            byte >>= 1;
        }
        return bits;
    })
        .flat();
}
/**
 * This takes a `Binable<T>` plus an optional `sizeInBits`, and derives toBits() / fromBits() functions.
 * - `sizeInBits` has to observe `Math.ceil(sizeInBits / 8) === sizeInBytes`, so the bit size can be slightly smaller than the byte size
 * - If `sizeInBits` is `< sizeInBytes * 8`, then we assume that toBytes() returns a byte sequence where the bits
 *   higher than `sizeInBits` are all 0. This assumption manifests in toBits(), where we slice off those higher bits,
 *   to return a result that is of length `sizeInBits`.
 *
 * This is useful for serializing field elements, where -- depending on the circumstance -- we either want a
 * 32-byte (= 256-bit) serialization, or a 255-bit serialization
 */
function withBits(binable, sizeInBits) {
    return {
        ...binable,
        toBits(t) {
            return bytesToBits(binable.toBytes(t)).slice(0, sizeInBits);
        },
        fromBits(bits) {
            return binable.fromBytes(bitsToBytes(bits));
        },
        sizeInBytes: Math.ceil(sizeInBits / 8),
        sizeInBits,
    };
}
function iso(binable, { to, from }) {
    return defineBinable({
        toBytes(s) {
            return binable.toBytes(to(s));
        },
        readBytes(bytes, offset) {
            let [value, end] = binable.readBytes(bytes, offset);
            return [from(value), end];
        },
    });
}
let encoder = new TextEncoder();
let decoder = new TextDecoder();
function stringToBytes(s) {
    return [...encoder.encode(s)];
}
function stringFromBytes(bytes) {
    return decoder.decode(Uint8Array.from(bytes));
}
function stringLengthInBytes(s) {
    return encoder.encode(s).length;
}
