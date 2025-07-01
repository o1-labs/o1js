#!/usr/bin/env node
/**
 * VK Difference Investigation Script
 * 
 * Standalone script to deeply investigate why Sparky generates different VKs
 * than Snarky and why all Sparky programs generate the same VK hash.
 */

import o1js from './dist/node/index.js';
const { Field, ZkProgram, Provable, switchBackend, getCurrentBackend, initializeBindings } = o1js;

import bindings from './dist/node/bindings.js';
const { Snarky } = bindings;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure output directory exists
const outputDir = path.join(__dirname, 'vk-investigation-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Test programs with increasing complexity
const testPrograms = {
  // Absolutely minimal - no private inputs
  empty: ZkProgram({
    name: 'EmptyProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [],
        async method(publicInput) {
          // No constraints at all
        }
      }
    }
  }),

  // Single constraint
  minimal: ZkProgram({
    name: 'MinimalProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [],
        async method(publicInput) {
          publicInput.assertEquals(Field(42));
        }
      }
    }
  }),

  // Single variable
  singleVar: ZkProgram({
    name: 'SingleVarProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        async method(publicInput, x) {
          x.assertEquals(publicInput);
        }
      }
    }
  }),

  // Addition
  addition: ZkProgram({
    name: 'AdditionProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          a.add(b).assertEquals(publicInput);
        }
      }
    }
  }),

  // Multiplication
  multiplication: ZkProgram({
    name: 'MultiplicationProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        async method(publicInput, x) {
          x.mul(x).assertEquals(publicInput);
        }
      }
    }
  }),

  // Should trigger reduction: x + x + x = 3*x
  reduction: ZkProgram({
    name: 'ReductionProgram',
    publicInput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        async method(publicInput, x) {
          x.add(x).add(x).assertEquals(publicInput);
        }
      }
    }
  })
};

