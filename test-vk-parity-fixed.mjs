#!/usr/bin/env node

/**
 * CRITICAL TEST: Does the constraint optimization fix resolve VK parity?
 * 
 * Previously: ALL Sparky programs generated identical VK: 18829260448603674120...
 * Now: Test if different programs generate different VKs
 */

import { Field, ZkProgram, Provable } from './dist/node/index.js';
import { switchBackend, initializeBindings } from './dist/node/bindings.js';

// Test programs with different constraint patterns
const TestProgram1 = ZkProgram({
  name: 'simple-equality',
  publicInput: Field,
  methods: {
    checkEqual: {
      privateInputs: [],
      method(publicInput) {
        // Simple constraint: publicInput = 5
        publicInput.assertEquals(Field(5));
      }
    }
  }
});

const TestProgram2 = ZkProgram({
  name: 'addition-check', 
  publicInput: Field,
  methods: {
    checkSum: {
      privateInputs: [Field],
      method(publicInput, privateInput) {
        // Different constraint: privateInput + 3 = publicInput
        const sum = privateInput.add(Field(3));
        sum.assertEquals(publicInput);
      }
    }
  }
});

const TestProgram3 = ZkProgram({
  name: 'multiplication-check',
  publicInput: Field, 
  methods: {
    checkProduct: {
      privateInputs: [Field, Field],
      method(publicInput, a, b) {
        // Different constraint pattern: a * b = publicInput
        const product = a.mul(b);
        product.assertEquals(publicInput);
      }
    }
  }
});

async function testVKGeneration(backend) {
  console.log(`\n🔍 Testing VK Generation with ${backend.toUpperCase()}`);
  console.log('=' .repeat(50));
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    console.log('  📋 Compiling Program 1 (simple equality)...');
    const { verificationKey: vk1 } = await TestProgram1.compile();
    const vk1Hash = vk1.hash;
    
    console.log('  📋 Compiling Program 2 (addition check)...');
    const { verificationKey: vk2 } = await TestProgram2.compile();
    const vk2Hash = vk2.hash;
    
    console.log('  📋 Compiling Program 3 (multiplication check)...');
    const { verificationKey: vk3 } = await TestProgram3.compile();
    const vk3Hash = vk3.hash;
    
    console.log(`\n  📊 ${backend.toUpperCase()} VK Results:`);
    console.log(`    Program 1: ${vk1Hash}`);
    console.log(`    Program 2: ${vk2Hash}`);
    console.log(`    Program 3: ${vk3Hash}`);
    
    // Debug VK hash types and values
    console.log(`\n  🔍 Debug info:`);
    console.log(`    VK1 type: ${typeof vk1Hash}, value: ${vk1Hash}`);
    console.log(`    VK2 type: ${typeof vk2Hash}, value: ${vk2Hash}`);
    console.log(`    VK3 type: ${typeof vk3Hash}, value: ${vk3Hash}`);
    
    // Check for uniqueness
    const unique = new Set([String(vk1Hash), String(vk2Hash), String(vk3Hash)]);
    const allUnique = unique.size === 3;
    
    console.log(`    Set size: ${unique.size}, expected: 3`);
    
    console.log(`\n  🎯 VK Uniqueness: ${allUnique ? '✅ ALL DIFFERENT' : '❌ DUPLICATES FOUND'}`);
    
    if (!allUnique) {
      console.log('    🚨 CRITICAL: Programs generating identical VKs!');
      if (vk1Hash === vk2Hash && vk2Hash === vk3Hash) {
        console.log('    📊 All three programs have IDENTICAL VKs');
        if (backend === 'sparky' && vk1Hash.startsWith('18829260448603674120')) {
          console.log('    ⚠️  Still seeing the old broken VK hash pattern!');
        }
      }
    } else {
      console.log('    🎉 SUCCESS: Each program generates unique VK!');
    }
    
    return {
      vk1Hash,
      vk2Hash, 
      vk3Hash,
      allUnique,
      backend
    };
    
  } catch (error) {
    console.log(`  ❌ Error compiling with ${backend}: ${error.message}`);
    return {
      error: error.message,
      backend
    };
  }
}

