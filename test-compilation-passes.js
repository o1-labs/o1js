import { Field, Bool, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

console.log('🔬 Testing ZkProgram Compilation Passes\n');

let executionCount = 0;

// Simple program that counts executions
const CountingProgram = ZkProgram({
  name: 'CountingProgram',
  publicInput: Bool,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool],
      async method(publicInput, a) {
        executionCount++;
        console.log(`  📍 Method execution #${executionCount}`);
        const result = publicInput.and(a);
        return { publicOutput: result };
      },
    },
  },
});

// Test compilation
async function testCompilationPasses() {
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 ${backend} backend:`);
    await switchBackend(backend);
    
    executionCount = 0;
    console.log('\nCompiling ZkProgram...');
    
    try {
      const compiled = await CountingProgram.compile();
      console.log(`\n✅ Compilation complete`);
      console.log(`Total method executions: ${executionCount}`);
      
      const methods = await CountingProgram.analyzeMethods();
      console.log(`Constraints generated: ${methods.compute.rows}`);
      
      if (backend === 'sparky' && executionCount > 1) {
        console.log(`\n⚠️  ISSUE FOUND: Method executed ${executionCount} times!`);
        console.log(`This explains constraint multiplication.`);
      }
    } catch (error) {
      console.error('Compilation failed:', error.message);
    }
  }
}

// Also test with more complex program
const BooleanLogic = ZkProgram({
  name: 'BooleanLogic',
  publicInput: Bool,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool, Bool, Bool, Bool],
      async method(publicInput, a, b, c, d) {
        const and1 = a.and(b);
        const or1 = c.or(d);
        const xor1 = and1.not().and(or1).or(and1.and(or1.not()));
        const result = publicInput.and(xor1);
        return { publicOutput: result };
      },
    },
  },
});

async function testConstraintMultiplication() {
  console.log('\n\n📊 Testing constraint multiplication theory:');
  
  await switchBackend('sparky');
  
  // Get constraints from direct execution
  console.log('\n1. Direct constraint system (single execution):');
  const directCs = await Provable.constraintSystem(() => {
    const pub = Provable.witness(Bool, () => Bool.from(true));
    const a = Provable.witness(Bool, () => Bool.from(true));
    const b = Provable.witness(Bool, () => Bool.from(false));
    const c = Provable.witness(Bool, () => Bool.from(true));
    const d = Provable.witness(Bool, () => Bool.from(false));
    const and1 = a.and(b);
    const or1 = c.or(d);
    const xor1 = and1.not().and(or1).or(and1.and(or1.not()));
    const result = pub.and(xor1);
  });
  console.log(`   Constraints: ${directCs.rows}`);
  
  // Get constraints from compilation
  console.log('\n2. ZkProgram compilation:');
  const compiled = await BooleanLogic.compile();
  const methods = await BooleanLogic.analyzeMethods();
  console.log(`   Constraints: ${methods.compute.rows}`);
  
  // Calculate ratio
  const ratio = methods.compute.rows / directCs.rows;
  console.log(`\n   Multiplication factor: ${ratio.toFixed(1)}x`);
  
  if (ratio > 1) {
    console.log(`   ⚠️  ZkProgram generates ${ratio.toFixed(0)}x more constraints than direct execution!`);
    console.log(`   This suggests ${ratio.toFixed(0)} compilation passes.`);
  }
}

async function runTests() {
  try {
    await testCompilationPasses();
    await testConstraintMultiplication();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();