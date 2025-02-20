import { Bool, Field, UInt32, UInt64 } from './field-bigint.js';
import {
  Binable,
  BinableString,
  BinableUint64,
  BinableUint32,
  defineBinable,
  enumWithArgument,
  record,
  stringToBytes,
  withVersionNumber,
} from '../../bindings/lib/binable.js';
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
import { PublicKey, Scalar } from './curve-bigint.js';
import { Signature, SignatureJson } from './signature.js';
import { blake2b } from 'blakejs';
import { base58, withBase58 } from '../../lib/util/base58.js';
import { versionBytes } from '../../bindings/crypto/constants.js';

export {
  hashPayment,
  hashStakeDelegation,
  SignedCommand,
  SignedCommandV1,
  Common,
  userCommandToEnum,
  userCommandToV1,
  Signed,
  SignedLegacy,
  HashBase58,
};

type Signed<T> = { data: T; signature: string };
type SignedLegacy<T> = { data: T; signature: SignatureJson };
const dummySignature: Signature = { r: Field(1), s: Scalar(1) };

function hashPayment(signed: SignedLegacy<PaymentJson>, { berkeley = false } = {}) {
  if (!berkeley) return hashPaymentV1(signed);
  let payload = userCommandToEnum(paymentFromJson(signed.data));
  return hashSignedCommand({
    signer: PublicKey.fromBase58(signed.data.common.feePayer),
    signature: dummySignature,
    payload,
  });
}

function hashStakeDelegation(signed: SignedLegacy<DelegationJson>, { berkeley = false } = {}) {
  if (!berkeley) return hashStakeDelegationV1(signed);
  let payload = userCommandToEnum(delegationFromJson(signed.data));
  return hashSignedCommand({
    signer: PublicKey.fromBase58(signed.data.common.feePayer),
    signature: dummySignature,
    payload,
  });
}

function hashSignedCommand(command: SignedCommand) {
  let inputBytes = SignedCommand.toBytes(command);
  let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
  return HashBase58.toBase58(bytes);
}

// helper

function userCommandToEnum({ common, body }: UserCommand): UserCommandEnum {
  let { tag: type, ...value } = body;
  switch (type) {
    case 'Payment':
      return {
        common,
        body: { type, value: { receiver: body.receiver, amount: body.amount } },
      };
    case 'StakeDelegation':
      let { receiver: newDelegate } = value;
      return {
        common,
        body: {
          type,
          value: { type: 'SetDelegate', value: { newDelegate } },
        },
      };
  }
}

// binable

let BinablePublicKey = record({ x: Field, isOdd: Bool }, ['x', 'isOdd']);
type GlobalSlotSinceGenesis = Common['validUntil'];
let GlobalSlotSinceGenesis = enumWithArgument<[GlobalSlotSinceGenesis]>([
  { type: 'SinceGenesis', value: BinableUint32 },
]);

const Common = record<Common>(
  {
    fee: BinableUint64,
    feePayer: BinablePublicKey,
    nonce: BinableUint32,
    validUntil: GlobalSlotSinceGenesis,
    memo: BinableString,
  },
  ['fee', 'feePayer', 'nonce', 'validUntil', 'memo']
);
const Payment = record<Payment>(
  {
    receiver: BinablePublicKey,
    amount: BinableUint64,
  },
  ['receiver', 'amount']
);
const Delegation = record<Delegation>({ newDelegate: BinablePublicKey }, ['newDelegate']);
type DelegationEnum = { type: 'SetDelegate'; value: Delegation };
const DelegationEnum = enumWithArgument<[DelegationEnum]>([
  { type: 'SetDelegate', value: Delegation },
]);

const Body = enumWithArgument<
  [{ type: 'Payment'; value: Payment }, { type: 'StakeDelegation'; value: DelegationEnum }]
>([
  { type: 'Payment', value: Payment },
  { type: 'StakeDelegation', value: DelegationEnum },
]);

const UserCommand = record({ common: Common, body: Body }, ['common', 'body']);
const BinableSignature = record({ r: Field, s: Scalar }, ['r', 's']);

type SignedCommand = {
  payload: UserCommandEnum;
  signer: PublicKey;
  signature: Signature;
};
const SignedCommand = record<SignedCommand>(
  {
    payload: UserCommand,
    signer: BinablePublicKey,
    signature: BinableSignature,
  },
  ['payload', 'signer', 'signature']
);

const HashBase58 = base58(
  defineBinable<Uint8Array>({
    toBytes(t: Uint8Array) {
      return [t.length, ...t];
    },
    readBytes(bytes) {
      return [Uint8Array.from(bytes.slice(1)), bytes.length];
    },
  }),
  versionBytes.transactionHash
);

// legacy / v1 stuff

