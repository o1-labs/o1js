import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import { CallForest, HashedAccountUpdate } from './call-forest.js';
import {
  AccountUpdate,
  CallForest as ProvableCallForest,
} from '../../account_update.js';
import { TypesBigint } from '../../../bindings/mina-transaction/types.js';
import { Pickles } from '../../../snarky.js';
import {
  accountUpdatesToCallForest,
  callForestHash,
  CallForest as SimpleCallForest,
} from '../../../mina-signer/src/sign-zkapp-command.js';

// rng for account updates

let [, data, hashMl] = Pickles.dummyVerificationKey();
let verificationKey = { data, hash: hashMl[1] };

let accountUpdates = Random.array(
  RandomTransaction.accountUpdateWithCallDepth,
  Random.int(0, 50),
  { reset: true }
);

const callForest: Random<SimpleCallForest> = Random.map(
  accountUpdates,
  (accountUpdates) => {
    let flatUpdates = accountUpdates.map((a) => {
      // fix verification key
      if (a.body.update.verificationKey.isSome) {
        a.body.update.verificationKey.value = verificationKey;
      }
      return a;
    });
    console.log({ totalLength: flatUpdates.length });
    return accountUpdatesToCallForest(flatUpdates);
  }
);

// TESTS

// correctly hashes a call forest

test.custom({ timeBudget: 10000, logFailures: false })(
  callForest,
  (forestBigint) => {
    // reference: bigint callforest hash from mina-signer
    let expectedHash = callForestHash(forestBigint);

    // convert to o1js-style list of nested `AccountUpdate`s
    let updates = callForestToNestedArray(
      mapCallForest(forestBigint, accountUpdateFromBigint)
    );

    let forest = CallForest.fromAccountUpdates(updates);
    forest.hash.assertEquals(expectedHash);
  }
);

// HELPERS

type AbstractSimpleCallForest<A> = {
  accountUpdate: A;
  children: AbstractSimpleCallForest<A>;
}[];

function mapCallForest<A, B>(
  forest: AbstractSimpleCallForest<A>,
  mapOne: (a: A) => B
): AbstractSimpleCallForest<B> {
  return forest.map(({ accountUpdate, children }) => ({
    accountUpdate: mapOne(accountUpdate),
    children: mapCallForest(children, mapOne),
  }));
}

function accountUpdateFromBigint(a: TypesBigint.AccountUpdate): AccountUpdate {
  // bigint to json, then to provable
  return AccountUpdate.fromJSON(TypesBigint.AccountUpdate.toJSON(a));
}

function callForestToNestedArray(
  forest: AbstractSimpleCallForest<AccountUpdate>
): AccountUpdate[] {
  return forest.map(({ accountUpdate, children }) => {
    accountUpdate.children.accountUpdates = callForestToNestedArray(children);
    return accountUpdate;
  });
}
