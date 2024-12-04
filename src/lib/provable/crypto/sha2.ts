import { mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../wrapped.js';
import { UInt32, UInt64, UInt8 } from '../int.js';
import { exists } from '../core/exists.js';
import { FlexibleBytes } from '../bytes.js';
import { Bytes } from '../wrapped-classes.js';
import { chunk } from '../../util/arrays.js';
import { TupleN } from '../../util/types.js';
import { divMod32, divMod64 } from '../gadgets/arithmetic.js';
import { bitSlice } from '../gadgets/common.js';
import { rangeCheck16 } from '../gadgets/range-check.js';
import { Uint } from 'web3';

export { SHA2 };

// SHA2 CONSTANTS
const SHA2Constants = {
  // Bit length of the blocks used in SHA2-224 and SHA2-256
  BLOCK_LENGTH_224_256: 512n,

  // Bit length of the blocks used in SHA2-384 and SHA2-512
  BLOCK_LENGTH_384_512: 1024n,

  // Value used in the padding equation for SHA2-224 and SHA2-256
  PADDING_VALUE_224_256: 448n,

  // Value used in the padding equation for SHA2-384 and SHA2-512
  PADDING_VALUE_384_512: 896n,

  // Bits used to store the length in the padding of SHA2-224 and SHA2-256
  // It corresponds to 512 - 448 = 64
  LENGTH_CHUNK_224_256: 64,

  // Bits used to store the length in the padding of SHA2-384 and SHA2-512
  // It corresponds to 1024 - 896 = 128
  LENGTH_CHUNK_384_512: 128,

  // Number of words in message schedule for SHA2-224 and SHA2-256
  SCHEDULE_WORDS_224_256: 64,

  // Number of words in message schedule for SHA2-384 and SHA2-512
  SCHEDULE_WORDS_384_512: 80,

  // constants for SHA2-224 and SHA2-256 §4.2.2
  K224_256: [
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
  ],
  // constants for SHA2-384 and SHA2-512 §4.2.3
  K384_512: [
    0x428a2f98d728ae22n,
    0x7137449123ef65cdn,
    0xb5c0fbcfec4d3b2fn,
    0xe9b5dba58189dbbcn,
    0x3956c25bf348b538n,
    0x59f111f1b605d019n,
    0x923f82a4af194f9bn,
    0xab1c5ed5da6d8118n,
    0xd807aa98a3030242n,
    0x12835b0145706fben,
    0x243185be4ee4b28cn,
    0x550c7dc3d5ffb4e2n,
    0x72be5d74f27b896fn,
    0x80deb1fe3b1696b1n,
    0x9bdc06a725c71235n,
    0xc19bf174cf692694n,
    0xe49b69c19ef14ad2n,
    0xefbe4786384f25e3n,
    0x0fc19dc68b8cd5b5n,
    0x240ca1cc77ac9c65n,
    0x2de92c6f592b0275n,
    0x4a7484aa6ea6e483n,
    0x5cb0a9dcbd41fbd4n,
    0x76f988da831153b5n,
    0x983e5152ee66dfabn,
    0xa831c66d2db43210n,
    0xb00327c898fb213fn,
    0xbf597fc7beef0ee4n,
    0xc6e00bf33da88fc2n,
    0xd5a79147930aa725n,
    0x06ca6351e003826fn,
    0x142929670a0e6e70n,
    0x27b70a8546d22ffcn,
    0x2e1b21385c26c926n,
    0x4d2c6dfc5ac42aedn,
    0x53380d139d95b3dfn,
    0x650a73548baf63den,
    0x766a0abb3c77b2a8n,
    0x81c2c92e47edaee6n,
    0x92722c851482353bn,
    0xa2bfe8a14cf10364n,
    0xa81a664bbc423001n,
    0xc24b8b70d0f89791n,
    0xc76c51a30654be30n,
    0xd192e819d6ef5218n,
    0xd69906245565a910n,
    0xf40e35855771202an,
    0x106aa07032bbd1b8n,
    0x19a4c116b8d2d0c8n,
    0x1e376c085141ab53n,
    0x2748774cdf8eeb99n,
    0x34b0bcb5e19b48a8n,
    0x391c0cb3c5c95a63n,
    0x4ed8aa4ae3418acbn,
    0x5b9cca4f7763e373n,
    0x682e6ff3d6b2b8a3n,
    0x748f82ee5defb2fcn,
    0x78a5636f43172f60n,
    0x84c87814a1f0ab72n,
    0x8cc702081a6439ecn,
    0x90befffa23631e28n,
    0xa4506cebde82bde9n,
    0xbef9a3f7b2c67915n,
    0xc67178f2e372532bn,
    0xca273eceea26619cn,
    0xd186b8c721c0c207n,
    0xeada7dd6cde0eb1en,
    0xf57d4f7fee6ed178n,
    0x06f067aa72176fban,
    0x0a637dc5a2c898a6n,
    0x113f9804bef90daen,
    0x1b710b35131c471bn,
    0x28db77f523047d84n,
    0x32caab7b40c72493n,
    0x3c9ebe0a15c9bebcn,
    0x431d67c49c100d4cn,
    0x4cc5d4becb3e42b6n,
    0x597f299cfc657e2an,
    0x5fcb6fab3ad6faecn,
    0x6c44198c4a475817n,
  ],
  // initial hash values for SHA2-224 §5.3.2
  H224: [
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511,
    0x64f98fa7, 0xbefa4fa4,
  ],
  // initial hash values for SHA-256 §5.3.3
  H256: [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ],
  // initial hash values for SHA2-384 §5.3.4
  H384: [
    0xcbbb9d5dc1059ed8n,
    0x629a292a367cd507n,
    0x9159015a3070dd17n,
    0x152fecd8f70e5939n,
    0x67332667ffc00b31n,
    0x8eb44a8768581511n,
    0xdb0c2e0d64f98fa7n,
    0x47b5481dbefa4fa4n,
  ],
  // initial hash values for SHA2-512 §5.3.5
  H512: [
    0x6a09e667f3bcc908n,
    0xbb67ae8584caa73bn,
    0x3c6ef372fe94f82bn,
    0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n,
    0x9b05688c2b3e6c1fn,
    0x1f83d9abfb41bd6bn,
    0x5be0cd19137e2179n,
  ],
};

const SHA2 = {
  /**
   * Implementation of [NIST SHA-2](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
   * hash Function. Supports output lengths of 224, 256, 384, or 512 bits.
   *
   * Applies the SHA-3 hash function to a list of big-endian byte-sized {@link Field}
   * elements, flexible to handle varying output lengths (224, 256, 384, 512 bits) as specified.
   *
   * The function accepts {@link Bytes} as the input message, which is a type that
   * represents a static-length list of byte-sized field elements (range-checked
   * using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]` of `Uint8Array` to perform a hash
   * outside provable code.
   *
   * Produces an output of {@link Bytes} that conforms to the chosen bit length.
   * Both input and output bytes are big-endian.
   *
   * @param len - Desired output length in bits. Valid options: 224, 256, 384, 512.
   * @param message - Big-endian {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest224 = SHA2.hash(224, preimage);
   * let digest256 = SHA2.hash(256, preimage);
   * let digest384 = SHA2.hash(384, preimage);
   * let digest512 = SHA2.hash(512, preimage);
   * ```
   *
   */
  hash(length: 224 | 256 | 384 | 512, data: FlexibleBytes) {
    // Infer the type T based on the value of `length` (conditional type)
    type WordType = typeof length extends 224 | 256 ? UInt32 : UInt64;

    // preprocessing §6.2
    // padding the message $5.1.1 into blocks that are a multiple of 512
    let messageBlocks = padding<WordType>(data);

    let H = SHA2.initialState();
    const N = messageBlocks.length;

    for (let i = 0; i < N; i++) {
      const W = createMessageSchedule(messageBlocks[i]);
      H = compression(H, W);
    }

    // the working variables H[i] are 32 | 64 bit, however we want to decompose them into bytes to be more compatible
    return Bytes.from(H.map((x) => x.toBytesBE()).flat());
  },
  length: 224 | 256 | 384 | 512,
  compression,
  createMessageSchedule,
  padding,
  initialState<T extends UInt32 | UInt64>() {
    switch (SHA2.length) {
      case 224:
        return SHA2Constants.H224.map((x) => UInt32.from(x) as T);
      case 256:
        return SHA2Constants.H256.map((x) => UInt32.from(x) as T);
      case 384:
        return SHA2Constants.H384.map((x) => UInt64.from(x) as T);
      case 512:
        return SHA2Constants.H512.map((x) => UInt64.from(x) as T);
      default:
        throw new Error('Invalid hash length');
    }
  },
};

/**
 * Padding function for SHA2, as specified in §5.1.1, §5.1.2,
 *
 * @param data  The message to hash
 * @param is_short Whether this is a short SHA2 (SHA2-224 or SHA2-256) or not (SHA2-384 or SHA2-512)
 * @returns
 */
// The only difference between the padding used in SHA2-224/256 and SHA2-384/512
// is the size of the word (32bit vs 64bit). In the first case, UInt32[][] is
// returned, in the second case UInt64[][] is returned.
function padding<T extends UInt32 | UInt64>(data: FlexibleBytes): T[][] {
  // Using instance check to create the flag
  // isShort = true if the hash is SHA2-224 or SHA2-256
  // isShort = false if the hash is SHA2-384 or SHA2-512
  const isShort: boolean = ({} as T) instanceof UInt32;

  // create a provable Bytes instance from the input data
  // the Bytes class will be static sized according to the length of the input data
  let message = Bytes.from(data);

  // Whether this is a short SHA2 (SHA2-224 or SHA2-256) or not (SHA2-384 or SHA2-512)
  const blockLength = isShort
    ? SHA2Constants.BLOCK_LENGTH_224_256
    : SHA2Constants.BLOCK_LENGTH_384_512;

  const paddingValue = isShort
    ? SHA2Constants.PADDING_VALUE_224_256
    : SHA2Constants.PADDING_VALUE_384_512;

  const lengthChunk = isShort
    ? SHA2Constants.LENGTH_CHUNK_224_256
    : SHA2Constants.LENGTH_CHUNK_384_512;

  // now pad the data to reach the format expected by SHA2
  // pad 1 bit, followed by k zero bits where k is the smallest non-negative solution to
  // l + 1 + k = (448 | 896) mod (512 | 1024)
  // then append a (64 | 128)-bit block containing the length of the original message in bits
  // it holds that PADDING_VALUE = BLOCK_LENGTH - LENGTH_CHUNK
  // this way the padded message will be a multiple of the BLOCK_LENGTH

  let l = message.length * 8; // length in bits
  let k = Number(mod(paddingValue - (BigInt(l) + 1n), blockLength));

  let lBinary = l.toString(2);

  let paddingBits = (
    '1' + // append 1 bit
    '0'.repeat(k) + // append k zero bits
    '0'.repeat(lengthChunk - lBinary.length) + // append 64|128-bit containing the length of the original message
    lBinary
  ).match(/.{1,8}/g)!; // this should always be divisible by 8

  // map the padding bit string to UInt8 elements
  let padding = paddingBits.map((x) => UInt8.from(BigInt('0b' + x)));

  // concatenate the padding with the original padded data
  let paddedMessage = message.bytes.concat(padding);

  // Create chunks based on whether we are dealing with SHA2-224/256 or SHA2-384/512
  // split the message into (32 | 64)-bit chunks
  let chunks = isShort
    ? createChunks(paddedMessage, 4, UInt32.fromBytesBE)
    : createChunks(paddedMessage, 8, UInt64.fromBytesBE);

  // SHA2-224 and SHA2-256 | SHA2-384 and SHA2-512:
  // split the message into 16 elements of 32 | 64 bits, what gives a block of 512 | 1024 bits
  return chunk(chunks as T[], 16);
}

// Helper function to create chunks based on the size and type (UInt32 or UInt64)
function createChunks(
  paddedMessage: UInt8[],
  byteSize: number,
  fromBytes: Function
): UInt32[] | UInt64[] {
  let chunks: any[] = [];
  // bytesToWord expects little endian, so we reverse the bytes
  for (let i = 0; i < paddedMessage.length; i += byteSize) {
    // Chunk the data based on the specified byte size (4 bytes for UInt32, 8 bytes for UInt64)
    chunks.push(fromBytes(paddedMessage.slice(i, i + byteSize)));
  }
  return chunks;
}

/**
 * Prepares the message schedule for the SHA2 compression function from the given message block.
 * §6.2.2.1 and §6.4.2.1
 *
 * @param M - The 512-bit message block (16-element array of UInt32)
 *            or the 1024-bit message block (16-element array of UInt64).
 * @returns The message schedule (64-element array of UInt32 or 80-element array of UInt64).
 */
function createMessageSchedule<T extends UInt32 | UInt64>(M: T[]): T[] {
  // Declare W as an empty array of type T[] (generic array)
  const W: T[] = [];

  // Using instance check to create the flag
  // isShort = true if the hash is SHA2-224 or SHA2-256
  // isShort = false if the hash is SHA2-384 or SHA2-512
  const isShort: boolean = ({} as T) instanceof UInt32;

  // for each message block of 16 x 32bit | 64bit do:

  let scheduleWords = isShort
    ? SHA2Constants.SCHEDULE_WORDS_224_256
    : SHA2Constants.SCHEDULE_WORDS_384_512;

  // prepare message block
  for (let t = 0; t <= 15; t++) W[t] = M[t];
  for (let t = 16; t < scheduleWords; t++) {
    // the field element is unreduced and not proven to be 32bit | 64bit,
    // we will do this later to save constraints
    let unreduced = DeltaOne(W[t - 2])
      .value.add(W[t - 7].value)
      .add(DeltaZero(W[t - 15]).value.add(W[t - 16].value));

    // mod 32 | 64 bit the unreduced field element
    if (isShort) {
      W[t] = UInt32.Unsafe.fromField(divMod32(unreduced, 48).remainder) as T;
    } else {
      W[t] = UInt64.Unsafe.fromField(divMod64(unreduced).remainder) as T;
    }
  }

  return W;
}

/**
 * Performs the SHA-2 compression function on the given hash values and message schedule.
 *
 * @param H - The initial or intermediate hash values (8-element array of T).
 * @param W - The message schedule (64-element array of T).
 *
 * @returns The updated intermediate hash values after compression.
 */
function compression<T extends UInt32 | UInt64>([...H]: T[], W: T[]) {
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
    // T1 is unreduced and not proven to be 32bit, we will do this later to save constraints
    const unreducedT1 = h.value
      .add(SigmaOne(e).value)
      .add(Ch(e, f, g).value)
      .add(SHA256Constants.K[t])
      .add(W[t].value)
      .seal();

    // T2 is also unreduced
    const unreducedT2 = SigmaZero(a).value.add(Maj(a, b, c).value);

    h = g;
    g = f;
    f = e;
    e = UInt32.Unsafe.fromField(
      divMod32(d.value.add(unreducedT1), 48).remainder
    ); // mod 32bit the unreduced field element
    d = c;
    c = b;
    b = a;
    a = UInt32.Unsafe.fromField(
      divMod32(unreducedT2.add(unreducedT1), 48).remainder
    ); // mod 32bit
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

  return H;
}

// Subroutines for SHA2

function Ch<T extends UInt32 | UInt64>(x: T, y: T, z: T) {
  // ch(x, y, z) = (x & y) ^ (~x & z)
  //             = (x & y) + (~x & z) (since x & ~x = 0)
  let xAndY = x.and(y).value;
  let xNotAndZ = x.not().and(z).value;
  let ch = xAndY.add(xNotAndZ).seal();
  return UInt32.Unsafe.fromField(ch);
}

function Maj<T extends UInt32 | UInt64>(x: T, y: T, z: T) {
  // maj(x, y, z) = (x & y) ^ (x & z) ^ (y & z)
  //              = (x + y + z - (x ^ y ^ z)) / 2
  let sum = x.value.add(y.value).add(z.value).seal();
  let xor = x.xor(y).xor(z).value;
  let maj = sum.sub(xor).div(2).seal();
  return UInt32.Unsafe.fromField(maj);
}

function SigmaZero<T extends UInt32 | UInt64>(x: T) {
  return sigma(x, [2, 13, 22]);
}

function SigmaOne<T extends UInt32 | UInt64>(x: T) {
  return sigma(x, [6, 11, 25]);
}

// lowercase sigma = delta to avoid confusing function names

function DeltaZero<T extends UInt32 | UInt64>(x: T) {
  return sigma(x, [3, 7, 18], true);
}

function DeltaOne<T extends UInt32 | UInt64>(x: T) {
  return sigma(x, [10, 17, 19], true);
}

function ROTR<T extends UInt32 | UInt64>(n: number, x: T) {
  return x.rotate(n, 'right');
}

function SHR<T extends UInt32 | UInt64>(n: number, x: T) {
  let val = x.rightShift(n);
  return val;
}

function sigmaSimple<T extends UInt32 | UInt64>(
  u: T,
  bits: TupleN<number, 3>,
  firstShifted = false
) {
  let [r0, r1, r2] = bits;
  let rot0 = firstShifted ? SHR(r0, u) : ROTR(r0, u);
  let rot1 = ROTR(r1, u);
  let rot2 = ROTR(r2, u);
  return rot0.xor(rot1).xor(rot2);
}

function sigma<T extends UInt32 | UInt64>(
  u: T,
  bits: TupleN<number, 3>,
  firstShifted = false
) {
  if (u.isConstant()) return sigmaSimple(u, bits, firstShifted);

  let [r0, r1, r2] = bits; // TODO assert bits are sorted
  let x = u.value;

  let d0 = r0;
  let d1 = r1 - r0;
  let d2 = r2 - r1;
  let d3 = 32 - r2;

  // decompose x into 4 chunks of size d0, d1, d2, d3
  let [x0, x1, x2, x3] = exists(4, () => {
    let xx = x.toBigInt();
    return [
      bitSlice(xx, 0, d0),
      bitSlice(xx, r0, d1),
      bitSlice(xx, r1, d2),
      bitSlice(xx, r2, d3),
    ];
  });

  // range check each chunk
  // we only need to range check to 16 bits relying on the requirement that
  // the rotated values are range-checked to 32 bits later; see comments below
  rangeCheck16(x0);
  rangeCheck16(x1);
  rangeCheck16(x2);
  rangeCheck16(x3);

  // prove x decomposition

  // x === x0 + x1*2^d0 + x2*2^(d0+d1) + x3*2^(d0+d1+d2)
  let x23 = x2.add(x3.mul(1 << d2)).seal();
  let x123 = x1.add(x23.mul(1 << d1)).seal();
  x0.add(x123.mul(1 << d0)).assertEquals(x);
  // ^ proves that 2^(32-d3)*x3 < x < 2^32 => x3 < 2^d3

  // reassemble chunks into rotated values

  let xRotR0: Field;

  if (!firstShifted) {
    // rotr(x, r0) = x1 + x2*2^d1 + x3*2^(d1+d2) + x0*2^(d1+d2+d3)
    xRotR0 = x123.add(x0.mul(1 << (d1 + d2 + d3))).seal();
    // ^ proves that 2^(32-d0)*x0 < xRotR0 => x0 < 2^d0 if we check xRotR0 < 2^32 later
  } else {
    // shr(x, r0) = x1 + x2*2^d1 + x3*2^(d1+d2)
    xRotR0 = x123;

    // finish x0 < 2^d0 proof:
    rangeCheck16(x0.mul(1 << (16 - d0)).seal());
  }

  // rotr(x, r1) = x2 + x3*2^d2 + x0*2^(d2+d3) + x1*2^(d2+d3+d0)
  let x01 = x0.add(x1.mul(1 << d0)).seal();
  let xRotR1 = x23.add(x01.mul(1 << (d2 + d3))).seal();
  // ^ proves that 2^(32-d1)*x1 < xRotR1 => x1 < 2^d1 if we check xRotR1 < 2^32 later

  // rotr(x, r2) = x3 + x0*2^d3 + x1*2^(d3+d0) + x2*2^(d3+d0+d1)
  let x012 = x01.add(x2.mul(1 << (d0 + d1))).seal();
  let xRotR2 = x3.add(x012.mul(1 << d3)).seal();
  // ^ proves that 2^(32-d2)*x2 < xRotR2 => x2 < 2^d2 if we check xRotR2 < 2^32 later

  // since xor() is implicitly range-checking both of its inputs, this provides the missing
  // proof that xRotR0, xRotR1, xRotR2 < 2^32, which implies x0 < 2^d0, x1 < 2^d1, x2 < 2^d2
  return UInt32.Unsafe.fromField(xRotR0)
    .xor(UInt32.Unsafe.fromField(xRotR1))
    .xor(UInt32.Unsafe.fromField(xRotR2));
}
