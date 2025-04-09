import {
  Field,
  SmartContract,
  method,
  VerificationKey,
  validateVkHash,
  Mina,
  AccountUpdate,
  PrivateKey,
  Permissions,
  Provable,
} from 'o1js';

class VkHashVerifierZkApp extends SmartContract {
  init() {
    super.init();

    // Set permissions to allow updating verification key
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: Permissions.VerificationKey.proofDuringCurrentVersion(),
    });
  }

  @method async validateAndSetVerificationKey(verificationKey: VerificationKey) {
    // First validate the verification key hash matches the data
    if (Provable.inCheckedComputation()) {
      validateVkHash(verificationKey);
    }

    // Set the verification key in the account
    this.account.verificationKey.set(verificationKey);
  }
}

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const [feePayer1, feePayer2] = Local.testAccounts;
console.log('Fee payer 1:', feePayer1.toBase58());
console.log('Fee payer 2:', feePayer2.toBase58());

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
console.log('ZkApp address:', zkAppAddress.toBase58());

const zkApp = new VkHashVerifierZkApp(zkAppAddress);

await VkHashVerifierZkApp.compile();

const deploy_txn = await Mina.transaction(feePayer1, async () => {
  AccountUpdate.fundNewAccount(feePayer1);
  await zkApp.deploy();
});
await deploy_txn.prove();
await deploy_txn.sign([feePayer1.key, zkAppPrivateKey]).send();

// Get a verification key
const { verificationKey } = await VkHashVerifierZkApp.compile();
console.log('Original verification key hash:', verificationKey.hash.toString());

// Create a new verification key with different data for testing
const invalidVerificationKey = new VerificationKey({
  data: verificationKey.data,
  hash: Field(12345678), // Different hash value
});
console.log('Invalid verification key hash:', invalidVerificationKey.hash.toString());

// Validate and set the verification key in the zkApp (it should throw an error)
const validateAndSet_txn = await Mina.transaction(feePayer2, async () => {
  await zkApp.validateAndSetVerificationKey(invalidVerificationKey);
});
await validateAndSet_txn.prove();
await validateAndSet_txn.sign([feePayer2.key]).send();
