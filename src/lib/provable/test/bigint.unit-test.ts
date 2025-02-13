import { createProvableBigInt } from '../bigint.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import {
  equivalentProvable as equivalent,
  spec,
  throwError,
  unit,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { ProvablePure } from '../types/provable-intf.js';

// 17, base field, bls , 521 bit, rsa
class SmallField extends createProvableBigInt(17n) {}

let x = SmallField.fromBigint(16n);
let y = SmallField.fromBigint(-1n);
let z = SmallField.fromBigint(1n);

x.assertEquals(y); // 16 = -1 (mod 17)
x.mul(x).assertEquals(z); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)


class ForeignScalar extends createProvableBigInt(Fq.modulus) {}

ForeignScalar.provable satisfies ProvablePure<ForeignScalar>;


let f = spec({
  rng: Random.scalar,
  there: ForeignScalar.fromBigint,
  back: (x: ForeignScalar) => x.toBigint(),
  provable: ForeignScalar.provable,
});
let u264 = spec({
  rng: Random.bignat(1n << 264n),
  there: ForeignScalar.fromBigint,
  back: (x: ForeignScalar) => x.toBigint(),
  provable: ForeignScalar.provable,
});


// arithmetic
equivalent({ from: [f, f], to: u264 })(Fq.add, (x, y) => x.add(y));
equivalent({ from: [f], to: u264 })(
    (x) => Fq.add(x, x),
    (x) => x.double()
);
// equivalent({ from: [f, f], to: u264 })(Fq.sub, (x, y) => x.sub(y)); // onlw works for x > y
equivalent({ from: [f, f], to: u264 })(Fq.mul, (x, y) => x.mul(y));
equivalent({ from: [f], to: u264 })(Fq.square, (x) => x.square());

equivalent({ from: [f, f], to: f })(
  (x, y) => Fq.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);
/*
equivalent({ from: [f], to: f })(
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  (x) => x.inverse()
);
*/
equivalent({ from: [f], to: u264 })(Fq.negate, (x) => x.negate());
//equivalent({ from: [f, f], to: u264 })(Fq.power, (x, y) => x.pow(y));
//equivalent({ from: [f], to: u264 })(Fq.sqrt, (x) => x.sqrt());



// equality with a constant

equivalent({ from: [f, f], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);

/*
// toBits / fromBits
equivalent({ from: [f], to: f })(
  (x) => x,
  (x) => {
    let bits = x.toBits();
    expect(bits.length).toEqual(255);
    return ForeignScalar.fromBits(bits);
  }
);
*/
/*
class BlsPrime extends createProvableBigInt(bls12_381.G1.CURVE.Fp.ORDER) {}

// types
BlsPrime.provable satisfies ProvablePure<BlsPrime>;

let g = spec({
    rng: Random.bignat(1n << 300n),
    there: ForeignScalar.fromBigint,
    back: (x: ForeignScalar) => x.toBigint(),
    provable: ForeignScalar.provable,
  });

let u381 = spec({
    rng: Random.bignat(1n << 300n),
    there: BlsPrime.fromBigint,
    back: (x: BlsPrime) => x.toBigint(),
    provable: BlsPrime.provable,
  });


equivalent({ from: [g, g], to: u381 })((x, y) => bls12_381.G1.CURVE.Fp.add(x, y), (x, y) => x.add(y));


*/