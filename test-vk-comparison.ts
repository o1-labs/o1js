/**
 * Compare Verification Keys between Snarky and Sparky backends
 * for all elliptic curve functions (ecAdd, ecScale, ecEndoscale)
 */

import { Field, Group, ZkProgram, Cache } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test program that uses all EC operations
const ECOperationsProgram = ZkProgram({
  name: 'ECOperationsTest',
  publicInput: Field,
  
  methods: {
    testECAdd: {
      privateInputs: [],
      method(publicInput: Field) {
        const g = Group.generator;
        const doubled = g.add(g);  // Uses ecAdd
        const tripled = doubled.add(g);
        
        // Verify associativity: (g + g) + g = g + (g + g)
        const left = g.add(g).add(g);
        const right = g.add(g.add(g));
        left.assertEquals(right);
        
        publicInput.assertEquals(Field(1));
      }
    },
    
    testECScale: {
      privateInputs: [Field],
      method(publicInput: Field, scalar: Field) {
        const g = Group.generator;
        const scaled = g.scale(scalar);  // Uses ecScale
        
        // Test some scaling properties
        const doubled1 = g.scale(Field(2));
        const doubled2 = g.add(g);
        doubled1.assertEquals(doubled2);
        
        publicInput.assertEquals(Field(2));
      }
    },
    
    testECMultiOps: {
      privateInputs: [Field, Field],
      method(publicInput: Field, scalar1: Field, scalar2: Field) {
        const g = Group.generator;
        
        // Multiple operations that may trigger different EC gates
        const p1 = g.scale(scalar1);      // ecScale
        const p2 = g.scale(scalar2);      // ecScale  
        const sum = p1.add(p2);           // ecAdd
        const doubled = sum.add(sum);     // ecAdd (doubling case)
        
        // Test distributivity: k1*G + k2*G = (k1+k2)*G
        const total_scalar = scalar1.add(scalar2);
        const expected = g.scale(total_scalar);
        sum.assertEquals(expected);
        
        publicInput.assertEquals(Field(3));
      }
    }
  }
});

