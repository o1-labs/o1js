import { SmartContract, State, state, Field, method, Mina, switchBackend } from './dist/node/index.js';

console.log('🔍 Simple SmartContract Compilation Test');

// Test with Snarky first
console.log('\n📦 Testing with snarky backend...');
switchBackend('snarky');

try {
  // Set up Mina
  const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  console.log('✅ Mina LocalBlockchain ready');
  
  // Create SmartContract using the old-style class definition
  const TestContract = class extends SmartContract {
    constructor() {
      super(...arguments);
      this.value = State();
    }
  };
  
  // Add state decorator metadata manually
  TestContract._fields = { value: Field };
  TestContract._stateKeys = ['value'];
  
  // Add method using decorateMethod directly
  const increment = async function() {
    const current = this.value.getAndRequireEquals();
    const newValue = current.add(Field(1));
    this.value.set(newValue);
  };
  
  TestContract.prototype.increment = increment;
  TestContract._methods = TestContract._methods || [];
  TestContract._methods.push({
    methodName: 'increment',
    witnessArgs: [],
    proofArgs: [],
    allArgs: [],
    genericArgs: []
  });
  
  // Try to compile
  console.log('⚙️  Compiling TestContract with Snarky...');
  const snarkyResult = await TestContract.compile();
  console.log('✅ Snarky compilation successful!');
  console.log(`  - VK exists: ${!!snarkyResult.verificationKey}`);
  console.log(`  - VK hash: ${snarkyResult.verificationKey?.hash || 'missing'}`);
  console.log(`  - Methods: ${Object.keys(snarkyResult.provers || {}).length}`);
  
  // Now test with Sparky
  console.log('\n📦 Testing with sparky backend...');
  switchBackend('sparky');
  
  console.log('⚙️  Compiling TestContract with Sparky...');
  const sparkyResult = await TestContract.compile();
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