#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function analyzeConstraints() {
  console.log('=== Analyzing a.add(b).assertEquals(c) constraints ===\n');
  
  // Test with Snarky
  console.log('SNARKY BACKEND:');
  console.log('---------------');
  const snarkySystem = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Number of rows:', snarkySystem.rows);
  console.log('Number of gates:', snarkySystem.gates.length);
  console.log('Digest:', snarkySystem.digest);
  
  // Show the gates
  console.log('\nGates:');
  snarkySystem.gates.forEach((gate, i) => {
    console.log(`Gate ${i}:`, gate.type);
    console.log('  Coefficients:', gate.coeffs);
    console.log('  Wires:', gate.wires);
  });
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n\nSPARKY BACKEND:');
  console.log('---------------');
  const sparkySystem = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Number of rows:', sparkySystem.rows);
  console.log('Number of gates:', sparkySystem.gates.length);
  console.log('Digest:', sparkySystem.digest);
  
  // Show the gates
  console.log('\nGates:');
  sparkySystem.gates.forEach((gate, i) => {
    console.log(`Gate ${i}:`, gate.type || gate.typ);
    console.log('  Coefficients:', gate.coeffs);
    
    // Convert hex coefficients to decimal for readability
    if (gate.coeffs && gate.coeffs[0].length > 10) {
      const decimalCoeffs = gate.coeffs.map(hex => {
        // Parse the hex string
        const value = BigInt('0x' + hex);
        // Check if it's close to the field modulus (negative number)
        const modulus = BigInt('0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001');
        if (value > modulus / 2n) {
          // It's a negative number
          return '-' + (modulus - value).toString();
        }
        return value.toString();
      });
      console.log('  Coefficients (decimal):', decimalCoeffs);
    }
    
    console.log('  Wires:', gate.wires);
  });
  
  console.log('\n=== SUMMARY ===');
  console.log('Snarky: ' + snarkySystem.gates.length + ' gate(s), coefficients:', 
    snarkySystem.gates[0]?.coeffs || 'N/A');
  console.log('Sparky: ' + sparkySystem.gates.length + ' gate(s), coefficients:', 
    sparkySystem.gates[0]?.coeffs ? 
      sparkySystem.gates[0].coeffs.map(hex => {
        const value = BigInt('0x' + hex);
        const modulus = BigInt('0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001');
        if (value > modulus / 2n) {
          return '-' + (modulus - value).toString();
        }
        return value.toString();
      }) : 'N/A'
  );
}

analyzeConstraints().catch(console.error);