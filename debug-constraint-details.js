/**
 * Detailed constraint analysis to verify 5->1 optimization claim
 */

import { switchBackend, getCurrentBackend, Field, Provable } from './dist/node/index.js';

async function testConstraintDetails() {
  console.log('🔍 ULTRATHINKING: Detailed constraint analysis');
  
  try {
    console.log('\n🧪 FIRST: Test with SNARKY backend as baseline');
    await switchBackend('snarky');
    console.log(`✅ Switched to backend: ${getCurrentBackend()}`);
    
    const snarkyResult = Provable.constraintSystem(() => {
      console.log('  🔍 [SNARKY] Inside constraint system...');
      
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      
      console.log('  🔍 [SNARKY] Created witnesses');
      
      a.assertEquals(Field(5));
      console.log('  🔍 [SNARKY] Asserted a = 5');
      
      b.assertEquals(Field(10));
      console.log('  🔍 [SNARKY] Asserted b = 10');
      
      const c = a.add(b);
      console.log('  🔍 [SNARKY] Computed c = a + b');
      
      c.assertEquals(Field(15));
      console.log('  🔍 [SNARKY] Asserted c = 15');
      
      return { a, b, c };
    });
    
    console.log('\n📊 SNARKY BASELINE:');
    console.log('Full result:', JSON.stringify(snarkyResult, null, 2));
    console.log('Gates count:', snarkyResult?.gates?.length || 'UNDEFINED');
    if (snarkyResult?.gates) {
      console.log('Gate types:', snarkyResult.gates.map(g => g.type));
    }
    
    console.log('\n🧪 SECOND: Test with SPARKY backend');
    await switchBackend('sparky');
    console.log(`✅ Switched to backend: ${getCurrentBackend()}`);
    
    const sparkyResult = Provable.constraintSystem(() => {
      console.log('  🔍 [SPARKY] Inside constraint system...');
      
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      
      console.log('  🔍 [SPARKY] Created witnesses');
      
      a.assertEquals(Field(5));
      console.log('  🔍 [SPARKY] Asserted a = 5');
      
      b.assertEquals(Field(10));
      console.log('  🔍 [SPARKY] Asserted b = 10');
      
      const c = a.add(b);
      console.log('  🔍 [SPARKY] Computed c = a + b');
      
      c.assertEquals(Field(15));
      console.log('  🔍 [SPARKY] Asserted c = 15');
      
      return { a, b, c };
    });
    
    console.log('\n📊 SPARKY RESULT:');
    console.log('Full result:', JSON.stringify(sparkyResult, null, 2));
    console.log('Gates count:', sparkyResult?.gates?.length || 'UNDEFINED');
    if (sparkyResult?.gates) {
      console.log('Gate types:', sparkyResult.gates.map(g => g.type));
    }
    
    console.log('\n🔍 THIRD: Test with UNOPTIMIZABLE operations');
    const sparkyUnoptimizable = Provable.constraintSystem(() => {
      console.log('  🔍 [SPARKY UNOPTIMIZABLE] Testing multiplication...');
      
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(7));
      
      // Multiplication should be unoptimizable
      const c = a.mul(b);
      c.assertEquals(Field(35));
      
      // Another multiplication
      const d = c.mul(a);
      d.assertEquals(Field(175));
      
      console.log('  🔍 [SPARKY UNOPTIMIZABLE] Created multiplication chain');
      
      return { a, b, c, d };
    });
    
    console.log('\n📊 SPARKY UNOPTIMIZABLE:');
    console.log('Full result:', JSON.stringify(sparkyUnoptimizable, null, 2));
    console.log('Gates count:', sparkyUnoptimizable?.gates?.length || 'UNDEFINED');
    if (sparkyUnoptimizable?.gates) {
      console.log('Gate types:', sparkyUnoptimizable.gates.map(g => g.type));
    }
    
    console.log('\n🎯 ANALYSIS:');
    const snarkyCount = snarkyResult?.gates?.length || 0;
    const sparkyCount = sparkyResult?.gates?.length || 0;
    const unoptCount = sparkyUnoptimizable?.gates?.length || 0;
    
    console.log(`Snarky constraints: ${snarkyCount}`);
    console.log(`Sparky constraints: ${sparkyCount}`);
    console.log(`Sparky unoptimizable: ${unoptCount}`);
    
    if (snarkyCount > 0 && sparkyCount > 0) {
      console.log(`Reduction ratio: ${sparkyCount}/${snarkyCount} = ${(sparkyCount/snarkyCount).toFixed(2)}x`);
      
      if (sparkyCount === 1 && snarkyCount > 3) {
        console.log('🚨 SUSPICIOUS: Extreme reduction - possible over-optimization!');
      }
    } else {
      console.log('🚨 ERROR: Unable to compare - missing constraint data');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConstraintDetails();