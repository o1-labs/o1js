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
  State,
  state,
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
    // Validate the verification key hash matches the data
    if (Provable.inCheckedComputation()) {
      validateVkHash(verificationKey);
    }

    // Set the verification key in the account
    this.account.verificationKey.set(verificationKey);
  }
}

// Simple increment zkApp to get a different verification key
class IncrementZkApp extends SmartContract {
  @state(Field) counter = State<Field>();

  init() {
    super.init();
    this.counter.set(Field(0));
  }

  @method async increment() {
    const currentValue = this.counter.get();
    this.counter.requireEquals(currentValue);
    const newValue = currentValue.add(1);
    this.counter.set(newValue);
  }
}

async function main() {
  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);

  const [feePayer1, feePayer2] = Local.testAccounts;
  console.log('Fee payer 1:', feePayer1.key.toPublicKey().toBase58());
  console.log('Fee payer 2:', feePayer2.key.toPublicKey().toBase58());

  // Create VkHashVerifier zkApp instance
  const vkHashVerifierKey = PrivateKey.random();
  const vkHashVerifierAddress = vkHashVerifierKey.toPublicKey();
  console.log('VkHashVerifier ZkApp address:', vkHashVerifierAddress.toBase58());
  const vkHashVerifier = new VkHashVerifierZkApp(vkHashVerifierAddress);

  // Create Increment zkApp instance
  const incrementKey = PrivateKey.random();
  const incrementAddress = incrementKey.toPublicKey();
  console.log('Increment ZkApp address:', incrementAddress.toBase58());
  const increment = new IncrementZkApp(incrementAddress);

  // Compile both zkApps to get their verification keys
  console.log('\nCompiling zkApps...');
  await VkHashVerifierZkApp.compile();
  const { verificationKey: vkHashVerifierVk } = await VkHashVerifierZkApp.compile();

  console.log('Compiling IncrementZkApp...');
  await IncrementZkApp.compile();
  const { verificationKey: incrementVk } = await IncrementZkApp.compile();

  // Deploy VkHashVerifier zkApp
  console.log('\nDeploying VkHashVerifier zkApp...');
  try {
    const deploy_txn = await Mina.transaction(feePayer1.key.toPublicKey(), async () => {
      AccountUpdate.fundNewAccount(feePayer1.key.toPublicKey());
      await vkHashVerifier.deploy();
    });
    await deploy_txn.prove();
    await deploy_txn.sign([feePayer1.key, vkHashVerifierKey]).send();
    console.log('VkHashVerifier deployed successfully');
  } catch (error: any) {
    console.error('Failed to deploy VkHashVerifier:', error.message);
    return;
  }

  // Deploy Increment zkApp
  console.log('\nDeploying Increment zkApp...');
  try {
    const deploy_txn2 = await Mina.transaction(feePayer2.key.toPublicKey(), async () => {
      AccountUpdate.fundNewAccount(feePayer2.key.toPublicKey());
      await increment.deploy();
    });
    await deploy_txn2.prove();
    await deploy_txn2.sign([feePayer2.key, incrementKey]).send();
    console.log('Increment zkApp deployed successfully');
  } catch (error: any) {
    console.error('Failed to deploy Increment zkApp:', error.message);
    return;
  }

  // Test the increment functionality
  console.log('\nTesting Increment zkApp...');
  try {
    const increment_txn = await Mina.transaction(feePayer2.key.toPublicKey(), async () => {
      await increment.increment();
    });
    await increment_txn.prove();
    await increment_txn.sign([feePayer2.key]).send();
    console.log('Increment transaction successful');
  } catch (error: any) {
    console.error('Failed to increment:', error.message);
  }

  console.log('\nVerification Key Information:');
  console.log('\nVkHashVerifier verification key hash:', vkHashVerifierVk.hash.toString());
  console.log('\nIncrement zkApp verification key hash:', incrementVk.hash.toString());
  console.log('\nVkHashVerifier verification key data:', vkHashVerifierVk.data);
  console.log('\nIncrement zkApp verification key data:', incrementVk.data);

  // Create an invalid verification key using increment zkApp's data with VkHashVerifier's hash
  const invalidVerificationKey = new VerificationKey({
    data: vkHashVerifierVk.data, // Use data from increment zkApp
    hash: incrementVk.hash, // But with hash from VkHashVerifier
  });
  console.log('\nInvalid verification key hash:', invalidVerificationKey.hash.toString());

  // Try to validate and set the invalid verification key (should throw an error)
  console.log('\nTesting invalid verification key...');
  try {
    const validateAndSet_txn = await Mina.transaction(feePayer2.key.toPublicKey(), async () => {
      await vkHashVerifier.validateAndSetVerificationKey(invalidVerificationKey);
    });
    await validateAndSet_txn.prove();
    await validateAndSet_txn.sign([feePayer2.key]).send();
    console.log('Expected transaction to fail but it succeeded');
  } catch (error: any) {
    if (error.message.includes('Provided VerificationKey hash is not correct')) {
      console.log('Transaction correctly failed: Invalid verification key hash rejected');
    } else {
      console.error('Transaction failed with unexpected error:', error.message);
      console.error('Error message:', error.message);
    }
  }
}

main().catch((error) => {
  console.error('Main function failed:', error);
  process.exit(1);
});
