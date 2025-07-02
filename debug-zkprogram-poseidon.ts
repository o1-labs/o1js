/**
 * Debug ZkProgram Poseidon compilation to understand constraint generation
 */

import { Field, ZkProgram, Poseidon, initializeBindings, switchBackend } from './dist/node/index.js';

async function debugZkProgramCompilation() {
  console.log('🔬 ZkProgram Poseidon Debug');
  console.log('============================');
  
  await initializeBindings();
  
  // Test with Snarky first
  console.log('\n🔵 Testing Snarky ZkProgram compilation...');
  await switchBackend('snarky');
  
  const TestProgram = ZkProgram({
    name: 'DebugPoseidon',
    publicInput: Field,
    methods: {
      hashTest: {
        privateInputs: [Field],
        async method(publicInput: Field, privateInput: Field) {
          console.log('📝 Method executing with inputs:', publicInput.toString(), privateInput.toString());
          
          // Basic hash operation
          const hashResult = Poseidon.hash([publicInput, privateInput]);
          console.log('🔐 Hash result:', hashResult.toString());
          
          // Add a simple assertion to ensure constraint generation
          publicInput.assertEquals(publicInput);
          console.log('✅ Assertion added');
        }
      }
    }
  });
  
  try {
    console.log('🔨 Starting Snarky compilation...');
    const vk = await TestProgram.compile();
    console.log('✅ Snarky compilation completed');
    console.log('📋 VK type:', typeof vk);
    console.log('📋 VK preview:', JSON.stringify(vk).slice(0, 100) + '...');
  } catch (error: any) {
    console.log('❌ Snarky compilation failed:', error.message);
  }
  
  // Test with Sparky
  console.log('\n🟠 Testing Sparky ZkProgram compilation...');
  await switchBackend('sparky');
  
  try {
    console.log('🔨 Starting Sparky compilation...');
    const vk = await TestProgram.compile();
    console.log('✅ Sparky compilation completed');
    console.log('📋 VK type:', typeof vk);
    console.log('📋 VK preview:', JSON.stringify(vk).slice(0, 100) + '...');
  } catch (error: any) {
    console.log('❌ Sparky compilation failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugZkProgramCompilation().catch(console.error);