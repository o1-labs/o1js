#!/usr/bin/env node

import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function hashVk(vk) {
  try {
    const vkString = JSON.stringify(vk);
    let hash = 0;
    for (let i = 0; i < vkString.length; i++) {
      const char = vkString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    return 'hash-error';
  }
}

const testCases = [
  {
    name: 'Basic Field Addition',
    description: 'Simple field addition constraint',
    createProgram: () => ZkProgram({
      name: 'BasicAddition',
      publicInput: Field,
      methods: {
        add: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            const sum = publicInput.add(privateInput);
            sum.assertEquals(Field(10));
          }
        }
      }
    })
  },
  {
    name: 'Field Multiplication',
    description: 'Simple field multiplication constraint',
    createProgram: () => ZkProgram({
      name: 'BasicMultiplication',
      publicInput: Field,
      methods: {
        multiply: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            const product = publicInput.mul(privateInput);
            product.assertEquals(Field(20));
          }
        }
      }
    })
  },
  {
    name: 'Square Root Proof',
    description: 'Prove knowledge of square root',
    createProgram: () => ZkProgram({
      name: 'SquareRoot',
      publicInput: Field,
      methods: {
        square: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            const squared = privateInput.mul(privateInput);
            squared.assertEquals(publicInput);
          }
        }
      }
    })
  },
  {
    name: 'Multiple Constraints',
    description: 'Circuit with multiple independent constraints',
    createProgram: () => ZkProgram({
      name: 'MultipleConstraints',
      publicInput: Field,
      methods: {
        complex: {
          privateInputs: [Field, Field],
          async method(publicInput, a, b) {
            const sum = a.add(b);
            const product = a.mul(b);
            sum.assertEquals(publicInput);
            product.assertEquals(Field(12));
          }
        }
      }
    })
  },
  {
    name: 'Poseidon Hash',
    description: 'Poseidon hash verification',
    createProgram: () => ZkProgram({
      name: 'PoseidonHash',
      publicInput: Field,
      methods: {
        hash: {
          privateInputs: [Field],
          async method(publicInput, preimage) {
            const hash = Poseidon.hash([preimage]);
            hash.assertEquals(publicInput);
          }
        }
      }
    })
  },
  {
    name: 'Chain of Operations',
    description: 'Complex chain of field operations',
    createProgram: () => ZkProgram({
      name: 'ChainOperations',
      publicInput: Field,
      methods: {
        chain: {
          privateInputs: [Field, Field, Field],
          async method(publicInput, a, b, c) {
            const ab = a.mul(b);
            const abc = ab.add(c);
            const result = abc.mul(Field(2));
            result.assertEquals(publicInput);
          }
        }
      }
    })
  }
];

