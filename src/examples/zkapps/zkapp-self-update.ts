/**
 * This example deploys a zkApp and then updates its verification key via proof, self-replacing the zkApp
 */
import {
  SmartContract,
  VerificationKey,
  method,
  Permissions,
  PrivateKey,
  Mina,
  AccountUpdate,
  Provable,
  TransactionVersion,
} from 'o1js';

class Foo extends SmartContract {
  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: {
        auth: Permissions.proof(),
        txnVersion: TransactionVersion.current(),
      },
    });
  }

  @method async replaceVerificationKey(verificationKey: VerificationKey) {
    this.account.verificationKey.set(verificationKey);
  }
}

class Bar extends SmartContract {
  @method async call() {
    Provable.log('Bar');
  }
}

// setup

const Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkApp = new Foo(zkAppAddress);

const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];

// deploy first verification key

await Foo.compile();

const tx = await Mina.transaction(deployerAccount, async () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  await zkApp.deploy();
});
await tx.prove();
await tx.sign([deployerKey, zkAppPrivateKey]).send();

const fooVerificationKey = Mina.getAccount(zkAppAddress).zkapp?.verificationKey;
Provable.log('original verification key', fooVerificationKey);

// update verification key

const { verificationKey: barVerificationKey } = await Bar.compile();

const tx2 = await Mina.transaction(deployerAccount, async () => {
  await zkApp.replaceVerificationKey(barVerificationKey);
});
await tx2.prove();
await tx2.sign([deployerKey]).send();

const updatedVerificationKey =
  Mina.getAccount(zkAppAddress).zkapp?.verificationKey;

// should be different from Foo
Provable.log('updated verification key', updatedVerificationKey);
