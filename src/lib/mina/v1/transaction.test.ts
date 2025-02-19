import { UInt64, SmartContract, Mina, AccountUpdate, method } from 'o1js';

class MyContract extends SmartContract {
  @method async shouldMakeCompileThrow() {
    this.network.blockchainLength.get();
  }
}

let contractAccount: Mina.TestPublicKey;
let contract: MyContract;
let feePayer: Mina.TestPublicKey;

describe('transactions', () => {
  beforeAll(async () => {
    // set up local blockchain, create contract account keys, deploy the contract
    let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    [feePayer] = Local.testAccounts;

    contractAccount = Mina.TestPublicKey.random();
    contract = new MyContract(contractAccount);

    let tx = await Mina.transaction(feePayer, async () => {
      AccountUpdate.fundNewAccount(feePayer);
      await contract.deploy();
    });
    tx.sign([feePayer.key, contractAccount.key]).send();
  });

  it('setFee should not change nonce', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    let nonce = tx.transaction.feePayer.body.nonce;
    let promise = await tx.sign([feePayer.key, contractAccount.key]).send();
    let new_fee = await promise.setFee(new UInt64(100));
    new_fee.sign([feePayer.key, contractAccount.key]);
    // second send is rejected for using the same nonce
    await expect(new_fee.send()).rejects.toThrowError('Account_nonce_precondition_unsatisfied');
    // check that tx was applied, by checking nonce was incremented
    expect(new_fee.transaction.feePayer.body.nonce).toEqual(nonce);
  });

  it('Second tx should work when first not sent', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    let nonce = tx.transaction.feePayer.body.nonce;
    let promise = tx.sign([feePayer.key, contractAccount.key]);
    let new_fee = promise.setFeePerSnarkCost(42.7);
    await new_fee.sign([feePayer.key, contractAccount.key]);
    await new_fee.send();
    // check that tx was applied, by checking nonce was incremented
    expect((await new_fee).transaction.feePayer.body.nonce).toEqual(nonce);
  });
});
