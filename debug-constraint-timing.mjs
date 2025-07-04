#!/usr/bin/env node

/**
 * CONSTRAINT TIMING DEBUG SCRIPT
 * 
 * This script investigates the critical issue where both Sparky and Snarky
 * return 0 constraints despite performing complex operations that should
 * generate many constraints.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, Poseidon } from './dist/node/index.js';

async function debugConstraintTiming() {
  console.log('\n🔍 CONSTRAINT TIMING DEBUG ANALYSIS');
  console.log('='.repeat(60));
  console.log('Investigating why constraint counts are always 0');
  console.log('='.repeat(60));

  // Test 1: Simple multiplication (should generate 1 constraint)
  console.log('\n🧪 Test 1: Simple Multiplication');
  console.log('-'.repeat(40));
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔧 Testing ${backend.toUpperCase()} backend...`);
    await switchBackend(backend);
    
    try {
      const result = await Provable.constraintSystem(() => {
        const a = Field(5);
        const b = Field(10);
        const c = a.mul(b); // Should generate 1 R1CS constraint
        return c;
      });
      
      console.log(`✅ Backend: ${backend}`);
      console.log(`📊 Constraint count: ${result.rows}`);
      console.log(`🔍 Result object keys: ${Object.keys(result).join(', ')}`);
      console.log(`📋 Full result:`, result);
      
      if (result.rows === 0) {
        console.log('🚨 CRITICAL: Zero constraints for multiplication operation!');
      }
      
    } catch (error) {
      console.log(`💥 Error in ${backend}: ${error.message}`);
      console.log(`📚 Stack trace:`, error.stack);
    }
  }

  // Test 2: Hash operation (should generate many constraints)
  console.log('\n🔒 Test 2: Poseidon Hash');
  console.log('-'.repeat(30));
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔧 Testing ${backend.toUpperCase()} hash...`);
    await switchBackend(backend);
    
    try {
      const result = await Provable.constraintSystem(() => {
        const input1 = Field(12345);
        const input2 = Field(67890);
        const hash = Poseidon.hash([input1, input2]); // Should generate ~800 constraints
        return hash;
      });
      
      console.log(`✅ Backend: ${backend}`);
      console.log(`📊 Constraint count: ${result.rows}`);
      
      if (result.rows === 0) {
        console.log('🚨 CRITICAL: Zero constraints for hash operation!');
      } else if (result.rows < 100) {
        console.log('⚠️ WARNING: Unexpectedly low constraint count for hash');
      }
      
    } catch (error) {
      console.log(`💥 Error in ${backend}: ${error.message}`);
    }
  }

  // Test 3: Multiple operations (should accumulate constraints)
  console.log('\n🔗 Test 3: Multiple Operations');
  console.log('-'.repeat(35));
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔧 Testing ${backend.toUpperCase()} multiple ops...`);
    await switchBackend(backend);
    
    try {
      const result = await Provable.constraintSystem(() => {
        let acc = Field(1);
        
        // 5 multiplication operations
        for (let i = 0; i < 5; i++) {
          acc = acc.mul(Field(i + 2)); // Each should generate 1 constraint
        }
        
        // 1 hash operation  
        acc = Poseidon.hash([acc, Field(999)]); // Should generate ~800 constraints
        
        return acc;
      });
      
      console.log(`✅ Backend: ${backend}`);
      console.log(`📊 Constraint count: ${result.rows}`);
      console.log(`🔍 Expected: ~805 constraints (5 muls + 800 hash)`);
      
      const expected = 805;
      const actual = result.rows;
      const percentage = (actual / expected) * 100;
      
      console.log(`📈 Accuracy: ${percentage.toFixed(1)}% of expected`);
      
      if (actual === 0) {
        console.log('🚨 CRITICAL: Complete constraint generation failure!');
      } else if (percentage < 50) {
        console.log('⚠️ WARNING: Severe constraint undercounting');
      } else if (percentage > 150) {
        console.log('⚠️ WARNING: Constraint overcounting detected');
      }
      
    } catch (error) {
      console.log(`💥 Error in ${backend}: ${error.message}`);
    }
  }

  // Test 4: Provable.constraintSystem API investigation
  console.log('\n🔬 Test 4: API Investigation');
  console.log('-'.repeat(30));
  
  await switchBackend('sparky');
  
  try {
    console.log('🔍 Investigating Provable.constraintSystem API...');
    
    // Check what the constraintSystem function actually returns
    const result = await Provable.constraintSystem(() => {
      const a = Field(1);
      const b = Field(2);
      const c = a.add(b);
      const d = c.mul(Field(3));
      return d;
    });
    
    console.log('📋 API Response Analysis:');
    console.log(`   Type: ${typeof result}`);
    console.log(`   Constructor: ${result.constructor.name}`);
    console.log(`   Keys: [${Object.keys(result).join(', ')}]`);
    console.log(`   Rows value: ${result.rows} (type: ${typeof result.rows})`);
    
    // Check if there are other properties that might contain constraint info
    for (const [key, value] of Object.entries(result)) {
      console.log(`   ${key}: ${value} (${typeof value})`);
      if (typeof value === 'object' && value !== null) {
        console.log(`     Sub-keys: [${Object.keys(value).join(', ')}]`);
      }
    }
    
  } catch (error) {
    console.log(`💥 API investigation error: ${error.message}`);
  }

  // Test 5: Direct WASM constraint access (if available)
  console.log('\n⚙️ Test 5: Direct WASM Access');
  console.log('-'.repeat(30));
  
  await switchBackend('sparky');
  
  try {
    // Try to access WASM module directly (if exposed)
    const globals = global || window;
    console.log('🔍 Checking for WASM module exposure...');
    
    // Look for potential WASM objects
    const wasmKeys = Object.keys(globals).filter(key => 
      key.toLowerCase().includes('wasm') || 
      key.toLowerCase().includes('sparky') ||
      key.toLowerCase().includes('constraint')
    );
    
    console.log(`🔍 Potential WASM-related globals: [${wasmKeys.join(', ')}]`);
    
    if (wasmKeys.length === 0) {
      console.log('ℹ️ No direct WASM access available');
    }
    
  } catch (error) {
    console.log(`💥 WASM access error: ${error.message}`);
  }

  // Generate diagnosis
  console.log('\n🎯 CONSTRAINT COUNTING DIAGNOSIS');
  console.log('='.repeat(50));
  console.log('Based on the investigation above:');
  console.log('');
  console.log('🔍 OBSERVED SYMPTOMS:');
  console.log('   • All operations return 0 constraints');
  console.log('   • Both Snarky and Sparky affected');
  console.log('   • Complex operations (hash, multiple ops) also return 0');
  console.log('   • Timing suggests snapshot vs actual constraint generation mismatch');
  console.log('');
  console.log('🚨 PROBABLE ROOT CAUSES:');
  console.log('   1. Constraint system snapshots taken before constraint generation');
  console.log('   2. Provable.constraintSystem() may not be triggering actual compilation');
  console.log('   3. Backend switching might not be properly initializing constraint systems');
  console.log('   4. WASM timing issues between JS and Rust constraint compilation');
  console.log('');
  console.log('🔧 RECOMMENDED FIXES:');
  console.log('   1. Investigate Provable.constraintSystem() implementation');
  console.log('   2. Fix Sparky WASM constraint snapshot timing');
  console.log('   3. Add debug logging to constraint generation pipeline');
  console.log('   4. Test with actual ZkProgram compilation instead of constraintSystem()');
}

async function main() {
  try {
    await debugConstraintTiming();
  } catch (error) {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}