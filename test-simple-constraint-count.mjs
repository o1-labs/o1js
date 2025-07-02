#!/usr/bin/env node

/**
 * Simple test to check constraint counts for basic operations
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testConstraintCount(backend) {
  console.log(`\n🔧 Testing constraint counts with ${backend.toUpperCase()}...`);
  
  await switchBackend(backend);
  
  // Test 1: Single addition
  const singleAdd = () => {
    const a = Provable.witness(Field, () => Field(1));
    const b = Provable.witness(Field, () => Field(2));
    const c = a.add(b);
    c.assertEquals(Field(3));
    return c;
  };
  
  const cs1 = await Provable.constraintSystem(singleAdd);
  console.log(`   Single addition: ${cs1.gates.length} constraints`);
  
  // Test 2: Two additions
  const twoAdds = () => {
    const a = Provable.witness(Field, () => Field(1));
    const b = Provable.witness(Field, () => Field(2));
    const c = Provable.witness(Field, () => Field(3));
    const sum1 = a.add(b);
    const sum2 = sum1.add(c);
    sum2.assertEquals(Field(6));
    return sum2;
  };
  
  const cs2 = await Provable.constraintSystem(twoAdds);
  console.log(`   Two additions: ${cs2.gates.length} constraints`);
  
  // Test 3: Five additions
  const fiveAdds = () => {
    let sum = Provable.witness(Field, () => Field(0));
    for (let i = 1; i <= 5; i++) {
      const next = Provable.witness(Field, () => Field(i));
      sum = sum.add(next);
    }
    sum.assertEquals(Field(15)); // 1+2+3+4+5 = 15
    return sum;
  };
  
  const cs3 = await Provable.constraintSystem(fiveAdds);
  console.log(`   Five additions: ${cs3.gates.length} constraints`);
  
  return {
    backend,
    singleAdd: cs1.gates.length,
    twoAdds: cs2.gates.length,
    fiveAdds: cs3.gates.length
  };
}

async function main() {
  console.log('🚀 Constraint Count Comparison');
  console.log('==============================');
  
  try {
    const snarky = await testConstraintCount('snarky');
    const sparky = await testConstraintCount('sparky');
    
    console.log('\n📊 COMPARISON');
    console.log('=============');
    console.log(`Single addition: Snarky=${snarky.singleAdd}, Sparky=${sparky.singleAdd} (ratio: ${(sparky.singleAdd/snarky.singleAdd).toFixed(2)}x)`);
    console.log(`Two additions: Snarky=${snarky.twoAdds}, Sparky=${sparky.twoAdds} (ratio: ${(sparky.twoAdds/snarky.twoAdds).toFixed(2)}x)`);
    console.log(`Five additions: Snarky=${snarky.fiveAdds}, Sparky=${sparky.fiveAdds} (ratio: ${(sparky.fiveAdds/snarky.fiveAdds).toFixed(2)}x)`);
    
    const avgRatio = (sparky.singleAdd/snarky.singleAdd + sparky.twoAdds/snarky.twoAdds + sparky.fiveAdds/snarky.fiveAdds) / 3;
    console.log(`\nAverage constraint ratio: ${avgRatio.toFixed(2)}x`);
    
    if (avgRatio > 2.0) {
      console.log('🚨 CRITICAL: Sparky is generating significantly more constraints than Snarky');
      console.log('   This suggests the reduce_lincom optimization is not working correctly');
    } else if (avgRatio > 1.2) {
      console.log('⚠️  WARNING: Sparky generates more constraints than Snarky');
    } else {
      console.log('✅ Constraint counts are comparable between backends');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().catch(console.error);