const { Field, switchBackend } = await import('./dist/node/index.js');
const { Snarky } = await import('./dist/node/bindings.js');

async function testDirectSparky() {
  console.log('Testing direct Sparky field operations...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  try {
    console.log('1. Creating field constants...');
    const x = Snarky.field.constant(5);
    const y = Snarky.field.constant(5);
    console.log('   ✓ Created x:', x);
    console.log('   ✓ Created y:', y);
    
    console.log('\n2. Calling assertEqual directly...');
    Snarky.field.assertEqual(x, y);
    console.log('   ✓ assertEqual completed');
    
    console.log('\n3. Getting constraint system...');
    const cs = Snarky.run.enterConstraintSystem();
    // Run nothing inside - we already added constraint
    const constraintSystem = cs();
    console.log('   ✓ Got constraint system');
    
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    console.log('   ✓ Converted to JSON');
    console.log('   Gates:', json.gates?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectSparky().catch(console.error);