async function captureConstraintSystem(program, programName, backend) {
  console.log(`\n--- Capturing ${programName} with ${backend} ---`);
  
  try {
    // Compile the program
    console.log('Compiling...');
    const startTime = Date.now();
    const { verificationKey } = await program.compile();
    const compileTime = Date.now() - startTime;
    
    console.log(`Compilation time: ${compileTime}ms`);
    console.log(`VK hash: ${verificationKey.hash.toString()}`);
    console.log(`VK data length: ${verificationKey.data.length}`);
    console.log(`VK data first 100 chars: ${verificationKey.data.substring(0, 100)}`);
    
    // Try to get constraint system details
    let constraintData = null;
    try {
      const csJson = Snarky.constraintSystem.toJson({});
      constraintData = csJson;
      console.log(`Gates: ${csJson.gates?.length || 0}`);
      
      // Count gate types
      const gateTypes = {};
      if (csJson.gates) {
        csJson.gates.forEach(gate => {
          const type = gate.typ || 'Unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        console.log('Gate types:', JSON.stringify(gateTypes, null, 2));
      }
    } catch (e) {
      console.log('Could not get constraint system JSON');
    }
    
    const result = {
      backend,
      programName,
      vkHash: verificationKey.hash.toString(),
      vkDataLength: verificationKey.data.length,
      vkDataFirst100: verificationKey.data.substring(0, 100),
      vkDataLast100: verificationKey.data.substring(verificationKey.data.length - 100),
      compileTime,
      constraintData,
      timestamp: new Date().toISOString()
    };
    
    // Save individual result
    const filename = path.join(outputDir, `${programName}-${backend}.json`);
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error(`Error with ${programName} on ${backend}:`, error.message);
    return null;
  }
}

async function compareProgram(program, programName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${programName}`);
  console.log('='.repeat(60));
  
  // Capture with Snarky
  await switchBackend('snarky');
  const snarkyResult = await captureConstraintSystem(program, programName, 'snarky');
  
  // Capture with Sparky
  await switchBackend('sparky');
  const sparkyResult = await captureConstraintSystem(program, programName, 'sparky');
  
  // Compare results
  if (snarkyResult && sparkyResult) {
    console.log('\n--- Comparison ---');
    console.log(`VK hashes match: ${snarkyResult.vkHash === sparkyResult.vkHash ? '✅' : '❌'}`);
    
    if (snarkyResult.vkHash !== sparkyResult.vkHash) {
      console.log(`Snarky VK: ${snarkyResult.vkHash.substring(0, 30)}...`);
      console.log(`Sparky VK: ${sparkyResult.vkHash.substring(0, 30)}...`);
      
      // Find where VK data differs
      if (snarkyResult.vkDataLength === sparkyResult.vkDataLength) {
        console.log('VK data lengths match');
        
        // Compare first and last 100 chars
        if (snarkyResult.vkDataFirst100 !== sparkyResult.vkDataFirst100) {
          console.log('VK data differs in first 100 chars');
        }
        if (snarkyResult.vkDataLast100 !== sparkyResult.vkDataLast100) {
          console.log('VK data differs in last 100 chars');
        }
      } else {
        console.log(`VK data length mismatch: Snarky=${snarkyResult.vkDataLength}, Sparky=${sparkyResult.vkDataLength}`);
      }
    }
    
    // Compare gates if available
    if (snarkyResult.constraintData?.gates && sparkyResult.constraintData?.gates) {
      const snarkyGates = snarkyResult.constraintData.gates.length;
      const sparkyGates = sparkyResult.constraintData.gates.length;
      console.log(`Gate count: Snarky=${snarkyGates}, Sparky=${sparkyGates}`);
    }
  }
  
  return { snarkyResult, sparkyResult };
}

async function main() {
  console.log('VK DIFFERENCE INVESTIGATION');
  console.log('===========================\n');
  
  await initializeBindings();
  
  const allResults = {};
  const sparkyVKs = new Set();
  const snarkyVKs = new Set();
  
  // Test all programs
  for (const [name, program] of Object.entries(testPrograms)) {
    const results = await compareProgram(program, name);
    allResults[name] = results;
    
    if (results.sparkyResult) {
      sparkyVKs.add(results.sparkyResult.vkHash);
    }
    if (results.snarkyResult) {
      snarkyVKs.add(results.snarkyResult.vkHash);
    }
  }
  
  // Analysis summary
  console.log('\n' + '='.repeat(60));
  console.log('CRITICAL FINDINGS');
  console.log('='.repeat(60));
  
  console.log(`\nTotal programs tested: ${Object.keys(testPrograms).length}`);
  console.log(`Unique Snarky VK hashes: ${snarkyVKs.size}`);
  console.log(`Unique Sparky VK hashes: ${sparkyVKs.size}`);
  
  if (sparkyVKs.size === 1 && Object.keys(testPrograms).length > 1) {
    console.error('\n🚨 CRITICAL ISSUE: All Sparky programs generate the SAME VK hash!');
    console.error(`The single hash is: ${Array.from(sparkyVKs)[0]}`);
    console.error('This indicates Sparky is not properly differentiating between programs.');
  }
  
  // Check for patterns in VK data differences
  console.log('\n--- VK Data Difference Analysis ---');
  let firstDiffIndex = null;
  for (const [name, results] of Object.entries(allResults)) {
    if (results.snarkyResult && results.sparkyResult) {
      const snarkyData = results.snarkyResult.vkDataFirst100 + '...' + results.snarkyResult.vkDataLast100;
      const sparkyData = results.sparkyResult.vkDataFirst100 + '...' + results.sparkyResult.vkDataLast100;
      
      // Find first difference
      for (let i = 0; i < Math.min(snarkyData.length, sparkyData.length); i++) {
        if (snarkyData[i] !== sparkyData[i]) {
          console.log(`${name}: First difference at position ${i}`);
          if (firstDiffIndex === null) firstDiffIndex = i;
          break;
        }
      }
    }
  }
  
  // Generate final report
  const report = {
    summary: {
      programsTested: Object.keys(testPrograms).length,
      uniqueSnarkyVKs: snarkyVKs.size,
      uniqueSparkyVKs: sparkyVKs.size,
      criticalIssue: sparkyVKs.size === 1 ? 'All Sparky programs generate same VK' : null,
      firstDifferenceIndex: firstDiffIndex
    },
    programs: allResults,
    timestamp: new Date().toISOString()
  };
  
  const reportPath = path.join(outputDir, 'investigation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\nFull report saved to: ${reportPath}`);
  console.log(`Individual results saved to: ${outputDir}/`);
  
  // Reset to Snarky
  await switchBackend('snarky');
}

main().catch(console.error);