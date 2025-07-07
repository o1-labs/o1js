import { ZkProgram, Field, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

// Program with simple arithmetic
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    simpleAdd: {
      privateInputs: [],
      async method(x) {
        // Create constraint with addition
        const result = x.add(Field(1));
        return { publicOutput: result };
      }
    },
    multipleOps: {
      privateInputs: [Field],
      async method(x, y) {
        // Multiple operations to create more constraints
        const a = x.add(y);           // constraint 1
        const b = a.mul(Field(2));    // constraint 2
        const c = b.sub(Field(3));    // constraint 3
        return { publicOutput: c };
      }
    }
  }
});

async function testConstraints(backend) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${backend} backend`);
  console.log('='.repeat(60));
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
  }
  
  try {
    // Analyze methods to see constraint counts
    console.log('\n📊 Analyzing methods...');
    const analysis = await TestProgram.analyzeMethods();
    
    for (const [method, data] of Object.entries(analysis)) {
      console.log(`\n${method}:`);
      console.log(`  Gates: ${data.gates.length}`);
      console.log(`  Digest: ${data.digest}`);
      console.log(`  Constraints: ${data.constraintSystemSize || 'unknown'}`);
    }
    
    console.log('\n📋 Compiling...');
    const { verificationKey } = await TestProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash.toString());
    
    console.log('\n🔨 Testing simpleAdd...');
    const result1 = await TestProgram.simpleAdd(Field(5));
    console.log('Result:', result1.proof.publicOutput.toString());
    console.log('Proof created:', !!result1.proof);
    
    console.log('\n🔨 Testing multipleOps...');
    const result2 = await TestProgram.multipleOps(Field(10), Field(20));
    console.log('Result:', result2.proof.publicOutput.toString());
    console.log('Proof created:', !!result2.proof);
    
    console.log('\n✅ All tests passed for', backend);
    
    return true;
  } catch (error) {
    console.error(`\n❌ Error with ${backend}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Constraint Tracking Test');
  
  // Test Snarky
  const snarkySuccess = await testConstraints('snarky');
  
  // Reset and test Sparky
  await switchBackend('snarky');
  const sparkySuccess = await testConstraints('sparky');
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log('Snarky:', snarkySuccess ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky:', sparkySuccess ? '✅ PASS' : '❌ FAIL');
}

main().catch(console.error);