import { mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../wrapped.js';
import { UInt32, UInt64, UInt8 } from '../int.js';
import { exists } from '../core/exists.js';
import { FlexibleBytes } from '../bytes.js';
import { Bytes } from '../wrapped-classes.js';
import { chunk } from '../../util/arrays.js';
import { TupleN } from '../../util/types.js';
import { divMod32, divMod64 } from './arithmetic.js';
import { bitSlice } from './common.js';
import { rangeCheck16 } from './range-check.js';

export { SHA2 };

// constants for SHA2-224 and SHA2-256 §4.2.2
const K224_256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// constants for SHA2-384 and SHA2-512 §4.2.3
// prettier-ignore
const K384_512 = [
    0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
    0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
    0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
    0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
    0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
    0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
    0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
    0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
    0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
    0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
    0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
    0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
    0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
    0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
    0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
    0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
    0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
    0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
    0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
    0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
  ];

type Length = 224 | 256 | 384 | 512;

// SHA2 CONSTANTS
const SHA2Constants = {
  // Bit length of the blocks
  BLOCK_LENGTH: {
    // SHA2-224 and SHA2-256
    224: 512n,
    256: 512n,
    // SHA2-384 and SHA2-512
    384: 1024n,
    512: 1024n,
  },

  // Value used in the padding equation
  PADDING_VALUE: {
    // SHA2-224 and SHA2-256
    224: 448n,
    256: 448n,
    // SHA2-384 and SHA2-512
    384: 896n,
    512: 896n,
  },

  // Bits used to store the length in the padding
  // It corresponds to BLOCK_LENGTH - PADDING_VALUE
  LENGTH_CHUNK: {
    // SHA2-224 and SHA2-256
    224: 64,
    256: 64,
    // SHA2-384 and SHA2-512
    384: 128,
    512: 128,
  },

  // Number of words in message schedule and compression
  NUM_WORDS: {
    // SHA2-224 and SHA2-256
    224: 64n,
    256: 64n,
    // SHA2-384 and SHA2-512
    384: 80n,
    512: 80n,
  },

  // Offsets for the DeltaZero function
  DELTA_ZERO: {
    // SHA2-224 and SHA2-256: §4.1.2 eq.4.6
    224: [3, 7, 18] as TupleN<number, 3>,
    256: [3, 7, 18] as TupleN<number, 3>,
    // SHA2-384 and SHA2-512: §4.1.3 eq.4.12
    384: [7, 8, 1] as TupleN<number, 3>,
    512: [7, 8, 1] as TupleN<number, 3>,
  },

  // Offsets for the DeltaOne function
  DELTA_ONE: {
    // SHA2-224 and SHA2-256: §4.1.2 eq.4.7
    224: [10, 17, 19] as TupleN<number, 3>,
    256: [10, 17, 19] as TupleN<number, 3>,
    // - SHA2-384 and SHA2-512: §4.1.3 eq.4.13
    384: [6, 19, 61] as TupleN<number, 3>,
    512: [6, 19, 61] as TupleN<number, 3>,
  },

  // Offsets for the SigmaZero function
  SIGMA_ZERO: {
    // SHA2-224 and SHA2-256: §4.1.2 eq.4.4
    224: [2, 13, 22] as TupleN<number, 3>,
    256: [2, 13, 22] as TupleN<number, 3>,
    // SHA2-384 and SHA2-512: §4.1.3 eq.4.10
    384: [28, 34, 39] as TupleN<number, 3>,
    512: [28, 34, 39] as TupleN<number, 3>,
  },

  // Offsets for the SigmaOne function for SHA2.
  SIGMA_ONE: {
    // SHA2-224 and SHA2-256: §4.1.2 eq.4.5
    224: [6, 11, 25] as TupleN<number, 3>,
    256: [6, 11, 25] as TupleN<number, 3>,
    // SHA2-384 and SHA2-512: §4.1.3 eq.4.11
    384: [14, 18, 41] as TupleN<number, 3>,
    512: [14, 18, 41] as TupleN<number, 3>,
  },

  // Initia hash values
  H: {
    // SHA2-224 §5.3.2
    224: [
      0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7,
      0xbefa4fa4,
    ],
    // SHA-256 §5.3.3
    256: [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
      0x5be0cd19,
    ],
    // SHA2-384 §5.3.4
    384: [
      0xcbbb9d5dc1059ed8n,
      0x629a292a367cd507n,
      0x9159015a3070dd17n,
      0x152fecd8f70e5939n,
      0x67332667ffc00b31n,
      0x8eb44a8768581511n,
      0xdb0c2e0d64f98fa7n,
      0x47b5481dbefa4fa4n,
    ],
    // SHA2-512 §5.3.5
    512: [
      0x6a09e667f3bcc908n,
      0xbb67ae8584caa73bn,
      0x3c6ef372fe94f82bn,
      0xa54ff53a5f1d36f1n,
      0x510e527fade682d1n,
      0x9b05688c2b3e6c1fn,
      0x1f83d9abfb41bd6bn,
      0x5be0cd19137e2179n,
    ],
  },

  K: {
    224: K224_256,
    256: K224_256,
    384: K384_512,
    512: K384_512,
  },
};

const SHA2 = {
  /**
   * Implementation of [NIST SHA-2](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
   * hash Function. Supports output lengths of 224, 256, 384, or 512 bits.
   *
   * Applies the SHA-2 hash function to a list of big-endian byte-sized {@link Field}
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
  hash<T extends Length>(length: T, data: FlexibleBytes): Bytes {
    // Infer the type T based on the value of `length` (conditional type)
    type Type = T extends 224 | 256 ? UInt32 : UInt64;

    // preprocessing §6.2
    // padding the message $5.1.1 into blocks that are a multiple of 512
    let messageBlocks = padding<Type>(length, data);

    let H = SHA2.initialState<Type>(length);

    const N = messageBlocks.length;

    for (let i = 0; i < N; i++) {
      const W = messageSchedule(length, messageBlocks[i]);
      H = compression(length, H, W);
    }

    // the working variables H[i] are 32 | 64 bit, however we want to decompose
    // them into bytes to be more compatible
    let digest = Bytes.from(H.map((x) => x.toBytesBE()).flat());

    // Take the first `length` bits of the digest. This has no effect in
    // SHA256 and SHA512, because 8 words of 32 | 64 bits needs no truncation.
    // Truncation is required for SHA224 and SHA384 though.
    digest.bytes = digest.bytes.slice(0, length / 8);

    return digest;
  },
  compression,
  messageSchedule,
  padding,
  initialState<T extends UInt32 | UInt64>(length: Length): T[] {
    return SHA2Constants.H[length].map((x) =>
      isUInt32(length) ? (UInt32.from(x) as T) : (UInt64.from(x) as T)
    );
  },
};

/**
 * Padding function for SHA2, as specified in §5.1.1, §5.1.2,
 *
 * @param data  The message to hash
 * @param length Whether this is a SHA2-224 or SHA2-256 or SHA2-384 or SHA2-512
 * @returns
 */
// The only difference between the padding used in SHA2-224/256 and SHA2-384/512
// is the size of the word (32bit vs 64bit). In the first case, UInt32[][] is
// returned, in the second case UInt64[][] is returned.
function padding<T extends UInt32 | UInt64>(length: Length, data: FlexibleBytes): T[][] {
  // create a provable Bytes instance from the input data
  // the Bytes class will be static sized according to the length of the input data
  let message = Bytes.from(data);

  const blockLength = SHA2Constants.BLOCK_LENGTH[length];
  const paddingValue = SHA2Constants.PADDING_VALUE[length];
  const lengthChunk = SHA2Constants.LENGTH_CHUNK[length];

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
  let chunks = isUInt32(length)
    ? createChunks(paddedMessage, 4, UInt32.fromBytesBE)
    : createChunks(paddedMessage, 8, UInt64.fromBytesBE);

  // SHA2-224 and SHA2-256 | SHA2-384 and SHA2-512:
  // split the message into 16 elements of 32 | 64 bits, what gives a block of 512 | 1024 bits
  return chunk(chunks as T[], 16);
}

/**
 * Prepares the message schedule for the SHA2 compression function from the given message block.
 *
 * @param length Whether this is a SHA2-224 or SHA2-256 or SHA2-384 or SHA2-512
 * @param M - The 512-bit message block (16-element array of UInt32)
 *            or the 1024-bit message block (16-element array of UInt64).
 * @returns The message schedule (64-element array of UInt32 or 80-element array of UInt64).
 */
function messageSchedule<T extends UInt32 | UInt64>(length: Length, M: T[]): T[] {
  // §6.2.2.1 and §6.4.2.1

  // Declare W as an empty array of type T[] (generic array)
  const W: T[] = [];

  // for each message block of 16 x 32bit | 64bit do:

  let numWords = SHA2Constants.NUM_WORDS[length];

  // prepare message block
  for (let t = 0; t < 16; t++) W[t] = M[t];
  for (let t = 16; t < numWords; t++) {
    // the field element is unreduced and not proven to be 32bit | 64bit,
    // we will do this later to save constraints
    let unreduced = DeltaOne(length, W[t - 2])
      .value.add(W[t - 7].value)
      .add(DeltaZero(length, W[t - 15]).value.add(W[t - 16].value));

    // mod 32 | 64 bit the unreduced field element
    W[t] = reduceMod(length, unreduced);
  }

  return W;
}

/**
 * Performs the SHA-2 compression function on the given hash values and message schedule.
 *
 * @param length Whether this is a SHA2-224 or SHA2-256 or SHA2-384 or SHA2-512
 * @param H - The initial or intermediate hash values (8-element array of T).
 * @param W - The message schedule (64-element array of T).
 *
 * @returns The updated intermediate hash values after compression.
 */
function compression<T extends UInt32 | UInt64>(length: Length, [...H]: T[], W: T[]) {
  let numWords = SHA2Constants.NUM_WORDS[length];

  let k = SHA2Constants.K[length];

  // §6.2.2.2 and §6.4.2.2:
  // initialize working variables
  let a = H[0];
  let b = H[1];
  let c = H[2];
  let d = H[3];
  let e = H[4];
  let f = H[5];
  let g = H[6];
  let h = H[7];

  // §6.2.2.3 and §6.4.2.3:
  // main loop
  for (let t = 0; t < numWords; t++) {
    // T1 is unreduced and not proven to be 32 | 64 bit,
    // we will do this later to save constraints
    const unreducedT1 = h.value
      .add(SigmaOne(length, e).value)
      .add(Ch(length, e, f, g).value)
      .add(k[t])
      .add(W[t].value)
      .seal();

    // T2 is also unreduced
    const unreducedT2 = SigmaZero(length, a).value.add(Maj(length, a, b, c).value);

    h = g;
    g = f;
    f = e;
    e = reduceMod(length, d.value.add(unreducedT1));
    // mod 32 | 64 bit the unreduced field element
    d = c;
    c = b;
    b = a;
    a = reduceMod(length, unreducedT2.add(unreducedT1));
    // mod 32 | 64 bit
  }

  // §6.2.2.4 and §6.4.2.4
  // new intermediate hash value
  intermediateHash(length, [a, b, c, d, e, f, g, h], H);

  return H;
}

// Helper functions

// Helper function to check if the hash uses words of 32 or 64 bits
function isUInt32(length: Length): length is 224 | 256 {
  return length === 224 || length === 256;
}

// Shorthand to reduce a field element modulo 32 or 64 bits depending on T
function reduceMod<T extends UInt32 | UInt64>(length: Length, x: Field): T {
  return isUInt32(length)
    ? (UInt32.Unsafe.fromField(divMod32(x, 32 + 16).remainder) as T)
    : (UInt64.Unsafe.fromField(divMod64(x, 64 + 16).remainder) as T);
}

// Helper function to create chunks based on the size and type (UInt32 or UInt64)
function createChunks<T extends UInt32 | UInt64>(
  paddedMessage: UInt8[],
  byteSize: number,
  fromBytes: Function
): T[] {
  let chunks: any[] = [];
  // bytesToWord expects little endian, so we reverse the bytes
  for (let i = 0; i < paddedMessage.length; i += byteSize) {
    // Chunk the data based on the specified byte size (4 bytes for UInt32, 8 bytes for UInt64)
    chunks.push(fromBytes(paddedMessage.slice(i, i + byteSize)));
  }
  return chunks;
}

function intermediateHash<T extends UInt32 | UInt64>(length: Length, variables: T[], H: T[]) {
  const addMod = isUInt32(length)
    ? (x: UInt32, y: UInt32) => x.addMod32(y)
    : (x: UInt64, y: UInt64) => x.addMod64(y);
  for (let i = 0; i < 8; i++) {
    H[i] = addMod(variables[i] as any, H[i] as any) as T;
  }
}

// Subroutines for SHA2

function Ch<T extends UInt32 | UInt64>(length: Length, x: T, y: T, z: T): T {
  // ch(x, y, z) = (x & y) ^ (~x & z)
  //             = (x & y) + (~x & z) (since x & ~x = 0)
  if (isUInt32(length)) {
    let xAndY = (x as UInt32).and(y as UInt32).value;
    let xNotAndZ = (x as UInt32).not().and(z as UInt32).value;
    let ch = xAndY.add(xNotAndZ).seal();
    return UInt32.Unsafe.fromField(ch) as T;
  } else {
    let xAndY = (x as UInt64).and(y as UInt64).value;
    let xNotAndZ = (x as UInt64).not().and(z as UInt64).value;
    let ch = xAndY.add(xNotAndZ).seal();
    return UInt64.Unsafe.fromField(ch) as T;
  }
}

function Maj<T extends UInt32 | UInt64>(length: Length, x: T, y: T, z: T): T {
  // maj(x, y, z) = (x & y) ^ (x & z) ^ (y & z)
  //              = (x + y + z - (x ^ y ^ z)) / 2
  if (isUInt32(length)) {
    let sum = (x as UInt32).value.add(y.value).add(z.value).seal();
    let xor = (x as UInt32).xor(y as UInt32).xor(z as UInt32).value;
    let maj = sum.sub(xor).div(2).seal();
    return UInt32.Unsafe.fromField(maj) as T;
  } else {
    let sum = (x as UInt64).value.add(y.value).add(z.value).seal();
    let xor = (x as UInt64).xor(y as UInt64).xor(z as UInt64).value;
    let maj = sum.sub(xor).div(2).seal();
    return UInt64.Unsafe.fromField(maj) as T;
  }
}

function SigmaZero<T extends UInt32 | UInt64>(length: Length, x: T): T {
  return sigma(length, x, SHA2Constants.SIGMA_ZERO[length]);
}

function SigmaOne<T extends UInt32 | UInt64>(length: Length, x: T): T {
  return sigma(length, x, SHA2Constants.SIGMA_ONE[length]);
}

// lowercase sigma = delta to avoid confusing function names

function DeltaZero<T extends UInt32 | UInt64>(length: Length, x: T): T {
  return sigma(length, x, SHA2Constants.DELTA_ZERO[length], true) as T;
}

function DeltaOne<T extends UInt32 | UInt64>(length: Length, x: T): T {
  return sigma(length, x, SHA2Constants.DELTA_ONE[length], true) as T;
}

function ROTR<T extends UInt32 | UInt64>(n: number, x: T): T {
  return x.rotate(n, 'right') as T;
}

function SHR<T extends UInt32 | UInt64>(n: number, x: T): T {
  return x.rightShift(n) as T;
}

function sigmaSimple<T extends UInt32 | UInt64>(
  length: Length,
  u: T,
  bits: TupleN<number, 3>,
  firstShifted = false
): T {
  let [r0, r1, r2] = bits;
  if (isUInt32(length)) {
    let rot0 = firstShifted ? (SHR(r0, u) as UInt32) : (ROTR(r0, u) as UInt32);
    let rot1 = ROTR(r1, u) as UInt32;
    let rot2 = ROTR(r2, u) as UInt32;
    return rot0.xor(rot1).xor(rot2) as T;
  } else {
    let rot0 = firstShifted ? (SHR(r0, u) as UInt64) : (ROTR(r0, u) as UInt64);
    let rot1 = ROTR(r1, u) as UInt64;
    let rot2 = ROTR(r2, u) as UInt64;
    return rot0.xor(rot1).xor(rot2) as T;
  }
}

function sigma<T extends UInt32 | UInt64>(
  length: Length,
  u: T,
  bits: TupleN<number, 3>,
  firstShifted = false
): T {
  if (u.isConstant() || !isUInt32(length)) return sigmaSimple(length, u, bits, firstShifted);

  // When T is UInt64, 64-bit rotation is natively supported in the gadgets.
  // However, 32-bit rotation is not natively supported, thus the following:

  let [r0, r1, r2] = bits; // TODO assert bits are sorted
  let x = u.value;

  let d0 = r0;
  let d1 = r1 - r0;
  let d2 = r2 - r1;
  let d3 = 32 - r2;

  // decompose x into 4 chunks of size d0, d1, d2, d3
  let [x0, x1, x2, x3] = exists(4, () => {
    let xx = x.toBigInt();
    return [bitSlice(xx, 0, d0), bitSlice(xx, r0, d1), bitSlice(xx, r1, d2), bitSlice(xx, r2, d3)];
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
    .xor(UInt32.Unsafe.fromField(xRotR2)) as T;
}
