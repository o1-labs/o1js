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
  Permissions,
  shutdown,
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: { zkappKey: PrivateKey }) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}

let Berkeley = Mina.BerkeleyQANet();
Mina.setActiveInstance(Berkeley);

let whaleAccount = Berkeley.testAccounts[0].privateKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);

console.log('deploy');
let tx = await Berkeley.transaction(whaleAccount, () => {
  const p = Party.createSigned(whaleAccount, { isSameAsFeePayer: true });
  p.balance.subInPlace(UInt64.fromNumber(initialBalance));
  let zkapp = new SimpleZkapp(zkappAddress);
  zkapp.deploy({ zkappKey });
});
console.log(tx.toJSON());

shutdown();
