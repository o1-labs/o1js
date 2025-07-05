import { SmartContract, State, Field, method, state } from './dist/node/index.js';

console.log('Testing SmartContract compilation with Sparky...');

@state(Field) class MyState extends State {}

class TestContract extends SmartContract {
  @state(Field) value = State();
  
  @method async update(newValue) {
    const current = this.value.getAndRequireEquals();
    newValue.assertGreaterThan(current);
    this.value.set(newValue);
  }
}

async function test() {
  try {
    console.log('Starting compilation...');
    const result = await TestContract.compile();
    console.log('Compilation successful!');
    console.log('Verification key exists:', Boolean(result.verificationKey));
    console.log('Verification key hash:', result.verificationKey?.hash);
  } catch (error) {
    console.error('Compilation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();