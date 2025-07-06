/**
 * CONSTRAINT COUNT DEBUG
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Debug why constraint counts differ between backends
 */

import { Field, ZkProgram, switchBackend } from '../../index.js';

// Simple circuit with actual constraints
const SimpleArithmeticProgram = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        const result = publicInput.add(privateInput);
        return { publicOutput: result };
      },
    },
  },
});

async function debugConstraintCount() {
  console.log('🔍 Constraint Count Debug');
  console.log('=' .repeat(50));

  // Test with Snarky
  console.log('\n📊 Analyzing Snarky backend...');
  await switchBackend('snarky');
  const snarkyResult = await SimpleArithmeticProgram.compile();
  
  let snarkyConstraints = 0;
  let snarkyAnalysis: any = null;
  
  if ((SimpleArithmeticProgram as any).analyzeMethods) {
    snarkyAnalysis = await (SimpleArithmeticProgram as any).analyzeMethods();
    if (snarkyAnalysis?.compute) {
      snarkyConstraints = snarkyAnalysis.compute.rows || 0;
    }
  }
  
  console.log(`Snarky VK Hash: ${snarkyResult.verificationKey.hash.toString()}`);
  console.log(`Snarky Constraints: ${snarkyConstraints}`);
  console.log(`Snarky Analysis:`, snarkyAnalysis?.compute);

  // Test with Sparky
  console.log('\n📊 Analyzing Sparky backend...');
  await switchBackend('sparky');
  const sparkyResult = await SimpleArithmeticProgram.compile();
  
  let sparkyConstraints = 0;
  let sparkyAnalysis: any = null;
  
  if ((SimpleArithmeticProgram as any).analyzeMethods) {
    sparkyAnalysis = await (SimpleArithmeticProgram as any).analyzeMethods();
    if (sparkyAnalysis?.compute) {
      sparkyConstraints = sparkyAnalysis.compute.rows || 0;
    }
  }
  
  console.log(`Sparky VK Hash: ${sparkyResult.verificationKey.hash.toString()}`);
  console.log(`Sparky Constraints: ${sparkyConstraints}`);
  console.log(`Sparky Analysis:`, sparkyAnalysis?.compute);

  // Compare
  console.log('\n🔍 COMPARISON:');
  console.log(`VK Hash Match: ${snarkyResult.verificationKey.hash.toString() === sparkyResult.verificationKey.hash.toString() ? '✅' : '❌'}`);
  console.log(`Constraint Count Match: ${snarkyConstraints === sparkyConstraints ? '✅' : '❌'}`);
  console.log(`Constraint Difference: ${Math.abs(snarkyConstraints - sparkyConstraints)}`);
  
  if (snarkyAnalysis?.compute?.digest && sparkyAnalysis?.compute?.digest) {
    console.log(`Digest Match: ${snarkyAnalysis.compute.digest === sparkyAnalysis.compute.digest ? '✅' : '❌'}`);
    console.log(`Snarky Digest: ${snarkyAnalysis.compute.digest}`);
    console.log(`Sparky Digest: ${sparkyAnalysis.compute.digest}`);
  }
}

debugConstraintCount().catch(console.error);