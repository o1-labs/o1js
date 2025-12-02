import { UInt64, SmartContract, Mina, AccountUpdate, method, Transaction } from 'o1js';

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
    let new_fee = promise.setFee(new UInt64(42));
    await new_fee.sign([feePayer.key, contractAccount.key]);
    await new_fee.send();
    // check that tx was applied, by checking nonce was incremented
    expect((await new_fee).transaction.feePayer.body.nonce).toEqual(nonce);
  });

  it('fromJSON should serialize and deserialize transaction correctly', async () => {
    // Create a transaction
    let originalTx = await Mina.transaction(feePayer, async () => {
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });

    // Serialize to JSON string
    let jsonString = originalTx.toJSON();

    // Deserialize using fromJSON with string input
    let deserializedTx = Transaction.fromJSON(jsonString);

    // Verify the deserialized transaction has the same structure
    expect(deserializedTx.transaction.feePayer.body.publicKey.x).toEqual(
      originalTx.transaction.feePayer.body.publicKey.x
    );
    expect(deserializedTx.transaction.feePayer.body.nonce).toEqual(
      originalTx.transaction.feePayer.body.nonce
    );
    expect(deserializedTx.transaction.accountUpdates.length).toEqual(
      originalTx.transaction.accountUpdates.length
    );
    expect(deserializedTx.toJSON()).toEqual(originalTx.toJSON());
  });

  it('should throw proper error for malformed JSON string input', async () => {
    // Test invalid JSON syntax
    expect(() => {
      Transaction.fromJSON('{"invalid": json}');
    }).toThrow('Failed to parse ZkappCommand from JSON string:');

    // Test valid JSON but invalid ZkappCommand structure
    expect(() => {
      Transaction.fromJSON('{"not": "a", "valid": "zkapp", "command": true}');
    }).toThrow('Failed to construct ZkappCommand from parsed JSON:');

    // Test completely malformed string
    expect(() => {
      Transaction.fromJSON('not json at all');
    }).toThrow('Failed to parse ZkappCommand from JSON string:');
  });
});
