// https://csrc.nist.gov/pubs/fips/180-4/upd1/final

import { Field } from '../field.js';
import { UInt32 } from '../int.js';
import { Gadgets } from './gadgets.js';

export { SHA256 };

function processStringToMessageBlocks(s: string) {
  let msgBits = s
    .split('')
    .map((c) => {
      let binary = c.charCodeAt(0).toString(2);
      return '00000000'.substr(binary.length) + binary;
    })
    .join('');

  let l = msgBits.length;
  msgBits = msgBits + '1';

  // calculate k in l + 1 +k = 448 mod 512
  let remainder = (448 - (l + 1)) % 512;

  let k = (remainder + 512) % 512;
  let padding = '0'.repeat(k);
  msgBits = msgBits + padding;
  let lBits = l.toString(2);
  msgBits = msgBits + '0'.repeat(64 - lBits.length) + lBits;

  let bitBlocks32 = [];
  for (let i = 0; i < msgBits.length; i += 32) {
    bitBlocks32.push(UInt32.from(BigInt('0b' + msgBits.substr(i, 32))));
  }

  let lengthBlocks = bitBlocks32.length;
  let blocks = [];
  for (let i = 0; i < lengthBlocks; i += 16) {
    let block = bitBlocks32.slice(i, i + 16);
    blocks.push(block);
  }
  return blocks;
}

const SHA256 = {
  hash(data: UInt32[][]) {
    // constants §4.2.2
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ].map((k) => UInt32.from(k));

    // initial hash values §5.3.3
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
      0x1f83d9ab, 0x5be0cd19,
    ].map((h) => UInt32.from(h));

    // TODO: correct dynamic preprocessing §6.2
    // padding the message $5.1.1 into blocks that are a multiple of 512
    let messageBlocks = data;

    const N = messageBlocks.length;

    for (let i = 0; i < N; i++) {
      const M = messageBlocks[i];
      // for each message block of 16 x 32 bytes do:
      const W: UInt32[] = [];

      // prepare message block
      for (let t = 0; t <= 15; t++) W[t] = M[t];
      for (let t = 16; t <= 63; t++) {
        let unreduced = DeltaOne(W[t - 2])
          .value.add(W[t - 7].value)
          .add(DeltaZero(W[t - 15]).value.add(W[t - 16].value));

        W[t] = UInt32.from(Gadgets.divMod32(unreduced).remainder);
      }

      // initialize working variables
      let a = H[0];
      let b = H[1];
      let c = H[2];
      let d = H[3];
      let e = H[4];
      let f = H[5];
      let g = H[6];
      let h = H[7];

      // main loop
      for (let t = 0; t <= 63; t++) {
        const unreducedT1 = h.value
          .add(SigmaOne(e).value)
          .add(Ch(e, f, g).value)
          .add(K[t].value)
          .add(W[t].value);

        const unreducedT2 = SigmaZero(a).value.add(Maj(a, b, c).value);

        h = g;
        g = f;
        f = e;
        e = UInt32.from(Gadgets.divMod32(d.value.add(unreducedT1)).remainder);
        d = c;
        c = b;
        b = a;
        a = UInt32.from(
          Gadgets.divMod32(unreducedT2.add(unreducedT1)).remainder
        );
      }

      // new intermediate hash value

      H[0] = H[0].addMod32(a);
      H[1] = H[1].addMod32(b);
      H[2] = H[2].addMod32(c);
      H[3] = H[3].addMod32(d);
      H[4] = H[4].addMod32(e);
      H[5] = H[5].addMod32(f);
      H[6] = H[6].addMod32(g);
      H[7] = H[7].addMod32(h);
    }

    return H;
  },
  processStringToMessageBlocks: processStringToMessageBlocks,
};

function Ch(x: UInt32, y: UInt32, z: UInt32) {
  let xAndY = x.and(y);
  let xNotAndZ = x.not().and(z);
  return xAndY.xor(xNotAndZ);
}

function Maj(x: UInt32, y: UInt32, z: UInt32) {
  let xAndY = x.and(y);
  let xAndZ = x.and(z);
  let yAndZ = y.and(z);

  return xAndY.xor(xAndZ).xor(yAndZ);
}

function SigmaZero(x: UInt32) {
  let rotr2 = ROTR(2, x);
  let rotr13 = ROTR(13, x);
  let rotr22 = ROTR(22, x);

  return rotr2.xor(rotr13).xor(rotr22);
}

function SigmaOne(x: UInt32) {
  let rotr6 = ROTR(6, x);
  let rotr11 = ROTR(11, x);
  let rotr25 = ROTR(25, x);

  return rotr6.xor(rotr11).xor(rotr25);
}

// lowercase sigma = delta to avoid confusing function names

function DeltaZero(x: UInt32) {
  let rotr7 = ROTR(7, x);
  let rotr18 = ROTR(18, x);
  let shr3 = SHR(3, x);

  return rotr7.xor(rotr18).xor(shr3);
}

function DeltaOne(x: UInt32) {
  let rotr17 = ROTR(17, x);
  let rotr19 = ROTR(19, x);
  let shr10 = SHR(10, x);
  return rotr17.xor(rotr19).xor(shr10);
}

function ROTR(n: number, x: UInt32) {
  return x.rotate(n, 'right');
}

function SHR(n: number, x: UInt32) {
  let val = x.rightShift(n);
  return val;
}
