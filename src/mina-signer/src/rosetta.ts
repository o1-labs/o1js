import { Binable } from '../../bindings/lib/binable.js';
import { PublicKey, Scalar } from '../../provable/curve-bigint.js';
import { Field } from '../../provable/field-bigint.js';
import { Memo } from './memo.js';
import { Signature, SignatureJson } from './signature.js';

export {
  publicKeyToHex,
  signatureFromHex,
  signatureToHex,
  signatureJsonToHex,
  rosettaTransactionToSignedCommand
};

function publicKeyToHex(publicKey: PublicKey) {
  return fieldToHex(Field, publicKey.x, !!publicKey.isOdd);
}

function signatureFromHex(signatureHex: string): Signature {
  let half = signatureHex.length / 2;
  let fieldHex = signatureHex.slice(0, half);
  let scalarHex = signatureHex.slice(half);
  return {
    r: fieldFromHex(Field, fieldHex)[0],
    s: fieldFromHex(Scalar, scalarHex)[0],
  };
}

function signatureJsonToHex(signatureJson: SignatureJson): string {
  return signatureToHex(Signature.fromJSON(signatureJson));
}

function signatureToHex(signature: Signature): string {
  let rHex = fieldToHex(Field, signature.r);
  let sHex = fieldToHex(Field, signature.s);
  return `${rHex}${sHex}`;
}

function fieldToHex<T extends Field | Scalar>(
  binable: Binable<T>,
  x: T,
  paddingBit: boolean = false
) {
  let bytes = binable.toBytes(x);
  // set highest bit (which is empty)
  bytes[bytes.length - 1] |= Number(paddingBit) << 7;
  // map each byte to a 0-padded hex string of length 2
  return bytes
    .map((byte) => byte.toString(16).padStart(2, '0').split('').reverse().join(''))
    .join('');
}

function fieldFromHex<T extends Field | Scalar>(
  binable: Binable<T>,
  hex: string
): [T, boolean] {
  let bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    let byte = parseInt(hex[i + 1] + hex[i], 16);
    bytes.push(byte);
  }
  // read highest bit
  let paddingBit = !!(bytes[bytes.length - 1] >> 7);
  bytes[bytes.length - 1] &= 0x7f;
  return [binable.fromBytes(bytes), paddingBit];
}

// TODO: clean up this logic, was copied over from OCaml code
function rosettaTransactionToSignedCommand({
  signature,
  payment,
  stake_delegation,
}: RosettaTransactionJson) {
  let signatureDecoded = signatureFromHex(signature);
  let signatureBase58 = Signature.toBase58(signatureDecoded);
  let [t, nonce] = (() => {
    if (payment !== null && stake_delegation === null) {
      let r = payment;
      let command = {
        receiver: r.to,
        source: r.from,
        kind: 'Payment' as const,
        fee_payer: r.from,
        fee_token: r.token,
        fee: r.fee,
        amount: r.amount,
        valid_until: r.valid_until,
        memo: r.memo,
      };
      return [command, r.nonce];
    } else if (payment === null && stake_delegation !== null) {
      let r = stake_delegation;
      let command = {
        receiver: r.new_delegate,
        source: r.delegator,
        kind: 'Delegation' as const,
        fee_payer: r.delegator,
        fee_token: '1',
        fee: r.fee,
        amount: null,
        valid_until: r.valid_until,
        memo: r.memo,
      };
      return [command, r.nonce];
    } else {
      throw Error('rosettaTransactionToSignedCommand: Unsupported transaction');
    }
  })();
  let payload = (() => {
    let fee_payer_pk = t.fee_payer;
    let source_pk = t.source;
    let receiver_pk = t.receiver;
    let memo = Memo.toBase58(Memo.fromString(t.memo ?? ''));
    let common = {
      fee: t.fee,
      fee_payer_pk,
      nonce,
      valid_until: t.valid_until,
      memo,
    };
    if (t.kind === 'Payment') {
      return {
        common,
        body: ['Payment', { source_pk, receiver_pk, amount: t.amount }],
      };
    } else if (t.kind === 'Delegation') {
      return {
        common,
        body: [
          'Stake_delegation',
          ['Set_delegate', { delegator: source_pk, new_delegate: receiver_pk }],
        ],
      };
    } else throw Error('rosettaTransactionToSignedCommand has a bug');
  })();
  return {
    signature: signatureBase58,
    signer: payload.common.fee_payer_pk,
    payload,
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
