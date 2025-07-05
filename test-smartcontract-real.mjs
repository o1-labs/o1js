import { SmartContract, State, state, Field, method, Mina, switchBackend } from './dist/node/index.js';

console.log('🔍 Real SmartContract Compilation Test');

// Test with Snarky first
console.log('\n📦 Testing with snarky backend...');
switchBackend('snarky');

try {
  // Set up Mina
  const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  console.log('✅ Mina LocalBlockchain ready');
  
  // Create SmartContract class
  class TestContract extends SmartContract {
    value = State();
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = current.add(Field(1));
      this.value.set(newValue);
    }
  }
  
  // Manually add decorator metadata
  TestContract._fields = { value: Field };
  TestContract._stateKeys = ['value'];
  TestContract._methods = [{
    methodName: 'increment',
    witnessArgs: [],
    proofArgs: [],
    allArgs: [],
    genericArgs: []
  }];
  TestContract.prototype.increment._isSmartContractMethod = true;
  
  // Try to compile with Snarky
  console.log('⚙️  Compiling TestContract with Snarky...');
  const snarkyResult = await TestContract.compile();
  console.log('✅ Snarky compilation successful!');
  console.log(`  - VK exists: ${!!snarkyResult.verificationKey}`);
  console.log(`  - VK hash: ${snarkyResult.verificationKey?.hash || 'missing'}`);
  console.log(`  - Methods: ${Object.keys(snarkyResult.provers || {}).length}`);
  
  // Now test with Sparky
  console.log('\n📦 Testing with sparky backend...');
  switchBackend('sparky');
  
  // Re-create the contract for Sparky
  class TestContractSparky extends SmartContract {
    value = State();
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = current.add(Field(1));
      this.value.set(newValue);
    }
  }
  
  // Manually add decorator metadata
  TestContractSparky._fields = { value: Field };
  TestContractSparky._stateKeys = ['value'];
  TestContractSparky._methods = [{
    methodName: 'increment',
    witnessArgs: [],
    proofArgs: [],
    allArgs: [],
    genericArgs: []
  }];
  TestContractSparky.prototype.increment._isSmartContractMethod = true;
  
  console.log('⚙️  Compiling TestContract with Sparky...');
  const sparkyResult = await TestContractSparky.compile();
  console.log('✅ Sparky compilation successful!');
  console.log(`  - VK exists: ${!!sparkyResult.verificationKey}`);
  console.log(`  - VK hash: ${sparkyResult.verificationKey?.hash || 'missing'}`);
  console.log(`  - Methods: ${Object.keys(sparkyResult.provers || {}).length}`);
  
  // Compare results
  console.log('\n📊 Comparison:');
  console.log(`  - VK Match: ${snarkyResult.verificationKey?.hash === sparkyResult.verificationKey?.hash ? '✅' : '❌'}`);
  console.log(`  - Method Count Match: ${Object.keys(snarkyResult.provers || {}).length === Object.keys(sparkyResult.provers || {}).length ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}