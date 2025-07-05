#!/usr/bin/env node

/**
 * Fix wasm-bindgen Generated Code
 * 
 * This script automatically fixes known issues in the generated JavaScript:
 * 1. Getter functions calling wrong WASM functions
 * 2. Missing __wrap methods in generated classes
 * 3. Incorrect return value handling
 */

const fs = require('fs');
const path = require('path');

const WASM_FILE = './src/bindings/compiled/_node_bindings/sparky_wasm.js';
const BACKUP_FILE = './src/bindings/compiled/_node_bindings/sparky_wasm.js.backup';

function fixWasmBindings() {
  console.log('🔧 Fixing wasm-bindgen generated code...');
  
  if (!fs.existsSync(WASM_FILE)) {
    console.error('❌ WASM file not found:', WASM_FILE);
    return;
  }
  
  // Create backup
  fs.copyFileSync(WASM_FILE, BACKUP_FILE);
  console.log('📦 Created backup:', BACKUP_FILE);
  
  let content = fs.readFileSync(WASM_FILE, 'utf8');
  
  // Fix 1: run() getter calling wrong WASM function
  content = content.replace(
    /get run\(\) \{\s*const ret = wasm\.snarky_field\(this\.__wbg_ptr\);/g,
    'get run() {\n        const ret = wasm.snarky_run(this.__wbg_ptr);'
  );
  
  // Fix 2: gates() getter using wrong wrapper
  content = content.replace(
    /get gates\(\) \{\s*const ret = wasm\.snarky_gates\(this\.__wbg_ptr\);\s*return takeObject\(ret\);/g,
    'get gates() {\n        const ret = wasm.snarky_gates(this.__wbg_ptr);\n        return SnarkyGatesCompat.__wrap(ret);'
  );
  
  // Fix 3: Add missing SnarkyGatesCompat.__wrap method
  if (!content.includes('SnarkyGatesCompat.__wrap')) {
    content = content.replace(
      /export class SnarkyGatesCompat \{\n\n    __destroy_into_raw\(\)/,
      `export class SnarkyGatesCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyGatesCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyGatesCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw()`
    );
  }
  
  fs.writeFileSync(WASM_FILE, content);
  console.log('✅ Fixed wasm-bindgen issues');
  console.log('🔍 Applied fixes:');
  console.log('  - Fixed run() getter WASM function call');
  console.log('  - Fixed gates() getter return value wrapper');
  console.log('  - Added missing SnarkyGatesCompat.__wrap method');
}

// Run if called directly
if (require.main === module) {
  fixWasmBindings();
}

module.exports = { fixWasmBindings };