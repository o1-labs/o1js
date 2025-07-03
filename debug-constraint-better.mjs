/**
 * Better constraint generation test that matches working VK parity pattern
 */

import { Field, Provable, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintGeneration() {
  console.log('🔍 Testing constraint generation with proper circuit structure...\n');
  
  // Create a simple ZkProgram like the working additionProgram
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.mul(privateInput);
          result.assertEquals(Field(12));
        },
      },
    },
  });

  console.log('📊 Testing with ZkProgram.analyzeMethods (like VK parity tests):');
  
  // Test with Snarky backend
  console.log('\n🔄 Testing with Snarky backend:');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const snarkyAnalysis = await SimpleProgram.analyzeMethods();
    const snarkyConstraints = Object.values(snarkyAnalysis)[0]?.rows || 0;
    console.log('Snarky constraint count (analyzeMethods):', snarkyConstraints);
    console.log('Snarky constraints:', snarkyConstraints > 0 ? 'Generated ✅' : 'None generated ❌');
  } catch (error) {
    console.log('❌ Snarky analyzeMethods failed:', error.message);
  }
  
  // Test with Sparky backend
  console.log('\n🔄 Testing with Sparky backend:');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const sparkyAnalysis = await SimpleProgram.analyzeMethods();
    const sparkyConstraints = Object.values(sparkyAnalysis)[0]?.rows || 0;
    console.log('Sparky constraint count (analyzeMethods):', sparkyConstraints);
    console.log('Sparky constraints:', sparkyConstraints > 0 ? 'Generated ✅' : 'None generated ❌');
  } catch (error) {
    console.log('❌ Sparky analyzeMethods failed:', error.message);
  }
  
  console.log('\n📊 Testing with Provable.constraintSystem (the fixed path):');
  
  // Test Provable.constraintSystem with Snarky
  await switchBackend('snarky');
  try {
    const snarkyCS = await Provable.constraintSystem(() => {
      const a = Field(3);
      const b = Field(4);
      const result = a.mul(b);
      result.assertEquals(Field(12));
    });
    console.log('Snarky Provable.constraintSystem:', snarkyCS.gates.length, 'constraints');
  } catch (error) {
    console.log('❌ Snarky Provable.constraintSystem failed:', error.message);
  }
  
  // Test Provable.constraintSystem with Sparky
  await switchBackend('sparky');
  try {
    const sparkyCS = await Provable.constraintSystem(() => {
      const a = Field(3);
      const b = Field(4);
      const result = a.mul(b);
      result.assertEquals(Field(12));
    });
    console.log('Sparky Provable.constraintSystem:', sparkyCS.gates.length, 'constraints');
  } catch (error) {
    console.log('❌ Sparky Provable.constraintSystem failed:', error.message);
  }
  
  console.log('\n🔍 Testing direct constraint generation path:');
  
  // Test the basic constraint test pattern from VK parity tests
  await switchBackend('snarky');
  try {
    const snarkyBasic = await Provable.constraintSystem(() => {
      const x = Field(5);
      const y = Field(6);
      x.mul(y); // Basic multiplication
    });
    console.log('Snarky basic multiplication:', snarkyBasic.gates.length, 'constraints');
  } catch (error) {
    console.log('❌ Snarky basic test failed:', error.message);
  }
  
  await switchBackend('sparky');
  try {
    const sparkyBasic = await Provable.constraintSystem(() => {
      const x = Field(5);
      const y = Field(6);
      x.mul(y); // Basic multiplication
    });
    console.log('Sparky basic multiplication:', sparkyBasic.gates.length, 'constraints');
  } catch (error) {
    console.log('❌ Sparky basic test failed:', error.message);
  }
}

testConstraintGeneration().catch(console.error);