async function benchmarkVkGeneration(backendName) {
  await switchBackend(backendName);
  console.log(`\n=== ${backendName.toUpperCase()} VK Generation Performance ===`);
  
  const results = {};
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}...`);
    
    try {
      const program = testCase.createProgram();
      const startTime = Date.now();
      
      const { verificationKey } = await program.compile();
      const compilationTime = Date.now() - startTime;
      
      const vkHash = hashVk(verificationKey);
      
      results[testCase.name] = {
        time: compilationTime,
        hash: vkHash,
        success: true,
        description: testCase.description
      };
      
      console.log(`  ✓ ${testCase.name}: ${formatTime(compilationTime)} (hash: ${vkHash})`);
      
    } catch (error) {
      results[testCase.name] = {
        time: 0,
        hash: 'error',
        success: false,
        error: error.message,
        description: testCase.description
      };
      
      console.log(`  ✗ ${testCase.name}: ERROR - ${error.message}`);
    }
  }
  
  return results;
}

async function analyzeVkParity(snarkyResults, sparkyResults) {
  console.log("\n=== VK PARITY ANALYSIS ===");
  
  const parityResults = [];
  let totalTests = 0;
  let passingTests = 0;
  let timeImprovements = [];
  
  for (const testName of Object.keys(snarkyResults)) {
    const snarky = snarkyResults[testName];
    const sparky = sparkyResults[testName];
    
    totalTests++;
    
    const hashMatches = snarky.success && sparky.success && snarky.hash === sparky.hash;
    const bothSucceed = snarky.success && sparky.success;
    
    if (hashMatches) {
      passingTests++;
    }
    
    const timeRatio = bothSucceed ? snarky.time / sparky.time : 0;
    if (timeRatio > 0) {
      timeImprovements.push(timeRatio);
    }
    
    parityResults.push({
      testName,
      snarkySuccess: snarky.success,
      sparkySuccess: sparky.success,
      hashMatches,
      snarkyTime: snarky.time,
      sparkyTime: sparky.time,
      speedup: timeRatio,
      description: snarky.description
    });
  }
  
  // Summary statistics
  const parityRate = (passingTests / totalTests) * 100;
  const avgSpeedup = timeImprovements.length > 0 ? 
    timeImprovements.reduce((a, b) => a + b, 0) / timeImprovements.length : 0;
  
  console.log(`\nVK Parity Rate: ${parityRate.toFixed(1)}% (${passingTests}/${totalTests} tests)`);
  console.log(`Average VK Generation Speedup: ${avgSpeedup.toFixed(2)}x`);
  
  console.log("\nDetailed Results:");
  console.log("Test Name                | Snarky Time | Sparky Time | Hash Match | Speedup");
  console.log("-------------------------|-------------|-------------|------------|--------");
  
  for (const result of parityResults) {
    const snarkyTimeStr = result.snarkySuccess ? formatTime(result.snarkyTime) : 'ERROR';
    const sparkyTimeStr = result.sparkySuccess ? formatTime(result.sparkyTime) : 'ERROR';
    const hashMatch = result.hashMatches ? '✓' : '✗';
    const speedup = result.speedup > 0 ? `${result.speedup.toFixed(2)}x` : 'N/A';
    
    console.log(`${result.testName.padEnd(24)} | ${snarkyTimeStr.padEnd(11)} | ${sparkyTimeStr.padEnd(11)} | ${hashMatch.padEnd(10)} | ${speedup}`);
  }
  
  // Critical issues analysis
  console.log("\n=== CRITICAL ISSUES ===");
  
  const failingTests = parityResults.filter(r => !r.hashMatches);
  if (failingTests.length > 0) {
    console.log(`🚨 ${failingTests.length} tests have VK hash mismatches:`);
    failingTests.forEach(test => {
      console.log(`  - ${test.testName}: ${test.description}`);
    });
  }
  
  const errorTests = parityResults.filter(r => !r.snarkySuccess || !r.sparkySuccess);
  if (errorTests.length > 0) {
    console.log(`⚠️  ${errorTests.length} tests have compilation errors:`);
    errorTests.forEach(test => {
      const backend = !test.snarkySuccess ? 'Snarky' : 'Sparky';
      console.log(`  - ${test.testName}: ${backend} failed`);
    });
  }
  
  return {
    parityRate,
    avgSpeedup,
    totalTests,
    passingTests,
    failingTests: failingTests.length,
    errorTests: errorTests.length
  };
}

async function runVkBenchmarks() {
  console.log("VK Generation Performance Benchmark");
  console.log("===================================");
  
  try {
    const snarkyResults = await benchmarkVkGeneration('snarky');
    const sparkyResults = await benchmarkVkGeneration('sparky');
    
    const analysis = await analyzeVkParity(snarkyResults, sparkyResults);
    
    console.log("\n=== PERFORMANCE SUMMARY ===");
    console.log(`VK Parity Success Rate: ${analysis.parityRate.toFixed(1)}%`);
    console.log(`Average VK Generation Speedup: ${analysis.avgSpeedup.toFixed(2)}x`);
    console.log(`Total Tests: ${analysis.totalTests}`);
    console.log(`Passing Tests: ${analysis.passingTests}`);
    console.log(`Failing Tests: ${analysis.failingTests}`);
    console.log(`Error Tests: ${analysis.errorTests}`);
    
    // Exit with appropriate code
    process.exit(analysis.parityRate === 100 ? 0 : 1);
    
  } catch (error) {
    console.error("VK benchmark failed:", error);
    process.exit(1);
  }
}

runVkBenchmarks();