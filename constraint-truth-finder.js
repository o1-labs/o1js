/**
 * Constraint Truth Finder - Find the actual constraint count
 */

import { Field, ZkProgram, Poseidon, switchBackend, Provable } from './dist/node/index.js';

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

async function investigateConstraints() {
  console.log('🔍 CONSTRAINT TRUTH INVESTIGATION');
  console.log('================================\n');
  
  // Test Sparky only for now
  await switchBackend('sparky');
  console.log('📊 Using Sparky backend...\n');
  
  console.log('🔧 Step 1: Direct constraint system analysis...');
  try {
    const result = await Provable.constraintSystem(() => {
      const publicInput = Field(1);
      const a = Field(2);
      const b = Field(3);
      const c = Field(4);
      
      const hash1 = Poseidon.hash([publicInput, a]);
      const hash2 = Poseidon.hash([hash1, b]);
      const hash3 = Poseidon.hash([hash2, c]);
      
      return hash3;
    });
    
    console.log('  Direct Provable.constraintSystem result:');
    console.log(`    rows: ${result.rows}`);
    console.log(`    digest: ${result.digest}`);
    console.log(`    gates length: ${result.gates.length}`);
    console.log(`    publicInputSize: ${result.publicInputSize}`);
    
    if (result.gates.length <= 15) {
      console.log('  Gate details:');
      result.gates.forEach((gate, i) => {
        console.log(`    Gate ${i}: ${JSON.stringify(gate).substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.log(`  ❌ Direct constraint system failed: ${error.message}`);
  }
  
  console.log('\n🔧 Step 2: ZkProgram compilation analysis...');
  try {
    const compileResult = await HashProgram.compile();
    console.log('  Compilation successful');
    
    // Try analyzeMethods
    try {
      const analysis = await HashProgram.analyzeMethods();
      console.log('  analyzeMethods result:');
      console.log(`    hash.rows: ${analysis.hash.rows}`);
      console.log(`    hash.gates.length: ${analysis.hash.gates.length}`);
      console.log(`    hash.digest: ${analysis.hash.digest}`);
    } catch (error) {
      console.log(`  analyzeMethods failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`  ❌ ZkProgram compilation failed: ${error.message}`);
  }
  
  console.log('\n🔧 Step 3: Sparky bridge direct access...');
  try {
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    if (sparkyBridge) {
      const fullSystem = sparkyBridge.getFullConstraintSystem();
      if (fullSystem) {
        console.log('  Sparky bridge constraint system:');
        console.log(`    gates.length: ${fullSystem.gates.length}`);
        console.log(`    constraintCount: ${fullSystem.constraintCount}`);
        console.log(`    rowCount: ${fullSystem.rowCount}`);
        
        // Count gate types
        const gateTypes = {};
        fullSystem.gates.forEach(gate => {
          const type = gate.typ || gate.type || 'unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        console.log('  Gate type counts:', gateTypes);
      }
    }
  } catch (error) {
    console.log(`  ❌ Sparky bridge access failed: ${error.message}`);
  }
  
  console.log('\n🔧 Step 4: OCaml constraint system access...');
  try {
    // This is what the OCaml system actually sees
    const snarky = (globalThis).__snarky?.Snarky;
    if (snarky) {
      console.log('  Snarky object available');
      
      // Try to access constraint system operations  
      if (snarky.constraintSystem) {
        console.log('  constraintSystem methods available:', Object.keys(snarky.constraintSystem));
      }
    }
  } catch (error) {
    console.log(`  ❌ OCaml access failed: ${error.message}`);
  }
}

investigateConstraints().catch(console.error);