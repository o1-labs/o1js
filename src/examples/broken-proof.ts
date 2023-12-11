import {
  Mina,
  PrivateKey,
  SmartContract,
  UInt64,
  method,
  ZkProgram,
  verify,
} from 'o1js';
import { tic, toc } from './utils/tic-toc.node.js';
import assert from 'assert';

const RealProof = ZkProgram({
  name: 'real',
  methods: {
    make: {
      privateInputs: [UInt64],

      method(value: UInt64) {
        let expected = UInt64.from(34);
        value.assertEquals(expected);
      },
    },
  },
});

const FakeProof = ZkProgram({
  name: 'fake',
  methods: {
    make: {
      privateInputs: [UInt64],

      method(value: UInt64) {},
    },
  },
});

class BrokenProof extends ZkProgram.Proof(RealProof) {}

const BrokenProgram = ZkProgram({
  name: 'broken',
  methods: {
    verifyReal: {
      privateInputs: [BrokenProof],

      method(proof: BrokenProof) {
        proof.verify();
      },
    },
  },
});

class BrokenContract extends SmartContract {
  @method verifyReal(proof: BrokenProof) {
    proof.verify();
  }
}

Mina.setActiveInstance(Mina.LocalBlockchain());
let zkApp = new BrokenContract(PrivateKey.random().toPublicKey());

tic('compile');
await RealProof.compile();
await FakeProof.compile();
let { verificationKey: contractVk } = await BrokenContract.compile();
let { verificationKey: programVk } = await BrokenProgram.compile();
toc();

tic('create fake proof');
const value = UInt64.from(99999);
const fakeProof = await FakeProof.make(value);
toc();

await assert.rejects(async () => {
  tic('verify fake proof in program');
  const brokenProof = await BrokenProgram.verifyReal(fakeProof);
  assert(await verify(brokenProof, programVk.data));
  toc();
}, 'recursive program rejects fake proof');

await assert.rejects(async () => {
  tic('verify fake proof in contract');
  let tx = await Mina.transaction(() => zkApp.verifyReal(fakeProof));
  let proof = (await tx.prove()).find((p) => p !== undefined);
  assert(proof !== undefined);
  console.dir(proof, { depth: 5 });
  assert(await verify(proof, contractVk.data));
  toc();
}, 'recursive contract rejects fake proof');
