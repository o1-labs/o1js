import {
  PrivateKey,
  Nullifier,
  Field,
  SmartContract,
  state,
  State,
  method,
  MerkleMap,
  Circuit,
  MerkleMapWitness,
  Mina,
  AccountUpdate,
  Poseidon,
  Scalar,
} from 'snarkyjs';

import { createNullifier } from '../mina-signer/src/nullifier.js';

class PayoutOnlyOnce extends SmartContract {
  @state(Field) nullifierRoot = State<Field>();
  @state(Field) nullifierMessage = State<Field>();

  @method payout(nullifier: Nullifier) {
    let nullifierRoot = this.nullifierRoot.getAndAssertEquals();
    let nullifierMessage = this.nullifierMessage.getAndAssertEquals();

    // verify the nullifier
    nullifier.verify([nullifierMessage]);

    let nullifierWitness = Circuit.witness(MerkleMapWitness, () =>
      NullifierTree.getWitness(nullifier.key())
    );

    // we compute the current root and make sure the entry is set to 0 (= unused)
    nullifier.assertUnused(nullifierWitness, nullifierRoot);

    // we set the nullifier to 1 (= used) and calculate the new root
    let newRoot = nullifier.setUsed(nullifierWitness);

    // we update the on-chain root
    this.nullifierRoot.set(newRoot);

    // we pay out a reward
    let balance = this.account.balance.getAndAssertEquals();

    let halfBalance = balance.div(2);
    // finally, we send the payout to the public key associated with the nullifier
    this.send({ to: nullifier.getPublicKey(), amount: halfBalance });
  }
}

const NullifierTree = new MerkleMap();

let Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// a special account that is allowed to pull out half of the zkapp balance, once
let privilegedKey = PrivateKey.random();
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let zkapp = new PayoutOnlyOnce(zkappAddress);

// a unique message
let nullifierMessage = Field(5);

console.log('compile');
await PayoutOnlyOnce.compile();

console.log('deploy');
let tx = await Mina.transaction(sender, () => {
  let senderUpdate = AccountUpdate.fundNewAccount(sender);
  senderUpdate.send({ to: zkappAddress, amount: initialBalance });
  zkapp.deploy({ zkappKey });

  zkapp.nullifierRoot.set(NullifierTree.getRoot());
  zkapp.nullifierMessage.set(nullifierMessage);
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log(`zkapp balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('generating nullifier');

let jsonNullifier = createNullifier(
  [nullifierMessage.toBigInt()],
  BigInt(privilegedKey.s.toJSON())
);

console.log('pay out');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkapp.payout(Nullifier.fromJSON(jsonNullifier));
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log(`zkapp balance: ${zkapp.account.balance.get().div(1e9)} MINA`);
console.log(
  `user balance: ${Mina.getAccount(privilegedAddress).balance.div(1e9)} MINA`
);

console.log('trying second pay out');

try {
  tx = await Mina.transaction(sender, () => {
    zkapp.payout(Nullifier.fromJSON(jsonNullifier));
  });

  await tx.prove();
  await tx.sign([senderKey]).send();
} catch (error: any) {
  console.log(
    'transaction failed, as expected! received the following error message:'
  );
  console.log(error.message);
}
