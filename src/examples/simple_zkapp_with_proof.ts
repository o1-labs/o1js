import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  ZkappStatement,
  Proof,
} from 'snarkyjs';

await isReady;

class SimpleZkappProof extends Proof<ZkappStatement> {
  static publicInputType = ZkappStatement;
  static tag = () => SimpleZkapp;
}

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  @method init() {
    this.x.set(Field.one);
  }

  @method update(y: Field, oldProof: SimpleZkappProof) {
    console.log('public input', oldProof.publicInput);
    oldProof.verify();
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let zkapp = new SimpleZkapp(zkappAddress);

console.log('compile');
await SimpleZkapp.compile(zkappAddress);

console.log('deploy');
let tx = await Mina.transaction(feePayerKey, () => {
  Party.fundNewAccount(feePayerKey);
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('init');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.init();
});
let [proof] = await tx.prove();
console.log(proof);
tx.send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.update(Field(3), proof!);
});
[proof] = await tx.prove();
console.log(proof);
tx.send();

console.log('state 2: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.update(Field(3), proof!);
});
[proof] = await tx.prove();
console.log(proof);
tx.send();

console.log('final state: ' + zkapp.x.get());
