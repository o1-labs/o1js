import { Binable } from '../../bindings/lib/binable.js';
import { PublicKey, PrivateKey, Scalar } from './curve-bigint.js';
import { Field } from './field-bigint.js';
import { Memo } from './memo.js';
import { Signature, SignatureJson } from './signature.js';
import {
  DelegationJson,
  PaymentJson,
  signPayment,
  signStakeDelegation,
  verifyPayment,
  verifyStakeDelegation,
} from './sign-legacy.js';
import { NetworkId, SignedRosetta } from './types.js';
import * as Json from './types.js';

export {
  publicKeyToHex,
  signatureFromHex,
  signatureJsonFromHex,
  signatureToHex,
  signatureJsonToHex,
  fieldFromHex,
  fieldToHex,
  rosettaTransactionToSignedCommand,
  signTransaction,
  verifyTransaction,
  rosettaCombineSignature,
  rosettaCombinePayload,
  UnsignedPayload,
  UnsignedTransaction,
  SignedTransaction,
};

const defaultValidUntil = '4294967295';

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

function signatureJsonFromHex(signatureHex: string): SignatureJson {
  return Signature.toJSON(signatureFromHex(signatureHex));
}

function signatureJsonToHex(signatureJson: SignatureJson): string {
  return signatureToHex(Signature.fromJSON(signatureJson));
}

function signatureToHex(signature: Signature): string {
  let rHex = fieldToHex(Field, signature.r);
  let sHex = fieldToHex(Scalar, signature.s);
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
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fieldFromHex<T extends Field | Scalar>(
  binable: Binable<T>,
  hex: string
): [T, boolean] {
  let bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    let byte = parseInt(hex[i] + hex[i + 1], 16);
    bytes.push(byte);
  }
  // read highest bit
  let paddingBit = !!(bytes[bytes.length - 1] >> 7);
  bytes[bytes.length - 1] &= 0x7f;
  return [binable.fromBytes(bytes), paddingBit];
}

function signTransaction(
  transaction: UnsignedTransaction,
  privateKey: string,
  network: NetworkId
): SignedRosetta<UnsignedTransaction> {
  let signature: SignatureJson;
  if (transaction.payment !== null) {
    let payment = paymentFromRosetta(transaction.payment);
    signature = signPayment(payment, privateKey, network);
  } else if (transaction.stakeDelegation !== null) {
    let delegation = delegationFromRosetta(transaction.stakeDelegation);
    signature = signStakeDelegation(delegation, privateKey, network);
  } else {
    throw Error('signTransaction: Unsupported transaction');
  }
  let publicKey = PublicKey.toBase58(
    PrivateKey.toPublicKey(PrivateKey.fromBase58(privateKey))
  );
  return {
    data: transaction,
    signature: signatureJsonToHex(signature),
    publicKey,
  };
}

function paymentFromRosetta(payment: Payment): PaymentJson {
  return {
    common: {
      fee: payment.fee,
      feePayer: payment.from,
      nonce: payment.nonce,
      validUntil: payment.valid_until ?? defaultValidUntil,
      memo: payment.memo ?? '',
    },
    body: {
      receiver: payment.to,
      amount: payment.amount,
    },
  };
}

function delegationFromRosetta(delegation: StakeDelegation): DelegationJson {
  return {
    common: {
      feePayer: delegation.delegator,
      fee: delegation.fee,
      validUntil: delegation.valid_until ?? defaultValidUntil,
      memo: delegation.memo ?? '',
      nonce: delegation.nonce,
    },
    body: {
      newDelegate: delegation.new_delegate,
    },
  };
}

function verifyTransaction(
  signedTransaction: SignedRosetta<UnsignedTransaction>,
  network: NetworkId
): boolean {
  if (signedTransaction.data.payment !== null) {
    return verifyPayment(
      paymentFromRosetta(signedTransaction.data.payment),
      signatureJsonFromHex(signedTransaction.signature),
      signedTransaction.publicKey,
      network
    );
  }
  if (signedTransaction.data.stakeDelegation !== null) {
    return verifyStakeDelegation(
      delegationFromRosetta(signedTransaction.data.stakeDelegation),
      signatureJsonFromHex(signedTransaction.signature),
      signedTransaction.publicKey,
      network
    );
  }
  throw Error('verifyTransaction: Unsupported transaction');
}

// create a signature for /construction/combine payload
function rosettaCombineSignature(
  signature: SignedRosetta<UnsignedTransaction>,
  signingPayload: unknown
): RosettaSignature {
  let publicKey = PublicKey.fromBase58(signature.publicKey);
  return {
    hex_bytes: signature.signature,
    public_key: {
      hex_bytes: publicKeyToHex(publicKey),
      curve_type: 'pallas',
    },
    signature_type: 'schnorr_poseidon',
    signing_payload: signingPayload,
  };
}

// create a payload for /construction/combine
function rosettaCombinePayload(
  unsignedPayload: UnsignedPayload,
  privateKey: Json.PrivateKey,
  network: NetworkId
) {
  let signature = signTransaction(
    JSON.parse(unsignedPayload.unsigned_transaction),
    privateKey,
    network
  );
  let signatures = [
    rosettaCombineSignature(signature, unsignedPayload.payloads[0]),
  ];
  return {
    network_identifier: { blockchain: 'mina', network },
    unsigned_transaction: unsignedPayload.unsigned_transaction,
    signatures,
  };
}

// TODO: clean up this logic, was copied over from OCaml code
function rosettaTransactionToSignedCommand({
  signature,
  payment,
  stake_delegation,
}: SignedTransaction) {
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

type UnsignedPayload = {
  unsigned_transaction: string;
  payloads: unknown[];
};

type UnsignedTransaction = {
  randomOracleInput: string;
  signerInput: {
    prefix: string[];
    suffix: string[];
  };
  payment: Payment | null;
  stakeDelegation: StakeDelegation | null;
};

type SignedTransaction = {
  signature: string;
  payment: Payment | null;
  stake_delegation: StakeDelegation | null;
};

type RosettaSignature = {
  hex_bytes: string;
  public_key: {
    hex_bytes: string;
    curve_type: string;
  };
  signature_type: string;
  signing_payload: unknown;
};

type Payment = {
  to: string;
  from: string;
  fee: string;
  token: string;
  nonce: string;
  memo: string | null;
  amount: string;
  valid_until: string | null;
};

type StakeDelegation = {
  delegator: string;
  new_delegate: string;
  fee: string;
  nonce: string;
  memo: string | null;
  valid_until: string | null;
};
