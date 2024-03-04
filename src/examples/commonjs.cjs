/**
 * Tests that o1js can be imported and used from commonJS files
 */
let {
  Field,
  State,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  declareState,
  declareMethods,
} = require('o1js');

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
let feePayer = Local.testAccounts[0].publicKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

main();

async function main() {
  console.log('compile');
  await SimpleZkapp.compile();

  console.log('deploy');
  let tx = await Mina.transaction(feePayer, async () => {
    AccountUpdate.fundNewAccount(feePayer);
    await zkapp.deploy();
  });
  await tx.sign([feePayerKey, zkappKey]).send();

  console.log('initial state: ' + zkapp.x.get());

  console.log('update');
  tx = await Mina.transaction(feePayer, () => zkapp.update(Field(3)));
  await tx.prove();
  await tx.sign([feePayerKey]).send();
  console.log('final state: ' + zkapp.x.get());
}
