import {
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
} from 'o1js';

class SimpleZkapp extends SmartContract {
  @state(UInt64) x = State<UInt64>();

  init() {
    super.init();
    this.x.set(new UInt64(0));
  }

  @method
  async increment() {
    let x = this.x.get();
    this.x.requireEquals(x);
    let newX = x.add(1);
    this.x.set(newX);
  }
}

let Local = Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialBalance = 10_000_000_000;
let zkapp = new SimpleZkapp(zkappAddress);
await SimpleZkapp.analyzeMethods();

await Mina.transaction(sender, async () => {
  let senderUpdate = AccountUpdate.fundNewAccount(sender);
  senderUpdate.send({ to: zkappAddress, amount: initialBalance });
  await zkapp.deploy();
})
  .sign([senderKey, zkappKey])
  .send()
  .wait();

console.log('initial state: ' + zkapp.x.get());

console.log('increment');
const incrementTx = Mina.transaction(sender, async () => {
  await zkapp.increment();
}).sign([senderKey]);
await incrementTx.then((v) => v.prove());
await incrementTx.send().wait();

console.log('final state: ' + zkapp.x.get());
