/**
 * Demonstrates how to use o1js in pure JavaScript
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
  declareState,
  declareMethods,
} from 'o1js';

class SimpleZkapp extends SmartContract {
  constructor(address) {
    super(address);
    this.x = State();
  }

  events = { update: Field };

  init() {
    super.init();
    this.x.set(initialState);
  }

  async update(y) {
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

const [feePayer] = Local.testAccounts

let zkappAccount = Mina.TestAccount.random()

let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAccount);

console.log('compile');
await SimpleZkapp.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await zkapp.deploy();
});
await tx.sign([feePayer.key, zkappAccount.key]).send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, () => zkapp.update(Field(3)));
await tx.prove();
await tx.sign([feePayer.key]).send();
console.log('final state: ' + zkapp.x.get());
