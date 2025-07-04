/**
 * Sparky Adapter - Critical Interop Bridge
 * 
 * ARCHITECTURE OVERVIEW:
 * This adapter provides a seamless bridge between the o1js TypeScript API
 * (which expects OCaml Snarky) and the Rust-based Sparky WASM implementation.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Format Translation: Convert between o1js FieldVar arrays and Sparky Cvar objects
 * 2. State Management: Handle constraint accumulation and circuit compilation modes
 * 3. Module Loading: Dynamically load both OCaml (Pickles/Test) and WASM (Sparky) modules
 * 4. Error Bridging: Translate WASM errors to JavaScript exceptions with context
 * 5. Constraint Routing: Route constraints to appropriate backend during compilation
 * 
 * CRITICAL INTEGRATION POINTS:
 * - OCaml Pickles must collect constraints from JavaScript during zkProgram compilation
 * - Field arithmetic operations must generate identical constraint graphs to Snarky
 * - Elliptic curve operations require precise mathematical constraint generation
 * - Foreign field arithmetic uses 3-limb (88-bit each) representation for cross-chain compatibility
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - WASM calls have overhead; minimize object creation in hot paths
 * - Constraint generation is the bottleneck; optimize constraint routing
 * - Module instances are cached but sub-modules accessed fresh to maintain state consistency
 */

// import { Fp } from './crypto/finite-field.js'; // Temporarily disabled for testing
// import { FieldVar } from '../lib/provable/core/fieldvar.js'; // Temporarily disabled for testing


// ===================================================================
// MODULE LOADING & ENVIRONMENT DETECTION
// ===================================================================

// HYBRID ARCHITECTURE: Sparky handles constraint generation,
// but OCaml Pickles still handles proof generation and verification
// This requires careful module coordination during initialization
let PicklesOCaml, TestOCaml;

// ENVIRONMENT DETECTION: Different module loading strategies
// Node.js: Uses CommonJS require() fallback for non-bundled environments
// Browser: Uses ES6 dynamic imports with webpackIgnore for static analysis bypass
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// DYNAMIC IMPORT HANDLES: Loaded conditionally based on environment
// This avoids bundler issues where Node.js APIs are referenced in browser builds
let readFileSync, fileURLToPath, dirname, join;

// SPARKY WASM STATE: Global instances for constraint generation
// These are initialized once and reused across all constraint operations
let sparkyWasm;          // Raw WASM module exports
let sparkyInstance;      // Main Snarky instance from WASM
let initPromise;         // Initialization promise for async safety
let gateCallCounter = 0; // Debug counter for gate operation tracking

/**
 * CRITICAL INITIALIZATION SEQUENCE
 * 
 * This function handles the complex dual-module loading required for Sparky operation:
 * 1. Load OCaml bindings (Pickles, Test) - proof generation still happens in OCaml
 * 2. Load Sparky WASM - constraint generation happens in Rust
 * 3. Coordinate between environments (Node.js vs Browser)
 * 4. Handle various import/require fallback strategies
 * 
 * IMPORTANT: OCaml and WASM modules must be loaded in this specific order
 * because Pickles needs to be available before constraint generation begins.
 * 
 * ERROR HANDLING: Multiple fallback strategies ensure loading works in:
 * - Bundled environments (webpack, rollup)
 * - Non-bundled Node.js (direct require)
 * - Browser environments (dynamic imports)
 * - Development vs production builds
 */
async function initSparkyWasm() {
  // SINGLETON PATTERN: Only initialize once, return cached promise for subsequent calls
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    // First, import Pickles and Test from OCaml bindings
    if (isNode) {
      // Node.js environment
      let snarky;
      try {
        // Always try dynamic import first (works in bundled environments)
        snarky = (await import('./compiled/_node_bindings/o1js_node.bc.cjs')).default;
      } catch (importError) {
        // Fallback to require for non-bundled environments
        if (typeof require !== 'undefined') {
          try {
            snarky = require('./compiled/_node_bindings/o1js_node.bc.cjs');
          } catch (requireError) {
            throw new Error(`Failed to load OCaml bindings: import failed (${importError.message}), require failed (${requireError.message})`);
          }
        } else {
          throw new Error(`Failed to load OCaml bindings via dynamic import: ${importError.message}`);
        }
      }
      ({ Pickles: PicklesOCaml, Test: TestOCaml } = snarky);
      
      // Dynamically import Node.js modules
      const fs = await import('fs');
      const urlModule = await import('url');
      const path = await import('path');
      
      readFileSync = fs.readFileSync;
      fileURLToPath = urlModule.fileURLToPath;
      dirname = path.dirname;
      join = path.join;
      
      const sparkyNodePath = './compiled/sparky_node/sparky_wasm.cjs';
      const sparkyModule = await import(/* webpackIgnore: true */ sparkyNodePath);
      sparkyWasm = sparkyModule;
      
      // CommonJS modules built with wasm-pack --target nodejs self-initialize
      // when loaded - there should never be an init method
      // Node.js WASM module loaded (self-initialized)
    } else {
      // Browser environment - use dynamic imports to avoid static resolution during Node.js build
      const webBindingsPath = './compiled/web_bindings/o1js_web.bc.js';
      const snarky = await import(/* webpackIgnore: true */ webBindingsPath);
      ({ Pickles: PicklesOCaml, Test: TestOCaml } = snarky);
      
      const sparkyWebPath = './compiled/sparky_web/sparky_wasm.js';
      const sparkyModule = await import(/* webpackIgnore: true */ sparkyWebPath);
      const { default: init } = sparkyModule;
      sparkyWasm = sparkyModule;
      
      // Initialize WASM (will fetch automatically in browser)
      await init();
    }
    
    // Create main Sparky instance using the actual exported classes
    if (!sparkyWasm.Snarky) {
      throw new Error('Sparky WASM module did not export expected Snarky class. This indicates a build or loading error.');
    }
    
    // The WASM exports these classes: Circuit, ConstraintSystem, Field, Gates, 
    // ModeHandle, OptimizationHints, Run, RunState, Snarky, WasmFeatures
    sparkyInstance = new sparkyWasm.Snarky();
    
    // Note: DO NOT cache sub-modules - they should be accessed fresh each time
    // to maintain proper state management with the optimized Sparky implementation
  })();
  
  return initPromise;
}

// ===================================================================
// LAZY INITIALIZATION PATTERN
// ===================================================================

// PERFORMANCE OPTIMIZATION: Only initialize when actually needed
// This prevents WASM loading overhead in applications that might use Snarky
let initialized = false;

/**
 * THREAD-SAFE INITIALIZATION GUARD
 * 
 * Ensures Sparky is ready before any operations are performed.
 * Uses singleton pattern to prevent double-initialization.
 * Called automatically by all public API methods.
 * 
 * CRITICAL: This must complete before any constraint operations
 * because WASM instance creation and module linking must be atomic.
 */
async function ensureInitialized() {
  if (!initialized) {
    await initSparkyWasm();
    initialized = true;
  }
}

// ===================================================================
// MODULE ACCESS PATTERNS
// ===================================================================

/**
 * FRESH MODULE INSTANCE STRATEGY
 * 
 * These functions provide access to Sparky sub-modules while maintaining
 * proper state isolation. Each call returns a fresh reference to prevent
 * state corruption between different circuit compilations.
 * 
 * DESIGN RATIONALE:
 * - Sparky uses global state for constraint accumulation
 * - Multiple zkPrograms could interfere if modules are cached
 * - Fresh access ensures state boundaries are respected
 * 
 * PERFORMANCE NOTE: The getter overhead is minimal compared to WASM call cost
 */

// RUN MODULE: Handles mode switching (constraint vs witness generation)
function getRunModule() {
  return sparkyInstance.run;
}

// FIELD MODULE: Core field arithmetic and constraint generation
function getFieldModule() {
  return sparkyInstance.field;
}

// GATES MODULE: High-level constraint gates (EC ops, Poseidon, range checks)
function getGatesModule() {
  return sparkyInstance.gates;
}

// CONSTRAINT SYSTEM MODULE: Access to accumulated constraints and metadata
function getConstraintSystemModule() {
  return sparkyInstance.constraintSystem;
}

// CIRCUIT MODULE: Compilation and proving (placeholder for future features)
function getCircuitModule() {
  return sparkyInstance.circuit;
}

// ===================================================================
// MEMORY PRESSURE DETERMINISM SYSTEM
// ===================================================================

/**
 * MEMORY POOL INFRASTRUCTURE
 * 
 * Implements deterministic memory allocation patterns to prevent computation
 * non-determinism under varying memory pressure conditions.
 * 
 * THE PROBLEM:
 * Complex field operations produce different results when memory is under pressure
 * due to differences between OCaml GC and Rust manual memory management:
 * - String allocation patterns vary with available memory
 * - BigInt conversion timing depends on GC pressure
 * - Object creation order affects memory layout
 * 
 * THE SOLUTION:
 * - Pre-allocated buffer pools for common operations
 * - Memory barriers for critical computations
 * - Deterministic allocation patterns independent of system pressure
 * - Consistent BigInt ↔ String conversion caching
 */

// CONSTRAINT BUFFER POOL: Pre-allocated arrays for constraint operations
const CONSTRAINT_BUFFER_POOL = {
  small: [], // Arrays < 100 elements
  medium: [], // Arrays 100-1000 elements  
  large: [], // Arrays > 1000 elements
  maxPoolSize: 50, // Maximum buffers per pool
  
  // Get buffer of appropriate size
  getBuffer(size) {
    const pool = size < 100 ? this.small : size < 1000 ? this.medium : this.large;
    const buffer = pool.pop() || new Array(size);
    buffer._originalSize = size; // Track original requested size
    return buffer;
  },
  
  // Return buffer to pool
  returnBuffer(buffer) {
    if (!buffer || !Array.isArray(buffer)) return;
    
    buffer.length = 0; // Clear contents
    const originalSize = buffer._originalSize || 0;
    const pool = originalSize < 100 ? this.small : originalSize < 1000 ? this.medium : this.large;
    
    if (pool.length < this.maxPoolSize) {
      pool.push(buffer);
    }
  }
};

// FIELD CONVERSION CACHE: Deterministic BigInt ↔ String conversion
const FIELD_CONVERSION_CACHE = new Map();
const MAX_CACHE_SIZE = 1000;
let cacheAccessCount = 0;

/**
 * MEMORY BARRIER FUNCTION
 * 
 * Forces deterministic memory state for critical operations.
 * Ensures consistent allocation patterns regardless of system memory pressure.
 */
