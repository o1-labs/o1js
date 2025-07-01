#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

function parseHexCoefficient(hex) {
  const value = BigInt('0x' + hex);
  const modulus = BigInt('0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001');
  if (value > modulus / 2n) {
    return '-' + (modulus - value).toString();
  }
  return value.toString();
}

async function test() {
  console.log('=== Comparing constraints for a.add(b).assertEquals(c) ===\n');
  
  // Test with Snarky
  console.log('SNARKY BACKEND:');
  console.log('---------------');
  
  const snarkyCS = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Rows:', snarkyCS.rows);
  console.log('Gates:', snarkyCS.gates?.length || 0);
  console.log('Digest:', snarkyCS.digest);
  
  if (snarkyCS.gates && snarkyCS.gates.length > 0) {
    console.log('\nFirst gate:');
    const gate = snarkyCS.gates[0];
    console.log('  Type:', gate.type);
    console.log('  Coefficients:', gate.coeffs);
    console.log('  Wires:', gate.wires?.slice(0, 3)); // Show first 3 wires
  }
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n\nSPARKY BACKEND:');
  console.log('---------------');
  
  const sparkyCS = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Rows:', sparkyCS.rows);
  console.log('Gates:', sparkyCS.gates?.length || 0);
  console.log('Digest:', sparkyCS.digest);
  
  if (sparkyCS.gates && sparkyCS.gates.length > 0) {
    console.log('\nFirst gate:');
    const gate = sparkyCS.gates[0];
    console.log('  Type:', gate.typ || gate.type);
    console.log('  Coefficients (hex):', gate.coeffs);
    
    // Parse hex coefficients
    if (gate.coeffs && gate.coeffs[0] && gate.coeffs[0].length > 10) {
      const parsed = gate.coeffs.map(parseHexCoefficient);
      console.log('  Coefficients (decimal):', parsed);
    }
    
    console.log('  Wires:', gate.wires?.slice(0, 3)); // Show first 3 wires
  }
  
  console.log('\n=== COMPARISON ===');
  console.log('Snarky: 1 gate with coefficients', snarkyCS.gates?.[0]?.coeffs || 'N/A');
  console.log('Sparky: 1 gate with coefficients', 
    sparkyCS.gates?.[0]?.coeffs ? 
      sparkyCS.gates[0].coeffs.map(parseHexCoefficient) : 'N/A'
  );
  
  console.log('\nExpected for a + b - c = 0: [1, 1, -1, 0, 0]');
  console.log('Sparky is generating:', 
    sparkyCS.gates?.[0]?.coeffs ? 
      sparkyCS.gates[0].coeffs.map(parseHexCoefficient) : 'N/A'
  );
}

test().catch(console.error);