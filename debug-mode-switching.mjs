/**
 * Debug mode switching in Sparky to understand why constraints aren't generated
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function debugModeSwitching() {
  console.log('🔍 Debugging Sparky mode switching...\n');
  
  // Switch to Sparky
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Get direct access to sparky adapter for debugging
  const sparkyAdapter = await import('./src/bindings/sparky-adapter.js');
  
  console.log('\n📊 Before constraint generation:');
  console.log('sparkyAdapter available:', !!sparkyAdapter);
  
  // Test direct mode switching
  try {
    console.log('\n🔧 Testing direct mode switching:');
    
    // Try to access the run module directly
    if (sparkyAdapter.getRunModule) {
      const runModule = sparkyAdapter.getRunModule();
      console.log('runModule available:', !!runModule);
      console.log('runModule keys:', Object.keys(runModule));
      
      // Try to switch to constraint mode
      if (runModule.constraintMode) {
        console.log('Calling constraintMode()...');
        runModule.constraintMode();
        console.log('✅ constraintMode() called successfully');
      }
      
      // Test constraint system access
      if (runModule.getConstraintSystem) {
        console.log('Getting constraint system...');
        const cs = runModule.getConstraintSystem();
        console.log('Constraint system:', !!cs);
        console.log('Constraint system keys:', Object.keys(cs));
        
        // Check initial constraint count
        if (cs.rows) {
          const initialRows = cs.rows();
          console.log('Initial constraint count:', initialRows);
        }
        
        // Try a simple field operation directly
        console.log('\n🧪 Testing direct field operation:');
        const fieldModule = sparkyAdapter.getFieldModule();
        console.log('Field module:', !!fieldModule);
        
        if (fieldModule.mul) {
          console.log('Testing field multiplication...');
          
          // Create two simple field variables
          const a = [0, [0, "3"]]; // constant 3
          const b = [0, [0, "4"]]; // constant 4
          
          console.log('Input a:', JSON.stringify(a));
          console.log('Input b:', JSON.stringify(b));
          
          const result = fieldModule.mul(a, b);
          console.log('Multiplication result:', JSON.stringify(result));
          
          // Check constraint count after operation
          if (cs.rows) {
            const afterRows = cs.rows();
            console.log('Constraint count after multiplication:', afterRows);
            console.log('Constraints generated:', afterRows > initialRows ? '✅' : '❌');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in direct mode testing:', error.message);
  }
  
  // Test through Provable.constraintSystem
  console.log('\n🔄 Testing through Provable.constraintSystem:');
  
  const simpleCircuit = () => {
    console.log('  📝 Inside circuit function');
    const a = Field(3);
    console.log('  ✅ Created Field(3)');
    const b = Field(4);
    console.log('  ✅ Created Field(4)');
    const c = a.mul(b);
    console.log('  ✅ Computed a.mul(b)');
    c.assertEquals(Field(12));
    console.log('  ✅ Called assertEquals');
  };
  
  try {
    console.log('Calling Provable.constraintSystem...');
    const cs = await Provable.constraintSystem(simpleCircuit);
    console.log('✅ Provable.constraintSystem completed');
    console.log('Final gates count:', cs.gates.length);
    console.log('Final rows:', cs.rows);
    console.log('Gates:', cs.gates);
  } catch (error) {
    console.error('❌ Error in Provable.constraintSystem:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugModeSwitching().catch(console.error);