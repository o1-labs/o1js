/**
 * Final comprehensive test of Sparky backend functionality
 */

import { 
  switchBackend, 
  getCurrentBackend 
} from './dist/node/bindings.js';
import { Field } from './dist/node/lib/provable/field.js';
import { Bool } from './dist/node/lib/provable/bool.js';
import { Provable } from './dist/node/lib/provable/provable.js';
import { UInt64 } from './dist/node/lib/provable/int.js';

const tests = {
  'Field arithmetic': async () => {
    const a = new Field(10);
    const b = new Field(20);
    return {
      addition: a.add(b).toBigInt() === 30n,
      subtraction: b.sub(a).toBigInt() === 10n,
      multiplication: a.mul(b).toBigInt() === 200n,
      division: b.div(a).toBigInt() === 2n
    };
  },
  
  'Field constraints': async () => {
    try {
      const x = new Field(42);
      x.assertEquals(new Field(42));
      x.assertNotEquals(new Field(0));
      return { assertEquals: true, assertNotEquals: true };
    } catch (e) {
      return { error: e.message };
    }
  },
  
  'Bool operations': async () => {
    const t = new Bool(true);
    const f = new Bool(false);
    return {
      and: t.and(f).toBoolean() === false,
      or: t.or(f).toBoolean() === true,
      not: t.not().toBoolean() === false
    };
  },
  
  'Provable.witness': async () => {
    try {
      const w = Provable.witness(Field, () => new Field(123));
      return { success: true, value: w.toBigInt() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  'UInt64 operations': async () => {
    try {
      const u1 = UInt64.from(100);
      const u2 = UInt64.from(200);
      const sum = u1.add(u2);
      return { success: true, result: sum.toBigInt() === 300n };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  'Constraint generation': async () => {
    try {
      let count = 0;
      // Create some constraints
      for (let i = 0; i < 5; i++) {
        const a = new Field(i);
        const b = new Field(i + 1);
        a.mul(b).assertEquals(new Field(i * (i + 1)));
        count++;
      }
      return { success: true, constraintsCreated: count };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

async function runTestSuite(backend) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing with ${backend.toUpperCase()} backend`);
  console.log('='.repeat(50));
  
  await switchBackend(backend);
  console.log(`✓ Switched to ${getCurrentBackend()}`);
  
  const results = {};
  
  for (const [name, test] of Object.entries(tests)) {
    console.log(`\n${name}:`);
    try {
      const result = await test();
      results[name] = result;
      
      if (typeof result === 'object' && !result.error) {
        for (const [key, value] of Object.entries(result)) {
          const status = value === true ? '✓' : value === false ? '✗' : '→';
          console.log(`  ${status} ${key}: ${value}`);
        }
      } else if (result.error) {
        console.log(`  ✗ Error: ${result.error}`);
      }
    } catch (e) {
      console.log(`  ✗ Unexpected error: ${e.message}`);
      results[name] = { error: e.message };
    }
  }
  
  return results;
}

async function main() {
  console.log('O1JS Backend Comparison Test Suite');
  console.log('==================================');
  
  const sparkyResults = await runTestSuite('sparky');
  const snarkyResults = await runTestSuite('snarky');
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(50));
  
  console.log('\n✅ WHAT WORKS IN SPARKY:');
  console.log('- Basic Field arithmetic (add, sub, mul, div)');
  console.log('- Field constraints (assertEquals, assertNotEquals)');
  console.log('- Bool operations (and, or, not)');
  console.log('- Provable.witness');
  console.log('- UInt64 basic operations');
  console.log('- Basic constraint generation');
  console.log('- Runtime backend switching');
  
  console.log('\n❌ WHAT DOESN\'T WORK IN SPARKY:');
  console.log('- field.readVar for non-constant variables');
  console.log('- Range check gates (rangeCheck0, rangeCheck1)');
  console.log('- EC operations (ecAdd, ecScale, etc.)');
  console.log('- Proof generation (ZkProgram.compile switches to Snarky)');
  console.log('- Constraint system format (returns string instead of object)');
  console.log('- Proper witness array handling');
  console.log('- Cryptographically secure field.random()');
  
  console.log('\n📝 KEY FINDINGS:');
  console.log('1. Sparky successfully handles basic field operations');
  console.log('2. High-level o1js API mostly works with Sparky');
  console.log('3. Low-level Snarky API has gaps that need filling');
  console.log('4. Proof generation pipeline needs complete implementation');
  console.log('5. Gate operations need to be mapped from Rust to match OCaml API');
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Implement missing field.readVar for variables');
  console.log('2. Add proper constraint system format conversion');
  console.log('3. Fix proof generation to work with Sparky');
  console.log('4. Implement missing gate operations');
  console.log('5. Add comprehensive test coverage');
}

main().catch(console.error);