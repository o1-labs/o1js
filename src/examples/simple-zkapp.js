/**
 * Demonstrates how to use o1js in pure JavaScript
 *
 * Decorators `@method` and `@state` are replaced by `declareState` and `declareMethods`.
 */
import {
  Field,
  State,
  SmartContract,
  Mina,
  AccountUpdate,
  declareState,
  declareMethods,
} from 'o1js';

class Updater extends SmartContract {
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
declareState(Updater, { x: Field });
declareMethods(Updater, { update: [Field] });

let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const [feePayer] = Local.testAccounts

let contractAccount = Mina.TestAccount.random()

let initialState = Field(1);
let contract = new Updater(contractAccount);

console.log('compile');
await Updater.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
});
await tx.sign([feePayer.key, contractAccount.key]).send();

console.log('initial state: ' + contract.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, () => contract.update(Field(3)));
await tx.prove();
await tx.sign([feePayer.key]).send();
console.log('final state: ' + contract.x.get());
