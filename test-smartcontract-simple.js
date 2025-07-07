import { SmartContract, Field, State, Mina, PrivateKey, AccountUpdate, declareState, declareMethods } from './dist/node/index.js';

// Create a simple SmartContract
class SimpleContract extends SmartContract {
  constructor(address) {
    super(address);
    this.value = State();
  }
  
  async setValue(newValue) {
    const currentValue = this.value.getAndRequireEquals();
    currentValue.assertEquals(Field(0)); // Only allow setting if current value is 0
    this.value.set(newValue);
  }
}

// Declare state and methods
declareState(SimpleContract, { value: Field });
declareMethods(SimpleContract, { setValue: [Field] });

async function test() {
  console.log('Testing SmartContract compilation and proving...\n');
  
  try {
    // Test with Snarky backend
    console.log('1. Compiling contract...');
    const startCompile = Date.now();
    const { verificationKey } = await SimpleContract.compile();
    const compileTime = Date.now() - startCompile;
    console.log(`✅ Compilation successful (${compileTime}ms)`);
    console.log(`   VK hash: ${verificationKey.hash}`);
    console.log(`   VK data length: ${JSON.stringify(verificationKey.data).length} chars\n`);
    
    // Setup local blockchain with proofs disabled for quick testing
    const Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    
    const deployerAccount = Local.testAccounts[0];
    const deployerKey = deployerAccount.privateKey;
    const contractKey = PrivateKey.random();
    const contractAddress = contractKey.toPublicKey();
    
    console.log('2. Deploying contract...');
    const deployTx = await Mina.transaction(deployerAccount.publicKey, () => {
      AccountUpdate.fundNewAccount(deployerAccount.publicKey);
      const contract = new SimpleContract(contractAddress);
      contract.deploy();
      contract.value.set(Field(0));
    });
    await deployTx.sign([deployerKey, contractKey]).send();
    console.log('✅ Contract deployed');
    
    console.log('\n3. Creating transaction with proof...');
    // Now enable proofs for the actual transaction
    Local.setProofsEnabled(true);
    
    const contract = new SimpleContract(contractAddress);
    const startProof = Date.now();
    const tx = await Mina.transaction(deployerAccount.publicKey, () => {
      contract.setValue(Field(42));
    });
    
    console.log('4. Proving transaction...');
    await tx.prove();
    const proofTime = Date.now() - startProof;
    console.log(`✅ Transaction proved (${proofTime}ms)`);
    
    console.log('\n5. Sending transaction...');
    await tx.sign([deployerKey]).send();
    console.log('✅ Transaction sent');
    
    // Check final state
    const finalValue = Mina.getAccount(contractAddress).zkapp?.appState[0];
    console.log(`\n6. Final state value: ${finalValue}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

test().catch(console.error);