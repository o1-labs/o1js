import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import { TokenAccountUpdateIterator } from './forest-iterator.js';
import {
  AccountUpdate,
  AccountUpdateForest,
  TokenId,
  hashAccountUpdate,
} from '../account-update.js';
import { TypesBigint } from '../../../bindings/mina-transaction/types.js';
import { Pickles, initializeBindings } from '../../../snarky.js';
import {
  accountUpdatesToCallForest,
  callForestHash,
} from '../../../mina-signer/src/sign-zkapp-command.js';
import assert from 'assert';
import { Field, Bool } from '../../provable/wrapped.js';
import { PublicKey } from '../../provable/crypto/signature.js';

// RANDOM NUMBER GENERATORS for account updates

await initializeBindings();
let [, data, hashMl] = Pickles.dummyVerificationKey();
let dummyVerificationKey = { data, hash: hashMl[1] };

const accountUpdateBigint = Random.map(
  RandomTransaction.accountUpdateWithCallDepth,
  (a) => {
    // fix verification key
    if (a.body.update.verificationKey.isSome)
      a.body.update.verificationKey.value = dummyVerificationKey;

    // ensure that, by default, all account updates are token-accessible
    a.body.mayUseToken =
      a.body.callDepth === 0
        ? { parentsOwnToken: true, inheritFromParent: false }
        : { parentsOwnToken: false, inheritFromParent: true };
    return a;
  }
);
const accountUpdate = Random.map(accountUpdateBigint, accountUpdateFromBigint);

const arrayOf = <T>(x: Random<T>) =>
  // `reset: true` to start callDepth at 0 for each array
  Random.array(x, Random.int(10, 40), { reset: true });

const flatAccountUpdatesBigint = arrayOf(accountUpdateBigint);
const flatAccountUpdates = arrayOf(accountUpdate);

// TESTS

// correctly hashes a call forest

test.custom({ timeBudget: 1000 })(
  flatAccountUpdatesBigint,
  (flatUpdatesBigint) => {
    // reference: bigint callforest hash from mina-signer
    let forestBigint = accountUpdatesToCallForest(flatUpdatesBigint);
    let expectedHash = callForestHash(forestBigint, 'testnet');

    let flatUpdates = flatUpdatesBigint.map(accountUpdateFromBigint);
    let forest = AccountUpdateForest.fromFlatArray(flatUpdates);
    forest.hash.assertEquals(expectedHash);
  }
);

// traverses the top level of a call forest in correct order
// i.e., CallForestArray works

test.custom({ timeBudget: 1000 })(flatAccountUpdates, (flatUpdates) => {
  // prepare call forest from flat account updates
  let forest =
    AccountUpdateForest.fromFlatArray(flatUpdates).startIteratingFromLast();
  let updates = flatUpdates.filter((u) => u.body.callDepth === 0);

  // step through top-level by calling forest.next() repeatedly
  let n = updates.length;
  for (let i = 0; i < n; i++) {
    let expected = updates[i];
    let actual = forest.previous().accountUpdate.unhash();
    assertEqual(actual, expected);
  }

  // doing next() again should return a dummy
  let actual = forest.previous().accountUpdate.unhash();
  assertEqual(actual, AccountUpdate.dummy());
});

// traverses a call forest in correct depth-first order,
// when no subtrees are skipped

test.custom({ timeBudget: 5000 })(flatAccountUpdates, (flatUpdates) => {
  // with default token id, no subtrees will be skipped
  let tokenId = TokenId.default;

  // prepare forest iterator from flat account updates
  let forest = AccountUpdateForest.fromFlatArray(flatUpdates);
  let forestIterator = TokenAccountUpdateIterator.create(forest, tokenId);

  // step through forest iterator and compare against expected updates
  let expectedUpdates = flatUpdates;

  let n = flatUpdates.length;
  for (let i = 0; i < n; i++) {
    let expected = expectedUpdates[i];
    let actual = forestIterator.next().accountUpdate;
    assertEqual(actual, expected);
  }

  // doing next() again should return a dummy
  let actual = forestIterator.next().accountUpdate;
  assertEqual(actual, AccountUpdate.dummy());
});

