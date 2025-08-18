#!/usr/bin/env node

// Test script to check WASM memory access methods
import wasmModule from './src/bindings/compiled/_node_bindings/plonk_wasm.cjs';

console.log('WASM module loaded:', wasmModule !== undefined);
console.log('Available functions:');
const funcs = Object.keys(wasmModule).filter(k => typeof wasmModule[k] === 'function');
console.log(funcs.filter(f => f.includes('memory') || f.includes('Memory')).join('\n'));

// Try to get memory size
if (typeof wasmModule.get_memory_byte_length === 'function') {
  try {
    const bytes = wasmModule.get_memory_byte_length();
    console.log(`\nWASM memory size: ${bytes} bytes (${Math.round(bytes / 1024 / 1024)} MB)`);
  } catch (e) {
    console.error('Error getting memory size:', e.message);
  }
} else {
  console.log('\nget_memory_byte_length function not found');
}

// Check for get_memory function
if (typeof wasmModule.get_memory === 'function') {
  try {
    const memory = wasmModule.get_memory();
    console.log('\nget_memory() returned:', memory);
    if (memory && memory.buffer) {
      console.log(`Memory buffer size: ${memory.buffer.byteLength} bytes (${Math.round(memory.buffer.byteLength / 1024 / 1024)} MB)`);
    }
  } catch (e) {
    console.error('Error calling get_memory:', e.message);
  }
}