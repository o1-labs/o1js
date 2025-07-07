/**
 * Simple test to check if the permutation bug is fixed
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testBackend(backend) {
  console.log(`\n🔄 Testing ${backend}...`);
  
  await switchBackend(backend);
  
  try {
    // Simple constraint system with assertEquals
    await Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(5));
      
      // This should create a Linear constraint that triggers variable unification
      x.assertEquals(y);
    });
    
    console.log(`✅ ${backend}: PASSED`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${backend}: FAILED - ${error.message}`);
    if (error.message.includes('permutation')) {
      console.log('   ⚠️  Permutation bug detected!');
    }
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Permutation Bug Fix');
  console.log('==============================');
  
  const snarkyPassed = await testBackend('snarky');
  const sparkyPassed = await testBackend('sparky');
  
  console.log('\n📊 Results:');
  console.log(`Snarky: ${snarkyPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sparky: ${sparkyPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (snarkyPassed && sparkyPassed) {
    console.log('\n🎉 SUCCESS: Variable unification fix is working!');
  } else {
    console.log('\n💥 FAILURE: Permutation bug still present');
    process.exit(1);
  }
}

main().catch(console.error);