import { Field, Bool, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

console.log('🔬 Analyzing Constraint Duplication in Boolean Logic\n');

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

async function analyzeConstraints() {
  console.log('📊 Sparky backend constraint analysis:\n');
  await switchBackend('sparky');
  
  // Compile and get constraint system
  console.log('Compiling BooleanLogic ZkProgram...\n');
  const compiled = await BooleanLogic.compile();
  const methods = await BooleanLogic.analyzeMethods();
  
  console.log(`Total constraints: ${methods.compute.rows}\n`);
  
  // Get the actual constraint system
  const cs = methods.compute;
  
  // Print first few gates to look for patterns
  console.log('First 30 constraints/gates:\n');
  if (cs.gates && cs.gates.length > 0) {
    for (let i = 0; i < Math.min(30, cs.gates.length); i++) {
      const gate = cs.gates[i];
      console.log(`Gate ${i}: ${JSON.stringify(gate)}`);
    }
    
    // Count unique vs duplicate gates
    console.log('\n📊 Analyzing for duplicates...\n');
    
    // Create a map of gate signatures
    const gateSignatures = new Map();
    cs.gates.forEach((gate, index) => {
      const signature = JSON.stringify(gate);
      if (!gateSignatures.has(signature)) {
        gateSignatures.set(signature, []);
      }
      gateSignatures.get(signature).push(index);
    });
    
    // Find duplicates
    let duplicateCount = 0;
    gateSignatures.forEach((indices, signature) => {
      if (indices.length > 1) {
        duplicateCount++;
        console.log(`Duplicate found (${indices.length} times):`);
        console.log(`  Indices: ${indices.join(', ')}`);
        console.log(`  Gate: ${signature.substring(0, 100)}...`);
        console.log('');
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`Total gates: ${cs.gates.length}`);
    console.log(`Unique gates: ${gateSignatures.size}`);
    console.log(`Duplicate patterns: ${duplicateCount}`);
    
    // Check if constraints are repeated in blocks
    console.log('\n🔍 Checking for repeated blocks...\n');
    
    // Look for pattern of 13 constraints repeated
    const blockSize = 13;
    if (cs.gates.length >= blockSize * 2) {
      let blocksMatch = true;
      for (let i = 0; i < blockSize; i++) {
        const firstBlock = JSON.stringify(cs.gates[i]);
        for (let j = 1; j < Math.floor(cs.gates.length / blockSize); j++) {
          const compareBlock = JSON.stringify(cs.gates[i + j * blockSize]);
          if (firstBlock !== compareBlock) {
            blocksMatch = false;
            break;
          }
        }
        if (!blocksMatch) break;
      }
      
      if (blocksMatch) {
        console.log(`✅ PATTERN FOUND: Constraints repeat every ${blockSize} gates!`);
        console.log(`   This suggests ${Math.floor(cs.gates.length / blockSize)} identical passes.`);
      } else {
        console.log(`❌ No exact ${blockSize}-constraint block repetition found.`);
      }
    }
    
    // Try other block sizes
    for (let blockSize of [9, 10, 11, 12, 14, 15, 17]) {
      if (cs.gates.length % blockSize === 0) {
        let blocksMatch = true;
        const numBlocks = cs.gates.length / blockSize;
        
        for (let i = 0; i < blockSize; i++) {
          const firstBlock = JSON.stringify(cs.gates[i]);
          for (let j = 1; j < numBlocks; j++) {
            const compareBlock = JSON.stringify(cs.gates[i + j * blockSize]);
            if (firstBlock !== compareBlock) {
              blocksMatch = false;
              break;
            }
          }
          if (!blocksMatch) break;
        }
        
        if (blocksMatch) {
          console.log(`✅ PATTERN FOUND: Constraints repeat every ${blockSize} gates!`);
          console.log(`   ${cs.gates.length} = ${blockSize} × ${numBlocks}`);
          break;
        }
      }
    }
  }
}

async function runTest() {
  try {
    await analyzeConstraints();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();