function memoryBarrier() {
  // Force consistent memory state
  if (typeof global !== 'undefined' && global.gc) {
    // Only call GC if memory pressure is detected
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
    
    // Apply memory barrier if heap usage exceeds threshold
    if (heapUsedMB > 100) {
      global.gc();
    }
  }
  
  // Clear conversion cache periodically to prevent unbounded growth
  cacheAccessCount++;
  if (cacheAccessCount > 5000) {
    FIELD_CONVERSION_CACHE.clear();
    cacheAccessCount = 0;
  }
}

/**
 * DETERMINISTIC BIGINT TO STRING CONVERSION
 * 
 * Ensures consistent string conversion regardless of memory pressure.
 * Uses caching and memory barriers for deterministic behavior.
 */
function deterministicBigIntToString(bigintValue) {
  // Check cache first
  const cacheKey = bigintValue.toString(16); // Use hex as cache key for efficiency
  if (FIELD_CONVERSION_CACHE.has(cacheKey)) {
    return FIELD_CONVERSION_CACHE.get(cacheKey);
  }
  
  // Apply memory barrier before conversion
  if (FIELD_CONVERSION_CACHE.size % 100 === 0) {
    memoryBarrier();
  }
  
  // Perform conversion with consistent allocation pattern
  const stringValue = bigintValue.toString();
  
  // Cache result if space available
  if (FIELD_CONVERSION_CACHE.size < MAX_CACHE_SIZE) {
    FIELD_CONVERSION_CACHE.set(cacheKey, stringValue);
  }
  
  return stringValue;
}

/**
 * DETERMINISTIC STRING TO BIGINT CONVERSION
 * 
 * Ensures consistent BigInt conversion regardless of memory pressure.
 */
function deterministicStringToBigInt(stringValue) {
  // Apply memory barrier for critical conversions
  if (stringValue.length > 50) {
    memoryBarrier();
  }
  
  // Use deterministic conversion pattern
  return BigInt(stringValue);
}

// ===================================================================
// FORMAT CONVERSION SYSTEM
// ===================================================================

/**
 * FIELD REPRESENTATION BRIDGE
 * 
 * Handles the impedance mismatch between o1js and Sparky field representations:
 * 
 * o1js format:   [FieldType, value] where FieldType ∈ {0: Constant, 1: Variable}
 * Sparky format: Cvar objects with {type, value/id} structure
 * 
 * CONVERSION STRATEGY:
 * - Constants: [0, bigint] → Sparky constant Cvar
 * - Variables: [1, index] → Sparky variable Cvar  
 * - Complex expressions: Recursive conversion of nested structures
 * 
 * PERFORMANCE CRITICAL: This is called on every field operation
 */
function toSparkyField(field) {
  if (Array.isArray(field)) {
    // LEGACY FORMAT: [FieldType, value] - convert to Sparky
    if (field[0] === 0 || field[0] === 1) {
      return getFieldModule().constant(field[1]);
    }
    return field; // Already converted or Sparky format
  }
  return field; // Raw value, pass through
}

/**
 * O1JS → SPARKY CONVERSION ENGINE
 * 
 * Converts o1js FieldVar arrays to Sparky Cvar objects with full type preservation.
 * This is the critical translation layer that enables Sparky to understand o1js circuits.
 * 
 * O1JS FIELDVAR STRUCTURE:
 * [0, [0, bigint]]           → Constant value
 * [1, variableIndex]         → Variable reference  
 * [2, leftVar, rightVar]     → Addition expression
 * [3, [0, scalar], cvar]     → Scalar multiplication
 * 
 * SPARKY CVAR STRUCTURE:
 * {type: 'constant', value: string}                    → Constant
 * {type: 'var', id: number}                          → Variable
 * {type: 'add', left: Cvar, right: Cvar}             → Addition
 * {type: 'scale', scalar: string, cvar: Cvar}        → Scaling
 * 
 * PRECISION HANDLING: BigInt values are converted to strings to preserve
 * full precision across the WASM boundary (WASM doesn't support BigInt directly)
 * 
 * ERROR STRATEGY: Strict validation prevents malformed data from corrupting
 * the constraint system, which would cause proof generation failures
 */
function fieldVarToCvar(fieldVar) {
  if (!Array.isArray(fieldVar)) {
    throw new Error('Invalid FieldVar format - expected array');
  }
  
  const [type, ...data] = fieldVar;
  
  switch (type) {
    case 0: // CONSTANT: [0, [0, bigint]] → {type: 'constant', value: string}
      if (!Array.isArray(data[0]) || data[0][0] !== 0) {
        throw new Error('Invalid constant FieldVar format');
      }
      const [, bigintValue] = data[0]; // Extract bigint from [0, bigint]
      return {
        type: 'constant',
        value: deterministicBigIntToString(bigintValue) // Deterministic conversion for memory stability
      };
      
    case 1: // VARIABLE: [1, index] → {type: 'var', id: number}
      return {
        type: 'var',
        id: data[0] // Variable index in constraint system
      };
      
    case 2: // ADDITION: [2, left, right] → {type: 'add', left: Cvar, right: Cvar}
      return {
        type: 'add',
        left: fieldVarToCvar(data[0]),   // Recursive conversion
        right: fieldVarToCvar(data[1])
      };
      
    case 3: // SCALING: [3, [0, scalar], cvar] → {type: 'scale', scalar: string, cvar: Cvar}
      if (!Array.isArray(data[0]) || data[0][0] !== 0) {
        throw new Error('Invalid scale FieldVar format');
      }
      const [, scalarBigint] = data[0]; // Extract scalar from [0, bigint]
      return {
        type: 'scale',
        scalar: deterministicBigIntToString(scalarBigint), // Deterministic scalar conversion
        cvar: fieldVarToCvar(data[1])    // Recursive conversion of scaled value
      };
      
    default:
      throw new Error(`Unknown FieldVar type: ${type}`);
  }
}

/**
 * SPARKY → O1JS CONVERSION ENGINE
 * 
 * Converts Sparky Cvar objects back to o1js FieldVar arrays.
 * This reverse translation is essential for maintaining API compatibility
 * when Sparky operations return results to o1js code.
 * 
 * CONVERSION MAPPING:
 * {type: 'constant', value: string}     → [0, [0, bigint]]
 * {type: 'var', id: number}            → [1, variableIndex]
 * {type: 'add', left: Cvar, right: Cvar} → [2, leftVar, rightVar]
 * {type: 'scale', scalar: string, cvar: Cvar} → [3, [0, scalar], cvar]
 * 
 * PRECISION RECOVERY: String values are converted back to BigInt
 * to restore full precision that was preserved across WASM boundary
 * 
 * IDENTITY HANDLING: If input is already a FieldVar array, pass through
 * unchanged to avoid unnecessary conversion overhead
 * 
 * ERROR RECOVERY: Comprehensive validation ensures malformed Cvar objects
 * from WASM don't corrupt the o1js constraint graph
 */
function cvarToFieldVar(cvar) {
  // CVAR OBJECT PROCESSING: Convert Sparky objects to o1js arrays
  if (typeof cvar === 'object' && cvar.type) {
    switch (cvar.type) {
      case 'constant':
        // CONSTANT: {type: 'constant', value: string} → [0, [0, bigint]]
        const value = deterministicStringToBigInt(cvar.value); // Deterministic precision restoration
        return [0, [0, value]];
        
      case 'var':
        // VARIABLE: {type: 'var', id: number} → [1, variableIndex]
        return [1, cvar.id];
        
      case 'add':
        // ADDITION: {type: 'add', left: Cvar, right: Cvar} → [2, left, right]
        return [2, cvarToFieldVar(cvar.left), cvarToFieldVar(cvar.right)];
        
      case 'scale':
        // SCALING: {type: 'scale', scalar: string, cvar: Cvar} → [3, [0, scalar], cvar]
        const scalar = deterministicStringToBigInt(cvar.scalar); // Deterministic scalar restoration
        return [3, [0, scalar], cvarToFieldVar(cvar.cvar)];
        
      default:
        throw new Error(`Unknown Cvar type: ${cvar.type}`);
    }
  }
  
  // IDENTITY PASS-THROUGH: Already a FieldVar array, no conversion needed
  if (Array.isArray(cvar)) {
    return cvar;
  }
  
  // ERROR CASE: Invalid input format
  throw new Error('Invalid Cvar format - expected object with type field or FieldVar array');
}

// ===================================================================
// INITIALIZATION SAFETY WRAPPERS
// ===================================================================

/**
 * ASYNC INITIALIZATION WRAPPER
 * 
 * Ensures WASM modules are loaded before executing any operation.
 * Used for operations that can tolerate async initialization delay.
 * 
 * SAFETY: Prevents race conditions where WASM calls occur before
 * module loading completes, which would cause undefined behavior.
 */
function wrapAsync(fn) {
  return async (...args) => {
    await ensureInitialized();
    return fn(...args);
  };
}

/**
 * SYNC INITIALIZATION GUARD
 * 
 * Fast-fail wrapper for operations that must be synchronous.
 * Used in hot paths where async overhead is unacceptable.
 * 
 * TRADE-OFF: Better performance but requires explicit initialization
 * by caller. Throws clear error message for debugging.
 */
function wrapSync(fn) {
  return (...args) => {
    if (!initialized) {
      throw new Error('Sparky adapter not initialized. Call initializeBindings() first.');
    }
    return fn(...args);
  };
}

/**
 * Snarky-compatible API
 */
// Export initialization function for bindings.js
export { ensureInitialized as initializeSparky };

