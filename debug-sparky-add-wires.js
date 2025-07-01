import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable } from './dist/node/index.js';

async function debugAddWires() {
  console.log('Debugging wire assignment for a.add(b).assertEquals(c)\n');
  
  await switchBackend('sparky');
  
  try {
    // Create variables
    console.log('Creating witness variables...');
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => {
        console.log('Creating witness a = 2');
        return Field(2);
      });
      const b = Provable.witness(Field, () => {
        console.log('Creating witness b = 3');
        return Field(3);
      });
      const c = Provable.witness(Field, () => {
        console.log('Creating witness c = 5');
        return Field(5);
      });
      
      console.log('\nExecuting a.add(b).assertEquals(c)...');
      const sum = a.add(b);
      console.log('After add: sum =', sum);
      sum.assertEquals(c);
      console.log('After assertEquals');
    });
    
    console.log('\n=== Constraint System ===');
    console.log('Rows:', cs.rows);
    console.log('Digest:', cs.digest);
    
    // Get the gate details
    const gates = Array.isArray(cs.gates) ? cs.gates : JSON.parse(cs.gates);
    console.log('\nNumber of gates:', gates.length);
    
    gates.forEach((gate, i) => {
      console.log(`\nGate ${i}:`);
      console.log('Type:', gate.typ);
      console.log('Wires:', JSON.stringify(gate.wires));
      console.log('Coefficients:', gate.coeffs);
      
      // Analyze the wires
      const wires = gate.wires;
      console.log('\nWire analysis:');
      console.log('- Wire 0 (L):', wires[0], '← This should be variable a or the sum');
      console.log('- Wire 1 (R):', wires[1], '← This should be variable b or c');
      console.log('- Wire 2 (O):', wires[2], '← This should be variable c or zero');
      
      // Analyze coefficients
      const coeffs = gate.coeffs;
      const one = '1';
      const minusOne = '28948022309329048855892746252171976963363056481941560715954676764349967630336';
      const zero = '0';
      
      console.log('\nCoefficient analysis:');
      if (coeffs[0] === one && coeffs[1] === minusOne && coeffs[2] === zero) {
        console.log('Pattern: L - R = 0 (Equal constraint)');
        console.log('This means Sparky created: sum = c where sum is L and c is R');
        console.log('❌ WRONG: Should be a + b - c = 0');
      } else if (coeffs[0] === one && coeffs[1] === one && coeffs[2] === minusOne) {
        console.log('Pattern: L + R - O = 0');
        console.log('This means: a + b - c = 0');
        console.log('✅ CORRECT: This is what we want!');
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  }
}

debugAddWires().catch(console.error);