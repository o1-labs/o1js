import { Field, Bool, ZkProgram, switchBackend } from './dist/node/index.js';

// Test programs from correctness suite
const testPrograms = [
  {
    name: 'OneConstraintProgram',
    program: ZkProgram({
      name: 'OneConstraint',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(publicInput) {
            publicInput.assertEquals(publicInput);
          }
        }
      }
    })
  },
  {
    name: 'SimpleArithmetic',
    program: ZkProgram({
      name: 'SimpleArithmetic',
      publicInput: Field,
      publicOutput: Field,
      methods: {
        add: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            const result = publicInput.add(privateInput);
            result.assertEquals(Field(7)); // 3 + 4 = 7
            return result;
          }
        }
      }
    })
  },
  {
    name: 'BooleanLogic',
    program: ZkProgram({
      name: 'BooleanLogic',
      publicInput: Bool,
      publicOutput: Bool,
      methods: {
        and: {
          privateInputs: [Bool],
          async method(publicInput, privateInput) {
            return publicInput.and(privateInput);
          }
        }
      }
    })
  }
];

async function testProgram(programInfo, backend) {
  await switchBackend(backend);
  
  try {
    const result = await programInfo.program.compile();
    return { 
      success: true, 
      vkHash: result.verificationKey.hash.toString() 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function main() {
  console.log('🧪 QUICK CORRECTNESS TEST');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const programInfo of testPrograms) {
    console.log(`\n📊 Testing ${programInfo.name}...`);
    
    const snarkyResult = await testProgram(programInfo, 'snarky');
    const sparkyResult = await testProgram(programInfo, 'sparky');
    
    const match = snarkyResult.success && sparkyResult.success && 
                  snarkyResult.vkHash === sparkyResult.vkHash;
    
    console.log(`  Snarky: ${snarkyResult.success ? '✅' : '❌'}`);
    console.log(`  Sparky: ${sparkyResult.success ? '✅' : '❌'}`);
    console.log(`  VK Match: ${match ? '✅' : '❌'}`);
    
    if (!match && snarkyResult.success && sparkyResult.success) {
      console.log(`  Snarky VK: ${snarkyResult.vkHash}`);
      console.log(`  Sparky VK: ${sparkyResult.vkHash}`);
    }
    
    if (!sparkyResult.success) {
      console.log(`  Sparky Error: ${sparkyResult.error}`);
    }
    
    results.push({
      program: programInfo.name,
      snarky: snarkyResult.success,
      sparky: sparkyResult.success,
      vkMatch: match
    });
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('SUMMARY:');
  const sparkyPassing = results.filter(r => r.sparky).length;
  const vkMatching = results.filter(r => r.vkMatch).length;
  console.log(`  Sparky Passing: ${sparkyPassing}/${results.length}`);
  console.log(`  VK Matching: ${vkMatching}/${results.length}`);
  console.log('=' .repeat(50));
}

main().catch(console.error);