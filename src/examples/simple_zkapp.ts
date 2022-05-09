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
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: { zkappKey: PrivateKey }) {
    super.deploy(args);
    this.self.update.permissions.setValue({
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
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let account1 = Local.testAccounts[0].privateKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

console.log('deploy');
let tx = await Local.transaction(account1, () => {
  Party.fundNewAcount(account1, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Local.transaction(account1, () => {
  zkapp.update(Field(3));
  zkapp.sign(zkappKey);
});
tx.send();

console.log('final state: ' + zkapp.x.get());
