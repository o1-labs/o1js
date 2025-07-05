#!/usr/bin/env node

/**
 * Fix wasm-pack nodejs target issue
 * 
 * The nodejs target creates a CJS file that auto-instantiates the WASM with
 * imports['__wbindgen_placeholder__'], but the WASM expects imports from 'wbg'.
 * 
 * This script modifies the generated CJS file to:
 * 1. Remove the auto-instantiation
 * 2. Export a manual init function that properly maps the imports
 */

const fs = require('fs');
const path = require('path');

const cjsPath = process.argv[2];
if (!cjsPath) {
  console.error('Usage: node fix-sparky-nodejs-wasm.js <path-to-sparky_wasm.cjs>');
  process.exit(1);
}

console.log(`Fixing ${cjsPath}...`);

let content = fs.readFileSync(cjsPath, 'utf8');

// Find the auto-instantiation section at the end
const autoInstantiatePattern = /const path = require\('path'\)[\s\S]*?wasm\.__wbindgen_start\(\);?$/m;

if (!autoInstantiatePattern.test(content)) {
  console.log('No auto-instantiation found, file may already be fixed');
  process.exit(0);
}

// Replace the auto-instantiation with a manual init function
const replacement = `
// Manual initialization function to handle import mapping
module.exports.__wbindgen_init = function() {
  if (wasm) return; // Already initialized
  
  const path = require('path').join(__dirname, 'sparky_wasm_bg.wasm');
  const bytes = require('fs').readFileSync(path);
  
  // Create patched imports mapping 'wbg' to our exports
  const patchedImports = { wbg: {} };
  
  // Copy all __wbg_ and __wbindgen_ exports to the wbg module
  for (const [key, value] of Object.entries(module.exports)) {
    if (key.startsWith('__wbg_') || key.startsWith('__wbindgen_')) {
      patchedImports.wbg[key] = value;
    }
  }
  
  const wasmModule = new WebAssembly.Module(bytes);
  const wasmInstance = new WebAssembly.Instance(wasmModule, patchedImports);
  wasm = wasmInstance.exports;
  module.exports.__wasm = wasm;
  
  if (wasm.__wbindgen_start) {
    wasm.__wbindgen_start();
  }
};

// Auto-initialize for backward compatibility
module.exports.__wbindgen_init();`;

content = content.replace(autoInstantiatePattern, replacement);

// Write the fixed file
fs.writeFileSync(cjsPath, content);
console.log('Fixed!');