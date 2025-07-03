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
      
      // CRITICAL: First load OCaml bindings to ensure ocamlBackendBridge is set up
      // This is needed because Sparky field operations route through OCaml
      let snarkyOcaml;
      CJS: if (typeof require !== 'undefined') {
        snarkyOcaml = require('./bindings/compiled/_node_bindings/o1js_node.bc.cjs');
      }
      ESM: snarkyOcaml = (await import('./bindings/compiled/_node_bindings/o1js_node.bc.cjs')).default;
      
      // The OCaml module initialization sets up globalThis.ocamlBackendBridge
      console.log('OCaml backend bridge initialized:', !!globalThis.ocamlBackendBridge);
      
      const sparkyAdapter = await import('./bindings/sparky-adapter.js');
      
      // Initialize Sparky WASM
      await sparkyAdapter.initializeSparky();
      
      // Reset Sparky state to ensure clean start
      if (sparkyAdapter.resetSparkyState) {
        sparkyAdapter.resetSparkyState();
      }
      
      // ROUTING FIX: Update global constraint routing to Sparky
      if (sparkyAdapter.activateSparkyRouting) {
        sparkyAdapter.activateSparkyRouting();
      }
      
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
      
      // ROUTING FIX: Update global constraint routing to OCaml Snarky
      if (activeBackend === 'sparky') {
        // We're switching FROM Sparky TO Snarky, need to update routing
        const sparkyAdapter = await import('./bindings/sparky-adapter.js');
        if (sparkyAdapter.activateOcamlRouting) {
          sparkyAdapter.activateOcamlRouting(snarky.Snarky);
        }
        // Reset Sparky state
        if (sparkyAdapter.resetSparkyBackend) {
          sparkyAdapter.resetSparkyBackend();
        }
      }
      
      ({ Snarky, Ledger, Pickles, Test: Test_ } = snarky);
      console.log('✓ Snarky backend loaded');
    }
    
    activeBackend = backend;
    resolve();
    initializingPromise = undefined;
    isInitialized = true;
  } catch (error) {
    console.error(`Failed to initialize ${backend} backend:`, error);
    initializingPromise = undefined; // Reset promise state
    isInitialized = false; // Reset initialization state
    // Don't change activeBackend on failure - keep previous working backend
    throw error; // This will reject the promise properly
  }
}

async function getTestModule() {
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

// SMART PROXY SOLUTION: Create dynamic proxies that route to current backend
// This provides backward compatibility while enabling dynamic backend switching

function createBackendProxy(getBackend) {
  return new Proxy({}, {
    get(target, prop) {
      const currentBackend = getBackend();
      if (currentBackend && typeof currentBackend[prop] !== 'undefined') {
        const value = currentBackend[prop];
        return typeof value === 'function' ? value.bind(currentBackend) : value;
      }
      return undefined;
    },
    has(target, prop) {
      const currentBackend = getBackend();
      return currentBackend && prop in currentBackend;
    },
    ownKeys(target) {
      const currentBackend = getBackend();
      return currentBackend ? Object.keys(currentBackend) : [];
    }
  });
}

// Create a special proxy for Test that can be called as a function
function createTestProxy() {
  return new Proxy(function() {
    // When called as a function, return Test_ (to match OCaml API)
    return Test_;
  }, {
    get(target, prop) {
      if (Test_ && typeof Test_[prop] !== 'undefined') {
        const value = Test_[prop];
        return typeof value === 'function' ? value.bind(Test_) : value;
      }
      return undefined;
    },
    has(target, prop) {
      return Test_ && prop in Test_;
    },
    ownKeys(target) {
      return Test_ ? Object.keys(Test_) : [];
    }
  });
}

// DYNAMIC PROXY EXPORTS: These automatically route to the current backend
const SnarkyProxy = createBackendProxy(() => Snarky);
const LedgerProxy = createBackendProxy(() => Ledger);
const PicklesProxy = createBackendProxy(() => Pickles);
const TestProxy = createTestProxy();

// EXPORTS: Both static and dynamic versions
export { SnarkyProxy as Snarky };
export { LedgerProxy as Ledger };
export { PicklesProxy as Pickles };
export { TestProxy as Test };

// FUNCTION EXPORTS: These don't change between backends
export { withThreadPool, wasm, initializeBindings };
export { isInitialized as areBindingsInitialized };

// CONVENIENCE GETTERS: Alternative access methods
export function getSnarky() { return Snarky; }
export function getLedger() { return Ledger; }
export function getPickles() { return Pickles; }
export function getTest() { return Test; }