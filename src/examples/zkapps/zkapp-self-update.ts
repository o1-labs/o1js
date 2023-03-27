/**
 * This example deploys a zkApp and then updates its verification key via proof, self-replacing the zkApp
 */
import {
  SmartContract,
  VerificationKey,
  method,
  Permissions,
  isReady,
  PrivateKey,
  Mina,
  AccountUpdate,
  Field,
  Circuit,
} from 'snarkyjs';

class Foo extends SmartContract {
  init() {
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: Permissions.proof(),
    });
  }

  @method replaceVerificationKey(verificationKey: VerificationKey) {
    this.account.verificationKey.set(verificationKey);
  }
}

class Bar extends SmartContract {
  @method call() {
    Circuit.log('Bar');
  }
}

await isReady;

const Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

await Foo.compile();

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkApp = new Foo(zkAppAddress);

const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];

const tx = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkApp.deploy();
});
await tx.prove();
await tx.sign([deployerKey, zkAppPrivateKey]).send();

const fooVerificationKey = Mina.getAccount(zkAppAddress).zkapp?.verificationKey;
console.log('original verification key', {
  data: fooVerificationKey?.data,
  hash: fooVerificationKey?.hash.toString(),
});

const { verificationKey: barVerificationKey } = await Bar.compile();

const replacement = {
  data: barVerificationKey.data,
  hash: Field(barVerificationKey.hash),
};
const tx2 = await Mina.transaction(deployerAccount, () => {
  zkApp.replaceVerificationKey(replacement);
});
await tx2.prove();
await tx2.sign([deployerKey]).send();

const updatedVerificationKey =
  Mina.getAccount(zkAppAddress).zkapp?.verificationKey;
// should be different from Foo
console.log('updated verification key', {
  data: updatedVerificationKey?.data,
  hash: updatedVerificationKey?.hash.toString(),
});
