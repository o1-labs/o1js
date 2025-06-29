/**
 * Test if the JSON format issue still exists
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend, Snarky } from './dist/node/index.js';

async function testConstraintJsonFormat() {
  console.log('🔍 Testing constraint system JSON format...');
  
  await initializeBindings();
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n🔨 Testing with ${backend} backend...`);
    await switchBackend(backend);
    
    try {
      // Enter constraint system mode
      Snarky.constraintSystem.enterConstraintSystem();
      
      // Create some constraints
      const x = Snarky.field.exists();
      const y = Snarky.field.exists();
      const z = Snarky.field.mul(x, y);
      Snarky.field.assertEqual(z, Snarky.field.constant('35'));
      
      // Get constraint system
      const cs = Snarky.constraintSystem.getConstraintSystemJson();
      
      console.log(`${backend} constraint system type:`, typeof cs);
      
      if (typeof cs === 'string') {
        try {
          const parsed = JSON.parse(cs);
          console.log(`${backend} JSON structure keys:`, Object.keys(parsed));
          console.log(`Has 'gates' key:`, 'gates' in parsed);
          console.log(`Has 'constraints' key:`, 'constraints' in parsed);
          
          if (parsed.gates) {
            console.log(`First gate:`, JSON.stringify(parsed.gates[0], null, 2));
          }
          if (parsed.constraints) {
            console.log(`First constraint:`, JSON.stringify(parsed.constraints[0], null, 2));
          }
        } catch (e) {
          console.log(`Failed to parse JSON:`, e.message);
        }
      } else {
        console.log(`${backend} returns object directly:`, Object.keys(cs || {}));
      }
      
    } catch (error) {
      console.error(`❌ ${backend} error:`, error.message);
    } finally {
      try {
        Snarky.constraintSystem.exitConstraintSystem();
      } catch (e) {
        // Ignore exit errors
      }
    }
  }
  
  console.log('\n📊 Summary: Check if JSON format mismatch still exists');
}

testConstraintJsonFormat().catch(console.error);