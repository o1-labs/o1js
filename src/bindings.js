import './bindings/crypto/bindings.js';
import { wasm, withThreadPool } from './bindings/js/node/node-backend.js';

let Snarky, Ledger, Pickles, Test_;
let isInitialized = false;
let initializingPromise;
let activeBackend = 'snarky'; // Track active backend

async function initializeBindings(backend = null) {
  // Use current backend if already initialized and no backend specified
  if (!backend && isInitialized) {
    backend = activeBackend;
  }
  // Otherwise use environment variable or default
  if (!backend) {
    backend = process.env.O1JS_BACKEND?.toLowerCase() || 'snarky';
  }
  
  // Return early if already initialized with same backend
  if (isInitialized && activeBackend === backend) return;
  
  // Reset if switching backends
  if (activeBackend !== backend && isInitialized) {
    console.log(`Switching backend from ${activeBackend} to ${backend}`);
    isInitialized = false;
    initializingPromise = undefined;
  }
  
  if (initializingPromise) {
    await initializingPromise;
    return;
  }
  
  let resolve;
  initializingPromise = new Promise((r) => (resolve = r));
  
  try {
    if (backend === 'sparky') {
      // Load Sparky adapter that implements Snarky interface
      console.log('Loading Sparky backend...');
      const sparkyAdapter = await import('./bindings/sparky-adapter.js');
      
      // Initialize Sparky WASM
      await sparkyAdapter.initializeSparky();
      
      ({ Snarky, Ledger, Pickles, Test: Test_ } = sparkyAdapter);
      console.log('✓ Sparky backend loaded');
    } else {
      // Load OCaml Snarky (default)
      console.log('Loading Snarky backend...');
      let snarky;
      
      // this dynamic import makes jest respect the import order
      // otherwise the cjs file gets imported before its implicit esm dependencies and fails
      CJS: if (typeof require !== 'undefined') {
        snarky = require('./bindings/compiled/_node_bindings/o1js_node.bc.cjs');
      }
      ESM: snarky = (await import('./bindings/compiled/_node_bindings/o1js_node.bc.cjs')).default;
      ({ Snarky, Ledger, Pickles, Test: Test_ } = snarky);
      console.log('✓ Snarky backend loaded');
    }
    
    activeBackend = backend;
    resolve();
    initializingPromise = undefined;
    isInitialized = true;
  } catch (error) {
    console.error(`Failed to initialize ${backend} backend:`, error);
    resolve(); // Resolve to prevent hanging
    throw error;
  }
}

async function Test() {
  await initializeBindings();
  return Test_;
}

// Backend switching API
export async function switchBackend(backend) {
  if (!['snarky', 'sparky'].includes(backend)) {
    throw new Error(`Unknown backend: ${backend}. Valid options are 'snarky' and 'sparky'.`);
  }
  
  await initializeBindings(backend);
}

export function getCurrentBackend() {
  return activeBackend;
}

export {
  Snarky,
  Ledger,
  Pickles,
  Test,
  withThreadPool,
  wasm,
  initializeBindings,
  isInitialized as areBindingsInitialized,
};