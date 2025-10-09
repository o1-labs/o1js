import { TokenId, ZkappCommand } from '../mina/v1/account-update.js';
import { Account, newAccount } from '../mina/v1/account.js';
import { NetworkValue } from '../mina/v1/precondition.js';
import { Account as AccountV2 } from '../mina/v2/account.js';
import { InitialApplyState, checkAndApplyAccountUpdate } from '../mina/v2/zkapp-logic.js';
import { PublicKey } from '../provable/crypto/signature.js';
import { UInt64 } from '../provable/int.js';
import { Field } from '../provable/wrapped.js';
export const DefaultTokenId = 1n;

export type AccountId = { publicKey: PublicKey; tokenId?: Field };

export class Ledger {
  _nextLocation: bigint;
  _accounts: Map<bigint, Account>;
  _locations: Map<AccountId, bigint>;

  constructor() {
    this._nextLocation = 1n;
    this._accounts = new Map<bigint, Account>();
    this._locations = new Map<AccountId, bigint>();
  }

  static create(): Ledger {
    return new Ledger();
  }

  addAccount(publicKey: PublicKey, balance: bigint | number | string): void {
    const accountId = { publicKey, tokenId: TokenId.default };
    const location = (() => {
      const existing = this._locations.get(accountId);
      if (existing !== undefined) {
        throw new Error('account with public key already exists');
      }

      const newLocation = this._nextLocation;
      this._nextLocation += 1n;

      return newLocation;
    })();

    const account = newAccount(accountId);
    account.balance = UInt64.from(balance);

    this._locations.set(accountId, location);
    this._accounts.set(location, account);
  }

  getAccount(publicKey: PublicKey, tokenId: Field = TokenId.default): Account | undefined {
    const accountId = { publicKey, tokenId };
    const location = this._locations.get(accountId);
    if (location === undefined) {
      return undefined;
    }

    return undefined;
  }

  applyTransaction(transaction: ZkappCommand, networkState: NetworkValue): void {
    for (const update of transaction.accountUpdates) {
      const { body, authorization } = update;

      if (body.authorizationKind.isProved && !authorization.proof) {
        throw Error(
          `The actual authorization does not match the expected authorization kind. Did you forget to invoke \`await tx.prove()\`?`
        );
      }

      const accountId: AccountId = { publicKey: body.publicKey, tokenId: body.tokenId };
      const account = (() => {
        const location = this._locations.get(accountId);
        if (location === undefined) {
          throw new Error('account not found');
        }

        return this._accounts.get(location);
      })();
      if (account === undefined) {
        throw new Error('account not found');
      }

      const accountV2 = AccountV2.fromGeneric(account);


      /// WIP here

      checkAndApplyAccountUpdate(networkState, accountV2, update, InitialApplyState);
    }
  }
}
