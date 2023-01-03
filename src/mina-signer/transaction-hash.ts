import { Bool, Field, UInt32, UInt64 } from '../provable/field-bigint.js';
import { Memo } from './memo.js';
import {
  defineBinable,
  enumWithArgument,
  record,
} from '../provable/binable.js';
import {
  Common,
  Delegation,
  Payment,
  UserCommand,
  UserCommandEnum,
  PaymentJson,
  DelegationJson,
  delegationFromJson,
  paymentFromJson,
} from './sign-legacy.js';
import { PublicKey } from '../provable/curve-bigint.js';
import { Signature } from './signature.js';
import { blake2b } from 'blakejs';
import { base58 } from '../provable/base58.js';
import { versionBytes } from '../js_crypto/constants.js';

export { hashPayment, hashStakeDelegation };

type Signed<T> = { data: T; signature: string };

function hashPayment({ signature, data }: Signed<PaymentJson>) {
  let payload = userCommandToEnum(paymentFromJson(data));
  return hashSignedCommand({
    signer: PublicKey.fromBase58(data.body.source),
    signature: Signature.fromBase58(signature),
    payload,
  });
}

function hashStakeDelegation({ signature, data }: Signed<DelegationJson>) {
  let payload = userCommandToEnum(delegationFromJson(data));
  return hashSignedCommand({
    signer: PublicKey.fromBase58(data.body.delegator),
    signature: Signature.fromBase58(signature),
    payload,
  });
}

function hashSignedCommand(command: SignedCommand) {
  let inputBytes = SignedCommand.toBytes(command);
  let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
  return Base58Hash.toBase58(bytes);
}

// helper

function userCommandToEnum({ common, body }: UserCommand): UserCommandEnum {
  let { tag: type, ...value } = body;
  switch (type) {
    case 'Payment':
      return { common, body: { type, value } };
    case 'StakeDelegation':
      let { source: delegator, receiver: newDelegate } = value;
      return { common, body: { type, value: { delegator, newDelegate } } };
  }
}

// binable

let BinablePublicKey = record({ x: Field, isOdd: Bool }, ['x', 'isOdd']);

const Common = record<Common>(
  {
    fee: UInt64,
    feePayer: BinablePublicKey,
    nonce: UInt32,
    validUntil: UInt32,
    memo: Memo,
  },
  ['fee', 'feePayer', 'nonce', 'validUntil', 'memo']
);
const Payment = record<Payment>(
  { source: BinablePublicKey, receiver: BinablePublicKey, amount: UInt64 },
  ['source', 'receiver', 'amount']
);
const Delegation = record<Delegation>(
  { delegator: BinablePublicKey, newDelegate: BinablePublicKey },
  ['delegator', 'newDelegate']
);
const Body = enumWithArgument<
  [
    { type: 'Payment'; value: Payment },
    { type: 'StakeDelegation'; value: Delegation }
  ]
>([
  { type: 'Payment', value: Payment },
  { type: 'StakeDelegation', value: Delegation },
]);

const UserCommand = record({ common: Common, body: Body }, ['common', 'body']);

type SignedCommand = {
  payload: UserCommandEnum;
  signer: PublicKey;
  signature: Signature;
};
const SignedCommand = record<SignedCommand>(
  { payload: UserCommand, signer: BinablePublicKey, signature: Signature },
  ['payload', 'signer', 'signature']
);

const Base58Hash = base58(
  defineBinable<Uint8Array>({
    toBytes(t: Uint8Array) {
      return [...t];
    },
    fromBytesInternal(bytes, offset) {
      return [Uint8Array.from(bytes), offset];
    },
  }),
  versionBytes.transactionHash
);
