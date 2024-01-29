import {
  Bool,
  Int64,
  method,
  Mina,
  Provable,
  UInt64,
  CallForest,
  TokenContract,
} from '../../../index.js';

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
