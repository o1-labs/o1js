import { Signed } from '../dist/node/mina-signer/src/transaction-hash.js';
import { DelegationJson, PaymentJson } from './sign-legacy.js';
import { Random, sample } from '../../lib/testing/property.js';
import {
  PublicKey,
  ZkappCommand,
} from '../../provable/gen/transaction-bigint.js';

export { RandomTransaction };

let { record } = Random;

// legacy transactions
const common = record({
  fee: Random.map(Random.uint32, (x) => (x * BigInt(1e9)).toString()),
  feePayer: Random.json.publicKey,
  nonce: Random.json.uint32,
  validUntil: Random.json.uint32,
  memo: Random.string(Random.nat(32)),
});

const payment = record<Signed<PaymentJson>>({
  data: record({
    common,
    body: record({
      source: Random.json.publicKey,
      receiver: Random.json.publicKey,
      amount: Random.json.uint64,
    }),
  }),
  signature: Random.json.signature,
});

const delegation = record<Signed<DelegationJson>>({
  data: record({
    common,
    body: record({
      delegator: Random.json.publicKey,
      newDelegate: Random.json.publicKey,
    }),
  }),
  signature: Random.json.signature,
});

// zkapp transactions
// generator for { feePayer, accountUpdates, memo } with 2 modifications

// modification 1: call depth

// call depth starts from 0, can increase by at most one, decrease by any amount up to 0
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
let useFeePayerKey = Random.map(Random.dice(3), (x) => x === 0);
let accountUpdateFrom = Random.dependent(
  accountUpdate,
  useFeePayerKey,
  (feePayer: PublicKey, [accountUpdate, useFeePayerKey]) => {
    if (useFeePayerKey) accountUpdate.body.publicKey = feePayer;
    return accountUpdate;
  }
);

let size = Random.nat(20);
// reset: true makes call depth start from 0 again at the start of each sampled array
let accountUpdatesFrom = Random.array(accountUpdateFrom, size, { reset: true });

let zkappCommand: Random<ZkappCommand> = Random.map(
  Random.feePayer,
  accountUpdatesFrom,
  Random.memo,
  (feePayer, accountUpdatesFrom, memo) => {
    let accountUpdates = accountUpdatesFrom.map((from) =>
      from(feePayer.body.publicKey)
    );
    return { feePayer, accountUpdates, memo };
  }
);

const RandomTransaction = { payment, delegation, zkappCommand };

// console.dir(
//   sample(zkappCommand, 10).map(({ feePayer, accountUpdates }) =>
//     accountUpdates.map((a) => [
//       a.body.callDepth,
//       PublicKey.equal(a.body.publicKey, feePayer.body.publicKey),
//     ])
//   ),
//   { depth: Infinity }
// );
