import { Bool } from '../../core.js';
import { UInt64, Int64 } from '../../int.js';
import { Provable } from '../../provable.js';
import { PublicKey } from '../../signature.js';
import {
  AccountUpdate,
  AccountUpdateForest,
  CallForestUnderConstruction,
  AccountUpdateTree,
  HashedAccountUpdate,
  Permissions,
  smartContractContext,
} from '../../account_update.js';
import { DeployArgs, SmartContract } from '../../zkapp.js';
import { TokenAccountUpdateIterator } from './forest-iterator.js';

export { TokenContract };

// it's fine to have this restriction, because the protocol also has a limit of ~20
// TODO find out precise protocol limit
const MAX_ACCOUNT_UPDATES = 20;

/**
 * Base token contract which
 * - implements the `Approvable` API with some easy bit left to be defined by subclasses
 * - implements the `Transferable` API as a wrapper around the `Approvable` API
 */
abstract class TokenContract extends SmartContract {
  // change default permissions - important that token contracts use an access permission

  deploy(args?: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
    });
  }

  // APPROVABLE API has to be specified by subclasses,
  // but the hard part is `forEachUpdate()`

  abstract approveBase(forest: AccountUpdateForest): void;

  /**
   * Iterate through the account updates in `updates` and apply `callback` to each.
   *
   * This method is provable and is suitable as a base for implementing `approveUpdates()`.
   */
  forEachUpdate(
    updates: AccountUpdateForest,
    callback: (update: AccountUpdate, usesToken: Bool) => void
  ) {
    let forest = TokenAccountUpdateIterator.create(updates, this.token.id);

    // iterate through the forest and apply user-defined logc
    for (let i = 0; i < MAX_ACCOUNT_UPDATES; i++) {
      let { accountUpdate, usesThisToken } = forest.next();
      callback(accountUpdate, usesThisToken);
    }

    // prove that we checked all updates
    forest.assertFinished(
      `Number of account updates to approve exceed ` +
        `the supported limit of ${MAX_ACCOUNT_UPDATES}.\n`
    );

    // skip hashing our child account updates in the method wrapper
    // since we just did that in the loop above
    this.self.children.callsType = {
      type: 'WitnessEquals',
      value: updates.hash,
    };

    // make top-level updates our children
    Provable.asProver(() => {
      updates.data.get().forEach((update) => {
        this.self.adopt(update.element.accountUpdate.value.get());
      });
    });
  }

  /**
   * Use `forEachUpdate()` to prove that the total balance change of child account updates is zero.
   *
   * This is provided out of the box as it is both a good example, and probably the most common implementation, of `approveUpdates()`.
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
  approveAccountUpdate(accountUpdate: AccountUpdate) {
    let forest = finalizeAccountUpdates([accountUpdate]);
    this.approveBase(forest);
  }

  /**
   * Approve a list of account updates (with arbitrarily many children).
   */
  approveAccountUpdates(accountUpdates: AccountUpdate[]) {
    let forest = finalizeAccountUpdates(accountUpdates);
    this.approveBase(forest);
  }

  // TRANSFERABLE API - simple wrapper around Approvable API

  /**
   * Transfer `amount` of tokens from `from` to `to`.
   */
  transferFrom(
    from: PublicKey | AccountUpdate,
    to: PublicKey | AccountUpdate,
    amount: UInt64
  ) {
    // coerce the inputs to AccountUpdate and pass to `approveUpdates()`
    let tokenId = this.token.id;
    if (from instanceof PublicKey) {
      from = AccountUpdate.defaultAccountUpdate(from, tokenId);
      from.requireSignature();
      from.label = `${this.constructor.name}.transfer() (from)`;
    }
    if (to instanceof PublicKey) {
      to = AccountUpdate.defaultAccountUpdate(to, tokenId);
      to.label = `${this.constructor.name}.transfer() (to)`;
    }

    from.balanceChange = Int64.from(amount).neg();
    to.balanceChange = Int64.from(amount);

    let forest = finalizeAccountUpdates([from, to]);
    this.approveBase(forest);
  }

  /**
   * Transfer `amount` of tokens from this.sender to `to`
   */
  transfer(to: PublicKey | AccountUpdate, amount: UInt64) {
    this.transferFrom(this.sender, to, amount);
  }
}

function finalizeAccountUpdates(updates: AccountUpdate[]): AccountUpdateForest {
  let trees = updates.map(finalizeAccountUpdate);
  return AccountUpdateForest.from(trees);
}

function finalizeAccountUpdate(update: AccountUpdate): AccountUpdateTree {
  let calls: AccountUpdateForest;

  let insideContract = smartContractContext.get();
  if (insideContract) {
    let node = insideContract.selfCalls.value.find(
      (c) => c.accountUpdate.value.id === update.id
    );
    if (node !== undefined) {
      calls = CallForestUnderConstruction.finalize(node.calls);
    }
  }
  calls ??= AccountUpdateForest.fromArray(update.children.accountUpdates);
  AccountUpdate.unlink(update);

  return { accountUpdate: HashedAccountUpdate.hash(update), calls };
}