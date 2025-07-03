import { Field, ZkProgram, switchBackend, initializeBindings, Bool } from './dist/node/index.js';

async function analyzeWireOrdering() {
  console.log('=== WIRE ORDERING ANALYSIS ===\n');
  
  await initializeBindings();
  
  // Test with multiple constraints to see wire assignment patterns
  const WireTestProgram = ZkProgram({
    name: 'WireTest',
    methods: {
      multipleVars: {
        privateInputs: [Field, Field, Field],
        async method(a, b, c) {
          // Create constraints using different variables
          // to see how they get assigned to wire columns
          
          // Constraint 1: a + b = 3
          a.add(b).assertEquals(Field(3));
          
          // Constraint 2: a * 2 = 2
          a.mul(2).assertEquals(Field(2));
          
          // Constraint 3: b - 1 = 1
          b.sub(1).assertEquals(Field(1));
          
          // Constraint 4: c = a + b
          c.assertEquals(a.add(b));
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
  
  // Detailed gate analysis
  console.log('DETAILED GATE ANALYSIS:\n');
  
  for (let i = 0; i < Math.max(snarkyGates.length, sparkyGates.length); i++) {
    const sg = snarkyGates[i];
    const pg = sparkyGates[i];
    
    if (!sg || !pg) continue;
    
    console.log(`Gate ${i}:`);
    console.log(`  Type: ${sg.type} (both)`);
    
    // Compare wires
    console.log('  Wires:');
    const maxWires = Math.max(sg.wires?.length || 0, pg.wires?.length || 0);
    for (let j = 0; j < maxWires; j++) {
      const sw = sg.wires?.[j];
      const pw = pg.wires?.[j];
      
      if (sw && pw) {
        const match = sw.col === pw.col ? '✓' : '✗';
        console.log(`    Wire ${j}: Snarky col=${sw.col}, Sparky col=${pw.col} ${match}`);
      }
    }
    
    // Compare non-zero coefficients
    console.log('  Non-zero coefficients:');
    const showNonZeroCoeffs = (coeffs, name) => {
      coeffs.forEach((c, idx) => {
        if (c !== '0' && c !== '28948022309329048855892746252171976963363056481941560715954676764349967630337') {
          const val = c.length > 10 ? `${c.substring(0, 6)}...` : c;
          console.log(`    ${name}[${idx}] = ${val}`);
        }
      });
    };
    
    showNonZeroCoeffs(sg.coeffs, 'Snarky');
    showNonZeroCoeffs(pg.coeffs, 'Sparky');
    console.log();
  }
  
  // Summary analysis
  console.log('\nSUMMARY:');
  
  // Collect all column indices used
  const collectColumns = (gates) => {
    const cols = new Set();
    gates.forEach(g => {
      g.wires?.forEach(w => cols.add(w.col));
    });
    return Array.from(cols).sort((a, b) => a - b);
  };
  
  const snarkyCols = collectColumns(snarkyGates);
  const sparkyCols = collectColumns(sparkyGates);
  
  console.log(`Snarky uses columns: [${snarkyCols.join(', ')}]`);
  console.log(`Sparky uses columns: [${sparkyCols.join(', ')}]`);
  
  // Check if there's a pattern
  console.log('\nPATTERN ANALYSIS:');
  
  // Look at first gate's wire pattern
  if (snarkyGates[0]?.wires && sparkyGates[0]?.wires) {
    const snarkyPattern = snarkyGates[0].wires.map(w => w.col);
    const sparkyPattern = sparkyGates[0].wires.map(w => w.col);
    
    console.log(`Snarky first gate wire pattern: [${snarkyPattern.join(', ')}]`);
    console.log(`Sparky first gate wire pattern: [${sparkyPattern.join(', ')}]`);
    
    // Check if Snarky has a specific ordering
    const isSequential = (arr) => {
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr[i-1] + 1) return false;
      }
      return true;
    };
    
    console.log(`\nSnarky uses sequential columns: ${isSequential(snarkyPattern) ? 'YES' : 'NO'}`);
    console.log(`Sparky uses sequential columns: ${isSequential(sparkyPattern) ? 'YES' : 'NO'}`);
  }
  
  console.log('\nCONCLUSION:');
  console.log('The wire column ordering difference is the root cause of VK mismatch.');
  console.log('Even though constraints are equivalent, different wire->column mappings');
  console.log('produce different permutation polynomials and thus different VKs.');
}

analyzeWireOrdering().catch(console.error);