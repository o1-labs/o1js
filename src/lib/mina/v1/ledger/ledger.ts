import { PublicKey } from '../../../provable/crypto/signature.js';
import { Int64, UInt64 } from '../../../provable/int.js';
import { Field } from '../../../provable/wrapped.js';
import { AccountUpdate as AccountUpdateV2 } from '../../v2/account-update.js';
import { Account as AccountV2 } from '../../v2/account.js';
import { ZkappFeePayment } from '../../v2/transaction.js';
import { ChainView } from '../../v2/views.js';
import {
  AccountUpdateApplyResult,
  ApplyState,
  checkAndApplyAccountUpdate,
  checkAndApplyFeePayment,
} from '../../v2/zkapp-logic.js';
import { TokenId, ZkappCommand } from '../account-update.js';
import { Account as AccountV1, newAccount } from '../account.js';

export const DefaultTokenId = 1n;

export type AccountId = { publicKey: PublicKey; tokenId?: Field };

export class LocalLedger {
  _nextLocation: bigint;
  _accounts: Map<bigint, any>;
  _locations: Map<string, bigint>; // keyed by "pubkey|tokenId"

  constructor() {
    this._nextLocation = 1n;
    this._accounts = new Map<bigint, any>();
    this._locations = new Map<string, bigint>();
  }

  static create(): LocalLedger {
    return new LocalLedger();
  }

  _key(publicKey: PublicKey, tokenId: Field) {
    return `${publicKey.toBase58()}|${tokenId}`;
  }

  saveAccount(publicKey: PublicKey, account: AccountV1) {
    const location = (() => {
      const key = this._key(publicKey, TokenId.default);
      const existing = this._locations.get(key);
      if (existing === undefined) throw new Error('account with public key does not exist');
      return existing;
    })();
    this._accounts.set(location, account);
  }

  addAccount(publicKey: PublicKey, balance: bigint | number | string): void {
    const accountId = { publicKey, tokenId: TokenId.default };
    const location = (() => {
      const key = this._key(publicKey, TokenId.default);
      const existing = this._locations.get(key);
      if (existing !== undefined) throw new Error('account with public key already exists');
      const newLocation = this._nextLocation;
      this._nextLocation += 1n;
      return newLocation;
    })();

    const account = newAccount(accountId);
    account.balance = UInt64.from(balance);
    const key = this._key(publicKey, TokenId.default);
    this._locations.set(key, location);
    this._accounts.set(location, account);
  }

  getAccount(publicKey: PublicKey, tokenId: Field = TokenId.default): AccountV1 | undefined {
    const key = this._key(publicKey, tokenId);
    const location = this._locations.get(key);
    if (location === undefined) return undefined;
    return this._accounts.get(location);
  }

  getOrCreateAccount(publicKey: PublicKey, tokenId: Field = TokenId.default): AccountV1 {
    const account = this.getAccount(publicKey, tokenId);
    if (account != undefined) {
      return account;
    }

    this.addAccount(publicKey, 0);
    return this.getAccount(publicKey, tokenId)!;
  }

  applyTransaction(transaction: ZkappCommand, fee: UInt64, networkState: ChainView): void {
    const feePayerAccount = this.getAccount(transaction.feePayer.body.publicKey);
    if (!feePayerAccount) {
      throw new Error('fee payer account not found');
    }

    const feePayerAccountV2 = AccountV2.fromV1(feePayerAccount);
    const feePayerUpdate = checkAndApplyFeePayment(
      networkState,
      feePayerAccountV2,
      new ZkappFeePayment({
        publicKey: feePayerAccount.publicKey,
        nonce: feePayerAccount.nonce,
        fee,
        validUntil: transaction.feePayer.body.validUntil,
      })
    );
    if (feePayerUpdate.status == 'Failed') {
      throw new Error(`failed to apply fee payment with errors: ${feePayerUpdate.errors}`);
    }
    this.saveAccount(feePayerAccount.publicKey, feePayerUpdate.updatedAccount.toV1());

    let feeExcessState: ApplyState<Int64> = { status: 'Alive', value: Int64.zero };

    for (const update of transaction.accountUpdates) {
      const { body, authorization } = update;
      if (body.authorizationKind.isProved.toBoolean() && !authorization.proof) {
        throw Error(
          `The actual authorization does not match the expected authorization kind. Did you forget to invoke \`await tx.prove()\`?`
        );
      }
      const account = this.getOrCreateAccount(body.publicKey, body.tokenId);
      const accountUpdateV2 = AccountUpdateV2.fromInternalRepr(update.body);
      const accountV2 = AccountV2.fromV1(account);
      try {
        const applied: AccountUpdateApplyResult = checkAndApplyAccountUpdate(
          networkState,
          accountV2,
          accountUpdateV2,
          feeExcessState
        );
        if (applied.status == 'Failed') {
          throw new Error(`Failed to apply account update with errors: ${applied.errors}`);
        }
        this.saveAccount(body.publicKey, applied.updatedAccount.toV1());
        feeExcessState = applied.updatedFeeExcessState;
      } catch (e) {
        console.error(e);
        console.log(JSON.stringify(account, null, 2));
        console.log(JSON.stringify(accountV2, null, 2));
        console.log(JSON.stringify(update, null, 2));
        throw e;
      }
    }
  }
}
