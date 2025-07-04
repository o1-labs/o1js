import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend } from './dist/node/bindings.js';

async function testVariableAllocation() {
  console.log('\n=== Testing Variable Allocation ===\n');
  
  await switchBackend('sparky');
  
  // Test with explicit variable logging
  console.log('Creating variables and constraints:');
  const cs = await constraintSystem(() => {
    console.log('Creating x = Field(5)');
    const x = Provable.witness(Field, () => Field(5));
    console.log('x:', x);
    
    console.log('Creating y = Field(7)');
    const y = Provable.witness(Field, () => Field(7));
    console.log('y:', y);
    
    console.log('Computing result = x.add(y)');
    const result = x.add(y);
    console.log('result:', result);
    
    console.log('Creating constant = Field(12)');
    const constant = Field(12);
    console.log('constant:', constant);
    
    console.log('Asserting result.assertEquals(constant)');
    result.assertEquals(constant);
  });
  
  console.log(`\nTotal constraints: ${cs.rows}`);
  
  console.log('\n=== End Test ===\n');
}

testVariableAllocation().catch(console.error);