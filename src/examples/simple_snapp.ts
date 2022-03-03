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

class SimpleSnapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy() {
    super.deploy();
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

const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const account1 = Local.testAccounts[0].privateKey;
const account2 = Local.testAccounts[1].privateKey;

const snappPrivKey = PrivateKey.random();
const snappPubKey = snappPrivKey.toPublicKey();

const initialBalance = 1_000_000;
const initialState = Field(1);

console.log('deploy');
await Mina.transaction(account1, () => {
  let snapp = new SimpleSnapp(snappPubKey);
  snapp.deploy();
})
  .send()
  .wait();

// console.log('compile');
// let { provers, getVerificationKey } = SimpleSnapp.compile(snappPubKey);

// let vk = getVerificationKey();
// console.log(vk);
// console.log(serializeVerificationKey(vk));

// console.log('prove');
// let snapp = new SimpleSnapp(snappPubKey);
// let proof = snapp.prove(provers, 'update', [Field(3)]);
// console.log({ proof });

let snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('initial state: ' + snappState);

console.log('update');
await Mina.transaction(account1, async () => {
  let snapp = new SimpleSnapp(snappPubKey);
  await snapp.update(Field(3));
})
  .send()
  .wait();

snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('final state: ' + snappState);
