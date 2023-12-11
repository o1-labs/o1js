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

const RealProgram = ZkProgram({
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

const FakeProgram = ZkProgram({
  name: 'fake',
  methods: {
    make: { privateInputs: [UInt64], method(_: UInt64) {} },
  },
});

class RealProof extends ZkProgram.Proof(RealProgram) {}

const RecursiveProgram = ZkProgram({
  name: 'broken',
  methods: {
    verifyReal: {
      privateInputs: [RealProof],
      method(proof: RealProof) {
        proof.verify();
      },
    },
  },
});

class RecursiveContract extends SmartContract {
  @method verifyReal(proof: RealProof) {
    proof.verify();
  }
}

Mina.setActiveInstance(Mina.LocalBlockchain());

tic('compile');
await RealProgram.compile();
await FakeProgram.compile();
let { verificationKey: contractVk } = await RecursiveContract.compile();
let { verificationKey: programVk } = await RecursiveProgram.compile();
toc();

tic('create fake proof');
const value = UInt64.from(99999);
const fakeProof = await FakeProgram.make(value);
toc();

tic('verify fake proof in program');
await assert.rejects(async () => {
  const brokenProof = await RecursiveProgram.verifyReal(fakeProof);
  assert(await verify(brokenProof, programVk.data));
}, 'recursive program rejects fake proof');
toc();

let publicKey = PrivateKey.random().toPublicKey();
let zkApp = new RecursiveContract(publicKey);

tic('verify fake proof in contract');
await assert.rejects(async () => {
  let tx = await Mina.transaction(() => {
    zkApp.verifyReal(fakeProof);
  });
  let proof = (await tx.prove()).find((p) => p !== undefined);
  assert(proof !== undefined);
  assert(await verify(proof, contractVk.data));
}, 'recursive contract rejects fake proof');
toc();
