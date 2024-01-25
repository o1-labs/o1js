import { Bool, Int64, method, Mina, Provable, UInt64 } from '../../../index.js';
import { CallForest } from './call-forest.js';
import { TokenContract } from './token-contract.js';

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
class ExampleTokenContract extends TokenContract {
  // APPROVABLE API

  @method
  approveUpdates(updates: CallForest) {
    let totalBalanceChange = Int64.zero;

    this.forEachUpdate(updates, (accountUpdate, usesToken) => {
      totalBalanceChange = totalBalanceChange.add(
        Provable.if(usesToken, accountUpdate.balanceChange, Int64.zero)
      );
    });

    // prove that the total balance change is zero
    totalBalanceChange.assertEquals(0);
  }

  // BELOW: example implementation specific to this token

  // constant supply
  SUPPLY = UInt64.from(10n ** 18n);

  @method
  init() {
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

// TESTS

ExampleTokenContract.analyzeMethods({ printSummary: true });

console.time('compile');
await ExampleTokenContract.compile();
console.timeEnd('compile');