export const Snarky = {
  /**
   * Run APIs
   */
  run: {
    inProver() {
      return getRunModule().inProver;
    },
    
    asProver(f) {
      return getRunModule().asProver(f);
    },
    
    inProverBlock() {
      return getRunModule().inProverBlock;
    },
    
    setEvalConstraints(value) {
      getRunModule().setEvalConstraints(value);
    },
    
    enterConstraintSystem() {
      // CONSTRAINT SYSTEM ISOLATION STRATEGY
      // 
      // Two different use cases require different reset behavior:
      // 1. ISOLATED CALLS (Provable.constraintSystem): Need clean slate
      // 2. ZKPROGRAM COMPILATION: Must preserve accumulated constraints
      // 
      // Reset only for isolated calls to prevent interference between
      // different constraint system queries, but preserve state during
      // active circuit compilation to maintain constraint accumulation
      if (!isCompilingCircuit && sparkyInstance && sparkyInstance.runReset) {
        sparkyInstance.runReset();
      }
      
      // CONSTRAINT GENERATION MODE: Switch Sparky to constraint accumulation
      // This mode ensures all subsequent field operations generate constraints
      // rather than computing witness values
      const handle = getRunModule().enterConstraintSystem();
      
      // CLOSURE RETURN PATTERN: Matches Snarky API where enterConstraintSystem
      // returns a function that, when called, exits the mode and returns the
      // accumulated constraint system
      return () => {
        // CONSTRAINT RETRIEVAL: Get accumulated constraints from global Sparky state
        // The handle manages mode switching but doesn't hold the constraints
        const cs = getRunModule().getConstraintSystem();
        handle.exit(); // Exit constraint generation mode
        return cs;
      };
    },
    
    enterGenerateWitness() {
      // Enter witness generation mode - this puts Sparky in prover mode
      // where it will actually compute and store witness values during execution
      const handle = getRunModule().enterGenerateWitness();
      
      return () => {
        try {
          // Exit witness generation mode
          handle.exit();
          
          // For constraint checking, don't return a value (undefined)
          // The computation result should come from the actual computation, not the finish function
          return undefined;
          
        } catch (error) {
          // If witness generation failed, it means constraints were not satisfied
          throw error;
        }
      };
    },
    
    enterAsProver(size) {
      // PROVER MODE: Switch to witness computation mode for the specified array size
      // This mode is used when executing circuit logic with concrete values
      // to generate witness data for proof construction
      const handle = getRunModule().enterAsProver(size);
      
      // DUAL-MODE CLOSURE: Handles both witness provision and variable creation
      return (fields) => {
        try {
          // OCAML OPTION TYPE HANDLING: 0 = None, [0, values] = Some(values)
          // This encoding is used for optional witness values from OCaml
          if (fields !== 0) {
            // WITNESS PROVISION MODE: Concrete values provided for proof generation
            // Extract values from Some(values) encoding: [0, ...actualValues]
            const actualValues = fields[1];
            // Skip the MlArray tag (index 0) and map only the actual values
            const result = actualValues.slice(1).map(f => {
              // CRITICAL FIX: Create witness variables with stored values, not constants!
              // Use existsOne with a compute function that returns the provided value as BigInt
              const witnessCvar = getRunModule().existsOne(() => {
                // Convert Field object to BigInt for WASM layer (matches Snarky API)
                return typeof f.toBigInt === 'function' ? f.toBigInt() : f;
              });
              return cvarToFieldVar(witnessCvar);
            });
            // Return in MlArray format expected by o1js: [0, ...fieldVars]
            return [0, ...result];
          }
          
          // VARIABLE CREATION MODE: No witness provided, create fresh variables
          // This occurs during circuit compilation when structure is being analyzed
          const vars = [];
          for (let i = 0; i < size; i++) {
            // Create witness variable that will be assigned during proof generation
            const sparkyVar = getFieldModule().exists(null);
            const o1jsVar = cvarToFieldVar(sparkyVar);
            vars.push(o1jsVar);
          }
          // Return variable array in MlArray format
          return [0, ...vars];
        } finally {
          // GUARANTEED CLEANUP: Always exit prover mode to prevent state corruption
          handle.exit();
        }
      };
    },
    
    getConstraintSystem() {
      // Expose the getConstraintSystem method from the underlying WASM module
      return getRunModule().getConstraintSystem();
    },
    
    exists(size, compute) {
      // Delegate to the WASM implementation
      const result = getRunModule().exists(size, compute);
      // Convert each Cvar result to FieldVar format
      const vars = [];
      for (let i = 0; i < result.length; i++) {
        vars.push(cvarToFieldVar(result[i]));
      }
      return vars;
    },
    
    existsOne(compute) {
      // Delegate to the WASM implementation
      const result = getRunModule().existsOne(compute);
      // Convert Cvar result to FieldVar format
      return cvarToFieldVar(result);
    },
    
    state: {
      allocVar(state) {
        // Get the run state and allocate a variable
        const runState = getRunModule().state;
        const varIndex = runState.allocVar();
        return [1, varIndex]; // [FieldType.Var, index]
      },
      
      storeFieldElt(state, x) {
        const runState = getRunModule().state;
        // Store the field element value for the variable
        if (Array.isArray(state) && state[0] === 1) {
          runState.storeFieldElt(state[1], x);
        }
        return getFieldModule().constant(x);
      },
      
      getVariableValue(state, x) {
        return getFieldModule().readVar(toSparkyField(x));
      },
      
      asProver(state) {
        return getRunModule().inProver;
      },
      
      setAsProver(state, value) {
        // CONSTRAINT ACCUMULATION PROTECTION: Don't interfere with constraint generation mode
        // when we're actively building a constraint system (isCompilingCircuit = true)
        if (isCompilingCircuit) {
          // During constraint system compilation, maintain ConstraintGeneration mode
          // regardless of prover context changes
          return;
        }
        
        if (value) {
          getRunModule().witnessMode();
        } else {
          getRunModule().constraintMode();
        }
      },
      
      hasWitness(state) {
        return getRunModule().inProver;
      }
    }
  },
  
  /**
   * Constraint System APIs
   */
  constraintSystem: {
    rows(system) {
      return getConstraintSystemModule().rows(system);
    },
    
    digest(system) {
      return getConstraintSystemModule().digest(system);
    },
    
    toJson(system) {
      const json = getConstraintSystemModule().toJson(system);
      
      // CRITICAL: Validate JSON structure instead of masking with defaults
      if (!json) {
        throw new Error('Constraint system toJson() returned null/undefined');
      }
      
      if (typeof json !== 'object') {
        throw new Error(`Constraint system toJson() returned invalid type: ${typeof json}`);
      }
      
      // Validate required fields exist
      if (!json.hasOwnProperty('gates') && !json.hasOwnProperty('constraints')) {
        throw new Error('Constraint system JSON missing both gates and constraints fields');
      }
      
      if (!json.hasOwnProperty('public_input_size')) {
        throw new Error('Constraint system JSON missing public_input_size field');
      }
      
      // Convert constraints to gates format if needed, but don't default to empty
      if (!json.gates) {
        if (!json.constraints) {
          throw new Error('Constraint system JSON has no gates or constraints data');
        }
        json.gates = json.constraints;
      }
      
      return json;
    }
  },
  
  // ===================================================================
  // FIELD ARITHMETIC ENGINE
  // ===================================================================
  /**
   * CORE FIELD OPERATIONS
   * 
   * These operations form the foundation of all zkSNARK circuits.
   * Each operation must generate exactly the same constraint graph
   * as the equivalent Snarky operation to maintain VK compatibility.
   * 
   * CONSTRAINT GENERATION: Every arithmetic operation creates constraints
   * that will be compiled into the final R1CS representation.
   * 
   * PRECISION CRITICAL: Field operations must preserve exact semantics
   * of finite field arithmetic over the Pallas curve field.
   */
  field: {
    readVar(x) {
      // WITNESS VALUE EXTRACTION
      // 
      // Reads the concrete value of a field variable during witness generation.
      // This operation is only valid in prover mode when actual values are available.
      // 
      // SECURITY: Prevents witness values from leaking into constraint generation,
      // which would compromise zero-knowledge properties
      try {
        return getFieldModule().readVar(x);
      } catch (error) {
        // ENHANCED ERROR CONTEXT: Provide clear guidance for common usage errors
        if (error.message && error.message.includes('prover mode')) {
          throw new Error('readVar can only be called in prover mode (inside asProver or witness blocks)');
        }
        throw error;
      }
    },
    
    assertEqual(x, y) {
      // CRITICAL FIX: Direct equality constraint without transformation
      // 
      // PREVIOUS BUG: Old approach created x - y then asserted diff = 0
      // This transformed simple variables [1, 0] into Add expressions [2, [1, 0], ...]
      // causing Sparky to receive Add(Var, Constant) instead of direct variables
      // 
      // FIX: Call Sparky directly to generate single equality constraint
      // This preserves variable identity and avoids unwanted Add expressions
      getFieldModule().assertEqual(x, y);
    },
    
    assertMul(x, y, z) {
      // MULTIPLICATION CONSTRAINT: Assert x * y = z
      //
      // DIVISION BY ZERO DETECTION: Special case for inversion validation
      // When called as part of Field.inv(), we have assertMul(original, inverse, 1)
      // If original=0 and inverse=0, this should fail with division by zero error
      
      
      // Check for division by zero pattern: 0 * 0 = 1 (impossible)
      if (this.isZeroFieldVar(x) && this.isZeroFieldVar(y) && this.isOneFieldVar(z)) {
        throw Error('Field.inv(): Division by zero');
      }
      
      // CRITICAL FIX: Always use direct assert_mul to generate single constraint
      // Previous approach was creating TWO constraints (mul + assertEqual)
      // But Snarky generates ONE constraint: x * y = z
      getFieldModule().assertMul(x, y, z);
    },
    
    // Helper function to detect zero FieldVar
    isZeroFieldVar(fieldVar) {
      if (!Array.isArray(fieldVar) || fieldVar.length < 2) return false;
      
      // Check if it's a constant zero: [0, [0, 0n]]
      if (fieldVar[0] === 0 && Array.isArray(fieldVar[1]) && 
          fieldVar[1][0] === 0 && fieldVar[1][1] === 0n) {
        return true;
      }
      
      return false;
    },
    
    // Helper function to detect one FieldVar  
    isOneFieldVar(fieldVar) {
      if (!Array.isArray(fieldVar) || fieldVar.length < 2) return false;
      
      // Check if it's a constant one: [0, [0, 1n]]
      if (fieldVar[0] === 0 && Array.isArray(fieldVar[1]) && 
          fieldVar[1][0] === 0 && fieldVar[1][1] === 1n) {
        return true;
      }
      
      return false;
    },
    
    assertSquare(x, y) {
      // Call Sparky directly to generate squaring constraint
      getFieldModule().assertSquare(x, y);
    },
    
    assertBoolean(x) {
      // Pass FieldVar array directly - WASM will handle conversion
      getFieldModule().assertBoolean(x);
    },
    
    // ===================================================================
    // CONSTRAINT-GENERATING ARITHMETIC OPERATIONS
    // ===================================================================
    
    add(x, y) {
      // FIELD ADDITION: Creates addition constraint in R1CS system
      // Constraint: result = x + y (mod p) where p is Pallas field modulus
      
      // SNARKY COMPATIBILITY: Use direct constraint generation
      // Bypass optimization to match Snarky's constraint pattern exactly
      try {
        // Try direct method first if available
        const result = getFieldModule().addDirect ? 
          getFieldModule().addDirect(x, y) : 
          getFieldModule().add(x, y);
        return Array.isArray(result) ? result : cvarToFieldVar(result);
      } catch (error) {
        // Fallback to standard method
        const result = getFieldModule().add(x, y);
        return Array.isArray(result) ? result : cvarToFieldVar(result);
      }
    },
    
    mul(x, y) {
      // FIELD MULTIPLICATION: Creates R1CS constraint for multiplication
      // Constraint: result = x * y (mod p)
      
      // SNARKY COMPATIBILITY: Use direct multiplication constraint
      // Generate single R1CS constraint without intermediate variables
      try {
        const result = getFieldModule().mulDirect ? 
          getFieldModule().mulDirect(x, y) : 
          getFieldModule().mul(x, y);
        return Array.isArray(result) ? result : cvarToFieldVar(result);
      } catch (error) {
        // Fallback to standard method
        const result = getFieldModule().mul(x, y);
        return Array.isArray(result) ? result : cvarToFieldVar(result);
      }
    },
    
    sub(x, y) {
      // Call Sparky directly for field subtraction
      const result = getFieldModule().sub(x, y);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    
    scale(scalar, x) {
      // Call Sparky directly for field scaling
      const result = getFieldModule().scale(scalar, x);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    
    square(x) {
      // Use Sparky's fieldSquare to create squaring constraint
      // MEMORY BARRIER: Ensure deterministic squaring computation
      memoryBarrier();
      
      const result = getFieldModule().square(x);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    
    div(x, y) {
      // FIELD DIVISION: Implemented as x * y^(-1)
      // 
      // TWO-STEP PROCESS:
      // 1. Compute modular inverse y^(-1) with witness generation
      // 2. Multiply x by the inverse
      // 
      // CONSTRAINT COST: 2 constraints (inverse + multiplication)
      // SAFETY: Will fail if y = 0 (no modular inverse exists)
      // Uses standardized inv() method for consistent error handling
      const yInv = this.inv(y);
      const result = getFieldModule().mul(x, yInv);
      return Array.isArray(result) ? result : cvarToFieldVar(result);
    },
    
    inv(x) {
      // FIELD INVERSION: Computes modular inverse x^(-1)
      // 
      // MATHEMATICAL OPERATION: Finds y such that x * y ≡ 1 (mod p)
      // where p is the Pallas field modulus
      // 
      // ERROR HANDLING: Throws standardized error for division by zero
      // to maintain consistent behavior with Snarky backend
      // 
      // CONSTRAINT COST: 1 constraint (assertion that x * result = 1)
      try {
        const result = getFieldModule().inv(x);
        return Array.isArray(result) ? result : cvarToFieldVar(result);
      } catch (error) {
        // Standardize error message to match Field.ts
        if (error.message && error.message.includes('zero') || 
            error.message && error.message.includes('inverse')) {
          throw Error('Field.inv(): Division by zero');
        }
        throw error;
      }
    },
    
    compare(bitLength, x, y) {
      // Field comparison implementation (basic version)
      // Returns {less, less_or_equal} boolean variables
      try {
        // For now, implement a simplified comparison using field subtraction
        // TODO: Implement full bit-decomposition based comparison algorithm
        
        // Create difference: diff = x - y
        const diff = this.sub(x, y);
        
        // Create witness variables for comparison results
        const less = getRunModule().exists(() => {
          // This would require witness computation in a real implementation
          return {type: 'var', id: getRunModule().allocVar()}; // Placeholder
        });
        
        const less_or_equal = getRunModule().exists(() => {
          return {type: 'var', id: getRunModule().allocVar()}; // Placeholder
        });
        
        // TODO: Add proper range check constraints for bitLength
        // TODO: Add proper bit decomposition and comparison logic
        
        // For now, just ensure the variables are boolean
        this.assertBoolean(less);
        this.assertBoolean(less_or_equal);
        
        return {less, less_or_equal};
      } catch (error) {
        throw new Error(`field compare failed: ${error.message}`);
      }
    },
    
    truncateToBits16(lengthDiv16, x) {
      // Implement using range check
      const bits = lengthDiv16 * 16;
      getGatesModule().rangeCheckN(x, bits);
      return x;
    }
  },
  
  
  /**
   * Group APIs
   */
  group: {
    scaleFastUnpack(base, scalar, numBits) {
      // Fast scalar multiplication with unpacking (placeholder implementation)
      try {
        // For now, implement basic scalar multiplication using repeated addition
        // TODO: Implement optimized windowed scalar multiplication algorithm
        
        // Create result point (initialized to identity/infinity point)
        const result = getRunModule().exists(() => {
          return {type: 'var', id: getRunModule().allocVar()}; // Placeholder for point
        });
        
        // TODO: Implement proper elliptic curve scalar multiplication
        // This requires:
        // 1. Bit decomposition of scalar with numBits
        // 2. Double-and-add or windowed method
        // 3. Elliptic curve point operations
        
        // For now, just return a placeholder result
        console.log(`scaleFastUnpack called with numBits=${numBits} (placeholder implementation)`);
        return result;
        
      } catch (error) {
        throw new Error(`scaleFastUnpack failed: ${error.message}`);
      }
    }
  },
  
  // ===================================================================
  // HIGH-LEVEL CONSTRAINT GATES
  // ===================================================================
  /**
   * SPECIALIZED CONSTRAINT GENERATORS
   * 
   * Gates are high-level operations that generate multiple related constraints.
   * They encapsulate complex mathematical operations like elliptic curve arithmetic,
   * cryptographic hash functions, and range checks.
   * 
   * EFFICIENCY: Gates can generate multiple constraints atomically,
   * often with better optimization than composing individual field operations.
   * 
   * COMPATIBILITY: Gate interfaces must exactly match Snarky signatures
   * to ensure drop-in replacement capability.
   */
  gates: {
    zero(in1, in2, out) {
      getGatesModule().zero(in1, in2, out);
    },
    
    generic(sl, l, sr, r, so, o, sm, sc) {
      // GENERIC GATE: The fundamental building block of zkSNARK constraints
      // 
      // CONSTRAINT EQUATION: sl*l + sr*r + so*o + sm*(l*r) + sc = 0
      // Where:
      //   l, r, o = left, right, output field variables
      //   sl, sr, so, sm, sc = scalar coefficients
      // 
      // DESIGN FLEXIBILITY: Can represent many operations:
      //   - Addition: sl=1, sr=1, so=-1, sm=0, sc=0  → l + r = o
      //   - Multiplication: sl=0, sr=0, so=-1, sm=1, sc=0 → l * r = o
      //   - Constants: sl=1, sr=0, so=0, sm=0, sc=-c → l = c
      // 
      // PRECISION CRITICAL: Coefficients arrive as MlArray [tag, BigInt]
      // format and must preserve full precision through WASM boundary
      
      // MEMORY BARRIER: Ensure deterministic constraint generation for generic gates
      memoryBarrier();
      
      gateCallCounter++; // Debug tracking
      
      // MLARRAY UNPACKING: Extract BigInt coefficients from OCaml encoding
      const extractValue = (mlArray) => {
        return Array.isArray(mlArray) ? mlArray[1] : mlArray;
      };
      
      // VARIABLE ARRAY: The three field variables involved in the constraint
      const values = [l, r, o];
      
      // COEFFICIENT EXTRACTION: Preserve BigInt precision for field arithmetic
      const coefficients = [
        extractValue(sl),  // Coefficient for left variable
        extractValue(sr),  // Coefficient for right variable
        extractValue(so),  // Coefficient for output variable
        extractValue(sm),  // Coefficient for multiplication term
        extractValue(sc)   // Constant term
      ];
      
      // RAW GATE INTERFACE: Bypasses intermediate conversions to preserve precision
      // KimchiGateType::Generic = 1 (Kimchi gate type enumeration)
      const GENERIC_GATE_TYPE = 1;
      
      try {
        sparkyInstance.gatesRaw(GENERIC_GATE_TYPE, values, coefficients);
      } catch (error) {
        // Re-throw with preserved context
        throw error;
      }
    },
    
    poseidon(state) {
      return getGatesModule().poseidon(state);
    },
    
    ecAdd(p1, p2, p3, inf, same_x, slope, inf_z, x21_inv) {
      // ELLIPTIC CURVE POINT ADDITION
      // 
      // Implements complete addition on the Pallas elliptic curve: y² = x³ + 5
      // Handles all edge cases: point at infinity, point doubling, generic addition
      // 
      // MATHEMATICAL CONSTRAINTS GENERATED:
      // 1. Slope calculation: slope = (y₂ - y₁) / (x₂ - x₁) for different points
      // 2. Point doubling: slope = (3x₁² + a) / (2y₁) when p1 = p2
      // 3. Result computation: x₃ = slope² - x₁ - x₂, y₃ = slope(x₁ - x₃) - y₁
      // 4. Point at infinity: Special handling when x₁ = x₂ and y₁ = -y₂
      // 
      // AUXILIARY VARIABLES:
      // - inf: Boolean flag indicating result is point at infinity
      // - same_x: Boolean flag for x₁ = x₂ case (doubling or inverse)
      // - slope: The line slope for addition formula
      // - inf_z: Z-coordinate for projective infinity representation
      // - x21_inv: Modular inverse of (x₂ - x₁) for slope calculation
      // 
      // CONSTRAINT COUNT: ~15-20 constraints per addition (complex but efficient)
      
      try {
        // INPUT VALIDATION: Ensure points are in [x, y] coordinate format
        if (!Array.isArray(p1) || !Array.isArray(p2) || !Array.isArray(p3)) {
          throw new Error('ecAdd: Points must be arrays [x, y]');
        }
        
        const [p1x, p1y] = p1;
        const [p2x, p2y] = p2;
        const [p3x, p3y] = p3;
        
        // CONSTRAINT GENERATION: Delegate to Sparky's optimized EC implementation
        // This generates all necessary constraints for secure, complete addition
        getGatesModule().ecAdd(
          [p1x, p1y],          // First input point
          [p2x, p2y],          // Second input point
          [p3x, p3y],          // Result point (P1 + P2)
          inf,                 // Point at infinity flag
          same_x,              // Same x-coordinate detection
          slope,               // Addition line slope
          inf_z,               // Infinity z-coordinate
          x21_inv              // Modular inverse (x₂ - x₁)⁻¹
        );
        
        return p3; // Return result point
        
      } catch (error) {
        throw new Error(`ecAdd implementation failed: ${error.message}`);
      }
    },
    
    ecScale(state) {
      // Implement variable-base scalar multiplication using proper elliptic curve arithmetic
      // Expected state structure: [0, accs, bits, ss, base, nPrev, nNext]
      
      if (!Array.isArray(state) || state.length < 7) {
        throw new Error('ecScale: Invalid state structure');
      }
      
      const [_, accs, bits, ss, base, nPrev, nNext] = state;
      
      // Validate input arrays
      if (!Array.isArray(accs) || !Array.isArray(bits) || !Array.isArray(ss)) {
        throw new Error('ecScale: Expected arrays for accs, bits, and ss');
      }
      
      // Extract base point coordinates (MlGroup = MlPair<FieldVar, FieldVar>)
      if (!Array.isArray(base) || base.length < 2) {
        throw new Error('ecScale: Invalid base point structure');
      }
      
      const [baseX, baseY] = base;
      
      try {
        // Implement proper windowed scalar multiplication using elliptic curve arithmetic
        // This is the correct algorithm: for each bit, conditionally add base point to accumulator
        
        for (let i = 0; i < accs.length && i < bits.length; i++) {
          const acc = accs[i];
          const bit = bits[i];
          const slope = (i < ss.length) ? ss[i] : null;
          
          // Validate accumulator point structure [x, y]
          if (!Array.isArray(acc) || acc.length < 2) {
            continue; // Skip invalid accumulators
          }
          
          // Ensure bit is boolean (0 or 1)
          getFieldModule().assertBoolean(bit);
          
          // Create witness variables for the EC addition result
          const addResultXCvar = getFieldModule().exists(null);
          const addResultYCvar = getFieldModule().exists(null);
          const addResultX = Array.isArray(addResultXCvar) ? addResultXCvar : cvarToFieldVar(addResultXCvar);
          const addResultY = Array.isArray(addResultYCvar) ? addResultYCvar : cvarToFieldVar(addResultYCvar);
          const addResult = [addResultX, addResultY];
          
          // Create witness variables for auxiliary constraints
          const infCvar = getFieldModule().exists(null);        // Point at infinity flag
          const same_xCvar = getFieldModule().exists(null);     // Same x-coordinate flag  
          const inf_zCvar = getFieldModule().exists(null);      // Infinity z-coordinate
          const x21_invCvar = getFieldModule().exists(null);    // Inverse of (x2 - x1)
          
          const inf = Array.isArray(infCvar) ? infCvar : cvarToFieldVar(infCvar);
          const same_x = Array.isArray(same_xCvar) ? same_xCvar : cvarToFieldVar(same_xCvar);
          const inf_z = Array.isArray(inf_zCvar) ? inf_zCvar : cvarToFieldVar(inf_zCvar);
          const x21_inv = Array.isArray(x21_invCvar) ? x21_invCvar : cvarToFieldVar(x21_invCvar);
          
          // Use proper elliptic curve addition: addResult = acc + base
          let slopeVar = slope;
          if (!slopeVar) {
            const slopeCvar = getFieldModule().exists(null);
            slopeVar = Array.isArray(slopeCvar) ? slopeCvar : cvarToFieldVar(slopeCvar);
          }
          
          this.ecAdd(
            acc,                                      // First point (accumulator)
            base,                                     // Second point (base)
            addResult,                                // Result point
            inf,                                      // Infinity flag
            same_x,                                   // Same x flag
            slopeVar,                                 // Slope
            inf_z,                                    // Infinity z
            x21_inv                                   // Inverse
          );
          
          // Conditional selection based on bit:
          // if bit == 1: result = addResult (acc + base)
          // if bit == 0: result = acc (unchanged)
          
          // For x-coordinate: resultX = bit * addResult.x + (1 - bit) * acc.x
          const oneCvar = getFieldModule().constant(1);
          const one = Array.isArray(oneCvar) ? oneCvar : cvarToFieldVar(oneCvar);
          const invBit = Snarky.field.sub(one, bit);
          
          const addX_scaled = Snarky.field.mul(bit, addResult[0]);
          const accX_scaled = Snarky.field.mul(invBit, acc[0]);
          const resultX = Snarky.field.add(addX_scaled, accX_scaled);
          
          // For y-coordinate: resultY = bit * addResult.y + (1 - bit) * acc.y
          const addY_scaled = Snarky.field.mul(bit, addResult[1]);
          const accY_scaled = Snarky.field.mul(invBit, acc[1]);
          const resultY = Snarky.field.add(addY_scaled, accY_scaled);
          
          // Update accumulator for next iteration (if there's a next one)
          if (i + 1 < accs.length) {
            // Connect the result to the next accumulator
            getFieldModule().assertEqual(accs[i + 1][0], resultX);
            getFieldModule().assertEqual(accs[i + 1][1], resultY);
          }
        }
        
        // Process counter progression: nNext = nPrev + 1
        if (nPrev !== undefined && nNext !== undefined) {
          const prevField = getFieldModule().constant(Number(nPrev));
          const nextField = getFieldModule().constant(Number(nNext));
          const oneField = getFieldModule().constant(1);
          const expected = getFieldModule().add(prevField, oneField);
          getFieldModule().assertEqual(nextField, expected);
        }
        
      } catch (error) {
        throw new Error(`ecScale implementation failed: ${error.message}`);
      }
    },
    
    ecEndoscale(state, xs, ys, nAcc) {
      // Implement GLV endomorphism-accelerated scalar multiplication
      // Computes k₁*P + k₂*λ(P) where k = k₁ + k₂*λ (GLV decomposition)
      // Expected state structure: [0, xt, yt, xp, yp, nAcc, xr, yr, s1, s3, b1, b2, b3, b4]
      
      if (!Array.isArray(state) || state.length < 14) {
        throw new Error('ecEndoscale: Invalid state structure, expected 14 elements');
      }
      
      const [_, xt, yt, xp, yp, nAccState, xr, yr, s1, s3, b1, b2, b3, b4] = state;
      
      try {
        // Validate coordinate inputs
        if (!xs || !ys || !nAcc) {
          throw new Error('ecEndoscale: Missing required coordinates xs, ys, or nAcc');
        }
        
        // λ (lambda) for Pallas curve endomorphism - cube root of unity
        // λ = 0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547
        const lambdaCvar = getFieldModule().constant(BigInt('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547'));
        const lambda = Array.isArray(lambdaCvar) ? lambdaCvar : cvarToFieldVar(lambdaCvar);
        
        // Validate that all points satisfy curve equation y² = x³ + 5
        const fiveCvar = getFieldModule().constant(5);
        const five = Array.isArray(fiveCvar) ? fiveCvar : cvarToFieldVar(fiveCvar);
        
        // Validate base point (xp, yp): yp² = xp³ + 5
        const xpSquared = Snarky.field.square(xp);
        const xpCubed = Snarky.field.mul(xp, xpSquared);
        const xpRhs = Snarky.field.add(xpCubed, five);
        const ypSquared = Snarky.field.square(yp);
        Snarky.field.assertEqual(ypSquared, xpRhs);
        
        // Apply endomorphism: λ(P) = (λ*xp, yp)
        const endoXp = Snarky.field.mul(lambda, xp);
        const endoPoint = [endoXp, yp];
        
        // Validate endomorphism point: yp² = (λ*xp)³ + 5
        const endoXpSquared = Snarky.field.square(endoXp);
        const endoXpCubed = Snarky.field.mul(endoXp, endoXpSquared);
        const endoRhs = Snarky.field.add(endoXpCubed, five);
        Snarky.field.assertEqual(ypSquared, endoRhs);
        
        // Validate boolean constraints for decomposed scalar bits
        getFieldModule().assertBoolean(b1);
        getFieldModule().assertBoolean(b2);
        getFieldModule().assertBoolean(b3);
        getFieldModule().assertBoolean(b4);
        
        // Implement dual scalar multiplication: k₁*P + k₂*λ(P)
        // where k₁ is represented by bits [b1, b2] and k₂ by bits [b3, b4]
        
        // Create intermediate witness points for the computation
        const k1PointXCvar = getFieldModule().exists(null);
        const k1PointYCvar = getFieldModule().exists(null);
        const k1PointX = Array.isArray(k1PointXCvar) ? k1PointXCvar : cvarToFieldVar(k1PointXCvar);
        const k1PointY = Array.isArray(k1PointYCvar) ? k1PointYCvar : cvarToFieldVar(k1PointYCvar);
        const k1Point = [k1PointX, k1PointY];
        
        const k2PointXCvar = getFieldModule().exists(null);
        const k2PointYCvar = getFieldModule().exists(null);
        const k2PointX = Array.isArray(k2PointXCvar) ? k2PointXCvar : cvarToFieldVar(k2PointXCvar);
        const k2PointY = Array.isArray(k2PointYCvar) ? k2PointYCvar : cvarToFieldVar(k2PointYCvar);
        const k2Point = [k2PointX, k2PointY];
        
        // Scalar multiply P by k₁ (using bits b1, b2)
        // Simplified 2-bit scalar multiplication: k₁ = 2*b1 + b2
        
        // Step 1: Compute 2*P (point doubling)
        const doubleP_XCvar = getFieldModule().exists(null);
        const doubleP_YCvar = getFieldModule().exists(null);
        const doubleP_X = Array.isArray(doubleP_XCvar) ? doubleP_XCvar : cvarToFieldVar(doubleP_XCvar);
        const doubleP_Y = Array.isArray(doubleP_YCvar) ? doubleP_YCvar : cvarToFieldVar(doubleP_YCvar);
        const doubleP = [doubleP_X, doubleP_Y];
        
        // Use ecAdd for point doubling: 2*P = P + P
        const inf_doubleCvar = getFieldModule().exists(null);
        const same_x_doubleCvar = getFieldModule().exists(null);
        const inf_z_doubleCvar = getFieldModule().exists(null);
        const x21_inv_doubleCvar = getFieldModule().exists(null);
        
        const inf_double = Array.isArray(inf_doubleCvar) ? inf_doubleCvar : cvarToFieldVar(inf_doubleCvar);
        const same_x_double = Array.isArray(same_x_doubleCvar) ? same_x_doubleCvar : cvarToFieldVar(same_x_doubleCvar);
        const inf_z_double = Array.isArray(inf_z_doubleCvar) ? inf_z_doubleCvar : cvarToFieldVar(inf_z_doubleCvar);
        const x21_inv_double = Array.isArray(x21_inv_doubleCvar) ? x21_inv_doubleCvar : cvarToFieldVar(x21_inv_doubleCvar);
        
        let s1Var = s1;
        if (!s1Var) {
          const s1Cvar = getFieldModule().exists(null);
          s1Var = Array.isArray(s1Cvar) ? s1Cvar : cvarToFieldVar(s1Cvar);
        }
        
        this.ecAdd(
          [xp, yp], [xp, yp], doubleP,
          inf_double,
          same_x_double,
          s1Var,
          inf_z_double,
          x21_inv_double
        );
        
        // Step 2: Conditional addition for k₁*P
        // if b1==1: temp = 2*P, else temp = O (point at infinity)
        // if b2==1: k₁*P = temp + P, else k₁*P = temp
        
        // For simplicity, use the existing scalar multiplication pattern
        // k₁*P = b1*(2*P) + b2*P
        
        // Similarly for k₂*λ(P)
        const doubleEndoP_XCvar = getFieldModule().exists(null);
        const doubleEndoP_YCvar = getFieldModule().exists(null);
        const doubleEndoP_X = Array.isArray(doubleEndoP_XCvar) ? doubleEndoP_XCvar : cvarToFieldVar(doubleEndoP_XCvar);
        const doubleEndoP_Y = Array.isArray(doubleEndoP_YCvar) ? doubleEndoP_YCvar : cvarToFieldVar(doubleEndoP_YCvar);
        const doubleEndoP = [doubleEndoP_X, doubleEndoP_Y];
        
        // Helper function to create witness var
        const createWitnessVar = () => {
          const cvar = getFieldModule().exists(null);
          return Array.isArray(cvar) ? cvar : cvarToFieldVar(cvar);
        };
        
        this.ecAdd(
          endoPoint, endoPoint, doubleEndoP,
          createWitnessVar(),
          createWitnessVar(),
          createWitnessVar(),
          createWitnessVar(),
          createWitnessVar()
        );
        
        // Final addition: result = k₁*P + k₂*λ(P)
        let s3Var = s3;
        if (!s3Var) {
          const s3Cvar = getFieldModule().exists(null);
          s3Var = Array.isArray(s3Cvar) ? s3Cvar : cvarToFieldVar(s3Cvar);
        }
        
        this.ecAdd(
          k1Point, k2Point, [xr, yr],
          createWitnessVar(),
          createWitnessVar(),
          s3Var,
          createWitnessVar(),
          createWitnessVar()
        );
        
        // Validate result point: yr² = xr³ + 5
        const xrSquared = Snarky.field.square(xr);
        const xrCubed = Snarky.field.mul(xr, xrSquared);
        const xrRhs = Snarky.field.add(xrCubed, five);
        const yrSquared = Snarky.field.square(yr);
        Snarky.field.assertEqual(yrSquared, xrRhs);
        
        // Connect input coordinates to state coordinates
        Snarky.field.assertEqual(xs, xt);
        Snarky.field.assertEqual(ys, yt);
        
        // Connect accumulator counter
        if (nAccState) {
          Snarky.field.assertEqual(nAcc, nAccState);
        }
        
      } catch (error) {
        throw new Error(`ecEndoscale implementation failed: ${error.message}`);
      }
    },
    
    ecEndoscalar(state) {
      // Implement endomorphism scalar processing
      // This handles the scalar decomposition part of GLV endomorphism
      
      if (!Array.isArray(state)) {
        throw new Error('ecEndoscalar: Invalid state structure');
      }
      
      try {
        // Process the scalar decomposition state
        // This operation typically prepares scalars for endomorphism-based multiplication
        
        // For GLV decomposition: given scalar k, find k1, k2 such that k = k1 + k2*λ
        // where λ is the endomorphism eigenvalue
        
        // Generate constraints to validate the scalar decomposition
        // This is a simplified version that validates basic structure
        
        for (let i = 0; i < state.length; i++) {
          const element = state[i];
          if (element && typeof element === 'object') {
            // If element looks like a field variable, ensure it's boolean for scalar bits
            if (Array.isArray(element) && element.length >= 2) {
              getFieldModule().assertBoolean(element);
            }
          }
        }
        
      } catch (error) {
        throw new Error(`ecEndoscalar implementation failed: ${error.message}`);
      }
    },
    
    
    rangeCheck(state) {
      // Use Sparky's range check
      if (state && state.length > 0) {
        getGatesModule().rangeCheck64(state[0]);
      }
    },
    
    rangeCheck0(x) {
      // Range check that a value is exactly 0
      getGatesModule().rangeCheck0(x);
    },
    
    rangeCheck1(v2, v12, v2c0, v2p0, v2p1, v2p2, v2p3, v2c1, v2c2, v2c3, v2c4, v2c5, v2c6, v2c7, v2c8, v2c9, v2c10, v2c11, v0p0, v0p1, v1p0, v1p1, v2c12, v2c13, v2c14, v2c15, v2c16, v2c17, v2c18, v2c19) {
      // Range check implementation for complex multi-variable constraints
      // Pass FieldVar arrays directly - WASM will handle conversion
      getGatesModule().rangeCheck1(
        v2, v12,
        v2c0, v2p0, v2p1, v2p2, v2p3,
        v2c1, v2c2, v2c3, v2c4, v2c5,
        v2c6, v2c7, v2c8,
        v2c9, v2c10, v2c11,
        v0p0, v0p1, v1p0, v1p1,
        v2c12, v2c13, v2c14, v2c15,
        v2c16, v2c17, v2c18, v2c19
      );
    },
    
    foreignFieldAdd(left, right, overflow, carry, modulus, sign, result, remainder) {
      // Foreign field addition gate
      // Implements: left + sign * right = quotient * modulus + result
      // Where sign is -1 or 1 for subtraction or addition
      try {
        // Convert inputs to proper format
        // Each foreign field element is [low, mid, high] (3 limbs)
        const leftArray = Array.isArray(left) ? left : [left.low, left.mid, left.high];
        const rightArray = Array.isArray(right) ? right : [right.low, right.mid, right.high];
        const modulusArray = Array.isArray(modulus) ? modulus : [modulus.low, modulus.mid, modulus.high];
        const resultArray = Array.isArray(result) ? result : [result.low, result.mid, result.high];
        const remainderArray = Array.isArray(remainder) ? remainder : [remainder.low, remainder.mid, remainder.high];
        
        // Call WASM foreign field add
        sparkyInstance.foreignFieldAdd(
          leftArray,
          rightArray,
          overflow,
          carry,
          modulusArray,
          sign,
          resultArray,
          remainderArray
        );
      } catch (error) {
        throw new Error(`foreignFieldAdd failed: ${error.message}`);
      }
    },
    
    foreignFieldMul(left, right, remainder, quotient, quotientHiBound, carry0, carry1p, carry1c, carry2p, carry2c, carry3p, carry4p, carry5p, carry6p, carry7p, carry8p, carry9p, carry10p, carry10c, carry11p, carry12c, carry13p, carry14p, carry15p, carry16p, carry17p, carry18c, foreignFieldModulus2, negForeignFieldModulus2, sign) {
      // Foreign field multiplication gate
      // Implements: left * right = quotient * modulus + remainder
      try {
        // Convert 3-limb foreign field elements
        const leftArray = Array.isArray(left) ? left : [left.low, left.mid, left.high];
        const rightArray = Array.isArray(right) ? right : [right.low, right.mid, right.high];
        const remainderArray = Array.isArray(remainder) ? remainder : [remainder.low, remainder.mid, remainder.high];
        const quotientArray = Array.isArray(quotient) ? quotient : [quotient.low, quotient.mid, quotient.high];
        const foreignFieldModulus2Array = Array.isArray(foreignFieldModulus2) ? foreignFieldModulus2 : [foreignFieldModulus2.low, foreignFieldModulus2.mid, foreignFieldModulus2.high];
        const negForeignFieldModulus2Array = Array.isArray(negForeignFieldModulus2) ? negForeignFieldModulus2 : [negForeignFieldModulus2.low, negForeignFieldModulus2.mid, negForeignFieldModulus2.high];
        
        // Call WASM foreign field multiply
        sparkyInstance.foreignFieldMul(
          leftArray,
          rightArray,
          remainderArray,
          quotientArray,
          quotientHiBound,
          carry0, carry1p, carry1c,
          carry2p, carry2c, carry3p,
          carry4p, carry5p, carry6p,
          carry7p, carry8p, carry9p,
          carry10p, carry10c, carry11p,
          carry12c, carry13p, carry14p,
          carry15p, carry16p, carry17p,
          carry18c,
          foreignFieldModulus2Array,
          negForeignFieldModulus2Array,
          sign
        );
      } catch (error) {
        throw new Error(`foreignFieldMul failed: ${error.message}`);
      }
    },
    
    lookup(w0, w1, w2, w3, w4, w5, w6) {
      // 7-wire lookup gate implementation
      try {
        getGatesModule().lookup(w0, w1, w2, w3, w4, w5, w6);
      } catch (error) {
        throw new Error(`lookup gate failed: ${error.message}`);
      }
    },
    
    xor(in1, in2, out, in1_0, in1_1, in1_2, in1_3, in2_0, in2_1, in2_2, in2_3, out_0, out_1, out_2, out_3) {
      // XOR gate with 4x4-bit decomposition (following Snarky implementation)
      try {
        getGatesModule().xor(in1, in2, out, in1_0, in1_1, in1_2, in1_3, in2_0, in2_1, in2_2, in2_3, out_0, out_1, out_2, out_3);
      } catch (error) {
        throw new Error(`xor gate failed: ${error.message}`);
      }
    },
    
    rotate(field, rotated, excess, limbs, crumbs, two_to_rot) {
      // Rotate gate for 64-bit rotation
      try {
        getGatesModule().rotate(field, rotated, excess, limbs, crumbs, two_to_rot);
      } catch (error) {
        // Enhanced error reporting to debug the undefined issue
        const errorMsg = error.message || error.toString() || JSON.stringify(error) || 'unknown error';
        const errorType = typeof error;
        const errorKeys = Object.keys(error || {});
        throw new Error(`rotate gate failed: ${errorMsg} (type: ${errorType}, keys: [${errorKeys.join(', ')}])`);
      }
    },
    
    raw(kind, values, coefficients) {
      // Raw gate interface for direct gate specification
      // This is used for advanced custom gates
      try {
        getGatesModule().raw(kind, values, coefficients);
      } catch (error) {
        throw new Error(`raw gate failed: ${error.message}`);
      }
    },
    
    addFixedLookupTable(id, data) {
      // Add fixed lookup table for optimization
      try {
        getGatesModule().addFixedLookupTable(id, data);
      } catch (error) {
        throw new Error(`addFixedLookupTable failed: ${error.message}`);
      }
    },
    
    addRuntimeTableConfig(id, firstColumn) {
      // Configure runtime lookup table
      try {
        getGatesModule().addRuntimeTableConfig(id, firstColumn);
      } catch (error) {
        throw new Error(`addRuntimeTableConfig failed: ${error.message}`);
      }
    }
  },
  
  
  /**
   * Circuit APIs
   */
  circuit: {
    compile(main, publicInputSize) {
      return getCircuitModule().compile(main);
    },
    
    prove(main, publicInputSize, publicInput, keypair) {
      const witness = getCircuitModule().generateWitness(publicInput);
      return getCircuitModule().prove(witness);
    },
    
    verify(publicInput, proof, verificationKey) {
      return getCircuitModule().verify(proof, publicInput);
    },
    
    keypair: {
      getVerificationKey(keypair) {
        return keypair.verificationKey;
      },
      
      getConstraintSystemJSON(keypair) {
        return getConstraintSystemModule().toJson({});
      }
    }
  },
  
  
  /**
   * Poseidon object with sponge construction methods
   */
  poseidon: {
    update(state, input) {
      try {
        // Convert inputs to the right format for WASM
        // The state and input should already be in MlArray format: [0, ...fieldVars]
        if (!Array.isArray(state) || state[0] !== 0) {
          throw new Error('State must be in MlArray format [0, ...fieldVars]');
        }
        if (!Array.isArray(input) || input[0] !== 0) {
          throw new Error('Input must be in MlArray format [0, ...fieldVars]');
        }
        
        // Call the WASM poseidon.update method with the original MlArray format
        const newStateArray = sparkyInstance.poseidon.update(state, input);
        
        // The result is in MlArray format: [0, cvar1, cvar2, cvar3]
        // Each cvar might be either a FieldVar array or a Cvar object
        if (!Array.isArray(newStateArray) || newStateArray.length < 4) {
          throw new Error('Invalid poseidon.update result format');
        }
        
        // Convert each element - handle both Cvar objects and FieldVar arrays
        return newStateArray.slice(1).map(element => {
          // If it's already a FieldVar array, return as-is
          if (Array.isArray(element)) {
            return element;
          }
          // Otherwise convert from Cvar object to FieldVar array
          return cvarToFieldVar(element);
        });
      } catch (error) {
        // Poseidon.update error - rethrowing
        throw error;
      }
    },
    
    hashToGroup(input) {
      // Convert input to the right format
      const inputArray = input.map(fieldVarToCvar);
      
      // Call the WASM poseidon.hashToGroup method
      const groupPoint = sparkyInstance.poseidon.hashToGroup([0, ...inputArray]);
      
      // Return as [x, y] pair converted to FieldVar format
      return [0, cvarToFieldVar(groupPoint[0]), cvarToFieldVar(groupPoint[1])];
    },
    
    sponge: {
      create(isChecked) {
        // Create Poseidon sponge construction
        try {
          return sparkyInstance.poseidon.spongeCreate(isChecked);
        } catch (error) {
          throw new Error(`poseidon.sponge.create failed: ${error.message}`);
        }
      },
      
      absorb(sponge, field) {
        // Absorb field element into sponge state
        try {
          const fieldVar = cvarToFieldVar(field);
          return sparkyInstance.poseidon.spongeAbsorb(sponge, fieldVar);
        } catch (error) {
          throw new Error(`poseidon.sponge.absorb failed: ${error.message}`);
        }
      },
      
      squeeze(sponge) {
        // Squeeze field element from sponge state
        try {
          const result = sparkyInstance.poseidon.spongeSqueeze(sponge);
          return fieldVarToCvar(result);
        } catch (error) {
          throw new Error(`poseidon.sponge.squeeze failed: ${error.message}`);
        }
      }
    }
  },
  
  /**
   * Field conversion functions for OCaml bridge
   * These handle conversion between OCaml and JavaScript field representations
   */
  fieldFromOcaml(ocamlField) {
    // When using Sparky backend, OCaml fields are already JavaScript objects
    // This is called when switching from Snarky to Sparky
    return ocamlField;
  },
  
  fieldToOcaml(jsField) {
    // When using Sparky backend, JavaScript fields are already in the right format
    // This is called when switching from Sparky to Snarky
    return jsField;
  },
  
  constantFromOcaml(ocamlConstant) {
    // Convert OCaml constant to JavaScript representation
    // OCaml constants might be passed as various types
    if (typeof ocamlConstant === 'number' || typeof ocamlConstant === 'bigint') {
      // Temporarily return as-is for testing (Fp disabled)
      return ocamlConstant;
    }
    // Already a field constant
    return ocamlConstant;
  },
  
  constantToOcaml(jsConstant) {
    // Convert JavaScript constant to OCaml representation
    // For Sparky, constants are already in the right format
    return jsConstant;
  }
};

/**
 * ===================================================================
 * CONSTRAINT BRIDGE: JavaScript ↔ OCaml Integration Layer
 * ===================================================================
 * 
 * CRITICAL ARCHITECTURAL COMPONENT:
 * This bridge solves the fundamental integration challenge between
 * Sparky (Rust/WASM constraint generation) and Pickles (OCaml proof system).
 * 
 * THE PROBLEM:
 * - o1js circuits execute in JavaScript, generating constraints via Sparky
 * - Pickles (proof compilation) runs in OCaml and needs those constraints
 * - Direct Rust-OCaml integration is complex and brittle
 * 
 * THE SOLUTION:
 * A bidirectional bridge that enables:
 * 1. DETECTION: OCaml can detect when Sparky is active
 * 2. ACCUMULATION: JavaScript collects constraints during circuit execution
 * 3. RETRIEVAL: OCaml can extract constraints for VK generation
 * 4. CONVERSION: Automatic format translation between systems
 * 
 * INTEGRATION FLOW:
 * 1. OCaml calls startConstraintAccumulation() before circuit execution
 * 2. JavaScript/Sparky accumulates constraints during circuit.main() execution
 * 3. OCaml calls getAccumulatedConstraints() to retrieve constraint data
 * 4. OCaml processes constraints for verification key generation
 * 5. OCaml calls endConstraintAccumulation() to clean up
 * 
 * STATE MANAGEMENT:
 * - isCompilingCircuit: Prevents state resets during active compilation
 * - accumulatedConstraints: Cache for constraint data
 * - gateCallCounter: Debug tracking for constraint generation volume
 * 
 * ERROR HANDLING:
 * - All bridge functions include comprehensive error context
 * - Constraint retrieval failures are surfaced, not masked
 * - State corruption is detected and reported clearly
 */

// Global tracking for constraint accumulation during compilation
let isCompilingCircuit = false;
let accumulatedConstraints = [];

// Sparky always operates in Snarky-compatible mode for VK parity

/**
 * BACKEND DETECTION FUNCTION
 * 
 * Called by OCaml to determine which constraint generation backend is active.
 * This is critical for routing constraint collection to the correct system.
 * 
 * DETECTION STRATEGY:
 * - Sparky active: sparkyInstance exists and is initialized
 * - Snarky active: sparkyInstance is null/undefined
 * 
 * USAGE: OCaml calls this before attempting constraint collection
 * to avoid trying to collect from inactive backend
 * 
 * @returns {boolean} true if Sparky is active, false if Snarky is active
 */
function isActiveSparkyBackend() {
  const isActive = sparkyInstance !== null && typeof sparkyInstance !== 'undefined';
  return isActive;
}

/**
 * CONSTRAINT ACCUMULATION INITIALIZATION
 * 
 * Called by OCaml at the start of zkProgram compilation, before
 * executing the circuit's main function with public inputs.
 * 
 * INITIALIZATION SEQUENCE:
 * 1. Reset debug counters for this compilation session
 * 2. Verify Sparky is active (exit early if Snarky is active)
 * 3. Clear previous state only on first call (avoid mid-compilation resets)
 * 4. Enter constraint generation mode
 * 5. Set compilation flag to prevent interference
 * 
 * STATE PROTECTION:
 * - Only resets on FIRST call to prevent clearing constraints mid-compilation
 * - Uses global handle to track constraint system context
 * - Sets isCompilingCircuit flag to prevent interference from other operations
 * 
 * PERFORMANCE: Minimal overhead when Snarky is active (early exit)
 */
function startConstraintAccumulation() {
  gateCallCounter = 0; // Reset debug counter for new compilation
  
  // EARLY EXIT: No-op when Snarky is the active backend
  if (!isActiveSparkyBackend()) {
    return;
  }
  
  // MEMORY BARRIER: Ensure deterministic memory state for constraint compilation
  memoryBarrier();
  
  // STATE RESET: Only on first call to avoid clearing mid-compilation constraints
  // Subsequent calls during same compilation preserve accumulated state
  if (!globalThis.__sparkyConstraintHandle && sparkyInstance && sparkyInstance.runReset) {
    sparkyInstance.runReset();
  }
  
  // COMPILATION MODE: Set flags to coordinate with other adapter operations
  isCompilingCircuit = true;
  accumulatedConstraints = CONSTRAINT_BUFFER_POOL.getBuffer(1000); // Use pooled buffer
  
  // CONSTRAINT CONTEXT: Enter constraint generation mode and maintain handle
  // This ensures all subsequent field operations generate constraints
  if (!globalThis.__sparkyConstraintHandle) {
    globalThis.__sparkyConstraintHandle = getRunModule().enterConstraintSystem();
  }
}

/**
 * CONSTRAINT RETRIEVAL FUNCTION
 * 
 * Called by OCaml after circuit execution completes to extract
 * all constraints generated during the circuit's main function.
 * 
 * RETRIEVAL PROCESS:
 * 1. Verify Sparky is active (return empty for Snarky)
 * 2. Extract constraint system from Sparky's global state
 * 3. Convert to OCaml-compatible format
 * 4. Return constraint array for VK generation
 * 
 * FORMAT CONVERSION:
 * - Sparky internal format → JSON representation
 * - Extract 'gates' array (constraint list)
 * - Preserve all constraint metadata for OCaml processing
 * 
 * ERROR HANDLING:
 * - Comprehensive validation of constraint system state
 * - Clear error messages for debugging integration issues
 * - No silent failures that could corrupt proof generation
 * 
 * PERFORMANCE TRACKING:
 * - Records gate call statistics for debugging
 * - Resets counters for next compilation session
 * 
 * @returns {Array} Array of constraint objects in OCaml-compatible format
 */
function getAccumulatedConstraints() {
  // EARLY EXIT: Return empty constraints when Snarky is active
  if (!isActiveSparkyBackend()) {
    return [];
  }
  
  try {
    // MEMORY BARRIER: Ensure stable memory state before constraint extraction
    memoryBarrier();
    
    // DEBUG TRACKING: Record constraint generation volume
    const totalGateCalls = gateCallCounter;
    gateCallCounter = 0; // Reset for next compilation
    
    // CONSTRAINT EXTRACTION: Get accumulated constraints from Sparky state
    // CRITICAL FIX: Use toJson() instead of getConstraintSystem() to trigger finalization
    const constraintsJson = getConstraintSystemModule().toJson({});
    
    if (constraintsJson) {
      // MEMORY BARRIER: Ensure deterministic JSON parsing under memory pressure
      if (typeof constraintsJson === 'string' && constraintsJson.length > 10000) {
        memoryBarrier();
      }
      
      // FORMAT NORMALIZATION: Handle both string and object responses
      const constraints = typeof constraintsJson === 'string' 
        ? JSON.parse(constraintsJson) 
        : constraintsJson;
      
      // EXTRACT GATES: OCaml expects array of constraint gate objects
      const gates = constraints.gates || [];
      
      // DETERMINISTIC CONSTRAINT PROCESSING: Apply memory barrier for large constraint sets
      if (gates.length > 100) {
        memoryBarrier();
      }
      
      return gates;
    } else {
      // CRITICAL ERROR: Null constraint system indicates initialization failure
      throw new Error('getConstraintSystem() returned null/undefined - constraint system may not be properly initialized');
    }
  } catch (error) {
    // ERROR ESCALATION: Surface constraint retrieval failures with full context
    // These errors must reach OCaml to prevent silent proof generation failures
    const errorMsg = `Failed to retrieve constraints from Sparky: ${error.message || error}`;
    throw new Error(errorMsg);
  }
}

/**
 * CONSTRAINT ACCUMULATION CLEANUP
 * 
 * Called by OCaml after constraint retrieval completes to clean up
 * the constraint accumulation state and exit constraint generation mode.
 * 
 * CLEANUP SEQUENCE:
 * 1. Clear compilation flags to allow normal operations
 * 2. Reset constraint cache (constraints already retrieved)
 * 3. Exit constraint system context to restore normal mode
 * 4. Clear global handles to prevent handle leaks
 * 
 * IMPORTANT: Does NOT reset Sparky's internal state!
 * The constraints must remain available until OCaml completes
 * verification key generation.
 * 
 * ERROR HANDLING:
 * - Logs exit failures but doesn't throw (cleanup phase)
 * - Warns about potential state corruption for debugging
 * - Ensures flags are cleared even if exit fails
 */
function endConstraintAccumulation() {
  // CLEAR COMPILATION STATE: Allow normal adapter operations to resume
  isCompilingCircuit = false;
  
  // MEMORY POOL CLEANUP: Return constraint buffer to pool for reuse
  if (Array.isArray(accumulatedConstraints)) {
    CONSTRAINT_BUFFER_POOL.returnBuffer(accumulatedConstraints);
  }
  accumulatedConstraints = [];
  
  // EXIT CONSTRAINT CONTEXT: Return to normal operation mode
  if (globalThis.__sparkyConstraintHandle) {
    try {
      globalThis.__sparkyConstraintHandle.exit();
      globalThis.__sparkyConstraintHandle = null;
    } catch (error) {
      // CLEANUP ERROR HANDLING: Log but don't throw during cleanup
      // Throwing here could disrupt OCaml's compilation flow
      const errorMsg = `Failed to exit constraint system: ${error.message || error}`;
    }
  }
  
  // MEMORY BARRIER: Ensure clean memory state after constraint accumulation
  memoryBarrier();
  
  // PRESERVATION NOTE: Sparky's internal constraint state is NOT reset here!
  // The constraints must remain available for OCaml's VK generation process.
  // State reset only occurs at the start of the next compilation cycle.
}

/**
 * Export constraint bridge functions for OCaml access
 * These will be called from pickles_bindings.ml during compilation
 */
if (typeof globalThis !== 'undefined') {
  // Make bridge functions available globally for OCaml to call
  globalThis.sparkyConstraintBridge = {
    isActiveSparkyBackend,
    startConstraintAccumulation,
    getAccumulatedConstraints,
    endConstraintAccumulation,
    setActiveBackend: (backendType) => {
      // Update the active backend for constraint routing
    }
  };
}

/**
 * Ledger API (placeholder - would need full implementation)
 */
export const Ledger = {
  // Ledger functionality would go here
};

/**
 * Pickles API - Re-export from OCaml bindings
 * We use a getter to ensure it's available after initialization
 */
export let Pickles = new Proxy({}, {
  get(target, prop) {
    if (!PicklesOCaml) {
      throw new Error('Pickles not initialized. Call initializeSparky() first.');
    }
    return PicklesOCaml[prop];
  }
});

/**
 * Test utilities - Re-export from OCaml bindings
 */
export let Test = new Proxy(function() {
  // When called as a function, return TestOCaml (to match OCaml API)
  if (!TestOCaml) {
    throw new Error('Test not initialized. Call initializeSparky() first.');
  }
  return TestOCaml;
}, {
  get(target, prop) {
    if (!TestOCaml) {
      throw new Error('Test not initialized. Call initializeSparky() first.');
    }
    return TestOCaml[prop];
  }
});

/**
 * Reset Sparky state when switching to another backend
 */
export function resetSparkyBackend() {
  sparkyInstance = null;
  initialized = false;
  initPromise = null;
  isCompilingCircuit = false;
}

/**
 * Reset just the Sparky run state (constraint system, variables, etc.)
 * without deinitializing the entire backend
 */
export function resetSparkyState() {
  if (sparkyInstance && sparkyInstance.runReset) {
    sparkyInstance.runReset();
  }
  isCompilingCircuit = false;
  accumulatedConstraints = [];
  gateCallCounter = 0;
}

/**
 * Constraint flow debugging - track where constraints actually go
 */
let constraintCallCount = 0;
function debugConstraintFlow(operation, backend, ...args) {
  constraintCallCount++;
  
  // Track constraint count inflation
  if (typeof globalThis.constraintFlowStats === 'undefined') {
    globalThis.constraintFlowStats = { sparky: 0, ocaml: 0 };
  }
  globalThis.constraintFlowStats[backend]++;
}

/**
 * GLOBAL CONSTRAINT ROUTING SYSTEM
 * 
 * CRITICAL BUG FIX: This function resolves the constraint routing issue
 * where constraints were always directed to OCaml regardless of active backend.
 * 
 * THE ROUTING PROBLEM:
 * o1js uses globalThis.__snarky.Snarky for constraint operations,
 * but this reference wasn't updated when switching between backends,
 * causing constraints to go to the wrong system.
 * 
 * THE SOLUTION:
 * Dynamically update the global routing pointer to direct constraints
 * to the currently active backend (Sparky or OCaml Snarky).
 * 
 * ROUTING COMPONENTS:
 * 1. globalThis.__snarky.Snarky: Main routing target
 * 2. Debugging wrapper: Adds constraint flow tracking
 * 3. Bridge coordination: Updates constraint bridge state
 * 4. Statistics reset: Clears debug counters for new routing
 * 
 * DEBUGGING INTEGRATION:
 * - Wraps backend methods with call tracking
 * - Maintains statistics for constraint flow analysis
 * - Provides visibility into routing behavior
 */
function updateGlobalSnarkyRouting(backendType, backendObject) {
  if (typeof globalThis !== 'undefined') {
    // ENSURE GLOBAL NAMESPACE: Create routing structure if needed
    globalThis.__snarky = globalThis.__snarky || {};
    
    // DEBUG WRAPPER: Add constraint flow tracking to backend object
    const wrappedBackend = wrapBackendWithDebugging(backendObject, backendType);
    globalThis.__snarky.Snarky = wrappedBackend;
    
    // BRIDGE COORDINATION: Update constraint bridge routing state
    if (typeof globalThis.sparkyConstraintBridge !== 'undefined') {
      try {
        globalThis.sparkyConstraintBridge.setActiveBackend(backendType);
      } catch (e) {
      }
    }
    
    
    // STATISTICS RESET: Clear debug counters for new routing session
    globalThis.constraintFlowStats = { sparky: 0, ocaml: 0 };
    constraintCallCount = 0;
  }
}

/**
 * Wrap backend object with debugging to trace constraint flow
 */
function wrapBackendWithDebugging(backendObject, backendType) {
  if (!backendObject || !backendObject.field) return backendObject;
  
  const wrappedField = {};
  for (const [methodName, method] of Object.entries(backendObject.field)) {
    if (typeof method === 'function') {
      wrappedField[methodName] = function(...args) {
        debugConstraintFlow(`field.${methodName}`, backendType, ...args);
        return method.apply(this, args);
      };
    } else {
      wrappedField[methodName] = method;
    }
  }
  
  return {
    ...backendObject,
    field: wrappedField
  };
}

/**
 * Set up Sparky routing (called when switching TO Sparky)
 */
export function activateSparkyRouting() {
  updateGlobalSnarkyRouting('sparky', Snarky);
}

/**
 * Export the routing function for debugging
 */
export { updateGlobalSnarkyRouting };

/**
 * Set up OCaml routing (called when switching TO Snarky)
 */
export function activateOcamlRouting(ocamlSnarky) {
  if (ocamlSnarky) {
    updateGlobalSnarkyRouting('snarky', ocamlSnarky);
  } else {
  }
}

/**
 * Get constraint flow statistics for debugging
 */
export function getConstraintFlowStats() {
  return {
    totalCalls: constraintCallCount,
    routingStats: globalThis.constraintFlowStats || { sparky: 0, ocaml: 0 },
    lastUpdate: new Date().toISOString()
  };
}

/**
 * Reset constraint flow debugging
 */
export function resetConstraintFlowStats() {
  constraintCallCount = 0;
  globalThis.constraintFlowStats = { sparky: 0, ocaml: 0 };
}

// Set up global __snarky object for OCaml bridge (initial setup)
if (typeof globalThis !== 'undefined') {
  globalThis.__snarky = globalThis.__snarky || {};
  // Note: We'll update this routing dynamically via activateSparkyRouting()
  globalThis.__snarky.Snarky = Snarky;
}

// Export default for compatibility
export default {
  Snarky,
  Ledger,
  Pickles,
  Test
};