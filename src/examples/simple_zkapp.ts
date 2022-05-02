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
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy() {
    let amount = UInt64.fromNumber(initialBalance);
    this.balance.addInPlace(amount);
    const p = Party.createSigned(account2);
    p.balance.subInPlace(amount);
    this.x.set(initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
    console.log('update', { y, x });
    this.x.set(x.add(y));
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let account1 = Local.testAccounts[0].privateKey;
let account2 = Local.testAccounts[1].privateKey;

let zkappPrivKey = PrivateKey.random();
let zkappPubKey = zkappPrivKey.toPublicKey();

let initialBalance = 1_000_000;
let initialState = Field(1);

console.log('deploy');
await Local.transaction(account1, () => {
  let zkapp = new SimpleZkapp(zkappPubKey);
  zkapp.deploy();
})
  .send()
  .wait();

let zkappState = (await Mina.getAccount(zkappPubKey)).zkapp.appState[0];
console.log('initial state: ' + zkappState);

console.log('update');
await Local.transaction(account1, async () => {
  let zkapp = new SimpleZkapp(zkappPubKey);
  zkapp.update(Field(3));
})
  .send()
  .wait();

zkappState = (await Mina.getAccount(zkappPubKey)).zkapp.appState[0];
console.log('final state: ' + zkappState);
