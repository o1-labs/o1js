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
  
  // Analyze methods to get constraint system
  console.log('Analyzing with Snarky...');
  await switchBackend('snarky');
  const snarkyAnalysis = await SimpleProgram.analyzeMethods();
  const snarkyCS = snarkyAnalysis.simple;
  
  console.log('Analyzing with Sparky...');
  await switchBackend('sparky');
  const sparkyAnalysis = await SimpleProgram.analyzeMethods();
  const sparkyCS = sparkyAnalysis.simple;
  
  // Save constraint systems
  await fs.writeFile('snarky-cs.json', JSON.stringify(snarkyCS, null, 2));
  await fs.writeFile('sparky-cs.json', JSON.stringify(sparkyCS, null, 2));
  
  console.log('\nConstraint systems saved to snarky-cs.json and sparky-cs.json\n');
  
  // Compare gates
  const snarkyGates = snarkyCS.gates;
  const sparkyGates = sparkyCS.gates;
  
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
    console.log(`Gate ${i}: ${sg.typ} ${typeMatch ? '✓' : `✗ (Sparky=${pg.typ})`}`);
    
    // For generic gates, show coefficient details
    if (sg.typ === 'Generic' && pg.typ === 'Generic') {
      console.log(`  Coeffs: ${sg.coeffs.length} coefficients`);
      
      // Show first few coefficients
      for (let j = 0; j < Math.min(5, sg.coeffs.length); j++) {
        const match = sg.coeffs[j] === pg.coeffs[j];
        if (!match) {
          console.log(`    [${j}] Snarky: ${sg.coeffs[j].substring(0, 16)}...`);
          console.log(`        Sparky: ${pg.coeffs[j].substring(0, 16)}...`);
        }
      }
    }
    
    // Check wire differences
    if (sg.wires && pg.wires && sg.wires.length === pg.wires.length) {
      let wiresDiffer = false;
      for (let j = 0; j < sg.wires.length; j++) {
        if (sg.wires[j].row !== pg.wires[j].row || sg.wires[j].col !== pg.wires[j].col) {
          wiresDiffer = true;
          break;
        }
      }
      if (wiresDiffer) {
        console.log(`  Wire mismatch detected`);
      }
    }
  }
  
  // Summary
  console.log('\nSummary:');
  console.log(`Public input size: Snarky=${snarkyCS.public_input_size}, Sparky=${sparkyCS.public_input_size}`);
  
  // Count gate types
  const countTypes = (gates) => {
    const counts = {};
    gates.forEach(g => {
      counts[g.typ] = (counts[g.typ] || 0) + 1;
    });
    return counts;
  };
  
  const snarkyCounts = countTypes(snarkyGates);
  const sparkyCounts = countTypes(sparkyGates);
  
  console.log('\nGate type counts:');
  Object.keys({...snarkyCounts, ...sparkyCounts}).forEach(type => {
    const sc = snarkyCounts[type] || 0;
    const pc = sparkyCounts[type] || 0;
    const match = sc === pc ? '✓' : '✗';
    console.log(`  ${type}: Snarky=${sc}, Sparky=${pc} ${match}`);
  });
  
  // Look for the actual constraint gate
  console.log('\nLooking for our constraint (pub + priv = 10):');
  snarkyGates.forEach((gate, i) => {
    if (gate.typ === 'Generic' && gate.coeffs.some(c => c !== '0000000000000000000000000000000000000000000000000000000000000000')) {
      console.log(`  Snarky: Found at gate ${i}`);
      // Show non-zero coefficients
      gate.coeffs.forEach((c, j) => {
        if (c !== '0000000000000000000000000000000000000000000000000000000000000000') {
          console.log(`    coeffs[${j}] = ${c}`);
        }
      });
    }
  });
}

analyzeGateSequences().catch(console.error);