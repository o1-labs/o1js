/**
 * Constraint System Comparison Utility
 * 
 * This utility provides detailed comparison between Snarky and Sparky constraint systems,
 * showing exactly where and how they differ at the gate and constraint level.
 */

import { Field, Bool, Provable, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

interface GateComparison {
  index: number;
  snarky: any;
  sparky: any;
  differences: string[];
}

interface ConstraintSystemComparison {
  metadata: {
    snarky: { rows: number; digest: string; publicInputSize: number };
    sparky: { rows: number; digest: string; publicInputSize: number };
  };
  gateComparison: {
    totalGates: { snarky: number; sparky: number };
    matching: number;
    differing: number;
    snarkyOnly: number;
    sparkyOnly: number;
  };
  detailedDifferences: GateComparison[];
  summary: string[];
}

/**
 * Compare constraint systems between Snarky and Sparky backends
 */
export async function compareConstraintSystems(
  name: string,
  circuitFn: () => void,
  options: { 
    showIdentical?: boolean; 
    maxDifferences?: number;
    verboseOutput?: boolean;
  } = {}
): Promise<ConstraintSystemComparison> {
  const { showIdentical = false, maxDifferences = 10, verboseOutput = false } = options;
  
  console.log(`\n🔍 Comparing constraint systems for: ${name}`);
  console.log('=' .repeat(60));
  
  // Capture constraint system with Snarky
  await switchBackend('snarky');
  const snarkyCS = await Provable.constraintSystem(circuitFn);
  
  // Capture constraint system with Sparky  
  await switchBackend('sparky');
  const sparkyCS = await Provable.constraintSystem(circuitFn);
  
  if (verboseOutput) {
    console.log('\n📊 Snarky Constraint System:');
    snarkyCS.print();
    
    console.log('\n📊 Sparky Constraint System:');
    sparkyCS.print();
  }
  
  // Compare metadata
  const metadata = {
    snarky: {
      rows: snarkyCS.rows,
      digest: snarkyCS.digest,
      publicInputSize: snarkyCS.publicInputSize
    },
    sparky: {
      rows: sparkyCS.rows,
      digest: sparkyCS.digest,
      publicInputSize: sparkyCS.publicInputSize
    }
  };
  
  console.log('\n📈 Metadata Comparison:');
  console.log(`Rows:             Snarky=${metadata.snarky.rows} | Sparky=${metadata.sparky.rows} ${metadata.snarky.rows === metadata.sparky.rows ? '✅' : '❌'}`);
  console.log(`Public Input:     Snarky=${metadata.snarky.publicInputSize} | Sparky=${metadata.sparky.publicInputSize} ${metadata.snarky.publicInputSize === metadata.sparky.publicInputSize ? '✅' : '❌'}`);
  console.log(`Digest Match:     ${metadata.snarky.digest === metadata.sparky.digest ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
  
  if (metadata.snarky.digest !== metadata.sparky.digest) {
    console.log(`  Snarky digest:  ${metadata.snarky.digest}`);
    console.log(`  Sparky digest:  ${metadata.sparky.digest}`);
  }
  
  // Compare gates
  const snarkyGates = snarkyCS.gates || [];
  const sparkyGates = sparkyCS.gates || [];
  
  console.log(`\n🚪 Gate Count Comparison:`);
  console.log(`Snarky gates: ${snarkyGates.length}`);
  console.log(`Sparky gates: ${sparkyGates.length}`);
  
  // Detailed gate comparison
  const detailedDifferences: GateComparison[] = [];
  const maxLen = Math.max(snarkyGates.length, sparkyGates.length);
  let matching = 0;
  let differing = 0;
  
  for (let i = 0; i < maxLen; i++) {
    const snarkyGate = i < snarkyGates.length ? snarkyGates[i] : null;
    const sparkyGate = i < sparkyGates.length ? sparkyGates[i] : null;
    
    const differences: string[] = [];
    
    // Check if gate exists in both
    if (!snarkyGate) {
      differences.push(`Sparky-only gate at index ${i}`);
    } else if (!sparkyGate) {
      differences.push(`Snarky-only gate at index ${i}`);
    } else {
      // Compare gate properties
      if (snarkyGate.type !== sparkyGate.type) {
        differences.push(`Type: ${snarkyGate.type} vs ${sparkyGate.type}`);
      }
      
      // Compare wires
      if (!deepEqual(snarkyGate.wires, sparkyGate.wires)) {
        differences.push(`Wires: ${JSON.stringify(snarkyGate.wires)} vs ${JSON.stringify(sparkyGate.wires)}`);
      }
      
      // Compare coefficients
      if (!deepEqual(snarkyGate.coeffs, sparkyGate.coeffs)) {
        differences.push(`Coeffs: ${formatCoeffs(snarkyGate.coeffs)} vs ${formatCoeffs(sparkyGate.coeffs)}`);
      }
    }
    
    if (differences.length === 0) {
      matching++;
      if (showIdentical) {
        console.log(`✅ Gate ${i}: ${snarkyGate?.type || 'Missing'} - IDENTICAL`);
      }
    } else {
      differing++;
      detailedDifferences.push({
        index: i,
        snarky: snarkyGate,
        sparky: sparkyGate,
        differences
      });
    }
  }
  
  // Show differences (up to maxDifferences)
  if (detailedDifferences.length > 0) {
    console.log(`\n❌ Gate Differences (showing first ${Math.min(maxDifferences, detailedDifferences.length)} of ${detailedDifferences.length}):`);
    
    for (let i = 0; i < Math.min(maxDifferences, detailedDifferences.length); i++) {
      const diff = detailedDifferences[i];
      console.log(`\n🔍 Gate ${diff.index}:`);
      diff.differences.forEach(d => console.log(`   ${d}`));
      
      if (verboseOutput && diff.snarky && diff.sparky) {
        console.log(`   Snarky: ${JSON.stringify(diff.snarky, null, 2)}`);
        console.log(`   Sparky: ${JSON.stringify(diff.sparky, null, 2)}`);
      }
    }
    
    if (detailedDifferences.length > maxDifferences) {
      console.log(`\n... and ${detailedDifferences.length - maxDifferences} more differences`);
    }
  }
  
  // Generate summary
  const summary: string[] = [];
  
  if (metadata.snarky.digest !== metadata.sparky.digest) {
    summary.push(`❌ CRITICAL: Constraint system digests differ`);
  }
  
  if (metadata.snarky.rows !== metadata.sparky.rows) {
    summary.push(`❌ Row count mismatch: ${metadata.snarky.rows} vs ${metadata.sparky.rows} (${Math.abs(metadata.snarky.rows - metadata.sparky.rows)} difference)`);
  }
  
  if (detailedDifferences.length > 0) {
    summary.push(`❌ ${detailedDifferences.length} gates differ out of ${Math.max(snarkyGates.length, sparkyGates.length)} total`);
  }
  
  if (snarkyGates.length !== sparkyGates.length) {
    summary.push(`❌ Gate count mismatch: Snarky=${snarkyGates.length}, Sparky=${sparkyGates.length}`);
  }
  
  if (summary.length === 0) {
    summary.push(`✅ Constraint systems are IDENTICAL`);
  }
  
  console.log('\n📋 Summary:');
  summary.forEach(s => console.log(`   ${s}`));
  console.log('=' .repeat(60));
  
  return {
    metadata,
    gateComparison: {
      totalGates: { snarky: snarkyGates.length, sparky: sparkyGates.length },
      matching,
      differing,
      snarkyOnly: snarkyGates.length > sparkyGates.length ? snarkyGates.length - sparkyGates.length : 0,
      sparkyOnly: sparkyGates.length > snarkyGates.length ? sparkyGates.length - snarkyGates.length : 0
    },
    detailedDifferences,
    summary
  };
}

/**
 * Analyze constraint system structure and provide insights
 */
export async function analyzeConstraintSystem(
  name: string, 
  circuitFn: () => void,
  backend: 'snarky' | 'sparky' = 'snarky'
): Promise<void> {
  await switchBackend(backend);
  console.log(`\n🔬 Analyzing ${backend} constraint system: ${name}`);
  
  const cs = await Provable.constraintSystem(circuitFn);
  const gates = cs.gates || [];
  
  // Gate type analysis
  const gateTypes: Record<string, number> = {};
  const wireUsage: Record<string, number> = {};
  const coeffAnalysis: Record<string, { min: bigint; max: bigint; count: number }> = {};
  
  gates.forEach(gate => {
    // Count gate types
    gateTypes[gate.type] = (gateTypes[gate.type] || 0) + 1;
    
    // Analyze wire usage
    gate.wires?.forEach((wire: any) => {
      const wireKey = `${wire.row},${wire.col}`;
      wireUsage[wireKey] = (wireUsage[wireKey] || 0) + 1;
    });
    
    // Analyze coefficients
    gate.coeffs?.forEach((coeff: string) => {
      if (coeff && coeff !== '0'.repeat(64)) {
        const value = BigInt('0x' + coeff);
        if (!coeffAnalysis[gate.type]) {
          coeffAnalysis[gate.type] = { min: value, max: value, count: 0 };
        }
        const analysis = coeffAnalysis[gate.type];
        analysis.min = value < analysis.min ? value : analysis.min;
        analysis.max = value > analysis.max ? value : analysis.max;
        analysis.count++;
      }
    });
  });
  
  console.log('\n📊 Gate Type Distribution:');
  Object.entries(gateTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)} ${count} gates`);
    });
  
  console.log('\n🔗 Wire Usage Statistics:');
  const wireEntries = Object.entries(wireUsage).sort(([,a], [,b]) => b - a);
  console.log(`  Total unique wire positions: ${wireEntries.length}`);
  console.log(`  Most used wire position: ${wireEntries[0]?.[0]} (used ${wireEntries[0]?.[1]} times)`);
  
  console.log('\n🧮 Coefficient Analysis:');
  Object.entries(coeffAnalysis).forEach(([type, analysis]) => {
    console.log(`  ${type.padEnd(20)} ${analysis.count} non-zero coeffs`);
  });
  
  console.log(`\n📐 Constraint System Properties:`);
  console.log(`  Total rows: ${cs.rows}`);
  console.log(`  Public inputs: ${cs.publicInputSize}`);
  console.log(`  Total gates: ${gates.length}`);
  console.log(`  Digest: ${cs.digest}`);
}

