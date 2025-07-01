#!/usr/bin/env node

import { Field, Provable, switchBackend, constraintSystem } from './dist/node/index.js';

async function analyzeConstraints() {
  console.log('=== Analyzing a.add(b).assertEquals(c) constraints ===\n');
  
  // Test with Snarky
  console.log('SNARKY BACKEND:');
  console.log('---------------');
  
  let snarkyGates = [];
  let snarkyRows = 0;
  let snarkyDigest = '';
  
  Provable.runAndCheck(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
    
    // Get constraint system
    const cs = constraintSystem.get();
    snarkyGates = cs.gates;
    snarkyRows = cs.rows;
    snarkyDigest = cs.digest;
  });
  
  console.log('Number of rows:', snarkyRows);
  console.log('Number of gates:', snarkyGates.length);
  console.log('Digest:', snarkyDigest);
  
  // Show the gates
  console.log('\nGates:');
  snarkyGates.forEach((gate, i) => {
    console.log(`Gate ${i}: ${gate.type}`);
    console.log('  Coefficients:', gate.coeffs);
    console.log('  Wires:', gate.wires);
  });
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n\nSPARKY BACKEND:');
  console.log('---------------');
  
  let sparkyGates = [];
  let sparkyRows = 0;
  let sparkyDigest = '';
  
  Provable.runAndCheck(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
    
    // Get constraint system
    const cs = constraintSystem.get();
    sparkyGates = cs.gates;
    sparkyRows = cs.rows;
    sparkyDigest = cs.digest;
  });
  
  console.log('Number of rows:', sparkyRows);
  console.log('Number of gates:', sparkyGates.length);
  console.log('Digest:', sparkyDigest);
  
  // Show the gates
  console.log('\nGates:');
  sparkyGates.forEach((gate, i) => {
    console.log(`Gate ${i}: ${gate.type || gate.typ}`);
    console.log('  Coefficients (hex):', gate.coeffs);
    
    // Convert hex coefficients to decimal for readability
    if (gate.coeffs && gate.coeffs[0] && gate.coeffs[0].length > 10) {
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
  console.log(`Snarky: ${snarkyGates.length} gate(s), ${snarkyRows} rows`);
  if (snarkyGates.length > 0) {
    console.log('  First gate coefficients:', snarkyGates[0].coeffs);
  }
  
  console.log(`Sparky: ${sparkyGates.length} gate(s), ${sparkyRows} rows`);
  if (sparkyGates.length > 0 && sparkyGates[0].coeffs) {
    const coeffs = sparkyGates[0].coeffs.map(hex => {
      const value = BigInt('0x' + hex);
      const modulus = BigInt('0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001');
      if (value > modulus / 2n) {
        return '-' + (modulus - value).toString();
      }
      return value.toString();
    });
    console.log('  First gate coefficients (decimal):', coeffs);
  }
}

analyzeConstraints().catch(console.error);