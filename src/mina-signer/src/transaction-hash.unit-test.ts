import { Test } from '../../snarky.js';
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
import { PublicKey } from './curve-bigint.js';
import { Memo } from './memo.js';
import { expect } from 'expect';
import { versionBytes } from '../../bindings/crypto/constants.js';
import { test } from '../../lib/testing/property.js';
import { RandomTransaction } from './random-transaction.js';

let mlTest = await Test();

test(RandomTransaction.signedPayment, RandomTransaction.signedDelegation, (payment, delegation) => {
  // common serialization
  let result = mlTest.transactionHash.serializeCommon(
    JSON.stringify(commonToOcaml(payment.data.common))
  );
  let bytes0 = [...result.data];
  let common = commonFromJson(payment.data.common);
  let bytes1 = Common.toBytes(common);
  expect(JSON.stringify(bytes1)).toEqual(JSON.stringify(bytes0));

  // payment serialization
  let ocamlPayment = JSON.stringify(paymentToOcaml(payment));
  result = mlTest.transactionHash.serializePayment(ocamlPayment);
  let paymentBytes0 = [...result.data];
  let payload = userCommandToEnum(paymentFromJson(payment.data));
  let command = {
    signer: PublicKey.fromBase58(payment.data.common.feePayer),
    signature: Signature.fromJSON(payment.signature),
    payload,
  };
  let paymentBytes1 = SignedCommand.toBytes(command);
  expect(JSON.stringify(paymentBytes1)).toEqual(JSON.stringify(paymentBytes0));

  // payment roundtrip
  let commandRecovered = SignedCommand.fromBytes(paymentBytes1);
  expect(commandRecovered).toEqual(command);

  // payment hash
  let digest0 = mlTest.transactionHash.hashPayment(ocamlPayment);
  let digest1 = hashPayment(payment, { berkeley: true });
  expect(digest1).toEqual(digest0);

  // delegation serialization
  let ocamlDelegation = JSON.stringify(delegationToOcaml(delegation));
  result = mlTest.transactionHash.serializePayment(ocamlDelegation);
  let delegationBytes0 = [...result.data];
  payload = userCommandToEnum(delegationFromJson(delegation.data));
  command = {
    signer: PublicKey.fromBase58(delegation.data.common.feePayer),
    signature: Signature.fromJSON(delegation.signature),
    payload,
  };
  let delegationBytes1 = SignedCommand.toBytes(command);
  expect(JSON.stringify(delegationBytes1)).toEqual(JSON.stringify(delegationBytes0));

  // delegation roundtrip
  commandRecovered = SignedCommand.fromBytes(delegationBytes1);
  expect(commandRecovered).toEqual(command);

  // delegation hash
  digest0 = mlTest.transactionHash.hashPayment(ocamlDelegation);
  digest1 = hashStakeDelegation(delegation, { berkeley: true });
  expect(digest1).toEqual(digest0);

  // payment v1 serialization
  let ocamlPaymentV1 = JSON.stringify(paymentToOcamlV1(payment));
  let ocamlBase58V1 = mlTest.transactionHash.serializePaymentV1(ocamlPaymentV1);
  let v1Bytes0 = stringToBytesOcaml(
    mlTest.encoding.ofBase58(ocamlBase58V1, versionBytes.signedCommandV1).c
  );
  let paymentV1Body = userCommandToV1(paymentFromJson(payment.data));
  let paymentV1 = {
    signer: PublicKey.fromBase58(payment.data.common.feePayer),
    signature: Signature.fromJSON(payment.signature),
    payload: paymentV1Body,
  };
  let v1Bytes1 = SignedCommandV1.toBytes(paymentV1);
  expect(JSON.stringify(v1Bytes1)).toEqual(JSON.stringify(v1Bytes0));

  // payment v1 hash
  digest0 = mlTest.transactionHash.hashPaymentV1(ocamlPaymentV1);
  digest1 = hashPayment(payment);
  expect(digest1).toEqual(digest0);

  // delegation v1 serialization
  let ocamlDelegationV1 = JSON.stringify(delegationToOcamlV1(delegation));
  ocamlBase58V1 = mlTest.transactionHash.serializePaymentV1(ocamlDelegationV1);
  v1Bytes0 = stringToBytesOcaml(
    mlTest.encoding.ofBase58(ocamlBase58V1, versionBytes.signedCommandV1).c
  );
  let delegationV1Body = userCommandToV1(delegationFromJson(delegation.data));
  let delegationV1 = {
    signer: PublicKey.fromBase58(delegation.data.common.feePayer),
    signature: Signature.fromJSON(delegation.signature),
    payload: delegationV1Body,
  };
  v1Bytes1 = SignedCommandV1.toBytes(delegationV1);
  expect(JSON.stringify(v1Bytes1)).toEqual(JSON.stringify(v1Bytes0));

  // delegation v1 hash
  digest0 = mlTest.transactionHash.hashPaymentV1(ocamlDelegationV1);
  digest1 = hashStakeDelegation(delegation);
  expect(digest1).toEqual(digest0);
});

