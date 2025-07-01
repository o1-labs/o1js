/**
 * Constraint System Analyzer
 * 
 * A comprehensive tool for analyzing and comparing constraint systems
 * between Snarky and Sparky backends to debug VK differences.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from 'o1js';
import { Snarky } from '../../bindings.js';
import * as fs from 'fs';
import * as path from 'path';

interface ConstraintSystemData {
  backend: string;
  programName: string;
  gates: any[];
  gateCount: number;
  gateTypes: Record<string, number>;
  publicInputSize: number;
  verificationKey?: {
    hash: string;
    data: string;
    raw?: any;
  };
  rawCS?: any;
}

interface ComparisonResult {
  programName: string;
  snarky: ConstraintSystemData;
  sparky: ConstraintSystemData;
  differences: {
    gateCountDiff: number;
    gateTypeDiffs: Record<string, { snarky: number; sparky: number }>;
    vkHashMatch: boolean;
    vkDataMatch: boolean;
    vkDataDiffIndex: number;
    detailedGateDiffs: GateDifference[];
  };
}

interface GateDifference {
  index: number;
  snarkyGate: any;
  sparkyGate: any;
  difference: string;
}

export class ConstraintSystemAnalyzer {
  private outputDir: string;

  constructor(outputDir = './constraint-analysis') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Capture constraint system data for a given program
   */
  async captureConstraintSystem(
    program: ReturnType<typeof ZkProgram>,
    programName: string
  ): Promise<ConstraintSystemData> {
    const backend = getCurrentBackend();
    console.log(`\nCapturing constraint system for ${programName} with ${backend}...`);

    try {
      // Enter constraint system mode
      const cs = Snarky.run.enterConstraintSystem();
      
      // Compile the program
      const { verificationKey } = await program.compile();
      
      // Get the constraint system
      const constraintSystem = cs();
      
      // Get raw constraint system JSON
      let rawCS;
      let gates: any[] = [];
      const gateTypes: Record<string, number> = {};
      
      try {
        rawCS = Snarky.constraintSystem.toJson({}) as any;
        gates = rawCS?.gates || [];
        
        gates.forEach((gate: any) => {
          const type = gate.type || gate.typ || 'Unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
      } catch (e) {
        console.log(`Warning: Could not get raw CS JSON for ${backend}`);
        // Try alternative access if available
        if (constraintSystem && typeof constraintSystem === 'object') {
          console.log('CS structure:', Object.keys(constraintSystem));
        }
      }

      const data: ConstraintSystemData = {
        backend,
        programName,
        gates,
        gateCount: gates.length,
        gateTypes,
        publicInputSize: rawCS?.public_input_size || 0,
        verificationKey: {
          hash: verificationKey.hash.toString(),
          data: verificationKey.data,
          raw: verificationKey
        },
        rawCS
      };

      // Save to file
      this.saveData(data, `${programName}-${backend}.json`);
      
      return data;
    } catch (error) {
      console.error(`Error capturing constraint system for ${backend}:`, error);
      throw error;
    }
  }

  /**
   * Compare constraint systems between Snarky and Sparky
   */
  async compareProgram(
    program: ReturnType<typeof ZkProgram>,
    programName: string
  ): Promise<ComparisonResult> {
    // Capture with Snarky
    await switchBackend('snarky');
    const snarkyData = await this.captureConstraintSystem(program, programName);

    // Capture with Sparky
    await switchBackend('sparky');
    const sparkyData = await this.captureConstraintSystem(program, programName);

    // Reset to Snarky
    await switchBackend('snarky');

    // Compare
    const comparison = this.compareConstraintSystems(snarkyData, sparkyData, programName);
    
    // Save comparison
    this.saveData(comparison, `${programName}-comparison.json`);
    
    return comparison;
  }

  /**
   * Detailed comparison of two constraint systems
   */
  private compareConstraintSystems(
    snarky: ConstraintSystemData,
    sparky: ConstraintSystemData,
    programName: string
  ): ComparisonResult {
    // Gate type differences
    const gateTypeDiffs: Record<string, { snarky: number; sparky: number }> = {};
    const allGateTypes = new Set([
      ...Object.keys(snarky.gateTypes),
      ...Object.keys(sparky.gateTypes)
    ]);

    allGateTypes.forEach(type => {
      const snarkyCount = snarky.gateTypes[type] || 0;
      const sparkyCount = sparky.gateTypes[type] || 0;
      if (snarkyCount !== sparkyCount) {
        gateTypeDiffs[type] = { snarky: snarkyCount, sparky: sparkyCount };
      }
    });

    // VK comparison
    const vkHashMatch = snarky.verificationKey?.hash === sparky.verificationKey?.hash;
    const vkDataMatch = snarky.verificationKey?.data === sparky.verificationKey?.data;
    
    let vkDataDiffIndex = -1;
    if (!vkDataMatch && snarky.verificationKey?.data && sparky.verificationKey?.data) {
      for (let i = 0; i < Math.min(snarky.verificationKey.data.length, sparky.verificationKey.data.length); i++) {
        if (snarky.verificationKey.data[i] !== sparky.verificationKey.data[i]) {
          vkDataDiffIndex = i;
          break;
        }
      }
    }

    // Detailed gate differences
    const detailedGateDiffs = this.findGateDifferences(snarky.gates, sparky.gates);

    return {
      programName,
      snarky,
      sparky,
      differences: {
        gateCountDiff: sparky.gateCount - snarky.gateCount,
        gateTypeDiffs,
        vkHashMatch,
        vkDataMatch,
        vkDataDiffIndex,
        detailedGateDiffs
      }
    };
  }

  /**
   * Find detailed differences between gate arrays
   */
  private findGateDifferences(snarkyGates: any[], sparkyGates: any[]): GateDifference[] {
    const differences: GateDifference[] = [];
    const maxLength = Math.max(snarkyGates.length, sparkyGates.length);

    for (let i = 0; i < maxLength; i++) {
      const snarkyGate = snarkyGates[i];
      const sparkyGate = sparkyGates[i];

      if (!snarkyGate || !sparkyGate) {
        differences.push({
          index: i,
          snarkyGate,
          sparkyGate,
          difference: !snarkyGate ? 'Missing in Snarky' : 'Missing in Sparky'
        });
      } else if (JSON.stringify(snarkyGate) !== JSON.stringify(sparkyGate)) {
        differences.push({
          index: i,
          snarkyGate,
          sparkyGate,
          difference: this.describeDifference(snarkyGate, sparkyGate)
        });
      }
    }

    return differences;
  }

  /**
   * Describe the difference between two gates
   */
  private describeDifference(gate1: any, gate2: any): string {
    const diffs: string[] = [];
    
    if (gate1.type !== gate2.type) {
      diffs.push(`Type: ${gate1.type} vs ${gate2.type}`);
    }
    
    // Add more specific comparisons based on gate structure
    // This would need to be expanded based on actual gate format
    
    return diffs.join(', ') || 'Different gate content';
  }

  /**
   * Save data to file
   */
  private saveData(data: any, filename: string) {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Saved analysis to ${filepath}`);
  }

  /**
   * Generate a comprehensive report
   */
  generateReport(comparisons: ComparisonResult[]): string {
    let report = '# Constraint System Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    report += '## Summary\n\n';
    const allVkMatch = comparisons.every(c => c.differences.vkHashMatch);
    report += `- **VK Parity**: ${allVkMatch ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}\n`;
    report += `- **Programs Analyzed**: ${comparisons.length}\n`;
    
    // Suspicious finding about Sparky VK hashes
    const sparkyHashes = comparisons.map(c => c.sparky.verificationKey?.hash);
    const uniqueSparkyHashes = new Set(sparkyHashes);
    if (uniqueSparkyHashes.size === 1 && comparisons.length > 1) {
      report += `- **⚠️ CRITICAL ISSUE**: All Sparky programs generate the same VK hash: ${sparkyHashes[0]}\n`;
    }

    report += '\n## Detailed Analysis\n\n';

    comparisons.forEach(comp => {
      report += `### ${comp.programName}\n\n`;
      report += `#### Gate Analysis\n`;
      report += `- Snarky gates: ${comp.snarky.gateCount}\n`;
      report += `- Sparky gates: ${comp.sparky.gateCount}\n`;
      report += `- Difference: ${comp.differences.gateCountDiff > 0 ? '+' : ''}${comp.differences.gateCountDiff}\n`;
      
      if (Object.keys(comp.differences.gateTypeDiffs).length > 0) {
        report += '\nGate type differences:\n';
        Object.entries(comp.differences.gateTypeDiffs).forEach(([type, counts]) => {
          report += `- ${type}: Snarky=${counts.snarky}, Sparky=${counts.sparky}\n`;
        });
      }

      report += `\n#### VK Analysis\n`;
      report += `- Hash match: ${comp.differences.vkHashMatch ? '✅' : '❌'}\n`;
      report += `- Data match: ${comp.differences.vkDataMatch ? '✅' : '❌'}\n`;
      if (!comp.differences.vkDataMatch && comp.differences.vkDataDiffIndex >= 0) {
        report += `- Data differs at index: ${comp.differences.vkDataDiffIndex}\n`;
      }
      report += `- Snarky VK hash: ${comp.snarky.verificationKey?.hash}\n`;
      report += `- Sparky VK hash: ${comp.sparky.verificationKey?.hash}\n`;

      if (comp.differences.detailedGateDiffs.length > 0) {
        report += `\n#### First 5 Gate Differences\n`;
        comp.differences.detailedGateDiffs.slice(0, 5).forEach(diff => {
          report += `- Gate ${diff.index}: ${diff.difference}\n`;
        });
      }

      report += '\n---\n\n';
    });

    // Save report
    const reportPath = path.join(this.outputDir, 'analysis-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\nReport saved to ${reportPath}`);

    return report;
  }
}

// Export for use in tests
export { ConstraintSystemData, ComparisonResult };