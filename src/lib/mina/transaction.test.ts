import {
  UInt64,
  SmartContract,
  Mina,
  AccountUpdate,
  method,
} from 'o1js';

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
    let new_fee = promise.setFee(new UInt64(100));
    new_fee.sign([feePayer.key,contractAccount.key]);
    //expect((async () => await new_fee.send())).toThrowError("Transaction verification failed: Cannot update field 'incrementNonce' because permission for this field is 'Signature', but the required authorization was not provided or is invalid.");
    // check that tx was applied, by checking nonce was incremented
    expect((await new_fee).transaction.feePayer.body.nonce).toEqual(nonce);
  });

  it('Second tx should work when first not sent', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    let nonce = tx.transaction.feePayer.body.nonce;
    let promise = tx.sign([feePayer.key, contractAccount.key]);
    let new_fee = promise.setFee(new UInt64(100));
    await new_fee.sign([feePayer.key,contractAccount.key]).prove();
    await new_fee.send();
    // check that tx was applied, by checking nonce was incremented
    expect((await new_fee).transaction.feePayer.body.nonce).toEqual(nonce);
  });
});
