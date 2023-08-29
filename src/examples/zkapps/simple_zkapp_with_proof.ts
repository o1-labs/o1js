import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  ZkappPublicInput,
  SelfProof,
  verify,
  Empty,
} from 'o1js';

await isReady;

class TrivialZkapp extends SmartContract {
  @method proveSomething(hasToBe1: Field) {
    hasToBe1.assertEquals(1);
  }
}
class TrivialProof extends TrivialZkapp.Proof() {}

class NotSoSimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  @method initialize(proof: TrivialProof) {
    proof.verify();
    this.x.set(Field(1));
  }

  @method update(
    y: Field,
    oldProof: SelfProof<ZkappPublicInput, Empty>,
    trivialProof: TrivialProof
  ) {
    oldProof.verify();
    trivialProof.verify();
    let x = this.x.get();
    this.x.assertEquals(x);
    this.x.set(x.add(y));
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// trivial zkapp account
let zkappKey2 = PrivateKey.random();
let zkappAddress2 = zkappKey2.toPublicKey();

// compile and prove trivial zkapp
console.log('compile (trivial zkapp)');
let { verificationKey: trivialVerificationKey } = await TrivialZkapp.compile();
// TODO: should we have a simpler API for zkapp proving without
// submitting transactions? or is this an irrelevant use case?
// would also improve the return type -- `Proof` instead of `(Proof | undefined)[]`
console.log('prove (trivial zkapp)');
let [trivialProof] = await (
  await Mina.transaction(feePayer, () => {
    new TrivialZkapp(zkappAddress2).proveSomething(Field(1));
  })
).prove();

trivialProof = await testJsonRoundtripAndVerify(
  TrivialProof,
  trivialProof,
  trivialVerificationKey
);

console.log('compile');
let { verificationKey } = await NotSoSimpleZkapp.compile();

let zkapp = new NotSoSimpleZkapp(zkappAddress);

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.deploy({ zkappKey });
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('initialize');
tx = await Mina.transaction(feePayerKey, () => {
  zkapp.initialize(trivialProof!);
});
let [proof] = await tx.prove();
await tx.sign([feePayerKey]).send();

proof = await testJsonRoundtripAndVerify(
  NotSoSimpleZkapp.Proof(),
  proof,
  verificationKey
);

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(3), proof!, trivialProof!);
});
[proof] = await tx.prove();
await tx.sign([feePayerKey]).send();

proof = await testJsonRoundtripAndVerify(
  NotSoSimpleZkapp.Proof(),
  proof,
  verificationKey
);

console.log('state 2: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(3), proof!, trivialProof!);
});
[proof] = await tx.prove();
await tx.sign([feePayerKey]).send();

proof = await testJsonRoundtripAndVerify(
  NotSoSimpleZkapp.Proof(),
  proof,
  verificationKey
);

console.log('final state: ' + zkapp.x.get());

async function testJsonRoundtripAndVerify(
  Proof: any,
  proof: any,
  verificationKey: { data: string }
): Promise<any> {
  let jsonProof = proof.toJSON();
  console.log(
    'json proof:',
    JSON.stringify({ ...jsonProof, proof: jsonProof.proof.slice(0, 10) + '..' })
  );
  let ok = await verify(jsonProof, verificationKey.data);
  if (!ok) throw Error('proof cannot be verified');
  return Proof.fromJSON(jsonProof);
}
