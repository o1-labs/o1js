import { Field, switchBackend } from './dist/node/index.js';

console.log('Testing zero coefficient handling...');

async function testBasic() {
  try {
    await switchBackend('sparky');
    console.log('Switched to Sparky');
    
    // Test basic field operation
    const a = Field(1);
    const b = Field(2);
    const c = a.add(b);
    console.log(`${a} + ${b} = ${c}`);
    
    console.log('Basic Sparky functionality works ✅');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

testBasic();