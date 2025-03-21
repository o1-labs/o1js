import { createProvableBigInt } from '../bigint.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import { bls12_381 } from '@noble/curves/bls12-381';
import { secp521r1 } from '@noble/curves/p521';

import {
  equivalentProvable as equivalent,
  spec,
  throwError,
  unit,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { ProvablePure } from '../types/provable-intf.js';

class SmallField extends createProvableBigInt(17n) {}

let x = SmallField.fromBigInt(16n);
let y = SmallField.fromBigInt(-1n);
let z = SmallField.fromBigInt(1n);

x.assertEquals(y); // 16 = -1 (mod 17)
x.mul(x).assertEquals(z); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

class BigInt255 extends createProvableBigInt(Fq.modulus) {}

BigInt255.provable satisfies ProvablePure<BigInt255>;

let fq = spec({
  rng: Random.scalar,
  there: BigInt255.fromBigInt,
  back: (x: BigInt255) => x.toBigInt(),
  provable: BigInt255.provable,
});
let u255 = spec({
  rng: Random.bignat(1n << 255n),
  there: BigInt255.fromBigInt,
  back: (x: BigInt255) => x.toBigInt(),
  provable: BigInt255.provable,
});

// arithmetic
equivalent({ from: [fq, fq], to: u255 })(Fq.add, (x, y) => x.add(y));
equivalent({ from: [fq], to: u255 })(
  (x) => Fq.add(x, x),
  (x) => x.double()
);
equivalent({ from: [fq, fq], to: u255 })(Fq.sub, (x, y) => x.sub(y));
equivalent({ from: [fq, fq], to: u255 })(Fq.mul, (x, y) => x.mul(y));
equivalent({ from: [fq], to: u255 })(Fq.square, (x) => x.square());
equivalent({ from: [fq, fq], to: fq })(
  (x, y) => Fq.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);
equivalent({ from: [fq], to: fq })(
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  (x) => x.inverse()
);
equivalent({ from: [fq], to: u255 })(Fq.negate, (x) => x.negate());
equivalent({ from: [fq, fq], to: u255 })(Fq.power, (x, y) => x.pow(y));
equivalent({ from: [fq], to: u255 })(
  (x) => Fq.sqrt(x) ?? throwError(),
  (x) => x.sqrt()
);
// comparison
equivalent({ from: [fq, fq], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);

const bls_Fp = bls12_381.fields.Fp;
class BigInt381 extends createProvableBigInt(bls_Fp.ORDER) {}

BigInt381.provable satisfies ProvablePure<BigInt381>;

let blsp = spec({
  rng: Random.scalar,
  there: BigInt381.fromBigInt,
  back: (x: BigInt381) => x.toBigInt(),
  provable: BigInt381.provable,
});
let u381 = spec({
  rng: Random.bignat(1n << 381n),
  there: BigInt381.fromBigInt,
  back: (x: BigInt381) => x.toBigInt(),
  provable: BigInt381.provable,
});

// arithmetic
equivalent({ from: [blsp, blsp], to: u381 })(bls_Fp.add, (x, y) => x.add(y));
equivalent({ from: [blsp], to: u381 })(
  (x) => bls_Fp.add(x, x),
  (x) => x.double()
);
equivalent({ from: [blsp, blsp], to: u381 })(bls_Fp.sub, (x, y) => x.sub(y));
equivalent({ from: [blsp, blsp], to: u381 })(bls_Fp.mul, (x, y) => x.mul(y));
equivalent({ from: [blsp], to: u381 })(bls_Fp.sqr, (x) => x.square());
equivalent({ from: [blsp, blsp], to: blsp })(
  (x, y) => bls_Fp.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);
equivalent({ from: [blsp], to: blsp })(
  (x) => bls_Fp.inv(x) ?? throwError('division by 0'),
  (x) => x.inverse()
);
equivalent({ from: [blsp], to: u381 })(bls_Fp.neg, (x) => x.negate());
equivalent({ from: [blsp, blsp], to: u381 })(bls_Fp.pow, (x, y) => x.pow(y));
equivalent({ from: [blsp], to: u381 })(
  (x) => bls_Fp.sqrt(x) ?? throwError(),
  (x) => x.sqrt()
);
// comparison
equivalent({ from: [blsp, blsp], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);

const secp521r1_Fp = secp521r1.CURVE.Fp;
class BigInt521 extends createProvableBigInt(secp521r1_Fp.ORDER) {}

BigInt521.provable satisfies ProvablePure<BigInt521>;

let sfp = spec({
  rng: Random.scalar,
  there: BigInt521.fromBigInt,
  back: (x: BigInt521) => x.toBigInt(),
  provable: BigInt521.provable,
});
let u521 = spec({
  rng: Random.bignat(1n << 521n),
  there: BigInt521.fromBigInt,
  back: (x: BigInt521) => x.toBigInt(),
  provable: BigInt521.provable,
});

// arithmetic
equivalent({ from: [sfp, sfp], to: u521 })(secp521r1_Fp.add, (x, y) => x.add(y));
equivalent({ from: [sfp], to: u521 })(
  (x) => secp521r1_Fp.add(x, x),
  (x) => x.double()
);
equivalent({ from: [sfp, sfp], to: u521 })(secp521r1_Fp.sub, (x, y) => x.sub(y));
equivalent({ from: [sfp, sfp], to: u521 })(secp521r1_Fp.mul, (x, y) => x.mul(y));
equivalent({ from: [sfp], to: u521 })(secp521r1_Fp.sqr, (x) => x.square());
equivalent({ from: [sfp, sfp], to: sfp })(
  (x, y) => secp521r1_Fp.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);
equivalent({ from: [sfp], to: sfp })(
  (x) => secp521r1_Fp.inv(x) ?? throwError('division by 0'),
  (x) => x.inverse()
);
equivalent({ from: [sfp], to: u521 })(secp521r1_Fp.neg, (x) => x.negate());
equivalent({ from: [sfp, sfp], to: u521 })(secp521r1_Fp.pow, (x, y) => x.pow(y));
equivalent({ from: [sfp], to: u521 })(
  (x) => secp521r1_Fp.sqrt(x) ?? throwError(),
  (x) => x.sqrt()
);
// comparison
equivalent({ from: [sfp, sfp], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);
