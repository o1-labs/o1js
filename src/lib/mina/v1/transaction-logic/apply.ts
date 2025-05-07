/**
 * Apply transactions to a ledger of accounts.
 */
import { type AccountUpdate } from '../account-update.js';
import { Account } from '../account.js';

export { applyAccountUpdate };

/**
 * Apply a single account update to update an account.
 *
 * TODO:
 * - This must receive and return some context global to the transaction, to check validity
 * - Should operate on the value / bigint type, not the provable type
 */
function applyAccountUpdate(account: Account, update: AccountUpdate): Account {
  account.publicKey.assertEquals(update.publicKey);
  account.tokenId.assertEquals(update.tokenId, 'token id mismatch');

  // clone account (TODO: do this efficiently)
  let json = Account.toJSON(account);
  account = Account.fromJSON(json);

  // update permissions
  if (update.update.permissions.isSome.toBoolean()) {
    account.permissions = update.update.permissions.value;
  }

  return account;
}
