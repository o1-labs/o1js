/**
 * Minimal Constraint System Divergence Test
 * 
 * This test creates the simplest possible zkProgram to isolate 
 * the exact differences between Sparky and Snarky constraint generation.
 */

const o1js = require('./dist/node/index.js');
const { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } = o1js;

// Minimal zkProgram: just a single field addition
const MinimalProgram = ZkProgram({
  name: 'MinimalProgram',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    addOne: {
      privateInputs: [],
      async method(publicInput) {
        const result = publicInput.add(Field(1));
        return { publicOutput: result };
      }
    }
  }
});

async function compareConstraintSystems() {
  console.log('🔍 MINIMAL DIVERGENCE TEST');
  console.log('==========================\n');
  
  const results = {};
  
  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Testing ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(40));
    
    try {
      // Switch backend
      await switchBackend(backend);
      console.log(`✅ Switched to ${getCurrentBackend()} backend`);
      
      // Compile minimal program
      console.log('📋 Compiling MinimalProgram...');
      const { verificationKey } = await MinimalProgram.compile();
      
      // Extract constraint system data
      console.log('📊 Extracting constraint system data...');
      
      // Access the constraint system through global state
      const constraintSystem = await getConstraintSystemData(backend);
      
      results[backend] = {
        vkData: verificationKey.data,
        vkHash: verificationKey.hash.toString(),
        constraintSystem: constraintSystem,
        gates: constraintSystem.gates?.length || 0,
        publicInputSize: constraintSystem.public_input_size || 0
      };
      
      console.log(`✅ ${backend} compilation successful`);
      console.log(`   Gates: ${results[backend].gates}`);
      console.log(`   Public Input Size: ${results[backend].publicInputSize}`);
      console.log(`   VK Hash: ${results[backend].vkHash.slice(0, 20)}...`);
      
    } catch (error) {
      console.log(`❌ ${backend} compilation failed:`, error.message);
      results[backend] = { error: error.message };
    }
  }
  
  // Compare results
  console.log('\n🔍 CONSTRAINT SYSTEM COMPARISON');
  console.log('═'.repeat(50));
  
  if (results.snarky.error || results.sparky.error) {
    console.log('❌ Cannot compare due to compilation errors');
    return;
  }
  
  // VK Hash comparison
  const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
  console.log(`\n🔑 VK Hash Match: ${vkMatch ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  if (!vkMatch) {
    console.log(`   Snarky: ${results.snarky.vkHash.slice(0, 40)}...`);
    console.log(`   Sparky: ${results.sparky.vkHash.slice(0, 40)}...`);
  }
  
  // Basic metrics comparison
  console.log(`\n📊 Basic Metrics:`);
  console.log(`   Gates - Snarky: ${results.snarky.gates}, Sparky: ${results.sparky.gates} ${results.snarky.gates === results.sparky.gates ? '✅' : '❌'}`);
  console.log(`   Public Input Size - Snarky: ${results.snarky.publicInputSize}, Sparky: ${results.sparky.publicInputSize} ${results.snarky.publicInputSize === results.sparky.publicInputSize ? '✅' : '❌'}`);
  
  // Detailed gate comparison
  console.log(`\n🚪 Gate Type Analysis:`);
  if (results.snarky.constraintSystem.gates && results.sparky.constraintSystem.gates) {
    compareGateStructures(results.snarky.constraintSystem.gates, results.sparky.constraintSystem.gates);
  }
  
  return results;
}

async function getConstraintSystemData(backend) {
  // Access constraint system data through global state
  if (backend === 'snarky') {
    const snarky = (globalThis).__snarky?.Snarky;
    if (snarky && snarky.constraintSystem) {
      // Create a mock constraint system to extract data
      const handle = snarky.run.enterConstraintSystem();
      
      // Add the minimal constraint (a + 1 = result)
      const a = snarky.run.exists(1, () => [1n]);
      const one = snarky.run.exists(1, () => [1n]); 
      const result = snarky.field.add(a[0], one[0]);
      
      const cs = snarky.constraintSystem.toJson(handle);
      return cs;
    }
  } else if (backend === 'sparky') {
    const sparky = (globalThis).sparkyConstraintBridge;
    if (sparky) {
      // Create constraint system through Sparky
      await sparky.startConstraintAccumulation();
      
      // Add minimal constraint
      const a = await sparky.exists(() => 1n);
      const one = await sparky.constant(1n);
      const result = await sparky.add(a, one);
      
      const csData = await sparky.endConstraintAccumulation();
      return csData.constraintSystem;
    }
  }
  
  return { gates: [], public_input_size: 0 };
}

function compareGateStructures(snarkyGates, sparkyGates) {
  console.log(`   Snarky gates: ${snarkyGates.length}`);
  console.log(`   Sparky gates: ${sparkyGates.length}`);
  
  const maxGates = Math.min(snarkyGates.length, sparkyGates.length, 5); // Compare first 5 gates
  
  for (let i = 0; i < maxGates; i++) {
    const sGate = snarkyGates[i];
    const pGate = sparkyGates[i];
    
    console.log(`\n   Gate ${i}:`);
    console.log(`     Snarky: type="${sGate.typ}", wires=${sGate.wires?.length || 0}, coeffs=${sGate.coeffs?.length || 0}`);
    console.log(`     Sparky: type="${pGate.typ}", wires=${pGate.wires?.length || 0}, coeffs=${pGate.coeffs?.length || 0}`);
    
    const typeMatch = sGate.typ === pGate.typ;
    const wireMatch = (sGate.wires?.length || 0) === (pGate.wires?.length || 0);
    const coeffMatch = (sGate.coeffs?.length || 0) === (pGate.coeffs?.length || 0);
    
    console.log(`     Match: type=${typeMatch ? '✅' : '❌'}, wires=${wireMatch ? '✅' : '❌'}, coeffs=${coeffMatch ? '✅' : '❌'}`);
    
    if (!typeMatch || !wireMatch || !coeffMatch) {
      console.log(`     ⚠️  First structural difference found at gate ${i}`);
      
      // Show detailed wire comparison for first mismatch
      if (!wireMatch && sGate.wires && pGate.wires) {
        console.log(`     Wire details:`);
        const maxWires = Math.min(sGate.wires.length, pGate.wires.length, 3);
        for (let w = 0; w < maxWires; w++) {
          console.log(`       Wire ${w}: Snarky(${sGate.wires[w].row}, ${sGate.wires[w].col}) vs Sparky(${pGate.wires[w].row}, ${pGate.wires[w].col})`);
        }
      }
      break;
    }
  }
}

// Run the test
compareConstraintSystems().catch(console.error);