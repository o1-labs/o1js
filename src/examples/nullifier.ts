import {
  Nullifier,
  Field,
  SmartContract,
  state,
  State,
  method,
  MerkleMap,
  MerkleMapWitness,
  Mina,
  AccountUpdate,
  Provable,
} from 'o1js';

class PayoutOnlyOnce extends SmartContract {
  @state(Field) nullifierRoot = State<Field>();
  @state(Field) nullifierMessage = State<Field>();

  @method async payout(nullifier: Nullifier) {
    let nullifierRoot = this.nullifierRoot.getAndRequireEquals();
    let nullifierMessage = this.nullifierMessage.getAndRequireEquals();

    // verify the nullifier
    nullifier.verify([nullifierMessage]);

    let nullifierWitness = Provable.witness(MerkleMapWitness, () =>
      NullifierTree.getWitness(nullifier.key())
    );

    // we compute the current root and make sure the entry is set to 0 (= unused)
    nullifier.assertUnused(nullifierWitness, nullifierRoot);

    // we set the nullifier to 1 (= used) and calculate the new root
    let newRoot = nullifier.setUsed(nullifierWitness);

    // we update the on-chain root
    this.nullifierRoot.set(newRoot);

    // we pay out a reward
    let balance = this.account.balance.getAndRequireEquals();

    let halfBalance = balance.div(2);
    // finally, we send the payout to the public key associated with the nullifier
    this.send({ to: nullifier.getPublicKey(), amount: halfBalance });
  }
}

const NullifierTree = new MerkleMap();

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the contract
let [sender] = Local.testAccounts;

// the contract account
let contractAccount = Mina.TestPublicKey.random();

// a special account that is allowed to pull out half of the contract balance, once
let privileged = Mina.TestPublicKey.random();

let initialBalance = 10_000_000_000;
let contract = new PayoutOnlyOnce(contractAccount);

// a unique message
let nullifierMessage = Field(5);

console.log('compile');
await PayoutOnlyOnce.compile();

console.log('deploy');
let tx = await Mina.transaction(sender, async () => {
  let senderUpdate = AccountUpdate.fundNewAccount(sender);
  senderUpdate.send({ to: contractAccount, amount: initialBalance });
  await contract.deploy();

  contract.nullifierRoot.set(NullifierTree.getRoot());
  contract.nullifierMessage.set(nullifierMessage);
});
await tx.prove();
await tx.sign([sender.key, contractAccount.key]).send();

console.log(`contract balance: ${contract.account.balance.get().div(1e9)} MINA`);

console.log('generating nullifier');

let jsonNullifier = Nullifier.createTestNullifier([nullifierMessage], privileged.key);
console.log(jsonNullifier);

console.log('pay out');
tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await contract.payout(Nullifier.fromJSON(jsonNullifier));
});
await tx.prove();
await tx.sign([sender.key]).send();

console.log(`zkapp balance: ${contract.account.balance.get().div(1e9)} MINA`);
console.log(`user balance: ${Mina.getAccount(privileged).balance.div(1e9)} MINA`);

console.log('trying second pay out');

try {
  tx = await Mina.transaction(sender, async () => {
    await contract.payout(Nullifier.fromJSON(jsonNullifier));
  });

  await tx.prove();
  await tx.sign([sender.key]).send();
} catch (error: any) {
  console.log('transaction failed, as expected! received the following error message:');
  console.log(error.message);
}
