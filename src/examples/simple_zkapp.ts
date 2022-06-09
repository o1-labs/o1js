import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Permissions,
  DeployArgs,
  UInt32,
  Bool,
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
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
    let callerParty = Party.createUnsigned(callerAddress);
    callerParty.account.nonce.assertEquals(UInt32.zero);
    callerParty.body.incrementNonce = Bool.true;

    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.assertEquals(balance);
    let halfBalance = balance.div(2);
    this.balance.subInPlace(halfBalance);
    callerParty.balance.addInPlace(halfBalance);
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

console.log('deploy');
let tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('initial state: ' + zkapp.x.get());
console.log(`initial balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('update');
tx = await Local.transaction(feePayer, () => {
  zkapp.update(Field(3));
  zkapp.sign(zkappKey);
});
tx.send();

console.log('payout');
tx = await Local.transaction(feePayer, () => {
  zkapp.payout(privilegedKey);
  zkapp.sign(zkappKey);
});
tx.send();

console.log('final state: ' + zkapp.x.get());
console.log(`final balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

console.log('try to payout a second time..');
tx = await Local.transaction(feePayer, () => {
  zkapp.payout(privilegedKey);
  zkapp.sign(zkappKey);
});
try {
  tx.send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log('try to payout to a different account..');
try {
  tx = await Local.transaction(feePayer, () => {
    zkapp.payout(Local.testAccounts[2].privateKey);
    zkapp.sign(zkappKey);
  });
  tx.send();
} catch (err: any) {
  console.log('Transaction failed with error', err.message);
}

console.log(
  `should still be the same final balance: ${zkapp.account.balance
    .get()
    .div(1e9)} MINA`
);
