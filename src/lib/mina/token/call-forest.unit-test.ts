import { Random, test } from '../../testing/property.js';
import { RandomTransaction } from '../../../mina-signer/src/random-transaction.js';
import { CallForest, PartialCallForest } from './call-forest.js';
import { AccountUpdate, ZkappCommand } from '../../account_update.js';
import { TypesBigint } from '../../../bindings/mina-transaction/types.js';
import { Pickles } from '../../../snarky.js';
import { Field } from '../../../lib/core.js';

// rng for account updates

let [, data, hashMl] = Pickles.dummyVerificationKey();
let verificationKey = { data, hash: Field(hashMl) };

const accountUpdates = Random.map(
  RandomTransaction.zkappCommand,
  (txBigint) => {
    // bigint to json, then to provable
    let txJson = TypesBigint.ZkappCommand.toJSON(txBigint);

    let accountUpdates = txJson.accountUpdates.map((aJson) => {
      let a = AccountUpdate.fromJSON(aJson);

      // fix verification key
      if (a.body.update.verificationKey.isSome) {
        a.body.update.verificationKey.value = verificationKey;
      }
      return a;
    });

    return accountUpdates;
  }
);

// tests begin here

test.custom({ timeBudget: 10000 })(accountUpdates, (updates) => {
  console.log({ length: updates.length });

  CallForest.fromAccountUpdates(updates);
});
