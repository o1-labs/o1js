/**
 * VK Hashing Analysis
 * 
 * This test examines if the VK hashing algorithm differs between backends,
 * rather than the actual constraint system data being different.
 */

async function analyzeVKHashing() {
  console.log('🔍 VK HASHING ANALYSIS');
  console.log('=====================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, switchBackend } = o1js;

  // Simple test program
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.add(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });

  const vkData = {};

  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Analyzing ${backend.toUpperCase()} VK data...`);
    console.log('─'.repeat(50));
    
    try {
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      const compilationResult = await TestProgram.compile();
      const vk = compilationResult.verificationKey;
      
      vkData[backend] = {
        hash: vk.hash,
        dataType: typeof vk.data,
        dataLength: vk.data.length,
        dataIsString: typeof vk.data === 'string',
        dataFirstChars: typeof vk.data === 'string' ? vk.data.substring(0, 100) : 'not string',
        dataLastChars: typeof vk.data === 'string' ? vk.data.substring(vk.data.length - 100) : 'not string'
      };
      
      console.log(`📋 VK hash: ${vk.hash}`);
      console.log(`📋 VK data type: ${typeof vk.data}`);
      console.log(`📋 VK data length: ${vk.data.length}`);
      console.log(`📋 VK data first 100 chars: ${vkData[backend].dataFirstChars}`);
      console.log(`📋 VK data last 100 chars: ${vkData[backend].dataLastChars}`);
      
      // Try to access raw data for deeper comparison
      if (typeof vk.data === 'string') {
        // Convert to array for character-by-character comparison
        vkData[backend].dataArray = Array.from(vk.data);
        console.log(`📋 VK data as array length: ${vkData[backend].dataArray.length}`);
      }
      
    } catch (error) {
      console.log(`❌ ${backend} analysis failed: ${error.message}`);
      vkData[backend] = { error: error.message };
    }
  }

  // Detailed comparison
  console.log('\n📊 VK DATA COMPARISON');
  console.log('====================\n');
  
  const snarkyVK = vkData['snarky'];
  const sparkyVK = vkData['sparky'];
  
  if (snarkyVK && sparkyVK && !snarkyVK.error && !sparkyVK.error) {
    console.log('🔍 BASIC COMPARISON:');
    console.log(`Data types match: ${snarkyVK.dataType === sparkyVK.dataType}`);
    console.log(`Data lengths match: ${snarkyVK.dataLength === sparkyVK.dataLength}`);
    console.log(`First 100 chars match: ${snarkyVK.dataFirstChars === sparkyVK.dataFirstChars}`);
    console.log(`Last 100 chars match: ${snarkyVK.dataLastChars === sparkyVK.dataLastChars}`);
    
    if (snarkyVK.dataArray && sparkyVK.dataArray) {
      console.log('\n🔍 DETAILED CHARACTER COMPARISON:');
      const arrayLengthMatch = snarkyVK.dataArray.length === sparkyVK.dataArray.length;
      console.log(`Array lengths match: ${arrayLengthMatch}`);
      
      if (arrayLengthMatch) {
        let differences = 0;
        let firstDifferenceIndex = -1;
        
        for (let i = 0; i < snarkyVK.dataArray.length; i++) {
          if (snarkyVK.dataArray[i] !== sparkyVK.dataArray[i]) {
            differences++;
            if (firstDifferenceIndex === -1) {
              firstDifferenceIndex = i;
            }
            if (differences <= 10) { // Show first 10 differences
              console.log(`  Diff at index ${i}: Snarky='${snarkyVK.dataArray[i]}' vs Sparky='${sparkyVK.dataArray[i]}'`);
            }
          }
        }
        
        console.log(`Total character differences: ${differences}`);
        console.log(`First difference at index: ${firstDifferenceIndex}`);
        console.log(`Data is identical: ${differences === 0}`);
        
        if (differences === 0) {
          console.log('\n🎯 CRITICAL FINDING: VK data is IDENTICAL!');
          console.log('🔧 This proves the bug is in VK HASHING, not constraint system data');
          console.log('🔍 Different hashes from identical data = hashing algorithm bug');
        } else {
          console.log('\n🔍 VK data differs - constraint system generation is the issue');
        }
      }
    }
    
    console.log('\n🔍 HASH COMPARISON:');
    console.log(`Snarky hash: ${snarkyVK.hash}`);
    console.log(`Sparky hash: ${sparkyVK.hash}`);
    console.log(`Hashes match: ${snarkyVK.hash === sparkyVK.hash}`);
    
  } else {
    console.log('❌ Could not compare VK data - one or both backends failed');
  }
  
  // Summary
  console.log('\n📋 ANALYSIS SUMMARY');
  console.log('==================');
  
  if (snarkyVK && sparkyVK && !snarkyVK.error && !sparkyVK.error) {
    if (snarkyVK.dataArray && sparkyVK.dataArray) {
      const dataIdentical = snarkyVK.dataArray.every((char, i) => char === sparkyVK.dataArray[i]);
      const hashesMatch = snarkyVK.hash === sparkyVK.hash;
      
      if (dataIdentical && !hashesMatch) {
        console.log('🎯 VERDICT: VK HASHING BUG CONFIRMED');
        console.log('✅ Constraint system data is identical');
        console.log('❌ VK hashes are different');
        console.log('🔧 Fix needed: VK hashing algorithm in Sparky backend');
      } else if (!dataIdentical) {
        console.log('🎯 VERDICT: CONSTRAINT SYSTEM DATA BUG');
        console.log('❌ Constraint system data differs between backends');
        console.log('🔧 Fix needed: Constraint system generation in Sparky');
      } else {
        console.log('🎯 VERDICT: UNEXPECTED - DATA AND HASHES MATCH');
        console.log('⚠️  This suggests the bug is elsewhere');
      }
    }
  }
  
  console.log('\n📋 FULL VK DATA:');
  console.log('===============');
  console.log(JSON.stringify(vkData, null, 2));
  
  return vkData;
}

// Run the analysis
analyzeVKHashing().catch(console.error);