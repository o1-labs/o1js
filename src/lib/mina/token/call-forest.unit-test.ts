import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import { CallForest, PartialCallForest } from './call-forest.js';
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

const callForest: Random<SimpleCallForest> = Random.map(
  RandomTransaction.zkappCommand,
  (txBigint) => {
    let flatUpdates = txBigint.accountUpdates.map((a) => {
      // fix verification key
      if (a.body.update.verificationKey.isSome) {
        a.body.update.verificationKey.value = verificationKey;
      }
      return a;
    });
    return accountUpdatesToCallForest(flatUpdates);
  }
);

// tests begin here

test.custom({ timeBudget: 10000 })(callForest, (forestBigint) => {
  // reference: bigint callforest hash from mina-signer
  let stackHash = callForestHash(forestBigint);

  let updates = callForestToNestedArray(
    mapCallForest(forestBigint, accountUpdateFromBigint)
  );

  console.log({ length: updates.length });

  let dummyParent = AccountUpdate.dummy();
  dummyParent.children.accountUpdates = updates;

  let hash = ProvableCallForest.hashChildren(dummyParent);
  hash.assertEquals(stackHash);

  let forest = CallForest.fromAccountUpdates(updates);
});

// call forest helpers

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
