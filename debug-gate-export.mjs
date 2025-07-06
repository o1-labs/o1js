/**
 * Debug script to inspect the actual gate export format after MIR→LIR lowering
 */

async function debugGateExport() {
  console.log('🔍 DEBUG: Gate Export Format Inspection');
  console.log('=====================================\n');

  // Use dynamic import with correct path
  const { Field, Provable, switchBackend, getCurrentBackend } = await import('./dist/node/index.js');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to sparky backend\n');

  // Create a simple test that generates different gate types
  console.log('🧪 Creating test constraints...');
  
  // Test 1: Boolean constraint
  const bool1 = Provable.witness(Field, () => Field(1));
  bool1.assertBool();
  console.log('✅ Created boolean constraint');
  
  // Test 2: Addition with assertEquals
  const a = Provable.witness(Field, () => Field(5));
  const b = Provable.witness(Field, () => Field(3));
  const sum = a.add(b);
  sum.assertEquals(Field(8));
  console.log('✅ Created addition + assertEquals constraints');
  
  // Test 3: Multiplication
  const x = Provable.witness(Field, () => Field(2));
  const y = Provable.witness(Field, () => Field(3));
  const product = x.mul(y);
  product.assertEquals(Field(6));
  console.log('✅ Created multiplication constraints');
  
  // Get the constraint system and inspect it
  console.log('\n📋 Inspecting constraint system export...');
  
  // Access the sparky instance directly to get constraint system info
  const sparkyInstance = globalThis.__sparkyInstance;
  if (sparkyInstance && sparkyInstance.constraintSystem) {
    const constraintSystem = sparkyInstance.constraintSystem;
    
    // Get the JSON representation
    const json = constraintSystem.toJson();
    console.log('\n🔧 Constraint system JSON structure:');
    console.log('- Type:', typeof json);
    console.log('- Keys:', Object.keys(json || {}));
    
    if (json && json.gates) {
      console.log(`\n📊 Gates array: ${json.gates.length} gates`);
      
      // Inspect each gate
      json.gates.forEach((gate, i) => {
        console.log(`\nGate ${i}:`);
        console.log('- Type:', gate.typ);
        console.log('- Wires:', gate.wires ? `${gate.wires.length} wires` : 'none');
        console.log('- Coeffs:', gate.coeffs ? `${gate.coeffs.length} coefficients` : 'none');
        
        if (gate.wires && gate.wires.length > 0) {
          console.log('  Wire sample:', JSON.stringify(gate.wires[0]));
        }
        if (gate.coeffs && gate.coeffs.length > 0) {
          console.log('  Coeff sample:', gate.coeffs.slice(0, 3).join(', ') + '...');
        }
      });
    }
  } else {
    console.log('❌ Could not access sparky constraint system');
  }
}

debugGateExport().catch(console.error);