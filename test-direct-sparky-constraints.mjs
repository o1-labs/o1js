import { switchBackend } from './dist/node/index.js';

async function testDirectSparkyConstraints() {
  console.log('Testing direct Sparky constraint generation\n');
  
  await switchBackend('sparky');
  
  // Get direct access to Sparky instance
  const sparky = globalThis.sparkyInstance;
  if (!sparky) {
    console.error('❌ Sparky instance not found');
    return;
  }
  
  console.log('✅ Sparky instance found');
  console.log('Available methods:', Object.keys(sparky));
  
  // Check field module
  if (sparky.field) {
    console.log('\n📊 Field module methods:', Object.keys(sparky.field));
    
    // Try to create a simple constraint directly
    console.log('\n🔧 Testing direct constraint creation:');
    
    try {
      // Start constraint system
      if (sparky.field.enterConstraintSystem) {
        console.log('Entering constraint system mode...');
        sparky.field.enterConstraintSystem();
      }
      
      // Create variables
      console.log('Creating constant 5...');
      const x = sparky.field.constant('5');
      console.log('x =', x);
      
      console.log('Creating constant 1...');
      const one = sparky.field.constant('1');
      console.log('one =', one);
      
      // Try addition
      console.log('\nTrying addition...');
      const result = sparky.field.add(x, one);
      console.log('result =', result);
      
      // Try to get constraint count
      if (sparky.field.rows) {
        const rows = sparky.field.rows();
        console.log('\nConstraint rows:', rows);
      }
      
      // Try to get constraint system
      if (sparky.field.toJson) {
        console.log('\nGetting constraint system...');
        const cs = sparky.field.toJson();
        console.log('Constraint system:', cs);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error('Stack:', error.stack);
    }
  }
  
  // Check constraint bridge
  const bridge = globalThis.sparkyConstraintBridge;
  if (bridge) {
    console.log('\n📊 Constraint bridge methods:', Object.keys(bridge));
    
    // Try getting full constraint system
    if (bridge.getFullConstraintSystem) {
      console.log('\nGetting full constraint system from bridge...');
      const fullSystem = bridge.getFullConstraintSystem();
      console.log('Full system:', fullSystem);
    }
  }
}

testDirectSparkyConstraints();