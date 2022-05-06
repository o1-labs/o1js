import {
  Field,
  State,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  declareState,
  declareMethods,
  shutdown,
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  constructor(address) {
    super(address);
    this.x = State();
  }
  deploy(args) {
    super.deploy(args);
    this.x.set(initialState);
  }
  update(y) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}
declareState(SimpleZkapp, { x: Field });
declareMethods(SimpleZkapp, { update: [Field] });

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let feePayerKey = Local.testAccounts[0].privateKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

console.log('compile');
SimpleZkapp.compile(zkappAddress);

console.log('deploy');
let tx = await Mina.transaction(feePayerKey, () => {
  Party.fundNewAccount(feePayerKey);
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => zkapp.update(Field(3)));
await tx.prove();
tx.send();
console.log('final state: ' + zkapp.x.get());

shutdown();
