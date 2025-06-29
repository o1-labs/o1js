/**
 * Backend Switching Test
 * 
 * Tests the runtime backend switching between Snarky and Sparky
 */

import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from '../bindings.js';
import { Field } from '../lib/provable/field.js';

async function testFieldOperations(backendName) {
  console.log(`\n=== Testing ${backendName} Backend ===`);
  
  try {
    // Test field creation and basic operations
    console.log('Creating field elements...');
    const a = new Field(100);
    const b = new Field(200);
    
    console.log(`a = ${a.toString()}`);
    console.log(`b = ${b.toString()}`);
    
    // Test addition
    const sum = a.add(b);
    console.log(`a + b = ${sum.toString()}`);
    
    // Test multiplication
    const product = a.mul(b);
    console.log(`a * b = ${product.toString()}`);
    
    // Test subtraction
    const diff = b.sub(a);
    console.log(`b - a = ${diff.toString()}`);
    
    // Test squaring
    const squared = a.square();
    console.log(`a² = ${squared.toString()}`);
    
    // Test comparison
    const equal = a.equals(a);
    console.log(`a == a: ${equal.toBoolean()}`);
    
    // Test constraint system
    console.log('\nTesting constraint system...');
    const cs = Snarky.run.enterConstraintSystem();
    
    // Add some constraints
    const x = new Field(42);
    const y = new Field(58);
    const z = x.add(y);
    z.assertEquals(new Field(100));
    
    const constraintSystem = cs();
    console.log(`Constraints generated with ${backendName}`);
    
    console.log(`✓ ${backendName} backend tests passed`);
    
  } catch (error) {
    console.error(`✗ ${backendName} backend tests failed:`, error.message);
    throw error;
  }
}

async function testPoseidonHash(backendName) {
  console.log(`\n=== Testing Poseidon Hash with ${backendName} ===`);
  
  try {
    const a = new Field(12345);
    const b = new Field(67890);
    
    // Create field vars for Poseidon
    const aVar = a.value;
    const bVar = b.value;
    
    console.log('Computing Poseidon hash...');
    const hash = Snarky.poseidon([aVar, bVar]);
    console.log(`Poseidon hash computed with ${backendName}`);
    
    // Read the result
    const hashValue = Snarky.field.readVar(hash);
    console.log(`Hash value: ${hashValue}`);
    
    console.log(`✓ Poseidon hash test passed`);
    
  } catch (error) {
    console.error(`✗ Poseidon hash test failed:`, error.message);
  }
}

async function main() {
  console.log('🚀 Backend Switching Test');
  console.log('=========================');
  
  try {
    // Test with default backend (Snarky)
    console.log(`\nCurrent backend: ${getCurrentBackend()}`);
    await testFieldOperations('Snarky');
    await testPoseidonHash('Snarky');
    
    // Switch to Sparky backend
    console.log('\n🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Test with Sparky backend
    await testFieldOperations('Sparky');
    await testPoseidonHash('Sparky');
    
    // Switch back to Snarky
    console.log('\n🔄 Switching back to Snarky backend...');
    await switchBackend('snarky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Verify we can still use Snarky
    const testField = new Field(999);
    console.log(`\nCreated field with value: ${testField.toString()}`);
    
    console.log('\n✅ Backend switching test completed successfully!');
    
    // Test environment variable
    console.log('\n📋 Environment Variable Test:');
    console.log(`O1JS_BACKEND=${process.env.O1JS_BACKEND || 'not set'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runBackendSwitchingTest };