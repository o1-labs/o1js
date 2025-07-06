/**
 * Deep Constraint System Data Analysis
 * 
 * This test extracts and compares the EXACT data structures sent to Pickles
 * for permutation construction, focusing on metadata and setup differences
 * between Snarky and Sparky backends.
 */

async function analyzeConstraintSystemData() {
  console.log('🔍 DEEP CONSTRAINT SYSTEM DATA ANALYSIS');
  console.log('=======================================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, switchBackend, getCurrentBackend } = o1js;

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

  const constraintSystemData = {};

  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Analyzing ${backend.toUpperCase()} constraint system data...`);
    console.log('─'.repeat(60));
    
    try {
      // Switch backend
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      // Compile and extract constraint system data
      console.log('\n📋 Compiling and extracting constraint system...');
      const compilationResult = await TestProgram.compile();
      
      console.log(`📊 Compilation result keys: ${Object.keys(compilationResult)}`);
      console.log(`📊 Verification key exists: ${!!compilationResult.verificationKey}`);
      
      // Extract detailed constraint system information
      const constraintSystemInfo = {
        backend,
        compilationResultKeys: Object.keys(compilationResult),
        verificationKeyExists: !!compilationResult.verificationKey,
        verificationKeyData: null,
        constraintSystemDetails: null,
        gateData: null,
        wireData: null,
        permutationData: null
      };

      // Try to extract verification key details
      if (compilationResult.verificationKey) {
        const vk = compilationResult.verificationKey;
        constraintSystemInfo.verificationKeyData = {
          type: typeof vk,
          keys: Object.keys(vk),
          hash: vk.hash || 'no hash',
          data: vk.data || 'no data'
        };
        
        console.log(`📋 VK type: ${typeof vk}`);
        console.log(`📋 VK keys: ${Object.keys(vk)}`);
        console.log(`📋 VK hash: ${vk.hash || 'no hash'}`);
        
        // Try to access underlying constraint system data
        if (vk.data) {
          console.log(`📋 VK data type: ${typeof vk.data}`);
          console.log(`📋 VK data keys: ${Object.keys(vk.data)}`);
          
          constraintSystemInfo.constraintSystemDetails = {
            type: typeof vk.data,
            keys: Object.keys(vk.data),
            gates: vk.data.gates || 'no gates',
            wires: vk.data.wires || 'no wires',
            publicInputSize: vk.data.publicInputSize || 'no publicInputSize',
            domain: vk.data.domain || 'no domain'
          };
        }
      }

      // Try to extract gate and wire information from internal structures
      console.log('\n🔍 Attempting to extract internal constraint system data...');
      
      // Look for constraint system in global state or compilation artifacts
      if (typeof global !== 'undefined' && global.constraintSystem) {
        console.log('📋 Found global constraint system');
        constraintSystemInfo.constraintSystemDetails = {
          source: 'global',
          data: global.constraintSystem
        };
      }

      // Store the data for comparison
      constraintSystemData[backend] = constraintSystemInfo;
      
      // Now attempt proof generation to see exactly what gets passed to Pickles
      console.log('\n🧪 Attempting proof generation to capture Pickles data...');
      
      try {
        const testInputs = [5, 3];
        const proofResult = await TestProgram.add(testInputs[0], testInputs[1]);
        console.log(`✅ ${backend} proof generation succeeded`);
        constraintSystemInfo.proofGenerationSuccess = true;
      } catch (proofError) {
        console.log(`❌ ${backend} proof generation failed: ${proofError.message}`);
        constraintSystemInfo.proofGenerationSuccess = false;
        constraintSystemInfo.proofError = proofError.message;
        
        // Try to extract more details from the error
        if (proofError.stack) {
          const stackLines = proofError.stack.split('\n');
          constraintSystemInfo.errorLocation = stackLines.slice(0, 3);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${backend} analysis failed: ${error.message}`);
      constraintSystemData[backend] = {
        backend,
        error: error.message,
        success: false
      };
    }
  }

  // Generate detailed comparison
  console.log('\n📊 CONSTRAINT SYSTEM DATA COMPARISON');
  console.log('===================================\n');
  
  const snarkyData = constraintSystemData['snarky'];
  const sparkyData = constraintSystemData['sparky'];
  
  if (snarkyData && sparkyData) {
    console.log('🔍 COMPILATION RESULTS COMPARISON:');
    console.log(`Snarky compilation keys: ${snarkyData.compilationResultKeys}`);
    console.log(`Sparky compilation keys: ${sparkyData.compilationResultKeys}`);
    console.log(`Keys match: ${JSON.stringify(snarkyData.compilationResultKeys) === JSON.stringify(sparkyData.compilationResultKeys)}`);
    
    console.log('\n🔍 VERIFICATION KEY COMPARISON:');
    console.log(`Snarky VK exists: ${snarkyData.verificationKeyExists}`);
    console.log(`Sparky VK exists: ${sparkyData.verificationKeyExists}`);
    
    if (snarkyData.verificationKeyData && sparkyData.verificationKeyData) {
      console.log(`Snarky VK keys: ${snarkyData.verificationKeyData.keys}`);
      console.log(`Sparky VK keys: ${sparkyData.verificationKeyData.keys}`);
      console.log(`VK keys match: ${JSON.stringify(snarkyData.verificationKeyData.keys) === JSON.stringify(sparkyData.verificationKeyData.keys)}`);
      
      console.log(`Snarky VK hash: ${snarkyData.verificationKeyData.hash}`);
      console.log(`Sparky VK hash: ${sparkyData.verificationKeyData.hash}`);
      console.log(`VK hashes match: ${snarkyData.verificationKeyData.hash === sparkyData.verificationKeyData.hash}`);
    }
    
    console.log('\n🔍 CONSTRAINT SYSTEM DETAILS COMPARISON:');
    if (snarkyData.constraintSystemDetails && sparkyData.constraintSystemDetails) {
      const snarkyCS = snarkyData.constraintSystemDetails;
      const sparkyCS = sparkyData.constraintSystemDetails;
      
      console.log(`Snarky CS keys: ${snarkyCS.keys}`);
      console.log(`Sparky CS keys: ${sparkyCS.keys}`);
      console.log(`CS keys match: ${JSON.stringify(snarkyCS.keys) === JSON.stringify(sparkyCS.keys)}`);
      
      console.log(`Snarky gates: ${snarkyCS.gates}`);
      console.log(`Sparky gates: ${sparkyCS.gates}`);
      console.log(`Gates match: ${JSON.stringify(snarkyCS.gates) === JSON.stringify(sparkyCS.gates)}`);
      
      console.log(`Snarky wires: ${snarkyCS.wires}`);
      console.log(`Sparky wires: ${sparkyCS.wires}`);
      console.log(`Wires match: ${JSON.stringify(snarkyCS.wires) === JSON.stringify(sparkyCS.wires)}`);
      
      console.log(`Snarky publicInputSize: ${snarkyCS.publicInputSize}`);
      console.log(`Sparky publicInputSize: ${sparkyCS.publicInputSize}`);
      console.log(`PublicInputSize match: ${snarkyCS.publicInputSize === sparkyCS.publicInputSize}`);
      
      console.log(`Snarky domain: ${snarkyCS.domain}`);
      console.log(`Sparky domain: ${sparkyCS.domain}`);
      console.log(`Domain match: ${JSON.stringify(snarkyCS.domain) === JSON.stringify(sparkyCS.domain)}`);
    } else {
      console.log('❌ Could not extract constraint system details for comparison');
    }
    
    console.log('\n🔍 PROOF GENERATION COMPARISON:');
    console.log(`Snarky proof generation: ${snarkyData.proofGenerationSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Sparky proof generation: ${sparkyData.proofGenerationSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (sparkyData.proofError) {
      console.log(`Sparky error: ${sparkyData.proofError}`);
      if (sparkyData.errorLocation) {
        console.log(`Error location: ${sparkyData.errorLocation.join(' -> ')}`);
      }
    }
    
    // Identify key differences
    console.log('\n🎯 KEY DIFFERENCES IDENTIFIED:');
    
    if (snarkyData.proofGenerationSuccess && !sparkyData.proofGenerationSuccess) {
      console.log('❌ CRITICAL: Proof generation succeeds in Snarky but fails in Sparky');
      
      if (snarkyData.verificationKeyData && sparkyData.verificationKeyData) {
        if (snarkyData.verificationKeyData.hash !== sparkyData.verificationKeyData.hash) {
          console.log('⚠️  Verification key hashes differ - this suggests different constraint system data');
        } else {
          console.log('✅ Verification key hashes match - constraint systems appear identical');
          console.log('🔍 Bug is likely in proof generation interface, not constraint system');
        }
      }
      
      console.log('🔍 HYPOTHESIS: Issue is in Sparky→Pickles interface during proof generation');
      console.log('📋 Even with identical constraint systems, the proof generation call fails');
    }
    
  } else {
    console.log('❌ Could not compare data - one or both backends failed');
  }
  
  console.log('\n📋 FULL DATA DUMP:');
  console.log('=================');
  console.log(JSON.stringify(constraintSystemData, null, 2));
  
  return constraintSystemData;
}

// Run the analysis
analyzeConstraintSystemData().catch(console.error);