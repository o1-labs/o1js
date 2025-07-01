import { Field, ZkProgram, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('Testing VK generation after field operation fixes...\n');

async function testVKGeneration() {
  // Initialize with Snarky first
  await initializeBindings();
  
  // Define a simple program
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        method(publicInput, secret) {
          secret.square().assertEquals(publicInput);
        }
      }
    }
  });
  
  // Define a multiplication program
  const MultiplyProgram = ZkProgram({
    name: 'MultiplyProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field, Field],
        method(publicInput, a, b) {
          a.mul(b).assertEquals(publicInput);
        }
      }
    }
  });
  
  // Define a complex program
  const ComplexProgram = ZkProgram({
    name: 'ComplexProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field, Field, Field],
        method(publicInput, a, b, c) {
          // (a * b) + c = publicInput
          a.mul(b).add(c).assertEquals(publicInput);
        }
      }
    }
  });
  
  console.log('=== Compiling with Snarky ===');
  
  let { verificationKey: vk1Snarky } = await SimpleProgram.compile();
  console.log('SimpleProgram VK hash:', vk1Snarky.hash.toString());
  
  let { verificationKey: vk2Snarky } = await MultiplyProgram.compile();
  console.log('MultiplyProgram VK hash:', vk2Snarky.hash.toString());
  
  let { verificationKey: vk3Snarky } = await ComplexProgram.compile();
  console.log('ComplexProgram VK hash:', vk3Snarky.hash.toString());
  
  // Check if all Snarky VKs are different
  const snarkyUnique = vk1Snarky.hash.toString() !== vk2Snarky.hash.toString() && 
                       vk2Snarky.hash.toString() !== vk3Snarky.hash.toString();
  console.log('\nSnarky VKs unique:', snarkyUnique ? '✅' : '❌');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n=== Compiling with Sparky ===');
  
  let { verificationKey: vk1Sparky } = await SimpleProgram.compile();
  console.log('SimpleProgram VK hash:', vk1Sparky.hash.toString());
  
  let { verificationKey: vk2Sparky } = await MultiplyProgram.compile();
  console.log('MultiplyProgram VK hash:', vk2Sparky.hash.toString());
  
  let { verificationKey: vk3Sparky } = await ComplexProgram.compile();
  console.log('ComplexProgram VK hash:', vk3Sparky.hash.toString());
  
  // Check if all Sparky VKs are different
  const sparkyUnique = vk1Sparky.hash.toString() !== vk2Sparky.hash.toString() && 
                       vk2Sparky.hash.toString() !== vk3Sparky.hash.toString();
  console.log('\nSparky VKs unique:', sparkyUnique ? '✅' : '❌');
  
  console.log('\n=== Analysis ===');
  if (sparkyUnique) {
    console.log('✅ SUCCESS: Sparky now generates unique VKs for different programs!');
    console.log('The field operation implementation fixed the constraint generation issue.');
  } else {
    console.log('❌ ISSUE: Sparky still generates identical VKs.');
    console.log('Further investigation needed into the constraint system → VK pipeline.');
  }
  
  // Compare specific VKs
  console.log('\n=== VK Comparison ===');
  console.log('SimpleProgram match:', vk1Snarky.hash.toString() === vk1Sparky.hash.toString() ? '✅' : '❌');
  console.log('MultiplyProgram match:', vk2Snarky.hash.toString() === vk2Sparky.hash.toString() ? '✅' : '❌');
  console.log('ComplexProgram match:', vk3Snarky.hash.toString() === vk3Sparky.hash.toString() ? '✅' : '❌');
}

testVKGeneration().catch(console.error);