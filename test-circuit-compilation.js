import { SmartContract, State, state, Field, method, Mina, switchBackend } from './dist/node/index.js';

console.log('Testing circuit compilation with Sparky backend...\n');

async function testCircuitCompilation() {
  try {
    // Switch to Sparky backend
    console.log('Switching to Sparky backend...');
    switchBackend('sparky');
    console.log('Backend switched successfully\n');
    
    // Set up minimal local blockchain
    console.log('Setting up local blockchain...');
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('Local blockchain setup complete\n');
    
    // Define test contract
    class TestContract extends SmartContract {
      static _fields = { value: Field };
      static _states = [['value', Field]];
      
      constructor() {
        super();
        this.value = State();
      }
      
      init() {
        super.init();
        this.value.set(Field(0));
      }
      
      async increment() {
        const current = this.value.getAndRequireEquals();
        const newValue = current.add(Field(1));
        this.value.set(newValue);
      }
    }
    
    // Manually define the method
    TestContract._methods = [TestContract.prototype.increment];
    
    // Compile the contract
    console.log('Compiling TestContract...');
    const startTime = Date.now();
    
    try {
      const compilationResult = await TestContract.compile();
      const endTime = Date.now();
      
      console.log('✅ Compilation successful!');
      console.log(`Compilation time: ${endTime - startTime}ms`);
      console.log(`Verification key exists: ${!!compilationResult.verificationKey}`);
      console.log(`Verification key hash: ${compilationResult.verificationKey?.hash || 'missing'}`);
      console.log(`Method count: ${Object.keys(compilationResult.provers || {}).length}`);
      
      // Test with Snarky for comparison
      console.log('\nSwitching to Snarky backend for comparison...');
      switchBackend('snarky');
      
      const snarkyStart = Date.now();
      const snarkyResult = await TestContract.compile();
      const snarkyEnd = Date.now();
      
      console.log('✅ Snarky compilation successful!');
      console.log(`Snarky compilation time: ${snarkyEnd - snarkyStart}ms`);
      console.log(`Snarky VK hash: ${snarkyResult.verificationKey?.hash || 'missing'}`);
      
      // Compare results
      console.log('\n📊 Comparison:');
      console.log(`Speed: Sparky is ${((snarkyEnd - snarkyStart) / (endTime - startTime)).toFixed(2)}x faster`);
      console.log(`VK match: ${compilationResult.verificationKey?.hash === snarkyResult.verificationKey?.hash ? '✅ Yes' : '❌ No'}`);
      
    } catch (error) {
      console.error('❌ Compilation failed:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCircuitCompilation().then(() => {
  console.log('\nCircuit compilation test completed');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});