/**
 * Ultra-simple test to validate constraint interception
 */

import { Field, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSimpleConstraint() {
  console.log('🧪 Ultra-Simple Constraint Interception Test\n');
  
  await initializeBindings();
  
  // Mock sparkyConstraintBridge to capture intercepted constraints
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend: () => false,
    addConstraint: (constraint) => {
      console.log('🎯 CONSTRAINT INTERCEPTED:', constraint);
    },
    startConstraintAccumulation: () => {
      console.log('📝 Started constraint accumulation');
    },
    endConstraintAccumulation: () => {
      console.log('📝 Ended constraint accumulation');
    }
  };
  
  // Check if Snarky.field.assertEqual exists and can be overridden
  const { Snarky } = await import('./dist/node/bindings.js');
  console.log('🔍 Snarky.field.assertEqual exists:', typeof Snarky.field.assertEqual);
  console.log('🔍 Snarky.field object keys:', Object.keys(Snarky.field));
  
  const originalAssertEqual = Snarky.field.assertEqual;
  Snarky.field.assertEqual = (x, y) => {
    console.log('🔧 Snarky.field.assertEqual called!', {
      sparkyActive: globalThis.sparkyConstraintBridge.isActiveSparkyBackend(),
      x, y
    });
    return originalAssertEqual(x, y);
  };
  
  console.log('🔄 Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('Creating VARIABLE fields and testing assertEquals...');
    // Use Provable.witness to create variables instead of constants
    const { Provable } = await import('./dist/node/index.js');
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    
    console.log('Calling x.assertEquals(y) - should use normal Snarky...');
    // This should NOT be intercepted since Sparky is not active
    x.assertEquals(y);
    console.log('✅ Normal Snarky assertion completed');
    
  } catch (error) {
    console.log(`❌ Snarky test failed: ${error.message}`);
  }
  
  console.log('\n🔄 Testing with Sparky backend...');
  
  // Make sparkyConstraintBridge report Sparky as active
  globalThis.sparkyConstraintBridge.isActiveSparkyBackend = () => true;
  
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('Creating VARIABLE fields and testing assertEquals...');
    const { Provable } = await import('./dist/node/index.js');
    const x = Provable.witness(Field, () => Field(10));
    const y = Provable.witness(Field, () => Field(10));
    
    console.log('Calling x.assertEquals(y) - should be INTERCEPTED...');
    // This should be intercepted and sent to sparkyConstraintBridge.addConstraint
    x.assertEquals(y);
    console.log('✅ Sparky assertion completed (check for interception above)');
    
  } catch (error) {
    console.log(`❌ Sparky test failed: ${error.message}`);
  }
}

testSimpleConstraint().catch(console.error);