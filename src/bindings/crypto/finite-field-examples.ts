/**
 * This file contains some examples of finite fields, to be used for tests
 */
import { Fp, Fq, createField } from './finite-field.js';

export { exampleFields };

// some primes
let pSmall = 101n;
let pBabybear = (1n << 31n) - 1n;
let pGoldilocks = (1n << 64n) - (1n << 32n) + 1n;
let p25519 = (1n << 255n) - 19n;
let pSecp256k1 = (1n << 256n) - (1n << 32n) - 0b1111010001n;
let pSecq256k1 = (1n << 256n) - 0x14551231950b75fc4402da1732fc9bebfn;
let pBls12_377 =
  0x01ae3a4617c510eac63b05c06ca1493b1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c00000000001n;
let qBls12_377 =
  0x12ab655e9a2ca55660b44d1e5c37b00159aa76fed00000010a11800000000001n;
let pBls12_381 =
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
let qBls12_381 =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

let exampleFields = {
  Fp,
  Fq,
  small: createField(pSmall),
  babybear: createField(pBabybear),
  goldilocks: createField(pGoldilocks),
  f25519: createField(p25519),
  secp256k1: createField(pSecp256k1),
  secq256k1: createField(pSecq256k1),
  secp256r1:
    createField(
      0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn
    ),
  bls12_377_base: createField(pBls12_377),
  bls12_377_scalar: createField(qBls12_377),
  bls12_381_base: createField(pBls12_381),
  bls12_381_scalar: createField(qBls12_381),
};
