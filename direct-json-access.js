#!/usr/bin/env node

/**
 * DIRECT CONSTRAINT SYSTEM JSON ACCESS
 * 
 * Directly calls constraint system toJson() methods to show actual JSON data
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

// Function to hook into the WASM toJson calls
function hookConstraintSystemCalls() {
  console.log(`🪝 Setting up constraint system call hooks...`);
  
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  
  // Track captured JSON
  let capturedJSONData = {};
  let currentBackend = 'unknown';
  
  // Override console.log to capture JSON output
  console.log = (...args) => {
    const message = args.join(' ');
    
    // Detect backend switches
    if (message.includes('sparky_active=true')) {
      currentBackend = 'sparky';
    } else if (message.includes('sparky_active=false')) {
      currentBackend = 'snarky';  
    }
    
    // Look for JSON structures in the message
    if (message.includes('{') && message.includes('}')) {
      // Extract potential JSON from the message
      const jsonStart = message.indexOf('{');
      const jsonEnd = message.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const potentialJSON = message.substring(jsonStart, jsonEnd);
        
        try {
          const parsed = JSON.parse(potentialJSON);
          
          // Check if this looks like a constraint system
          if (parsed.gates || parsed.public_input_size !== undefined || parsed.constraints) {
            originalLog(`\n📊 CAPTURED ${currentBackend.toUpperCase()} CONSTRAINT SYSTEM JSON:`);
            originalLog(`═══════════════════════════════════════════════════════════════`);
            originalLog(potentialJSON);
            originalLog(`═══════════════════════════════════════════════════════════════\n`);
            
            capturedJSONData[currentBackend] = {
              raw: potentialJSON,
              parsed: parsed,
              timestamp: new Date().toISOString()
            };
          }
        } catch (e) {
          // Not valid JSON or not a constraint system
        }
      }
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
  
  return capturedJSONData;
}

// Create a simple program that generates constraints
function createConstraintProgram() {
  return ZkProgram({
    name: 'DirectJSON',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Generate a multiplication constraint
          return { publicOutput: publicInput.mul(privateInput) };
        },
      },
    },
  });
}

// Function to compile with a specific backend and capture JSON
async function compileAndCaptureJSON(backend, program, capturedData) {
  console.log(`\n🔍 COMPILING WITH ${backend.toUpperCase()} BACKEND`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    const startTime = Date.now();
    const result = await program.compile();
    const compileTime = Date.now() - startTime;
    
    console.log(`✅ Compilation completed in ${compileTime}ms`);
    console.log(`🔑 VK Hash: ${result.verificationKey?.hash || 'unknown'}`);
    
    // Check if we captured JSON for this backend
    if (capturedData[backend]) {
      console.log(`📊 JSON captured for ${backend}!`);
      return capturedData[backend];
    } else {
      console.log(`❌ No JSON captured for ${backend}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Compilation failed for ${backend}:`, error.message);
    return null;
  }
}

// Function to save captured JSON to files
function saveJSON(snarkyJSON, sparkyJSON) {
  console.log(`\n💾 SAVING CAPTURED JSON TO FILES`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (snarkyJSON) {
    fs.writeFileSync('snarky-constraints.json', snarkyJSON.raw);
    console.log(`✅ Snarky JSON saved to snarky-constraints.json`);
    console.log(`   Size: ${snarkyJSON.raw.length} characters`);
  }
  
  if (sparkyJSON) {
    fs.writeFileSync('sparky-constraints.json', sparkyJSON.raw);
    console.log(`✅ Sparky JSON saved to sparky-constraints.json`);
    console.log(`   Size: ${sparkyJSON.raw.length} characters`);
  }
}

// Function to compare the captured JSON
function compareConstraintJSON(snarkyJSON, sparkyJSON) {
  console.log(`\n🔬 COMPARING CONSTRAINT SYSTEM JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (!snarkyJSON || !sparkyJSON) {
    console.log(`❌ Cannot compare - missing JSON data`);
    console.log(`   Snarky: ${snarkyJSON ? 'Present' : 'Missing'}`);
    console.log(`   Sparky: ${sparkyJSON ? 'Present' : 'Missing'}`);
    return;
  }
  
  const snarky = snarkyJSON.parsed;
  const sparky = sparkyJSON.parsed;
  
  console.log(`📊 Structure Comparison:`);
  console.log(`   Snarky gates: ${snarky.gates?.length || 'N/A'}`);
  console.log(`   Sparky gates: ${sparky.gates?.length || 'N/A'}`);
  console.log(`   Gate count match: ${(snarky.gates?.length === sparky.gates?.length) ? '✅' : '❌'}`);
  
  console.log(`   Snarky public_input_size: ${snarky.public_input_size || 'N/A'}`);
  console.log(`   Sparky public_input_size: ${sparky.public_input_size || 'N/A'}`);
  console.log(`   Public input match: ${(snarky.public_input_size === sparky.public_input_size) ? '✅' : '❌'}`);
  
  // Compare individual gates
  if (snarky.gates && sparky.gates) {
    console.log(`\n🔍 Gate-by-Gate Analysis:`);
    
    const maxGates = Math.max(snarky.gates.length, sparky.gates.length);
    for (let i = 0; i < Math.min(5, maxGates); i++) {
      const snarkyGate = snarky.gates[i];
      const sparkyGate = sparky.gates[i];
      
      console.log(`\n   Gate ${i}:`);
      if (snarkyGate && sparkyGate) {
        console.log(`     Type: Snarky='${snarkyGate.typ}' vs Sparky='${sparkyGate.typ}' ${(snarkyGate.typ === sparkyGate.typ) ? '✅' : '❌'}`);
        
        // Compare wires
        const snarkyWires = JSON.stringify(snarkyGate.wires);
        const sparkyWires = JSON.stringify(sparkyGate.wires);
        console.log(`     Wires: ${(snarkyWires === sparkyWires) ? '✅' : '❌'}`);
        if (snarkyWires !== sparkyWires) {
          console.log(`       Snarky: ${snarkyWires}`);
          console.log(`       Sparky: ${sparkyWires}`);
        }
        
        // Compare coefficients
        const snarkyCoeffs = JSON.stringify(snarkyGate.coeffs);
        const sparkyCoeffs = JSON.stringify(sparkyGate.coeffs);
        console.log(`     Coeffs: ${(snarkyCoeffs === sparkyCoeffs) ? '✅' : '❌'}`);
        if (snarkyCoeffs !== sparkyCoeffs) {
          console.log(`       Snarky: ${snarkyCoeffs}`);
          console.log(`       Sparky: ${sparkyCoeffs}`);
        }
      } else {
        console.log(`     ❌ Gate missing in ${snarkyGate ? 'Sparky' : 'Snarky'}`);
      }
    }
  }
  
  // Compare raw JSON strings
  console.log(`\n📝 Raw JSON Comparison:`);
  console.log(`   Snarky JSON length: ${snarkyJSON.raw.length}`);
  console.log(`   Sparky JSON length: ${sparkyJSON.raw.length}`);
  console.log(`   Length match: ${(snarkyJSON.raw.length === sparkyJSON.raw.length) ? '✅' : '❌'}`);
  
  if (snarkyJSON.raw !== sparkyJSON.raw) {
    console.log(`   ❌ JSON content differs`);
    
    // Find first difference
    const minLength = Math.min(snarkyJSON.raw.length, sparkyJSON.raw.length);
    for (let i = 0; i < minLength; i++) {
      if (snarkyJSON.raw[i] !== sparkyJSON.raw[i]) {
        console.log(`   First difference at index ${i}:`);
        console.log(`     Snarky: '${snarkyJSON.raw[i]}'`);
        console.log(`     Sparky: '${sparkyJSON.raw[i]}'`);
        
        // Show context
        const start = Math.max(0, i - 10);
        const end = Math.min(minLength, i + 10);
        console.log(`   Context:`);
        console.log(`     Snarky: "${snarkyJSON.raw.substring(start, end)}"`);
        console.log(`     Sparky: "${sparkyJSON.raw.substring(start, end)}"`);
        console.log(`             ${' '.repeat(i - start)}^`);
        break;
      }
    }
  } else {
    console.log(`   ✅ JSON content identical`);
  }
}

// Main function
async function main() {
  console.log(`🔍 DIRECT CONSTRAINT SYSTEM JSON ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Hooking into constraint system calls to capture raw JSON...`);
  
  // Setup hooks to capture JSON
  const capturedData = hookConstraintSystemCalls();
  
  try {
    // Create test program
    const program = createConstraintProgram();
    
    // Compile with both backends to capture JSON
    const snarkyJSON = await compileAndCaptureJSON('snarky', program, capturedData);
    const sparkyJSON = await compileAndCaptureJSON('sparky', program, capturedData);
    
    // Save captured JSON to files
    saveJSON(snarkyJSON, sparkyJSON);
    
    // Compare the JSON
    compareConstraintJSON(snarkyJSON, sparkyJSON);
    
    // Display the raw JSON
    console.log(`\n📄 RAW CONSTRAINT SYSTEM JSON DATA`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
    if (snarkyJSON) {
      console.log(`\n🔍 SNARKY CONSTRAINT SYSTEM:`);
      console.log(snarkyJSON.raw);
    }
    
    if (sparkyJSON) {
      console.log(`\n🔍 SPARKY CONSTRAINT SYSTEM:`);
      console.log(sparkyJSON.raw);
    }
    
    console.log(`\n🎯 JSON ACCESS COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ JSON access failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);