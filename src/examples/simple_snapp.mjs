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

class SimpleSnapp extends SmartContract {
  constructor(address) {
    super(address);
    this.x = State();
  }
  deploy(initialBalance, x) {
    super.deploy();
    this.balance.addInPlace(initialBalance);
    this.x.set(x);
  }
  update(y) {
    let x = this.x.get();
    this.x.set(x.add(y));
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

// console.log('compile');
// let { provers, getVerificationKey } = SimpleSnapp.compile(snappPubKey);

console.log('deploy');
let txn = Mina.transaction(account1, () => {
  let snapp = new SimpleSnapp(snappPubKey);
  const amount = UInt64.fromNumber(1e6);
  const p = Party.createSigned(account2);
  p.balance.subInPlace(amount);
  snapp.deploy(amount, Field(1));
});

console.log(txn.toGraphQL());

txn.send().wait();
var snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('initial state: ' + snappState);

// console.log('prove');
// let snapp = new SimpleSnapp(snappPubKey);
// let proof = await snapp.prove(provers, 'update', [Field(3)]);
// console.log({ proof });

await Mina.transaction(account1, () => {
  let snapp = new SimpleSnapp(snappPubKey);
  snapp.update(Field(3));
})
  .send()
  .wait();
snappState = (await Mina.getAccount(snappPubKey)).snapp.appState[0];
console.log('final state: ' + snappState);

shutdown();
