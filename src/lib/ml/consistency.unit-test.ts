import { Ledger, Test } from '../../snarky.js';
import { Random, test } from '../testing/property.js';
import { Field, Bool } from '../core.js';
import { PrivateKey, PublicKey } from '../signature.js';
import { TokenId, dummySignature } from '../account_update.js';
import { Ml } from './conversion.js';
import { expect } from 'expect';
import { FieldConst } from '../field.js';
import { Provable } from '../provable.js';

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

// dummy signature
let js = dummySignature();
let ml = Test.signature.dummySignature();
expect(js).toEqual(ml);

// token id to/from base58

test(Random.field, (x) => {
  let js = TokenId.toBase58(Field(x));
  let ml = Test.encoding.tokenIdToBase58(FieldConst.fromBigint(x));
  expect(js).toEqual(ml);

  expect(TokenId.fromBase58(js).toBigInt()).toEqual(x);
});

let defaultTokenId = 'wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf';
expect(TokenId.fromBase58(defaultTokenId).toString()).toEqual('1');

// derive token id

let randomTokenId = Random.oneOf(Random.field, TokenId.default.toBigInt());

// - non provable

test(Random.publicKey, randomTokenId, (publicKey, field) => {
  let tokenOwner = PublicKey.from({
    x: Field(publicKey.x),
    isOdd: Bool(!!publicKey.isOdd),
  });
  let parentTokenId = Field(field);

  let js = TokenId.derive(tokenOwner, parentTokenId);
  let ml = Field(
    Test.tokenId.derive(
      Ml.fromPublicKey(tokenOwner),
      Ml.constFromField(parentTokenId)
    )
  );
  expect(js).toEqual(ml);
});

// - provable

test(Random.publicKey, randomTokenId, (publicKey, field) => {
  let tokenOwner = PublicKey.from({
    x: Field(publicKey.x),
    isOdd: Bool(!!publicKey.isOdd),
  });
  let parentTokenId = Field(field);

  Provable.runAndCheck(() => {
    tokenOwner = Provable.witness(PublicKey, () => tokenOwner);
    parentTokenId = Provable.witness(Field, () => parentTokenId);

    let js = TokenId.derive(tokenOwner, parentTokenId);
    let ml = Field(
      Test.tokenId.deriveChecked(
        Ml.fromPublicKeyVar(tokenOwner),
        Ml.varFromField(parentTokenId)
      )
    );

    expect(js.isConstant()).toEqual(false);
    expect(ml.isConstant()).toEqual(false);
    Provable.asProver(() => expect(js.toBigInt()).toEqual(ml.toBigInt()));
  });

  expect(js).toEqual(ml);
});
