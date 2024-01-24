import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import {
  CallForest,
  HashedAccountUpdate,
  PartialCallForest,
  hashAccountUpdate,
} from './call-forest.js';
import {
  AccountUpdate,
  CallForest as ProvableCallForest,
  TokenId,
} from '../../account_update.js';
import { TypesBigint } from '../../../bindings/mina-transaction/types.js';
import { Pickles } from '../../../snarky.js';
import {
  accountUpdatesToCallForest,
  callForestHash,
  CallForest as SimpleCallForest,
} from '../../../mina-signer/src/sign-zkapp-command.js';
import assert from 'assert';
import { Field } from '../../field.js';

// RANDOM NUMBER GENERATORS for account updates

let [, data, hashMl] = Pickles.dummyVerificationKey();
let dummyVerificationKey = { data, hash: hashMl[1] };

const accountUpdateBigint = Random.map(
  RandomTransaction.accountUpdateWithCallDepth,
  (a) => {
    // fix verification key
    if (a.body.update.verificationKey.isSome)
      a.body.update.verificationKey.value = dummyVerificationKey;
    return a;
  }
);
const accountUpdate = Random.map(accountUpdateBigint, accountUpdateFromBigint);

const arrayOf = <T>(x: Random<T>) =>
  // `reset: true` to start callDepth at 0 for each array
  Random.array(x, Random.int(20, 50), { reset: true });

const flatAccountUpdatesBigint = arrayOf(accountUpdateBigint);
const flatAccountUpdates = arrayOf(accountUpdate);

// TESTS

// correctly hashes a call forest

test.custom({ timeBudget: 1000, logFailures: false })(
  flatAccountUpdatesBigint,
  (flatUpdatesBigint) => {
    // reference: bigint callforest hash from mina-signer
    let forestBigint = accountUpdatesToCallForest(flatUpdatesBigint);
    let expectedHash = callForestHash(forestBigint);

    // convert to o1js-style list of nested `AccountUpdate`s
    let flatUpdates = flatUpdatesBigint.map(accountUpdateFromBigint);
    let updates = callForestToNestedArray(
      accountUpdatesToCallForest(flatUpdates)
    );

    let forest = CallForest.fromAccountUpdates(updates);
    forest.hash.assertEquals(expectedHash);
  }
);

// traverses a call forest in correct depth-first order

test.custom({ timeBudget: 10000, logFailures: false, minRuns: 1, maxRuns: 1 })(
  flatAccountUpdates,
  (flatUpdates) => {
    // convert to o1js-style list of nested `AccountUpdate`s
    let updates = callForestToNestedArray(
      accountUpdatesToCallForest(flatUpdates)
    );

    let forest = CallForest.fromAccountUpdates(updates);
    let tokenId = Field.random();
    let partialForest = PartialCallForest.create(forest, tokenId);

    let flatUpdates2 = ProvableCallForest.toFlatList(updates, false);

    let n = flatUpdates.length;
    for (let i = 0; i < n; i++) {
      assert.deepStrictEqual(flatUpdates2[i], flatUpdates[i]);

      let expected = flatUpdates[i];
      let actual = partialForest.next().accountUpdate;

      console.log(
        'expected: ',
        expected.body.callDepth,
        expected.body.publicKey.toBase58(),
        hashAccountUpdate(expected).toBigInt()
      );
      console.log(
        'actual:   ',
        actual.body.callDepth,
        actual.body.publicKey.toBase58(),
        hashAccountUpdate(actual).toBigInt()
      );
    }
  }
);

// HELPERS

function accountUpdateFromBigint(a: TypesBigint.AccountUpdate): AccountUpdate {
  // bigint to json, then to provable
  return AccountUpdate.fromJSON(TypesBigint.AccountUpdate.toJSON(a));
}

function callForestToNestedArray(
  forest: SimpleCallForest<AccountUpdate>
): AccountUpdate[] {
  return forest.map(({ accountUpdate, children }) => {
    accountUpdate.children.accountUpdates = callForestToNestedArray(children);
    return accountUpdate;
  });
}
