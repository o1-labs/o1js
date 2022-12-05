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

class Caller extends SmartContract {
  @method call() {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(otherAddress);

    /**
     * this is the code that causes bug:
     *
     * this.approve(accountUpdate) // creates child
     * Approver.approve(accountUpdate) // removes child, but *only in witness block* --> prove/compile discrepancy
     *
     * two problems:
     *
     * - calling a method can mutate our own children
     *   - not pure, confusing/error-prone, shouldn't be possible
     * - current API doesn't have a way to "declare" that we don't want the created accountUpdate as a child
     *   - option to AccountUpdate.create?
     *   - it's implicit in wanting to approve update by another contract, that we don't want it as a child
     *
     * quick fix solution: always remove account update from our children when we pass it into another method
     */

    this.self.children.accountUpdates.push(accountUpdate);
    accountUpdate.parent = this.self;

    AccountUpdate.unlink(accountUpdate);
    Circuit.witness(AccountUpdate, () => {
      let approverUpdate = AccountUpdate.defaultAccountUpdate(approverAddress);
      approverUpdate.parent = this.self;
      accountUpdate.body.callDepth = approverUpdate.body.callDepth + 1;

      // change children of witnessed (approver) update -- this is fine, this is where the update enters the circuit
      approverUpdate.children.accountUpdates.push(accountUpdate);

      // change siblings of approved account update === change children of this.self
      // -- this is not fine, because there's a compile - prove discrepancy
      // solution to clone account update?
      let siblings = accountUpdate.parent!.children.accountUpdates;
      let i = siblings?.findIndex((update) => update.id === accountUpdate.id);
      if (i !== undefined && i !== -1) {
        siblings!.splice(i, 1);
      }

      accountUpdate.parent = approverUpdate;

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
