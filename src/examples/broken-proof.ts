import {
  AccountUpdate,
  Bool,
  Mina,
  PrivateKey,
  SmartContract,
  State,
  UInt64,
  method,
  state,
  ZkProgram,
} from 'o1js';
import { tic, toc } from './utils/tic-toc.node.js';
import assert from 'assert';

export const RealProof = ZkProgram({
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

export const FakeProof = ZkProgram({
  name: 'fake',
  methods: {
    make: {
      privateInputs: [UInt64],

      method(value: UInt64) {
        Bool(true).assertTrue();
      },
    },
  },
});

class BrokenProof extends ZkProgram.Proof(RealProof) {}

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
await Broken.compile();
toc();

// local deploy
tic('deploy');
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkApp.deploy();
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();
toc();

// accepts a fake proof
tic('fake proof');
const value = UInt64.from(99999);
const fakeProof = await FakeProof.make(value);
toc();

tic('set valid');
const txn = await Mina.transaction(senderAccount, () => {
  zkApp.setValid(fakeProof);
});
let proofs = await txn.prove();
toc();
console.log(proofs.find((p) => p !== undefined));
await txn.sign([senderKey]).send();

const isValid = zkApp.isValid.get();
assert(isValid);
