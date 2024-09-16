import { AccountUpdate } from './account-update.js';
import { testV1V2ClassEquivalence } from './bindings-test-utils.js';
import * as TypesV1 from '../../../bindings/mina-transaction/gen/transaction.js';
import * as ValuesV1 from '../../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as JsonV1 from '../../../bindings/mina-transaction/gen/transaction-json.js';
import { jsLayout as layoutV1 } from '../../../bindings/mina-transaction/gen/js-layout.js';

const V1AccountUpdate = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate,
  ValuesV1.AccountUpdate,
  JsonV1.AccountUpdate
>(layoutV1.AccountUpdate as any /* WOOPS */);

{
  testV1V2ClassEquivalence(V1AccountUpdate, AccountUpdate.Authorized);
  // TODO: testV1V2ValueEquivalence
}

console.log("\n:)");
