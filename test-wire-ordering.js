import { Field, ZkProgram, switchBackend, initializeBindings, Gadgets } from './dist/node/index.js';

async function analyzeWireOrdering() {
  console.log('=== WIRE ORDERING ANALYSIS ===\n');
  
  await initializeBindings();
  
  // Test with multiple constraints to see wire assignment patterns
  const WireTestProgram = ZkProgram({
    name: 'WireTest',
    methods: {
      multipleVars: {
        privateInputs: [Field, Field, Field, Field],
        async method(a, b, c, d) {
          // Create constraints using different variables
          // to see how they get assigned to wire columns
          
          // Constraint 1: a + b = c
          a.add(b).assertEquals(c);
          
          // Constraint 2: c * d = 12
          c.mul(d).assertEquals(Field(12));
          
          // Constraint 3: a = 1 (constant)
          a.assertEquals(Field(1));
          
          // Constraint 4: Boolean check on d
          Gadgets.isBoolean(d);
        },
      },
    },
  });
  
  // Analyze with both backends
  await switchBackend('snarky');
  const snarkyAnalysis = await WireTestProgram.analyzeMethods();
  
  await switchBackend('sparky');  
  const sparkyAnalysis = await WireTestProgram.analyzeMethods();
  
  const snarkyGates = snarkyAnalysis.multipleVars.gates;
  const sparkyGates = sparkyAnalysis.multipleVars.gates;
  
  console.log(`Total gates: Snarky=${snarkyGates.length}, Sparky=${sparkyGates.length}\n`);
  
  // Analyze wire patterns
  console.log('Wire Column Usage Patterns:\n');
  
  const analyzeWires = (gates, name) => {
    console.log(`${name}:`);
    gates.forEach((gate, i) => {
      if (gate.type === 'Generic' && gate.wires) {
        console.log(`  Gate ${i}: ${gate.type}`);
        console.log(`    Wire columns used: [${gate.wires.map(w => w.col).join(', ')}]`);
        
        // Show which coefficients are non-zero
        const nonZeroCoeffs = [];
        gate.coeffs.forEach((c, j) => {
          if (c !== '0' && c !== '28948022309329048855892746252171976963363056481941560715954676764349967630337') {
            nonZeroCoeffs.push(`coeffs[${j}]=${c.length > 20 ? c.substring(0,8) + '...' : c}`);
          }
        });
        console.log(`    Non-zero coeffs: ${nonZeroCoeffs.join(', ')}`);
      }
    });
    console.log();
  };
  
  analyzeWires(snarkyGates, 'SNARKY');
  analyzeWires(sparkyGates, 'SPARKY');
  
  // Look for patterns
  console.log('Key Observations:');
  
  // Check if Snarky uses non-sequential columns
  const snarkyColumns = new Set();
  const sparkyColumns = new Set();
  
  snarkyGates.forEach(gate => {
    if (gate.wires) {
      gate.wires.forEach(w => snarkyColumns.add(w.col));
    }
  });
  
  sparkyGates.forEach(gate => {
    if (gate.wires) {
      gate.wires.forEach(w => sparkyColumns.add(w.col));
    }
  });
  
  console.log(`\nColumn usage:`);
  console.log(`  Snarky uses columns: [${Array.from(snarkyColumns).sort((a,b) => a-b).join(', ')}]`);
  console.log(`  Sparky uses columns: [${Array.from(sparkyColumns).sort((a,b) => a-b).join(', ')}]`);
  
  // Check first gate wire ordering
  if (snarkyGates.length > 0 && sparkyGates.length > 0) {
    const sg = snarkyGates[0];
    const pg = sparkyGates[0];
    
    if (sg.wires && pg.wires) {
      console.log('\nFirst gate wire comparison:');
      const maxWires = Math.max(sg.wires.length, pg.wires.length);
      
      for (let i = 0; i < maxWires; i++) {
        const sw = sg.wires[i];
        const pw = pg.wires[i];
        
        if (sw && pw) {
          const match = sw.col === pw.col ? '✓' : '✗';
          console.log(`  Wire ${i}: Snarky col=${sw.col}, Sparky col=${pw.col} ${match}`);
        }
      }
    }
  }
  
  // Hypothesis about the pattern
  console.log('\nHypothesis:');
  console.log('- Snarky may use a specific column ordering strategy');
  console.log('- Sparky appears to use sequential column assignment (0, 1, 2, ...)');
  console.log('- This difference in wire->column mapping causes different VKs');
}

analyzeWireOrdering().catch(console.error);