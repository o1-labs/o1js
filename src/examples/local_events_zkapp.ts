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
  PublicKey,
  Circuit,
  Experimental,
} from 'snarkyjs';

const doProofs = false;

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  events = {
    sender: PublicKey,
    value: Field,
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

  @method update(y: Field) {
    this.emitEvent('sender', PrivateKey.random().toPublicKey());
    this.emitEvent('value', y);
    let x = this.x.get();
    this.x.assertEquals(x);
    this.x.set(x.add(y));
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

if (doProofs) {
  console.log('compile');
  await SimpleZkapp.compile(zkappAddress);
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(1));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
//console.log(Local.fetchEvents());

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(2));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('----');
let events = zkapp.fetchEvents();
console.log(events);
console.log('----');
console.log(events[0].event);
