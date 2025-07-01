import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';
import { ZkProgram } from '../../dist/node/lib/proof-system/zkprogram.js';

async function debugVKGeneration() {
  await initializeBindings();
  
  console.log('=== Debugging VK Generation Issue ===\n');
  
  // Test 1: Create identical programs with both backends
  const createProgram = () => ZkProgram({
    name: 'test-program',
    publicInput: Field,
    methods: {
      simpleCheck: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // This should generate constraints
          publicInput.mul(privateInput).assertEquals(Field(100));
        }
      }
    }
  });
  
  // Compile with Snarky
  console.log('1. Compiling with Snarky...');
  const program1 = createProgram();
  const snarkyVK = await program1.compile();
  console.log('   Snarky VK hash:', snarkyVK.verificationKey.hash.toBigInt());
  console.log('   Snarky VK data length:', snarkyVK.verificationKey.data.length);
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Compile with Sparky
  console.log('\n2. Compiling with Sparky...');
  const program2 = createProgram();
  const sparkyVK = await program2.compile();
  console.log('   Sparky VK hash:', sparkyVK.verificationKey.hash.toBigInt());
  console.log('   Sparky VK data length:', sparkyVK.verificationKey.data.length);
  console.log('   VKs match?', snarkyVK.verificationKey.hash.toBigInt() === sparkyVK.verificationKey.hash.toBigInt());
  
  // Test 2: Check constraint system differences during compilation
  console.log('\n3. Testing constraint system directly:');
  
  // Define the circuit function
  const circuitFn = () => {
    const pub = Provable.witness(Field, () => Field(10));
    const priv = Provable.witness(Field, () => Field(10));
    pub.mul(priv).assertEquals(Field(100));
  };
  
  // Get constraint system with Sparky
  const sparkyCS = await Provable.constraintSystem(circuitFn);
  console.log('\n   Sparky constraint system:');
  console.log('   Gates:', sparkyCS.gates.length);
  console.log('   Summary:', sparkyCS.summary());
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Get constraint system with Snarky
  const snarkyCS = await Provable.constraintSystem(circuitFn);
  console.log('\n   Snarky constraint system:');
  console.log('   Gates:', snarkyCS.gates.length);
  console.log('   Summary:', snarkyCS.summary());
  
  // Test 3: Check raw constraint accumulation
  console.log('\n4. Testing raw constraint accumulation:');
  await switchBackend('sparky');
  
  // Import adapter to check constraint state
  try {
    // Run a simple circuit that should generate constraints
    await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      const c = a.mul(b);
      c.assertEquals(Field(12));
    });
    
    console.log('   ✅ Constraint system execution completed');
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }
  
  // Test 4: Compare actual VK data
  console.log('\n5. Comparing VK data structure:');
  console.log('   Snarky VK data (first 100 chars):', snarkyVK.verificationKey.data.substring(0, 100));
  console.log('   Sparky VK data (first 100 chars):', sparkyVK.verificationKey.data.substring(0, 100));
  console.log('   Data identical?', snarkyVK.verificationKey.data === sparkyVK.verificationKey.data);
}

debugVKGeneration().catch(console.error);