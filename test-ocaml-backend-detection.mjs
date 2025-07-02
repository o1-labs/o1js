import { Field, ZkProgram, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('Testing OCaml backend detection during ZkProgram compilation...\n');

async function testOCamlDetection() {
  // Initialize with Snarky
  await initializeBindings();
  
  // Define a simple program
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        method(publicInput, secret) {
          console.log('[JS] Circuit execution - square constraint');
          secret.square().assertEquals(publicInput);
        }
      }
    }
  });
  
  console.log('=== Before Sparky switch ===');
  console.log('sparkyConstraintBridge exists:', !!globalThis.sparkyConstraintBridge);
  console.log('isActiveSparkyBackend():', globalThis.sparkyConstraintBridge?.isActiveSparkyBackend?.());
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n=== After Sparky switch ===');
  console.log('sparkyConstraintBridge exists:', !!globalThis.sparkyConstraintBridge);
  console.log('isActiveSparkyBackend():', globalThis.sparkyConstraintBridge?.isActiveSparkyBackend?.());
  
  console.log('\n=== Compiling with Sparky (watch for OCaml debug output) ===');
  try {
    const { verificationKey } = await SimpleProgram.compile();
    console.log('Compilation succeeded!');
    console.log('VK hash:', verificationKey.hash.toString());
  } catch (e) {
    console.error('Compilation failed:', e.message);
  }
}

testOCamlDetection().catch(console.error);