#!/usr/bin/env node

/**
 * Test to verify the memory leak fix for prevChallengeScalars
 */

import { Field, ZkProgram, SelfProof, setNumberOfWorkers } from './dist/node/index.js';

// Use multiple threads for compilation
setNumberOfWorkers(8);

// Create a recursive program that will use prevChallengeScalars
const RecursiveProgram = ZkProgram({
  name: 'RecursiveMemoryTest',
  publicInput: Field,
  
  methods: {
    base: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(x);
      },
    },
    
    step: {
      privateInputs: [SelfProof],
      async method(x, earlierProof) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(x);
      },
    },
  },
});

async function monitorMemory(label) {
  if (global.gc) global.gc();
  await new Promise(r => setTimeout(r, 100));
  
  const usage = process.memoryUsage();
  console.log(`${label}:`);
  console.log(`  RSS: ${Math.round(usage.rss / 1024 / 1024)} MB`);
  console.log(`  Heap: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);
  console.log(`  External: ${Math.round(usage.external / 1024 / 1024)} MB`);
  return usage.rss;
}

async function runTest() {
  console.log('Memory leak test for prevChallengeScalars fix');
  console.log('Testing recursive proofs which use challenge scalars\n');
  
  console.log('Compiling...');
  await RecursiveProgram.compile();
  
  await monitorMemory('After compilation');
  
  console.log('\nGenerating base proof...');
  const { proof: baseProof } = await RecursiveProgram.base(Field(0));
  
  await monitorMemory('After base proof');
  
  console.log('\nGenerating recursive proofs in a loop...');
  let proof = baseProof;
  const iterations = 10;
  const memoryGrowth = [];
  
  for (let i = 1; i <= iterations; i++) {
    const rssBefore = await monitorMemory(`\nBefore iteration ${i}`);
    
    const { proof: newProof } = await RecursiveProgram.step(Field(i), proof);
    proof = newProof;
    
    const rssAfter = await monitorMemory(`After iteration ${i}`);
    const growth = Math.round((rssAfter - rssBefore) / 1024 / 1024);
    memoryGrowth.push(growth);
    
    console.log(`Memory growth: ${growth >= 0 ? '+' : ''}${growth} MB`);
    
    // Verify the proof works
    const isValid = await RecursiveProgram.verify(proof);
    if (!isValid) {
      console.error(`Proof verification failed at iteration ${i}`);
      break;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total iterations: ${iterations}`);
  console.log(`Average memory growth per iteration: ${
    Math.round(memoryGrowth.reduce((a, b) => a + b, 0) / iterations)
  } MB`);
  
  const lastFive = memoryGrowth.slice(-5);
  console.log(`Last 5 iterations growth: ${lastFive.join(', ')} MB`);
  
  if (lastFive.every(g => g <= 5)) {
    console.log('\n✅ Memory usage appears stable - fix is working!');
  } else {
    console.log('\n❌ Memory is still growing significantly - leak may persist');
  }
}

// Run with --expose-gc for accurate measurements
console.log('Run with: node --expose-gc test-memory-fix.js\n');

runTest().catch(console.error);