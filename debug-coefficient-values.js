#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Fp } from './dist/node/bindings/crypto/finite-field.js';

async function debugCoefficients() {
  console.log('🔍 Debugging Coefficient Values\n');
  
  // Field element calculations
  console.log('Field modulus:', Fp.modulus.toString());
  console.log('Field(-1):', Fp.negate(1n).toString());
  console.log();
  
  // Check what Snarky shows
  const val1 = '452312848583266388373324160190187140051835877600158453279131187530910662656';
  const val2 = '24978832453430380873717209971532228208145673387365420563795187597376';
  
  console.log('Snarky coefficient 1:', val1);
  console.log('As BigInt:', BigInt(val1));
  console.log('Is it 1?:', BigInt(val1) === 1n);
  console.log();
  
  console.log('Snarky coefficient 3:', val2);
  console.log('As BigInt:', BigInt(val2));
  console.log('Is it -1?:', BigInt(val2) === Fp.negate(1n));
  console.log('Modulus - val:', (Fp.modulus - BigInt(val2)).toString());
  console.log();
  
  // Check Sparky values
  const sparkyVal1 = '0000000000000000000000000000000000000000000000000000000000000001';
  const sparkyVal2 = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';
  
  console.log('Sparky hex 1:', sparkyVal1);
  console.log('Sparky hex 2:', sparkyVal2);
  
  // Parse as big-endian
  const parseBigEndian = (hex) => {
    let result = 0n;
    for (let i = 0; i < hex.length; i += 2) {
      result = result * 256n + BigInt(parseInt(hex.substr(i, 2), 16));
    }
    return result;
  };
  
  const sparkyBigInt1 = parseBigEndian(sparkyVal1);
  const sparkyBigInt2 = parseBigEndian(sparkyVal2);
  
  console.log('Sparky parsed 1:', sparkyBigInt1.toString());
  console.log('Sparky parsed 2:', sparkyBigInt2.toString());
  console.log();
  
  // Now check actual constraint generation
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    // This should create: a + b - c = 0
    // With coefficients: [1, 1, -1, 0, 0]
    a.add(b).assertEquals(c);
  };
  
  console.log('📊 Expected constraint: a + b - c = 0');
  console.log('Expected coefficients: [1, 1, -1, 0, 0]');
  console.log('In field representation:');
  console.log('  coeff[0] = 1');
  console.log('  coeff[1] = 1'); 
  console.log('  coeff[2] = -1 =', Fp.negate(1n).toString());
  console.log('  coeff[3] = 0');
  console.log('  coeff[4] = 0');
}

debugCoefficients().catch(console.error);