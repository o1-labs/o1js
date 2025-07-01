import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';

async function finalVKDiagnosis() {
  await initializeBindings();
  
  console.log('=== FINAL VK DIAGNOSIS ===\n');
  
  // Test different operations to see what constraints they generate
  const operations = [
    {
      name: 'Simple assertEquals',
      fn: () => {
        const a = Provable.witness(Field, () => Field(5));
        a.assertEquals(Field(5));
      }
    },
    {
      name: 'Multiplication',
      fn: () => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const c = a.mul(b);
        c.assertEquals(Field(12));
      }
    },
    {
      name: 'Addition',
      fn: () => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const c = a.add(b);
        c.assertEquals(Field(7));
      }
    }
  ];
  
  for (const op of operations) {
    console.log(`\nTesting: ${op.name}`);
    console.log('='.repeat(40));
    
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(op.fn);
    console.log('Snarky:');
    console.log('  Gates:', snarkyCS.gates.length);
    console.log('  Summary:', snarkyCS.summary());
    if (snarkyCS.gates.length > 0) {
      console.log('  First gate:', {
        type: snarkyCS.gates[0].type,
        coeffs: snarkyCS.gates[0].coeffs?.slice(0, 5),
        wires: snarkyCS.gates[0].wires
      });
    }
    
    // Test with Sparky
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(op.fn);
    console.log('\nSparky:');
    console.log('  Gates:', sparkyCS.gates.length);
    console.log('  Summary:', sparkyCS.summary());
    if (sparkyCS.gates.length > 0) {
      console.log('  First gate:', {
        type: sparkyCS.gates[0].type,
        coeffs: sparkyCS.gates[0].coeffs?.slice(0, 5),
        wires: sparkyCS.gates[0].wires
      });
    }
  }
  
  // Key insight check
  console.log('\n\n=== KEY INSIGHT ===');
  console.log('Sparky is generating Generic gates with coefficient pattern [1, -1, 0, 0, 0]');
  console.log('This suggests Sparky is recording variable assignments, not actual constraints!');
  console.log('The -1 coefficient (p-1 in the field) indicates subtraction constraints.');
  console.log('\nThis explains why all Sparky VKs are identical - they\'re not capturing');
  console.log('the actual circuit logic, just variable creation patterns.');
}

finalVKDiagnosis().catch(console.error);