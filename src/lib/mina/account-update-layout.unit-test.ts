import { Mina } from '../../index.js';
import { AccountUpdate, AccountUpdateTree } from '../account-update.js';
import { UInt64 } from '../int.js';
import { SmartContract, method } from '../zkapp.js';

// smart contract which creates an account update that has a child of its own

class NestedCall extends SmartContract {
  @method deposit() {
    let payerUpdate = AccountUpdate.createSigned(this.sender);
    payerUpdate.send({ to: this.address, amount: UInt64.one });
  }

  @method depositUsingTree() {
    let payerUpdate = AccountUpdate.createSigned(this.sender);
    let receiverUpdate = AccountUpdate.create(this.address);
    payerUpdate.send({ to: receiverUpdate, amount: UInt64.one });

    let tree = AccountUpdateTree.from(payerUpdate);
    tree.approve(receiverUpdate);
    this.approve(tree);
  }
}

// setup

let Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [
  { publicKey: sender, privateKey: senderKey },
  { publicKey: zkappAddress, privateKey: zkappKey },
] = Local.testAccounts;

await NestedCall.compile();
let zkapp = new NestedCall(zkappAddress);

// deploy zkapp

await (await Mina.transaction(sender, () => zkapp.deploy()))
  .sign([zkappKey, senderKey])
  .send();

// deposit call

let balanceBefore = Mina.getBalance(zkappAddress);

let depositTx = await Mina.transaction(sender, () => zkapp.deposit());
console.log(depositTx.toPretty());
await depositTx.prove();
await depositTx.sign([senderKey]).send();

Mina.getBalance(zkappAddress).assertEquals(balanceBefore.add(1));

// deposit call using tree

balanceBefore = balanceBefore.add(1);

depositTx = await Mina.transaction(sender, () => zkapp.depositUsingTree());
console.log(depositTx.toPretty());
await depositTx.prove();
await depositTx.sign([senderKey]).send();

Mina.getBalance(zkappAddress).assertEquals(balanceBefore.add(1));
