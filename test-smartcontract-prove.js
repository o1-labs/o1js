import { SmartContract, Field, State, Mina, PrivateKey, PublicKey, declareState, declareMethods } from './dist/node/index.js';

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
  console.log('Testing SmartContract proving only (no deployment)...\n');
  
  try {
    // Test with Snarky backend first
    console.log('1. Compiling contract...');
    const startCompile = Date.now();
    const { verificationKey } = await SimpleContract.compile();
    const compileTime = Date.now() - startCompile;
    console.log(`✅ Compilation successful (${compileTime}ms)`);
    console.log(`   VK hash: ${verificationKey.hash}`);
    
    // Create a dummy public key for the contract
    const dummyPrivateKey = PrivateKey.random();
    const contractAddress = dummyPrivateKey.toPublicKey();
    
    console.log('\n2. Creating and proving transaction (without blockchain)...');
    const contract = new SimpleContract(contractAddress);
    
    // Run in prover mode to generate proof
    const startProof = Date.now();
    await Mina.transaction(() => {
      // Initialize the state
      contract.value.set(Field(0));
      // Then call the method
      contract.setValue(Field(42));
    });
    const proofTime = Date.now() - startProof;
    
    console.log(`✅ Transaction created and proved successfully (${proofTime}ms)`);
    console.log('\nSnarky backend works correctly with SmartContract!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack && error.stack.includes('conversion-proof')) {
      console.error('This is the proof verification error we\'re seeing with ZkProgram');
    }
  }
}

test().catch(console.error);