/**
 * This is just two zkapps mixed together in one file, with their respective interactions bundled
 * in the same transaction, to check that this actually works.
 * -) "simple zkapp", testing state updates + events + account preconditions + child account updates
 * -) "counter rollup", testing state updates + sequence events / reducer
 */

import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  Permissions,
  DeployArgs,
  UInt32,
  Bool,
  PublicKey,
  Circuit,
  Experimental,
} from 'snarkyjs';

const doProofs = true;

await isReady;

const INCREMENT = Field(1);

let offchainStorage = {
  pendingActions: [] as Field[][],
};

class CounterZkapp extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Experimental.Reducer({ actionType: Field });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionsHash = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
    this.actionsHash.set(Experimental.Reducer.initialActionsHash);
  }

  @method incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }

  @method rollupIncrements() {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    let counter = this.counter.get();
    this.counter.assertEquals(counter);
    let actionsHash = this.actionsHash.get();
    this.actionsHash.assertEquals(actionsHash);

    // compute the new counter and hash from pending actions
    // remark: it's not feasible to pass in the pending actions as method arguments, because they have dynamic size
    let { state: newCounter, actionsHash: newActionsHash } =
      this.reducer.reduce(
        offchainStorage.pendingActions,
        // state type
        Field,
        // function that says how to apply an action
        (state: Field, _action: Field) => {
          return state.add(1);
        },
        { state: counter, actionsHash }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionsHash.set(newActionsHash);
  }
}

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  events = {
    update: Field,
    payout: UInt64,
    payoutReceiver: PublicKey,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.from(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field) {
    this.emitEvent('update', y);
    let x = this.x.get();
    this.x.assertEquals(x);
    this.x.set(x.add(y));
  }

  /**
   * This method allows a certain privileged account to claim half of the zkapp balance, but only once
   * @param caller the privileged account
   */
  @method payout(caller: PrivateKey) {
    // check that caller is the privileged account
    let callerAddress = caller.toPublicKey();
    callerAddress.assertEquals(privilegedAddress);

    // assert that the caller nonce is 0, and increment the nonce - this way, payout can only happen once
    let callerAccountUpdate = Experimental.createChildAccountUpdate(
      this.self,
      callerAddress
    );
    callerAccountUpdate.account.nonce.assertEquals(UInt32.zero);
    callerAccountUpdate.body.incrementNonce = Bool(true);

    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.assertEquals(balance);
    let halfBalance = balance.div(2);
    this.balance.subInPlace(halfBalance);
    callerAccountUpdate.balance.addInPlace(halfBalance);

    // emit some events
    this.emitEvent('payoutReceiver', callerAddress);
    this.emitEvent('payout', halfBalance);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// a special account that is allowed to pull out half of the zkapp balance, once
let privilegedKey = Local.testAccounts[1].privateKey;
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

let counterZkappKey = PrivateKey.random();
let counterZkappAddress = counterZkappKey.toPublicKey();
let counterZkapp = new CounterZkapp(counterZkappAddress);

if (doProofs) {
  console.log('compile');
  await SimpleZkapp.compile();
  await CounterZkapp.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, {
    initialBalance: Mina.accountCreationFee().add(initialBalance),
  });
  zkapp.deploy({ zkappKey });
  counterZkapp.deploy({ zkappKey: counterZkappKey });
});
await tx.send();

console.log('initial state: ' + zkapp.x.get());
console.log(`initial balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('update & dispatch increment');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(3));
  counterZkapp.incrementCounter();
  if (!doProofs) {
    zkapp.sign(zkappKey);
    counterZkapp.sign(counterZkappKey);
  }
});
if (doProofs) await tx.prove();
await tx.send();
offchainStorage.pendingActions.push([INCREMENT]);
console.log('state (on-chain): ' + counterZkapp.counter.get());
console.log('pending actions:', JSON.stringify(offchainStorage.pendingActions));

console.log('payout & rollup');
tx = await Mina.transaction(feePayer, () => {
  zkapp.payout(privilegedKey);
  counterZkapp.rollupIncrements();
  if (!doProofs) {
    zkapp.sign(zkappKey);
    counterZkapp.sign(counterZkappKey);
  }
});
if (doProofs) await tx.prove();
console.log(tx.toJSON());
await tx.send();
offchainStorage.pendingActions = [];

console.log('final state: ' + zkapp.x.get());
console.log(`final balance: ${zkapp.account.balance.get().div(1e9)} MINA`);
console.log('state (on-chain): ' + counterZkapp.counter.get());
console.log('pending actions:', JSON.stringify(offchainStorage.pendingActions));

console.log('try to payout a second time..');
tx = await Mina.transaction(feePayer, () => {
  zkapp.payout(privilegedKey);
  if (!doProofs) zkapp.sign(zkappKey);
});
try {
  if (doProofs) await tx.prove();
  await tx.send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log('try to payout to a different account..');
try {
  tx = await Mina.transaction(feePayer, () => {
    zkapp.payout(Local.testAccounts[2].privateKey);
    if (!doProofs) zkapp.sign(zkappKey);
  });
  if (doProofs) await tx.prove();
  await tx.send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log(
  `should still be the same final balance: ${zkapp.account.balance
    .get()
    .div(1e9)} MINA`
);
