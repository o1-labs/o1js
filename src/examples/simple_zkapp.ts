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
  Bool,
  PublicKey,
} from 'o1js';
import { getProfiler } from './utils/profiler.js';

const doProofs = true;

const beforeGenesis = UInt64.from(Date.now());

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  events = { update: Field, payout: UInt64, payoutReceiver: PublicKey };

  @method init() {
    super.init();
    this.x.set(initialState);
  }

  @method update(y: Field): Field {
    this.account.provedState.requireEquals(Bool(true));
    this.network.timestamp.requireBetween(beforeGenesis, UInt64.MAXINT());
    this.emitEvent('update', y);
    let x = this.x.get();
    this.x.requireEquals(x);
    let newX = x.add(y);
    this.x.set(newX);
    return newX;
  }

  /**
   * This method allows a certain privileged account to claim half of the zkapp balance, but only once
   * @param caller the privileged account
   */
  @method payout(caller: PrivateKey) {
    this.account.provedState.requireEquals(Bool(true));

    // check that caller is the privileged account
    let callerAddress = caller.toPublicKey();
    callerAddress.assertEquals(privilegedAddress);

    // assert that the caller account is new - this way, payout can only happen once
    let callerAccountUpdate = AccountUpdate.create(callerAddress);
    callerAccountUpdate.account.isNew.requireEquals(Bool(true));
    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.requireEquals(balance);
    let halfBalance = balance.div(2);
    this.send({ to: callerAccountUpdate, amount: halfBalance });

    // emit some events
    this.emitEvent('payoutReceiver', callerAddress);
    this.emitEvent('payout', halfBalance);
  }
}

const SimpleProfiler = getProfiler('Simple zkApp');
SimpleProfiler.start('Simple zkApp test flow');
let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// a special account that is allowed to pull out half of the zkapp balance, once
let privilegedKey = PrivateKey.fromBase58(
  'EKEeoESE2A41YQnSht9f7mjiKpJSeZ4jnfHXYatYi8xJdYSxWBep'
);
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

if (doProofs) {
  console.log('compile');
  console.time('compile');
  await SimpleZkapp.compile();
  console.timeEnd('compile');
}

console.log('deploy');
let tx = await Mina.transaction(sender, () => {
  let senderUpdate = AccountUpdate.fundNewAccount(sender);
  senderUpdate.send({ to: zkappAddress, amount: initialBalance });
  zkapp.deploy({ zkappKey });
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log('initial state: ' + zkapp.x.get());
console.log(`initial balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

let account = Mina.getAccount(zkappAddress);
console.log('account state is proved:', account.zkapp?.provedState.toBoolean());

console.log('update');
tx = await Mina.transaction(sender, () => {
  zkapp.update(Field(3));
});
await tx.prove();
await tx.sign([senderKey]).send();

// pay more into the zkapp -- this doesn't need a proof
console.log('receive');
tx = await Mina.transaction(sender, () => {
  let payerAccountUpdate = AccountUpdate.createSigned(sender);
  payerAccountUpdate.send({ to: zkappAddress, amount: UInt64.from(8e9) });
});
await tx.sign([senderKey]).send();

console.log('payout');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkapp.payout(privilegedKey);
});
await tx.prove();
await tx.sign([senderKey]).send();
sender;

console.log('final state: ' + zkapp.x.get());
console.log(`final balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('try to payout a second time..');
tx = await Mina.transaction(sender, () => {
  zkapp.payout(privilegedKey);
});
try {
  await tx.prove();
  await tx.sign([senderKey]).send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log('try to payout to a different account..');
try {
  tx = await Mina.transaction(sender, () => {
    zkapp.payout(Local.testAccounts[2].privateKey);
  });
  await tx.prove();
  await tx.sign([senderKey]).send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log(
  `should still be the same final balance: ${zkapp.account.balance
    .get()
    .div(1e9)} MINA`
);

SimpleProfiler.stop().store();