/**
 * Generate a comprehensive constraint comparison report
 */
export async function generateConstraintReport(
  testCases: { name: string; circuit: () => void }[],
  outputPath?: string
): Promise<void> {
  const results: ConstraintSystemComparison[] = [];
  
  console.log(`\n📝 Generating constraint comparison report for ${testCases.length} test cases...`);
  
  for (const testCase of testCases) {
    try {
      const result = await compareConstraintSystems(testCase.name, testCase.circuit, {
        verboseOutput: false,
        maxDifferences: 5
      });
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to analyze ${testCase.name}:`, error);
    }
  }
  
  // Generate summary report
  const report = generateMarkdownReport(results);
  
  if (outputPath) {
    const fs = await import('fs');
    fs.writeFileSync(outputPath, report);
    console.log(`\n📄 Report saved to: ${outputPath}`);
  } else {
    console.log('\n📄 CONSTRAINT COMPARISON REPORT');
    console.log('=' .repeat(80));
    console.log(report);
  }
}

// Helper functions
function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatCoeffs(coeffs: string[]): string {
  if (!coeffs || coeffs.length === 0) return '[]';
  return `[${coeffs.length} coeffs]`;
}

function generateMarkdownReport(results: ConstraintSystemComparison[]): string {
  const totalTests = results.length;
  const identicalSystems = results.filter(r => r.summary.some(s => s.includes('IDENTICAL'))).length;
  const differentSystems = totalTests - identicalSystems;
  
  let report = `# Constraint System Comparison Report\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += `**Total Test Cases**: ${totalTests}\n`;
  report += `**Identical Systems**: ${identicalSystems}\n`;
  report += `**Different Systems**: ${differentSystems}\n\n`;
  
  report += `## Summary\n\n`;
  if (identicalSystems === totalTests) {
    report += `✅ **ALL CONSTRAINT SYSTEMS MATCH** - Sparky is fully compatible with Snarky!\n\n`;
  } else {
    report += `❌ **${differentSystems} out of ${totalTests} constraint systems differ** - Compatibility issues detected.\n\n`;
  }
  
  report += `## Detailed Results\n\n`;
  
  results.forEach((result, index) => {
    const testName = `Test Case ${index + 1}`;
    const isIdentical = result.summary.some(s => s.includes('IDENTICAL'));
    
    report += `### ${testName} ${isIdentical ? '✅' : '❌'}\n\n`;
    
    report += `| Property | Snarky | Sparky | Match |\n`;
    report += `|----------|--------|-----------|-------|\n`;
    report += `| Rows | ${result.metadata.snarky.rows} | ${result.metadata.sparky.rows} | ${result.metadata.snarky.rows === result.metadata.sparky.rows ? '✅' : '❌'} |\n`;
    report += `| Public Inputs | ${result.metadata.snarky.publicInputSize} | ${result.metadata.sparky.publicInputSize} | ${result.metadata.snarky.publicInputSize === result.metadata.sparky.publicInputSize ? '✅' : '❌'} |\n`;
    report += `| Digest | ${result.metadata.snarky.digest.substring(0, 16)}... | ${result.metadata.sparky.digest.substring(0, 16)}... | ${result.metadata.snarky.digest === result.metadata.sparky.digest ? '✅' : '❌'} |\n`;
    report += `| Gates | ${result.gateComparison.totalGates.snarky} | ${result.gateComparison.totalGates.sparky} | ${result.gateComparison.totalGates.snarky === result.gateComparison.totalGates.sparky ? '✅' : '❌'} |\n\n`;
    
    if (result.detailedDifferences.length > 0) {
      report += `**Gate Differences**: ${result.detailedDifferences.length} differences found\n\n`;
    }
    
    result.summary.forEach(s => {
      report += `- ${s}\n`;
    });
    
    report += `\n`;
  });
  
  return report;
}