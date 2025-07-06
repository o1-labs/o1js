#!/usr/bin/env node

/**
 * CONSTRAINT SYSTEM DIFFERENCE ANALYZER
 * 
 * Examines the actual constraint system differences between Snarky and Sparky backends
 * to identify the root cause of VK divergence.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

// Function to extract constraint system data from a ZkProgram compilation
async function extractConstraintSystemData(program, backend) {
  console.log(`\n🔍 Extracting constraint system data for ${backend.toUpperCase()} backend...`);
  
  try {
    await switchBackend(backend);
    const compilationResult = await program.compile();
    
    // Access the constraint system through the compilation result
    const constraintSystem = compilationResult.analyzeMethods?.['compute'];
    
    if (!constraintSystem) {
      console.log(`❌ No constraint system data available for ${backend}`);
      return null;
    }
    
    const gates = constraintSystem.gates || [];
    const rows = constraintSystem.rows || 0;
    const digest = constraintSystem.digest || 'unknown';
    
    console.log(`📊 ${backend.toUpperCase()} Constraint System:`);
    console.log(`   Rows: ${rows}`);
    console.log(`   Gates: ${gates.length}`);
    console.log(`   Digest: ${digest}`);
    
    // Extract detailed gate information
    const gateDetails = gates.map((gate, index) => {
      return {
        index,
        type: gate.typ || 'unknown',
        wires: gate.wires || [],
        coeffs: gate.coeffs || [],
        // Additional fields that might be present
        ...gate
      };
    });
    
    return {
      backend,
      rows,
      gateCount: gates.length,
      digest,
      gates: gateDetails
    };
    
  } catch (error) {
    console.log(`❌ Failed to extract constraint system for ${backend}:`, error.message);
    return null;
  }
}

// Function to compare constraint system data in detail
function compareConstraintSystems(snarkyData, sparkyData) {
  console.log(`\n🔬 DETAILED CONSTRAINT SYSTEM COMPARISON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (!snarkyData || !sparkyData) {
    console.log(`❌ Cannot compare - missing data`);
    return;
  }
  
  // Compare basic metrics
  console.log(`\n📊 Basic Metrics Comparison:`);
  console.log(`   Rows:     Snarky=${snarkyData.rows}     vs Sparky=${sparkyData.rows}     ${snarkyData.rows === sparkyData.rows ? '✅' : '❌'}`);
  console.log(`   Gates:    Snarky=${snarkyData.gateCount} vs Sparky=${sparkyData.gateCount} ${snarkyData.gateCount === sparkyData.gateCount ? '✅' : '❌'}`);
  console.log(`   Digest:   Snarky=${snarkyData.digest}   vs Sparky=${sparkyData.digest}   ${snarkyData.digest === sparkyData.digest ? '✅' : '❌'}`);
  
  // Compare gates in detail
  console.log(`\n🔍 Gate-by-Gate Comparison:`);
  const maxGates = Math.max(snarkyData.gates.length, sparkyData.gates.length);
  
  for (let i = 0; i < maxGates; i++) {
    const snarkyGate = snarkyData.gates[i];
    const sparkyGate = sparkyData.gates[i];
    
    console.log(`\n   Gate ${i}:`);
    
    if (!snarkyGate) {
      console.log(`     ❌ Missing in Snarky (Sparky has: ${JSON.stringify(sparkyGate, null, 2)})`);
      continue;
    }
    
    if (!sparkyGate) {
      console.log(`     ❌ Missing in Sparky (Snarky has: ${JSON.stringify(snarkyGate, null, 2)})`);
      continue;
    }
    
    // Compare gate type
    const typeMatch = snarkyGate.type === sparkyGate.type;
    console.log(`     Type:   Snarky='${snarkyGate.type}' vs Sparky='${sparkyGate.type}' ${typeMatch ? '✅' : '❌'}`);
    
    // Compare wires
    const wiresMatch = JSON.stringify(snarkyGate.wires) === JSON.stringify(sparkyGate.wires);
    console.log(`     Wires:  ${wiresMatch ? '✅' : '❌'}`);
    if (!wiresMatch) {
      console.log(`       Snarky: ${JSON.stringify(snarkyGate.wires)}`);
      console.log(`       Sparky: ${JSON.stringify(sparkyGate.wires)}`);
    }
    
    // Compare coefficients
    const coeffsMatch = JSON.stringify(snarkyGate.coeffs) === JSON.stringify(sparkyGate.coeffs);
    console.log(`     Coeffs: ${coeffsMatch ? '✅' : '❌'}`);
    if (!coeffsMatch) {
      console.log(`       Snarky: ${JSON.stringify(snarkyGate.coeffs)}`);
      console.log(`       Sparky: ${JSON.stringify(sparkyGate.coeffs)}`);
    }
    
    // Show any additional differences
    const snarkyKeys = Object.keys(snarkyGate).filter(k => !['index', 'type', 'wires', 'coeffs'].includes(k));
    const sparkyKeys = Object.keys(sparkyGate).filter(k => !['index', 'type', 'wires', 'coeffs'].includes(k));
    
    if (snarkyKeys.length > 0 || sparkyKeys.length > 0) {
      console.log(`     Additional fields:`);
      console.log(`       Snarky extra: ${snarkyKeys.join(', ')}`);
      console.log(`       Sparky extra: ${sparkyKeys.join(', ')}`);
    }
  }
}

// Function to analyze field operations in detail
async function analyzeFieldOperations() {
  console.log(`\n🧮 ANALYZING FIELD OPERATIONS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Test 1: Simple field addition
  console.log(`\n📋 Test 1: Simple Field Addition (x + y)`);
  const SimpleAddition = ZkProgram({
    name: 'SimpleAddition',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.add(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });
  
  const snarkyAddition = await extractConstraintSystemData(SimpleAddition, 'snarky');
  const sparkyAddition = await extractConstraintSystemData(SimpleAddition, 'sparky');
  
  compareConstraintSystems(snarkyAddition, sparkyAddition);
  
  // Test 2: Field multiplication
  console.log(`\n📋 Test 2: Simple Field Multiplication (x * y)`);
  const SimpleMultiplication = ZkProgram({
    name: 'SimpleMultiplication',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.mul(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });
  
  const snarkyMultiplication = await extractConstraintSystemData(SimpleMultiplication, 'snarky');
  const sparkyMultiplication = await extractConstraintSystemData(SimpleMultiplication, 'sparky');
  
  compareConstraintSystems(snarkyMultiplication, sparkyMultiplication);
}

// Function to analyze the VK generation process
async function analyzeVKGeneration() {
  console.log(`\n🔑 ANALYZING VK GENERATION`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  const SimpleProgram = ZkProgram({
    name: 'VKAnalysis',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          return { publicOutput: publicInput.add(privateInput) };
        },
      },
    },
  });
  
  // Test Snarky VK generation
  console.log(`\n🔍 Snarky VK Generation:`);
  await switchBackend('snarky');
  const snarkyResult = await SimpleProgram.compile();
  const snarkyVK = snarkyResult.verificationKey;
  console.log(`   VK Hash: ${snarkyVK?.hash || 'unknown'}`);
  console.log(`   VK Data Length: ${snarkyVK?.data?.length || 'unknown'}`);
  
  // Test Sparky VK generation
  console.log(`\n🔍 Sparky VK Generation:`);
  await switchBackend('sparky');
  const sparkyResult = await SimpleProgram.compile();
  const sparkyVK = sparkyResult.verificationKey;
  console.log(`   VK Hash: ${sparkyVK?.hash || 'unknown'}`);
  console.log(`   VK Data Length: ${sparkyVK?.data?.length || 'unknown'}`);
  
  // Compare VK data byte-by-byte if available
  if (snarkyVK?.data && sparkyVK?.data) {
    console.log(`\n🔬 VK Data Comparison:`);
    const snarkyData = snarkyVK.data;
    const sparkyData = sparkyVK.data;
    
    console.log(`   Length Match: ${snarkyData.length === sparkyData.length ? '✅' : '❌'}`);
    
    if (snarkyData.length === sparkyData.length) {
      let differenceCount = 0;
      let firstDifference = -1;
      
      for (let i = 0; i < snarkyData.length; i++) {
        if (snarkyData[i] !== sparkyData[i]) {
          differenceCount++;
          if (firstDifference === -1) {
            firstDifference = i;
          }
        }
      }
      
      console.log(`   Character Differences: ${differenceCount}/${snarkyData.length}`);
      if (firstDifference !== -1) {
        console.log(`   First Difference at Index: ${firstDifference}`);
        console.log(`     Snarky[${firstDifference}]: '${snarkyData[firstDifference]}'`);
        console.log(`     Sparky[${firstDifference}]: '${sparkyData[firstDifference]}'`);
      }
    }
  }
}

// Main function
async function main() {
  console.log(`🔍 CONSTRAINT SYSTEM DIFFERENCE ANALYZER`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`\nThis tool examines the actual constraint system differences`);
  console.log(`between Snarky and Sparky backends to identify VK divergence.`);
  
  try {
    await analyzeFieldOperations();
    await analyzeVKGeneration();
    
    console.log(`\n🎯 ANALYSIS COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Check the detailed comparison above to identify specific differences.`);
    
  } catch (error) {
    console.error(`❌ Analysis failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);