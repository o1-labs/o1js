/**
 * Minimal VK Test
 * 
 * The simplest possible test to check if VKs match between backends.
 * This avoids all the complexity of ZkProgram and focuses on raw constraint system VKs.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from 'o1js';
import { Pickles, Test } from '../../bindings/compiled/_node_bindings/o1js_node.bc.cjs';

async function testMinimalVK() {
  console.log('🔍 Minimal VK Test - Testing simplest possible circuit\n');
  
  const originalBackend = getCurrentBackend();
  
  try {
    // Define the simplest possible circuit
    const simpleCircuit = () => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    };
    
    // Test with Snarky
    console.log('Testing with Snarky...');
    await switchBackend('snarky');
    
    const snarkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Snarky constraint count:', snarkyCS.gates.length);
    console.log('Snarky gates:', snarkyCS.summary());
    
    // Generate VK with Snarky using low-level API
    const snarkyVKResult = Test.vk.circuitDigest(snarkyCS.digest);
    console.log('Snarky VK digest:', snarkyVKResult);
    
    // Test with Sparky
    console.log('\nTesting with Sparky...');
    await switchBackend('sparky');
    
    const sparkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Sparky constraint count:', sparkyCS.gates.length);
    console.log('Sparky gates:', sparkyCS.summary());
    
    // Generate VK with Sparky
    const sparkyVKResult = Test.vk.circuitDigest(sparkyCS.digest);
    console.log('Sparky VK digest:', sparkyVKResult);
    
    // Compare
    console.log('\n=== RESULTS ===');
    console.log('Constraint counts match:', snarkyCS.gates.length === sparkyCS.gates.length);
    console.log('VK digests match:', snarkyVKResult === sparkyVKResult);
    
    if (snarkyVKResult !== sparkyVKResult) {
      console.log('\n❌ VK digests differ!');
      console.log('This indicates the constraint systems are fundamentally different.');
      
      // Let's also check the raw constraint system JSON
      console.log('\nChecking raw constraint system structure...');
      
      // Get more details about the differences
      if (snarkyCS.gates.length > 0 && sparkyCS.gates.length > 0) {
        console.log('\nFirst gate comparison:');
        console.log('Snarky:', snarkyCS.gates[0]);
        console.log('Sparky:', sparkyCS.gates[0]);
      }
    } else {
      console.log('\n✅ VK digests match! The backends are generating identical constraint systems.');
    }
    
  } finally {
    // Restore original backend
    await switchBackend(originalBackend);
  }
}

// Run the test
if (require.main === module) {
  testMinimalVK().catch(console.error);
}

export { testMinimalVK };