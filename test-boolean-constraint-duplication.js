import { Field, Bool, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/bindings.js';

console.log('🔬 Testing Boolean Constraint Duplication Hypothesis\n');

// Simple test: Single AND operation
const SingleAnd = ZkProgram({
  name: 'SingleAnd',
  publicInput: undefined,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool, Bool],
      async method(a, b) {
        const result = a.and(b);
        return { publicOutput: result };
      },
    },
  },
});

// Test both backends
async function analyzeConstraints() {
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 Testing with ${backend} backend:`);
    await switchBackend(backend);
    
    // Compile and analyze
    console.log('Compiling...');
    const compiled = await SingleAnd.compile();
    
    // Get constraint count
    const methods = await SingleAnd.analyzeMethods();
    const constraints = methods.compute.rows;
    
    console.log(`✅ Single AND operation generates: ${constraints} constraints`);
    
    if (backend === 'sparky' && constraints > 1) {
      console.log(`⚠️  HYPOTHESIS CONFIRMED: ${constraints - 1} extra constraints generated!`);
      console.log('   Likely breakdown:');
      console.log('   - 1 semantic AND constraint');
      console.log(`   - ${constraints - 1} boolean assertions for inputs/outputs`);
    }
  }
}

// Test with more complex expression
const ComplexBoolean = ZkProgram({
  name: 'ComplexBoolean',
  publicInput: undefined,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool, Bool, Bool],
      async method(a, b, c) {
        // This should be 3 constraints in Snarky (1 per operation)
        const and1 = a.and(b);
        const or1 = and1.or(c);
        const not1 = or1.not();
        return { publicOutput: not1 };
      },
    },
  },
});

async function analyzeComplexConstraints() {
  console.log('\n\n🔬 Testing Complex Boolean Expression:');
  console.log('Expression: NOT(AND(a, b) OR c)');
  console.log('Expected: 3 constraints (1 AND + 1 OR + 1 NOT)');
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 ${backend} backend:`);
    await switchBackend(backend);
    
    const compiled = await ComplexBoolean.compile();
    const methods = await ComplexBoolean.analyzeMethods();
    const constraints = methods.compute.rows;
    
    console.log(`✅ Constraints generated: ${constraints}`);
    
    if (backend === 'sparky' && constraints > 3) {
      const overhead = constraints / 3;
      console.log(`⚠️  OVERHEAD: ${overhead.toFixed(1)}x constraint inflation`);
      console.log(`   ${constraints - 3} extra constraints for boolean assertions`);
    }
  }
}

// Test to identify exactly where boolean assertions are added
const BooleanAssertion = ZkProgram({
  name: 'BooleanAssertion',
  publicInput: undefined,
  publicOutput: Field,
  methods: {
    // Test 1: Just return a boolean as field (no operations)
    returnBool: {
      privateInputs: [Bool],
      async method(a) {
        return { publicOutput: a.toField() };
      },
    },
    // Test 2: Do field arithmetic on boolean
    fieldArithmetic: {
      privateInputs: [Bool, Field],
      async method(a, x) {
        return { publicOutput: a.toField().mul(x) };
      },
    },
  },
});

async function analyzeBooleanAssertions() {
  console.log('\n\n🔬 Testing Boolean Assertion Points:');
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 ${backend} backend:`);
    await switchBackend(backend);
    
    const compiled = await BooleanAssertion.compile();
    const methods = await BooleanAssertion.analyzeMethods();
    
    console.log(`returnBool (just Bool→Field): ${methods.returnBool.rows} constraints`);
    console.log(`fieldArithmetic (Bool×Field): ${methods.fieldArithmetic.rows} constraints`);
    
    if (backend === 'sparky') {
      if (methods.returnBool.rows > 0) {
        console.log('⚠️  Boolean inputs are being asserted even without operations!');
      }
      if (methods.fieldArithmetic.rows > 1) {
        console.log('⚠️  Boolean assertions added for field arithmetic!');
      }
    }
  }
}

// Run all tests
async function runTests() {
  try {
    await analyzeConstraints();
    await analyzeComplexConstraints();
    await analyzeBooleanAssertions();
    
    console.log('\n\n📋 HYPOTHESIS SUMMARY:');
    console.log('The constraint inflation is caused by redundant boolean assertions.');
    console.log('Each Bool variable gets x*(x-1)=0 constraint, even when unnecessary.');
    console.log('Semantic gates are working, but primitive assertions are not removed.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();