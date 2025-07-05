/**
 * Debug Semantic If Constraint Implementation
 */

import { switchBackend } from './dist/node/bindings.js';
import { Field, Bool, Provable } from './dist/node/index.js';

async function debugSemanticIf() {
  console.log('🔍 Debugging Semantic If Constraint Implementation\n');

  await switchBackend('sparky');
  
  console.log('=== Direct Bridge Call Test ===');
  const bridge = globalThis.sparkyConstraintBridge;
  console.log('Bridge exists:', !!bridge);
  console.log('emitIfConstraint exists:', !!bridge?.emitIfConstraint);
  
  if (bridge?.emitIfConstraint) {
    try {
      console.log('Testing direct bridge call...');
      
      // Test with simple FieldVar format inputs
      const condition = [1, 1]; // Variable 1 
      const thenVal = [0, [0, 10n]]; // Constant 10
      const elseVal = [0, [0, 5n]]; // Constant 5
      
      console.log('Input condition:', condition);
      console.log('Input thenVal:', thenVal);  
      console.log('Input elseVal:', elseVal);
      
      const result = bridge.emitIfConstraint(condition, thenVal, elseVal);
      
      console.log('Bridge result:', result);
      console.log('Result type:', typeof result);
      console.log('Result is array:', Array.isArray(result));
      
      if (result && Array.isArray(result)) {
        console.log('✅ Bridge call successful, result:', result);
      } else {
        console.log('❌ Bridge call returned null or invalid result');
      }
      
    } catch (error) {
      console.log('❌ Bridge call error:', error.message);
      console.log('Error stack:', error.stack);
    }
  }

  console.log('\n=== Field.toFields() Format Test ===');
  try {
    const condition = Bool(true);
    const thenVal = Field(10); 
    const elseVal = Field(5);
    
    console.log('condition.toFields():', condition.toFields());
    console.log('thenVal.toFields():', thenVal.toFields());
    console.log('elseVal.toFields():', elseVal.toFields());
    
    console.log('condition.toFields()[0]:', condition.toFields()[0]);
    console.log('typeof condition.toFields()[0]:', typeof condition.toFields()[0]);
    
  } catch (error) {
    console.log('❌ toFields error:', error.message);
  }

  console.log('\n=== Constraint System Context Test ===');
  try {
    const constraints = await Provable.constraintSystem(() => {
      console.log('  Inside constraint system context...');
      
      const condition = Bool(true);
      const thenVal = Field(10);
      const elseVal = Field(5);
      
      console.log('  Created fields successfully');
      console.log('  condition.toFields()[0]:', condition.toFields()[0]);
      
      if (bridge?.emitIfConstraint) {
        console.log('  Calling emitIfConstraint with .value access...');
        console.log('  condition.value:', condition.value);
        console.log('  thenVal.value:', thenVal.value);
        console.log('  elseVal.value:', elseVal.value);
        
        const result = bridge.emitIfConstraint(
          condition.value,
          thenVal.value,
          elseVal.value
        );
        console.log('  emitIfConstraint result:', result);
        
        if (result) {
          console.log('  ✅ Semantic constraint succeeded in context');
          // Try to use the result
          try {
            const resultField = new Field(result);
            console.log('  Created result field:', resultField.toString());
            resultField.assertEquals(Field(10));
            console.log('  ✅ Applied constraint to result field');
          } catch (fieldError) {
            console.log('  ❌ Failed to create field from result:', fieldError.message);
          }
        } else {
          console.log('  ❌ Semantic constraint returned null in context');
        }
      }
    });
    
    console.log('Final constraint count:', constraints.rows);
    
  } catch (error) {
    console.log('❌ Constraint system error:', error.message);
  }

  console.log('\n🏁 Debug Complete');
}

debugSemanticIf().catch(console.error);