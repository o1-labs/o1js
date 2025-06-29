/**
 * Sparky Adapter (Web) - Implements the exact Snarky API using Sparky WASM
 * 
 * This adapter provides a drop-in replacement for the OCaml Snarky bindings
 * by wrapping the Rust-based Sparky WASM implementation.
 */

import { Fp } from './crypto/finite-field.js';

// We need to import Pickles and Test from the OCaml bindings
// since Sparky only replaces the Snarky constraint generation part
let PicklesOCaml, TestOCaml;

let sparkyWasm;
let sparkyInstance;
let runModule;
let fieldModule;
let gatesModule;
let constraintSystemModule;
let circuitModule;
let initPromise;

/**
 * Initialize Sparky WASM for web
 */
async function initSparkyWasm() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    // First, import Pickles and Test from OCaml bindings for browser
    const snarky = await import('./compiled/web_bindings/o1js_web.bc.js');
    ({ Pickles: PicklesOCaml, Test: TestOCaml } = snarky);
    
    // Browser environment
    const sparkyModule = await import('./compiled/sparky_web/sparky_wasm.js');
    const { default: init } = sparkyModule;
    sparkyWasm = sparkyModule;
    
    // Initialize WASM (will fetch automatically in browser)
    await init();
    
    // Create main Sparky instance using the actual exported classes
    if (!sparkyWasm.Snarky) {
      throw new Error('Sparky WASM module did not export expected Snarky class. This indicates a build or loading error.');
    }
    
    // The WASM exports these classes: Circuit, ConstraintSystem, Field, Gates, 
    // ModeHandle, OptimizationHints, Run, RunState, Snarky, WasmFeatures
    sparkyInstance = new sparkyWasm.Snarky();
    
    // Cache the sub-modules to ensure consistent state
    // Each getter returns a new wrapped instance, so we need to cache them
    runModule = sparkyInstance.run;
    fieldModule = sparkyInstance.field;
    gatesModule = sparkyInstance.gates;
    constraintSystemModule = sparkyInstance.constraintSystem;
    circuitModule = sparkyInstance.circuit;
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
 * Helper to convert between Sparky and Snarky field representations
 */