async function compareVKs() {
  console.log('🔍 Comparing Verification Keys: Snarky vs Sparky');
  console.log('================================================\n');
  
  // Clear any existing cache
  Cache.FileSystem.cacheDirectory = './cache-vk-test';
  
  const results = {
    snarky: {} as any,
    sparky: {} as any,
    differences: [] as string[]
  };
  
  try {
    // Test with Snarky backend
    console.log('1️⃣ Testing with Snarky backend...');
    await switchBackend('snarky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    const startSnarky = Date.now();
    const snarkyVK = await ECOperationsProgram.compile();
    const snarkyTime = Date.now() - startSnarky;
    
    results.snarky = {
      verificationKey: snarkyVK.verificationKey,
      compilationTime: snarkyTime,
      constraintCounts: extractConstraintInfo(snarkyVK.verificationKey)
    };
    
    console.log(`✓ Snarky compilation: ${snarkyTime}ms`);
    console.log(`✓ Snarky constraint info: ${JSON.stringify(results.snarky.constraintCounts, null, 2)}`);
    
    // Test with Sparky backend  
    console.log('\n2️⃣ Testing with Sparky backend...');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    const startSparky = Date.now();
    const sparkyVK = await ECOperationsProgram.compile();
    const sparkyTime = Date.now() - startSparky;
    
    results.sparky = {
      verificationKey: sparkyVK.verificationKey,
      compilationTime: sparkyTime,
      constraintCounts: extractConstraintInfo(sparkyVK.verificationKey)
    };
    
    console.log(`✓ Sparky compilation: ${sparkyTime}ms`);
    console.log(`✓ Sparky constraint info: ${JSON.stringify(results.sparky.constraintCounts, null, 2)}`);
    
    // Compare the verification keys
    console.log('\n3️⃣ Comparing Verification Keys...');
    
    // Check if VKs are identical
    const snarkyVKStr = JSON.stringify(results.snarky.verificationKey);
    const sparkyVKStr = JSON.stringify(results.sparky.verificationKey);
    const identical = snarkyVKStr === sparkyVKStr;
    
    console.log(`VK Identical: ${identical ? '✅ YES' : '❌ NO'}`);
    
    if (!identical) {
      console.log('\n🔍 Analyzing Differences...');
      
      // Compare constraint counts
      const snarkyConstraints = results.snarky.constraintCounts;
      const sparkyConstraints = results.sparky.constraintCounts;
      
      if (snarkyConstraints.total !== sparkyConstraints.total) {
        results.differences.push(`Total constraints: Snarky=${snarkyConstraints.total}, Sparky=${sparkyConstraints.total}`);
      }
      
      if (snarkyConstraints.publicInputSize !== sparkyConstraints.publicInputSize) {
        results.differences.push(`Public inputs: Snarky=${snarkyConstraints.publicInputSize}, Sparky=${sparkyConstraints.publicInputSize}`);
      }
      
      // Compare gate types if available
      if (snarkyConstraints.gates && sparkyConstraints.gates) {
        const snarkyGates = Object.keys(snarkyConstraints.gates).sort();
        const sparkyGates = Object.keys(sparkyConstraints.gates).sort();
        
        const gatesIdentical = JSON.stringify(snarkyGates) === JSON.stringify(sparkyGates);
        if (!gatesIdentical) {
          results.differences.push(`Gate types differ: Snarky=[${snarkyGates.join(', ')}], Sparky=[${sparkyGates.join(', ')}]`);
        }
        
        for (const gateType of snarkyGates) {
          if (sparkyConstraints.gates[gateType] !== snarkyConstraints.gates[gateType]) {
            results.differences.push(`${gateType} count: Snarky=${snarkyConstraints.gates[gateType]}, Sparky=${sparkyConstraints.gates[gateType]}`);
          }
        }
      }
      
      // Check VK structure differences
      const snarkyKeys = Object.keys(results.snarky.verificationKey).sort();
      const sparkyKeys = Object.keys(results.sparky.verificationKey).sort();
      
      if (JSON.stringify(snarkyKeys) !== JSON.stringify(sparkyKeys)) {
        results.differences.push(`VK structure differs: Snarky keys=[${snarkyKeys.join(', ')}], Sparky keys=[${sparkyKeys.join(', ')}]`);
      }
    }
    
    // Display results
    console.log('\n📊 Comparison Results:');
    console.log('======================');
    console.log(`Snarky compilation time: ${results.snarky.compilationTime}ms`);
    console.log(`Sparky compilation time: ${results.sparky.compilationTime}ms`);
    console.log(`Performance ratio: ${(results.sparky.compilationTime / results.snarky.compilationTime).toFixed(2)}x`);
    
    if (results.differences.length > 0) {
      console.log('\n❗ Differences found:');
      results.differences.forEach((diff, i) => {
        console.log(`${i + 1}. ${diff}`);
      });
    } else {
      console.log('\n✅ No significant differences detected');
    }
    
    // Analyze EC-specific differences
    console.log('\n🔧 EC Implementation Analysis:');
    analyzeECDifferences(results);
    
  } catch (error) {
    console.error('❌ VK comparison failed:', error);
    
    // Try to identify which backend failed
    const currentBackend = getCurrentBackend();
    console.error(`Current backend when error occurred: ${currentBackend}`);
    
    if (error.message.includes('ecAdd') || error.message.includes('ecScale')) {
      console.error('Error appears to be EC-operation related');
    }
    
    process.exit(1);
  }
}

function extractConstraintInfo(vk: any): any {
  try {
    // Try to extract constraint information from the VK
    const info: any = {
      total: 0,
      publicInputSize: 0,
      gates: {}
    };
    
    // Look for constraint system information in various VK formats
    if (vk.constraintSystemHash) {
      info.constraintSystemHash = vk.constraintSystemHash;
    }
    
    if (vk.data && Array.isArray(vk.data)) {
      info.total = vk.data.length;
    }
    
    // Try to find gate information
    if (vk.gates && Array.isArray(vk.gates)) {
      for (const gate of vk.gates) {
        if (gate.typ || gate.type) {
          const gateType = gate.typ || gate.type;
          info.gates[gateType] = (info.gates[gateType] || 0) + 1;
        }
      }
    }
    
    // Look for public input size
    if (typeof vk.publicInputSize === 'number') {
      info.publicInputSize = vk.publicInputSize;
    }
    
    return info;
  } catch (e) {
    return { error: 'Could not extract constraint info', details: e.message };
  }
}

function analyzeECDifferences(results: any) {
  const snarky = results.snarky.constraintCounts;
  const sparky = results.sparky.constraintCounts;
  
  console.log('Analyzing elliptic curve implementation differences...');
  
  // Look for EC-specific gates
  const ecGateTypes = ['ecAdd', 'ecScale', 'ecEndoscale', 'Generic'];
  
  let hasECDifferences = false;
  
  for (const gateType of ecGateTypes) {
    const snarkyCount = snarky.gates?.[gateType] || 0;
    const sparkyCount = sparky.gates?.[gateType] || 0;
    
    if (snarkyCount !== sparkyCount) {
      console.log(`  ${gateType}: Snarky=${snarkyCount}, Sparky=${sparkyCount} (${sparkyCount > snarkyCount ? '+' : ''}${sparkyCount - snarkyCount})`);
      hasECDifferences = true;
    } else if (snarkyCount > 0) {
      console.log(`  ${gateType}: ${snarkyCount} (same)`);
    }
  }
  
  if (!hasECDifferences) {
    console.log('  No EC-specific gate differences detected');
  }
  
  // Analyze constraint efficiency
  const snarkyTotal = snarky.total || 0;
  const sparkyTotal = sparky.total || 0;
  
  if (sparkyTotal !== snarkyTotal) {
    const efficiency = ((snarkyTotal - sparkyTotal) / snarkyTotal * 100).toFixed(1);
    console.log(`\n📈 Constraint efficiency: ${efficiency > 0 ? 'Sparky uses ' + Math.abs(efficiency) + '% fewer constraints' : 'Sparky uses ' + Math.abs(efficiency) + '% more constraints'}`);
  }
}

compareVKs().catch(console.error);