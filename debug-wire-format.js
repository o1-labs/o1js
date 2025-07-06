/**
 * Wire Format Comparison: Snarky vs Sparky
 * 
 * This test compares the wire assignment formats between Snarky and Sparky
 * to identify why permutation construction fails in Sparky.
 */

async function debugWireFormat() {
  console.log('🔧 WIRE FORMAT COMPARISON DEBUGGING');
  console.log('===================================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } = o1js;

  // Define a simple zkProgram that generates interesting wire patterns
  const WireTestProgram = ZkProgram({
    name: 'WireTestProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      testWires: {
        privateInputs: [Field, Field],
        async method(publicInput, private1, private2) {
          // Create several operations to generate wire assignments
          const a = publicInput.add(private1);
          const b = private2.mul(Field(2));
          const c = a.add(b);
          const d = c.sub(Field(1));
          
          // Add constraint to ensure variables are used
          c.assertEquals(a.add(b));
          
          return { publicOutput: d };
        },
      },
    },
  });

  const constraintSystems = {};

  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔄 Testing ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(50));
    
    try {
      // Switch backend
      await switchBackend(backend);
      console.log(`✅ Switched to ${backend} backend`);
      
      // Compile and capture constraint system
      console.log('\n📋 Compiling WireTestProgram...');
      const compilationResult = await WireTestProgram.compile();
      console.log(`✅ Compilation completed`);
      
      // Extract constraint system with more detail
      let cs = null;
      
      // Try to get the raw constraint system
      if (compilationResult.cs) {
        cs = compilationResult.cs;
      } else if (compilationResult.constraintSystem) {
        cs = compilationResult.constraintSystem;
      } else {
        // Try to extract from compiled methods
        const methodNames = Object.keys(compilationResult.provers || {});
        if (methodNames.length > 0) {
          console.log(`📊 Found methods: ${methodNames.join(', ')}`);
        }
      }
      
      // Use Provable.constraintSystem to capture the constraint system
      console.log('\n🔬 Capturing constraint system using Provable.constraintSystem...');
      const { gates, publicInputSize } = await Provable.constraintSystem(() => {
        const publicInput = Provable.witness(Field, () => Field(5));
        const private1 = Provable.witness(Field, () => Field(3));
        const private2 = Provable.witness(Field, () => Field(2));
        
        const a = publicInput.add(private1);
        const b = private2.mul(Field(2));
        const c = a.add(b);
        const d = c.sub(Field(1));
        
        c.assertEquals(a.add(b));
        
        return d;
      });
      
      console.log(`📊 Captured ${gates.length} gates`);
      console.log(`📊 Public input size: ${publicInputSize}`);
      
      // Store the constraint system
      constraintSystems[backend] = {
        gates,
        publicInputSize,
        raw: cs
      };
      
      // Display first few gates for analysis
      console.log('\n📊 First 3 gates (detailed view):');
      gates.slice(0, 3).forEach((gate, index) => {
        console.log(`\nGate ${index}:`);
        console.log(`  Type: ${gate.type}`);
        console.log(`  Wires: ${JSON.stringify(gate.wires)}`);
        if (gate.coeffs) {
          console.log(`  Coeffs: ${gate.coeffs.length} coefficients`);
        }
      });
      
    } catch (error) {
      console.log(`❌ ${backend} backend test FAILED: ${error.message}`);
      console.log(`📋 Error stack:\n${error.stack}`);
      constraintSystems[backend] = { error: error.message };
    }
  }

  // Compare wire formats
  console.log('\n\n📊 WIRE FORMAT COMPARISON');
  console.log('========================\n');
  
  if (constraintSystems.snarky && constraintSystems.sparky && 
      !constraintSystems.snarky.error && !constraintSystems.sparky.error) {
    
    const snarkyGates = constraintSystems.snarky.gates;
    const sparkyGates = constraintSystems.sparky.gates;
    
    console.log(`Snarky gates: ${snarkyGates.length}`);
    console.log(`Sparky gates: ${sparkyGates.length}`);
    
    // Compare gate count
    if (snarkyGates.length !== sparkyGates.length) {
      console.log(`\n⚠️  WARNING: Different gate counts!`);
    }
    
    // Detailed wire format comparison
    console.log('\n🔍 WIRE FORMAT ANALYSIS:');
    console.log('─'.repeat(50));
    
    // Analyze wire structure
    const analyzeWireFormat = (gates, name) => {
      console.log(`\n${name} Wire Format:`);
      
      // Check wire structure of first gate
      if (gates.length > 0) {
        const firstGate = gates[0];
        console.log(`  Wire structure: ${typeof firstGate.wires}`);
        console.log(`  Wire example: ${JSON.stringify(firstGate.wires)}`);
        
        // Check if wires use row/col format or direct indices
        if (Array.isArray(firstGate.wires)) {
          console.log(`  Wire format: Array of length ${firstGate.wires.length}`);
          if (firstGate.wires.length > 0) {
            const firstWire = firstGate.wires[0];
            if (typeof firstWire === 'object' && firstWire !== null) {
              console.log(`  Wire element type: Object with keys [${Object.keys(firstWire).join(', ')}]`);
              console.log(`  Wire element example: ${JSON.stringify(firstWire)}`);
            } else {
              console.log(`  Wire element type: ${typeof firstWire}`);
            }
          }
        }
        
        // Analyze wire indices/values
        const wireValues = new Set();
        const wirePatterns = new Map();
        
        gates.slice(0, 10).forEach((gate, i) => {
          if (Array.isArray(gate.wires)) {
            gate.wires.forEach(wire => {
              const wireStr = JSON.stringify(wire);
              wireValues.add(wireStr);
              
              // Track patterns
              const pattern = typeof wire === 'object' ? 
                Object.keys(wire).sort().join(',') : 
                typeof wire;
              wirePatterns.set(pattern, (wirePatterns.get(pattern) || 0) + 1);
            });
          }
        });
        
        console.log(`  Unique wire values (first 10 gates): ${wireValues.size}`);
        console.log(`  Wire patterns:`);
        wirePatterns.forEach((count, pattern) => {
          console.log(`    ${pattern}: ${count} occurrences`);
        });
      }
    };
    
    analyzeWireFormat(snarkyGates, 'SNARKY');
    analyzeWireFormat(sparkyGates, 'SPARKY');
    
    // Direct comparison of first few gates
    console.log('\n🔍 DIRECT GATE COMPARISON:');
    console.log('─'.repeat(50));
    
    const compareCount = Math.min(3, snarkyGates.length, sparkyGates.length);
    for (let i = 0; i < compareCount; i++) {
      console.log(`\nGate ${i}:`);
      console.log('  Snarky:');
      console.log(`    Type: ${snarkyGates[i].type}`);
      console.log(`    Wires: ${JSON.stringify(snarkyGates[i].wires)}`);
      console.log('  Sparky:');
      console.log(`    Type: ${sparkyGates[i].type}`);
      console.log(`    Wires: ${JSON.stringify(sparkyGates[i].wires)}`);
      
      // Check if wires match
      const snarkyWiresStr = JSON.stringify(snarkyGates[i].wires);
      const sparkyWiresStr = JSON.stringify(sparkyGates[i].wires);
      
      if (snarkyWiresStr !== sparkyWiresStr) {
        console.log('  ⚠️  WIRE MISMATCH DETECTED!');
        
        // Analyze the difference
        if (Array.isArray(snarkyGates[i].wires) && Array.isArray(sparkyGates[i].wires)) {
          console.log(`    Snarky wire count: ${snarkyGates[i].wires.length}`);
          console.log(`    Sparky wire count: ${sparkyGates[i].wires.length}`);
        }
      }
    }
    
    // Export full constraint systems for manual analysis
    console.log('\n📁 Exporting full constraint systems for analysis...');
    const fs = (await import('fs')).default;
    
    fs.writeFileSync(
      'debug-wire-format-snarky.json', 
      JSON.stringify(snarkyGates, null, 2)
    );
    fs.writeFileSync(
      'debug-wire-format-sparky.json', 
      JSON.stringify(sparkyGates, null, 2)
    );
    
    console.log('✅ Exported to debug-wire-format-snarky.json and debug-wire-format-sparky.json');
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('=========\n');
  
  if (constraintSystems.snarky && constraintSystems.sparky) {
    if (constraintSystems.snarky.error) {
      console.log(`❌ Snarky failed: ${constraintSystems.snarky.error}`);
    }
    if (constraintSystems.sparky.error) {
      console.log(`❌ Sparky failed: ${constraintSystems.sparky.error}`);
    }
    
    if (!constraintSystems.snarky.error && !constraintSystems.sparky.error) {
      console.log('🔍 Key findings:');
      console.log('  - Both backends compile successfully');
      console.log('  - Wire format differences need investigation');
      console.log('  - Check exported JSON files for detailed analysis');
    }
  }
  
  return constraintSystems;
}

// Run the wire format debugging
debugWireFormat().catch(console.error);