export { Bigint256 };

type Bigint256 = [bigint];

const Bigint256 = {
  caml_bigint_256_of_decimal_string(s: MlBytes): Bigint256 {
    return [BigInt(fromMlString(s))];
  },
  caml_bigint_256_of_bytes(ocamlBytes: MlBytes) {
    var length = ocamlBytes.l;
    if (length > 32) throw Error(length + " bytes don't fit into bigint256");
    var x = 0n;
    var bitPosition = 0n;
    for (var i = 0; i < length; i++) {
      var byte = caml_bytes_unsafe_get(ocamlBytes, i);
      x += BigInt(byte) << bitPosition;
      bitPosition += 8n;
    }
    return [x];
  },
  caml_bigint_256_to_bytes([x]: Bigint256) {
    var ocamlBytes = caml_create_bytes(32);
    for (var i = 0; x > 0; x >>= 8n, i++) {
      if (i >= 32) throw Error("bigint256 doesn't fit into 32 bytes.");
      var byte = Number(x & 0xffn);
      caml_bytes_unsafe_set(ocamlBytes, i, byte);
    }
    return ocamlBytes;
  },
  caml_bigint_256_to_string(x: Bigint256) {
    return toMlStringAscii(x[0].toString());
  },
  // TODO performance critical
  caml_bigint_256_test_bit(b: Bigint256, i: number) {
    return Number(!!(b[0] & (1n << BigInt(i))));
  },
  caml_bigint_256_compare([x]: Bigint256, [y]: Bigint256) {
    if (x < y) return -1;
    if (x === y) return 0;
    return 1;
  },
  caml_bigint_256_num_limbs() {
    return 4;
  },
  caml_bigint_256_bytes_per_limb() {
    return 8;
  },
};

// TODO clean up all this / make type-safe and match JSOO in all relevant cases

function fromMlString(s: MlBytes) {
  // TODO doesn't handle all cases
  return s.c;
}
function toMlStringAscii(s: string) {
  return new MlBytes(9, s, s.length);
}

function caml_bytes_unsafe_get(s: MlBytes, i: number) {
  switch (s.t & 6) {
    default: /* PARTIAL */
      if (i >= s.c.length) return 0;
    case 0 /* BYTES */:
      return s.c.charCodeAt(i);
    case 4 /* ARRAY */:
      return s.c[i];
  }
}

function caml_bytes_unsafe_set(s: MlBytes, i: number, c: number) {
  // The OCaml compiler uses Char.unsafe_chr on integers larger than 255!
  c &= 0xff;
  if (s.t != 4 /* ARRAY */) {
    if (i == s.c.length) {
      s.c += String.fromCharCode(c);
      if (i + 1 == s.l) s.t = 0; /*BYTES | UNKOWN*/
      return 0;
    }
    caml_convert_bytes_to_array(s);
  }
  // TODO
  (s.c as any)[i] = c;
  return 0;
}

function caml_create_bytes(len: number) {
  return new MlBytes(2, '', len);
}

function caml_convert_bytes_to_array(s: MlBytes) {
  /* Assumes not ARRAY */
  var a = new Uint8Array(s.l);
  var b = s.c,
    l = b.length,
    i = 0;
  for (; i < l; i++) a[i] = b.charCodeAt(i);
  for (l = s.l; i < l; i++) a[i] = 0;
  (s as any).c = a;
  // TODO
  s.t = 4; /* ARRAY */
  return a;
}

class MlBytes {
  t: number;
  c: string;
  l: number;

  constructor(tag: number, content: string, length: number) {
    this.t = tag;
    this.c = content;
    this.l = length;
  }

  toString() {
    if (this.t === 9) return this.c;
    throw Error('todo');
  }

  toUtf16() {
    return this.toString();
  }

  slice() {
    var content = this.t == 4 ? this.c.slice() : this.c;
    return new MlBytes(this.t, content, this.l);
  }
}
