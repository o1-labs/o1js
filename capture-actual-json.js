#!/usr/bin/env node

/**
 * ACTUAL JSON CAPTURE FROM TOJSON() CALLS
 * 
 * Captures the actual JSON output from toJson() method calls
 * by intercepting the return values directly.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

// Store original methods we want to intercept
let originalConsoleLog;
let capturedJSON = {};

// Function to setup interception of toJson calls
function setupToJsonInterception() {
  console.log(`🎣 Setting up toJson() call interception...`);
  
  // Store original console.log
  originalConsoleLog = console.log;
  
  // Track backend state
  let currentBackend = 'unknown';
  
  // Override console.log to detect backend switches and capture toJson results
  console.log = (...args) => {
    const message = args.join(' ');
    
    // Detect backend switches
    if (message.includes('sparky_active=true')) {
      currentBackend = 'sparky';
    } else if (message.includes('sparky_active=false')) {
      currentBackend = 'snarky';
    }
    
    // Look for toJson processing messages
    if (message.includes('FRESH SNAPSHOT FIX: toJson processing')) {
      originalConsoleLog(`🎯 Detected ${currentBackend} toJson processing: ${message}`);
    }
    
    // Call original console.log
    originalConsoleLog.apply(console, args);
  };
  
  return currentBackend;
}

// Function to intercept and display method return values
function interceptMethodReturns() {
  console.log(`🪝 Setting up method return interception...`);
  
  // We'll intercept calls at the global level by monitoring API calls
  if (typeof globalThis.sparkyConstraintBridge !== 'undefined') {
    console.log(`📊 Found sparkyConstraintBridge - setting up interception`);
    
    // Store original methods
    const originalToJson = globalThis.sparkyConstraintBridge.toJson;
    
    // Intercept toJson calls
    globalThis.sparkyConstraintBridge.toJson = function(...args) {
      console.log(`🎯 INTERCEPTED toJson() call on sparkyConstraintBridge`);
      
      const result = originalToJson.apply(this, args);
      
      console.log(`📊 toJson() result:`, result);
      
      // Try to parse if it's a string
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          console.log(`📊 Parsed JSON:`, parsed);
          capturedJSON.sparky = {
            raw: result,
            parsed: parsed,
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.log(`❌ Failed to parse toJson result as JSON: ${e.message}`);
          capturedJSON.sparky = {
            raw: result,
            parsed: null,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        console.log(`📊 toJson() returned non-string:`, typeof result, result);
        capturedJSON.sparky = {
          raw: JSON.stringify(result),
          parsed: result,
          timestamp: new Date().toISOString()
        };
      }
      
      return result;
    };
  }
}

// Create a test program that will trigger constraint generation
function createTestProgram() {
  return ZkProgram({
    name: 'JSONCapture',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Create a multiplication constraint to trigger JSON generation
          return { publicOutput: publicInput.mul(privateInput) };
        },
      },
    },
  });
}

// Function to compile and manually trigger toJson
async function compileAndCaptureJSON(backend) {
  console.log(`\n🔍 COMPILING AND CAPTURING JSON FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    const program = createTestProgram();
    console.log(`📋 Starting compilation...`);
    
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Now try to manually access the constraint system and call toJson
    if (result.analyzeMethods?.compute) {
      console.log(`🔍 Found analyzeMethods.compute, attempting to call toJson...`);
      
      const analyzeResult = result.analyzeMethods.compute;
      
      // Check what methods are available
      console.log(`📊 Available methods on analyzeResult:`, Object.keys(analyzeResult));
      
      // Try to call toJson if it exists
      if (typeof analyzeResult.toJson === 'function') {
        console.log(`🎯 Calling analyzeResult.toJson()...`);
        try {
          const jsonResult = analyzeResult.toJson();
          console.log(`📊 CAPTURED ${backend.toUpperCase()} JSON FROM analyzeResult.toJson():`);
          console.log(`═══════════════════════════════════════════════════════════════`);
          
          if (typeof jsonResult === 'string') {
            console.log(jsonResult);
            
            // Try to parse and store
            try {
              const parsed = JSON.parse(jsonResult);
              capturedJSON[backend] = {
                raw: jsonResult,
                parsed: parsed,
                timestamp: new Date().toISOString()
              };
            } catch (e) {
              capturedJSON[backend] = {
                raw: jsonResult,
                parsed: null,
                timestamp: new Date().toISOString()
              };
            }
          } else {
            console.log(JSON.stringify(jsonResult, null, 2));
            capturedJSON[backend] = {
              raw: JSON.stringify(jsonResult),
              parsed: jsonResult,
              timestamp: new Date().toISOString()
            };
          }
          
          console.log(`═══════════════════════════════════════════════════════════════`);
        } catch (e) {
          console.error(`❌ Failed to call toJson(): ${e.message}`);
        }
      } else {
        console.log(`❌ toJson method not found on analyzeResult`);
      }
    } else {
      console.log(`❌ analyzeMethods.compute not found in compilation result`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to compile ${backend}:`, error.message);
    return null;
  }
}

// Function to save captured JSON to files
function saveJSONFiles() {
  console.log(`\n💾 SAVING CAPTURED JSON TO FILES`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  for (const [backend, data] of Object.entries(capturedJSON)) {
    if (data) {
      const filename = `${backend}-constraint-system.json`;
      fs.writeFileSync(filename, data.raw);
      console.log(`✅ ${backend} JSON saved to ${filename}`);
      console.log(`   Size: ${data.raw.length} characters`);
      
      // Also save a pretty-printed version if we have parsed data
      if (data.parsed) {
        const prettyFilename = `${backend}-constraint-system-pretty.json`;
        fs.writeFileSync(prettyFilename, JSON.stringify(data.parsed, null, 2));
        console.log(`✅ ${backend} pretty JSON saved to ${prettyFilename}`);
      }
    }
  }
}

// Function to compare captured JSON
function compareJSON() {
  console.log(`\n🔬 COMPARING CAPTURED JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  const backends = Object.keys(capturedJSON);
  if (backends.length < 2) {
    console.log(`❌ Need at least 2 backends to compare, got: ${backends.join(', ')}`);
    return;
  }
  
  const snarkyData = capturedJSON.snarky;
  const sparkyData = capturedJSON.sparky;
  
  if (!snarkyData || !sparkyData) {
    console.log(`❌ Missing JSON data:`);
    console.log(`   Snarky: ${snarkyData ? 'Present' : 'Missing'}`);
    console.log(`   Sparky: ${sparkyData ? 'Present' : 'Missing'}`);
    return;
  }
  
  console.log(`📊 Raw JSON Length Comparison:`);
  console.log(`   Snarky: ${snarkyData.raw.length} characters`);
  console.log(`   Sparky: ${sparkyData.raw.length} characters`);
  console.log(`   Length match: ${snarkyData.raw.length === sparkyData.raw.length ? '✅' : '❌'}`);
  
  if (snarkyData.parsed && sparkyData.parsed) {
    console.log(`\n📊 Structure Comparison:`);
    console.log(`   Snarky gates: ${snarkyData.parsed.gates?.length || 'N/A'}`);
    console.log(`   Sparky gates: ${sparkyData.parsed.gates?.length || 'N/A'}`);
    console.log(`   Gate count match: ${(snarkyData.parsed.gates?.length === sparkyData.parsed.gates?.length) ? '✅' : '❌'}`);
    
    console.log(`   Snarky public_input_size: ${snarkyData.parsed.public_input_size || 'N/A'}`);
    console.log(`   Sparky public_input_size: ${sparkyData.parsed.public_input_size || 'N/A'}`);
    console.log(`   Public input match: ${(snarkyData.parsed.public_input_size === sparkyData.parsed.public_input_size) ? '✅' : '❌'}`);
  }
  
  // Character-by-character comparison
  if (snarkyData.raw !== sparkyData.raw) {
    console.log(`\n🔍 Finding first difference...`);
    const minLength = Math.min(snarkyData.raw.length, sparkyData.raw.length);
    
    for (let i = 0; i < minLength; i++) {
      if (snarkyData.raw[i] !== sparkyData.raw[i]) {
        console.log(`   First difference at index ${i}:`);
        console.log(`     Snarky[${i}]: '${snarkyData.raw[i]}'`);
        console.log(`     Sparky[${i}]: '${sparkyData.raw[i]}'`);
        
        // Show context
        const start = Math.max(0, i - 10);
        const end = Math.min(minLength, i + 10);
        console.log(`   Context:`);
        console.log(`     Snarky: "${snarkyData.raw.substring(start, end)}"`);
        console.log(`     Sparky: "${sparkyData.raw.substring(start, end)}"`);
        console.log(`             ${' '.repeat(i - start)}^`);
        break;
      }
    }
  } else {
    console.log(`   ✅ JSON content is identical!`);
  }
}

// Main function
async function main() {
  console.log(`🎯 ACTUAL JSON CAPTURE FROM TOJSON() CALLS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Setup interception
  setupToJsonInterception();
  interceptMethodReturns();
  
  try {
    // Compile with both backends
    await compileAndCaptureJSON('snarky');
    await compileAndCaptureJSON('sparky');
    
    // Save JSON to files
    saveJSONFiles();
    
    // Compare JSON
    compareJSON();
    
    // Display the raw JSON
    console.log(`\n📄 CAPTURED JSON DATA`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
    for (const [backend, data] of Object.entries(capturedJSON)) {
      if (data) {
        console.log(`\n🔍 ${backend.toUpperCase()} CONSTRAINT SYSTEM JSON:`);
        console.log(data.raw);
      }
    }
    
    console.log(`\n🎯 JSON CAPTURE COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ JSON capture failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);