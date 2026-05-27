import {
  AccountUpdate,
  Cache,
  Field,
  Gadgets,
  Mina,
  Provable,
  SmartContract,
  State,
  ZkProgram,
  method,
  setBackend,
  state,
} from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

setBackend('native');

let MyProgram = ZkProgram({
  numChunks: 4,
  overrideWrapDomain: 2,
  name: 'example-with-chunking',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [Field],
      async method(input: Field) {
        for (let i = 0; i < (1 << 16) + (1 << 15); i++) {
          Gadgets.rangeCheck64(Field(input).add(Field(i)));
        }
        // The above generates 2^16+2^15 rows which needs to be split into 2 chunks
        return {
          publicOutput: Field(0),
        };
      },
    },
  },
});

const cs = await MyProgram.analyzeMethods();
const perf = Performance.create(MyProgram.name, cs);

console.log('MyProgram baseCase method rows: ', cs.baseCase.rows);

perf.start('compile');
let { verificationKey } = await MyProgram.compile({ cache: Cache.None });
perf.end();

perf.start('prove', 'baseCase');
let { proof } = await MyProgram.baseCase(Field(0));
perf.end();

perf.start('verify', 'baseCase');
let isValid = await MyProgram.verify(proof);
perf.end();

console.log('isValid?', isValid);
if (!isValid) throw new Error('proof verification failed!');

// now verify the chunked proof inside a regular (non-chunked) zkApp and send it to a local chain

class ChunkedProof extends MyProgram.Proof {}

class VerifierZkapp extends SmartContract {
  @state(Field) verified = State<Field>();

  @method async verifyChunked(proof: ChunkedProof) {
    proof.verify();
    this.verified.set(Field(12345));
    // add some more dummy constraints
    for (let i = 0; i < 1 << 12; i++) {
      Gadgets.rangeCheck64(Field(Provable.witness(Field, () => Field(183))));
    }
  }

  // verify two chunked proofs in the same (non-chunked) method
  @method async verifyChunkedTwo(proofA: ChunkedProof, proofB: ChunkedProof) {
    proofA.verify();
    proofB.verify();
    this.verified.set(Field(22222));
    // add some more dummy constraints
    for (let i = 0; i < 1 << 12; i++) {
      Gadgets.rangeCheck64(Field(Provable.witness(Field, () => Field(183))));
    }
  }
}

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [feePayer] = Local.testAccounts;
let zkappAccount = Mina.TestPublicKey.random();
let zkapp = new VerifierZkapp(zkappAccount);

let csZkapp = await VerifierZkapp.analyzeMethods();

for (let [name, { rows }] of Object.entries(csZkapp)) {
  console.log(`VerifierZkapp ${name} method rows: `, rows);
}

perf.start('compile', 'zkapp');
await VerifierZkapp.compile({ cache: Cache.None });
perf.end();

console.log('deploy zkapp');
let deployTx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await zkapp.deploy();
});
await deployTx.prove();
await deployTx.sign([feePayer.key, zkappAccount.key]).send();

console.log('verify chunked proof inside zkapp and send to chain');
perf.start('prove', 'zkapp.verifyChunked');
let verifyTx = await Mina.transaction(feePayer, async () => {
  await zkapp.verifyChunked(proof);
});
await verifyTx.prove();
perf.end();
await verifyTx.sign([feePayer.key]).send();

let verified = zkapp.verified.get();
console.log('zkapp verified state:', verified.toString());
if (verified.toString() !== '12345') throw new Error('zkapp did not accept the chunked proof!');

console.log('chunked proof was verified inside a non-chunked zkApp and accepted by the chain ✅');

// verify two chunked proofs in one method

perf.start('prove', 'baseCase2');
let { proof: proof2 } = await MyProgram.baseCase(Field(1));
perf.end();

console.log('verify two chunked proofs inside zkapp and send to chain');
perf.start('prove', 'zkapp.verifyChunkedTwo');
let verifyTwoTx = await Mina.transaction(feePayer, async () => {
  await zkapp.verifyChunkedTwo(proof, proof2);
});
await verifyTwoTx.prove();
perf.end();
await verifyTwoTx.sign([feePayer.key]).send();

verified = zkapp.verified.get();
console.log('zkapp verified state (two):', verified.toString());
if (verified.toString() !== '22222') throw new Error('zkapp did not accept two chunked proofs!');

console.log(
  'two chunked proofs were verified inside a non-chunked zkApp and accepted by the chain ✅'
);
