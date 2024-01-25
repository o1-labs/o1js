import { Bool } from '../../core.js';
import { UInt64 } from '../../int.js';
import { PublicKey } from '../../signature.js';
import { AccountUpdate, Permissions } from '../../account_update.js';
import { DeployArgs, SmartContract } from '../../zkapp.js';
import { CallForest, CallForestIterator } from './call-forest.js';

export { TokenContract };

// it's fine to have this restriction, because the protocol also has a limit of ~20
// TODO find out precise protocol limit
const MAX_ACCOUNT_UPDATES = 20;

/**
 * Base token contract which
 * - implements the `Approvable` API with some easy bit left to be defined by subclasses
 * - implements the `Transferable` API as a wrapper around the `Approvable` API
 */
class TokenContract extends SmartContract {
  // change default permissions - important that token contracts use an access permission

  deploy(args?: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
    });
  }

  // APPROVABLE API has to be specified by subclasses,
  // but the hard part is `approveEachUpdate()`

  approveUpdates(_: CallForest) {
    throw Error(
      'TokenContract.approveUpdates() must be implemented by subclasses'
    );
  }

  forEachUpdate(
    updates: CallForest,
    callback: (update: AccountUpdate, usesToken: Bool) => void
  ) {
    let forest = CallForestIterator.create(updates, this.token.id);

    // iterate through the forest and apply user-defined logc
    for (let i = 0; i < MAX_ACCOUNT_UPDATES; i++) {
      let { accountUpdate, usesThisToken } = forest.next();

      callback(accountUpdate, usesThisToken);

      // add update to our children
      this.self.adopt(accountUpdate);
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
  }

  // TRANSFERABLE API - simple wrapper around Approvable API

  transfer(
    from: PublicKey | AccountUpdate,
    to: PublicKey | AccountUpdate,
    amount: UInt64
  ) {
    // coerce the inputs to AccountUpdate and pass to `approveUpdates()`
    let tokenId = this.token.id;
    if (from instanceof PublicKey) {
      from = AccountUpdate.defaultAccountUpdate(from, tokenId);
    }
    if (to instanceof PublicKey) {
      to = AccountUpdate.defaultAccountUpdate(to, tokenId);
    }
    from.balance.subInPlace(amount);
    to.balance.addInPlace(amount);

    let forest = CallForest.fromAccountUpdates([from, to]);
    this.approveUpdates(forest);
  }
}
