import { Mina } from '../../../index.js';
import { AccountUpdate, AccountUpdateTree } from './account-update.js';
import { UInt64 } from '../../provable/int.js';
import { SmartContract, method } from './zkapp.js';

// smart contract which creates an account update that has a child of its own

class NestedCall extends SmartContract {
  @method async deposit() {
    let sender = this.sender.getUnconstrained();
    let payerUpdate = AccountUpdate.createSigned(sender);
    payerUpdate.send({ to: this.address, amount: UInt64.one });
  }

  @method async depositUsingTree() {
    let sender = this.sender.getUnconstrained();
    let payerUpdate = AccountUpdate.createSigned(sender);
    let receiverUpdate = AccountUpdate.create(this.address);
    payerUpdate.send({ to: receiverUpdate, amount: UInt64.one });

    let tree = AccountUpdateTree.from(payerUpdate);
    tree.approve(receiverUpdate);
    this.approve(tree);
  }
}

// setup

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [sender, contractAccount] = Local.testAccounts;

await NestedCall.compile();
let contract = new NestedCall(contractAccount);

await (await Mina.transaction(sender, () => contract.deploy()))
  .sign([contractAccount.key, sender.key])
  .send();

// deposit call

let balanceBefore = Mina.getBalance(contractAccount);

let depositTx = await Mina.transaction(sender, () => contract.deposit());
console.log(depositTx.toPretty());
await depositTx.prove();
await depositTx.sign([sender.key]).send();

Mina.getBalance(contractAccount).assertEquals(balanceBefore.add(1));

// deposit call using tree

balanceBefore = balanceBefore.add(1);

depositTx = await Mina.transaction(sender, () => contract.depositUsingTree());
console.log(depositTx.toPretty());
await depositTx.prove();
await depositTx.sign([sender.key]).send();

Mina.getBalance(contractAccount).assertEquals(balanceBefore.add(1));
