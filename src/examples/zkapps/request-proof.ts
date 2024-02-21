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
  Permissions,
  Reducer,
  ZkProgram,
  FlexibleProvablePure,
  Proof,
  Provable,
} from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-request',
  publicOutput: Field,
  publicInput: undefined,
  methods: {
    baseCase: {
      privateInputs: [],
      method() {
        return Field(0);
      },
    },
  },
});

class RequestProof extends SmartContract {
  @method incrementCounter() {
    let p = this.requestProof(MyProgram, 'baseCase');

    p.verify();

    (p.publicOutput as Field).assertEquals(0);
  }
}

const Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];

let contract = new RequestProof(zkAppAddress);

console.time('contract');
await RequestProof.compile();
console.timeEnd('contract');

const tx = await Mina.transaction(deployerKey.toPublicKey(), () => {
  AccountUpdate.fundNewAccount(deployerKey.toPublicKey());
  contract.incrementCounter();
});
console.log('starting proving');
await tx.prove();
console.log('proving done');
