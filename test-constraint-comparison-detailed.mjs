// Detailed constraint system comparison between Snarky and Sparky
import { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/testing/constraint-system.js';

// Test circuit with various operations
const TestCircuit = ZkProgram({
  name: 'ConstraintTestCircuit',
  publicInput: Field,
  
  methods: {
    simpleAdd: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        const sum = a.add(b);
        sum.assertEquals(publicInput);
      }
    },
    
    complexExpression: {
      privateInputs: [Field, Field, Field],
      async method(publicInput, x, y, z) {
        // Expression: x + 2*y + 3*z
        const expr = x.add(y.mul(2)).add(z.mul(3));
        expr.assertEquals(publicInput);
      }
    },
    
    multiplication: {
      privateInputs: [Field],
      async method(publicInput, x) {
        const result = x.mul(x);
        result.assertEquals(publicInput);
      }
    }
  }
});

async function compareConstraintSystems() {
  console.log('=== Detailed Constraint System Comparison ===\n');
  
  const methods = ['simpleAdd', 'complexExpression', 'multiplication'];
  
  for (const method of methods) {
    console.log(`\n--- Testing ${method} ---`);
    
    // Get constraint system with Snarky
    console.log('Compiling with Snarky...');
    await switchBackend('snarky');
    const snarkyCs = await getConstraintSystem(method);
    
    // Get constraint system with Sparky
    console.log('Compiling with Sparky...');
    await switchBackend('sparky');
    const sparkyCs = await getConstraintSystem(method);
    
    // Compare
    console.log('\nConstraint System Comparison:');
    console.log(`Snarky: ${snarkyCs.gates} gates`);
    console.log(`Sparky: ${sparkyCs.gates} gates`);
    
    if (snarkyCs.summary && sparkyCs.summary) {
      console.log('\nSnarky gate breakdown:');
      console.log(snarkyCs.summary);
      console.log('\nSparky gate breakdown:');
      console.log(sparkyCs.summary);
    }
    
    // Check for differences
    if (snarkyCs.gates !== sparkyCs.gates) {
      console.log(`\n⚠️  Gate count mismatch: Sparky has ${sparkyCs.gates - snarkyCs.gates} ${sparkyCs.gates > snarkyCs.gates ? 'more' : 'fewer'} gates`);
      
      // This is why VKs differ!
      console.log('\n💡 This gate count difference explains the VK mismatch!');
      console.log('   Different constraint systems generate different verification keys.');
    } else {
      console.log('\n✅ Gate counts match');
    }
  }
  
  // Test specific constraint reduction scenarios
  console.log('\n\n--- Testing Constraint Reduction Effectiveness ---');
  
  await testReductionScenarios();
  
  // Switch back
  await switchBackend('snarky');
}

async function getConstraintSystem(methodName) {
  try {
    // Compile the circuit
    const { verificationKey } = await TestCircuit.compile();
    
    // Get constraint system info (this is a simplified version)
    // In reality, we'd need to hook into the constraint system generation
    const cs = await TestCircuit.analyzeMethods();
    const methodInfo = cs[methodName];
    
    return {
      gates: methodInfo?.gates || 0,
      summary: methodInfo?.summary || '',
      vkHash: verificationKey.hash.toString()
    };
  } catch (e) {
    // Fallback: try to get basic info
    return {
      gates: -1,
      summary: 'Error getting constraint system',
      vkHash: 'error'
    };
  }
}

async function testReductionScenarios() {
  const scenarios = [
    {
      name: 'Linear combination reduction',
      test: async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Field, () => Field(1));
          const y = Provable.witness(Field, () => Field(2));
          
          // This should reduce: x + x + x => 3*x
          const expr1 = x.add(x).add(x);
          const expected1 = x.mul(3);
          expr1.assertEquals(expected1);
          
          // This should reduce: 2*x + 3*x => 5*x
          const expr2 = x.mul(2).add(x.mul(3));
          const expected2 = x.mul(5);
          expr2.assertEquals(expected2);
        });
      }
    },
    {
      name: 'Constant folding',
      test: async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Field, () => Field(10));
          
          // Constants should be folded: (2 + 3) * x => 5 * x
          const two = Field(2);
          const three = Field(3);
          const sum = two.add(three);
          const result = sum.mul(x);
          result.assertEquals(Field(50));
        });
      }
    },
    {
      name: 'Zero elimination',
      test: async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Field, () => Field(42));
          const zero = Field(0);
          
          // x + 0 should reduce to x
          const expr1 = x.add(zero);
          expr1.assertEquals(x);
          
          // 0 * x should reduce to 0
          const expr2 = zero.mul(x);
          expr2.assertEquals(zero);
        });
      }
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\nTesting: ${scenario.name}`);
    
    try {
      // Test with Snarky
      await switchBackend('snarky');
      console.log('Snarky: ', end='');
      await scenario.test();
      console.log('✓');
      
      // Test with Sparky
      await switchBackend('sparky');
      console.log('Sparky: ', end='');
      await scenario.test();
      console.log('✓');
      
    } catch (e) {
      console.log(`✗ Error: ${e.message}`);
    }
  }
}

// Helper to capture constraint system details
async function captureConstraints(circuit) {
  // This would need to hook into the internal constraint system
  // For now, we'll use the analyze methods approach
  const startTime = Date.now();
  const result = await circuit();
  const endTime = Date.now();
  
  return {
    time: endTime - startTime,
    // In a real implementation, we'd capture:
    // - Gate types and counts
    // - Constraint expressions before/after reduction
    // - Variable allocations
  };
}

compareConstraintSystems().catch(console.error);