// correctly skips subtrees for various reasons

// in this test, we make all updates inaccessible by setting the top level to `no` or `inherit`, or to the token owner
// this means we wouldn't need to traverse any update in the whole tree
// but we only notice inaccessibility when we have already traversed the inaccessible update
// so, the result should be that we traverse the top level and nothing else
test.custom({ timeBudget: 5000 })(
  flatAccountUpdates,
  Random.publicKey,
  (flatUpdates, publicKey) => {
    // create token owner and derive token id
    let tokenOwner = PublicKey.fromObject({
      x: Field.from(publicKey.x),
      isOdd: Bool(!!publicKey.isOdd),
    });
    let tokenId = TokenId.derive(tokenOwner);

    // make all top-level updates inaccessible
    flatUpdates
      .filter((u) => u.body.callDepth === 0)
      .forEach((u, i) => {
        if (i % 3 === 0) {
          u.body.mayUseToken = AccountUpdate.MayUseToken.No;
        } else if (i % 3 === 1) {
          u.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
        } else {
          u.body.publicKey = tokenOwner;
          u.body.tokenId = TokenId.default;
        }
      });

    // prepare forest iterator from flat account updates
    let forest = AccountUpdateForest.fromFlatArray(flatUpdates);
    let forestIterator = TokenAccountUpdateIterator.create(forest, tokenId);

    // step through forest iterator and compare against expected updates
    let expectedUpdates = flatUpdates.filter((u) => u.body.callDepth === 0);

    let n = flatUpdates.length;
    for (let i = 0; i < n; i++) {
      let expected = expectedUpdates[i] ?? AccountUpdate.dummy();
      let actual = forestIterator.next().accountUpdate;
      assertEqual(actual, expected);
    }
  }
);

// similar to the test before, but now we make all updates in the second layer inaccessible
// so the iteration should walk through the first and second layer
test.custom({ timeBudget: 5000 })(
  flatAccountUpdates,
  Random.publicKey,
  (flatUpdates, publicKey) => {
    // create token owner and derive token id
    let tokenOwner = PublicKey.fromObject({
      x: Field.from(publicKey.x),
      isOdd: Bool(!!publicKey.isOdd),
    });
    let tokenId = TokenId.derive(tokenOwner);

    // make all second-level updates inaccessible
    flatUpdates
      .filter((u) => u.body.callDepth === 1)
      .forEach((u, i) => {
        if (i % 3 === 0) {
          u.body.mayUseToken = AccountUpdate.MayUseToken.No;
        } else if (i % 3 === 1) {
          u.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;
        } else {
          u.body.publicKey = tokenOwner;
          u.body.tokenId = TokenId.default;
        }
      });

    // prepare forest iterator from flat account updates
    let forest = AccountUpdateForest.fromFlatArray(flatUpdates);
    let forestIterator = TokenAccountUpdateIterator.create(forest, tokenId);

    // step through forest iterator and compare against expected updates
    let expectedUpdates = flatUpdates.filter((u) => u.body.callDepth <= 1);

    let n = flatUpdates.length;
    for (let i = 0; i < n; i++) {
      let expected = expectedUpdates[i] ?? AccountUpdate.dummy();
      let actual = forestIterator.next().accountUpdate;
      assertEqual(actual, expected);
    }
  }
);

// HELPERS

function accountUpdateFromBigint(a: TypesBigint.AccountUpdate): AccountUpdate {
  // bigint to json, then to provable
  return AccountUpdate.fromJSON(TypesBigint.AccountUpdate.toJSON(a));
}

function assertEqual(actual: AccountUpdate, expected: AccountUpdate) {
  let actualHash = hashAccountUpdate(actual).toBigInt();
  let expectedHash = hashAccountUpdate(expected).toBigInt();

  assert.deepStrictEqual(actual.body, expected.body);
  assert.deepStrictEqual(
    actual.authorization.proof,
    expected.authorization.proof
  );
  assert.deepStrictEqual(
    actual.authorization.signature,
    expected.authorization.signature
  );
  assert.deepStrictEqual(actualHash, expectedHash);
}
