import {
  Field,
  state,
  State,
  method,
  SmartContract,
  Mina,
  AccountUpdate,
  ZkappPublicInput,
  SelfProof,
  verify,
  Empty,
} from 'o1js';

class TrivialZkapp extends SmartContract {
  @method async proveSomething(hasToBe1: Field) {
    hasToBe1.assertEquals(1);
  }
}
class TrivialProof extends TrivialZkapp.Proof() {}

class NotSoSimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  @method async initialize(proof: TrivialProof) {
    proof.verify();
    this.x.set(Field(1));
  }

  @method async update(
    y: Field,
    oldProof: SelfProof<ZkappPublicInput, Empty>,
    trivialProof: TrivialProof
  ) {
    oldProof.verify();
    trivialProof.verify();
    let x = this.x.get();
    this.x.requireEquals(x);
    this.x.set(x.add(y));
  }
}

let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [feePayer] = Local.testAccounts;

const [trivialContractAccount, notSoSimpleContractAccount] =
  Mina.TestPublicKey.random(2);

// compile and prove trivial zkapp
console.log('compile (trivial zkapp)');
let { verificationKey: trivialVerificationKey } = await TrivialZkapp.compile();
// TODO: should we have a simpler API for zkapp proving without
// submitting transactions? or is this an irrelevant use case?
// would also improve the return type -- `Proof` instead of `(Proof | undefined)[]`
console.log('prove (trivial zkapp)');
let [trivialProof] = await Mina.transaction(feePayer, async () => {
  await new TrivialZkapp(notSoSimpleContractAccount).proveSomething(Field(1));
})
  .prove()
  .proofs();

trivialProof = await testJsonRoundtripAndVerify(
  TrivialProof,
  trivialProof,
  trivialVerificationKey
);

console.log('compile');
let { verificationKey } = await NotSoSimpleZkapp.compile();

let zkapp = new NotSoSimpleZkapp(trivialContractAccount);

console.log('deploy');
await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await zkapp.deploy();
})
  .prove()
  .sign([feePayer.key, trivialContractAccount.key])
  .send();

console.log('initialize');
let tx = await Mina.transaction(feePayer, async () => {
  await zkapp.initialize(trivialProof!);
})
  .prove()
  .sign([feePayer.key]);
let [proof] = tx.proofs;
await tx.send();

proof = await testJsonRoundtripAndVerify(
  NotSoSimpleZkapp.Proof(),
  proof,
  verificationKey
);

console.log('initial state: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.update(Field(3), proof!, trivialProof!);
})
  .prove()
  .sign([feePayer.key]);
[proof] = tx.proofs;
await tx.send();

proof = await testJsonRoundtripAndVerify(
  NotSoSimpleZkapp.Proof(),
  proof,
  verificationKey
);

console.log('state 2: ' + zkapp.x.get());

console.log('update');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.update(Field(3), proof!, trivialProof!);
})
  .prove()
  .sign([feePayer.key]);
[proof] = tx.proofs;
await tx.send();

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
