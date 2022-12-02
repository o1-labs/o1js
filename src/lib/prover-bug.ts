import {
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  Circuit,
  Bool,
} from '../index.js';

await isReady;

function makeChildAccountUpdate(parent: AccountUpdate, child: AccountUpdate) {
  child.body.callDepth = parent.body.callDepth + 1;
  let wasChildAlready = parent.children.accountUpdates.find(
    (update) => update.id === child.id
  );
  // add to our children if not already here
  if (!wasChildAlready) {
    parent.children.accountUpdates.push(child);
  }
  // remove the child from the top level list / its current parent
  if (child.parent === undefined) {
    let topLevelUpdates = Mina.currentTransaction()?.accountUpdates;
    let i = topLevelUpdates?.findIndex((update) => update.id === child.id);
    if (i !== undefined && i !== -1) {
      topLevelUpdates!.splice(i, 1);
    }
  } else if (!wasChildAlready) {
    let siblings = child.parent.children.accountUpdates;
    let i = siblings?.findIndex((update) => update.id === child.id);
    if (i !== undefined && i !== -1) {
      siblings!.splice(i, 1);
    }
  }
  child.parent = parent;
}

class Caller extends SmartContract {
  @method call() {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(otherAddress);
    this.self.children.accountUpdates.push(accountUpdate);
    // accountUpdate.parent = this.self; // commenting out this line makes it work

    Circuit.witness(AccountUpdate, () => {
      let approverUpdate = AccountUpdate.defaultAccountUpdate(approverAddress);

      makeChildAccountUpdate(approverUpdate, accountUpdate);
      approverUpdate.isDelegateCall = Bool(false);
      AccountUpdate.witnessChildren(
        accountUpdate,
        AccountUpdate.Layout.NoChildren,
        { skipCheck: true }
      );
      return approverUpdate;
    });
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
console.log('compile (caller)');
await Caller.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, {
    initialBalance: Mina.accountCreationFee().mul(1),
  });
  zkapp.deploy({ zkappKey });
  AccountUpdate.create(otherAddress); // this is like "touch", to create an account
});
await tx.send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.call();
});
await tx.prove();
await tx.send();
