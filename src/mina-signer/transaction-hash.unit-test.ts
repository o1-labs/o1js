import { Ledger, shutdown, Test } from '../snarky.js';
import {
  Common,
  hashPayment,
  hashStakeDelegation,
  Signed,
  SignedCommand,
  SignedCommandV1,
  userCommandToEnum,
  userCommandToV1,
} from './transaction-hash.js';
import {
  PaymentJson,
  commonFromJson,
  paymentFromJson,
  CommonJson,
  DelegationJson,
  delegationFromJson,
} from './sign-legacy.js';
import { Signature } from './signature.js';
import { PublicKey } from '../provable/curve-bigint.js';
import { Memo } from './memo.js';
import { expect } from 'expect';
import { versionBytes } from '../js_crypto/constants.js';
import { stringToBytes } from '../provable/binable.js';

let payment: Signed<PaymentJson> = {
  data: {
    common: {
      fee: '8000000000',
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

let delegation: Signed<DelegationJson> = {
  data: {
    common: payment.data.common,
    body: {
      delegator: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
      newDelegate: 'B62qs2FVpaWkoNdEUgmSmUF8etXJWTnELboJK8MjLfeiSxP9MY7qjZr',
    },
  },
  signature:
    '7mWyu5cpHDvYj28RGuJKzBQkU35KgHwaM34oPxoxXbFddv1kpL3e6NdUsMZMhyrrgkgVYo5cNvfiXhtshF35ZqTmSdPcUToN',
};

// common serialization
let result = Test.transactionHash.serializeCommon(
  JSON.stringify(commonToOcaml(payment.data.common))
);
let bytes0 = [...result.data];
let common = commonFromJson(payment.data.common);
let bytes1 = Common.toBytes(common);
expect(JSON.stringify(bytes1)).toEqual(JSON.stringify(bytes0));

// payment serialization
let ocamlPayment = JSON.stringify(paymentToOcaml(payment));
result = Test.transactionHash.serializePayment(ocamlPayment);
let paymentBytes0 = [...result.data];
let payload = userCommandToEnum(paymentFromJson(payment.data));
let command = {
  signer: PublicKey.fromBase58(payment.data.body.source),
  signature: Signature.fromBase58(payment.signature),
  payload,
};
let paymentBytes1 = SignedCommand.toBytes(command);
expect(JSON.stringify(paymentBytes1)).toEqual(JSON.stringify(paymentBytes0));

// payment roundtrip
let commandRecovered = SignedCommand.fromBytes(paymentBytes1);
expect(commandRecovered).toEqual(command);

// payment hash
let digest0 = Test.transactionHash.hashPayment(ocamlPayment);
let digest1 = hashPayment(payment, { berkeley: true });
expect(digest1).toEqual(digest0);

// delegation serialization
let ocamlDelegation = JSON.stringify(delegationToOcaml(delegation));
result = Test.transactionHash.serializePayment(ocamlDelegation);
let delegationBytes0 = [...result.data];
payload = userCommandToEnum(delegationFromJson(delegation.data));
command = {
  signer: PublicKey.fromBase58(payment.data.body.source),
  signature: Signature.fromBase58(payment.signature),
  payload,
};
let delegationBytes1 = SignedCommand.toBytes(command);
expect(JSON.stringify(delegationBytes1)).toEqual(
  JSON.stringify(delegationBytes0)
);

// delegation roundtrip
commandRecovered = SignedCommand.fromBytes(delegationBytes1);
expect(commandRecovered).toEqual(command);

// delegation hash
digest0 = Test.transactionHash.hashPayment(ocamlDelegation);
digest1 = hashStakeDelegation(delegation, { berkeley: true });
expect(digest1).toEqual(digest0);

// payment v1 serialization
let ocamlPaymentV1 = JSON.stringify(paymentToOcamlV1(payment));
let ocamlBase58V1 = Test.transactionHash.serializePaymentV1(ocamlPaymentV1);
let v1Bytes0 = stringToBytes(
  Ledger.encoding.ofBase58(ocamlBase58V1, versionBytes.signedCommandV1).c
);
let paymentV1Body = userCommandToV1(paymentFromJson(payment.data));
let paymentV1 = {
  signer: PublicKey.fromBase58(payment.data.body.source),
  signature: Signature.fromBase58(payment.signature),
  payload: paymentV1Body,
};
let v1Bytes1 = SignedCommandV1.toBytes(paymentV1);
expect(JSON.stringify(v1Bytes1)).toEqual(JSON.stringify(v1Bytes0));

// payment v1 hash
digest0 = Test.transactionHash.hashPaymentV1(ocamlPaymentV1);
digest1 = hashPayment(payment);
expect(digest1).toEqual(digest0);

// delegation v1 serialization
let ocamlDelegationV1 = JSON.stringify(delegationToOcamlV1(delegation));
ocamlBase58V1 = Test.transactionHash.serializePaymentV1(ocamlDelegationV1);
v1Bytes0 = stringToBytes(
  Ledger.encoding.ofBase58(ocamlBase58V1, versionBytes.signedCommandV1).c
);
let delegationV1Body = userCommandToV1(delegationFromJson(delegation.data));
let delegationV1 = {
  signer: PublicKey.fromBase58(payment.data.body.source),
  signature: Signature.fromBase58(payment.signature),
  payload: delegationV1Body,
};
v1Bytes1 = SignedCommandV1.toBytes(delegationV1);
expect(JSON.stringify(v1Bytes1)).toEqual(JSON.stringify(v1Bytes0));

// delegation v1 hash
digest0 = Test.transactionHash.hashPaymentV1(ocamlDelegationV1);
digest1 = hashStakeDelegation(delegation);
expect(digest1).toEqual(digest0);

shutdown();

function paymentToOcaml({
  data: {
    common,
    body: { source, receiver, amount },
  },
  signature,
}: Signed<PaymentJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: ['Payment', { source_pk: source, receiver_pk: receiver, amount }],
    },
    signer: source,
    signature,
  };
}

function paymentToOcamlV1({
  data: {
    common,
    body: { source, receiver, amount },
  },
  signature,
}: Signed<PaymentJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Payment',
        { source_pk: source, receiver_pk: receiver, amount, token_id: '1' },
      ],
    },
    signer: source,
    signature,
  };
}

function delegationToOcaml({
  data: {
    common,
    body: { delegator, newDelegate },
  },
  signature,
}: Signed<DelegationJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: [
        'Stake_delegation',
        ['Set_delegate', { delegator, new_delegate: newDelegate }],
      ],
    },
    signer: delegator,
    signature,
  };
}

function delegationToOcamlV1({
  data: {
    common,
    body: { delegator, newDelegate },
  },
  signature,
}: Signed<DelegationJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Stake_delegation',
        ['Set_delegate', { delegator, new_delegate: newDelegate }],
      ],
    },
    signer: delegator,
    signature,
  };
}

function commonToOcaml({ fee, feePayer, nonce, validUntil, memo }: CommonJson) {
  memo = Memo.toBase58(Memo.fromString(memo));
  return {
    fee: fee.slice(0, -9),
    fee_payer_pk: feePayer,
    nonce,
    valid_until: validUntil,
    memo,
  };
}
function commonToOcamlV1({
  fee,
  feePayer,
  nonce,
  validUntil,
  memo,
}: CommonJson) {
  memo = Memo.toBase58(Memo.fromString(memo));
  return {
    fee: fee.slice(0, -9),
    fee_payer_pk: feePayer,
    nonce,
    valid_until: validUntil,
    memo,
    fee_token: '1',
  };
}
