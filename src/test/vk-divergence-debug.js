import { Field, Provable, ZkProgram, Gadgets } from '../lib/index.js';
import { switchBackend, getCurrentBackend } from '../index.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Enable maximum debugging
process.env.DEBUG_SPARKY = '1';
process.env.DEBUG_SNARKY = '1';
process.env.VERBOSE_CONSTRAINTS = '1';

// Create debug directory
const debugDir = './vk-divergence-debug-output';
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

// Helper to capture and compare constraint systems
async function captureConstraintSystem(program, backend) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`CAPTURING CONSTRAINT SYSTEM FOR: ${backend.toUpperCase()}`);
  console.log(`${'='.repeat(80)}\n`);

  // Switch to backend
  await switchBackend(backend);
  console.log(`✓ Switched to ${backend}`);

  // Compile program
  console.log('Compiling program...');
  const startTime = Date.now();
  const { verificationKey } = await program.compile();
  const compileTime = Date.now() - startTime;
  console.log(`✓ Compiled in ${compileTime}ms`);

  // Compute VK hash
  const vkHash = crypto.createHash('sha256').update(verificationKey.data).digest('hex');
  console.log(`✓ VK Hash: ${vkHash}`);

  // Save raw VK data
  const vkPath = path.join(debugDir, `${backend}-vk.json`);
  fs.writeFileSync(vkPath, JSON.stringify(verificationKey, null, 2));
  console.log(`✓ Saved VK to ${vkPath}`);

  // Try to extract constraint system details
  let constraintDetails = null;
  try {
    // This might not work but let's try to get internal state
    if (backend === 'snarky' && global.Snarky) {
      console.log('Attempting to extract Snarky constraint details...');
      // Snarky might expose constraint system details
    } else if (backend === 'sparky' && global.Sparky) {
      console.log('Attempting to extract Sparky constraint details...');
      // Sparky might expose constraint system details
    }
  } catch (e) {
    console.log('Could not extract internal constraint details:', e.message);
  }

  return {
    backend,
    vkHash,
    verificationKey,
    compileTime,
    constraintDetails
  };
}

// Test circuits with increasing complexity
const testCircuits = [
  {
    name: 'empty',
    description: 'Empty circuit - no constraints',
    program: ZkProgram({
      name: 'EmptyCircuit',
      methods: {
        run: {
          privateInputs: [],
          async method() {
            // No operations
          }
        }
      }
    })
  },
  {
    name: 'constant-assert',
    description: 'Assert constant equals itself',
    program: ZkProgram({
      name: 'ConstantAssert',
      methods: {
        run: {
          privateInputs: [],
          async method() {
            const x = Field(5);
            x.assertEquals(x);
          }
        }
      }
    })
  },
  {
    name: 'variable-assert',
    description: 'Assert variable equals constant',
    program: ZkProgram({
      name: 'VariableAssert',
      methods: {
        run: {
          privateInputs: [Field],
          async method(x: Field) {
            x.assertEquals(Field(5));
          }
        }
      }
    })
  },
  {
    name: 'variable-variable',
    description: 'Assert variable equals variable',
    program: ZkProgram({
      name: 'VariableVariable',
      methods: {
        run: {
          privateInputs: [Field, Field],
          async method(x: Field, y: Field) {
            x.assertEquals(y);
          }
        }
      }
    })
  },
  {
    name: 'single-add',
    description: 'Single addition operation',
    program: ZkProgram({
      name: 'SingleAdd',
      methods: {
        run: {
          privateInputs: [Field],
          async method(x: Field) {
            const y = x.add(Field(1));
            y.assertEquals(y);
          }
        }
      }
    })
  },
  {
    name: 'single-mul',
    description: 'Single multiplication operation',
    program: ZkProgram({
      name: 'SingleMul',
      methods: {
        run: {
          privateInputs: [Field],
          async method(x: Field) {
            const y = x.mul(Field(2));
            y.assertEquals(y);
          }
        }
      }
    })
  },
  {
    name: 'public-input',
    description: 'Circuit with public input',
    program: ZkProgram({
      name: 'PublicInput',
      publicInput: Field,
      methods: {
        run: {
          privateInputs: [],
          async method(pub: Field) {
            pub.assertEquals(Field(42));
          }
        }
      }
    })
  }
];

