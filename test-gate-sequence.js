import { Field, ZkProgram, switchBackend, initializeBindings } from './dist/node/index.js';
import * as fs from 'fs/promises';

async function analyzeGateSequences() {
  console.log('=== DETAILED GATE SEQUENCE ANALYSIS ===\n');
  
  await initializeBindings();
  
  // Very simple program to minimize noise
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      simple: {
        privateInputs: [Field],
        async method(pub, priv) {
          // Just one constraint: pub + priv = 10
          pub.add(priv).assertEquals(Field(10));
        },
      },
    },
  });
  
  // Compile with both backends
  await switchBackend('snarky');
  const snarkyResult = await SimpleProgram.compile();
  
  await switchBackend('sparky');
  const sparkyResult = await SimpleProgram.compile();
  
  // Save full constraint systems
  await fs.writeFile('snarky-gates.json', JSON.stringify(snarkyResult.constraintSystem, null, 2));
  await fs.writeFile('sparky-gates.json', JSON.stringify(sparkyResult.constraintSystem, null, 2));
  
  console.log('Gate sequences saved to snarky-gates.json and sparky-gates.json\n');
  
  // Compare gate by gate
  const snarkyGates = snarkyResult.constraintSystem.gates;
  const sparkyGates = sparkyResult.constraintSystem.gates;
  
  console.log(`Total gates: Snarky=${snarkyGates.length}, Sparky=${sparkyGates.length}\n`);
  
  console.log('Gate-by-gate comparison:');
  const maxLen = Math.max(snarkyGates.length, sparkyGates.length);
  
  for (let i = 0; i < maxLen; i++) {
    const sg = snarkyGates[i];
    const pg = sparkyGates[i];
    
    if (!sg && pg) {
      console.log(`Gate ${i}: Snarky=MISSING, Sparky=${pg.typ}`);
      continue;
    }
    if (sg && !pg) {
      console.log(`Gate ${i}: Snarky=${sg.typ}, Sparky=MISSING`);
      continue;
    }
    
    const typeMatch = sg.typ === pg.typ;
    console.log(`Gate ${i}: Snarky=${sg.typ}, Sparky=${pg.typ} ${typeMatch ? '✓' : '✗'}`);
    
    // For generic gates, compare coefficients
    if (sg.typ === 'Generic' && pg.typ === 'Generic') {
      const coeffMatch = sg.coeffs.length === pg.coeffs.length;
      console.log(`  Coeffs: Snarky=${sg.coeffs.length}, Sparky=${pg.coeffs.length} ${coeffMatch ? '✓' : '✗'}`);
      
      // Check if coefficient values match
      if (coeffMatch) {
        let allMatch = true;
        for (let j = 0; j < sg.coeffs.length; j++) {
          if (sg.coeffs[j] !== pg.coeffs[j]) {
            allMatch = false;
            console.log(`    Coeff[${j}]: Snarky=${sg.coeffs[j]}, Sparky=${pg.coeffs[j]} ✗`);
          }
        }
        if (allMatch) {
          console.log(`    All coefficient values match ✓`);
        }
      }
    }
    
    // Compare wire positions
    if (sg.wires && pg.wires) {
      const wireMatch = JSON.stringify(sg.wires) === JSON.stringify(pg.wires);
      if (!wireMatch) {
        console.log(`  Wires differ:`);
        console.log(`    Snarky: ${JSON.stringify(sg.wires)}`);
        console.log(`    Sparky: ${JSON.stringify(pg.wires)}`);
      }
    }
  }
  
  // Analyze public input handling
  console.log('\nPublic input analysis:');
  console.log(`Snarky public_input_size: ${snarkyResult.constraintSystem.public_input_size}`);
  console.log(`Sparky public_input_size: ${sparkyResult.constraintSystem.public_input_size}`);
  
  // Count gate types
  const countTypes = (gates) => {
    const counts = {};
    gates.forEach(g => {
      counts[g.typ] = (counts[g.typ] || 0) + 1;
    });
    return counts;
  };
  
  console.log('\nGate type distribution:');
  console.log('Snarky:', countTypes(snarkyGates));
  console.log('Sparky:', countTypes(sparkyGates));
  
  // Look for patterns in wire connections
  console.log('\nWire pattern analysis:');
  
  // Check if wires follow a pattern (e.g., sequential, self-referential)
  const analyzeWirePattern = (gates, name) => {
    console.log(`\n${name} wire patterns:`);
    gates.slice(0, 5).forEach((gate, i) => {
      if (gate.wires) {
        const selfRefs = gate.wires.filter(w => w.row === i).length;
        const uniqueRows = new Set(gate.wires.map(w => w.row)).size;
        console.log(`  Gate ${i}: ${selfRefs} self-refs, ${uniqueRows} unique rows`);
      }
    });
  };
  
  analyzeWirePattern(snarkyGates, 'Snarky');
  analyzeWirePattern(sparkyGates, 'Sparky');
}

analyzeGateSequences().catch(console.error);