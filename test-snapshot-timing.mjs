import { Field, switchBackend } from './dist/node/index.js';

// Test to verify the snapshot timing issue
async function testSnapshotTiming() {
  console.log('Testing constraint system snapshot timing issue\n');
  
  await switchBackend('sparky');
  
  // Get the global constraint bridge
  const bridge = globalThis.sparkyConstraintBridge;
  if (!bridge) {
    console.error('Constraint bridge not available');
    return;
  }
  
  console.log('=== Test 1: Direct constraint counting ===');
  
  // Start fresh
  bridge.reset();
  
  // Enter constraint mode
  console.log('Entering constraint mode...');
  bridge.startConstraintAccumulation();
  
  // Check initial count
  console.log('Initial constraint count:', bridge.getConstraintCount());
  
  // Add some constraints directly
  console.log('\nAdding constraints...');
  const a = new Field(5);
  const b = new Field(10);
  const c = a.add(b);
  
  console.log('After addition:', bridge.getConstraintCount());
  
  const d = c.mul(new Field(2));
  console.log('After multiplication:', bridge.getConstraintCount());
  
  // End constraint mode
  console.log('\nEnding constraint mode...');
  bridge.endConstraintAccumulation();
  
  console.log('Final count:', bridge.getConstraintCount());
  
  console.log('\n=== Test 2: Constraint system snapshot ===');
  
  // Reset and test with constraint system object
  bridge.reset();
  bridge.startConstraintAccumulation();
  
  // Get constraint system early
  const cs1 = bridge.getConstraintSystem();
  console.log('Early snapshot - constraints:', cs1.rows());
  
  // Add constraints after getting the system
  console.log('\nAdding constraints after snapshot...');
  const x = new Field(20);
  const y = new Field(30);
  const z = x.add(y);
  
  // Check if the same constraint system object updates
  console.log('Same cs object - constraints:', cs1.rows());
  
  // Get a fresh constraint system
  const cs2 = bridge.getConstraintSystem();
  console.log('Fresh cs object - constraints:', cs2.rows());
  
  // Direct count from bridge
  console.log('Direct bridge count:', bridge.getConstraintCount());
  
  bridge.endConstraintAccumulation();
  
  console.log('\n=== Test 3: Public input handling ===');
  
  // This mimics what happens with ZkProgram with public inputs
  bridge.reset();
  bridge.startConstraintAccumulation();
  
  // Create public input (this is what ZkProgram does)
  console.log('Creating public input...');
  const publicInput = bridge.createPublicInput();
  console.log('Public input created');
  
  // Get constraint system (this might happen early in the flow)
  const csPublic = bridge.getConstraintSystem();
  console.log('Constraints after public input:', csPublic.rows());
  
  // Now add actual method constraints
  console.log('Adding method constraints...');
  const result = publicInput.add(new Field(1));
  
  console.log('Final constraints:', csPublic.rows());
  console.log('Direct count:', bridge.getConstraintCount());
  
  bridge.endConstraintAccumulation();
}

testSnapshotTiming().catch(console.error);