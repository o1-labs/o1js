/**
 * Simple test to analyze Bool constraint generation in Sparky vs Snarky
 */

import { Field, Bool, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function analyzeBooleanConstraints() {
  console.log('🔍 Analyzing boolean constraint generation...\n');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n=== Testing with ${backend.toUpperCase()} backend ===`);
    
    try {
      await switchBackend(backend);
      console.log(`✅ Switched to ${getCurrentBackend()} backend`);
      
      // Test 1: Simple AND operation
      console.log('\n📊 Test 1: Simple Bool AND operation');
      const andConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const result = a.and(b);
        result.assertEquals(result); // Ensure result is constrained
        return result;
      });
      
      console.log(`   Constraints: ${andConstraints.gates.length}`);
      console.log(`   Gate types: ${andConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 2: Simple OR operation  
      console.log('\n📊 Test 2: Simple Bool OR operation');
      const orConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const result = a.or(b);
        result.assertEquals(result);
        return result;
      });
      
      console.log(`   Constraints: ${orConstraints.gates.length}`);
      console.log(`   Gate types: ${orConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 3: Simple NOT operation
      console.log('\n📊 Test 3: Simple Bool NOT operation');
      const notConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        const result = a.not();
        result.assertEquals(result);
        return result;
      });
      
      console.log(`   Constraints: ${notConstraints.gates.length}`);
      console.log(`   Gate types: ${notConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 4: Complex boolean expression: (a AND b) OR (NOT c)
      console.log('\n📊 Test 4: Complex boolean expression: (a AND b) OR (NOT c)');
      const complexConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = Provable.witness(Bool, () => Bool(true));
        
        const andResult = a.and(b);
        const notResult = c.not();
        const finalResult = andResult.or(notResult);
        
        finalResult.assertEquals(finalResult);
        return finalResult;
      });
      
      console.log(`   Constraints: ${complexConstraints.gates.length}`);
      console.log(`   Gate types: ${complexConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 5: Just assertBool calls
      console.log('\n📊 Test 5: Multiple assertBool calls');
      const assertBoolConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(0));
        const c = Provable.witness(Field, () => Field(1));
        
        a.assertBool();  // Should add 1 constraint: x(x-1) = 0
        b.assertBool();  // Should add 1 constraint: x(x-1) = 0  
        c.assertBool();  // Should add 1 constraint: x(x-1) = 0
        
        return Field(0);
      });
      
      console.log(`   Constraints: ${assertBoolConstraints.gates.length}`);
      console.log(`   Gate types: ${assertBoolConstraints.gates.map(g => g.type).join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${backend} backend:`, error);
    }
  }
  
  console.log('\n🏁 Boolean constraint analysis complete!');
}

// Run the analysis
analyzeBooleanConstraints().catch(console.error);