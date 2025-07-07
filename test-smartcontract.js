import { SmartContract, Field, state, State, method, Mina, PrivateKey, AccountUpdate } from './dist/node/index.js';

class SimpleContract extends SmartContract {
  value = State();
  
  setValue(newValue) {
    const currentValue = this.value.getAndRequireEquals();
    currentValue.assertEquals(Field(0)); // Only allow setting if current value is 0
    this.value.set(newValue);
  }
}

// Apply decorators manually
SimpleContract._fields = [['value', Field]];
SimpleContract._methods = [SimpleContract.prototype.setValue];

async function test() {
  console.log('Testing with SmartContract...\n');
  
  try {
    // Compile
    console.log('1. Compiling contract...');
    const { verificationKey } = await SimpleContract.compile();
    console.log('✅ Compilation successful');
    console.log(`   VK hash: ${verificationKey.hash}\n`);
    
    // Setup local blockchain
    const Local = Mina.LocalBlockchain({ proofsEnabled: true });
    Mina.setActiveInstance(Local);
    
    const deployerKey = Local.testAccounts[0].privateKey;
    const contractKey = PrivateKey.random();
    const contractAddress = contractKey.toPublicKey();
    
    // Deploy
    console.log('2. Deploying contract...');
    const deployTx = await Mina.transaction(deployerKey.toPublicKey(), () => {
      AccountUpdate.fundNewAccount(deployerKey.toPublicKey());
      const contract = new SimpleContract(contractAddress);
      contract.deploy();
      contract.value.set(Field(0));
    });
    await deployTx.sign([deployerKey, contractKey]).send();
    console.log('✅ Contract deployed\n');
    
    // Test transaction
    console.log('3. Testing setValue method...');
    const contract = new SimpleContract(contractAddress);
    const tx = await Mina.transaction(deployerKey.toPublicKey(), () => {
      contract.setValue(Field(42));
    });
    await tx.prove();
    console.log('✅ Transaction proved');
    
    await tx.sign([deployerKey]).send();
    console.log('✅ Transaction sent\n');
    
    // Verify state
    const newValue = contract.value.get();
    console.log(`4. Final state value: ${newValue}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test().catch(console.error);