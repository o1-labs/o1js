import assert from 'node:assert';
import {
  method,
  Mina,
  UInt64,
  AccountUpdate,
  AccountUpdateForest,
  TokenContract,
  Int64,
} from '../../../index.js';

class ExampleTokenContract extends TokenContract {
  // APPROVABLE API

  @method
  approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }

  // constant supply
  SUPPLY = UInt64.from(10n ** 18n);

  @method
  init() {
    super.init();

    // mint the entire supply to the token account with the same address as this contract
    this.token.mint({ address: this.address, amount: this.SUPPLY });

    // pay fees for opened account
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);
  }
}

// TESTS

let Local = Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

let [
  { publicKey: sender, privateKey: senderKey },
  { publicKey: tokenAddress, privateKey: tokenKey },
  { publicKey: otherAddress },
] = Local.testAccounts;

let token = new ExampleTokenContract(tokenAddress);
let tokenId = token.token.id;

// deploy token contract
let deployTx = await Mina.transaction(sender, () => token.deploy());
await deployTx.prove();
await deployTx.sign([tokenKey, senderKey]).send();

assert(
  Mina.getAccount(tokenAddress).zkapp?.verificationKey !== undefined,
  'token contract deployed'
);

// can transfer tokens between two accounts
let transferTx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  token.transfer(tokenAddress, otherAddress, UInt64.one);
});
await transferTx.prove();
await transferTx.sign([tokenKey, senderKey]).send();

Mina.getBalance(otherAddress, tokenId).assertEquals(UInt64.one);

// fails to approve a deep account update tree with correct token permissions, but a non-zero balance sum
let update1 = AccountUpdate.create(otherAddress);
update1.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

let update2 = AccountUpdate.create(otherAddress);
update2.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
update2.body.callDepth = 1;

let update3 = AccountUpdate.create(otherAddress, tokenId);
update3.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
update3.balanceChange = Int64.one;
update3.body.callDepth = 2;

let forest = AccountUpdateForest.fromFlatArray([update1, update2, update3]);

await assert.rejects(
  () => Mina.transaction(sender, () => token.approveBase(forest)),
  /Field\.assertEquals\(\): 1 != 0/
);
