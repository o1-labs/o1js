#!/usr/bin/env node

/**
 * Debug WASM Binding Issue
 * 
 * The Poseidon error reveals: "Invalid FieldVar format: expected FieldConst tag 0, got tag 1"
 * This suggests a type encoding mismatch between o1js and Sparky WASM.
 */

console.log('🔍 DEBUG: WASM Binding Type Encoding Issue');
console.log('='.repeat(60));

async function debugWasmBindings() {
  try {
    const o1js = await import('./dist/node/index.js');
    const { Field, switchBackend, getCurrentBackend, Provable } = o1js;
    
    await switchBackend('sparky');
    console.log(`✅ Switched to: ${getCurrentBackend()}`);
    
    console.log('\n🔍 Testing different field variable formats...');
    
    // Test 1: Constant field
    console.log('\n📋 Test 1: Direct constant field');
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        const constant = Field(42);
        console.log('  Field(42) created as constant');
        constant.assertEquals(constant);
        return constant;
      });
      console.log('  ✅ Constant field works');
      console.log(`  📊 Constraints: ${constraintSystem.gates.length}`);
    } catch (error) {
      console.error('  ❌ Constant field failed:', error.message);
    }
    
    // Test 2: Witness field 
    console.log('\n📋 Test 2: Witness field');
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        const witness = Provable.witness(Field, () => Field(42));
        console.log('  Witness field created');
        witness.assertEquals(witness);
        return witness;
      });
      console.log('  ✅ Witness field works');
      console.log(`  📊 Constraints: ${constraintSystem.gates.length}`);
    } catch (error) {
      console.error('  ❌ Witness field failed:', error.message);
    }
    
    // Test 3: Arithmetic result field
    console.log('\n📋 Test 3: Arithmetic result field');
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(20));
        const b = Provable.witness(Field, () => Field(22));
        const result = a.add(b);
        console.log('  Arithmetic result field created');
        result.assertEquals(result);
        return result;
      });
      console.log('  ✅ Arithmetic result field works');
      console.log(`  📊 Constraints: ${constraintSystem.gates.length}`);
    } catch (error) {
      console.error('  ❌ Arithmetic result field failed:', error.message);
    }
    
    // Test 4: Complex operation that might trigger the encoding issue
    console.log('\n📋 Test 4: Complex field operation');
    try {
      const constraintSystem = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(5));
        const b = Provable.witness(Field, () => Field(10));
        const sum = a.add(b);
        const product = a.mul(b);
        const complex = sum.add(product);
        console.log('  Complex field operation created');
        
        // This might trigger the encoding issue
        console.log('  🎯 Testing complex field in cryptographic context...');
        // Instead of Poseidon, let's try a simpler operation first
        complex.assertEquals(complex);
        return complex;
      });
      console.log('  ✅ Complex field operation works');
      console.log(`  📊 Constraints: ${constraintSystem.gates.length}`);
    } catch (error) {
      console.error('  ❌ Complex field operation failed:', error.message);
    }
    
    // Test 5: Investigate the exact encoding issue
    console.log('\n📋 Test 5: Investigate field variable encoding');
    try {
      const field = Field(123);
      console.log('  Field value:', field.toString());
      console.log('  Field type:', typeof field);
      console.log('  Field constructor:', field.constructor.name);
      
      // Check internal representation if accessible
      if (field.value !== undefined) {
        console.log('  Field.value:', field.value);
        console.log('  Field.value type:', typeof field.value);
      }
      
      // Create witness and check its encoding
      const constraintSystem = await Provable.constraintSystem(() => {
        const witness = Provable.witness(Field, () => field);
        console.log('  Witness created for encoding test');
        
        // Check if we can access internal representation
        if (witness.value !== undefined) {
          console.log('  Witness.value:', witness.value);
          console.log('  Witness.value type:', typeof witness.value);
          
          // Check if it's an array (tag structure)
          if (Array.isArray(witness.value)) {
            console.log('  Witness.value is array:', witness.value);
            console.log('  Array length:', witness.value.length);
            if (witness.value.length > 0) {
              console.log('  First element (tag?):', witness.value[0]);
              console.log('  First element type:', typeof witness.value[0]);
            }
          }
        }
        
        witness.assertEquals(witness);
        return witness;
      });
      
      console.log('  ✅ Encoding investigation completed');
      
    } catch (error) {
      console.error('  ❌ Encoding investigation failed:', error.message);
      console.error('  ❌ Full error:', error);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

debugWasmBindings().then(() => {
  console.log('\n🔍 WASM binding debug complete');
}).catch(error => {
  console.error('💥 Unexpected error:', error);
});