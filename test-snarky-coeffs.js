#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Fp } from './dist/node/bindings/crypto/finite-field.js';

async function testSnarkyCoeffs() {
  console.log('🔍 Testing Snarky Coefficient Encoding\n');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  // Test with Snarky
  await switchBackend('snarky');
  const snarkyCS = await Provable.constraintSystem(simpleCircuit);
  
  console.log('Snarky constraint system:');
  console.log('Number of gates:', snarkyCS.gates.length);
  console.log('Gate type:', snarkyCS.gates[0].type);
  console.log('Wires:', JSON.stringify(snarkyCS.gates[0].wires));
  console.log('Raw coefficients:', snarkyCS.gates[0].coeffs);
  console.log();
  
  // Analyze coefficients
  console.log('Coefficient analysis:');
  snarkyCS.gates[0].coeffs.forEach((coeff, i) => {
    const val = BigInt(coeff);
    console.log(`coeff[${i}] = ${coeff}`);
    console.log(`  as BigInt: ${val}`);
    console.log(`  is 0?: ${val === 0n}`);
    console.log(`  is 1?: ${val === 1n}`);
    console.log(`  is -1?: ${val === Fp.negate(1n)}`);
    
    // Check if it's some encoded form
    if (val > 0n && val !== 1n && val !== Fp.negate(1n)) {
      // Try to decode as little-endian bytes
      const hex = val.toString(16).padStart(64, '0');
      console.log(`  as hex: ${hex}`);
      
      // Check if it's a packed representation
      const bytes = [];
      let temp = val;
      for (let i = 0; i < 32; i++) {
        bytes.push(Number(temp & 0xffn));
        temp >>= 8n;
      }
      console.log(`  first few bytes: [${bytes.slice(0, 8).join(', ')}]`);
    }
    console.log();
  });
}

testSnarkyCoeffs().catch(console.error);