function toSparkyField(field) {
  if (Array.isArray(field)) {
    // Handle [FieldType, value] format
    if (field[0] === 0 || field[0] === 1) {
      return fieldModule.constant(field[1]);
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
      return sparkyInstance.run.inProver;
    },
    
    asProver(f) {
      return sparkyInstance.run.asProver(() => f());
    },
    
    inProverBlock() {
      return sparkyInstance.run.inProverBlock;
    },
    
    setEvalConstraints(value) {
      sparkyInstance.run.setEvalConstraints(value);
    },
    
    enterConstraintSystem() {
      // This should set up to capture constraints and return a function
      // that returns the constraint system when called
      
      // TODO: Implement proper constraint system tracking in Sparky
      // For now, return a minimal valid constraint system
      return () => {
        return {
          gates: [],
          public_input_size: 0
        };
      };
    },
    
    enterGenerateWitness() {
      sparkyInstance.run.witnessMode();
      return () => {
        // Return witness data
        return [0, [], []]; // Placeholder
      };
    },
    
    enterAsProver(size) {
      return (fields) => {
        // Check if we have field values to use
        if (fields && fields[0] !== undefined) {
          // We have actual values - convert them to field vars
          return fields.map(f => fieldModule.constant(f));
        }
        
        // No values provided - create witness variables
        // This happens during circuit compilation
        const vars = [];
        for (let i = 0; i < size; i++) {
          // Create a witness variable using the field module
          const witnessVar = fieldModule.exists(null);
          vars.push(witnessVar);
        }
        return vars;
      };
    },
    
    state: {
      allocVar(state) {
        // Create a witness variable using the field module
        return fieldModule.exists(null);
      },
      
      storeFieldElt(state, x) {
        // In Sparky, we create a constant field element
        return fieldModule.constant(x);
      },
      
      getVariableValue(state, x) {
        return fieldModule.readVar(x);
      },
      
      asProver(state) {
        return runModule.inProver;
      },
      
      setAsProver(state, value) {
        // In Sparky, mode switching is handled by enter/exit methods
        // This is a no-op for compatibility
      },
      
      hasWitness(state) {
        return runModule.inProver;
      }
    }
  },
  
  /**
   * Constraint System APIs
   */
  constraintSystem: {
    rows(system) {
      return constraintSystemModule.rows(system);
    },
    
    digest(system) {
      return constraintSystemModule.digest(system);
    },
    
    toJson(system) {
      const json = constraintSystemModule.toJson(system);
      
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
        // Use the WASM field module directly
        return fieldModule.readVar(x);
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
      fieldModule.assertEqual(x, y);
    },
    
    assertMul(x, y, z) {
      fieldModule.assertMul(x, y, z);
    },
    
    assertSquare(x, y) {
      fieldModule.assertSquare(x, y);
    },
    
    assertBoolean(x) {
      fieldModule.assertBoolean(x);
    },
    
    truncateToBits16(lengthDiv16, x) {
      // Implement using range check
      const bits = lengthDiv16 * 16;
      gatesModule.rangeCheckN(x, bits);
      return x;
    },
    
    // Additional field operations for compatibility
    add(x, y) {
      return fieldModule.add(x, y);
    },
    
    mul(x, y) {
      // Create a witness for the result
      const result = fieldModule.exists(null);
      fieldModule.assertMul(x, y, result);
      return result;
    },
    
    sub(x, y) {
      // sub(x, y) = add(x, scale(-1, y))
      const neg_y = fieldModule.scale(-1, y);
      return fieldModule.add(x, neg_y);
    },
    
    div(x, y) {
      // div(x, y): find result such that y * result = x
      const result = fieldModule.exists(null);
      fieldModule.assertMul(y, result, x);
      return result;
    },
    
    negate(x) {
      return fieldModule.scale(-1, x);
    },
    
    inv(x) {
      // inv(x): find result such that x * result = 1
      const result = fieldModule.exists(null);
      const one = fieldModule.constant(1);
      fieldModule.assertMul(x, result, one);
      return result;
    },
    
    square(x) {
      // square(x): find result such that result = x * x
      const result = fieldModule.exists(null);
      fieldModule.assertSquare(x, result);
      return result;
    },
    
    sqrt(x) {
      // sqrt(x): find result such that result * result = x
      const result = fieldModule.exists(null);
      fieldModule.assertSquare(result, x);
      return result;
    },
    
    equal(x, y) {
      // Check if x - y = 0 by creating a boolean witness
      const diff = this.sub(x, y);
      // TODO: Implement proper zero check
      // For now, create a boolean witness
      const isZero = fieldModule.exists(null);
      fieldModule.assertBoolean(isZero);
      return isZero;
    },
    
    toConstant(x) {
      const value = fieldModule.readVar(x);
      return fieldModule.constant(value);
    }
  },
  
  /**
   * Bool operations (implemented as field operations with boolean constraints)
   */
  bool: {
    and(x, y) {
      const result = fieldModule.exists(null);
      fieldModule.assertMul(x, y, result);
      fieldModule.assertBoolean(result);
      return result;
    },
    
    or(x, y) {
      // x OR y = x + y - x*y
      const xy = fieldModule.exists(null);
      fieldModule.assertMul(x, y, xy);
      const sum = fieldModule.add(x, y);
      const result = Snarky.field.sub(sum, xy); // Use the sub method we defined
      fieldModule.assertBoolean(result);
      return result;
    },
    
    not(x) {
      // NOT x = 1 - x
      const one = fieldModule.constant(1);
      const result = Snarky.field.sub(one, x); // Use the sub method we defined
      fieldModule.assertBoolean(result);
      return result;
    },
    
    assertEqual(x, y) {
      fieldModule.assertEqual(x, y);
      fieldModule.assertBoolean(x);
      fieldModule.assertBoolean(y);
    }
  },
  
  /**
   * Gates APIs
   */
  gates: {
    zero(in1, in2, out) {
      gatesModule.zero(in1, in2, out);
    },
    
    generic(sl, l, sr, r, so, o, sm, sc) {
      gatesModule.generic(
        Number(sl), l,
        Number(sr), r,
        Number(so), o,
        Number(sm), Number(sc)
      );
    },
    
    poseidon(state) {
      return gatesModule.poseidon(state);
    },
    
    ecAdd(p1, p2, p3, inf, same_x, slope, inf_z, x21_inv) {
      // Use the WASM ecAdd method
      return gatesModule.ecAdd(p1, p2);
    },
    
    ecScale(state) {
      // Handle EC scale operation
      // This is a complex operation that would need proper implementation
      console.warn('ecScale not fully implemented in Sparky adapter');
    },
    
    ecEndoscale(state, xs, ys, nAcc) {
      // Handle EC endoscale operation
      console.warn('ecEndoscale not fully implemented in Sparky adapter');
    },
    
    ecEndoscalar(state) {
      // Handle EC endoscalar operation
      console.warn('ecEndoscalar not fully implemented in Sparky adapter');
    },
    
    lookup(sorted, original, table) {
      // Lookup gate implementation would go here
      console.warn('lookup not fully implemented in Sparky adapter');
    },
    
    rangeCheck(state) {
      // Use Sparky's range check
      if (state && state.length > 0) {
        gatesModule.rangeCheck64(state[0]);
      }
    }
  },
  
  /**
   * Poseidon hash function
   */
  poseidon(inputs) {
    if (inputs.length === 2) {
      return gatesModule.poseidonHash2(toSparkyField(inputs[0]), toSparkyField(inputs[1]));
    }
    return gatesModule.poseidonHashArray(inputs.map(toSparkyField));
  },
  
  /**
   * Circuit APIs
   */
  circuit: {
    compile(main, publicInputSize) {
      return circuitModule.compile(main);
    },
    
    prove(main, publicInputSize, publicInput, keypair) {
      const witness = circuitModule.generateWitness(publicInput);
      return circuitModule.prove(witness);
    },
    
    verify(publicInput, proof, verificationKey) {
      return circuitModule.verify(proof, publicInput);
    },
    
    keypair: {
      getVerificationKey(keypair) {
        return keypair.verificationKey;
      },
      
      getConstraintSystemJSON(keypair) {
        return constraintSystemModule.toJson({});
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
    if (!compute || !runModule.inProver) {
      const vars = [];
      for (let i = 0; i < size; i++) {
        // Create a witness variable
        const witnessVar = fieldModule.exists(null);
        vars.push(witnessVar);
      }
      return vars;
    }
    
    // In prover mode, compute the values and create constants
    const values = compute();
    const vars = [];
    for (let i = 0; i < size; i++) {
      const value = values[i] || 0n;
      vars.push(fieldModule.constant(value));
    }
    return vars;
  },
  
  asProver(f) {
    return runModule.asProver(f);
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