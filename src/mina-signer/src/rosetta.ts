import { Binable } from '../../provable/binable.js';
import { PublicKey, Scalar } from '../../provable/curve-bigint.js';
import { Field, UInt32, UInt64 } from '../../provable/field-bigint.js';
import { Memo } from './memo.js';
import { CommonJson, PaymentJson } from './sign-legacy.js';
import { Signature } from './signature.js';
import { Signed } from './transaction-hash.js';

export { publicKeyToHex };

function publicKeyToHex(publicKey: PublicKey) {
  return fieldToHex(Field, publicKey.x, !!publicKey.isOdd);
}

function fieldToHex<T extends Field | Scalar>(
  binable: Binable<T>,
  x: T,
  paddingBit: boolean
) {
  let bytes = binable.toBytes(x);
  // set highest bit (which is empty)
  bytes[bytes.length - 1] &= Number(paddingBit) << 7;
  // map each byte to a hex string of length 2
  return bytes.map((byte) => byte.toString(16)).join('');
}

function rosettaTransactionToSignedCommand({
  signature,
  payment,
  stake_delegation,
}: RosettaTransactionJson) {
  if (payment !== null && stake_delegation === null) {
    let r = payment;
    let command = {
      receiver: r.to,
      source: r.from,
      kind: 'Payment',
      fee_payer: r.from,
      fee_token: r.token,
      fee: UInt64.fromJSON(r.fee),
      amount: UInt64.fromJSON(r.amount),
      valid_until:
        r.valid_until !== null ? UInt32.fromJSON(r.valid_until) : null,
      memo: r.memo,
    };
  } else if (payment === null && stake_delegation !== null) {
    let r = stake_delegation;
    let command = {
      receiver: r.new_delegate,
      source: r.delegator,
      kind: 'Delegation',
      fee_payer: r.delegator,
      fee_token: '1',
      fee: UInt64.fromJSON(r.fee),
      amount: null,
      valid_until:
        r.valid_until !== null ? UInt32.fromJSON(r.valid_until) : null,
      memo: r.memo,
    };
  } else {
    throw Error('rosettaTransactionToSignedCommand: Unsupported transaction');
  }
}

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
    signature: Signature.toBase58(Signature.fromJSON(signature)),
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

type RosettaTransactionJson = {
  signature: string;
  payment: {
    to: string;
    from: string;
    fee: string;
    token: string;
    nonce: string;
    memo: string | null;
    amount: string;
    valid_until: string | null;
  } | null;
  stake_delegation: {
    delegator: string;
    new_delegate: string;
    fee: string;
    nonce: string;
    memo: string | null;
    valid_until: string | null;
  } | null;
};
