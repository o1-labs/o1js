#!/usr/bin/env node

/**
 * Test script to demonstrate Sparky constraint system JSON generation and optimization
 * 
 * Created: January 5, 2025, 01:00 UTC
 */

import { Field, Bool, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testSparkyConstraintJSON() {
  console.log('🧪 Sparky Constraint System JSON Test\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Using Sparky backend\n');
  
  // Test various operations
  const operations = [
    {
      name: 'Simple Addition',
      fn: async () => {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Field, () => Field(10));
          const b = Provable.witness(Field, () => Field(20));
          const c = a.add(b);
          c.assertEquals(Field(30));
          return c;
        });
        return cs;
      }
    },
    {
      name: 'Multiplication',
      fn: async () => {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Field, () => Field(7));
          const b = Provable.witness(Field, () => Field(11));
          const c = a.mul(b);
          c.assertEquals(Field(77));
          return c;
        });
        return cs;
      }
    },
    {
      name: 'Boolean AND',
      fn: async () => {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Bool, () => Bool(true));
          const b = Provable.witness(Bool, () => Bool(false));
          const c = a.and(b);
          c.assertEquals(Bool(false));
          return c;
        });
        return cs;
      }
    },
    {
      name: 'Conditional (Provable.if)',
      fn: async () => {
        const cs = await Provable.constraintSystem(() => {
          const cond = Provable.witness(Bool, () => Bool(true));
          const a = Provable.witness(Field, () => Field(42));
          const b = Provable.witness(Field, () => Field(17));
          const result = Provable.if(cond, a, b);
          result.assertEquals(Field(42));
          return result;
        });
        return cs;
      }
    },
    {
      name: 'Complex Expression',
      fn: async () => {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Field, () => Field(2));
          const b = Provable.witness(Field, () => Field(3));
          const c = Provable.witness(Field, () => Field(4));
          // (a + b) * c - a = (2 + 3) * 4 - 2 = 5 * 4 - 2 = 20 - 2 = 18
          const sum = a.add(b);
          const product = sum.mul(c);
          const result = product.sub(a);
          result.assertEquals(Field(18));
          return result;
        });
        return cs;
      }
    }
  ];
  
  console.log('Running constraint system tests...\n');
  
  for (const op of operations) {
    console.log(`📋 ${op.name}`);
    console.log('─'.repeat(50));
    
    try {
      const cs = await op.fn();
      
      console.log(`✅ Constraint system generated`);
      console.log(`  • Rows: ${cs.rows || 'N/A'}`);
      console.log(`  • Gates: ${cs.gates || 'N/A'}`);
      console.log(`  • Public inputs: ${cs.publicInputSize || 0}`);
      
      // Try to convert to JSON
      if (cs.gates && Array.isArray(cs.gates)) {
        const json = {
          gates: cs.gates,
          public_input_size: cs.publicInputSize || 0
        };
        
        console.log(`\n📊 Gate Analysis:`);
        const gateTypes = {};
        json.gates.forEach(gate => {
          const type = gate.typ || gate.type || 'unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        
        Object.entries(gateTypes).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count}`);
        });
        
        // Show first few gates
        console.log(`\n🔍 First few gates (out of ${json.gates.length}):`);
        json.gates.slice(0, 2).forEach((gate, i) => {
          console.log(`  Gate ${i}: ${gate.typ || gate.type}`);
          if (gate.coeffs) {
            // Show simplified coeffs (just count)
            console.log(`    - ${gate.coeffs.length} coefficients`);
          }
          if (gate.wires) {
            console.log(`    - ${gate.wires.length} wires`);
          }
        });
        
      } else {
        console.log('  ℹ️  Gates not available in expected format');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n');
  }
  
  console.log('✨ Test complete!\n');
  
  // Show optimization information
  console.log('💡 Note: Sparky applies optimizations that reduce constraint count:');
  console.log('  • Linear combination merging');
  console.log('  • Constant folding');
  console.log('  • Redundant constraint elimination');
  console.log('  • Semantic optimizations for boolean operations');
}

// Run the test
testSparkyConstraintJSON().catch(console.error);