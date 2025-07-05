import { MlBool } from '../../../lib/ml/base.js';
import { withPrefix } from './util.js';
/**
 * TS implementation of Pasta_bindings.BigInt256
 */
export { Bigint256Bindings, toMlStringAscii, fromMlString, MlBytes, mlBytesFromUint8Array, mlBytesToUint8Array, };
const Bigint256Bindings = withPrefix('caml_bigint_256', {
    // TODO
    of_numeral(s, i, j) {
        throw Error('caml_bigint_256_of_numeral not implemented');
    },
    of_decimal_string(s) {
        return [0, BigInt(fromMlString(s))];
    },
    num_limbs() {
        return 4;
    },
    bytes_per_limb() {
        return 8;
    },
    div([, x], [, y]) {
        return [0, x / y];
    },
    compare([, x], [, y]) {
        if (x < y)
            return -1;
        if (x === y)
            return 0;
        return 1;
    },
    print([, x]) {
        console.log(x.toString());
    },
    to_string(x) {
        return toMlStringAscii(x[1].toString());
    },
    // TODO performance critical
    test_bit(b, i) {
        return MlBool(!!(b[1] & (1n << BigInt(i))));
    },
    to_bytes([, x]) {
        let ocamlBytes = caml_create_bytes(32);
        for (let i = 0; i < 32; i++) {
            let byte = Number(x & 0xffn);
            caml_bytes_unsafe_set(ocamlBytes, i, byte);
            x >>= 8n;
        }
        if (x !== 0n)
            throw Error("bigint256 doesn't fit into 32 bytes.");
        return ocamlBytes;
    },
    of_bytes(ocamlBytes) {
        let length = ocamlBytes.l;
        if (length > 32)
            throw Error(length + " bytes don't fit into bigint256");
        let x = 0n;
        let bitPosition = 0n;
        for (let i = 0; i < length; i++) {
            let byte = caml_bytes_unsafe_get(ocamlBytes, i);
            x |= BigInt(byte) << bitPosition;
            bitPosition += 8n;
        }
        return [0, x];
    },
    deep_copy([, x]) {
        return [0, x];
    },
});
// TODO clean up all this / make type-safe and match JSOO in all relevant cases
function fromMlString(s) {
    // TODO doesn't handle all cases
    return s.c;
}
function toMlStringAscii(s) {
    return new MlBytes(9, s, s.length);
}
function caml_bytes_unsafe_get(s, i) {
    switch (s.t & 6) {
        default: /* PARTIAL */
            if (i >= s.c.length)
                return 0;
        case 0 /* BYTES */:
            return s.c.charCodeAt(i);
        case 4 /* ARRAY */:
            return s.c[i];
    }
}
function caml_bytes_unsafe_set(s, i, c) {
    // The OCaml compiler uses Char.unsafe_chr on integers larger than 255!
    c &= 0xff;
    if (s.t != 4 /* ARRAY */) {
        if (i == s.c.length) {
            s.c += String.fromCharCode(c);
            if (i + 1 == s.l)
                s.t = 0; /*BYTES | UNKNOWN*/
            return 0;
        }
        caml_convert_bytes_to_array(s);
    }
    // TODO
    s.c[i] = c;
    return 0;
}
function caml_create_bytes(len) {
    return new MlBytes(2, '', len);
}
function caml_convert_bytes_to_array(s) {
    /* Assumes not ARRAY */
    let a = new Uint8Array(s.l);
    let b = s.c, l = b.length, i = 0;
    for (; i < l; i++)
        a[i] = b.charCodeAt(i);
    for (l = s.l; i < l; i++)
        a[i] = 0;
    s.c = a;
    // TODO
    s.t = 4; /* ARRAY */
    return a;
}
function mlBytesFromUint8Array(uint8array) {
    let length = uint8array.length;
    let ocaml_bytes = caml_create_bytes(length);
    for (let i = 0; i < length; i++) {
        // No need to convert here: OCaml Char.t is just an int under the hood.
        caml_bytes_unsafe_set(ocaml_bytes, i, uint8array[i]);
    }
    return ocaml_bytes;
}
function mlBytesToUint8Array(ocaml_bytes) {
    let length = ocaml_bytes.l;
    let bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        // No need to convert here: OCaml Char.t is just an int under the hood.
        bytes[i] = caml_bytes_unsafe_get(ocaml_bytes, i);
    }
    return bytes;
}
class MlBytes {
    constructor(tag, content, length) {
        this.t = tag;
        this.c = content;
        this.l = length;
    }
    toString() {
        if (this.t === 9)
            return this.c;
        throw Error('todo');
    }
    toUtf16() {
        return this.toString();
    }
    slice() {
        let content = this.t == 4 ? this.c.slice() : this.c;
        return new MlBytes(this.t, content, this.l);
    }
}
