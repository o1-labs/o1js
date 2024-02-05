/**
 * A ledger of accounts - simple model of a local blockchain.
 */
import { PublicKey } from '../../signature.js';
import { type AccountUpdate, TokenId } from '../../account_update.js';
import { Account, newAccount } from '../account.js';
import { Field } from '../../field.js';
import { applyAccountUpdate } from './apply.js';

export { SimpleLedger };

class SimpleLedger {
  accounts: Map<bigint, Account>;

  constructor() {
    this.accounts = new Map();
  }

  static create(): SimpleLedger {
    return new SimpleLedger();
  }

  exists({ publicKey, tokenId = TokenId.default }: InputAccountId): boolean {
    return this.accounts.has(accountId({ publicKey, tokenId }));
  }

  store(account: Account): void {
    this.accounts.set(accountId(account), account);
  }

  load({
    publicKey,
    tokenId = TokenId.default,
  }: InputAccountId): Account | undefined {
    let id = accountId({ publicKey, tokenId });
    let account = this.accounts.get(id);
    return account;
  }

  apply(update: AccountUpdate): void {
    let id = accountId(update.body);
    let account = this.accounts.get(id);
    account ??= newAccount(update.body);

    let updated = applyAccountUpdate(account, update);
    this.accounts.set(id, updated);
  }
}

type AccountId = { publicKey: PublicKey; tokenId: Field };
type InputAccountId = { publicKey: PublicKey; tokenId?: Field };

function accountId(account: AccountId): bigint {
  let id = account.publicKey.x.toBigInt();
  id <<= 1n;
  id |= BigInt(account.publicKey.isOdd.toBoolean());
  id <<= BigInt(Field.sizeInBits);
  id |= account.tokenId.toBigInt();
  return id;
}
