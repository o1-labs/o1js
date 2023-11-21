import { Field } from './field.js';
import { UInt32, UInt8 } from './int.js';
import { Provable } from './provable.js';

// https://csrc.nist.gov/pubs/fips/180-4/upd1/final

function rot(
  x: bigint,
  bits: number,
  direction: 'left' | 'right' = 'left',
  n: number = 64
) {
  let bitArray = x.toString(2).split('').reverse().map(Number);
  let binary: number[] =
    bitArray.length >= n
      ? bitArray.splice(0, n)
      : [...bitArray, ...Array(n - bitArray.length).fill(0)];
  for (let j = 0; j < bits; j++) {
    if (direction === 'left') {
      let last = binary.pop()!;
      binary.unshift(last);
    } else {
      let last = binary.shift()!;
      binary.push(last);
    }
  }
  return BigInt('0b' + binary.reverse().join(''));
}
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

const SHA256 = {
  hash(msg: string) {
    // preprocessing §6.2
    // padding the message $5.1.1 into blocks that are a multiple of 512
    let messageByteArray = toUInt8(msg);
    let l = messageByteArray.length * 8;
    let k = 448 - (l + 1);
    let padding = [1, ...new Array(k).fill(0)];

    let messageBlocks = [
      // M1
      new Array(16).fill(UInt32.from(1)),
      new Array(16).fill(UInt32.from(1)),
    ];

    for (let i = 0; i < messageBlocks.length; i++) {
      const M = messageBlocks[i];
      // for each message block of 16 x 32 bytes do:
      const W = new Array(64);

      // prepare message block
      for (let t = 0; t < 16; t++) W[t] = M[t];
      for (let t = 16; t < 64; t++) {
        W[t] = addMod32(
          addMod32(DeltaOne(W[t - 2]), W[t - 7]),
          addMod32(DeltaZero(W[t - 15]), W[t - 16])
        );
      }
      // initialize working variables
      let a = H[0],
        b = H[1],
        c = H[2],
        d = H[3],
        e = H[4],
        f = H[5],
        g = H[6],
        h = H[7];

      // main loop
      for (let t = 0; t < 64; t++) {
        const T1 = addMod32(
          addMod32(h, SigmaOne(e)),
          addMod32(addMod32(Ch(e, f, g), K[t]), W[t])
        );
        const T2 = addMod32(SigmaOne(a), Maj(a, b, c));
        h = g;
        g = f;
        f = e;
        e = addMod32(d, T1);
        d = c;
        c = b;
        b = a;
        a = addMod32(T1, T2);
      }

      // new intermediate hash value

      H[0] = addMod32(H[0], a);
      H[1] = addMod32(H[1], b);
      H[2] = addMod32(H[2], c);
      H[3] = addMod32(H[3], d);
      H[4] = addMod32(H[4], e);
      H[5] = addMod32(H[5], f);
      H[6] = addMod32(H[6], g);
      H[7] = addMod32(H[7], h);
    }

    /*
    let hex = '';
    for (let h = 0; h < H.length; h++)
      hex = hex + ('00000000' + H[h].toBigint().toString(16)).slice(-8);
    console.log(hex);
    */
  },
};

let cs = Provable.constraintSystem(() => SHA256.hash('abc'));
console.log(cs);
function toUInt8(msg: string) {
  return msg.split('').map((c) => UInt8.from(c.charCodeAt(0)));
}

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
  let xx = Provable.witness(UInt32, () => {
    return UInt32.from(rot(x.toBigint(), n, 'right', 32));
  });
  xx.mul(1);
  xx.assertGreaterThan(UInt32.from(0n));
  return xx;
  //return x.rotate(n, 'right');
}

function SHR(n: number, x: UInt32) {
  let val = x.rightShift(n);
  return val;
}

function addMod32(a: UInt32, b: UInt32) {
  // a + b === q*2^32 + r where r and q are range checked
  let rq = Provable.witness(Provable.Array(UInt32, 2), () => {
    let aPlusB = a.value.add(b.value).toBigInt();
    let q = aPlusB / 2n ** 32n;
    let r = aPlusB % 2n ** 32n;
    return [UInt32.from(r), UInt32.from(q)];
  });
  let [r, q] = rq;

  a.value.add(b.value).assertEquals(q.value.mul(2n ** 32n).add(r.value));
  UInt32.check(r);
  UInt32.check(q);

  return r;
}
