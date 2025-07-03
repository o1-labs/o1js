#!/usr/bin/env node

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 DEEP VK DEBUGGING: Comparing constraint structures between backends');

// Ultra-simple circuit: just x.assertEquals(x)
const TestProgram = ZkProgram({
  name: 'VKDebugTest',
  publicOutput: Field,
  methods: {
    simpleAssert: {
      privateInputs: [Field],
      publicOutput: Field,
      method: (x) => {
        x.assertEquals(x); // Should be trivially true
        return x;
      }
    }
  }
});

async function testBackend(backendName) {
  console.log(`\n🧪 Testing ${backendName} backend...`);
  await switchBackend(backendName);
  
  try {
    const { verificationKey } = await TestProgram.compile();
    const vkHash = verificationKey.hash();
    const vkData = verificationKey.data;
    
    console.log(`✅ ${backendName} VK Hash: ${vkHash}`);
    console.log(`📊 ${backendName} VK Data Length: ${vkData.length} bytes`);
    
    // Log first few bytes of VK data for comparison
    const firstBytes = vkData.slice(0, 32);
    console.log(`🔍 ${backendName} VK First 32 bytes: ${Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`);
    
    return { hash: vkHash, data: vkData, dataLength: vkData.length };
  } catch (error) {
    console.error(`❌ ${backendName} failed:`, error.message);
    return null;
  }
}

async function main() {
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  if (snarkyResult && sparkyResult) {
    console.log('\n🎯 COMPARISON RESULTS:');
    console.log(`VK Hash Match: ${snarkyResult.hash === sparkyResult.hash ? '✅ YES' : '❌ NO'}`);
    console.log(`VK Data Length Match: ${snarkyResult.dataLength === sparkyResult.dataLength ? '✅ YES' : '❌ NO'}`);
    
    if (snarkyResult.dataLength === sparkyResult.dataLength) {
      // Find first different byte
      let firstDiff = -1;
      for (let i = 0; i < snarkyResult.data.length; i++) {
        if (snarkyResult.data[i] !== sparkyResult.data[i]) {
          firstDiff = i;
          break;
        }
      }
      
      if (firstDiff === -1) {
        console.log('🎉 VK data is IDENTICAL but hashes differ - hash computation issue!');
      } else {
        console.log(`🔍 First difference at byte ${firstDiff} (${(firstDiff / snarkyResult.dataLength * 100).toFixed(1)}% through)`);
        console.log(`   Snarky: 0x${snarkyResult.data[firstDiff].toString(16).padStart(2, '0')}`);
        console.log(`   Sparky: 0x${sparkyResult.data[firstDiff].toString(16).padStart(2, '0')}`);
      }
    }
  }
}

main().catch(console.error);