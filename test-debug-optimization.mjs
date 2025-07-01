#!/usr/bin/env node

/**
 * Debug test for constraint optimization
 */

import { Field, Provable } from './dist/node/index.js';
import { Snarky, switchBackend } from './dist/node/bindings.js';

async function testBasic() {
  try {
    console.log('🔍 Testing basic Sparky functionality...');
    await switchBackend('sparky');
    console.log('✅ Sparky loaded successfully');
    
    console.log('🔍 Testing constraint system creation...');
    const cs = Snarky.run.enterConstraintSystem();
    console.log('✅ Constraint system created');
    
    console.log('🔍 Testing empty constraint system...');
    const constraintSystem = cs();
    console.log('✅ Empty constraint system works');
    
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    console.log('✅ JSON export works, gates:', json.gates?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testSimpleConstraint() {
  try {
    console.log('\n🔍 Testing simple constraint...');
    await switchBackend('sparky');
    
    const cs = Snarky.run.enterConstraintSystem();
    
    console.log('🔍 Creating witness variable...');
    const x = Provable.witness(Field, () => Field(5));
    console.log('✅ Witness created');
    
    console.log('🔍 Adding constraint: x = 5...');
    x.assertEquals(Field(5));
    console.log('✅ Constraint added');
    
    const constraintSystem = cs();
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    console.log('✅ Constraint test passed, gates:', json.gates?.length || 0);
    
  } catch (error) {
    console.error('❌ Error in simple constraint test:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function main() {
  await testBasic();
  await testSimpleConstraint();
}

main().catch(console.error);