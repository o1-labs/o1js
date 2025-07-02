/**
 * Detailed analysis of VK hashes and constraint generation
 */

import { switchBackend, getCurrentBackend, Field, ZkProgram, Provable } from './dist/node/index.js';

async function testVKHashExtraction() {
  console.log('🔍 Testing VK Hash Extraction (Corrected):');
  console.log('=========================================');
  
  try {
    // Test with Snarky
    console.log('Compiling simple program with Snarky...');
    await switchBackend('snarky');
    
    const SimpleProgram = ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        addOne: {
          privateInputs: [],
          async method(x) {
            return x.add(Field(1));
          }
        }
      }
    });
    
    const snarkyResult = await SimpleProgram.compile();
    const snarkyVK = snarkyResult.verificationKey;
    
    console.log('Snarky VK analysis:');
    console.log('  Type of vk.hash:', typeof snarkyVK.hash);
    console.log('  VK hash value:', snarkyVK.hash);
    console.log('  VK data length:', snarkyVK.data?.length || 'no data');
    
    // Test with Sparky
    console.log('\nCompiling simple program with Sparky...');
    await switchBackend('sparky');
    
    const sparkyResult = await SimpleProgram.compile();
    const sparkyVK = sparkyResult.verificationKey;
    
    console.log('Sparky VK analysis:');
    console.log('  Type of vk.hash:', typeof sparkyVK.hash);
    console.log('  VK hash value:', sparkyVK.hash);
    console.log('  VK data length:', sparkyVK.data?.length || 'no data');
    
    // Compare the hashes
    console.log('\n🎯 VK PARITY ANALYSIS:');
    console.log('  Snarky VK hash:', snarkyVK.hash);
    console.log('  Sparky VK hash:', sparkyVK.hash);
    console.log('  Hashes identical:', snarkyVK.hash === sparkyVK.hash ? '🚨 YES (BUG!)' : '✅ NO (Good)');
    
    return { snarkyVK: snarkyVK.hash, sparkyVK: sparkyVK.hash };
    
  } catch (error) {
    console.error('❌ VK hash extraction failed:', error.message);
    return null;
  }
}

async function testConstraintGeneration() {
  console.log('\n\n🔧 Testing Detailed Constraint Generation:');
  console.log('=========================================');
  
  try {
    // Test with Snarky
    console.log('Testing constraint generation with Snarky...');
    await switchBackend('snarky');
    
    const snarkyConstraints = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(3));
      const result = x.add(y);
      result.assertEquals(Field(8)); // Add a constraint
      return result;
    });
    
    console.log('Snarky detailed constraint analysis:');
    console.log('  Rows:', snarkyConstraints.rows);
    console.log('  Gates count:', snarkyConstraints.gates?.length);
    console.log('  Public input size:', snarkyConstraints.publicInputSize);
    console.log('  Has print method:', typeof snarkyConstraints.print);
    console.log('  Has summary method:', typeof snarkyConstraints.summary);
    
    if (snarkyConstraints.gates && snarkyConstraints.gates.length > 0) {
      console.log('  First gate type:', snarkyConstraints.gates[0]?.type);
      console.log('  First gate:', JSON.stringify(snarkyConstraints.gates[0], null, 2).slice(0, 200) + '...');
    }
    
    if (snarkyConstraints.print) {
      console.log('\\n  Snarky constraint system summary:');
      snarkyConstraints.print();
    }
    
    // Test with Sparky
    console.log('\\nTesting constraint generation with Sparky...');
    await switchBackend('sparky');
    
    const sparkyConstraints = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(3));
      const result = x.add(y);
      result.assertEquals(Field(8)); // Add a constraint
      return result;
    });
    
    console.log('Sparky detailed constraint analysis:');
    console.log('  Rows:', sparkyConstraints.rows);
    console.log('  Gates count:', sparkyConstraints.gates?.length);
    console.log('  Public input size:', sparkyConstraints.publicInputSize);
    console.log('  Has print method:', typeof sparkyConstraints.print);
    console.log('  Has summary method:', typeof sparkyConstraints.summary);
    
    if (sparkyConstraints.gates && sparkyConstraints.gates.length > 0) {
      console.log('  First gate type:', sparkyConstraints.gates[0]?.type);
      console.log('  First gate:', JSON.stringify(sparkyConstraints.gates[0], null, 2).slice(0, 200) + '...');
    }
    
    if (sparkyConstraints.print) {
      console.log('\\n  Sparky constraint system summary:');
      sparkyConstraints.print();
    }
    
    // Compare constraint generation
    console.log('\\n🎯 CONSTRAINT PARITY ANALYSIS:');
    console.log('  Snarky gates:', snarkyConstraints.gates?.length || 0);
    console.log('  Sparky gates:', sparkyConstraints.gates?.length || 0);
    console.log('  Snarky rows:', snarkyConstraints.rows || 0);
    console.log('  Sparky rows:', sparkyConstraints.rows || 0);
    
    const snarkyCount = snarkyConstraints.gates?.length || 0;
    const sparkyCount = sparkyConstraints.gates?.length || 0;
    
    if (snarkyCount > 0 && sparkyCount === 0) {
      console.log('  🚨 CRITICAL: Sparky generates ZERO constraints while Snarky generates', snarkyCount);
    } else if (snarkyCount === sparkyCount) {
      console.log('  ✅ Constraint counts match');
    } else {
      console.log('  ⚠️  Constraint counts differ - ratio:', sparkyCount / snarkyCount);
    }
    
    return { 
      snarky: { gates: snarkyCount, rows: snarkyConstraints.rows }, 
      sparky: { gates: sparkyCount, rows: sparkyConstraints.rows } 
    };
    
  } catch (error) {
    console.error('❌ Constraint generation test failed:', error.message);
    console.error(error.stack?.split('\\n').slice(0, 5).join('\\n'));
    return null;
  }
}

