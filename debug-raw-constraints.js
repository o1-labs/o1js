#!/usr/bin/env node

/**
 * RAW CONSTRAINT SYSTEM EXTRACTOR
 * 
 * Extracts the raw constraint system JSON that's actually passed to Kimchi
 * by intercepting the constraint system generation at the WASM level.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

// Global interceptor for constraint system data
let capturedConstraints = {};

// Function to intercept WASM constraint system calls
function setupConstraintInterceptor() {
  // Store original console.log to capture WASM debug output
  const originalLog = console.log;
  
  console.log = (...args) => {
    const message = args.join(' ');
    
    // Capture constraint system data from debug output
    if (message.includes('OCaml CONSTRAINT BRIDGE:')) {
      const match = message.match(/gates=(\d+), publicInputSize=(\d+), constraints=(\d+)/);
      if (match) {
        const backend = getCurrentBackend();
        capturedConstraints[backend] = {
          gates: parseInt(match[1]),
          publicInputSize: parseInt(match[2]),
          constraints: parseInt(match[3]),
          rawMessage: message
        };
      }
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
}

// Function to get current backend from global state
function getCurrentBackend() {
  // Try to determine backend from the sparky_active flag in debug output
  // This is a heuristic based on the debug output we've seen
  return global.currentBackend || 'unknown';
}

// Function to create a minimal test program
function createMinimalProgram(name, operation) {
  return ZkProgram({
    name: name,
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          let result;
          switch (operation) {
            case 'add':
              result = publicInput.add(privateInput);
              break;
            case 'mul':
              result = publicInput.mul(privateInput);
              break;
            case 'sub':
              result = publicInput.sub(privateInput);
              break;
            default:
              result = publicInput.add(privateInput);
          }
          return { publicOutput: result };
        },
      },
    },
  });
}

// Function to compile and extract constraint data for a backend
async function extractBackendConstraints(backend, program) {
  console.log(`\n🔍 Extracting constraints for ${backend.toUpperCase()} backend...`);
  
  try {
    // Set global backend tracker
    global.currentBackend = backend;
    
    // Switch to the backend
    await switchBackend(backend);
    
    // Clear previous captures
    capturedConstraints[backend] = null;
    
    // Compile the program
    const startTime = Date.now();
    const result = await program.compile();
    const compileTime = Date.now() - startTime;
    
    console.log(`   ✅ Compilation completed in ${compileTime}ms`);
    console.log(`   📊 Captured constraints:`, capturedConstraints[backend]);
    
    // Extract VK information
    const vk = result.verificationKey;
    const vkInfo = {
      hash: vk?.hash?.toString() || 'unknown',
      dataLength: vk?.data?.length || 0,
      data: vk?.data || ''
    };
    
    console.log(`   🔑 VK Hash: ${vkInfo.hash}`);
    console.log(`   📏 VK Data Length: ${vkInfo.dataLength}`);
    
    return {
      backend,
      compileTime,
      constraints: capturedConstraints[backend],
      vk: vkInfo,
      compilationResult: result
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to extract constraints for ${backend}:`, error.message);
    return null;
  }
}

// Function to perform detailed VK data analysis
function analyzeVKDifferences(snarkyData, sparkyData) {
  console.log(`\n🔬 VK DATA DETAILED ANALYSIS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (!snarkyData?.vk?.data || !sparkyData?.vk?.data) {
    console.log(`❌ Cannot analyze - missing VK data`);
    return;
  }
  
  const snarkyVK = snarkyData.vk.data;
  const sparkyVK = sparkyData.vk.data;
  
  console.log(`📊 VK Data Comparison:`);
  console.log(`   Snarky Length: ${snarkyVK.length}`);
  console.log(`   Sparky Length: ${sparkyVK.length}`);
  console.log(`   Length Match: ${snarkyVK.length === sparkyVK.length ? '✅' : '❌'}`);
  
  if (snarkyVK.length === sparkyVK.length) {
    let differences = [];
    
    for (let i = 0; i < snarkyVK.length; i++) {
      if (snarkyVK[i] !== sparkyVK[i]) {
        differences.push({
          index: i,
          snarky: snarkyVK[i],
          sparky: sparkyVK[i]
        });
      }
    }
    
    console.log(`   Differences: ${differences.length}/${snarkyVK.length} (${(differences.length/snarkyVK.length*100).toFixed(2)}%)`);
    
    if (differences.length > 0) {
      console.log(`\n🔍 First 10 differences:`);
      for (let i = 0; i < Math.min(10, differences.length); i++) {
        const diff = differences[i];
        console.log(`     [${diff.index}]: '${diff.snarky}' → '${diff.sparky}'`);
      }
      
      // Show context around first difference
      const firstDiff = differences[0];
      const start = Math.max(0, firstDiff.index - 10);
      const end = Math.min(snarkyVK.length, firstDiff.index + 10);
      
      console.log(`\n📍 Context around first difference (index ${firstDiff.index}):`);
      console.log(`   Snarky: "${snarkyVK.substring(start, end)}"`);
      console.log(`   Sparky: "${sparkyVK.substring(start, end)}"`);
      console.log(`           ${' '.repeat(firstDiff.index - start)}^`);
    }
  }
  
  // Analyze VK hash differences
  console.log(`\n🔑 VK Hash Analysis:`);
  console.log(`   Snarky Hash: ${snarkyData.vk.hash}`);
  console.log(`   Sparky Hash: ${sparkyData.vk.hash}`);
  
  // Convert hashes to hex for easier analysis
  try {
    const snarkyHex = BigInt(snarkyData.vk.hash).toString(16);
    const sparkyHex = BigInt(sparkyData.vk.hash).toString(16);
    console.log(`   Snarky Hex:  0x${snarkyHex}`);
    console.log(`   Sparky Hex:  0x${sparkyHex}`);
  } catch (e) {
    console.log(`   (Could not convert to hex: ${e.message})`);
  }
}

// Function to analyze constraint system differences
function analyzeConstraintDifferences(snarkyData, sparkyData) {
  console.log(`\n⚙️  CONSTRAINT SYSTEM ANALYSIS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  const snarkyConstraints = snarkyData?.constraints;
  const sparkyConstraints = sparkyData?.constraints;
  
  if (!snarkyConstraints || !sparkyConstraints) {
    console.log(`❌ Cannot analyze constraints - missing data`);
    console.log(`   Snarky constraints: ${snarkyConstraints ? 'Present' : 'Missing'}`);
    console.log(`   Sparky constraints: ${sparkyConstraints ? 'Present' : 'Missing'}`);
    return;
  }
  
  console.log(`📊 Basic Constraint Metrics:`);
  console.log(`   Gates:     Snarky=${snarkyConstraints.gates}     vs Sparky=${sparkyConstraints.gates}     ${snarkyConstraints.gates === sparkyConstraints.gates ? '✅' : '❌'}`);
  console.log(`   PubInput:  Snarky=${snarkyConstraints.publicInputSize} vs Sparky=${sparkyConstraints.publicInputSize} ${snarkyConstraints.publicInputSize === sparkyConstraints.publicInputSize ? '✅' : '❌'}`);
  console.log(`   Constraints: Snarky=${snarkyConstraints.constraints} vs Sparky=${sparkyConstraints.constraints} ${snarkyConstraints.constraints === sparkyConstraints.constraints ? '✅' : '❌'}`);
  
  // Performance comparison
  console.log(`\n⚡ Performance Comparison:`);
  console.log(`   Snarky Compile Time: ${snarkyData.compileTime}ms`);
  console.log(`   Sparky Compile Time: ${sparkyData.compileTime}ms`);
  console.log(`   Speedup: ${(snarkyData.compileTime / sparkyData.compileTime).toFixed(2)}x`);
}

// Main analysis function
async function main() {
  console.log(`🔍 RAW CONSTRAINT SYSTEM EXTRACTOR`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Extracting raw constraint system data passed to Kimchi...`);
  
  // Setup constraint interception
  setupConstraintInterceptor();
  
  try {
    // Test 1: Simple field addition
    console.log(`\n📋 TEST 1: Simple Field Addition`);
    console.log(`─────────────────────────────────────────────────────────────`);
    
    const addProgram = createMinimalProgram('SimpleAdd', 'add');
    
    const snarkyAdd = await extractBackendConstraints('snarky', addProgram);
    const sparkyAdd = await extractBackendConstraints('sparky', addProgram);
    
    if (snarkyAdd && sparkyAdd) {
      analyzeConstraintDifferences(snarkyAdd, sparkyAdd);
      analyzeVKDifferences(snarkyAdd, sparkyAdd);
    }
    
    // Test 2: Simple field multiplication
    console.log(`\n📋 TEST 2: Simple Field Multiplication`);
    console.log(`─────────────────────────────────────────────────────────────`);
    
    const mulProgram = createMinimalProgram('SimpleMul', 'mul');
    
    const snarkyMul = await extractBackendConstraints('snarky', mulProgram);
    const sparkyMul = await extractBackendConstraints('sparky', mulProgram);
    
    if (snarkyMul && sparkyMul) {
      analyzeConstraintDifferences(snarkyMul, sparkyMul);
      analyzeVKDifferences(snarkyMul, sparkyMul);
    }
    
    console.log(`\n🎯 ANALYSIS COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Raw constraint data has been extracted and analyzed.`);
    console.log(`Focus on VK data differences to understand the root cause.`);
    
  } catch (error) {
    console.error(`❌ Analysis failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);