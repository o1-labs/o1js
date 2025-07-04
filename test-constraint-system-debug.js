const { Field, Provable, switchBackend, getCurrentBackend } = await import('./dist/node/index.js');
const { Snarky } = await import('./dist/node/bindings.js');

async function testConstraintSystemDebug() {
  console.log('Testing constraint system generation with Sparky (debug mode)...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    console.log('1. Entering constraint system mode...');
    const cs = Snarky.run.enterConstraintSystem();
    console.log('   ✓ enterConstraintSystem returned:', typeof cs);
    
    console.log('\n2. Running circuit code...');
    const x = Provable.witness(Field, () => Field(5));
    console.log('   ✓ Created witness variable');
    
    x.assertEquals(Field(5));
    console.log('   ✓ Added assertEquals constraint');
    
    console.log('\n3. Getting constraint system...');
    let constraintSystem;
    try {
      constraintSystem = cs();
      console.log('   ✓ cs() returned:', constraintSystem);
      console.log('   Type:', typeof constraintSystem);
      console.log('   Constructor:', constraintSystem?.constructor?.name);
    } catch (e) {
      console.error('   ❌ Error calling cs():', e.message);
      throw e;
    }
    
    console.log('\n4. Converting to JSON...');
    let json;
    try {
      json = Snarky.constraintSystem.toJson(constraintSystem);
      console.log('   ✓ toJson returned:', json);
      console.log('   Type:', typeof json);
      console.log('   Keys:', Object.keys(json || {}));
    } catch (e) {
      console.error('   ❌ Error in toJson:', e.message);
      console.error('   Stack:', e.stack);
      throw e;
    }
    
    console.log('\n✅ Success! Constraint system:');
    console.log('- Gates:', json.gates?.length || 0);
    console.log('- Public input size:', json.publicInputSize || json.public_input_size);
    
  } catch (error) {
    console.error('\n❌ Overall error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConstraintSystemDebug().catch(console.error);