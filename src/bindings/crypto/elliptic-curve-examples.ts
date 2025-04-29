import { CurveParams, Pallas, Vesta } from './elliptic-curve.js';
import { exampleFields } from './finite-field-examples.js';

export { CurveParams };

const secp256k1Params: CurveParams = {
  name: 'secp256k1',
  modulus: exampleFields.secp256k1.modulus,
  order: exampleFields.secq256k1.modulus,
  a: 0n,
  b: 7n,
  generator: {
    x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
  },
};

const secp256r1Params: CurveParams = {
  name: 'secp256r1',
  modulus: exampleFields.secp256r1.modulus,
  order: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
  a: 0xffffffff00000001000000000000000000000000fffffffffffffffffffffffcn,
  b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
  generator: {
    x: 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
    y: 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n,
  },
};

const pallasParams: CurveParams = {
  name: 'Pallas',
  modulus: Pallas.modulus,
  order: Pallas.order,
  a: Pallas.a,
  b: Pallas.b,
  generator: Pallas.one,
  endoBase: Pallas.endoBase,
  endoScalar: Pallas.endoScalar,
};

const vestaParams: CurveParams = {
  name: 'Vesta',
  modulus: Vesta.modulus,
  order: Vesta.order,
  a: Vesta.a,
  b: Vesta.b,
  generator: Vesta.one,
  endoBase: Vesta.endoBase,
  endoScalar: Vesta.endoScalar,
};

const CurveParams = {
  Secp256k1: secp256k1Params,
  Secp256r1: secp256r1Params,
  Pallas: pallasParams,
  Vesta: vestaParams,
};
