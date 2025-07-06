/**
 * VK DEBUG HARNESS TEST RUNNER
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Test runner for VK debug harness with simple validation
 */

import { 
  EmptyCircuit,
  EmptyMultiInputCircuit,
  TrivialConstraintCircuit,
  analyzeConstraintSystem,
  compareVKs,
  extractVKComponents
} from './vk-debug-harness.js';

import { 
  extractDetailedVKComponents,
  compareVKComponents,
  generateVKComponentReport,
  generateHexDump
} from './vk-component-extractor.js';

async function testBasicFunctionality() {
  console.log('🧪 Testing Basic VK Debug Harness Functionality');
  console.log('=' .repeat(60));

  try {
    // Test 1: Compile a simple circuit with both backends
    console.log('\n1. Testing EmptyCircuit compilation...');
    
    const snarkyAnalysis = await analyzeConstraintSystem('snarky', 'EmptyCircuit', () => EmptyCircuit.compile());
    console.log(`✅ Snarky analysis complete: ${snarkyAnalysis.constraintCount} constraints`);
    
    const sparkyAnalysis = await analyzeConstraintSystem('sparky', 'EmptyCircuit', () => EmptyCircuit.compile());
    console.log(`✅ Sparky analysis complete: ${sparkyAnalysis.constraintCount} constraints`);
    
    // Test 2: Compare VKs
    console.log('\n2. Testing VK comparison...');
    const comparison = compareVKs(snarkyAnalysis, sparkyAnalysis);
    console.log(`VK Hash Match: ${comparison.hashMatch ? '✅' : '❌'}`);
    console.log(`Constraint Count Match: ${comparison.constraintCountMatch ? '✅' : '❌'}`);
    console.log(`Digest Match: ${comparison.digestMatch ? '✅' : '❌'}`);
    
    if (comparison.differences.length > 0) {
      console.log('Differences found:');
      comparison.differences.forEach(diff => {
        console.log(`  - ${diff}`);
      });
    }
    
    // Test 3: Extract VK components if available
    console.log('\n3. Testing VK component extraction...');
    if (snarkyAnalysis.vkComponents.data !== 'missing' && sparkyAnalysis.vkComponents.data !== 'missing') {
      const snarkyComponents = extractDetailedVKComponents(snarkyAnalysis.vkComponents);
      const sparkyComponents = extractDetailedVKComponents(sparkyAnalysis.vkComponents);
      
      console.log(`Snarky sigma commitments: ${snarkyComponents.sigmaCommitments.length}`);
      console.log(`Sparky sigma commitments: ${sparkyComponents.sigmaCommitments.length}`);
      
      const componentComparison = compareVKComponents(snarkyComponents, sparkyComponents);
      console.log(`Component comparison complete: ${componentComparison.differences.length} differences`);
      
      if (componentComparison.differences.length > 0) {
        console.log('Component differences:');
        componentComparison.differences.forEach(diff => {
          console.log(`  - ${diff}`);
        });
      }
    } else {
      console.log('⚠️  VK data not available for detailed component extraction');
    }
    
    console.log('\n✅ Basic functionality test complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
    return false;
  }
}

async function testMultipleCircuits() {
  console.log('\n🧪 Testing Multiple Circuit Types');
  console.log('=' .repeat(60));

  const circuits = [
    { name: 'EmptyCircuit', compileFunction: () => EmptyCircuit.compile() },
    { name: 'EmptyMultiInputCircuit', compileFunction: () => EmptyMultiInputCircuit.compile() },
    { name: 'TrivialConstraintCircuit', compileFunction: () => TrivialConstraintCircuit.compile() },
  ];

  const results = [];

  for (const circuit of circuits) {
    console.log(`\n📋 Testing ${circuit.name}...`);
    
    try {
      const snarkyAnalysis = await analyzeConstraintSystem('snarky', circuit.name, circuit.compileFunction);
      const sparkyAnalysis = await analyzeConstraintSystem('sparky', circuit.name, circuit.compileFunction);
      const comparison = compareVKs(snarkyAnalysis, sparkyAnalysis);
      
      results.push({
        name: circuit.name,
        success: true,
        hashMatch: comparison.hashMatch,
        constraintCountMatch: comparison.constraintCountMatch,
        digestMatch: comparison.digestMatch,
        snarkyConstraints: snarkyAnalysis.constraintCount,
        sparkyConstraints: sparkyAnalysis.constraintCount,
      });
      
      console.log(`  ✅ ${circuit.name}: Hash=${comparison.hashMatch ? '✅' : '❌'} Constraints=${comparison.constraintCountMatch ? '✅' : '❌'}`);
      
    } catch (error) {
      results.push({
        name: circuit.name,
        success: false,
        error: (error as Error).message,
      });
      console.log(`  ❌ ${circuit.name}: Failed - ${(error as Error).message}`);
    }
  }

  return results;
}

async function main() {
  console.log('🚀 VK DEBUG HARNESS VALIDATION TEST');
  console.log('=' .repeat(80));
  
  // Test basic functionality
  const basicTestPassed = await testBasicFunctionality();
  
  if (!basicTestPassed) {
    console.log('❌ Basic functionality test failed - aborting');
    process.exit(1);
  }
  
  // Test multiple circuits
  const multiTestResults = await testMultipleCircuits();
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(80));
  
  const successful = multiTestResults.filter(r => r.success);
  const failed = multiTestResults.filter(r => !r.success);
  
  console.log(`Total circuits tested: ${multiTestResults.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const matching = successful.filter(r => r.hashMatch);
    const mismatching = successful.filter(r => !r.hashMatch);
    
    console.log(`\nVK Hash Matches: ${matching.length}`);
    console.log(`VK Hash Mismatches: ${mismatching.length}`);
    
    if (mismatching.length > 0) {
      console.log('\nMismatched circuits:');
      mismatching.forEach((r: any) => {
        console.log(`  - ${r.name}: ${r.snarkyConstraints} vs ${r.sparkyConstraints} constraints`);
      });
    }
  }
  
  if (failed.length > 0) {
    console.log('\nFailed circuits:');
    failed.forEach((r: any) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n🎯 VALIDATION RESULT:', 
    basicTestPassed && failed.length === 0 ? '✅ PASSED' : '❌ FAILED'
  );
  
  if (successful.length > 0) {
    const allMatch = successful.every(r => r.hashMatch);
    console.log('🎯 VK PARITY RESULT:', allMatch ? '✅ ALL MATCH' : '❌ MISMATCHES DETECTED');
  }
}

main().catch(console.error);