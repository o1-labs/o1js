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
  Pickles,
} from 'snarkyjs';

await isReady;

class SimpleZkappProof extends Proof<ZkappStatement> {
  static publicInputType = ZkappStatement;
  static tag = () => NotSoSimpleZkapp;
}
class TrivialProof extends Proof<ZkappStatement> {
  static publicInputType = ZkappStatement;
  static tag = () => TrivialZkapp;
}

class NotSoSimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  @method init(proof: TrivialProof) {
    proof.verify();
    this.x.set(Field.one);
  }

  @method update(
    y: Field,
    oldProof: SimpleZkappProof,
    trivialProof: TrivialProof
  ) {
    oldProof.verify();
    trivialProof.verify();
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}

class TrivialZkapp extends SmartContract {
  @method proveSomething(hasToBe1: Field) {
    hasToBe1.assertEquals(1);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// trivial zkapp account
let zkappKey2 = PrivateKey.random();
let zkappAddress2 = zkappKey2.toPublicKey();

// compile and prove trivial zkapp
console.log('compile (trivial zkapp)');
await TrivialZkapp.compile(zkappAddress2);
// TODO: should we have a simpler API for zkapp proving without
// submitting transactions? or is this an irrelevant use case?
// would also improve the return type -- `Proof` instead of `(Proof | undefined)[]`
console.log('prove (trivial zkapp)');
let [trivialZkappProof] = await (
  await Mina.transaction(feePayerKey, () => {
    new TrivialZkapp(zkappAddress2).proveSomething(Field(1));
  })
).prove();

console.log('compile');
await NotSoSimpleZkapp.compile(zkappAddress);

let zkapp = new NotSoSimpleZkapp(zkappAddress);

console.log('deploy');
let tx = await Mina.transaction(feePayerKey, () => {
  Party.fundNewAccount(feePayerKey);
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('init');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.init(trivialZkappProof!);
});
let [proof] = await tx.prove();
tx.send();

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.update(Field(3), proof!, trivialZkappProof!);
});
[proof] = await tx.prove();
tx.send();

// check that proof can be converted to string
Pickles.proofToString(proof?.proof);

console.log('state 2: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.update(Field(3), proof!, trivialZkappProof!);
});
[proof] = await tx.prove();
tx.send();

console.log('final state: ' + zkapp.x.get());
