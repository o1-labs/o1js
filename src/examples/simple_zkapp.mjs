import {
  Field,
  State,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Bool,
  declareState,
  declareMethodArguments,
  shutdown,
  Permissions,
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  constructor(address) {
    super(address);
    this.x = State();
  }
  deploy(args) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }
  update(y) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}
declareState(SimpleZkapp, { x: Field });
declareMethodArguments(SimpleZkapp, { update: [Field] });

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let account1 = Local.testAccounts[0].privateKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);

console.log('deploy');
(
  await Local.transaction(account1, () => {
    const p = Party.createSigned(account1, { isSameAsFeePayer: true });
    p.balance.subInPlace(
      UInt64.fromNumber(initialBalance).add(Mina.accountCreationFee())
    );
    let zkapp = new SimpleZkapp(zkappAddress);
    zkapp.deploy({ zkappKey });
  })
).send();

let zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState[0];
console.log('initial state: ' + zkappState);

console.log('update');
(
  await Local.transaction(account1, async () => {
    let zkapp = new SimpleZkapp(zkappAddress);
    zkapp.update(Field(3));
    zkapp.sign(zkappKey);
  })
).send();

zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState[0];
console.log('final state: ' + zkappState);

shutdown();
