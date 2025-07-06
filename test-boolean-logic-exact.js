import { Field, Bool, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

console.log('🔬 Testing Boolean Logic Exact Match from Benchmark\n');

// Exact copy from benchmark
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

// Analyze step by step
async function analyzeStepByStep() {
  console.log('🔍 Step-by-step constraint analysis:\n');
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`📊 ${backend} backend:`);
    await switchBackend(backend);
    
    // Test 1: Just the inputs
    console.log('\n1. Just 5 Bool inputs (no operations):');
    const cs1 = await Provable.constraintSystem(() => {
      const pub = Provable.witness(Bool, () => Bool.from(true));
      const a = Provable.witness(Bool, () => Bool.from(true));
      const b = Provable.witness(Bool, () => Bool.from(false));
      const c = Provable.witness(Bool, () => Bool.from(true));
      const d = Provable.witness(Bool, () => Bool.from(false));
    });
    console.log(`   Constraints: ${cs1.rows}`);
    
    // Test 2: Add first AND
    console.log('\n2. Five inputs + a.and(b):');
    const cs2 = await Provable.constraintSystem(() => {
      const pub = Provable.witness(Bool, () => Bool.from(true));
      const a = Provable.witness(Bool, () => Bool.from(true));
      const b = Provable.witness(Bool, () => Bool.from(false));
      const c = Provable.witness(Bool, () => Bool.from(true));
      const d = Provable.witness(Bool, () => Bool.from(false));
      const and1 = a.and(b);
    });
    console.log(`   Constraints: ${cs2.rows}`);
    
    // Test 3: Add OR
    console.log('\n3. Previous + c.or(d):');
    const cs3 = await Provable.constraintSystem(() => {
      const pub = Provable.witness(Bool, () => Bool.from(true));
      const a = Provable.witness(Bool, () => Bool.from(true));
      const b = Provable.witness(Bool, () => Bool.from(false));
      const c = Provable.witness(Bool, () => Bool.from(true));
      const d = Provable.witness(Bool, () => Bool.from(false));
      const and1 = a.and(b);
      const or1 = c.or(d);
    });
    console.log(`   Constraints: ${cs3.rows}`);
    
    // Test 4: Full expression
    console.log('\n4. Full Boolean Logic expression:');
    const cs4 = await Provable.constraintSystem(() => {
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
    console.log(`   Constraints: ${cs4.rows}`);
    
    // Compile full program
    console.log('\n5. Full ZkProgram compilation:');
    const compiled = await BooleanLogic.compile();
    const methods = await BooleanLogic.analyzeMethods();
    console.log(`   Constraints: ${methods.compute.rows}`);
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

// Count Boolean operations
function countOperations() {
  console.log('📊 Boolean Operations Count:');
  console.log('- 5 Bool inputs');
  console.log('- 1 AND: a.and(b)');
  console.log('- 1 OR: c.or(d)');
  console.log('- XOR expansion: and1.not().and(or1).or(and1.and(or1.not()))');
  console.log('  - 2 NOT operations');
  console.log('  - 2 AND operations');
  console.log('  - 1 OR operation');
  console.log('- 1 final AND: publicInput.and(xor1)');
  console.log('\nTotal: 5 AND + 2 OR + 2 NOT = 9 Boolean operations');
  console.log('Expected constraints: ~9 (Snarky)');
}

async function runTest() {
  try {
    countOperations();
    console.log('\n' + '='.repeat(50) + '\n');
    await analyzeStepByStep();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();