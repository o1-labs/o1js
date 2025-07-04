import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend } from './dist/node/bindings.js';

async function testConstant() {
  console.log('\n=== Testing Constants ===\n');
  
  await switchBackend('sparky');
  
  // Test creating a constant
  console.log('Test: Creating Field(12)');
  const cs = await constraintSystem(() => {
    const c = Field(12);
    console.log('Constant created:', c);
  });
  console.log(`Constraints: ${cs.rows}`);
  
  console.log('\n=== End Test ===\n');
}

testConstant().catch(console.error);