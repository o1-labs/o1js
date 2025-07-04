const { Field, Provable, switchBackend } = await import('./dist/node/index.js');
const { Snarky } = await import('./dist/node/bindings.js');

async function testConstraintOrder() {
  console.log('Testing constraint generation order...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  try {
    console.log('Method 1: Using Provable.constraintSystem()');
    const result1 = await Provable.constraintSystem(() => {
      console.log('  Inside constraintSystem callback...');
      const x = Provable.witness(Field, () => {
        console.log('  Creating witness...');
        return Field(5);
      });
      console.log('  Created witness:', x);
      console.log('  Calling assertEquals...');
      x.assertEquals(Field(5));
      console.log('  assertEquals completed');
    });
    
    console.log('  Result:', result1);
    console.log('  Gates:', result1.gates?.length || 0);
    
    console.log('\nMethod 2: Manual constraint system entry');
    console.log('  Entering constraint system mode...');
    const cs = Snarky.run.enterConstraintSystem();
    
    console.log('  Creating witness inside constraint mode...');
    const x = Provable.witness(Field, () => Field(5));
    console.log('  Calling assertEquals...');
    x.assertEquals(Field(5));
    
    console.log('  Getting constraint system...');
    const constraintSystem = cs();
    console.log('  Got constraint system:', constraintSystem);
    
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    console.log('  JSON gates:', json.gates?.length || 0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConstraintOrder().catch(console.error);