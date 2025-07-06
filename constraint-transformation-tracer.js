/**
 * Constraint Transformation Tracer
 * 
 * Instruments Sparky's constraint transformation pipeline to understand
 * exactly where 12 gates become 9 constraints.
 */

import { Field, ZkProgram, Poseidon, switchBackend, Provable } from './dist/node/index.js';

// Test program that triggers the 12→9 transformation
const HashProgram = ZkProgram({
  name: 'HashProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hash: {
      privateInputs: [Field, Field, Field],
      async method(publicInput, a, b, c) {
        const hash1 = Poseidon.hash([publicInput, a]);
        const hash2 = Poseidon.hash([hash1, b]);
        const hash3 = Poseidon.hash([hash2, c]);
        return { publicOutput: hash3 };
      },
    },
  },
});

/**
 * Instrument Sparky's constraint system operations
 */
function instrumentSparkyConstraintSystem() {
  console.log('🔧 Instrumenting Sparky constraint system...');
  
  // Get access to Sparky internals
  const sparkyBridge = globalThis.sparkyConstraintBridge;
  if (!sparkyBridge) {
    console.log('❌ Sparky bridge not available');
    return;
  }
  
  // Hook into constraint system operations
  const originalGetFullConstraintSystem = sparkyBridge.getFullConstraintSystem;
  
  sparkyBridge.getFullConstraintSystem = function(...args) {
    console.log('📊 getFullConstraintSystem() called');
    
    // Get the original result
    const result = originalGetFullConstraintSystem.apply(this, args);
    
    if (result && result.gates) {
      console.log(`  ↳ Returning ${result.gates.length} gates to OCaml`);
      console.log(`  ↳ constraintCount: ${result.constraintCount}`);
      console.log(`  ↳ rowCount: ${result.rowCount}`);
      
      // Analyze gate distribution
      const gateTypes = {};
      result.gates.forEach(gate => {
        const type = gate.typ || gate.type || 'unknown';
        gateTypes[type] = (gateTypes[type] || 0) + 1;
      });
      console.log(`  ↳ Gate types:`, gateTypes);
    }
    
    return result;
  };
  
  console.log('✅ Sparky constraint system instrumented');
}

/**
 * Deep dive into Sparky's internal constraint generation
 */
async function traceSparkyInternals() {
  console.log('🔍 Tracing Sparky internal constraint generation...');
  
  try {
    // Get direct access to Sparky WASM
    const sparky = globalThis.__sparky || globalThis.sparky;
    if (!sparky) {
      console.log('❌ Sparky WASM not accessible');
      return;
    }
    
    console.log('📋 Available Sparky methods:', Object.keys(sparky));
    
    // Look for constraint system methods
    if (sparky.run) {
      console.log('🔧 Sparky.run methods:', Object.keys(sparky.run));
    }
    
    // Try to access constraint compiler directly
    if (sparky.constraintSystem) {
      console.log('🔧 Sparky.constraintSystem methods:', Object.keys(sparky.constraintSystem));
    }
    
  } catch (error) {
    console.log(`❌ Failed to access Sparky internals: ${error.message}`);
  }
}

/**
 * Analyze constraint system with step-by-step tracing
 */
