#!/usr/bin/env node

import { Field, Provable, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';
import crypto from 'crypto';

console.log('=== VK Parity Testing ===\n');

await initializeBindings();

// Helper to hash VK for comparison
function hashVK(vk) {
  return crypto.createHash('sha256').update(JSON.stringify(vk)).digest('hex').substring(0, 16);
}

// Test programs
const testPrograms = {
  // 1. Simple multiplication
  simpleMultiplication: ZkProgram({
    name: 'SimpleMultiplication',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field, Field],
        async method(expected, a, b) {
          a.mul(b).assertEquals(expected);
        }
      }
    }
  }),

  // 2. Addition chain
  additionChain: ZkProgram({
    name: 'AdditionChain',
    publicInput: Field,
    methods: {
      add: {
        privateInputs: [Field, Field, Field],
        async method(expected, a, b, c) {
          a.add(b).add(c).assertEquals(expected);
        }
      }
    }
  }),

  // 3. Complex expression
  complexExpression: ZkProgram({
    name: 'ComplexExpression',
    publicInput: Field,
    methods: {
      compute: {
        privateInputs: [Field, Field, Field],
        async method(expected, a, b, c) {
          // (a * b) + (b * c) = expected
          const ab = a.mul(b);
          const bc = b.mul(c);
          ab.add(bc).assertEquals(expected);
        }
      }
    }
  }),

  // 4. Nested operations
  nestedOperations: ZkProgram({
    name: 'NestedOperations',
    publicInput: Field,
    methods: {
      nested: {
        privateInputs: [Field, Field],
        async method(expected, a, b) {
          // ((a + b) * (a - b)) = expected
          const sum = a.add(b);
          const diff = a.sub(b);
          sum.mul(diff).assertEquals(expected);
        }
      }
    }
  }),

  // 5. Multiple assertions
  multipleAssertions: ZkProgram({
    name: 'MultipleAssertions',
    publicInput: Field,
    methods: {
      multiAssert: {
        privateInputs: [Field, Field],
        async method(expected, a, b) {
          const product = a.mul(b);
          product.assertEquals(expected);
          
          // Additional assertion
          a.add(b).assertLessThan(Field(1000));
        }
      }
    }
  }),

  // 6. Simple equality
  simpleEquality: ZkProgram({
    name: 'SimpleEquality',
    publicInput: Field,
    methods: {
      equal: {
        privateInputs: [Field],
        async method(expected, input) {
          input.assertEquals(expected);
        }
      }
    }
  }),

  // 7. Square operation
  squareOperation: ZkProgram({
    name: 'SquareOperation',
    publicInput: Field,
    methods: {
      square: {
        privateInputs: [Field],
        async method(expected, input) {
          input.square().assertEquals(expected);
        }
      }
    }
  })
};

// Test each program
const results = [];

for (const [name, program] of Object.entries(testPrograms)) {
  console.log(`\nTesting ${name}...`);
  
  try {
    // Compile with Snarky
    await switchBackend('snarky');
    console.log('  Compiling with Snarky...');
    const snarkyStart = Date.now();
    const snarkyCompiled = await program.compile();
    const snarkyTime = Date.now() - snarkyStart;
    const snarkyAnalysis = await program.analyzeMethods();
    const snarkyConstraints = Object.values(snarkyAnalysis)[0]?.rows || 0;
    const snarkyVKHash = hashVK(snarkyCompiled.verificationKey);
    
    // Compile with Sparky
    await switchBackend('sparky');
    console.log('  Compiling with Sparky...');
    const sparkyStart = Date.now();
    const sparkyCompiled = await program.compile();
    const sparkyTime = Date.now() - sparkyStart;
    const sparkyAnalysis = await program.analyzeMethods();
    const sparkyConstraints = Object.values(sparkyAnalysis)[0]?.rows || 0;
    const sparkyVKHash = hashVK(sparkyCompiled.verificationKey);
    
    // Compare results
    const vkMatch = snarkyVKHash === sparkyVKHash;
    const constraintMatch = snarkyConstraints === sparkyConstraints;
    
    results.push({
      name,
      snarky: {
        vkHash: snarkyVKHash,
        constraints: snarkyConstraints,
        time: snarkyTime
      },
      sparky: {
        vkHash: sparkyVKHash,
        constraints: sparkyConstraints,
        time: sparkyTime
      },
      vkMatch,
      constraintMatch
    });
    
    console.log(`  Snarky: ${snarkyConstraints} constraints, VK: ${snarkyVKHash}, Time: ${snarkyTime}ms`);
    console.log(`  Sparky: ${sparkyConstraints} constraints, VK: ${sparkyVKHash}, Time: ${sparkyTime}ms`);
    console.log(`  VK Match: ${vkMatch ? '✅' : '❌'}`);
    console.log(`  Constraint Match: ${constraintMatch ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    results.push({
      name,
      error: error.message
    });
  }
}

// Summary
console.log('\n=== VK Parity Summary ===\n');

const successful = results.filter(r => !r.error);
const vkMatches = successful.filter(r => r.vkMatch);
const constraintMatches = successful.filter(r => r.constraintMatch);

console.log(`Total tests: ${results.length}`);
console.log(`Successful compilations: ${successful.length}`);
console.log(`VK matches: ${vkMatches.length}/${successful.length} (${Math.round(vkMatches.length/successful.length*100)}%)`);
console.log(`Constraint count matches: ${constraintMatches.length}/${successful.length} (${Math.round(constraintMatches.length/successful.length*100)}%)`);

console.log('\nDetailed Results:');
console.log('Program                  | VK Match | Constraints Match | Snarky | Sparky |');
console.log('-------------------------|----------|-------------------|--------|--------|');
for (const result of results) {
  if (result.error) {
    console.log(`${result.name.padEnd(24)} | ERROR: ${result.error}`);
  } else {
    console.log(
      `${result.name.padEnd(24)} | ${result.vkMatch ? '   ✅   ' : '   ❌   '} | ` +
      `${result.constraintMatch ? '       ✅        ' : '       ❌        '} | ` +
      `${String(result.snarky.constraints).padEnd(6)} | ${String(result.sparky.constraints).padEnd(6)} |`
    );
  }
}

// Switch back to default
await switchBackend('snarky');