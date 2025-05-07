/**
 * This example deploys a zkApp and then updates its verification key via proof, self-replacing the zkApp
 */
import {
  SmartContract,
  VerificationKey,
  method,
  Permissions,
  Mina,
  AccountUpdate,
  Provable,
} from 'o1js';

class SelfUpdater extends SmartContract {
  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: Permissions.VerificationKey.proofDuringCurrentVersion(),
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

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const contractAccount = Mina.TestPublicKey.random();
const contract = new SelfUpdater(contractAccount);

const [deployer] = Local.testAccounts;

// deploy first verification key

await SelfUpdater.compile();

const tx = await Mina.transaction(deployer, async () => {
  AccountUpdate.fundNewAccount(deployer);
  await contract.deploy();
});
await tx.prove();
await tx.sign([deployer.key, contractAccount.key]).send();

const fooVerificationKey = Mina.getAccount(contractAccount).zkapp?.verificationKey;
Provable.log('original verification key', fooVerificationKey);

// update verification key

const { verificationKey: barVerificationKey } = await Bar.compile();

try {
  const invalidVerificationKey = new VerificationKey({
    data: fooVerificationKey!.data,
    hash: barVerificationKey.hash,
  });

  const tx2x = await Mina.transaction(deployer, async () => {
    // VK with mismatched hash and data should throw
    await contract.replaceVerificationKey(invalidVerificationKey);
  });
  await tx2x.prove();
  await tx2x.sign([deployer.key]).send();
} catch (error: any) {
  if (
    error.message.includes('The verification key hash is not consistent with the provided data')
  ) {
    console.log('correctly threw on invalid verification key');
  } else {
    throw error;
  }
}

const tx2 = await Mina.transaction(deployer, async () => {
  // This call will work because the vk is valid
  await contract.replaceVerificationKey(barVerificationKey);
});
await tx2.prove();
await tx2.sign([deployer.key]).send();

const updatedVerificationKey = Mina.getAccount(contractAccount).zkapp?.verificationKey;

// should be different from Foo
Provable.log('updated verification key', updatedVerificationKey);
