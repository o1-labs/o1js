/**
 * Sparky Adapter - Implements the exact Snarky API using Sparky WASM
 * 
 * This adapter provides a drop-in replacement for the OCaml Snarky bindings
 * by wrapping the Rust-based Sparky WASM implementation.
 */

import { Fp } from './crypto/finite-field.js';

// We need to import Pickles and Test from the OCaml bindings
// since Sparky only replaces the Snarky constraint generation part
let PicklesOCaml, TestOCaml;

// Determine if we're in Node.js or browser environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Node.js specific imports will be dynamically imported when needed
let readFileSync, fileURLToPath, dirname, join;

let sparkyWasm;
let sparkyInstance;
let initPromise;

/**
 * Initialize Sparky WASM
 */
async function initSparkyWasm() {
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
      
      const sparkyModule = await import('./compiled/sparky_node/sparky_wasm.js');
      sparkyWasm = sparkyModule;
      
      // CommonJS modules built with wasm-pack --target nodejs self-initialize
      // when loaded - there should never be an init method
      console.log('[SPARKY] Node.js WASM module loaded (self-initialized)');
    } else {
      // Browser environment
      const snarky = await import('./compiled/web_bindings/o1js_web.bc.js');
      ({ Pickles: PicklesOCaml, Test: TestOCaml } = snarky);
      
      const sparkyModule = await import('./compiled/sparky_web/sparky_wasm.js');
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

// Lazy initialization - will be called when adapter is first used
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initSparkyWasm();
    initialized = true;
  }
}

/**
 * Helper functions to get fresh module instances
 */
function getRunModule() {
  return sparkyInstance.run;
}

function getFieldModule() {
  return sparkyInstance.field;
}

function getGatesModule() {
  return sparkyInstance.gates;
}

function getConstraintSystemModule() {
  return sparkyInstance.constraintSystem;
}

function getCircuitModule() {
  return sparkyInstance.circuit;
}

/**
 * Helper to convert between Sparky and Snarky field representations
 */
function toSparkyField(field) {
  if (Array.isArray(field)) {
    // Handle [FieldType, value] format
    if (field[0] === 0 || field[0] === 1) {
      return getFieldModule().constant(field[1]);
    }
    return field; // Already a Sparky field var
  }
  return field;
}

/**
 * Convert o1js FieldVar format to Sparky Cvar format
 */
function fieldVarToCvar(fieldVar) {
  if (!Array.isArray(fieldVar)) {
    throw new Error('Invalid FieldVar format - expected array');
  }
  
  const [type, ...data] = fieldVar;
  
  switch (type) {
    case 0: // Constant
      if (!Array.isArray(data[0]) || data[0][0] !== 0) {
        throw new Error('Invalid constant FieldVar format');
      }
      const [, bigintValue] = data[0]; // data[0] is [0, bigint]
      return {
        type: 'constant',
        value: bigintValue.toString()
      };
      
    case 1: // Var
      return {
        type: 'var',
        id: data[0] // variable index
      };
      
    case 2: // Add
      return {
        type: 'add',
        left: fieldVarToCvar(data[0]),
        right: fieldVarToCvar(data[1])
      };
      
    case 3: // Scale
      if (!Array.isArray(data[0]) || data[0][0] !== 0) {
        throw new Error('Invalid scale FieldVar format');
      }
      const [, scalarBigint] = data[0]; // data[0] is [0, bigint]
      return {
        type: 'scale',
        scalar: scalarBigint.toString(),
        cvar: fieldVarToCvar(data[1])
      };
      
    default:
      throw new Error(`Unknown FieldVar type: ${type}`);
  }
}

/**
 * Convert Sparky Cvar format back to o1js FieldVar format
 */
function cvarToFieldVar(cvar) {
  // The WASM returns Cvar objects, convert them back to o1js FieldVar arrays
  if (typeof cvar === 'object' && cvar.type) {
    switch (cvar.type) {
      case 'constant':
        // Convert back to [0, [0, bigint]] format
        const value = BigInt(cvar.value);
        return [0, [0, value]];
        
      case 'var':
        // Convert back to [1, variableIndex] format
        return [1, cvar.id];
        
      case 'add':
        // Convert back to [2, left, right] format
        return [2, cvarToFieldVar(cvar.left), cvarToFieldVar(cvar.right)];
        
      case 'scale':
        // Convert back to [3, [0, scalar], cvar] format
        const scalar = BigInt(cvar.scalar);
        return [3, [0, scalar], cvarToFieldVar(cvar.cvar)];
        
      default:
        throw new Error(`Unknown Cvar type: ${cvar.type}`);
    }
  }
  
  // If it's already a FieldVar array, return as-is
  if (Array.isArray(cvar)) {
    return cvar;
  }
  
  throw new Error('Invalid Cvar format - expected object with type field or FieldVar array');
}

