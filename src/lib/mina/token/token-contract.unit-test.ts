import assert from 'node:assert';
import {
  method,
  Mina,
  UInt64,
  AccountUpdate,
  AccountUpdateForest,
  TokenContract,
  Int64,
  PrivateKey,
} from '../../../index.js';

class ExampleTokenContract extends TokenContract {
  // APPROVABLE API

  @method
  async approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }

  // constant supply
  SUPPLY = UInt64.from(10n ** 18n);

  @method
  async init() {
    super.init();

    // mint the entire supply to the token account with the same address as this contract
    this.internal.mint({ address: this.address, amount: this.SUPPLY });
  }
}

// TESTS

let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

let [sender, other] = Local.testAccounts;

let { publicKey: tokenAddress, privateKey: tokenKey } =
  PrivateKey.randomKeypair();
let token = new ExampleTokenContract(tokenAddress);
let tokenId = token.deriveTokenId();

// deploy token contract
let deployTx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender, 2);
  await token.deploy();
});
await deployTx.prove();
await deployTx.sign([tokenKey, sender.key]).send();

assert(
  Mina.getAccount(tokenAddress).zkapp?.verificationKey !== undefined,
  'token contract deployed'
);

// can transfer tokens between two accounts
let transferTx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await token.transfer(tokenAddress, other, UInt64.one);
});
await transferTx.prove();
await transferTx.sign([tokenKey, sender.key]).send();

Mina.getBalance(other, tokenId).assertEquals(UInt64.one);

// fails to approve a deep account update tree with correct token permissions, but a non-zero balance sum
let update1 = AccountUpdate.create(other);
update1.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

let update2 = AccountUpdate.create(other);
update2.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
update2.body.callDepth = 1;

let update3 = AccountUpdate.create(other, tokenId);
update3.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
update3.balanceChange = Int64.one;
update3.body.callDepth = 2;

let forest = AccountUpdateForest.fromFlatArray([update1, update2, update3]);

await assert.rejects(
  () => Mina.transaction(sender, () => token.approveBase(forest)),
  /Field\.assertEquals\(\): 1 != 0/
);

// succeeds to approve deep account update tree with zero balance sum
let update4 = AccountUpdate.createSigned(other, tokenId);
update4.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
update4.balanceChange = Int64.minusOne;
update4.body.callDepth = 2;

forest = AccountUpdateForest.fromFlatArray([
  update1,
  update2,
  update3,
  update4,
]);

let approveTx = await Mina.transaction(sender, () => token.approveBase(forest));
await approveTx.prove();
await approveTx.sign([sender.key, other.key]).send();
