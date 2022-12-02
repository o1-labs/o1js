import {
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  Circuit,
} from '../index.js';
import { toConstant } from './circuit_value.js';

await isReady;

class Approver extends SmartContract {
  @method approveX(update: AccountUpdate) {
    Circuit.log('previousParent', update.parent);
    console.log('previousParent undefined', update.parent === undefined);

    this.approve(update, AccountUpdate.Layout.NoChildren);
  }
}

class Caller extends SmartContract {
  @method call() {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(otherAddress);
    this.self.children.accountUpdates.push(accountUpdate);
    accountUpdate.parent = this.self; // commenting out this line makes it work

    Circuit.witness(AccountUpdate, () => {
      let approverUpdate = AccountUpdate.defaultAccountUpdate(approverAddress);
      approverUpdate.approve(
        // toConstant(AccountUpdate, accountUpdate),
        accountUpdate,
        AccountUpdate.Layout.NoChildren
      );
      return approverUpdate;
    });

    // let approver = new Approver(approverAddress);
    // approver.approveX(accountUpdate);
  }
}

// script to deploy zkapps and do interactions

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let feePayer = Local.testAccounts[0].privateKey;

let approverKey = PrivateKey.random();
let approverAddress = approverKey.toPublicKey();
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();
let otherKey = PrivateKey.random();
let otherAddress = otherKey.toPublicKey();

let zkapp = new Caller(zkappAddress);
let adderZkapp = new Approver(approverAddress);
console.log('compile (approver)');
await Approver.compile();
console.log('compile (caller)');
await Caller.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, {
    initialBalance: Mina.accountCreationFee().mul(2),
  });
  zkapp.deploy({ zkappKey });
  adderZkapp.deploy({ zkappKey: approverKey });
  AccountUpdate.create(otherAddress); // this is like "touch", to create an account
});
await tx.send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.call();
});
await tx.prove();
await tx.send();
