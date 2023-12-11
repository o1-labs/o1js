import {
  Bool,
  Mina,
  PrivateKey,
  SmartContract,
  State,
  UInt64,
  method,
  state,
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

class Broken extends SmartContract {
  @state(Bool) isValid = State<Bool>();

  init() {
    super.init();
    this.isValid.set(Bool(false));
  }

  @method setValid(proof: BrokenProof) {
    proof.verify();
    this.isValid.set(Bool(true));
  }
}

const Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];
let { privateKey: senderKey, publicKey: senderAccount } = Local.testAccounts[1];
let zkAppPrivateKey = PrivateKey.random();
let zkAppAddress = zkAppPrivateKey.toPublicKey();

let zkApp = new Broken(zkAppAddress);

tic('compile');
await RealProof.compile();
await FakeProof.compile();
let { verificationKey } = await BrokenProgram.compile();
toc();

tic('fake proof');
const value = UInt64.from(99999);
const fakeProof = await FakeProof.make(value);
toc();

tic('broken proof');
const brokenProof = await BrokenProgram.verifyReal(fakeProof);
let ok = await verify(brokenProof, verificationKey.data);
assert(ok);
