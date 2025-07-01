import { Field, switchBackend, Provable } from 'o1js';

// Example of using EndoMul and EndoMulScalar gates with Sparky backend

async function main() {
  console.log('EndoMul and EndoMulScalar Gates Example\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('Switched to Sparky backend');
  
  // Create a test circuit
  console.log('\nCreating circuit with EndoMul and EndoMulScalar gates...');
  
  const MyCircuit = Provable.witness(Field, () => {
    // Access gates through the global gates object
    const gates = (globalThis as any).gates;
    
    if (!gates || !gates.raw) {
      console.error('Gates API not available');
      return Field(0);
    }
    
    // Create wire values for EndoMul gate
    const endoMulWires = [
      Field(123), Field(456),    // Base point (x, y)
      Field(0), Field(0),        // Unused
      Field(789), Field(101112), // Accumulator point (x, y)
      Field(131415),             // Scalar accumulator
      Field(161718), Field(192021), // Intermediate point R (x, y)
      Field(222324), Field(252627), // Slopes s1, s3
      Field(1), Field(0), Field(1), Field(1) // Bits b1-b4
    ];
    
    console.log('Creating EndoMul gate (type 5)...');
    try {
      gates.raw(5, endoMulWires, []);
      console.log('✓ EndoMul gate created successfully');
    } catch (e: any) {
      console.error('✗ EndoMul gate failed:', e.message);
    }
    
    // Create wire values for EndoMulScalar gate
    const endoMulScalarWires = [
      Field(100), Field(200),    // n0, n8 (scalar accumulators)
      Field(2), Field(2),        // a0, b0 (initial coefficients)
      Field(300), Field(400),    // a8, b8 (final coefficients)
      Field(0), Field(1), Field(2), Field(3), // Crumbs x0-x3
      Field(0), Field(1), Field(2), Field(3), // Crumbs x4-x7
      Field(0)                   // Unused
    ];
    
    console.log('Creating EndoMulScalar gate (type 6)...');
    try {
      gates.raw(6, endoMulScalarWires, []);
      console.log('✓ EndoMulScalar gate created successfully');
    } catch (e: any) {
      console.error('✗ EndoMulScalar gate failed:', e.message);
    }
    
    return Field(42); // Return dummy value
  });
  
  // Get constraint system
  console.log('\nAnalyzing constraint system...');
  const cs = Provable.constraintSystem(() => {
    MyCircuit;
  });
  
  console.log(`Constraint system has ${cs.rows} rows`);
  console.log(`Public input size: ${cs.publicInputSize}`);
  
  // Get detailed gate information
  const sparky = (globalThis as any).__sparkyInstance;
  if (sparky && sparky._constraintSystemJSON) {
    try {
      const csJson = sparky._constraintSystemJSON();
      const parsed = JSON.parse(csJson);
      
      console.log(`\nTotal gates: ${parsed.gates?.length || 0}`);
      
      if (parsed.gates && parsed.gates.length > 0) {
        // Count gate types
        const gateTypes: Record<string, number> = {};
        parsed.gates.forEach((gate: any) => {
          gateTypes[gate.typ] = (gateTypes[gate.typ] || 0) + 1;
        });
        
        console.log('\nGate type breakdown:');
        Object.entries(gateTypes).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
        
        // Look for our gates
        const endoMulGates = parsed.gates.filter((g: any) => g.typ === 'EndoMul');
        const endoMulScalarGates = parsed.gates.filter((g: any) => g.typ === 'EndoMulScalar');
        
        if (endoMulGates.length > 0) {
          console.log(`\n✓ Found ${endoMulGates.length} EndoMul gate(s)`);
        }
        if (endoMulScalarGates.length > 0) {
          console.log(`✓ Found ${endoMulScalarGates.length} EndoMulScalar gate(s)`);
        }
      }
    } catch (e: any) {
      console.error('Failed to parse constraint system:', e.message);
    }
  }
  
  // Switch back
  await switchBackend('snarky');
  console.log('\nSwitched back to Snarky backend');
}

main().catch(console.error);