// negative tests

test.negative(RandomTransaction.signedPayment.invalid!, (payment) => hashPayment(payment));
test.negative(RandomTransaction.signedPayment.invalid!, (payment) => {
  hashPayment(payment, { berkeley: true });
  // for "berkeley" hashing, it's fine if the signature is invalid because it's not part of the hash
  // => make invalid signatures fail independently
  Signature.fromJSON(payment.signature);
});
test.negative(RandomTransaction.signedDelegation.invalid!, (delegation) =>
  hashStakeDelegation(delegation)
);
test.negative(RandomTransaction.signedDelegation.invalid!, (delegation) => {
  hashStakeDelegation(delegation, { berkeley: true });
  // for "berkeley" hashing, it's fine if the signature is invalid because it's not part of the hash
  // => make invalid signatures fail independently
  Signature.fromJSON(delegation.signature);
});

function paymentToOcaml({
  data: {
    common,
    body: { receiver, amount },
  },
  signature,
}: SignedLegacy<PaymentJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: ['Payment', { receiver_pk: receiver, amount }],
    },
    signer: common.feePayer,
    signature: signatureToOCaml(signature),
  };
}

function paymentToOcamlV1({
  data: {
    common,
    body: { receiver, amount },
  },
  signature,
}: SignedLegacy<PaymentJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Payment',
        {
          source_pk: common.feePayer,
          receiver_pk: receiver,
          amount,
          token_id: '1',
        },
      ],
    },
    signer: common.feePayer,
    signature: signatureToOCaml(signature),
  };
}

function delegationToOcaml({
  data: {
    common,
    body: { newDelegate },
  },
  signature,
}: SignedLegacy<DelegationJson>) {
  return {
    payload: {
      common: commonToOcaml(common),
      body: ['Stake_delegation', ['Set_delegate', { new_delegate: newDelegate }]],
    },
    signer: common.feePayer,
    signature: signatureToOCaml(signature),
  };
}

function delegationToOcamlV1({
  data: {
    common,
    body: { newDelegate },
  },
  signature,
}: SignedLegacy<DelegationJson>) {
  return {
    payload: {
      common: commonToOcamlV1(common),
      body: [
        'Stake_delegation',
        ['Set_delegate', { delegator: common.feePayer, new_delegate: newDelegate }],
      ],
    },
    signer: common.feePayer,
    signature: signatureToOCaml(signature),
  };
}

function commonToOcaml({ fee, feePayer, nonce, validUntil, memo }: CommonJson) {
  memo = Memo.toBase58(Memo.fromString(memo));
  return {
    fee: fee === '0' ? fee : fee.slice(0, -9),
    fee_payer_pk: feePayer,
    nonce,
    valid_until: ['Since_genesis', validUntil],
    memo,
  };
}
function commonToOcamlV1({ fee, feePayer, nonce, validUntil, memo }: CommonJson) {
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

function stringToBytesOcaml(string: string) {
  return [...string].map((_, i) => string.charCodeAt(i));
}
