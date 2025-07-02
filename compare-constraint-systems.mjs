import { Field, Provable, switchBackend } from './dist/node/index.js';
import fs from 'fs';

console.log('=== CONSTRAINT SYSTEM COMPARISON ===\n');

// Simple constraint generation function for comparison
function generateConstraints() {
  const x = Provable.witness(Field, () => Field(1));
  x.assertEquals(Field(1));
}

async function extractConstraintSystem(backend) {
  console.log(`\n--- Extracting ${backend.toUpperCase()} Constraints ---`);
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
    console.log('Switched to Sparky backend');
  } else {
    console.log('Using Snarky backend');
  }
  
  try {
    const constraintSystem = await Provable.constraintSystem(generateConstraints);
    
    console.log(`✓ Constraint system extracted for ${backend}`);
    console.log(`  - Rows: ${constraintSystem.rows || 'N/A'}`);
    console.log(`  - Gates: ${constraintSystem.gates?.length || 'N/A'}`);
    console.log(`  - Public inputs: ${constraintSystem.public_input_size || 'N/A'}`);
    
    // Save to file for detailed inspection
    const filename = `constraints-${backend}.json`;
    fs.writeFileSync(filename, JSON.stringify(constraintSystem, null, 2));
    console.log(`  - Saved to ${filename}`);
    
    return constraintSystem;
    
  } catch (error) {
    console.error(`❌ Error extracting constraints for ${backend}:`, error.message);
    return null;
  }
}

async function compareConstraintSystems() {
  try {
    // Extract constraint systems from both backends
    const snarkyCS = await extractConstraintSystem('snarky');
    const sparkyCS = await extractConstraintSystem('sparky');
    
    if (!snarkyCS || !sparkyCS) {
      console.error('Failed to extract constraint systems');
      return;
    }
    
    console.log('\n=== DETAILED COMPARISON ===');
    
    // Compare basic structure
    console.log('\\n📊 STRUCTURE COMPARISON:');
    console.log(`  Rows:         Snarky: ${snarkyCS.rows || 'N/A'}, Sparky: ${sparkyCS.rows || 'N/A'}`);
    console.log(`  Gates:        Snarky: ${snarkyCS.gates?.length || 0}, Sparky: ${sparkyCS.gates?.length || 0}`);
    console.log(`  Public size:  Snarky: ${snarkyCS.public_input_size || 0}, Sparky: ${sparkyCS.public_input_size || 0}`);
    
    // Compare gates in detail
    if (snarkyCS.gates && sparkyCS.gates) {
      console.log('\\n🔍 GATE-BY-GATE COMPARISON:');
      
      const maxGates = Math.max(snarkyCS.gates.length, sparkyCS.gates.length);
      for (let i = 0; i < Math.min(10, maxGates); i++) { // Show first 10 gates
        const snarkyGate = snarkyCS.gates[i];
        const sparkyGate = sparkyCS.gates[i];
        
        console.log(`\\n  Gate ${i}:`);
        if (snarkyGate && sparkyGate) {
          console.log(`    Snarky: ${snarkyGate.typ || 'N/A'} - wires: ${snarkyGate.wires?.length || 0}, coeffs: ${snarkyGate.coeffs?.length || 0}`);
          console.log(`    Sparky: ${sparkyGate.typ || 'N/A'} - wires: ${sparkyGate.wires?.length || 0}, coeffs: ${sparkyGate.coeffs?.length || 0}`);
          
          // Compare coefficients
          if (snarkyGate.coeffs && sparkyGate.coeffs) {
            const coeffsMatch = JSON.stringify(snarkyGate.coeffs) === JSON.stringify(sparkyGate.coeffs);
            console.log(`    Coeffs match: ${coeffsMatch ? '✅' : '❌'}`);
            if (!coeffsMatch) {
              console.log(`      Snarky coeffs: [${snarkyGate.coeffs.slice(0, 5).join(', ')}${snarkyGate.coeffs.length > 5 ? '...' : ''}]`);
              console.log(`      Sparky coeffs: [${sparkyGate.coeffs.slice(0, 5).join(', ')}${sparkyGate.coeffs.length > 5 ? '...' : ''}]`);
            }
          }
        } else if (snarkyGate) {
          console.log(`    Snarky: ${snarkyGate.typ} (Sparky missing)`);
        } else if (sparkyGate) {
          console.log(`    Sparky: ${sparkyGate.typ} (Snarky missing)`);
        }
      }
      
      if (maxGates > 10) {
        console.log(`    ... and ${maxGates - 10} more gates`);
      }
    }
    
    // Overall structure comparison
    const structuralMatch = (
      snarkyCS.rows === sparkyCS.rows &&
      snarkyCS.gates?.length === sparkyCS.gates?.length &&
      snarkyCS.public_input_size === sparkyCS.public_input_size
    );
    
    console.log(`\\n🎯 STRUCTURAL MATCH: ${structuralMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!structuralMatch) {
      console.log('\\n🔧 DIFFERENCES TO FIX:');
      if (snarkyCS.rows !== sparkyCS.rows) {
        console.log(`  - Row count: Snarky has ${snarkyCS.rows}, Sparky has ${sparkyCS.rows}`);
      }
      if (snarkyCS.gates?.length !== sparkyCS.gates?.length) {
        console.log(`  - Gate count: Snarky has ${snarkyCS.gates?.length}, Sparky has ${sparkyCS.gates?.length}`);
      }
      if (snarkyCS.public_input_size !== sparkyCS.public_input_size) {
        console.log(`  - Public input size: Snarky has ${snarkyCS.public_input_size}, Sparky has ${sparkyCS.public_input_size}`);
      }
    }
    
  } catch (error) {
    console.error('Error during comparison:', error.message);
    console.error(error.stack);
  }
}

compareConstraintSystems();