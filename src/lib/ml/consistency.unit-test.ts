import { Test } from '../../snarky.js';
import { Random, test } from '../testing/property.js';
import { Field, Bool } from '../core.js';
import { PrivateKey, PublicKey } from '../signature.js';
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

// PublicKey.toBase58, fromBase58

test(Random.publicKey, (pk0) => {
  // public key from bigint
  let pk = PublicKey.from({ x: Field(pk0.x), isOdd: Bool(!!pk0.isOdd) });
  let pkMl = Ml.fromPublicKey(pk);

  // toBase58 - check consistency with ml
  let ml = Test.encoding.publicKeyToBase58(pkMl);
  let js = pk.toBase58();
  expect(js).toEqual(ml);

  // fromBase58 - check consistency with where we started
  expect(PublicKey.fromBase58(js)).toEqual(pk);
  expect(Test.encoding.publicKeyOfBase58(ml)).toEqual(pkMl);
});