async function stepByStepConstraintAnalysis() {
  console.log('🔍 Step-by-step constraint analysis...');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  console.log('\n📊 Step 1: Direct Provable.constraintSystem analysis...');
  try {
    const result = await Provable.constraintSystem(() => {
      const publicInput = Field(1);
      const a = Field(2);
      const b = Field(3);
      const c = Field(4);
      
      console.log('  Executing hash1 = Poseidon.hash([publicInput, a])...');
      const hash1 = Poseidon.hash([publicInput, a]);
      
      console.log('  Executing hash2 = Poseidon.hash([hash1, b])...');
      const hash2 = Poseidon.hash([hash1, b]);
      
      console.log('  Executing hash3 = Poseidon.hash([hash2, c])...');
      const hash3 = Poseidon.hash([hash2, c]);
      
      return hash3;
    });
    
    console.log('\n📋 Provable.constraintSystem result:');
    console.log(`  rows: ${result.rows}`);
    console.log(`  gates length: ${result.gates.length}`);
    console.log(`  publicInputSize: ${result.publicInputSize}`);
    
    // Detailed gate analysis
    console.log('\n🔍 Gate-by-gate analysis:');
    result.gates.forEach((gate, i) => {
      console.log(`  Gate ${i}:`);
      console.log(`    type: ${gate.typ || gate.type || 'unknown'}`);
      if (gate.wires) {
        console.log(`    wires: ${Object.keys(gate.wires).join(', ')}`);
      }
      if (gate.coeffs && gate.coeffs.length <= 10) {
        console.log(`    coeffs: [${gate.coeffs.join(', ')}]`);
      } else if (gate.coeffs) {
        console.log(`    coeffs: ${gate.coeffs.length} coefficients`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Provable.constraintSystem failed: ${error.message}`);
  }
  
  console.log('\n📊 Step 2: ZkProgram compilation analysis...');
  try {
    // Instrument before compilation
    instrumentSparkyConstraintSystem();
    
    const compileResult = await HashProgram.compile();
    console.log('✅ HashProgram compilation completed');
    
    // Get analyzeMethods result
    const analysis = await HashProgram.analyzeMethods();
    console.log('\n📋 analyzeMethods result:');
    console.log(`  hash.rows: ${analysis.hash.rows}`);
    console.log(`  hash.gates.length: ${analysis.hash.gates.length}`);
    
    // Compare with Sparky bridge result
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    if (sparkyBridge) {
      const fullSystem = sparkyBridge.getFullConstraintSystem();
      if (fullSystem) {
        console.log('\n📋 Sparky bridge result:');
        console.log(`  gates.length: ${fullSystem.gates.length}`);
        console.log(`  constraintCount: ${fullSystem.constraintCount}`);
        console.log(`  rowCount: ${fullSystem.rowCount}`);
        
        // Check if gates are different between methods
        console.log('\n🔍 Constraint discrepancy analysis:');
        console.log(`  analyzeMethods rows: ${analysis.hash.rows}`);
        console.log(`  sparkyBridge gates: ${fullSystem.gates.length}`);
        console.log(`  sparkyBridge constraints: ${fullSystem.constraintCount}`);
        
        if (analysis.hash.rows !== fullSystem.constraintCount) {
          console.log(`  ⚠️  DISCREPANCY DETECTED: ${analysis.hash.rows} vs ${fullSystem.constraintCount}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ ZkProgram analysis failed: ${error.message}`);
  }
}

/**
 * Investigate OCaml constraint processing
 */
async function investigateOCamlProcessing() {
  console.log('\n🔍 Investigating OCaml constraint processing...');
  
  try {
    // Access OCaml Snarky object
    const snarky = globalThis.__snarky?.Snarky;
    if (snarky) {
      console.log('📋 OCaml Snarky object available');
      console.log('  Methods:', Object.keys(snarky));
      
      if (snarky.constraintSystem) {
        console.log('  constraintSystem methods:', Object.keys(snarky.constraintSystem));
      }
      
      if (snarky.run) {
        console.log('  run methods:', Object.keys(snarky.run));
      }
      
      // Try to understand how OCaml processes constraints
      if (snarky.constraintSystem && snarky.constraintSystem.digest) {
        console.log('  digest method available - this might be where constraint counting happens');
      }
    }
    
    // Check for constraint system globals
    const constraintSystemGlobals = Object.keys(globalThis).filter(key => 
      key.includes('constraint') || key.includes('Constraint')
    );
    console.log('📋 Constraint-related globals:', constraintSystemGlobals);
    
  } catch (error) {
    console.log(`❌ OCaml investigation failed: ${error.message}`);
  }
}

/**
 * Compare raw constraint data between what Sparky generates and what OCaml sees
 */
async function compareRawConstraintData() {
  console.log('\n🔍 Comparing raw constraint data...');
  
  // Switch to Sparky and generate constraints
  await switchBackend('sparky');
  
  try {
    // Access Sparky's constraint system directly
    const sparky = globalThis.__sparky || globalThis.sparky;
    if (sparky && sparky.run) {
      console.log('📋 Attempting direct Sparky constraint access...');
      
      // Try to get raw constraint system state
      if (sparky.run.getConstraintSystem) {
        const rawConstraints = sparky.run.getConstraintSystem();
        console.log('  Raw Sparky constraints:', rawConstraints);
      }
      
      if (sparky.run.toJson) {
        const jsonConstraints = sparky.run.toJson();
        console.log('  Sparky JSON constraints:', typeof jsonConstraints === 'string' ? JSON.parse(jsonConstraints) : jsonConstraints);
      }
    }
    
    // Now compare with what the bridge returns
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    if (sparkyBridge) {
      const bridgeConstraints = sparkyBridge.getFullConstraintSystem();
      console.log('  Bridge constraints:', bridgeConstraints);
      
      // Look for transformation logic
      if (bridgeConstraints && bridgeConstraints.gates) {
        console.log('  Bridge gate count:', bridgeConstraints.gates.length);
        console.log('  Bridge constraint count:', bridgeConstraints.constraintCount);
        
        // Check if constraintCount is calculated differently than gates.length
        if (bridgeConstraints.gates.length !== bridgeConstraints.constraintCount) {
          console.log('  ⚠️  Gate count ≠ constraint count - transformation detected!');
          console.log(`    gates.length: ${bridgeConstraints.gates.length}`);
          console.log(`    constraintCount: ${bridgeConstraints.constraintCount}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Raw constraint comparison failed: ${error.message}`);
  }
}

async function runTransformationTrace() {
  console.log('🚀 Constraint Transformation Tracer');
  console.log('==================================\n');
  
  // Step 1: Trace Sparky internals
  await traceSparkyInternals();
  
  // Step 2: Step-by-step constraint analysis
  await stepByStepConstraintAnalysis();
  
  // Step 3: OCaml processing investigation
  await investigateOCamlProcessing();
  
  // Step 4: Raw constraint data comparison
  await compareRawConstraintData();
  
  console.log('\n🏁 Transformation trace complete');
}

// Run the investigation
runTransformationTrace().catch(console.error);