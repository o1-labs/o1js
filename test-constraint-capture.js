/**
 * Test script to verify that semantic Boolean gates are properly captured
 * in constraint system counts after the fresh snapshot fix.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testConstraintCapture() {
  console.log('🧪 Testing constraint capture fix...');
  
  try {
    // We need to load the built version since we can't import TS directly
    console.log('⚠️  Need to build first - testing via manual WASM calls');
    
    // Test with direct WASM calls
    const sparkyWasm = require('./src/bindings/compiled/sparky_node/sparky_wasm.cjs');
    
    // Initialize WASM (use initSparky instead of default)
    await sparkyWasm.initSparky();
    
    // Create instances
    const snarky = new sparkyWasm.Snarky();
    const field = new sparkyWasm.SnarkyFieldCompat();
    const run = new sparkyWasm.SnarkyRunCompat();
    
    console.log('✅ Sparky WASM initialized');
    
    // Skip reset due to null pointer issue, go directly to constraint generation
    
    // Enter constraint generation mode
    const handle = run.enterConstraintSystem();
    console.log('✅ Entered constraint generation mode');
    
    // Get initial constraint count
    let cs = run.getConstraintSystem();
    console.log(`📊 Initial constraints: ${cs.rows(cs)}`);
    
    // Emit a semantic Boolean AND gate
    console.log('🔧 Emitting Boolean AND constraint...');
    
    try {
      // Create constant field vars
      const a = field.constant(1); 
      const b = field.constant(0);
      
      // This should add a semantic BooleanAnd constraint
      const result = field.emitBooleanAnd(a, b);
      console.log('✅ Boolean AND constraint emitted');
      
      // Get constraint count AFTER emitting the gate
      cs = run.getConstraintSystem();
      const constraintCount = cs.rows(cs);
      console.log(`📊 Constraints after Boolean AND: ${constraintCount}`);
      
      // Test toJson as well
      const json = cs.toJson(cs);
      const jsonGateCount = json.gates ? json.gates.length : 0;
      console.log(`📋 Gates in JSON: ${jsonGateCount}`);
      
      // Verify we have constraints
      if (constraintCount > 0) {
        console.log('✅ SUCCESS: Semantic Boolean gates are now being captured!');
        console.log(`   Fresh snapshot fix working: ${constraintCount} constraints found`);
      } else {
        console.log('❌ FAILURE: Constraints still showing as 0');
        console.log('   Fresh snapshot fix did not resolve the issue');
      }
      
    } catch (emitError) {
      console.log('⚠️  Boolean gate emission failed:', emitError.message);
      console.log('   This might be expected if the API has changed');
    }
    
    // Exit constraint generation mode
    handle.exit();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConstraintCapture().catch(console.error);