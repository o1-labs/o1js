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
  Bool,
  PublicKey,
  Circuit,
} from 'snarkyjs';

const doProofs = true;

await isReady;

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
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field): Field {
    this.emitEvent('update', y);
    let x = this.x.get();
    this.x.assertEquals(x);
    let newX = x.add(y);
    this.x.set(newX);
    return newX;
  }

  /**
   * This method allows a certain privileged account to claim half of the zkapp balance, but only once
   * @param caller the privileged account
   */
  @method payout(caller: PrivateKey) {
    // check that caller is the privileged account
    let callerAddress = caller.toPublicKey();
    callerAddress.assertEquals(privilegedAddress);

    // assert that the caller account is new - this way, payout can only happen once
    let callerAccountUpdate = AccountUpdate.defaultAccountUpdate(callerAddress);
    callerAccountUpdate.account.isNew.assertEquals(Bool(true));

    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.assertEquals(balance);
    let halfBalance = balance.div(2);
    this.send({ to: callerAccountUpdate, amount: halfBalance });

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
let privilegedKey = PrivateKey.random();
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

if (doProofs) {
  console.log('compile');
  await SimpleZkapp.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
await tx.send();

console.log('initial state: ' + zkapp.x.get());
console.log(`initial balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(3));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

// pay more into the zkapp -- this doesn't need a proof
console.log('receive');
tx = await Mina.transaction(feePayer, () => {
  let payerAccountUpdate = AccountUpdate.createSigned(feePayer);
  payerAccountUpdate.send({ to: zkappAddress, amount: UInt64.from(8e9) });
});
await tx.send();

console.log('payout');
tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.payout(privilegedKey);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('final state: ' + zkapp.x.get());
console.log(`final balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

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
