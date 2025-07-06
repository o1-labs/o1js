/**
 * Simple VK Comparison Test
 * 
 * Compares VK data between Sparky and Snarky backends for identical programs
 */

let o1js, Field, ZkProgram, switchBackend, getCurrentBackend;

async function loadO1js() {
  o1js = await import('./dist/node/index.js');
  ({ Field, ZkProgram, switchBackend, getCurrentBackend } = o1js);
}

async function runVKComparison() {
  await loadO1js();
  
  console.log('🔍 VK COMPARISON TEST');
  console.log('====================\n');
  
  const results = {};
  
  // Define the same minimal program for both backends
  function createMinimalProgram() {
    return ZkProgram({
      name: 'MinimalProgram',
      publicInput: Field,
      publicOutput: Field,
      
      methods: {
        addOne: {
          privateInputs: [],
          async method(publicInput) {
            const result = publicInput.add(Field(1));
            return { publicOutput: result };
          }
        }
      }
    });
  }
  
  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Testing ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(40));
    
    try {
      // Switch backend
      await switchBackend(backend);
      console.log(`✅ Switched to ${getCurrentBackend()} backend`);
      
      // Create program instance for this backend
      const MinimalProgram = createMinimalProgram();
      
      // Compile program
      console.log('📋 Compiling MinimalProgram...');
      const startTime = Date.now();
      const compilation = await MinimalProgram.compile();
      const compileTime = Date.now() - startTime;
      
      console.log(`✅ ${backend} compilation successful (${compileTime}ms)`);
      
      // Extract VK data
      const vkData = compilation.verificationKey.data;
      const vkHash = compilation.verificationKey.hash.toString();
      
      results[backend] = {
        success: true,
        compileTime,
        vkData,
        vkHash,
        vkDataLength: vkData.length
      };
      
      console.log(`   VK Data Length: ${vkData.length} chars`);
      console.log(`   VK Hash: ${vkHash.slice(0, 30)}...`);
      
    } catch (error) {
      console.log(`❌ ${backend} compilation failed:`, error.message);
      results[backend] = { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Compare results
  console.log('\n🔍 VK COMPARISON ANALYSIS');
  console.log('═'.repeat(50));
  
  if (!results.snarky.success || !results.sparky.success) {
    console.log('❌ Cannot compare VKs due to compilation failures');
    if (!results.snarky.success) console.log(`   Snarky error: ${results.snarky.error}`);
    if (!results.sparky.success) console.log(`   Sparky error: ${results.sparky.error}`);
    return;
  }
  
  // VK Data content comparison (character-by-character)
  const snarkyData = results.snarky.vkData;
  const sparkyData = results.sparky.vkData;
  const dataMatch = snarkyData === sparkyData;
  
  console.log(`\n📄 VK Data Content Match: ${dataMatch ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  // VK Hash comparison
  const hashMatch = results.snarky.vkHash === results.sparky.vkHash;
  console.log(`🔑 VK Hash Match: ${hashMatch ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  if (!hashMatch) {
    console.log(`   Snarky Hash: ${results.snarky.vkHash}`);
    console.log(`   Sparky Hash: ${results.sparky.vkHash}`);
  }
  
  // VK Data length comparison
  const lengthMatch = results.snarky.vkDataLength === results.sparky.vkDataLength;
  console.log(`📏 VK Data Length Match: ${lengthMatch ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  console.log(`   Snarky Length: ${results.snarky.vkDataLength} chars`);
  console.log(`   Sparky Length: ${results.sparky.vkDataLength} chars`);
  
  // Character-by-character analysis if data doesn't match
  if (!dataMatch) {
    console.log(`\n🔍 Character-by-Character Analysis:`);
    const snarkyData = results.snarky.vkData;
    const sparkyData = results.sparky.vkData;
    
    let differences = 0;
    let firstDiffIndex = -1;
    
    for (let i = 0; i < snarkyData.length; i++) {
      if (snarkyData[i] !== sparkyData[i]) {
        differences++;
        if (firstDiffIndex === -1) {
          firstDiffIndex = i;
        }
      }
    }
    
    console.log(`   Total character differences: ${differences}`);
    if (firstDiffIndex !== -1) {
      console.log(`   First difference at index ${firstDiffIndex}:`);
      console.log(`     Snarky: '${snarkyData[firstDiffIndex]}'`);
      console.log(`     Sparky: '${sparkyData[firstDiffIndex]}'`);
      
      // Show context around first difference
      const start = Math.max(0, firstDiffIndex - 10);
      const end = Math.min(snarkyData.length, firstDiffIndex + 10);
      console.log(`   Context (±10 chars):`);
      console.log(`     Snarky: "${snarkyData.slice(start, end)}"`);
      console.log(`     Sparky: "${sparkyData.slice(start, end)}"`);
    }
  }
  
  // Performance comparison
  console.log(`\n⏱️  Performance Comparison:`);
  console.log(`   Snarky compile time: ${results.snarky.compileTime}ms`);
  console.log(`   Sparky compile time: ${results.sparky.compileTime}ms`);
  if (results.snarky.compileTime > 0 && results.sparky.compileTime > 0) {
    const speedup = (results.snarky.compileTime / results.sparky.compileTime).toFixed(1);
    console.log(`   Sparky speedup: ${speedup}x faster`);
  }
  
  return results;
}

// Execute the comparison
runVKComparison().catch(console.error);