const { Field, ZkProgram, Provable, switchBackend, initializeBindings } = require('./dist/node/index.js');
const crypto = require('crypto');

async function analyzeVK() {
  await initializeBindings();
  
  const programs = {
    minimal: ZkProgram({
      name: 'MinimalProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(pub) {
            pub.assertEquals(Field(42));
          }
        }
      }
    }),
    
    simple: ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub, x) {
            x.mul(x).assertEquals(pub);
          }
        }
      }
    }),
    
    complex: ZkProgram({
      name: 'ComplexProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field, Field, Field],
          async method(pub, a, b, c) {
            a.mul(b).add(b.mul(c)).add(a.mul(c)).assertEquals(pub);
          }
        }
      }
    })
  };
  
  console.log('\n=== VK STRUCTURE ANALYSIS ===\n');
  
  const results = [];
  
  for (const [name, program] of Object.entries(programs)) {
    console.log(`\nAnalyzing ${name} program...`);
    console.log('=' .repeat(50));
    
    // Compile with Snarky
    await switchBackend('snarky');
    console.log('Compiling with Snarky...');
    const snarkyResult = await program.compile();
    const snarkyVK = snarkyResult.verificationKey;
    
    // Compile with Sparky
    await switchBackend('sparky');
    console.log('Compiling with Sparky...');
    const sparkyResult = await program.compile();
    const sparkyVK = sparkyResult.verificationKey;
    
    // Basic comparison
    console.log('\nBasic comparison:');
    console.log(`Snarky VK hash: ${snarkyVK.hash.toString()}`);
    console.log(`Sparky VK hash: ${sparkyVK.hash.toString()}`);
    console.log(`Hash match: ${snarkyVK.hash.toString() === sparkyVK.hash.toString() ? '✅' : '❌'}`);
    
    // Data analysis
    const snarkyBuffer = Buffer.from(snarkyVK.data, 'base64');
    const sparkyBuffer = Buffer.from(sparkyVK.data, 'base64');
    
    console.log(`\nData analysis:`);
    console.log(`Snarky data length: ${snarkyVK.data.length} (base64), ${snarkyBuffer.length} (bytes)`);
    console.log(`Sparky data length: ${sparkyVK.data.length} (base64), ${sparkyBuffer.length} (bytes)`);
    console.log(`Data match: ${snarkyVK.data === sparkyVK.data ? '✅' : '❌'}`);
    
    // SHA256 comparison
    const snarkySHA = crypto.createHash('sha256').update(snarkyBuffer).digest('hex');
    const sparkySHA = crypto.createHash('sha256').update(sparkyBuffer).digest('hex');
    console.log(`\nSHA256 hashes:`);
    console.log(`Snarky: ${snarkySHA}`);
    console.log(`Sparky: ${sparkySHA}`);
    console.log(`SHA256 match: ${snarkySHA === sparkySHA ? '✅' : '❌'}`);
    
    // Find first difference
    if (snarkyBuffer.length === sparkyBuffer.length) {
      let firstDiff = -1;
      for (let i = 0; i < snarkyBuffer.length; i++) {
        if (snarkyBuffer[i] !== sparkyBuffer[i]) {
          firstDiff = i;
          break;
        }
      }
      
      if (firstDiff >= 0) {
        console.log(`\nFirst difference at byte ${firstDiff}:`);
        console.log(`Snarky: 0x${snarkyBuffer[firstDiff].toString(16).padStart(2, '0')}`);
        console.log(`Sparky: 0x${sparkyBuffer[firstDiff].toString(16).padStart(2, '0')}`);
        
        // Show context
        const start = Math.max(0, firstDiff - 16);
        const end = Math.min(snarkyBuffer.length, firstDiff + 16);
        console.log(`\nContext (bytes ${start}-${end}):`);
        console.log(`Snarky: ${snarkyBuffer.subarray(start, end).toString('hex')}`);
        console.log(`Sparky: ${sparkyBuffer.subarray(start, end).toString('hex')}`);
      } else {
        console.log('\nData is identical!');
      }
    } else {
      console.log(`\nBuffers have different lengths: ${snarkyBuffer.length} vs ${sparkyBuffer.length}`);
    }
    
    // Look for patterns
    console.log('\nPattern analysis:');
    
    // Count zero bytes
    const snarkyZeros = Array.from(snarkyBuffer).filter(b => b === 0).length;
    const sparkyZeros = Array.from(sparkyBuffer).filter(b => b === 0).length;
    console.log(`Zero bytes - Snarky: ${snarkyZeros}/${snarkyBuffer.length}, Sparky: ${sparkyZeros}/${sparkyBuffer.length}`);
    
    // Check for repeating 32-byte chunks (field elements)
    const chunkSize = 32;
    const snarkyChunks = new Set();
    const sparkyChunks = new Set();
    
    for (let i = 0; i <= snarkyBuffer.length - chunkSize; i += chunkSize) {
      snarkyChunks.add(snarkyBuffer.subarray(i, i + chunkSize).toString('hex'));
    }
    
    for (let i = 0; i <= sparkyBuffer.length - chunkSize; i += chunkSize) {
      sparkyChunks.add(sparkyBuffer.subarray(i, i + chunkSize).toString('hex'));
    }
    
    console.log(`Unique 32-byte chunks - Snarky: ${snarkyChunks.size}, Sparky: ${sparkyChunks.size}`);
    
    results.push({
      name,
      snarkyHash: snarkyVK.hash.toString(),
      sparkyHash: sparkyVK.hash.toString(),
      hashMatch: snarkyVK.hash.toString() === sparkyVK.hash.toString(),
      dataMatch: snarkyVK.data === sparkyVK.data
    });
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  
  const sparkyHashes = results.map(r => r.sparkyHash);
  const uniqueSparkyHashes = new Set(sparkyHashes);
  
  console.log(`Programs tested: ${results.length}`);
  console.log(`Unique Snarky VK hashes: ${new Set(results.map(r => r.snarkyHash)).size}`);
  console.log(`Unique Sparky VK hashes: ${uniqueSparkyHashes.size}`);
  
  if (uniqueSparkyHashes.size === 1 && results.length > 1) {
    console.log('\n🚨 CRITICAL BUG: All Sparky VKs have the same hash!');
    console.log(`Hash: ${sparkyHashes[0]}`);
    console.log('This indicates Sparky is not properly capturing circuit-specific information.');
  }
  
  console.log('\nPer-program results:');
  results.forEach(r => {
    console.log(`- ${r.name}: Hash match: ${r.hashMatch ? '✅' : '❌'}, Data match: ${r.dataMatch ? '✅' : '❌'}`);
  });
  
  // Try to access internals
  console.log('\n\n=== INTERNAL INVESTIGATION ===\n');
  
  try {
    const { Snarky } = require('./dist/node/bindings.js');
    
    // Check if we can get constraint system info
    await switchBackend('sparky');
    console.log('Trying to access Sparky constraint system...');
    
    const cs = Snarky.run.enterConstraintSystem();
    await programs.minimal.compile();
    const constraintSystem = cs();
    
    if (constraintSystem) {
      console.log('Constraint system captured!');
      try {
        const csJson = Snarky.constraintSystem.toJson({});
        console.log('Constraint system JSON:', JSON.stringify(csJson, null, 2).substring(0, 500) + '...');
      } catch (e) {
        console.log('Could not convert CS to JSON:', e.message);
      }
    } else {
      console.log('No constraint system captured');
    }
    
    // Check Pickles module
    const { Pickles } = require('./dist/node/bindings.js');
    if (Pickles && Pickles.dummyVerificationKey) {
      console.log('\nChecking dummy VK...');
      const [, dummyData, dummyHash] = Pickles.dummyVerificationKey();
      console.log('Dummy VK hash:', dummyHash);
      console.log('Dummy VK data length:', dummyData.length);
      console.log('Is Sparky using dummy VK?', sparkyHashes[0] === dummyHash.toString());
    }
    
  } catch (e) {
    console.log('Could not access internals:', e.message);
  }
  
  await switchBackend('snarky');
}

analyzeVK().catch(console.error);