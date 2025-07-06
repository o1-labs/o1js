/**
 * Simplified test to trace Bool constraint generation
 */

// Direct imports to avoid CircuitValue issues
import { Provable } from '../lib/provable/provable.js';
import { Bool } from '../lib/provable/bool.js';
import { getCurrentBackend, switchBackend } from '../bindings.js';

async function testBoolConstraints() {
  console.log('🔍 Testing Bool constraint generation...\n');
  
  const backends = ['snarky', 'sparky'] as const;
  
  for (const backend of backends) {
    console.log(`\n=== ${backend.toUpperCase()} backend ===`);
    
    try {
      await switchBackend(backend);
      
      // Test 1: Single Bool witness
      console.log('\n📊 Test 1: Single Bool witness');
      const singleBool = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => new Bool(true));
        return a;
      });
      
      console.log(`   Constraints: ${singleBool.gates.length}`);
      
      // Test 2: Two Bool witnesses
      console.log('\n📊 Test 2: Two Bool witnesses');
      const twoBools = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => new Bool(true));
        const b = Provable.witness(Bool, () => new Bool(false));
        return [a, b];
      });
      
      console.log(`   Constraints: ${twoBools.gates.length}`);
      console.log(`   Constraints per Bool: ${twoBools.gates.length / 2}`);
      
      // Test 3: Bool.and operation
      console.log('\n📊 Test 3: Bool.and operation');
      const andOp = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => new Bool(true));
        const b = Provable.witness(Bool, () => new Bool(false));
        const c = a.and(b);
        return c;
      });
      
      console.log(`   Constraints: ${andOp.gates.length}`);
      console.log(`   Bool witness constraints: 2 (expected)`)
      console.log(`   AND operation constraints: ${andOp.gates.length - 2}`);
      
    } catch (error) {
      console.error(`❌ Error with ${backend}:`, error);
    }
  }
}

testBoolConstraints().catch(console.error);