import { Field, initializeBindings, switchBackend, Provable, Gadgets } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function testRawGate() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Testing raw gate call directly ===');
  
  // First, test if we can get the gates module
  try {
    // Access the sparky adapter directly
    const sparkyWasm = global.sparkyWasm;
    console.log('Sparky WASM available:', !!sparkyWasm);
    
    if (sparkyWasm && sparkyWasm.gates) {
      console.log('Gates module available:', !!sparkyWasm.gates);
      console.log('Rotate function available:', typeof sparkyWasm.gates.rotate);
    }
  } catch (e) {
    console.error('Error accessing WASM:', e.message);
  }
  
  // Now test the actual rotate call in constraint context
  console.log('\n=== Testing rotate in constraint context ===');
  
  try {
    const result = Provable.constraintSystem(() => {
      console.log('Inside constraint system...');
      
      // Create some simple fields
      const a = Field(15);
      const b = Field(240); // 15 << 4
      
      console.log('Created fields...');
      
      // Try a simple assertion first
      a.assertEquals(a);
      console.log('Simple assertion works...');
      
      // Now try the rotate gadget
      console.log('About to call rotate gadget...');
      try {
        const rotated = rotate64(a, 4, 'left'); // This should fail
        console.log('Rotate succeeded?!');
      } catch (rotateError) {
        console.error('Direct rotate error:', rotateError.message);
        console.error('Error type:', typeof rotateError);
        console.error('Error details:', rotateError);
      }
    });
    
    console.log('Constraint system completed');
  } catch (e) {
    console.error('Constraint system error:', e.message);
    console.error('Error type:', typeof e);
    console.error('Error stack:', e.stack);
  }
}

testRawGate().catch(console.error);