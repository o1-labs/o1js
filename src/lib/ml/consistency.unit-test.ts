import { Ledger } from '../../snarky.js';
import { Random, test } from '../testing/property.js';
import { Scalar, ScalarConst } from '../scalar.js';
import { PrivateKey } from '../signature.js';
import { expect } from 'expect';

// PrivateKey.toBase58, fromBase58

test(Random.scalar, (s) => {
  // toBase58 - check consistency with ml
  let ml = Ledger.privateKeyToString(ScalarConst.fromBigint(s));
  let js = PrivateKey.fromObject({ s: Scalar.from(s) }).toBase58();
  expect(js).toEqual(ml);

  // fromBase58 - check consistency with where we started
  expect(PrivateKey.fromBase58(js).s.toBigInt()).toEqual(s);
});
