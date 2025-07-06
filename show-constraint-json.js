#!/usr/bin/env node

/**
 * CONSTRAINT SYSTEM JSON EXTRACTOR
 * 
 * Captures and displays the actual JSON constraint system data 
 * being passed to Kimchi from both Snarky and Sparky backends.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

// Global storage for captured JSON data
let capturedJSON = {
  snarky: null,
  sparky: null
};

// Function to intercept and capture constraint system JSON
function setupJSONCapture() {
  // Store original JSON.stringify to intercept constraint system serialization
  const originalStringify = JSON.stringify;
  
  JSON.stringify = function(obj, replacer, space) {
    // Check if this looks like a constraint system
    if (obj && typeof obj === 'object') {
      // Look for constraint system indicators
      if (obj.gates || obj.public_input_size !== undefined || obj.constraints) {
        const backend = getCurrentBackend();
        console.log(`📊 CAPTURED ${backend.toUpperCase()} CONSTRAINT SYSTEM JSON`);
        console.log(`   Gates: ${obj.gates?.length || 'unknown'}`);
        console.log(`   Public Input Size: ${obj.public_input_size || 'unknown'}`);
        console.log(`   Has constraints field: ${!!obj.constraints}`);
        
        // Store the captured JSON
        capturedJSON[backend] = {
          timestamp: new Date().toISOString(),
          data: obj,
          json: originalStringify.call(this, obj, replacer, space)
        };
      }
    }
    
    // Call original JSON.stringify
    return originalStringify.call(this, obj, replacer, space);
  };
}

// Track current backend
let currentBackend = 'unknown';

function getCurrentBackend() {
  return currentBackend;
}

// Create a simple test program to generate constraints
function createTestProgram() {
  return ZkProgram({
    name: 'JSONTest',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Simple multiplication to generate a constraint
          const result = publicInput.mul(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });
}

// Function to compile and capture JSON for a backend
async function captureBackendJSON(backend) {
  console.log(`\n🔍 CAPTURING ${backend.toUpperCase()} CONSTRAINT SYSTEM JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    // Set current backend
    currentBackend = backend;
    
    // Switch to the backend
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    // Clear previous captures
    capturedJSON[backend] = null;
    
    // Create and compile the test program
    const program = createTestProgram();
    console.log(`📋 Compiling test program...`);
    
    const startTime = Date.now();
    const result = await program.compile();
    const compileTime = Date.now() - startTime;
    
    console.log(`✅ Compilation completed in ${compileTime}ms`);
    
    // Check if we captured JSON
    if (capturedJSON[backend]) {
      console.log(`📊 JSON captured successfully!`);
      console.log(`   Timestamp: ${capturedJSON[backend].timestamp}`);
      console.log(`   JSON length: ${capturedJSON[backend].json.length} characters`);
    } else {
      console.log(`❌ No JSON captured for ${backend}`);
    }
    
    return {
      backend,
      compileTime,
      vkHash: result.verificationKey?.hash?.toString() || 'unknown',
      capturedData: capturedJSON[backend]
    };
    
  } catch (error) {
    console.error(`❌ Failed to capture JSON for ${backend}:`, error.message);
    return null;
  }
}

// Function to save JSON to files for detailed analysis
function saveJSONToFiles() {
  console.log(`\n💾 SAVING JSON DATA TO FILES`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (capturedJSON.snarky) {
    const snarkyFile = 'snarky-constraint-system.json';
    fs.writeFileSync(snarkyFile, capturedJSON.snarky.json, 'utf8');
    console.log(`✅ Snarky JSON saved to: ${snarkyFile}`);
    console.log(`   Size: ${capturedJSON.snarky.json.length} characters`);
  } else {
    console.log(`❌ No Snarky JSON to save`);
  }
  
  if (capturedJSON.sparky) {
    const sparkyFile = 'sparky-constraint-system.json';
    fs.writeFileSync(sparkyFile, capturedJSON.sparky.json, 'utf8');
    console.log(`✅ Sparky JSON saved to: ${sparkyFile}`);
    console.log(`   Size: ${capturedJSON.sparky.json.length} characters`);
  } else {
    console.log(`❌ No Sparky JSON to save`);
  }
}

// Function to compare captured JSON data
function compareJSON() {
  console.log(`\n🔬 JSON COMPARISON ANALYSIS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (!capturedJSON.snarky || !capturedJSON.sparky) {
    console.log(`❌ Cannot compare - missing JSON data`);
    console.log(`   Snarky: ${capturedJSON.snarky ? 'Present' : 'Missing'}`);
    console.log(`   Sparky: ${capturedJSON.sparky ? 'Present' : 'Missing'}`);
    return;
  }
  
  const snarkyData = capturedJSON.snarky.data;
  const sparkyData = capturedJSON.sparky.data;
  
  console.log(`📊 Basic Structure Comparison:`);
  console.log(`   Snarky gates: ${snarkyData.gates?.length || 'N/A'}`);
  console.log(`   Sparky gates: ${sparkyData.gates?.length || 'N/A'}`);
  console.log(`   Snarky public_input_size: ${snarkyData.public_input_size || 'N/A'}`);
  console.log(`   Sparky public_input_size: ${sparkyData.public_input_size || 'N/A'}`);
  
  // Compare gates if both exist
  if (snarkyData.gates && sparkyData.gates) {
    console.log(`\n🔍 Gate-by-Gate Comparison:`);
    const maxGates = Math.max(snarkyData.gates.length, sparkyData.gates.length);
    
    for (let i = 0; i < Math.min(5, maxGates); i++) { // Show first 5 gates
      const snarkyGate = snarkyData.gates[i];
      const sparkyGate = sparkyData.gates[i];
      
      console.log(`\n   Gate ${i}:`);
      if (snarkyGate && sparkyGate) {
        console.log(`     Snarky type: ${snarkyGate.typ || 'unknown'}`);
        console.log(`     Sparky type: ${sparkyGate.typ || 'unknown'}`);
        console.log(`     Type match: ${(snarkyGate.typ === sparkyGate.typ) ? '✅' : '❌'}`);
        
        // Compare wires
        const snarkyWires = JSON.stringify(snarkyGate.wires || []);
        const sparkyWires = JSON.stringify(sparkyGate.wires || []);
        console.log(`     Wires match: ${(snarkyWires === sparkyWires) ? '✅' : '❌'}`);
        
        if (snarkyWires !== sparkyWires) {
          console.log(`       Snarky wires: ${snarkyWires}`);
          console.log(`       Sparky wires: ${sparkyWires}`);
        }
        
        // Compare coefficients
        const snarkyCoeffs = JSON.stringify(snarkyGate.coeffs || []);
        const sparkyCoeffs = JSON.stringify(sparkyGate.coeffs || []);
        console.log(`     Coeffs match: ${(snarkyCoeffs === sparkyCoeffs) ? '✅' : '❌'}`);
        
        if (snarkyCoeffs !== sparkyCoeffs) {
          console.log(`       Snarky coeffs: ${snarkyCoeffs}`);
          console.log(`       Sparky coeffs: ${sparkyCoeffs}`);
        }
      } else {
        console.log(`     ❌ Gate ${i} missing in ${snarkyGate ? 'Sparky' : 'Snarky'}`);
      }
    }
  }
  
  // Compare JSON strings character by character
  const snarkyJSON = capturedJSON.snarky.json;
  const sparkyJSON = capturedJSON.sparky.json;
  
  console.log(`\n📝 JSON String Comparison:`);
  console.log(`   Snarky JSON length: ${snarkyJSON.length}`);
  console.log(`   Sparky JSON length: ${sparkyJSON.length}`);
  console.log(`   Length match: ${(snarkyJSON.length === sparkyJSON.length) ? '✅' : '❌'}`);
  
  if (snarkyJSON.length === sparkyJSON.length) {
    let differences = 0;
    let firstDiff = -1;
    
    for (let i = 0; i < snarkyJSON.length; i++) {
      if (snarkyJSON[i] !== sparkyJSON[i]) {
        differences++;
        if (firstDiff === -1) {
          firstDiff = i;
        }
      }
    }
    
    console.log(`   Character differences: ${differences}/${snarkyJSON.length} (${(differences/snarkyJSON.length*100).toFixed(2)}%)`);
    
    if (firstDiff !== -1) {
      console.log(`   First difference at index: ${firstDiff}`);
      const start = Math.max(0, firstDiff - 10);
      const end = Math.min(snarkyJSON.length, firstDiff + 10);
      console.log(`     Snarky: "${snarkyJSON.substring(start, end)}"`);
      console.log(`     Sparky: "${sparkyJSON.substring(start, end)}"`);
      console.log(`             ${' '.repeat(firstDiff - start)}^`);
    }
  }
}

// Function to display JSON content
function displayJSON() {
  console.log(`\n📄 CONSTRAINT SYSTEM JSON CONTENT`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (capturedJSON.snarky) {
    console.log(`\n🔍 SNARKY CONSTRAINT SYSTEM JSON:`);
    console.log(capturedJSON.snarky.json);
  }
  
  if (capturedJSON.sparky) {
    console.log(`\n🔍 SPARKY CONSTRAINT SYSTEM JSON:`);
    console.log(capturedJSON.sparky.json);
  }
}

// Main function
async function main() {
  console.log(`📄 CONSTRAINT SYSTEM JSON EXTRACTOR`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Capturing raw JSON constraint system data from both backends...`);
  
  // Setup JSON capture interception
  setupJSONCapture();
  
  try {
    // Capture JSON from both backends
    const snarkyResult = await captureBackendJSON('snarky');
    const sparkyResult = await captureBackendJSON('sparky');
    
    // Save JSON to files
    saveJSONToFiles();
    
    // Compare the JSON data
    compareJSON();
    
    // Display the actual JSON content
    displayJSON();
    
    console.log(`\n🎯 JSON EXTRACTION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Check the detailed JSON output above and saved files for differences.`);
    
  } catch (error) {
    console.error(`❌ JSON extraction failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);