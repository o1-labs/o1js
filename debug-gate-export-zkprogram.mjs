/**
 * Debug script to inspect the actual gate export format after MIR→LIR lowering
 * Using a proper zkProgram context
 */

async function debugGateExport() {
  console.log('🔍 DEBUG: Gate Export Format with ZkProgram');
  console.log('==========================================\n');

  // Use dynamic import with correct path
  const { Field, ZkProgram, switchBackend, getCurrentBackend } = await import('./dist/node/index.js');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to sparky backend\n');

  // Create a zkProgram that uses different gate types
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      testGates: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          // This should generate various gate types
          
          // Boolean constraint
          a.assertBool();
          console.log('  - Created boolean constraint for a');
          
          // Addition
          const sum = a.add(b);
          console.log('  - Created addition: a + b');
          
          // Multiplication
          const product = publicInput.mul(sum);
          console.log('  - Created multiplication: publicInput * sum');
          
          // Equality
          product.assertEquals(Field(10));
          console.log('  - Created equality constraint');
          
          return { publicOutput: product };
        },
      },
    },
  });

  // Compile the program to generate constraints
  console.log('📋 Compiling TestProgram...');
  
  // Hook into the constraint system during compilation
  const originalToJson = globalThis.__sparkyInstance?.constraintSystem?.toJson;
  let capturedJson = null;
  
  if (globalThis.__sparkyInstance?.constraintSystem) {
    globalThis.__sparkyInstance.constraintSystem.toJson = function() {
      const json = originalToJson.call(this);
      capturedJson = json;
      console.log('\n🔍 INTERCEPTED toJson call during compilation:');
      console.log('- Gates:', json?.gates?.length || 0);
      return json;
    };
  }
  
  const compilationResult = await TestProgram.compile();
  console.log('✅ Compilation completed\n');
  
  // Restore original toJson
  if (originalToJson && globalThis.__sparkyInstance?.constraintSystem) {
    globalThis.__sparkyInstance.constraintSystem.toJson = originalToJson;
  }
  
  // Analyze the captured JSON
  if (capturedJson && capturedJson.gates) {
    console.log(`\n📊 Captured constraint system: ${capturedJson.gates.length} gates`);
    
    // Group gates by type
    const gateTypes = {};
    capturedJson.gates.forEach((gate, i) => {
      const type = gate.typ || 'Unknown';
      gateTypes[type] = (gateTypes[type] || 0) + 1;
    });
    
    console.log('\n📈 Gate type distribution:');
    Object.entries(gateTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Inspect first few gates in detail
    console.log('\n🔧 Detailed inspection of first 5 gates:');
    capturedJson.gates.slice(0, 5).forEach((gate, i) => {
      console.log(`\n  Gate ${i}:`);
      console.log(`  - Type: ${gate.typ}`);
      console.log(`  - Wires: ${gate.wires ? gate.wires.length : 0}`);
      console.log(`  - Coeffs: ${gate.coeffs ? gate.coeffs.length : 0}`);
      
      if (gate.wires && gate.wires.length > 0) {
        console.log(`  - First wire: ${JSON.stringify(gate.wires[0])}`);
      }
      
      if (gate.coeffs && gate.coeffs.length > 0) {
        // Show first 5 coefficients
        const coeffSample = gate.coeffs.slice(0, 5).map(c => {
          if (typeof c === 'string' && c.length > 10) {
            return c.substring(0, 10) + '...';
          }
          return c;
        });
        console.log(`  - Coeff sample: [${coeffSample.join(', ')}]`);
      }
    });
    
    // Check if we have Generic gates (expected after MIR→LIR lowering)
    const hasGenericGates = capturedJson.gates.some(g => g.typ === 'Generic');
    const hasSemanticGates = capturedJson.gates.some(g => 
      ['Boolean', 'BooleanAnd', 'BooleanOr', 'If'].includes(g.typ)
    );
    
    console.log('\n✅ Verification:');
    console.log(`  - Has Generic gates: ${hasGenericGates ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Has semantic gates: ${hasSemanticGates ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
    
    if (!hasGenericGates && hasSemanticGates) {
      console.log('\n⚠️  WARNING: Semantic gates found! MIR→LIR lowering may not be working correctly.');
    } else if (hasGenericGates && !hasSemanticGates) {
      console.log('\n✅ SUCCESS: Only primitive gates found! MIR→LIR lowering is working correctly.');
    }
  } else {
    console.log('❌ No constraint system JSON captured');
  }
}

debugGateExport().catch(console.error);