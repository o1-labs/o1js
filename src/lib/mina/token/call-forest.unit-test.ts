import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import {
  CallForest,
  CallForestIterator,
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
import { Field, Bool } from '../../core.js';
import { Bool as BoolB } from '../../../provable/field-bigint.js';
import { PublicKey } from '../../signature.js';

// RANDOM NUMBER GENERATORS for account updates

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
        ? { parentsOwnToken: BoolB(true), inheritFromParent: BoolB(false) }
        : { parentsOwnToken: BoolB(false), inheritFromParent: BoolB(true) };
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

// can recover flat account updates from nested updates
// this is here to assert that we compute `updates` correctly in the other tests

test(flatAccountUpdates, (flatUpdates) => {
  let updates = callForestToNestedArray(
    accountUpdatesToCallForest(flatUpdates)
  );
  let flatUpdates2 = ProvableCallForest.toFlatList(updates, false);
  let n = flatUpdates.length;
  for (let i = 0; i < n; i++) {
    assert.deepStrictEqual(flatUpdates2[i], flatUpdates[i]);
  }
});

// traverses the top level of a call forest in correct order
// i.e., CallForestArray works

test.custom({ timeBudget: 1000 })(flatAccountUpdates, (flatUpdates) => {
  // prepare call forest from flat account updates
  let updates = callForestToNestedArray(
    accountUpdatesToCallForest(flatUpdates)
  );
  let forest = CallForest.fromAccountUpdates(updates).startIterating();

  // step through top-level by calling forest.next() repeatedly
  let n = updates.length;
  for (let i = 0; i < n; i++) {
    let expected = updates[i];
    let actual = forest.next().accountUpdate.unhash();
    assertEqual(actual, expected);
  }

  // doing next() again should return a dummy
  let actual = forest.next().accountUpdate.unhash();
  assertEqual(actual, AccountUpdate.dummy());
});

// traverses a call forest in correct depth-first order,
// when no subtrees are skipped

test.custom({ timeBudget: 5000 })(flatAccountUpdates, (flatUpdates) => {
  // with default token id, no subtrees will be skipped
  let tokenId = TokenId.default;

  // prepare forest iterator from flat account updates
  let updates = callForestToNestedArray(
    accountUpdatesToCallForest(flatUpdates)
  );
  let forest = CallForest.fromAccountUpdates(updates);
  let forestIterator = CallForestIterator.create(forest, tokenId);

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

    // prepare forest iterator from flat account updates
    let updates = callForestToNestedArray(
      accountUpdatesToCallForest(flatUpdates)
    );

    // make all top-level updates inaccessible
    updates.forEach((u, i) => {
      if (i % 3 === 0) {
        u.body.mayUseToken = AccountUpdate.MayUseToken.No;
      } else if (i % 3 === 1) {
        u.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
      } else {
        u.body.publicKey = tokenOwner;
        u.body.tokenId = TokenId.default;
      }
    });

    let forest = CallForest.fromAccountUpdates(updates);
    let forestIterator = CallForestIterator.create(forest, tokenId);

    // step through forest iterator and compare against expected updates
    let expectedUpdates = updates;

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
    let updates = callForestToNestedArray(
      accountUpdatesToCallForest(flatUpdates)
    );
    let forest = CallForest.fromAccountUpdates(updates);
    let forestIterator = CallForestIterator.create(forest, tokenId);

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

function callForestToNestedArray(
  forest: SimpleCallForest<AccountUpdate>
): AccountUpdate[] {
  return forest.map(({ accountUpdate, children }) => {
    accountUpdate.children.accountUpdates = callForestToNestedArray(children);
    return accountUpdate;
  });
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