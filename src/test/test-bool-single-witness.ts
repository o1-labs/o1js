/**
 * Test to trace Bool constraint generation for a single witness
 */

import { Bool, Provable, ZkProgram } from '../index.js';
import { getCurrentBackend, switchBackend } from '../bindings.js';

async function testSingleBoolWitness() {
  console.log('🔍 Testing single Bool witness constraint generation...\n');
  
  const backends = ['snarky', 'sparky'] as const;
  
  for (const backend of backends) {
    console.log(`\n=== Testing with ${backend.toUpperCase()} backend ===`);
    
    try {
      await switchBackend(backend);
      console.log(`✅ Switched to ${getCurrentBackend()} backend`);
      
      // Test 1: Single Bool witness with no operations
      console.log('\n📊 Test 1: Single Bool witness (no operations)');
      const singleBoolConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        return a;
      });
      
      console.log(`   Total constraints: ${singleBoolConstraints.gates.length}`);
      console.log(`   Gate types: ${singleBoolConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 2: ZkProgram with Bool input
      console.log('\n📊 Test 2: ZkProgram with single Bool input');
      const TestProgram = ZkProgram({
        name: 'TestBoolProgram',
        publicInput: Bool,
        methods: {
          run: {
            privateInputs: [],
            method(publicInput: Bool) {
              // Do nothing - just accept the input
              return publicInput;
            }
          }
        }
      });
      
      const { gates } = await TestProgram.analyzeMethods();
      console.log(`   run method constraints: ${gates.run.length}`);
      console.log(`   Gate types: ${gates.run.map(g => g.type).join(', ')}`);
      
      // Test 3: Check what Bool.check() does
      console.log('\n📊 Test 3: Explicit Bool.check() call');
      const checkConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        Bool.check(a);
        return a;
      });
      
      console.log(`   Total constraints: ${checkConstraints.gates.length}`);
      console.log(`   Gate types: ${checkConstraints.gates.map(g => g.type).join(', ')}`);
      
      // Test 4: Multiple Bool witnesses
      console.log('\n📊 Test 4: Three Bool witnesses');
      const threeBoolConstraints = await Provable.constraintSystem(() => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = Provable.witness(Bool, () => Bool(true));
        return [a, b, c];
      });
      
      console.log(`   Total constraints: ${threeBoolConstraints.gates.length}`);
      console.log(`   Constraints per Bool: ${threeBoolConstraints.gates.length / 3}`);
      console.log(`   Gate types: ${threeBoolConstraints.gates.map(g => g.type).join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${backend} backend:`, error);
    }
  }
  
  console.log('\n🏁 Single Bool witness test complete!');
}

// Run the test
testSingleBoolWitness().catch(console.error);