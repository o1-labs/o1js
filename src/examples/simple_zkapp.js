/**
 * Demonstrates how to use snarkyjs in pure JavaScript
 *
 * Decorators `@method` and `@state` are replaced by `declareState` and `declareMethods`.
 */
import {
  Field,
  State,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
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

  events = {
    update: Field,
  };

  deploy(args) {
    super.deploy(args);
    this.x.set(initialState);
  }
  update(y) {
    this.emitEvent('update', y);
    this.emitEvent('update', y);
    this.account.balance.assertEquals(this.account.balance.get());
    let x = this.x.get();
    this.x.assertEquals(x);
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
await SimpleZkapp.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayerKey, () => {
  AccountUpdate.fundNewAccount(feePayerKey);
  zkapp.deploy({ zkappKey });
});
await tx.send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => zkapp.update(Field(3)));
await tx.prove();
await tx.send();
console.log('final state: ' + zkapp.x.get());

shutdown();
