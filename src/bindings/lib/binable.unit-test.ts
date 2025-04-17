import { expect } from 'expect';
import { test, Random } from '../../lib/testing/property.js';
import {
  Binable,
  BinableString,
  BinableUint32,
  BinableUint64,
  defineBinable,
  record,
  withCheck,
  withVersionNumber,
} from './binable.js';
import { PublicKey, Scalar } from '../../mina-signer/src/curve-bigint.js';
import { Bool, Field, UInt64 } from '../../mina-signer/src/field-bigint.js';

// uint

test(Random.uint32, (uint32) => {
  let bytes = BinableUint32.toBytes(uint32);
  let result = BinableUint32.fromBytes(bytes);
  expect(result).toEqual(uint32);
});
test(Random.uint64, (uint64) => {
  let bytes = BinableUint64.toBytes(uint64);
  let result = BinableUint64.fromBytes(bytes);
  expect(result).toEqual(uint64);
});

test.negative(Random.uint32.invalid, BinableUint32.toBytes);
test.negative(Random.uint64.invalid, BinableUint64.toBytes);

// finite fields

test(Random.field, (field) => {
  let bytes = Field.toBytes(field);
  let result = Field.fromBytes(bytes);
  expect(result).toEqual(field);
});
test.negative(Random.field.invalid, (field) =>
  Field.fromBytes(Field.toBytes(field))
);

test(Random.scalar, (scalar) => {
  let bytes = Scalar.toBytes(scalar);
  let result = Scalar.fromBytes(bytes);
  expect(result).toEqual(scalar);
});
test.negative(Random.scalar.invalid, (scalar) =>
  Scalar.fromBytes(Scalar.toBytes(scalar))
);

// public key

test(Random.publicKey, (publicKey) => {
  let bytes = PublicKey.toBytes(publicKey);
  let result = PublicKey.fromBytes(bytes);
  expect(result).toEqual(publicKey);
});
test.negative(Random.publicKey.invalid, (publicKey) =>
  PublicKey.fromBytes(PublicKey.toBytes(publicKey))
);

// string

test(Random.string(Random.nat(100)), (string) => {
  let bytes = BinableString.toBytes(string);
  let result = BinableString.fromBytes(bytes);
  expect(result).toEqual(string);
});

// withVersionNumber

let VersionedFieldV1 = withVersionNumber(Field, 1);
let VersionedFieldV2 = withVersionNumber(Field, 2);

test(Random.field, (field) => {
  let bytes = VersionedFieldV1.toBytes(field);
  let result = VersionedFieldV1.fromBytes(bytes);
  expect(result).toEqual(field);
});
test.negative(Random.field, (field) => {
  let bytes = VersionedFieldV2.toBytes(field);
  // decoding with wrong version number should fail
  let result = VersionedFieldV1.fromBytes(bytes);
  expect(result).toEqual(field);
});

// check

let FieldWithFailingCheck = withCheck(Field, () => {
  throw Error('always fails');
});
test.negative(Random.field, (field) =>
  // should fail to decode when check fails
  FieldWithFailingCheck.fromBytes(FieldWithFailingCheck.toBytes(field))
);

let notABool = Random.map(Random.uint32, (x) => Number(x) + 2);
test.negative(notABool, (bool) =>
  // should fail to decode when check fails
  Bool.fromBytes([bool])
);

// record combinator

type AccountBalance = { address: PublicKey; balance: UInt64 };

let randomAccountBalance: Random<AccountBalance> = Random.record({
  address: Random.publicKey,
  balance: Random.uint64,
});
let AccountBalance: Binable<AccountBalance> = record(
  { address: PublicKey, balance: UInt64 },
  ['address', 'balance']
);

test(randomAccountBalance, (accountBalance) => {
  let bytes = AccountBalance.toBytes(accountBalance);

  // according to the bin_prot spec, the combined type is written by writing the pieces after another
  let bytesReference = [
    ...PublicKey.toBytes(accountBalance.address),
    ...UInt64.toBytes(accountBalance.balance),
  ];
  expect(bytes).toEqual(bytesReference);

  let result = AccountBalance.fromBytes(bytes);
  expect(result).toEqual(accountBalance);
});

// defineBinable - readBytes must return valid offset

let MessedUpBool = defineBinable({
  toBytes: Bool.toBytes,
  readBytes(bytes, offset) {
    let value = !!bytes[offset++];
    return [value, offset + 1]; // by accident, offset is incremented twice
  },
});

test.negative(Random.bool, (bool) => {
  let bytes = MessedUpBool.toBytes(bool);
  MessedUpBool.fromBytes(bytes); // should fail
});

// defineBinable - can't read from an invalid offset

let fieldBytes = Field.toBytes(Field.random());
expect(() => Field.readBytes(fieldBytes, -1 as never)).toThrow();
expect(() => Field.readBytes(fieldBytes, 0.1 as never)).toThrow();
expect(() => Field.readBytes(fieldBytes, 3e-9 as never)).toThrow();
expect(() => Field.readBytes(fieldBytes, fieldBytes.length as never)).toThrow();