async function main() {
  console.log('🎯 VK PARITY TEST - CRITICAL BREAKTHROUGH CHECK');
  console.log('===============================================');
  console.log('Testing if constraint optimization fixes resolved VK parity issue...\n');
  
  // Test both backends
  const snarkyResults = await testVKGeneration('snarky');
  const sparkyResults = await testVKGeneration('sparky');
  
  console.log('\n🔍 COMPARATIVE ANALYSIS');
  console.log('=' .repeat(50));
  
  if (snarkyResults.error || sparkyResults.error) {
    console.log('❌ One or both backends failed to compile');
    if (snarkyResults.error) console.log(`   Snarky error: ${snarkyResults.error}`);
    if (sparkyResults.error) console.log(`   Sparky error: ${sparkyResults.error}`);
    return;
  }
  
  console.log('📊 VK Uniqueness Results:');
  console.log(`   Snarky: ${snarkyResults.allUnique ? '✅ All programs generate different VKs' : '❌ Some VKs identical'}`);
  console.log(`   Sparky: ${sparkyResults.allUnique ? '✅ All programs generate different VKs' : '❌ Some VKs identical'}`);
  
  console.log('\n📊 Cross-Backend VK Comparison:');
  console.log(`   Program 1: Snarky=${String(snarkyResults.vk1Hash).slice(0,20)}... vs Sparky=${String(sparkyResults.vk1Hash).slice(0,20)}...`);
  console.log(`   Program 2: Snarky=${String(snarkyResults.vk2Hash).slice(0,20)}... vs Sparky=${String(sparkyResults.vk2Hash).slice(0,20)}...`);
  console.log(`   Program 3: Snarky=${String(snarkyResults.vk3Hash).slice(0,20)}... vs Sparky=${String(sparkyResults.vk3Hash).slice(0,20)}...`);
  
  const vkParity = {
    program1Match: snarkyResults.vk1Hash === sparkyResults.vk1Hash,
    program2Match: snarkyResults.vk2Hash === sparkyResults.vk2Hash, 
    program3Match: snarkyResults.vk3Hash === sparkyResults.vk3Hash
  };
  
  const perfectParity = vkParity.program1Match && vkParity.program2Match && vkParity.program3Match;
  
  console.log('\n🎯 FINAL VERDICT:');
  console.log('=' .repeat(50));
  
  if (sparkyResults.allUnique) {
    console.log('✅ **MAJOR BREAKTHROUGH**: Sparky VK parity issue RESOLVED!');
    console.log('   Different programs now generate different VKs in Sparky');
    console.log('   This indicates constraint optimization fixes were successful');
    
    if (perfectParity) {
      console.log('✅ **PERFECT PARITY**: Snarky and Sparky generate identical VKs for same programs!');
      console.log('   🚀 Sparky is now fully compatible with Snarky for VK generation');
    } else {
      console.log('⚠️  **PARTIAL PARITY**: Different VKs but not matching Snarky exactly');
      console.log('   This may be due to remaining constraint optimization differences');
      console.log('   Programs still generate unique VKs, which resolves the core issue');
    }
  } else {
    console.log('❌ **VK PARITY ISSUE PERSISTS**: Sparky still generating duplicate VKs');
    console.log('   The constraint optimization fixes did not fully resolve the issue');
    console.log('   Further investigation needed in constraint → VK conversion pipeline');
  }
  
  console.log('\n💡 Key Insights:');
  console.log('   - The original issue was ALL programs generating the SAME VK in Sparky');
  console.log('   - Success = different programs generate DIFFERENT VKs in Sparky');
  console.log('   - Perfect success = Sparky VKs match Snarky VKs for same programs');
}

main().catch(console.error);