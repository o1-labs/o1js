import {
  AccountUpdate,
  Bool,
  DeployArgs,
  Int64,
  method,
  Mina,
  Permissions,
  Provable,
  PublicKey,
  SmartContract,
  UInt64,
} from '../../../index.js';
import { CallForest, CallForestIterator } from './call-forest.js';

export { TransferableTokenContract };

// it's fine to have this restriction, because the protocol also has a limit of ~20
// TODO find out precise protocol limit
const MAX_ACCOUNT_UPDATES = 20;

/**
 * Attempt at a standardized token contract which seemlessly supports all of the following model use cases:
 *
 * **Transfer** { from, to, amount }, supporting the various configurations:
 *
 * - from `send: signature` to `receive: none` (classical end-user transfer)
 * - from `send: signature` to `receive: signature` (atypical end-user transfer)
 * - from `send: signature` to `receive: proof` (deposit into zkapp w/ strict setup)
 *
 * - from `send: proof` to `receive: none` (typical transfer from zkapp)
 * - from `send: proof` to `receive: signature` (transfer from zkapp to atypical end-user)
 * - from `send: proof` to `receive: proof` (transfer from zkapp to zkapp w/ strict setup)
 */
class TransferableTokenContract extends SmartContract {
  // APPROVABLE API

  @method
  approveUpdates(updatesList: CallForest) {
    let forest = CallForestIterator.create(updatesList, this.token.id);
    let totalBalanceChange = Int64.zero;

    // iterate through the forest and accumulate balance changes
    for (let i = 0; i < MAX_ACCOUNT_UPDATES; i++) {
      let { accountUpdate, usesThisToken } = forest.next();

      totalBalanceChange = totalBalanceChange.add(
        Provable.if(usesThisToken, accountUpdate.balanceChange, Int64.zero)
      );

      this.self.adopt(accountUpdate);
    }

    // prove that we checked all updates
    forest.assertFinished();

    // prove that the total balance change is zero
    totalBalanceChange.assertEquals(0);

    // skip hashing our child account updates in the method wrapper
    // since we just did that in the loop above
    this.self.children.callsType = {
      type: 'WitnessEquals',
      value: updatesList.hash,
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

  // BELOW: example implementation specific to this token

  // constant supply
  SUPPLY = UInt64.from(10n ** 18n);

  deploy(args?: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    super.init();

    // mint the entire supply to the token account with the same address as this contract
    let receiver = this.token.mint({
      address: this.address,
      amount: this.SUPPLY,
    });

    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.requireEquals(Bool(true));

    // pay fees for opened account
    this.balance.subInPlace(Mina.accountCreationFee());
  }
}
