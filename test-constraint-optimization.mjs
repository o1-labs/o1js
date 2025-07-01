import { Field, ZkProgram, switchBackend, getCurrentBackend, initializeBindings } from './dist/node/index.js';

console.log('Testing constraint optimization in Sparky...');

// Initialize bindings
await initializeBindings();

// Test program that should benefit from optimization
const OptimizationTest = ZkProgram({
  name: 'optimization-test',
  publicInput: Field,
  methods: {
    // Test 1: Simple linear combination that should be optimized
    testLinearCombination: {
      privateInputs: [Field, Field],
      method(sum, x, y) {
        // This creates: 3*x + 2*x + y = sum
        // Should optimize to: 5*x + y = sum
        const threeX = x.mul(3);
        const twoX = x.mul(2);
        const fiveX = threeX.add(twoX);
        const result = fiveX.add(y);
        result.assertEquals(sum);
      }
    },
    
    // Test 2: Complex nested operations
    testNestedOperations: {
      privateInputs: [Field, Field, Field],
      method(result, a, b, c) {
        // (a + b) + (a + c) - a = result
        // Should optimize to: a + b + c = result
        const aPlusB = a.add(b);
        const aPlusC = a.add(c);
        const sum = aPlusB.add(aPlusC);
        const finalResult = sum.sub(a);
        finalResult.assertEquals(result);
      }
    },
    
    // Test 3: Multiplication (should generate 1 constraint)
    testMultiplication: {
      privateInputs: [Field, Field],
      method(product, x, y) {
        x.mul(y).assertEquals(product);
      }
    }
  }
});

async function getConstraintCount(backend) {
  console.log(`\nTesting with ${backend} backend...`);
  
  await switchBackend(backend);
  
  const { verificationKey } = await OptimizationTest.compile();
  const vkHash = verificationKey.hash;
  
  // Count constraints by looking at the constraint system
  // This is a hack - we'll examine the VK structure
  const constraintInfo = verificationKey.data || verificationKey;
  console.log(`VK hash: ${vkHash}`);
  
  return { vkHash, backend };
}

// Test both backends
const snarkyResult = await getConstraintCount('snarky');
const sparkyResult = await getConstraintCount('sparky');

console.log('\nResults:');
console.log('========');
console.log(`Snarky VK: ${snarkyResult.vkHash}`);
console.log(`Sparky VK: ${sparkyResult.vkHash}`);

if (snarkyResult.vkHash === sparkyResult.vkHash) {
  console.log('\n✅ SUCCESS: VK hashes match! Optimization is working correctly.');
} else {
  console.log('\n❌ FAILURE: VK hashes do not match. Optimization may not be working properly.');
  console.log('\nThis indicates that Sparky is not generating the same optimized constraints as Snarky.');
}

// Now test actual constraint counts by compiling with more detail
console.log('\nDetailed constraint analysis...');

// Helper to count gates in constraint system
function analyzeConstraintSystem(program) {
  // This would need access to internal constraint system
  // For now, we'll rely on VK comparison
  return 'Analysis pending';
}

process.exit(snarkyResult.vkHash === sparkyResult.vkHash ? 0 : 1);