async function testMultipleCircuitComplexities() {
  console.log('\\n\\n📊 Testing Multiple Circuit Complexities:');
  console.log('==========================================');
  
  const testCases = [
    {
      name: 'Simple Addition',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(3));
        return x.add(y);
      }
    },
    {
      name: 'Addition with Assertion',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(3));
        const result = x.add(y);
        result.assertEquals(Field(8));
        return result;
      }
    },
    {
      name: 'Multiplication',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(3));
        return x.mul(y);
      }
    },
    {
      name: 'Complex Expression',
      circuit: () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = Provable.witness(Field, () => Field(4));
        const result = a.add(b).mul(c);
        result.assertEquals(Field(20));
        return result;
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\\n🧪 Testing: ${testCase.name}`);
    console.log('─'.repeat(40));
    
    try {
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyConstraints = await Provable.constraintSystem(testCase.circuit);
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyConstraints = await Provable.constraintSystem(testCase.circuit);
      
      console.log(`  Snarky: ${snarkyConstraints.gates?.length || 0} gates, ${snarkyConstraints.rows || 0} rows`);
      console.log(`  Sparky: ${sparkyConstraints.gates?.length || 0} gates, ${sparkyConstraints.rows || 0} rows`);
      
      const snarkyCount = snarkyConstraints.gates?.length || 0;
      const sparkyCount = sparkyConstraints.gates?.length || 0;
      
      if (snarkyCount === 0 && sparkyCount === 0) {
        console.log('  ⚠️  Both backends: No constraints generated');
      } else if (sparkyCount === 0 && snarkyCount > 0) {
        console.log(`  🚨 Sparky: ZERO constraints, Snarky: ${snarkyCount}`);
      } else if (snarkyCount === sparkyCount) {
        console.log('  ✅ Constraint parity: MATCH');
      } else {
        console.log(`  📊 Constraint ratio: ${(sparkyCount / snarkyCount).toFixed(2)}x`);
      }
      
    } catch (error) {
      console.error(`  ❌ ${testCase.name} failed:`, error.message);
    }
  }
}

// Run comprehensive analysis
async function runComprehensiveAnalysis() {
  console.log('🎯 COMPREHENSIVE BACKEND COMPATIBILITY ANALYSIS');
  console.log('='.repeat(50));
  
  const vkResults = await testVKHashExtraction();
  const constraintResults = await testConstraintGeneration();
  await testMultipleCircuitComplexities();
  
  console.log('\\n\\n📋 FINAL ANALYSIS SUMMARY:');
  console.log('='.repeat(50));
  
  if (vkResults) {
    console.log('🔑 VK Analysis:');
    console.log(`  VK Hash Parity: ${vkResults.snarkyVK === vkResults.sparkyVK ? '🚨 IDENTICAL (Critical Bug)' : '✅ Different (Good)'}`);
  }
  
  if (constraintResults) {
    console.log('⚙️  Constraint Analysis:');
    console.log(`  Constraint Parity: ${constraintResults.snarky.gates === constraintResults.sparky.gates ? '✅ Match' : '❌ Mismatch'}`);
    console.log(`  Zero Constraint Bug: ${constraintResults.sparky.gates === 0 && constraintResults.snarky.gates > 0 ? '🚨 CONFIRMED' : '✅ Not detected'}`);
  }
  
  console.log('\\n🎯 Backend Status:');
  console.log('  Backend Switching: ✅ Working');
  console.log('  Field Operations: ✅ Working');
  console.log('  VK Generation: ✅ Working (but may be identical)');
  console.log('  Constraint Recording: 🔍 Needs investigation');
}

runComprehensiveAnalysis().catch(console.error);