function hashPaymentV1({ data, signature }: SignedLegacy<PaymentJson>) {
  let paymentV1 = userCommandToV1(paymentFromJson(data));
  return hashSignedCommandV1({
    signer: PublicKey.fromBase58(data.common.feePayer),
    signature: Signature.fromJSON(signature),
    payload: paymentV1,
  });
}

function hashStakeDelegationV1({ data, signature }: SignedLegacy<DelegationJson>) {
  let payload = userCommandToV1(delegationFromJson(data));
  return hashSignedCommandV1({
    signer: PublicKey.fromBase58(data.common.feePayer),
    signature: Signature.fromJSON(signature),
    payload,
  });
}

function hashSignedCommandV1(command: SignedCommandV1) {
  let base58 = SignedCommandV1.toBase58(command);
  let inputBytes = stringToBytes(base58);
  let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
  return HashBase58.toBase58(bytes);
}

function userCommandToV1({ common, body }: UserCommand): UserCommandV1 {
  let { tag: type, ...value } = body;
  let commonV1: CommonV1 = {
    ...common,
    validUntil: common.validUntil.value,
    feeToken: 1n,
  };
  switch (type) {
    case 'Payment':
      let paymentV1: PaymentV1 = { ...value, tokenId: 1n };
      return { common: commonV1, body: { type, value: paymentV1 } };
    case 'StakeDelegation':
      let { source: delegator, receiver: newDelegate } = value;
      return {
        common: commonV1,
        body: {
          type,
          value: { type: 'SetDelegate', value: { delegator, newDelegate } },
        },
      };
  }
}
// binables for v1 signed commands

// TODO: Version numbers (of 1) were placed somewhat arbitrarily until it worked / matched serializations from OCaml.
// I couldn't precisely explain each of them from following the OCaml type annotations, which I find hard to parse.
// You could get an equivalent serialization by moving, for example, one of the version numbers on `common` one level down to become
// another version number on `fee`, and I'm not sure what the correct answer is. I think this doesn't matter because
// the type layout here, including version numbers, is frozen, so if it works once it'll work forever.
const with1 = <T>(binable: Binable<T>) => withVersionNumber(binable, 1);
const Uint64V1 = with1(with1(BinableUint64));
const Uint32V1 = with1(with1(BinableUint32));
type CommonV1 = {
  fee: UInt64;
  feePayer: PublicKey;
  nonce: UInt32;
  validUntil: UInt32;
  memo: string;
  feeToken: UInt64;
};

const CommonV1 = with1(
  with1(
    record<CommonV1>(
      {
        fee: with1(Uint64V1),
        feeToken: with1(Uint64V1),
        feePayer: PublicKey,
        nonce: Uint32V1,
        validUntil: Uint32V1,
        memo: with1(BinableString),
      },
      ['fee', 'feeToken', 'feePayer', 'nonce', 'validUntil', 'memo']
    )
  )
);
type PaymentV1 = Payment & { source: PublicKey; tokenId: UInt64 };
const PaymentV1 = with1(
  with1(
    record<PaymentV1>(
      {
        source: PublicKey,
        receiver: PublicKey,
        tokenId: Uint64V1,
        amount: with1(Uint64V1),
      },
      ['source', 'receiver', 'tokenId', 'amount']
    )
  )
);
type DelegationV1 = Delegation & { delegator: PublicKey };
const DelegationV1 = record<DelegationV1>({ delegator: PublicKey, newDelegate: PublicKey }, [
  'delegator',
  'newDelegate',
]);
type DelegationEnumV1 = { type: 'SetDelegate'; value: DelegationV1 };
const DelegationEnumV1 = with1(
  enumWithArgument<[DelegationEnumV1]>([{ type: 'SetDelegate', value: DelegationV1 }])
);
type BodyV1 =
  | { type: 'Payment'; value: PaymentV1 }
  | { type: 'StakeDelegation'; value: DelegationEnumV1 };
const BodyV1 = with1(
  enumWithArgument<
    [{ type: 'Payment'; value: PaymentV1 }, { type: 'StakeDelegation'; value: DelegationEnumV1 }]
  >([
    { type: 'Payment', value: PaymentV1 },
    { type: 'StakeDelegation', value: DelegationEnumV1 },
  ])
);
type UserCommandV1 = { common: CommonV1; body: BodyV1 };
const UserCommandV1 = with1(
  record<UserCommandV1>({ common: CommonV1, body: BodyV1 }, ['common', 'body'])
);
type SignedCommandV1 = {
  payload: UserCommandV1;
  signer: PublicKey;
  signature: Signature;
};
const SignedCommandV1 = withBase58<SignedCommandV1>(
  with1(
    with1(
      record(
        {
          payload: UserCommandV1,
          signer: with1(PublicKey),
          signature: with1(record({ r: with1(Field), s: Scalar }, ['r', 's'])),
        },
        ['payload', 'signer', 'signature']
      )
    )
  ),
  versionBytes.signedCommandV1
);
