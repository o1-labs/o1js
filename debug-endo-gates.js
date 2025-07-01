import { Field, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

console.log('Testing EndoMul and EndoMulScalar gates...\n');

async function testEndoGates() {
  // First switch to Sparky backend
  await switchBackend('sparky');
  console.log('Switched to Sparky backend');
  
  // Create a circuit that uses EndoMul and EndoMulScalar gates
  const cs = Provable.constraintSystem(() => {
    console.log('\n1. Testing EndoMul gate...');
    
    try {
      // Create field variables for EndoMul gate
      const baseX = Field(123);
      const baseY = Field(456);
      const accX = Field(789);
      const accY = Field(101112);
      const n = Field(131415);
      const rX = Field(161718);
      const rY = Field(192021);
      const s1 = Field(222324);
      const s3 = Field(252627);
      const b1 = Field(1); // bit
      const b2 = Field(0); // bit
      const b3 = Field(1); // bit
      const b4 = Field(1); // bit
      const unused = Field(0);
      
      // Create raw gate values array (15 elements required)
      const endoMulValues = [
        baseX, baseY,     // Base point (wires 0-1)
        unused, unused,   // Unused (wires 2-3)
        accX, accY,       // Accumulator (wires 4-5)
        n,                // Scalar accumulator (wire 6)
        rX, rY,           // Intermediate point (wires 7-8)
        s1, s3,           // Slopes (wires 9-10)
        b1, b2, b3, b4    // Bits (wires 11-14)
      ];
      
      // Import gates module
      const gates = Field._provider.gates;
      
      // Call raw gate (5 = EndoMul)
      gates.raw(
        5, // EndoMul gate type
        endoMulValues,
        [] // No coefficients needed
      );
      
      console.log('✓ EndoMul gate created successfully');
      
    } catch (error) {
      console.error('✗ EndoMul gate failed:', error.message);
    }
    
    console.log('\n2. Testing EndoMulScalar gate...');
    
    try {
      // Create field variables for EndoMulScalar gate
      const n0 = Field(100);
      const n8 = Field(200);
      const a0 = Field(2);
      const b0 = Field(2);
      const a8 = Field(300);
      const b8 = Field(400);
      // Crumbs (2-bit values in {0,1,2,3})
      const x0 = Field(0);
      const x1 = Field(1);
      const x2 = Field(2);
      const x3 = Field(3);
      const x4 = Field(0);
      const x5 = Field(1);
      const x6 = Field(2);
      const x7 = Field(3);
      const unused = Field(0);
      
      // Create raw gate values array (15 elements required)
      const endoMulScalarValues = [
        n0, n8,           // Scalar accumulators (wires 0-1)
        a0, b0,           // Initial coefficients (wires 2-3)
        a8, b8,           // Final coefficients (wires 4-5)
        x0, x1, x2, x3,   // First 4 crumbs (wires 6-9)
        x4, x5, x6, x7,   // Next 4 crumbs (wires 10-13)
        unused            // Unused (wire 14)
      ];
      
      // Import gates module
      const gates = Field._provider.gates;
      
      // Call raw gate (6 = EndoMulScalar)
      gates.raw(
        6, // EndoMulScalar gate type
        endoMulScalarValues,
        [] // No coefficients needed
      );
      
      console.log('✓ EndoMulScalar gate created successfully');
      
    } catch (error) {
      console.error('✗ EndoMulScalar gate failed:', error.message);
    }
  });
  
  // Check the constraint system
  console.log('\n3. Checking constraint system...');
  
  if (cs && cs.gates) {
    console.log(`✓ Constraint system has ${cs.gates.length} gates`);
    
    // Look for our gates in the system
    let endoMulCount = 0;
    let endoMulScalarCount = 0;
    
    cs.gates.forEach((gate, index) => {
      if (gate.type === 'EndoMul') {
        endoMulCount++;
        console.log(`  Found EndoMul gate at index ${index}`);
      }
      if (gate.type === 'EndoMulScalar') {
        endoMulScalarCount++;
        console.log(`  Found EndoMulScalar gate at index ${index}`);
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`  EndoMul gates: ${endoMulCount}`);
    console.log(`  EndoMulScalar gates: ${endoMulScalarCount}`);
    console.log(`  Total gates: ${cs.gates.length}`);
    
    // Show some gates
    console.log('\nFirst few gates:');
    cs.gates.slice(0, 5).forEach((gate, index) => {
      console.log(`  Gate ${index}: ${gate.type}`);
    });
  }
  
  // Switch back to Snarky
  await switchBackend('snarky');
  console.log('\nSwitched back to Snarky backend');
}

testEndoGates().catch(console.error);