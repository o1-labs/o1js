import {
  Mina,
  PrivateKey,
  SmartContract,
  UInt64,
  method,
  ZkProgram,
  verify,
  Struct,
  Field,
  Proof,
  Unconstrained,
  Provable,
} from 'o1js';
import assert from 'assert';

const RealProgram = ZkProgram({
  name: 'real',
  publicOutput: UInt64,
  methods: {
    make: {
      privateInputs: [UInt64],
      async method(value: UInt64) {
        let expected = UInt64.from(34);
        value.assertEquals(expected);
        return { publicOutput: value.add(1) };
      },
    },
  },
});

const FakeProgram = ZkProgram({
  name: 'fake',
  publicOutput: UInt64,
  methods: {
    make: {
      privateInputs: [UInt64],
      async method(_: UInt64) {
        return { publicOutput: UInt64.zero };
      },
    },
  },
});

class RealProof extends RealProgram.Proof {}
class Nested extends Struct({ inner: RealProof }) {}

const RecursiveProgram = ZkProgram({
  name: 'recursive',
  methods: {
    verifyReal: {
      privateInputs: [RealProof],
      async method(proof: RealProof) {
        proof.verify();
      },
    },
    verifyNested: {
      privateInputs: [Field, Nested],
      async method(_unrelated, { inner }: Nested) {
        inner satisfies Proof<undefined, UInt64>;
        inner.verify();
      },
    },
    verifyInternal: {
      privateInputs: [Unconstrained.withEmpty<RealProof | undefined>(undefined)],
      async method(fakeProof: Unconstrained<RealProof | undefined>) {
        // witness either fake proof from input, or real proof
        let proof = await Provable.witnessAsync(RealProof, async () => {
          let maybeFakeProof = fakeProof.get();
          if (maybeFakeProof !== undefined) return maybeFakeProof;

          let { proof } = await RealProgram.make(34);
          return proof;
        });

        proof.declare();
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
const { proof: fakeProof } = await FakeProgram.make(99999);
const dummyProof = await RealProof.dummy(undefined, UInt64.zero, 0);

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
const { proof: realProof } = await RealProgram.make(34);

// zkprogram accepts proof
const { proof: recursiveProof } = await RecursiveProgram.verifyReal(realProof);
assert(await verify(recursiveProof, programVk), 'recursive program accepts real proof');

// contract accepts proof
let tx = await Mina.transaction(() => zkApp.verifyReal(realProof));
let [contractProof] = (await tx.prove()).proofs;
assert(await verify(contractProof!, contractVk), 'recursive contract accepts real proof');

console.log('fake proof test passed 🎉');

// same test for nested proofs

for (let proof of [fakeProof, dummyProof]) {
  // zkprogram rejects proof (nested)
  await assert.rejects(async () => {
    await RecursiveProgram.verifyNested(0, { inner: proof });
  }, 'recursive program rejects fake proof (nested)');
}

// zkprogram accepts proof (nested)
const { proof: recursiveProofNested } = await RecursiveProgram.verifyNested(0, {
  inner: realProof,
});
assert(
  await verify(recursiveProofNested, programVk),
  'recursive program accepts real proof (nested)'
);

console.log('fake proof test passed for nested proofs 🎉');

// same test for internal proofs

for (let proof of [fakeProof, dummyProof]) {
  // zkprogram rejects proof (internal)
  await assert.rejects(async () => {
    await RecursiveProgram.verifyInternal(proof);
  }, 'recursive program rejects fake proof (internal)');
}

// zkprogram accepts proof (internal)
const { proof: internalProof } = await RecursiveProgram.verifyInternal(undefined);
assert(await verify(internalProof, programVk), 'recursive program accepts internal proof');

console.log('fake proof test passed for internal proofs 🎉');
