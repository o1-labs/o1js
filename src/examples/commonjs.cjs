/**
 * Tests that o1js can be imported and used from commonJS files
 */
let {
  Field,
  State,
  SmartContract,
  Mina,
  AccountUpdate,
  declareState,
  declareMethods,
} = require('o1js');

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
    this.account.balance.requireEquals(this.account.balance.get());
    let x = this.x.getAndRequireEquals();
    this.x.set(x.add(y));
  }
}
declareState(Updater, { x: Field });
declareMethods(Updater, { update: [Field] });

let initialState = Field(1);

main();

async function main() {
  let Local = await Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const [feePayer] = Local.testAccounts;

  let contractAccount = Mina.TestPublicKey.random();
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
}
