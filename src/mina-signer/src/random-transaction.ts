import { SignedLegacy } from './transaction-hash.js';
import { DelegationJson, PaymentJson } from './sign-legacy.js';
import { Random } from '../../lib/testing/property.js';
import {
  PublicKey,
  ZkappCommand,
} from '../../bindings/mina-transaction/gen/transaction-bigint.js';
import { PrivateKey } from './curve-bigint.js';
import { Signature } from './signature.js';
import { NetworkId } from './types.js';

export { RandomTransaction };

let { record } = Random;

// legacy transactions
const common = record({
  fee: Random.map(Random.uint32, (x) => (x * BigInt(1e9)).toString()),
  feePayer: Random.json.publicKey,
  nonce: Random.json.uint32,
  validUntil: Random.json.uint32,
  memo: Random.json.memoString,
});
const payment = record<PaymentJson>({
  common,
  body: record({
    receiver: Random.json.publicKey,
    amount: Random.json.uint64,
  }),
});
const signedPayment = record<SignedLegacy<PaymentJson>>({
  data: payment,
  signature: Random.json.signatureJson,
});

const delegation = record<DelegationJson>({
  common,
  body: record({
    newDelegate: Random.json.publicKey,
  }),
});
const signedDelegation = record<SignedLegacy<DelegationJson>>({
  data: delegation,
  signature: Random.json.signatureJson,
});

// zkapp transactions
// generator for { feePayer, accountUpdates, memo } with 2 modifications to the naive version

// modification #1: call depth
// in every list of account updates, call depth starts from 0,
// can increase by at most one, decrease by any amount up to 0.
// we increment with 1/3 chance
let incrementDepth = Random.map(Random.dice(3), (x) => x === 0);
let callDepth = Random.step(
  incrementDepth,
  Random.dice.ofSize,
  (depth, increment, diceOfSize) => {
    return increment ? depth + 1 : diceOfSize(depth + 1);
  },
  0
);
// account update with a call depth that takes valid steps
let accountUpdate = Random.map(
  Random.accountUpdate,
  callDepth,
  (accountUpdate, callDepth) => {
    accountUpdate.body.callDepth = callDepth;
    return accountUpdate;
  }
);

// modification #2: use the fee payer's public key for account updates, with 1/3 chance
// this is an important test case and won't happen by chance
let useFeePayerKey = Random.map(Random.dice(3), (x) => x === 0);
let accountUpdateFrom = Random.dependent(
  accountUpdate,
  useFeePayerKey,
  (feePayer: PublicKey, [accountUpdate, useFeePayerKey]) => {
    if (useFeePayerKey) accountUpdate.body.publicKey = feePayer;
    return accountUpdate;
  }
);
let feePayerFrom = Random.dependent(
  Random.feePayer,
  (publicKey: PublicKey, [feePayer]) => {
    feePayer.body.publicKey = publicKey;
    feePayer.authorization = Signature.toBase58(Signature.dummy());
    return feePayer;
  }
);

let size = Random.nat(20);
// reset: true makes call depth start from 0 again at the start of each sampled array
let accountUpdatesFrom = Random.array(accountUpdateFrom, size, { reset: true });

let zkappCommandFrom = Random.dependent(
  feePayerFrom,
  accountUpdatesFrom,
  Random.memo,
  (
    publicKey: PublicKey,
    [feePayerFrom, accountUpdatesFrom, memo]
  ): ZkappCommand => {
    let feePayer = feePayerFrom(publicKey);
    let accountUpdates = accountUpdatesFrom.map((from) => from(publicKey));
    return { feePayer, accountUpdates, memo };
  }
);

let zkappCommand: Random<ZkappCommand> = zkappCommandFrom(Random.publicKey);
let zkappCommandAndFeePayerKey = Random.map(
  Random.privateKey,
  zkappCommandFrom,
  (feePayerKey, zkappCommandFrom) => ({
    feePayerKey,
    zkappCommand: zkappCommandFrom(PrivateKey.toPublicKey(feePayerKey)),
  })
);

// json zkapp command, supporting invalid samples
let accountUpdateJson = Random.map.withInvalid(
  Random.json.accountUpdate,
  callDepth,
  (accountUpdate, callDepth) => {
    accountUpdate.body.callDepth = callDepth;
    return accountUpdate;
  }
);
let zkappCommandJson = Random.record({
  feePayer: Random.json.feePayer,
  accountUpdates: Random.array(accountUpdateJson, size),
  memo: Random.memo,
});

const RandomTransaction = {
  payment,
  delegation,
  signedPayment,
  signedDelegation,
  zkappCommand,
  zkappCommandAndFeePayerKey,
  zkappCommandJson,
  networkId: Random.oneOf<NetworkId[]>('testnet', 'mainnet', {
    custom: 'other',
  }),
  accountUpdateWithCallDepth: accountUpdate,
};
