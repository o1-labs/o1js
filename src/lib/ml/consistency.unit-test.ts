import { Test } from '../../snarky.js';
import { Random, test } from '../testing/property.js';
import { PrivateKey } from '../signature.js';
import { Ml } from './conversion.js';
import { expect } from 'expect';

// PrivateKey.toBase58, fromBase58

test(Random.privateKey, (s) => {
  // private key to/from bigint
  let sk = PrivateKey.fromBigInt(s);
  expect(sk.toBigInt()).toEqual(s);

  let skMl = Ml.fromPrivateKey(sk);

  // toBase58 - check consistency with ml
  let ml = Test.encoding.privateKeyToBase58(skMl);
  let js = sk.toBase58();
  expect(js).toEqual(ml);

  // fromBase58 - check consistency with where we started
  expect(PrivateKey.fromBase58(js)).toEqual(sk);
  expect(Test.encoding.privateKeyOfBase58(ml)).toEqual(skMl);
});
