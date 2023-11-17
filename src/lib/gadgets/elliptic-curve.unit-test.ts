import { Provable } from '../provable.js';
import { Field3 } from './foreign-field.js';
import { EllipticCurve } from './elliptic-curve.js';
import { printGates } from '../testing/constraint-system.js';
import { assert } from './common.js';
import { createCurveAffine } from '../../bindings/crypto/elliptic_curve.js';
import { Fp } from '../../bindings/crypto/finite_field.js';
import {
  pallasParams,
  secp256k1Params,
} from '../../bindings/crypto/elliptic-curve-examples.js';

const Secp256k1 = createCurveAffine(secp256k1Params);
const Pallas = createCurveAffine(pallasParams);

let { add, double, initialAggregator } = EllipticCurve;

let csAdd = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let x2 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y2 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };
  let h = { x: x2, y: y2 };

  add(g, h, Secp256k1.modulus);
});

let csDouble = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };

  double(g, Secp256k1.modulus);
});

printGates(csAdd.gates);
console.log({ digest: csAdd.digest, rows: csAdd.rows });

printGates(csDouble.gates);
console.log({ digest: csDouble.digest, rows: csDouble.rows });

let point = initialAggregator(Pallas, Fp);
console.log({ point });
assert(Pallas.isOnCurve(point));
