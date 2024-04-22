import {
  Mina,
  PrivateKey,
  SmartContract,
  UInt64,
  method,
  ZkProgram,
  verify,
} from 'o1js';
import assert from 'assert';

const RealProgram = ZkProgram({
  name: 'real',
  methods: {
    make: {
      privateInputs: [UInt64],
      async method(value: UInt64) {
        let expected = UInt64.from(34);
        value.assertEquals(expected);
      },
    },
  },
});

const FakeProgram = ZkProgram({
  name: 'fake',
  methods: {
    make: { privateInputs: [UInt64], async method(_: UInt64) {} },
  },
});

class RealProof extends ZkProgram.Proof(RealProgram) {}

const RecursiveProgram = ZkProgram({
  name: 'broken',
  methods: {
    verifyReal: {
      privateInputs: [RealProof],
      async method(proof: RealProof) {
        proof.verify();
      },
    },
  },
});

class RecursiveContract extends SmartContract {
  @method async verifyReal(proof: RealProof) {
    proof.verify();
  }
}

Mina.setActiveInstance(await Mina.LocalBlockchain());
let publicKey = PrivateKey.random().toPublicKey();
let zkApp = new RecursiveContract(publicKey);

await RealProgram.compile();
await FakeProgram.compile();
let { verificationKey: contractVk } = await RecursiveContract.compile();
let { verificationKey: programVk } = await RecursiveProgram.compile();

// proof that should be rejected
const fakeProof = await FakeProgram.make(UInt64.from(99999));
const dummyProof = await RealProof.dummy(undefined, undefined, 0);

for (let proof of [fakeProof, dummyProof]) {
  // zkprogram rejects proof
  await assert.rejects(async () => {
    await RecursiveProgram.verifyReal(proof);
  }, 'recursive program rejects fake proof');

  // contract rejects proof
  await assert.rejects(async () => {
    let tx = await Mina.transaction(() => zkApp.verifyReal(proof));
    await tx.prove();
  }, 'recursive contract rejects fake proof');
}

// proof that should be accepted
const realProof = await RealProgram.make(UInt64.from(34));

// zkprogram accepts proof
const brokenProof = await RecursiveProgram.verifyReal(realProof);
assert(
  await verify(brokenProof, programVk.data),
  'recursive program accepts real proof'
);

// contract accepts proof
let tx = await Mina.transaction(() => zkApp.verifyReal(realProof));
let [contractProof] = (await tx.prove()).proofs;
assert(
  await verify(contractProof!, contractVk.data),
  'recursive contract accepts real proof'
);

console.log('fake proof test passed 🎉');
