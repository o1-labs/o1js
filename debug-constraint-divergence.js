/**
 * Constraint System Divergence Analysis
 * 
 * Deep dive into the exact location where Sparky constraint system generation
 * diverges from Snarky, focusing on the 168-character difference at index 602.
 */

async function analyzeConstraintDivergence() {
  console.log('🔍 CONSTRAINT SYSTEM DIVERGENCE ANALYSIS');
  console.log('=======================================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, switchBackend } = o1js;

  // Simple test program to isolate divergence
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

  const divergenceData = {};

  // Test both backends with detailed constraint system extraction
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Analyzing ${backend.toUpperCase()} constraint system generation...`);
    console.log('─'.repeat(70));
    
    try {
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      // Hook into constraint system generation to capture intermediate data
      let constraintSystemDetails = {};
      
      console.log('\n📋 Compiling with detailed constraint capture...');
      const compilationResult = await TestProgram.compile();
      const vk = compilationResult.verificationKey;
      
      // Extract VK data in segments to isolate divergence point
      const vkData = vk.data;
      const segments = {
        segment1: vkData.substring(0, 600),    // Before divergence
        segment2: vkData.substring(600, 650),  // Around divergence point  
        segment3: vkData.substring(650, 1000), // After divergence
        segment4: vkData.substring(1000, vkData.length), // Rest
      };
      
      console.log(`📋 VK data length: ${vkData.length}`);
      console.log(`📋 VK hash: ${vk.hash}`);
      console.log(`📋 Segment around divergence (600-650): "${segments.segment2}"`);
      
      // Try to decode the VK data to understand structure
      let decodedData = null;
      try {
        // VK data appears to be base64 encoded
        const buffer = Buffer.from(vkData, 'base64');
        decodedData = {
          bufferLength: buffer.length,
          firstBytes: Array.from(buffer.slice(0, 50)),
          bytesAroundDivergence: Array.from(buffer.slice(450, 500)), // Around index 602 in base64 = ~450 in binary
          lastBytes: Array.from(buffer.slice(-50)),
        };
        console.log(`📋 Decoded buffer length: ${decodedData.bufferLength}`);
        console.log(`📋 First 10 decoded bytes: [${decodedData.firstBytes.slice(0, 10).join(', ')}]`);
        console.log(`📋 Bytes around divergence: [${decodedData.bytesAroundDivergence.slice(0, 10).join(', ')}]`);
      } catch (error) {
        console.log(`❌ Could not decode VK data: ${error.message}`);
      }
      
      divergenceData[backend] = {
        vkHash: vk.hash,
        vkLength: vkData.length,
        segments,
        decodedData,
        compilationKeys: Object.keys(compilationResult),
      };
      
    } catch (error) {
      console.log(`❌ ${backend} analysis failed: ${error.message}`);
      divergenceData[backend] = { error: error.message };
    }
  }

  // Detailed divergence analysis
  console.log('\n📊 DIVERGENCE POINT ANALYSIS');
  console.log('============================\n');
  
  const snarkyData = divergenceData['snarky'];
  const sparkyData = divergenceData['sparky'];
  
  if (snarkyData && sparkyData && !snarkyData.error && !sparkyData.error) {
    console.log('🔍 SEGMENT COMPARISON:');
    
    // Compare each segment
    for (const [segmentName, snarkySegment] of Object.entries(snarkyData.segments)) {
      const sparkySegment = sparkyData.segments[segmentName];
      const matches = snarkySegment === sparkySegment;
      
      console.log(`${segmentName}: ${matches ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
      if (!matches) {
        console.log(`  Snarky: "${snarkySegment.substring(0, 30)}..."`);
        console.log(`  Sparky: "${sparkySegment.substring(0, 30)}..."`);
        
        // Find exact divergence point within segment
        for (let i = 0; i < Math.min(snarkySegment.length, sparkySegment.length); i++) {
          if (snarkySegment[i] !== sparkySegment[i]) {
            console.log(`  First difference at position ${i}: '${snarkySegment[i]}' vs '${sparkySegment[i]}'`);
            break;
          }
        }
      }
    }
    
    console.log('\n🔍 DECODED BYTE COMPARISON:');
    if (snarkyData.decodedData && sparkyData.decodedData) {
      const snarkyBytes = snarkyData.decodedData.bytesAroundDivergence;
      const sparkyBytes = sparkyData.decodedData.bytesAroundDivergence;
      
      console.log(`Decoded buffer lengths match: ${snarkyData.decodedData.bufferLength === sparkyData.decodedData.bufferLength}`);
      
      if (snarkyBytes && sparkyBytes) {
        let bytesDiffer = false;
        for (let i = 0; i < Math.min(snarkyBytes.length, sparkyBytes.length); i++) {
          if (snarkyBytes[i] !== sparkyBytes[i]) {
            console.log(`Byte difference at offset ${i}: ${snarkyBytes[i]} vs ${sparkyBytes[i]} (0x${snarkyBytes[i].toString(16)} vs 0x${sparkyBytes[i].toString(16)})`);
            bytesDiffer = true;
            if (i > 5) break; // Show first few differences
          }
        }
        if (!bytesDiffer) {
          console.log('✅ No byte differences found in analyzed range');
        }
      }
    }
  }
  
  // Next steps analysis
  console.log('\n🎯 DIVERGENCE SOURCE ANALYSIS');
  console.log('=============================\n');
  
  if (snarkyData && sparkyData && !snarkyData.error && !sparkyData.error) {
    // Determine which segment first differs
    const segments = ['segment1', 'segment2', 'segment3', 'segment4'];
    let firstDifferentSegment = null;
    
    for (const segment of segments) {
      if (snarkyData.segments[segment] !== sparkyData.segments[segment]) {
        firstDifferentSegment = segment;
        break;
      }
    }
    
    if (firstDifferentSegment) {
      console.log(`🎯 First divergence in: ${firstDifferentSegment}`);
      
      if (firstDifferentSegment === 'segment1') {
        console.log('📋 Divergence occurs early in VK data - likely basic constraint system structure');
      } else if (firstDifferentSegment === 'segment2') {
        console.log('📋 Divergence at expected location (index 602) - matches our previous findings');
      } else {
        console.log('📋 Divergence occurs later - early segments are identical');
      }
      
      console.log('\n🔧 RECOMMENDED INVESTIGATION:');
      console.log('1. The VK data appears to be base64-encoded constraint system data');
      console.log('2. Differences likely originate in constraint system serialization');
      console.log('3. Focus on Sparky constraint system compilation vs Snarky');
      console.log('4. Check gate ordering, wire assignments, or metadata differences');
      
    } else {
      console.log('🎯 No divergence found in segments - unexpected result');
    }
  }
  
  console.log('\n📋 NEXT ACTIONS:');
  console.log('1. Examine Sparky constraint system compilation code');
  console.log('2. Compare gate generation between backends');
  console.log('3. Check constraint system metadata and ordering');
  console.log('4. Implement fix to align Sparky with Snarky output');
  
  return divergenceData;
}

// Run the divergence analysis
analyzeConstraintDivergence().catch(console.error);