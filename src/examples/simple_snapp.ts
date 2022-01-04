import {
  Field,
  Bool,
  state,
  State,
  method,
  UInt64,
  PublicKey,
  PrivateKey,
  SmartContract,
  Mina,
} from 'snarkyjs';

class SimpleSnapp extends SmartContract {
  @state(Field) x: State<Field>;

  constructor(address: PublicKey, x: Field) {
    super(address);
    this.x = State.init(x);
  }

  @method async update(y: Field) {
    Field.zero.equals(0);
    Bool(true).equals(true);
  }
}

const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const account1 = Local.testAccounts[0].privateKey;
const snappPrivkey = PrivateKey.random();
const snappPubkey = snappPrivkey.toPublicKey();

await Mina.transaction(account1, async () => {
  let snapp = new SimpleSnapp(snappPubkey, Field(2));
  await snapp.update(Field(3));
})
  .send()
  .wait();
