import {
  Field,
  state,
  State,
  method,
  UInt64,
  PublicKey,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
} from '@o1labs/snarkyjs';

class SimpleSnapp extends SmartContract {
  @state(Field) x: State<Field>;

  constructor(address: PublicKey) {
    super(address);
  }

  deploy(initialBalance: UInt64, x: Field) {
    this.balance.addInPlace(initialBalance);
    this.x = State.init(x);
  }

  @method async update(y: Field) {
    let x = await this.x.get();
    this.x.set(x.add(y));
  }
}

const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const account1 = Local.testAccounts[0].privateKey;
const account2 = Local.testAccounts[1].privateKey;

const snappPrivkey = PrivateKey.random();
const snappPubkey = snappPrivkey.toPublicKey();

await Mina.transaction(account1, async () => {
  let snapp = new SimpleSnapp(snappPubkey);

  const amount = UInt64.fromNumber(1000000);
  const p = await Party.createSigned(account2);
  p.balance.subInPlace(amount);

  snapp.deploy(amount, Field(1));
})
  .send()
  .wait();

let snappState = (await Mina.getAccount(snappPubkey)).snapp.appState[0];
console.log('initial state: ' + snappState);

await Mina.transaction(account1, async () => {
  let snapp = new SimpleSnapp(snappPubkey);
  await snapp.update(Field(3));
})
  .send()
  .wait();

snappState = (await Mina.getAccount(snappPubkey)).snapp.appState[0];
console.log('final state: ' + snappState);
