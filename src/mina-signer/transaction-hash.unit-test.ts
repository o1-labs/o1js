import { Test } from '../snarky.js';
import {
  Common,
  Signed,
  SignedCommand,
  userCommandToEnum,
} from './transaction-hash.js';
import { PaymentJson, commonFromJson, paymentFromJson } from './sign-legacy.js';
import { Signature } from './signature.js';
import { PublicKey } from '../provable/curve-bigint.js';
import { Memo } from './memo.js';
import { expect } from 'expect';

let payment: Signed<PaymentJson> = {
  data: {
    common: {
      fee: '8',
      feePayer: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
      nonce: '600',
      validUntil: '107',
      memo: 'blub',
    },
    body: {
      source: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
      receiver: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
      amount: '99',
    },
  },
  signature:
    '7mWyu5cpHDvYj28RGuJKzBQkU35KgHwaM34oPxoxXbFddv1kpL3e6NdUsMZMhyrrgkgVYo5cNvfiXhtshF35ZqTmSdPcUToN',
};

let paymentOcaml = {
  payload: {
    common: {
      fee: '8',
      fee_payer_pk: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
      nonce: '600',
      valid_until: '107',
      memo: Memo.toBase58(Memo.fromString('blub')),
    },
    body: [
      'Payment',
      {
        source_pk: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
        receiver_pk: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
        amount: '99',
      },
    ],
  },
  signer: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
  signature:
    '7mWyu5cpHDvYj28RGuJKzBQkU35KgHwaM34oPxoxXbFddv1kpL3e6NdUsMZMhyrrgkgVYo5cNvfiXhtshF35ZqTmSdPcUToN',
};

console.log('--- comparing payment.common ---');

let result = Test.transactionHash.serializeCommon(
  JSON.stringify(paymentOcaml.payload.common)
);
let bytes0 = [...result.data];
console.log();
console.log(JSON.stringify(bytes0));
console.log();

let common = commonFromJson(payment.data.common);
let bytes1 = Common.toBytes(common);
console.log(JSON.stringify(bytes1));
console.log();

console.log('equal?', JSON.stringify(bytes0) === JSON.stringify(bytes1));

console.log('--- comparing payment ---');

result = Test.transactionHash.serializePayment(JSON.stringify(paymentOcaml));
let commandBytes0 = [...result.data];
console.log();
console.log(JSON.stringify(commandBytes0));
console.log();

let payload = userCommandToEnum(paymentFromJson(payment.data));
let command = {
  signer: PublicKey.fromBase58(payment.data.body.source),
  signature: Signature.fromBase58(payment.signature),
  payload,
};
let commandBytes1 = SignedCommand.toBytes(command);
console.log(JSON.stringify(commandBytes1));

console.log(
  'equal?',
  JSON.stringify(commandBytes0) === JSON.stringify(commandBytes1)
);
expect(JSON.stringify(commandBytes1)).toEqual(JSON.stringify(commandBytes0));
