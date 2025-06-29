/**
 * Backend VK Matching Test
 * Validates that Snarky and Sparky backends produce identical VKs
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend, Poseidon } from './dist/node/index.js';

async function testBackendVKMatching() {
  console.log('🔑 Testing VK matching between Snarky and Sparky backends...');
  
  // Initialize bindings
  console.log('Initializing bindings...');
  await initializeBindings();
  
  const testProgram = ZkProgram({
    name: 'backendComparisonTest',
    publicInput: Field,
    methods: {
      hash3: {
        privateInputs: [Field, Field, Field],
        async method(publicInput: Field, a: Field, b: Field, c: Field) {
          // Use Poseidon hash with 3 private inputs (odd case)
          const hash = Poseidon.hash([a, b, c]);
          hash.assertEquals(publicInput);
        },
      },
    },
  });
  
  let snarkyVK: string;
  let sparkyVK: string;
  
  try {
    // Test with Snarky backend
    console.log('\n📋 Testing with Snarky backend...');
    await switchBackend('snarky');
    console.log('Current backend:', getCurrentBackend());
    
    const { verificationKey: snarkyVKObj } = await testProgram.compile();
    snarkyVK = snarkyVKObj.data;
    console.log('✅ Snarky compilation successful');
    console.log('📏 Snarky VK length:', snarkyVK.length, 'chars');
    
    // Test with Sparky backend
    console.log('\n📋 Testing with Sparky backend...');
    await switchBackend('sparky');
    console.log('Current backend:', getCurrentBackend());
    
    const { verificationKey: sparkyVKObj } = await testProgram.compile();
    sparkyVK = sparkyVKObj.data;
    console.log('✅ Sparky compilation successful');
    console.log('📏 Sparky VK length:', sparkyVK.length, 'chars');
    
    // Compare VKs
    console.log('\n============================================================');
    console.log('🔑 VK MATCHING RESULTS:');
    console.log('============================================================');
    
    const vksMatch = snarkyVK === sparkyVK;
    console.log('🔍 VKs match exactly:', vksMatch);
    
    if (vksMatch) {
      console.log('🎉 PERFECT! Backend compatibility confirmed!');
      console.log('✅ Snarky and Sparky produce identical verification keys');
      console.log('✅ Programs can switch between backends seamlessly');
    } else {
      console.log('⚠️  VKs differ between backends');
      console.log('📊 First 100 chars of Snarky VK:', snarkyVK.substring(0, 100));
      console.log('📊 First 100 chars of Sparky VK:', sparkyVK.substring(0, 100));
      
      // Find first difference
      let firstDiffIndex = -1;
      for (let i = 0; i < Math.min(snarkyVK.length, sparkyVK.length); i++) {
        if (snarkyVK[i] !== sparkyVK[i]) {
          firstDiffIndex = i;
          break;
        }
      }
      
      if (firstDiffIndex !== -1) {
        console.log('🔍 First difference at index:', firstDiffIndex);
        console.log('   Snarky:', snarkyVK.substring(firstDiffIndex - 10, firstDiffIndex + 10));
        console.log('   Sparky:', sparkyVK.substring(firstDiffIndex - 10, firstDiffIndex + 10));
      }
    }
    
    console.log('\n🔧 Backend VK matching test complete!');
    
  } catch (error) {
    console.error('❌ Backend VK test failed:', error);
    throw error;
  }
}

testBackendVKMatching().catch(console.error);
