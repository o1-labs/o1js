import { Ledger, shutdown, Test } from '../../snarky.js';
import {
  Common,
  hashPayment,
  hashStakeDelegation,
  SignedCommand,
  SignedCommandV1,
  SignedLegacy,
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
import { Signature, SignatureJson } from './signature.js';
import { PublicKey } from '../../provable/curve-bigint.js';
import { Memo } from './memo.js';
import { expect } from 'expect';
import { versionBytes } from '../../js_crypto/constants.js';
import { stringToBytes } from '../../provable/binable.js';
import { Random, test } from '../../lib/testing/property.js';

let { record } = Random;
let commonGenerator = record({
  fee: Random.map(Random.uint32, (x) => (x * BigInt(1e9)).toString()),
  feePayer: Random.json.publicKey,
  nonce: Random.json.uint32,
  validUntil: Random.json.uint32,
  memo: Random.string(Random.nat(32)),
});
let paymentGenerator = record<SignedLegacy<PaymentJson>>({
  data: record({
    common: commonGenerator,
    body: record({
      source: Random.json.publicKey,
      receiver: Random.json.publicKey,
      amount: Random.json.uint64,
    }),
  }),
  signature: Random.json.signatureJson,
});
let delegationGenerator = record<SignedLegacy<DelegationJson>>({
  data: record({
    common: commonGenerator,
    body: record({
      delegator: Random.json.publicKey,
      newDelegate: Random.json.publicKey,
    }),
  }),
  signature: Random.json.signatureJson,
});

test(paymentGenerator, delegationGenerator, (payment, delegation, assert) => {
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
    signature: Signature.fromJSON(payment.signature),
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
    signer: PublicKey.fromBase58(delegation.data.body.delegator),
    signature: Signature.fromJSON(delegation.signature),
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
    signature: Signature.fromJSON(payment.signature),
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
    signer: PublicKey.fromBase58(delegation.data.body.delegator),
    signature: Signature.fromJSON(delegation.signature),
    payload: delegationV1Body,
  };
  v1Bytes1 = SignedCommandV1.toBytes(delegationV1);
  expect(JSON.stringify(v1Bytes1)).toEqual(JSON.stringify(v1Bytes0));

  // delegation v1 hash
  digest0 = Test.transactionHash.hashPaymentV1(ocamlDelegationV1);
  digest1 = hashStakeDelegation(delegation);
  expect(digest1).toEqual(digest0);
});

shutdown();

function paymentToOcaml({
  data: {
    common,
    body: { source, receiver, amount },
  },
  signature,
}: SignedLegacy<PaymentJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: ['Payment', { source_pk: source, receiver_pk: receiver, amount }],
    },
    signer: source,
    signature: signatureToOCaml(signature),
  };
}

function paymentToOcamlV1({
  data: {
    common,
    body: { source, receiver, amount },
  },
  signature,
}: SignedLegacy<PaymentJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Payment',
        { source_pk: source, receiver_pk: receiver, amount, token_id: '1' },
      ],
    },
    signer: source,
    signature: signatureToOCaml(signature),
  };
}

function delegationToOcaml({
  data: {
    common,
    body: { delegator, newDelegate },
  },
  signature,
}: SignedLegacy<DelegationJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: [
        'Stake_delegation',
        ['Set_delegate', { delegator, new_delegate: newDelegate }],
      ],
    },
    signer: delegator,
    signature: signatureToOCaml(signature),
  };
}

function delegationToOcamlV1({
  data: {
    common,
    body: { delegator, newDelegate },
  },
  signature,
}: SignedLegacy<DelegationJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Stake_delegation',
        ['Set_delegate', { delegator, new_delegate: newDelegate }],
      ],
    },
    signer: delegator,
    signature: signatureToOCaml(signature),
  };
}

function commonToOcaml({ fee, feePayer, nonce, validUntil, memo }: CommonJson) {
  memo = Memo.toBase58(Memo.fromString(memo));
  return {
    fee: fee === '0' ? fee : fee.slice(0, -9),
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

function signatureToOCaml(signature: SignatureJson) {
  return Signature.toBase58(Signature.fromJSON(signature));
}