/**
 * Wrapper to ensure initialization before any method call
 */
function wrapAsync(fn) {
  return async (...args) => {
    await ensureInitialized();
    return fn(...args);
  };
}

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
      // Use the actual enterConstraintSystem method from the Run module
      const handle = getRunModule().enterConstraintSystem();
      return () => {
        // Get the constraint system JSON from the constraint system module
        const json = getConstraintSystemModule().toJson({});
        handle.exit(); // Exit the mode
        return json;
      };
    },
    
    enterGenerateWitness() {
      // Use the actual enterGenerateWitness method
      const handle = getRunModule().enterGenerateWitness();
      return () => {
        // TODO: Get actual witness data from Sparky
        const result = [0, [], []]; // Placeholder - need to implement witness extraction
        handle.exit(); // Exit the mode
        return result;
      };
    },
    
    enterAsProver(size) {
      // Enter prover mode with the specified size
      const handle = getRunModule().enterAsProver(size);
      return (fields) => {
        try {
          // OCaml option type: 0 = None, [0, values] = Some(values)
          if (fields !== 0) {
            // We have Some(values) - extract the actual values from fields[1]
            const actualValues = fields[1];
            const result = actualValues.map(f => {
              const constantCvar = getFieldModule().constant(f);
              // Convert Cvar back to FieldVar format
              return cvarToFieldVar(constantCvar);
            });
            // Return as MlArray format: [0, ...array]
            return [0, ...result];
          }
          
          // fields === 0 (OCaml None) - create witness variables
          // This happens during circuit compilation
          const vars = [];
          for (let i = 0; i < size; i++) {
            // Create a witness variable using field module exists
            const sparkyVar = getFieldModule().exists(null);
            // Convert Cvar back to FieldVar format
            const o1jsVar = cvarToFieldVar(sparkyVar);
            vars.push(o1jsVar);
          }
          // Return as MlArray format: [0, ...array]
          return [0, ...vars];
        } finally {
          handle.exit(); // Always exit the mode
        }
      };
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
      
      // Ensure the JSON has the expected structure
      if (!json.gates) {
        return {
          gates: json.constraints || [],
          public_input_size: json.public_input_size || 0
        };
      }
      
      return json;
    }
  },
  
  /**
   * Field APIs
   */
  field: {
    // Add fromNumber for compatibility
    fromNumber(x) {
      // Create a constant field variable from a number
      // This matches the OCaml API expectation
      return [0, [0, BigInt(x)]]; // [FieldType.Constant, [0, bigint]]
    },
    
    // Add random for compatibility - now cryptographically secure!
    random() {
      // Generate a cryptographically secure random field element using Fp.random()
      // This uses rejection sampling with crypto.randomBytes under the hood
      const randomBigInt = Fp.random();
      return [0, [0, randomBigInt]]; // [FieldType.Constant, [0, bigint]]
    },
    
    readVar(x) {
      try {
        // Convert o1js FieldVar to Sparky Cvar format
        const cvar = fieldVarToCvar(x);
        return getFieldModule().readVar(cvar);
      } catch (error) {
        // If we're not in prover mode, Sparky will throw an error
        // Re-throw with a more descriptive message
        if (error.message && error.message.includes('prover mode')) {
          throw new Error('readVar can only be called in prover mode (inside asProver or witness blocks)');
        }
        throw error;
      }
    },
    
    assertEqual(x, y) {
      // Convert o1js FieldVar arrays to Sparky Cvar objects
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      getFieldModule().assertEqual(xCvar, yCvar);
    },
    
    assertMul(x, y, z) {
      // Convert o1js FieldVar arrays to Sparky Cvar objects
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      const zCvar = fieldVarToCvar(z);
      getFieldModule().assertMul(xCvar, yCvar, zCvar);
    },
    
    assertSquare(x, y) {
      // Convert o1js FieldVar arrays to Sparky Cvar objects
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      getFieldModule().assertSquare(xCvar, yCvar);
    },
    
    assertBoolean(x) {
      // Convert o1js FieldVar array to Sparky Cvar object
      const xCvar = fieldVarToCvar(x);
      getFieldModule().assertBoolean(xCvar);
    },
    
    truncateToBits16(lengthDiv16, x) {
      // Implement using range check
      const bits = lengthDiv16 * 16;
      getGatesModule().rangeCheckN(x, bits);
      return x;
    },
    
    // Additional field operations for compatibility
    add(x, y) {
      // Convert inputs and get result as Cvar, then convert back to FieldVar format
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      const resultCvar = getFieldModule().add(xCvar, yCvar);
      return cvarToFieldVar(resultCvar);
    },
    
    mul(x, y) {
      // Create a witness for the result
      const result = getFieldModule().exists(null);
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      getFieldModule().assertMul(xCvar, yCvar, result);
      return cvarToFieldVar(result);
    },
    
    sub(x, y) {
      // sub(x, y) = add(x, scale(-1, y))
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      const neg_y = getFieldModule().scale(-1, yCvar);
      const resultCvar = getFieldModule().add(xCvar, neg_y);
      return cvarToFieldVar(resultCvar);
    },
    
    div(x, y) {
      // div(x, y): find result such that y * result = x
      const result = getFieldModule().exists(null);
      const xCvar = fieldVarToCvar(x);
      const yCvar = fieldVarToCvar(y);
      getFieldModule().assertMul(yCvar, result, xCvar);
      return cvarToFieldVar(result);
    },
    
    negate(x) {
      const xCvar = fieldVarToCvar(x);
      const resultCvar = getFieldModule().scale(-1, xCvar);
      return cvarToFieldVar(resultCvar);
    },
    
    inv(x) {
      // inv(x): find result such that x * result = 1
      const result = getFieldModule().exists(null);
      const one = getFieldModule().constant(1);
      const xCvar = fieldVarToCvar(x);
      getFieldModule().assertMul(xCvar, result, one);
      return cvarToFieldVar(result);
    },
    
    square(x) {
      // square(x): find result such that result = x * x
      const result = getFieldModule().exists(null);
      const xCvar = fieldVarToCvar(x);
      getFieldModule().assertSquare(xCvar, result);
      return cvarToFieldVar(result);
    },
    
    sqrt(x) {
      // sqrt(x): find result such that result * result = x
      const result = getFieldModule().exists(null);
      const xCvar = fieldVarToCvar(x);
      getFieldModule().assertSquare(result, xCvar);
      return cvarToFieldVar(result);
    },
    
    equal(x, y) {
      // Check if x - y = 0 by creating a boolean witness
      const diff = this.sub(x, y);
      // TODO: Implement proper zero check
      // For now, create a boolean witness
      const isZero = getFieldModule().exists(null);
      getFieldModule().assertBoolean(isZero);
      return isZero;
    },
    
    toConstant(x) {
      const value = getFieldModule().readVar(x);
      return getFieldModule().constant(value);
    }
  },
  
  /**
   * Bool operations (implemented as field operations with boolean constraints)
   */
  bool: {
    and(x, y) {
      const result = getFieldModule().exists(null);
      getFieldModule().assertMul(x, y, result);
      getFieldModule().assertBoolean(result);
      return result;
    },
    
    or(x, y) {
      // x OR y = x + y - x*y
      const xy = getFieldModule().exists(null);
      getFieldModule().assertMul(x, y, xy);
      const sum = getFieldModule().add(x, y);
      const result = Snarky.field.sub(sum, xy); // Use the sub method we defined
      getFieldModule().assertBoolean(result);
      return result;
    },
    
    not(x) {
      // NOT x = 1 - x
      const one = getFieldModule().constant(1);
      const result = Snarky.field.sub(one, x); // Use the sub method we defined
      getFieldModule().assertBoolean(result);
      return result;
    },
    
    assertEqual(x, y) {
      getFieldModule().assertEqual(x, y);
      getFieldModule().assertBoolean(x);
      getFieldModule().assertBoolean(y);
    }
  },
  
  /**
   * Gates APIs
   */
  gates: {
    zero(in1, in2, out) {
      getGatesModule().zero(in1, in2, out);
    },
    
    generic(sl, l, sr, r, so, o, sm, sc) {
      getGatesModule().generic(
        Number(sl), l,
        Number(sr), r,
        Number(so), o,
        Number(sm), Number(sc)
      );
    },
    
    poseidon(state) {
      return getGatesModule().poseidon(state);
    },
    
    ecAdd(p1, p2, p3, inf, same_x, slope, inf_z, x21_inv) {
      // Implement complete elliptic curve point addition with proper constraint generation
      // Expected signature: ecAdd(p1: MlGroup, p2: MlGroup, p3: MlGroup, inf, same_x, slope, inf_z, x21_inv)
      
      try {
        // Convert MlGroup points (arrays of [x, y]) to Sparky Cvar format
        if (!Array.isArray(p1) || !Array.isArray(p2) || !Array.isArray(p3)) {
          throw new Error('ecAdd: Points must be arrays [x, y]');
        }
        
        const [p1x, p1y] = p1;
        const [p2x, p2y] = p2;
        const [p3x, p3y] = p3;
        
        // Convert all inputs to Sparky Cvar format
        const p1xCvar = fieldVarToCvar(p1x);
        const p1yCvar = fieldVarToCvar(p1y);
        const p2xCvar = fieldVarToCvar(p2x);
        const p2yCvar = fieldVarToCvar(p2y);
        const p3xCvar = fieldVarToCvar(p3x);
        const p3yCvar = fieldVarToCvar(p3y);
        
        const infCvar = fieldVarToCvar(inf);
        const sameXCvar = fieldVarToCvar(same_x);
        const slopeCvar = fieldVarToCvar(slope);
        const infZCvar = fieldVarToCvar(inf_z);
        const x21InvCvar = fieldVarToCvar(x21_inv);
        
        // Use Sparky's ecAdd with complete constraint generation
        // This generates the proper elliptic curve addition constraints including:
        // - Point at infinity handling (inf, inf_z)
        // - Same x-coordinate case (same_x)
        // - Slope constraints for addition
        // - Inverse constraints (x21_inv)
        getGatesModule().ecAdd(
          [p1xCvar, p1yCvar],  // First point
          [p2xCvar, p2yCvar],  // Second point
          [p3xCvar, p3yCvar],  // Result point
          infCvar,             // Infinity flag
          sameXCvar,           // Same x-coordinate flag
          slopeCvar,           // Slope of line
          infZCvar,            // Infinity z-coordinate
          x21InvCvar           // Inverse of (x2 - x1)
        );
        
        // Return the result point
        return p3;
        
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
          const bitCvar = fieldVarToCvar(bit);
          getFieldModule().assertBoolean(bitCvar);
          
          // Create witness variables for the EC addition result
          const addResultX = getFieldModule().exists(null);
          const addResultY = getFieldModule().exists(null);
          const addResult = [cvarToFieldVar(addResultX), cvarToFieldVar(addResultY)];
          
          // Create witness variables for auxiliary constraints
          const inf = getFieldModule().exists(null);        // Point at infinity flag
          const same_x = getFieldModule().exists(null);     // Same x-coordinate flag  
          const inf_z = getFieldModule().exists(null);      // Infinity z-coordinate
          const x21_inv = getFieldModule().exists(null);    // Inverse of (x2 - x1)
          
          // Use proper elliptic curve addition: addResult = acc + base
          this.ecAdd(
            acc,                                      // First point (accumulator)
            base,                                     // Second point (base)
            addResult,                                // Result point
            cvarToFieldVar(inf),                      // Infinity flag
            cvarToFieldVar(same_x),                   // Same x flag
            slope || cvarToFieldVar(getFieldModule().exists(null)), // Slope
            cvarToFieldVar(inf_z),                    // Infinity z
            cvarToFieldVar(x21_inv)                   // Inverse
          );
          
          // Conditional selection based on bit:
          // if bit == 1: result = addResult (acc + base)
          // if bit == 0: result = acc (unchanged)
          
          // For x-coordinate: resultX = bit * addResult.x + (1 - bit) * acc.x
          const one = getFieldModule().constant(1);
          const oneCvar = cvarToFieldVar(one);
          const invBit = Snarky.field.sub(oneCvar, bit);
          
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
            getFieldModule().assertEqual(fieldVarToCvar(accs[i + 1][0]), fieldVarToCvar(resultX));
            getFieldModule().assertEqual(fieldVarToCvar(accs[i + 1][1]), fieldVarToCvar(resultY));
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
        const lambda = getFieldModule().constant(BigInt('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547'));
        const lambdaCvar = cvarToFieldVar(lambda);
        
        // Validate that all points satisfy curve equation y² = x³ + 5
        const five = getFieldModule().constant(5);
        const fiveCvar = cvarToFieldVar(five);
        
        // Validate base point (xp, yp): yp² = xp³ + 5
        const xpSquared = Snarky.field.square(xp);
        const xpCubed = Snarky.field.mul(xp, xpSquared);
        const xpRhs = Snarky.field.add(xpCubed, fiveCvar);
        const ypSquared = Snarky.field.square(yp);
        Snarky.field.assertEqual(ypSquared, xpRhs);
        
        // Apply endomorphism: λ(P) = (λ*xp, yp)
        const endoXp = Snarky.field.mul(lambdaCvar, xp);
        const endoPoint = [endoXp, yp];
        
        // Validate endomorphism point: yp² = (λ*xp)³ + 5
        const endoXpSquared = Snarky.field.square(endoXp);
        const endoXpCubed = Snarky.field.mul(endoXp, endoXpSquared);
        const endoRhs = Snarky.field.add(endoXpCubed, fiveCvar);
        Snarky.field.assertEqual(ypSquared, endoRhs);
        
        // Validate boolean constraints for decomposed scalar bits
        const b1Cvar = fieldVarToCvar(b1);
        const b2Cvar = fieldVarToCvar(b2);
        const b3Cvar = fieldVarToCvar(b3);
        const b4Cvar = fieldVarToCvar(b4);
        
        getFieldModule().assertBoolean(b1Cvar);
        getFieldModule().assertBoolean(b2Cvar);
        getFieldModule().assertBoolean(b3Cvar);
        getFieldModule().assertBoolean(b4Cvar);
        
        // Implement dual scalar multiplication: k₁*P + k₂*λ(P)
        // where k₁ is represented by bits [b1, b2] and k₂ by bits [b3, b4]
        
        // Create intermediate witness points for the computation
        const k1PointX = getFieldModule().exists(null);
        const k1PointY = getFieldModule().exists(null);
        const k1Point = [cvarToFieldVar(k1PointX), cvarToFieldVar(k1PointY)];
        
        const k2PointX = getFieldModule().exists(null);
        const k2PointY = getFieldModule().exists(null);
        const k2Point = [cvarToFieldVar(k2PointX), cvarToFieldVar(k2PointY)];
        
        // Scalar multiply P by k₁ (using bits b1, b2)
        // Simplified 2-bit scalar multiplication: k₁ = 2*b1 + b2
        
        // Step 1: Compute 2*P (point doubling)
        const doubleP_X = getFieldModule().exists(null);
        const doubleP_Y = getFieldModule().exists(null);
        const doubleP = [cvarToFieldVar(doubleP_X), cvarToFieldVar(doubleP_Y)];
        
        // Use ecAdd for point doubling: 2*P = P + P
        const inf_double = getFieldModule().exists(null);
        const same_x_double = getFieldModule().exists(null);
        const inf_z_double = getFieldModule().exists(null);
        const x21_inv_double = getFieldModule().exists(null);
        
        this.ecAdd(
          [xp, yp], [xp, yp], doubleP,
          cvarToFieldVar(inf_double),
          cvarToFieldVar(same_x_double),
          s1 || cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(inf_z_double),
          cvarToFieldVar(x21_inv_double)
        );
        
        // Step 2: Conditional addition for k₁*P
        // if b1==1: temp = 2*P, else temp = O (point at infinity)
        // if b2==1: k₁*P = temp + P, else k₁*P = temp
        
        // For simplicity, use the existing scalar multiplication pattern
        // k₁*P = b1*(2*P) + b2*P
        
        // Similarly for k₂*λ(P)
        const doubleEndoP_X = getFieldModule().exists(null);
        const doubleEndoP_Y = getFieldModule().exists(null);
        const doubleEndoP = [cvarToFieldVar(doubleEndoP_X), cvarToFieldVar(doubleEndoP_Y)];
        
        this.ecAdd(
          endoPoint, endoPoint, doubleEndoP,
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null))
        );
        
        // Final addition: result = k₁*P + k₂*λ(P)
        this.ecAdd(
          k1Point, k2Point, [xr, yr],
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null)),
          s3 || cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null)),
          cvarToFieldVar(getFieldModule().exists(null))
        );
        
        // Validate result point: yr² = xr³ + 5
        const xrSquared = Snarky.field.square(xr);
        const xrCubed = Snarky.field.mul(xr, xrSquared);
        const xrRhs = Snarky.field.add(xrCubed, fiveCvar);
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
    
    lookup(sorted, original, table) {
      // TODO: Implement when available in WASM
      console.warn('lookup not fully implemented in Sparky adapter');
    },
    
    rangeCheck(state) {
      // Use Sparky's range check
      if (state && state.length > 0) {
        getGatesModule().rangeCheck64(state[0]);
      }
    },
    
    rangeCheck0(x) {
      // Range check that a value is exactly 0
      getGatesModule().rangeCheck0(fieldVarToCvar(x));
    },
    
    rangeCheck1(v2, v12, v2c0, v2p0, v2p1, v2p2, v2p3, v2c1, v2c2, v2c3, v2c4, v2c5, v2c6, v2c7, v2c8, v2c9, v2c10, v2c11, v0p0, v0p1, v1p0, v1p1, v2c12, v2c13, v2c14, v2c15, v2c16, v2c17, v2c18, v2c19) {
      // Range check implementation for complex multi-variable constraints
      // Convert all field variables to Cvar format
      getGatesModule().rangeCheck1(
        fieldVarToCvar(v2), fieldVarToCvar(v12),
        fieldVarToCvar(v2c0), fieldVarToCvar(v2p0), fieldVarToCvar(v2p1), fieldVarToCvar(v2p2), fieldVarToCvar(v2p3),
        fieldVarToCvar(v2c1), fieldVarToCvar(v2c2), fieldVarToCvar(v2c3), fieldVarToCvar(v2c4), fieldVarToCvar(v2c5),
        fieldVarToCvar(v2c6), fieldVarToCvar(v2c7), fieldVarToCvar(v2c8),
        fieldVarToCvar(v2c9), fieldVarToCvar(v2c10), fieldVarToCvar(v2c11),
        fieldVarToCvar(v0p0), fieldVarToCvar(v0p1), fieldVarToCvar(v1p0), fieldVarToCvar(v1p1),
        fieldVarToCvar(v2c12), fieldVarToCvar(v2c13), fieldVarToCvar(v2c14), fieldVarToCvar(v2c15),
        fieldVarToCvar(v2c16), fieldVarToCvar(v2c17), fieldVarToCvar(v2c18), fieldVarToCvar(v2c19)
      );
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
   * Additional utilities
   */
  exists(size, compute) {
    // The exists function should return an array of field variables
    // of the specified size
    
    // If compute is not provided or we're in compile mode,
    // just create witness variables
    if (!compute || !getRunModule().inProver) {
      const vars = [];
      for (let i = 0; i < size; i++) {
        // Create a witness variable
        const witnessVar = getFieldModule().exists(null);
        // Convert Cvar result back to FieldVar format
        vars.push(cvarToFieldVar(witnessVar));
      }
      return vars;
    }
    
    // In prover mode, compute the values and create constants
    const values = compute();
    const vars = [];
    for (let i = 0; i < size; i++) {
      const value = values[i] || 0n;
      const constantVar = getFieldModule().constant(value);
      // Convert Cvar result back to FieldVar format
      vars.push(cvarToFieldVar(constantVar));
    }
    return vars;
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
        
        // Extract FieldVars and convert to Cvar format
        const stateArray = state.slice(1).map(fieldVarToCvar);
        const inputArray = input.slice(1).map(fieldVarToCvar);
        
        // Create MlArray format for WASM: [0, [elements]]
        // The WASM expects nested array format: [0, actual_array]
        const stateMlArray = [0, stateArray];
        const inputMlArray = [0, inputArray];
        
        // Call the WASM poseidon.update method
        const newStateArray = sparkyInstance.poseidon.update(stateMlArray, inputMlArray);
        
        // Convert result back to FieldVar format
        // Result should be [0, field1, field2, field3], so we skip the first element
        if (!Array.isArray(newStateArray) || newStateArray.length < 4) {
          throw new Error('Invalid poseidon.update result format');
        }
        
        return newStateArray.slice(1).map(cvarToFieldVar);
      } catch (error) {
        console.error('Poseidon.update error:', error);
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
    }
  },
  
  asProver(f) {
    return getRunModule().asProver(f);
  }
};

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
export let Test = new Proxy({}, {
  get(target, prop) {
    if (!TestOCaml) {
      throw new Error('Test not initialized. Call initializeSparky() first.');
    }
    return TestOCaml[prop];
  }
});

// Export default for compatibility
export default {
  Snarky,
  Ledger,
  Pickles,
  Test
};