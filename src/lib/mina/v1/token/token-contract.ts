import { Bool } from '../../../provable/wrapped.js';
import { UInt64, Int64 } from '../../../provable/int.js';
import { Provable } from '../../../provable/provable.js';
import { PublicKey } from '../../../provable/crypto/signature.js';
import {
  AccountUpdate,
  AccountUpdateForest,
  AccountUpdateTree,
  Permissions,
  TokenId,
} from '../account-update.js';
import { DeployArgs, SmartContract } from '../zkapp.js';
import { TokenAccountUpdateIterator } from './forest-iterator.js';
import { tokenMethods } from './token-methods.js';

export { TokenContract };

/**
 *
 * Base token contract which
 * - implements the `Approvable` API, with the `approveBase()` method left to be defined by subclasses
 * - implements the `Transferable` API as a wrapper around the `Approvable` API
 */
abstract class TokenContract extends SmartContract {
  // change default permissions - important that token contracts use an access permission

  /** The maximum number of account updates using the token in a single
   * transaction that this contract supports. */
  static MAX_ACCOUNT_UPDATES = 9;

  /**
   * Deploys a {@link TokenContract}.
   *
   * In addition to base smart contract deployment, this adds two steps:
   * - set the `access` permission to `proofOrSignature()`, to prevent against unauthorized token operations
   *   - not doing this would imply that anyone can bypass token contract authorization and simply mint themselves tokens
   * - require the zkapp account to be new, using the `isNew` precondition.
   *   this guarantees that the access permission is set from the very start of the existence of this account.
   *   creating the zkapp account before deployment would otherwise be a security vulnerability that is too easy to introduce.
   *
   * Note that because of the `isNew` precondition, the zkapp account must not be created prior to calling `deploy()`.
   *
   * If the contract needs to be re-deployed, you can switch off this behaviour by overriding the `isNew` precondition:
   * ```ts
   * async deploy() {
   *   await super.deploy();
   *   // DON'T DO THIS ON THE INITIAL DEPLOYMENT!
   *   this.account.isNew.requireNothing();
   * }
   * ```
   */
  async deploy(args?: DeployArgs) {
    await super.deploy(args);

    // set access permission, to prevent unauthorized token operations
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
    });

    // assert that this account is new, to ensure unauthorized token operations
    // are not possible before this contract is deployed
    // see https://github.com/o1-labs/o1js/issues/1439 for details
    this.account.isNew.requireEquals(Bool(true));
  }

  /**
   * Returns the `tokenId` of the token managed by this contract.
   */
  deriveTokenId() {
    return TokenId.derive(this.address, this.tokenId);
  }

  /**
   * Helper methods to use from within a token contract.
   */
  get internal() {
    return tokenMethods(this.self);
  }

  // APPROVABLE API has to be specified by subclasses,
  // but the hard part is `forEachUpdate()`

  abstract approveBase(forest: AccountUpdateForest): Promise<void>;

  /**
   * Iterate through the account updates in `updates` and apply `callback` to each.
   *
   * This method is provable and is suitable as a base for implementing `approveUpdates()`.
   */
  forEachUpdate(
    updates: AccountUpdateForest,
    callback: (update: AccountUpdate, usesToken: Bool) => void
  ) {
    let iterator = TokenAccountUpdateIterator.create(updates, this.deriveTokenId());

    // iterate through the forest and apply user-defined logic
    for (let i = 0; i < (this.constructor as typeof TokenContract).MAX_ACCOUNT_UPDATES; i++) {
      let { accountUpdate, usesThisToken } = iterator.next();
      callback(accountUpdate, usesThisToken);
    }

    // prove that we checked all updates
    iterator.assertFinished(
      `Number of account updates to approve exceed ` +
        `the supported limit of ${
          (this.constructor as typeof TokenContract).MAX_ACCOUNT_UPDATES
        }.\n`
    );

    // skip hashing our child account updates in the method wrapper
    // since we just did that in the loop above
    this.approve(updates);
  }

  /**
   * Use `forEachUpdate()` to prove that the total balance change of child account updates is zero.
   *
   * This is provided out of the box as it is both a good example, and probably the most common implementation, of `approveBase()`.
   */
  checkZeroBalanceChange(updates: AccountUpdateForest) {
    let totalBalanceChange = Int64.zero;

    this.forEachUpdate(updates, (accountUpdate, usesToken) => {
      totalBalanceChange = totalBalanceChange.add(
        Provable.if(usesToken, accountUpdate.balanceChange, Int64.zero)
      );
    });

    // prove that the total balance change is zero
    totalBalanceChange.assertEquals(0);
  }

  /**
   * Approve a single account update (with arbitrarily many children).
   */
  async approveAccountUpdate(accountUpdate: AccountUpdate | AccountUpdateTree) {
    let forest = toForest([accountUpdate]);
    await this.approveBase(forest);
  }

  /**
   * Approve a list of account updates (with arbitrarily many children).
   */
  async approveAccountUpdates(accountUpdates: (AccountUpdate | AccountUpdateTree)[]) {
    let forest = toForest(accountUpdates);
    await this.approveBase(forest);
  }

  // TRANSFERABLE API - simple wrapper around Approvable API

  /**
   * Transfer `amount` of tokens from `from` to `to`.
   */
  async transfer(
    from: PublicKey | AccountUpdate,
    to: PublicKey | AccountUpdate,
    amount: UInt64 | number | bigint
  ) {
    // coerce the inputs to AccountUpdate and pass to `approveBase()`
    let tokenId = this.deriveTokenId();
    if (from instanceof PublicKey) {
      from = AccountUpdate.default(from, tokenId);
      from.requireSignature();
      from.label = `${this.constructor.name}.transfer() (from)`;
    }
    if (to instanceof PublicKey) {
      to = AccountUpdate.default(to, tokenId);
      to.label = `${this.constructor.name}.transfer() (to)`;
    }

    from.balanceChange = Int64.from(amount).neg();
    to.balanceChange = Int64.from(amount);

    let forest = toForest([from, to]);
    await this.approveBase(forest);
  }
}

function toForest(updates: (AccountUpdate | AccountUpdateTree)[]): AccountUpdateForest {
  let trees = updates.map((a) => (a instanceof AccountUpdate ? a.extractTree() : a));
  return AccountUpdateForest.fromReverse(trees);
}
