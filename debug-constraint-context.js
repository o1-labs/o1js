/**
 * Test constraint generation in proper constraint system context
 */

import { switchBackend, getCurrentBackend, Field, Provable } from './dist/node/index.js';

async function testConstraintContext() {
  console.log('🔍 TESTING: Constraint generation in proper context');
  
  try {
    // Switch to Sparky backend
    await switchBackend('sparky');
    console.log(`✅ Switched to backend: ${getCurrentBackend()}`);
    
    console.log('\n🧪 Test: Use Provable.constraintSystem() to capture constraints');
    
    const { gates } = Provable.constraintSystem(() => {
      console.log('  🔍 Inside constraint system context...');
      
      // Create witnesses
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      
      console.log('  🔍 Created witnesses');
      
      // Assert witness values (should create constraints)
      a.assertEquals(Field(5));
      console.log('  🔍 Asserted a = 5');
      
      b.assertEquals(Field(10));
      console.log('  🔍 Asserted b = 10');
      
      // Perform addition
      const c = a.add(b);
      console.log('  🔍 Computed c = a + b');
      
      // Assert result
      c.assertEquals(Field(15));
      console.log('  🔍 Asserted c = 15');
      
      return { a, b, c };
    });
    
    console.log('\n✅ Constraint system generated!');
    console.log('Gates count:', gates.length);
    console.log('Gates:', JSON.stringify(gates, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConstraintContext();