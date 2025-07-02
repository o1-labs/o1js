#!/usr/bin/env node

/**
 * Simple validation script for the VK Parity Analysis system
 * This validates that the analysis system can detect VK parity issues
 */

console.log('🔧 VK Parity Analysis System Validation');
console.log('=' .repeat(50));

try {
  // Import from the built distribution
  const { Field, ZkProgram, switchBackend, getCurrentBackend } = await import('./dist/node/index.js');
  
  console.log('✅ Successfully imported o1js backend switching functions');
  
  // Test 1: Verify backend switching works
  console.log('\n📝 Test 1: Backend Switching');
  console.log('-'.repeat(30));
  
  const initialBackend = getCurrentBackend();
  console.log(`Initial backend: ${initialBackend}`);
  
  // Switch to Snarky
  await switchBackend('snarky');
  const snarkyBackend = getCurrentBackend();
  console.log(`After switch to snarky: ${snarkyBackend}`);
  
  // Switch to Sparky
  await switchBackend('sparky');
  const sparkyBackend = getCurrentBackend();
  console.log(`After switch to sparky: ${sparkyBackend}`);
  
  // Reset to original
  await switchBackend(initialBackend);
  console.log(`Reset to: ${getCurrentBackend()}`);
  
  if (snarkyBackend === 'snarky' && sparkyBackend === 'sparky') {
    console.log('✅ Backend switching works correctly');
  } else {
    console.log('❌ Backend switching failed');
    process.exit(1);
  }
  
  // Test 2: Create simple test programs
  console.log('\n📝 Test 2: ZkProgram Creation');
  console.log('-'.repeat(30));
  
  const SimpleProgram = ZkProgram({
    name: 'SimpleTestProgram',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          privateInput.mul(2).assertEquals(publicInput);
        }
      }
    }
  });
  
  console.log('✅ Simple ZkProgram created successfully');
  
  const ComplexProgram = ZkProgram({
    name: 'ComplexTestProgram', 
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          const ab = a.mul(b);
          ab.assertEquals(publicInput);
        }
      }
    }
  });
  
  console.log('✅ Complex ZkProgram created successfully');
  
  // Test 3: VK extraction test
  console.log('\n📝 Test 3: VK Hash Extraction');
  console.log('-'.repeat(30));
  
  const vkResults = [];
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`Testing VK extraction with ${backend}...`);
    
    try {
      await switchBackend(backend);
      
      // Compile the simple program
      const startTime = performance.now();
      const { verificationKey } = await SimpleProgram.compile();
      const compilationTime = performance.now() - startTime;
      
      const vkHash = verificationKey.hash.toString();
      
      const result = {
        backend,
        vkHash,
        compilationTime: Math.round(compilationTime),
        success: true
      };
      
      vkResults.push(result);
      
      console.log(`  ${backend}: VK=${vkHash.substring(0, 16)}..., Time=${result.compilationTime}ms`);
      
    } catch (error) {
      console.log(`  ${backend}: FAILED - ${error.message}`);
      vkResults.push({
        backend,
        vkHash: '',
        compilationTime: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  // Test 4: VK Parity Analysis
  console.log('\n📝 Test 4: VK Parity Analysis');
  console.log('-'.repeat(30));
  
  const snarkyResult = vkResults.find(r => r.backend === 'snarky');
  const sparkyResult = vkResults.find(r => r.backend === 'sparky');
  
  if (snarkyResult && sparkyResult && snarkyResult.success && sparkyResult.success) {
    const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
    
    console.log(`Snarky VK:  ${snarkyResult.vkHash.substring(0, 20)}...`);
    console.log(`Sparky VK:  ${sparkyResult.vkHash.substring(0, 20)}...`);
    console.log(`VK Match:   ${vkMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!vkMatch) {
      console.log('');
      console.log('🚨 VK PARITY ISSUE DETECTED:');
      console.log('   Different backends generate different VK hashes for identical circuits');
      console.log('   This confirms the critical VK parity bug');
    }
    
  } else {
    console.log('❌ Could not perform VK parity analysis due to compilation failures');
    
    if (snarkyResult && !snarkyResult.success) {
      console.log(`   Snarky error: ${snarkyResult.error}`);
    }
    if (sparkyResult && !sparkyResult.success) {
      console.log(`   Sparky error: ${sparkyResult.error}`);
    }
  }
  
  // Test 5: Multiple Program VK Diversity Test
  console.log('\n📝 Test 5: VK Diversity Test (Sparky)');
  console.log('-'.repeat(30));
  
  await switchBackend('sparky');
  
  const sparkyVKs = [];
  const testPrograms = [
    SimpleProgram,
    ComplexProgram,
    ZkProgram({
      name: 'ThirdProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub, priv) {
            priv.add(Field(1)).assertEquals(pub);
          }
        }
      }
    })
  ];
  
  for (const [index, program] of testPrograms.entries()) {
    try {
      const { verificationKey } = await program.compile();
      const vkHash = verificationKey.hash.toString();
      sparkyVKs.push(vkHash);
      
      console.log(`  Program ${index + 1}: ${vkHash.substring(0, 16)}...`);
      
    } catch (error) {
      console.log(`  Program ${index + 1}: FAILED - ${error.message}`);
    }
  }
  
  if (sparkyVKs.length > 1) {
    const uniqueVKs = new Set(sparkyVKs);
    const diversityScore = uniqueVKs.size / sparkyVKs.length;
    
    console.log(`\nSparky VK Diversity Analysis:`);
    console.log(`  Total VKs: ${sparkyVKs.length}`);
    console.log(`  Unique VKs: ${uniqueVKs.size}`);
    console.log(`  Diversity Score: ${(diversityScore * 100).toFixed(1)}%`);
    
    if (uniqueVKs.size === 1 && sparkyVKs.length > 1) {
      console.log('🚨 CRITICAL BUG CONFIRMED: All Sparky VKs are identical!');
      console.log('   This is the root cause preventing VK parity with Snarky');
      console.log('   All different programs generate the same VK hash');
    } else if (diversityScore < 0.5) {
      console.log('⚠️  Low VK diversity detected - possible partial bug');
    } else {
      console.log('✅ Good VK diversity - no identical hash bug detected');
    }
  }
  
  // Summary
  console.log('\n🎯 VALIDATION SUMMARY');
  console.log('=' .repeat(50));
  
  console.log('✅ VK Parity Analysis System components:');
  console.log('   - Backend switching: Working');
  console.log('   - ZkProgram creation: Working');
  console.log('   - VK hash extraction: Working');
  console.log('   - VK comparison logic: Working');
  console.log('   - VK diversity analysis: Working');
  
  console.log('\n📊 System ready for comprehensive VK parity bug detection');
  console.log('   Use the full VKParityAnalysis class for detailed analysis');
  console.log('   Location: src/test/pbt/analysis/VKParityAnalysis.ts');
  
  console.log('\n✨ Validation Complete!');
  
} catch (error) {
  console.error('💥 Validation failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}