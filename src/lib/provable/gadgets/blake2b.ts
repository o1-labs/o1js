// https://www.blake2.net/blake2.pdf
import { UInt64, UInt8 } from '../int.js';
import { FlexibleBytes } from '../bytes.js';
import { Bytes } from '../wrapped-classes.js';
import { Gadgets } from './gadgets.js';
import { assert } from '../../util/errors.js';

export { BLAKE2B };

const BLAKE2BConstants = {
  IV: [
    UInt64.from(0x6a09e667f3bcc908n),
    UInt64.from(0xbb67ae8584caa73bn),
    UInt64.from(0x3c6ef372fe94f82bn),
    UInt64.from(0xa54ff53a5f1d36f1n),
    UInt64.from(0x510e527fade682d1n),
    UInt64.from(0x9b05688c2b3e6c1fn),
    UInt64.from(0x1f83d9abfb41bd6bn),
    UInt64.from(0x5be0cd19137e2179n),
  ],

  SIGMA: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
  ],
};

const BLAKE2B = {
  hash(data: FlexibleBytes, digestLength = 64) {
    assert(
      digestLength >= 1 && digestLength <= 64,
      `digestLength must be in the range [1, 64], got ${digestLength}`
    );
    const state = initialize(digestLength);
    update(state, Bytes.from(data).bytes);
    const out = final(state);
    return Bytes.from(out);
  },
  get IV() {
    return BLAKE2BConstants.IV;
  },
};

function initialize(outlen: number): {
  h: UInt64[];
  t: UInt64[];
  f: UInt64[];
  buf: UInt8[];
  buflen: number;
  outlen: number;
} {
  const h = BLAKE2B.IV.slice(); // shallow copy IV to h
  h[0] = UInt64.from(0x01010000).xor(UInt64.from(outlen)).xor(h[0]);
  return {
    h,
    t: [UInt64.zero, UInt64.zero],
    f: [UInt64.zero, UInt64.zero],
    buf: [],
    buflen: 0,
    outlen,
  };
}

function G(
  v: UInt64[],
  a: number,
  b: number,
  c: number,
  d: number,
  x: UInt64,
  y: UInt64
) {
  v[a] = UInt64.Unsafe.fromField(Gadgets.divMod64(v[a].value.add(v[b].value.add(x.value)), 128).remainder);
  v[d] = v[d].xor(v[a]).rotate(32, 'right');
  
  v[c] = UInt64.Unsafe.fromField(Gadgets.divMod64(v[c].value.add(v[d].value), 128).remainder);
  v[b] = v[b].xor(v[c]).rotate(24, 'right');

  v[a] = UInt64.Unsafe.fromField(Gadgets.divMod64(v[a].value.add(v[b].value.add(y.value)), 128).remainder);
  v[d] = v[d].xor(v[a]).rotate(16, 'right');

  v[c] = UInt64.Unsafe.fromField(Gadgets.divMod64(v[c].value.add(v[d].value), 128).remainder);
  v[b] = v[b].xor(v[c]).rotate(63, 'right');
}

function compress(state: {
  h: UInt64[];
  t: UInt64[];
  f: UInt64[];
  buf: UInt8[];
  buflen: number;
  outlen: number;
}): void {
  const { h, t, f, buf } = state;
  const v = h.concat(BLAKE2B.IV); // initalize local work vector. First half from state and second half from IV.

  v[12] = v[12].xor(t[0]); // low word of the offset
  v[13] = v[13].xor(t[1]); // high word of the offset
  v[14] = v[14].xor(f[0]);
  v[15] = v[15].xor(f[1]);

  const m: UInt64[] = [];
  for (let i = 0; i < 16; i++) {
    m.push(
      UInt64.from(
        buf[i * 8]
          .toUInt64()
          .or(buf[i * 8 + 1].toUInt64().leftShift(8))
          .or(buf[i * 8 + 2].toUInt64().leftShift(16))
          .or(buf[i * 8 + 3].toUInt64().leftShift(24))
          .or(buf[i * 8 + 4].toUInt64().leftShift(32))
          .or(buf[i * 8 + 5].toUInt64().leftShift(40))
          .or(buf[i * 8 + 6].toUInt64().leftShift(48))
          .or(buf[i * 8 + 7].toUInt64().leftShift(56))
      )
    );
  }

  for (let i = 0; i < 12; i++) {
    const s = BLAKE2BConstants.SIGMA[i % 10];
    G(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
    G(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
    G(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
    G(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);

    G(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
    G(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
    G(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
    G(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
  }

  for (let i = 0; i < 8; i++) {
    h[i] = v[i].xor(v[i + 8]).xor(h[i]);
  }
}

function update(
  state: {
    h: UInt64[];
    t: UInt64[];
    f: UInt64[];
    buf: UInt8[];
    buflen: number;
    outlen: number;
  },
  input: UInt8[]
): void {
  for (let i = 0; i < input.length; i++) {
    if (state.buflen === 128) {
      state.t[0] = state.t[0].add(128);
      if (state.t[0].equals(UInt64.zero)) {
        state.t[1] = state.t[1].addMod64(UInt64.one);
      }
      compress(state);
      state.buflen = 0;
    }
    state.buf[state.buflen++] = input[i];
  }
}

function final(state: {
  h: UInt64[];
  t: UInt64[];
  f: UInt64[];
  buf: UInt8[];
  buflen: number;
  outlen: number;
}): UInt8[] {
  state.t[0] = state.t[0].add(state.buflen);
  if (state.t[0].equals(UInt64.zero)) {
    state.t[1] = state.t[1].add(UInt64.zero);
  }
  state.f[0] = UInt64.from('0xFFFFFFFFFFFFFFFF');

  while (state.buflen < 128) {
    state.buf[state.buflen++] = UInt8.from(0);
  }
  compress(state);

  const out: UInt8[] = [];
  for (let i = 0; i < state.outlen; i++) {
    out[i] = UInt8.from(
      state.h[i >> 3].rightShift(8 * (i & 7)).and(UInt64.from(0xff))
    );
  }
  return out;
}
