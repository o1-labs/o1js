// this is a pure JS version of the simple_snapp.ts example, that could be the starting point
// to develop a more explicit, less pretty API without decorators, which would have the huge benefit
// of working without a custom TS config and even without TS at all

import {
  Field,
  declareState,
  declareMethodArguments,
  State,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  shutdown,
} from 'snarkyjs';

await isReady;
const initialBalance = 1_000_000;
const initialState = Field(1);

class SimpleSnapp extends SmartContract {
  constructor(address) {
    super(address);
    this.x = State();
  }
  deploy() {
    super.deploy();
    let amount = UInt64.fromNumber(initialBalance);
    this.balance.addInPlace(amount);
    const p = Party.createSigned(account2);
    p.balance.subInPlace(amount);
    this.x.set(initialState);
  }
  update(y) {
    // let x = this.x.get();
    // this.x.set(x.add(y));
  }
}
declareState(SimpleSnapp, { x: Field });
declareMethodArguments(SimpleSnapp, { update: [Field] });

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
let account1 = Local.testAccounts[0].privateKey;
let account2 = Local.testAccounts[1].privateKey;
let snappPrivKey = PrivateKey.random();
let snappPubKey = snappPrivKey.toPublicKey();

console.log('compile...');
console.time('compile');
let { provers, verify } = SimpleSnapp.compile(snappPubKey);
console.timeEnd('compile');

// console.log('prove...');
// console.time('prove');
// let snapp = new SimpleSnapp(snappPubKey);
// let proofPromise = snapp.prove(provers, 'update', [Field(3)]);
// console.log({ proofPromise });
// let { proof, statement } = await proofPromise;
// console.timeEnd('prove');
// console.log({ proof });

console.log('deploy');
let txn = Mina.transaction(account1, () => {
  let snapp = new SimpleSnapp(snappPubKey);
  snapp.deploy();
});

txn.send().wait();
var snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('initial state: ' + snappState);

await Mina.transaction(account1, () => {
  let snapp = new SimpleSnapp(snappPubKey);
  snapp.update(Field(3));
})
  .send()
  .wait();
snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('final state: ' + snappState);

shutdown();