// Main debugging function
async function debugVkDivergence() {
  console.log('\n🔍 VK DIVERGENCE DEBUGGING TOOL\n');
  console.log(`Output directory: ${debugDir}`);
  console.log(`Number of test circuits: ${testCircuits.length}\n`);

  const results = [];

  for (const test of testCircuits) {
    console.log(`\n${'*'.repeat(80)}`);
    console.log(`TEST: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`${'*'.repeat(80)}`);

    try {
      // Capture constraint systems for both backends
      const snarkyResult = await captureConstraintSystem(test.program, 'snarky');
      const sparkyResult = await captureConstraintSystem(test.program, 'sparky');

      // Compare results
      const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log('COMPARISON RESULTS');
      console.log(`${'='.repeat(80)}`);
      console.log(`VK Match: ${vkMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`Snarky VK Hash: ${snarkyResult.vkHash}`);
      console.log(`Sparky VK Hash: ${sparkyResult.vkHash}`);
      
      if (!vkMatch) {
        console.log('\n🔍 ANALYZING DIFFERENCES...');
        
        // Compare VK structure
        const snarkyVk = snarkyResult.verificationKey;
        const sparkyVk = sparkyResult.verificationKey;
        
        // Check data lengths
        if (snarkyVk.data.length !== sparkyVk.data.length) {
          console.log(`❌ VK data length differs:`);
          console.log(`   Snarky: ${snarkyVk.data.length} chars`);
          console.log(`   Sparky: ${sparkyVk.data.length} chars`);
        }
        
        // Find first difference in VK data
        const minLen = Math.min(snarkyVk.data.length, sparkyVk.data.length);
        let firstDiff = -1;
        for (let i = 0; i < minLen; i++) {
          if (snarkyVk.data[i] !== sparkyVk.data[i]) {
            firstDiff = i;
            break;
          }
        }
        
        if (firstDiff >= 0) {
          console.log(`❌ First difference at position ${firstDiff}:`);
          console.log(`   Snarky: "${snarkyVk.data.slice(Math.max(0, firstDiff - 10), firstDiff + 10)}"`);
          console.log(`   Sparky: "${sparkyVk.data.slice(Math.max(0, firstDiff - 10), firstDiff + 10)}"`);
        }
        
        // Save detailed comparison
        const comparisonPath = path.join(debugDir, `${test.name}-comparison.json`);
        fs.writeFileSync(comparisonPath, JSON.stringify({
          testName: test.name,
          description: test.description,
          vkMatch,
          snarkyVkHash: snarkyResult.vkHash,
          sparkyVkHash: sparkyResult.vkHash,
          firstDifference: firstDiff,
          snarkyVkLength: snarkyVk.data.length,
          sparkyVkLength: sparkyVk.data.length
        }, null, 2));
        console.log(`\n📁 Saved detailed comparison to ${comparisonPath}`);
      }

      results.push({
        name: test.name,
        description: test.description,
        vkMatch,
        snarkyVkHash: snarkyResult.vkHash,
        sparkyVkHash: sparkyResult.vkHash,
        snarkyCompileTime: snarkyResult.compileTime,
        sparkyCompileTime: sparkyResult.compileTime
      });

    } catch (error) {
      console.error(`❌ Error in test ${test.name}:`, error.message);
      results.push({
        name: test.name,
        description: test.description,
        error: error.message
      });
    }
  }

  // Summary report
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY REPORT');
  console.log(`${'='.repeat(80)}\n`);

  const successful = results.filter(r => !r.error);
  const matching = successful.filter(r => r.vkMatch);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`VK Matches: ${matching.length}/${successful.length} (${(matching.length/successful.length*100).toFixed(1)}%)`);
  
  console.log('\nDetailed Results:');
  console.log('Name'.padEnd(20) + 'VK Match'.padEnd(10) + 'Snarky Time'.padEnd(12) + 'Sparky Time');
  console.log('-'.repeat(60));
  
  for (const result of results) {
    if (result.error) {
      console.log(`${result.name.padEnd(20)}ERROR: ${result.error}`);
    } else {
      const match = result.vkMatch ? '✅' : '❌';
      console.log(
        `${result.name.padEnd(20)}${match.padEnd(10)}${(result.snarkyCompileTime + 'ms').padEnd(12)}${result.sparkyCompileTime}ms`
      );
    }
  }

  // Save summary
  const summaryPath = path.join(debugDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    statistics: {
      total: results.length,
      successful: successful.length,
      matching: matching.length,
      matchPercentage: (matching.length/successful.length*100).toFixed(1)
    }
  }, null, 2));
  
  console.log(`\n📁 Full results saved to ${summaryPath}`);
  console.log(`📁 All debug output saved to ${debugDir}/`);

  // Try to find the simplest diverging case
  const firstDivergence = successful.find(r => !r.vkMatch);
  if (firstDivergence) {
    console.log(`\n🎯 FIRST DIVERGENCE: "${firstDivergence.name}" - ${firstDivergence.description}`);
    console.log('This is the simplest circuit that produces different VKs.');
    console.log('Focus debugging efforts on this case.');
  }
}

// Run the debugging tool
debugVkDivergence().catch(console.error);