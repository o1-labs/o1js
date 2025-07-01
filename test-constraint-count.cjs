// Simple test to compare constraint counts between Sparky and Snarky
const { Field, Provable } = require('./dist/node/index.js');

// Simple circuit for testing
async function testCircuit() {
  await Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.add(y);
    z.assertEquals(Field(7));
  });
}

async function main() {
  console.log('Testing constraint generation...\n');
  
  // Test with default backend (Snarky)
  console.log('Running with Snarky backend...');
  try {
    await testCircuit();
    console.log('✓ Snarky test completed');
  } catch (e) {
    console.error('Snarky error:', e.message);
  }
  
  // Try to switch backend if available
  try {
    const { switchBackend } = require('./dist/node/bindings/backend-switch.js');
    
    console.log('\nSwitching to Sparky backend...');
    await switchBackend('sparky');
    
    console.log('Running with Sparky backend...');
    await testCircuit();
    console.log('✓ Sparky test completed');
    
    // Switch back
    await switchBackend('snarky');
  } catch (e) {
    console.log('Backend switching not available or error:', e.message);
  }
}

main().catch(console.error);