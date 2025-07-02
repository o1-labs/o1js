/**
 * VK Parity Analysis System
 * 
 * Systematically detects and analyzes the critical VK parity bug where 
 * "All Sparky VKs generate identical hash" preventing backend compatibility.
 * 
 * This is the core blocker for 100% VK parity between Snarky and Sparky backends.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from '../../../index';

export interface VKAnalysisResult {
  backend: 'snarky' | 'sparky';
  programName: string;
  vkHash: string;
  vkData: string;
  constraintCount: number;
  gateCount: number;
  compilationTime: number;
  success: boolean;
  error?: string;
  metadata: {
    complexity: number;
    circuitType: string;
    hasLoops: boolean;
    hasConditionals: boolean;
    maxDepth: number;
  };
}

export interface VKParityReport {
  totalPrograms: number;
  matchingVKs: number;
  identicalSparkyHashes: string[];
  uniqueSnarkyHashes: string[];
  paritySuccess: boolean;
  sparkyIdenticalHashBug: boolean;
  results: VKAnalysisResult[];
  bugAnalysis: {
    allSparkyVKsIdentical: boolean;
    identicalHashValue?: string;
    diversityScore: number;
    suspectedBugLocation: string;
  };
}

export interface CircuitComplexityLevel {
  name: string;
  complexity: number;
  description: string;
  generator: () => any;
}

export class VKParityAnalysis {
  private results: VKAnalysisResult[] = [];
  private vkHashDatabase: Map<string, VKAnalysisResult[]> = new Map();
  
  /**
   * Generate circuits of systematic complexity levels for VK analysis
   */
  getComplexityLevels(): CircuitComplexityLevel[] {
    return [
      {
        name: 'Minimal',
        complexity: 1,
        description: 'Single field constraint',
        generator: () => ZkProgram({
          name: 'MinimalProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub, priv) {
                pub.assertEquals(priv);
              }
            }
          }
        })
      },
      
      {
        name: 'Simple',
        complexity: 2,
        description: 'Basic arithmetic operations',
        generator: () => ZkProgram({
          name: 'SimpleProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub, priv) {
                priv.mul(Field(2)).assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'LinearCombination',
        complexity: 3,
        description: 'Tests reduce_lincom optimization',
        generator: () => ZkProgram({
          name: 'LinearCombinationProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub, x) {
                // This should trigger reduce_lincom optimization in Snarky
                // but may not in Sparky, causing different constraint counts
                const expr = x.add(x.mul(Field(2))).add(x.mul(Field(3)));
                expr.assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'Moderate',
        complexity: 4,
        description: 'Multiple intermediate values',
        generator: () => ZkProgram({
          name: 'ModerateProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field, Field],
              async method(pub, a, b) {
                const ab = a.mul(b);
                const abb = ab.mul(b);
                abb.assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'Complex',
        complexity: 5,
        description: 'Multiple operations and constraints',
        generator: () => ZkProgram({
          name: 'ComplexProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field, Field, Field],
              async method(pub, a, b, c) {
                const ab = a.mul(b);
                const bc = b.mul(c);
                const ac = a.mul(c);
                const result = ab.add(bc).add(ac);
                result.assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'Repetitive',
        complexity: 6,
        description: 'Loop-like patterns that may benefit from optimization',
        generator: () => ZkProgram({
          name: 'RepetitiveProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub, x) {
                // Repetitive pattern: x + x + x + x + x (should optimize to 5*x)
                let sum = x;
                for (let i = 1; i < 5; i++) {
                  sum = sum.add(x);
                }
                sum.assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'HighDepth',
        complexity: 7,  
        description: 'Deep computation tree',
        generator: () => ZkProgram({
          name: 'HighDepthProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field],
              async method(pub, x) {
                // Deep nested computation: ((x^2)^2)^2 = x^8
                const x2 = x.mul(x);
                const x4 = x2.mul(x2);
                const x8 = x4.mul(x4);
                x8.assertEquals(pub);
              }
            }
          }
        })
      },
      
      {
        name: 'MultiOutput',
        complexity: 8,
        description: 'Multiple public outputs',
        generator: () => ZkProgram({
          name: 'MultiOutputProgram',
          publicInput: Field,
          methods: {
            test: {
              privateInputs: [Field, Field],
              async method(pub, a, b) {
                // Multiple constraints on same public input
                a.add(b).assertEquals(pub);
                a.mul(b).assertEquals(pub.mul(pub)); // pub^2
              }
            }
          }
        })
      }
    ];
  }

  /**
   * Extract VK hash and metadata from ZkProgram compilation
   */
  async extractVKAnalysis(
    program: any, 
    backend: 'snarky' | 'sparky',
    complexity: number = 0,
    circuitType: string = 'unknown'
  ): Promise<VKAnalysisResult> {
    const startTime = performance.now();
    
    try {
      await switchBackend(backend);
      
      console.log(`[VK Analysis] Compiling ${program.name || 'Unknown'} with ${backend}...`);
      
      // Compile the program
      const compilation = await program.compile();
      const analysis = await program.analyzeMethods();
      
      const compilationTime = performance.now() - startTime;
      
      // Extract VK information
      const vkHash = compilation.verificationKey.hash.toString();
      const vkData = compilation.verificationKey.data;
      
      // Extract constraint information
      const methodAnalysis = Object.values(analysis)[0] as any;
      const constraintCount = methodAnalysis?.rows || 0;
      const gateCount = methodAnalysis?.gates || 0;
      
      // Analyze circuit complexity
      const metadata = {
        complexity,
        circuitType,
        hasLoops: circuitType.includes('Repetitive'),
        hasConditionals: circuitType.includes('Conditional'),
        maxDepth: this.estimateCircuitDepth(circuitType)
      };
      
      const result: VKAnalysisResult = {
        backend,
        programName: program.name || 'Unknown',
        vkHash,
        vkData,
        constraintCount,
        gateCount,
        compilationTime,
        success: true,
        metadata
      };
      
      this.storeVKResult(result);
      
      console.log(`[VK Analysis] ${backend} - Hash: ${vkHash.substring(0, 16)}..., Constraints: ${constraintCount}`);
      
      return result;
      
    } catch (error) {
      const compilationTime = performance.now() - startTime;
      
      const result: VKAnalysisResult = {
        backend,
        programName: program.name || 'Unknown',
        vkHash: '',
        vkData: '',
        constraintCount: 0,
        gateCount: 0,
        compilationTime,
        success: false,
        error: (error as Error).message,
        metadata: {
          complexity,
          circuitType,
          hasLoops: false,
          hasConditionals: false,
          maxDepth: 0
        }
      };
      
      console.error(`[VK Analysis] Failed to compile ${program.name} with ${backend}: ${(error as Error).message}`);
      
      return result;
    }
  }

  /**
   * Batch VK generation for systematic testing
   */
  async batchVKGeneration(
    programs: any[],
    testBothBackends: boolean = true
  ): Promise<VKAnalysisResult[]> {
    const results: VKAnalysisResult[] = [];
    
    console.log(`[VK Batch] Starting batch analysis of ${programs.length} programs...`);
    
    for (const [index, program] of programs.entries()) {
      console.log(`[VK Batch] Processing program ${index + 1}/${programs.length}: ${program.name}`);
      
      if (testBothBackends) {
        // Test with Snarky
        const snarkyResult = await this.extractVKAnalysis(
          program, 
          'snarky', 
          index + 1, 
          program.name
        );
        results.push(snarkyResult);
        
        // Test with Sparky
        const sparkyResult = await this.extractVKAnalysis(
          program, 
          'sparky', 
          index + 1, 
          program.name
        );
        results.push(sparkyResult);
        
        // Immediate parity check
        if (snarkyResult.success && sparkyResult.success) {
          const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
          console.log(`[VK Batch] Program ${program.name} VK Parity: ${vkMatch ? '✅' : '❌'}`);
          
          if (!vkMatch) {
            console.log(`  Snarky VK: ${snarkyResult.vkHash.substring(0, 20)}...`);
            console.log(`  Sparky VK: ${sparkyResult.vkHash.substring(0, 20)}...`);
          }
        }
      } else {
        // Test with current backend only
        const currentBackend = getCurrentBackend();
        const result = await this.extractVKAnalysis(
          program, 
          currentBackend as 'snarky' | 'sparky', 
          index + 1, 
          program.name
        );
        results.push(result);
      }
    }
    
    this.results.push(...results);
    return results;
  }

  /**
   * Comprehensive VK parity analysis
   */
  async analyzeVKParity(): Promise<VKParityReport> {
    console.log('[VK Parity] Starting comprehensive VK parity analysis...');
    
    // Generate test programs of varying complexity
    const complexityLevels = this.getComplexityLevels();
    const programs = complexityLevels.map(level => level.generator());
    
    // Run batch analysis
    const results = await this.batchVKGeneration(programs, true);
    
    // Separate results by backend
    const snarkyResults = results.filter(r => r.backend === 'snarky' && r.success);
    const sparkyResults = results.filter(r => r.backend === 'sparky' && r.success);
    
    // Extract hashes
    const snarkyHashes = snarkyResults.map(r => r.vkHash);
    const sparkyHashes = sparkyResults.map(r => r.vkHash);
    
    // Check for identical Sparky hashes (the critical bug)
    const uniqueSparkyHashes = [...new Set(sparkyHashes)];
    const allSparkyVKsIdentical = uniqueSparkyHashes.length === 1 && sparkyHashes.length > 1;
    
    // Calculate VK matches
    let matchingVKs = 0;
    for (let i = 0; i < Math.min(snarkyResults.length, sparkyResults.length); i++) {
      if (snarkyResults[i].vkHash === sparkyResults[i].vkHash) {
        matchingVKs++;
      }
    }
    
    // Calculate diversity score
    const diversityScore = uniqueSparkyHashes.length / Math.max(sparkyHashes.length, 1);
    
    const report: VKParityReport = {
      totalPrograms: programs.length,
      matchingVKs,
      identicalSparkyHashes: sparkyHashes,
      uniqueSnarkyHashes: [...new Set(snarkyHashes)],
      paritySuccess: matchingVKs === programs.length,
      sparkyIdenticalHashBug: allSparkyVKsIdentical,
      results,
      bugAnalysis: {
        allSparkyVKsIdentical,
        identicalHashValue: allSparkyVKsIdentical ? uniqueSparkyHashes[0] : undefined,
        diversityScore,
        suspectedBugLocation: this.identifyBugLocation(allSparkyVKsIdentical, diversityScore)
      }
    };
    
    this.printParityReport(report);
    
    return report;
  }

  /**
   * Detect the specific VK identical hash bug
   */
  async detectIdenticalHashBug(): Promise<{
    bugDetected: boolean;
    identicalHash?: string;
    affectedPrograms: string[];
    analysisDetails: string;
  }> {
    console.log('[Bug Detection] Scanning for identical VK hash bug in Sparky...');
    
    // Test with multiple different programs
    const testPrograms = [
      ZkProgram({
        name: 'TestA',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, priv) { pub.assertEquals(priv); }
          }
        }
      }),
      
      ZkProgram({
        name: 'TestB',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, priv) { pub.assertEquals(priv.mul(Field(2))); }
          }
        }
      }),
      
      ZkProgram({
        name: 'TestC',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, a, b) { pub.assertEquals(a.add(b)); }
          }
        }
      })
    ];
    
    await switchBackend('sparky');
    
    const vkHashes: string[] = [];
    const programNames: string[] = [];
    
    for (const program of testPrograms) {
      try {
        const { verificationKey } = await program.compile();
        vkHashes.push(verificationKey.hash.toString());
        programNames.push(program.name);
        console.log(`[Bug Detection] ${program.name}: ${verificationKey.hash.toString().substring(0, 20)}...`);
      } catch (error) {
        console.error(`[Bug Detection] Failed to compile ${program.name}: ${(error as Error).message}`);
      }
    }
    
    // Check if all hashes are identical
    const uniqueHashes = [...new Set(vkHashes)];
    const bugDetected = uniqueHashes.length === 1 && vkHashes.length > 1;
    
    const analysisDetails = bugDetected 
      ? `🚨 CRITICAL BUG DETECTED: All ${vkHashes.length} different Sparky programs generated identical VK hash: ${uniqueHashes[0]}`
      : `✅ No identical hash bug detected. Found ${uniqueHashes.length} unique hashes from ${vkHashes.length} programs.`;
    
    console.log(`[Bug Detection] ${analysisDetails}`);
    
    return {
      bugDetected,
      identicalHash: bugDetected ? uniqueHashes[0] : undefined,
      affectedPrograms: bugDetected ? programNames : [],
      analysisDetails
    };
  }

  /**
   * VK hash comparison utilities
   */
  compareVKHashes(hash1: string, hash2: string): {
    identical: boolean;
    differenceIndex: number;
    similarity: number;
  } {
    const identical = hash1 === hash2;
    
    let differenceIndex = -1;
    if (!identical) {
      for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
        if (hash1[i] !== hash2[i]) {
          differenceIndex = i;
          break;
        }
      }
    }
    
    // Calculate similarity score
    const minLength = Math.min(hash1.length, hash2.length);
    let matchingChars = 0;
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matchingChars++;
    }
    const similarity = matchingChars / Math.max(hash1.length, hash2.length);
    
    return { identical, differenceIndex, similarity };
  }

  /**
   * Statistical analysis of VK diversity
   */
  analyzeVKDiversity(vkHashes: string[]): {
    totalHashes: number;
    uniqueHashes: number;
    diversityScore: number;
    duplicateGroups: Map<string, number>;
    suspiciousPatterns: string[];
  } {
    const uniqueHashes = new Set(vkHashes);
    const diversityScore = uniqueHashes.size / vkHashes.length;
    
    // Count duplicates
    const duplicateGroups = new Map<string, number>();
    for (const hash of vkHashes) {
      duplicateGroups.set(hash, (duplicateGroups.get(hash) || 0) + 1);
    }
    
    // Identify suspicious patterns
    const suspiciousPatterns: string[] = [];
    
    // All hashes identical
    if (uniqueHashes.size === 1 && vkHashes.length > 1) {
      suspiciousPatterns.push('All VK hashes are identical');
    }
    
    // Too many duplicates
    for (const [hash, count] of duplicateGroups.entries()) {
      if (count > vkHashes.length * 0.5) {
        suspiciousPatterns.push(`Hash ${hash.substring(0, 16)}... appears ${count} times (${(count/vkHashes.length*100).toFixed(1)}%)`);
      }
    }
    
    // Low diversity
    if (diversityScore < 0.5) {
      suspiciousPatterns.push(`Low VK diversity: ${(diversityScore * 100).toFixed(1)}%`);
    }
    
    return {
      totalHashes: vkHashes.length,
      uniqueHashes: uniqueHashes.size,
      diversityScore,
      duplicateGroups,
      suspiciousPatterns
    };
  }

  /**
   * Circuit minimization for VK debugging
   */
  async minimizeCircuitForVKDebugging(baseProgram: any): Promise<{
    minimalProgram: any;
    vkHash: string;
    steps: string[];
  }> {
    const steps: string[] = [];
    
    // Start with the most minimal circuit that still produces a VK
    const minimalProgram = ZkProgram({
      name: 'MinimalVKTest',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(pub) {
            // Absolute minimum: just assert public input equals itself
            pub.assertEquals(pub);
          }
        }
      }
    });
    
    steps.push('Generated minimal circuit: pub.assertEquals(pub)');
    
    await switchBackend('sparky');
    
    try {
      const { verificationKey } = await minimalProgram.compile();
      const vkHash = verificationKey.hash.toString();
      
      steps.push(`Minimal circuit VK hash: ${vkHash}`);
      steps.push('This is the baseline VK hash that Sparky generates');
      steps.push('If all other VKs match this, the bug is in VK generation logic');
      
      return {
        minimalProgram,
        vkHash,
        steps
      };
    } catch (error) {
      steps.push(`Failed to compile minimal circuit: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Progress tracking for VK parity fixes
   */
  trackVKParityProgress(): {
    historicalResults: VKAnalysisResult[];
    progressScore: number;
    trends: string[];
    recommendations: string[];
  } {
    const snarkyResults = this.results.filter(r => r.backend === 'snarky' && r.success);
    const sparkyResults = this.results.filter(r => r.backend === 'sparky' && r.success);
    
    let matches = 0;
    for (let i = 0; i < Math.min(snarkyResults.length, sparkyResults.length); i++) {
      if (snarkyResults[i].vkHash === sparkyResults[i].vkHash) {
        matches++;
      }
    }
    
    const progressScore = matches / Math.max(snarkyResults.length, sparkyResults.length, 1);
    
    const trends: string[] = [];
    const recommendations: string[] = [];
    
    if (progressScore === 0) {
      trends.push('Zero VK parity - fundamental issue in VK generation');
      recommendations.push('Focus on VK generation pipeline in Sparky backend');
      recommendations.push('Compare VK data structures between backends');
    } else if (progressScore < 0.2) {
      trends.push('Very low VK parity - systematic backend differences');
      recommendations.push('Investigate constraint system differences');
      recommendations.push('Check reduce_lincom optimization implementation');
    } else if (progressScore < 0.8) {
      trends.push('Partial VK parity - some programs work correctly');
      recommendations.push('Identify which complexity levels achieve parity');
      recommendations.push('Focus on failing circuit patterns');
    } else {
      trends.push('High VK parity - near completion');
      recommendations.push('Focus on edge cases and complex circuits');
    }
    
    return {
      historicalResults: this.results,
      progressScore,
      trends,
      recommendations
    };
  }

  /**
   * Generate comprehensive debugging report
   */
  async generateVKDebuggingReport(): Promise<string> {
    const report: string[] = [];
    
    report.push('=== VK PARITY DEBUGGING REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Run bug detection
    const bugResult = await this.detectIdenticalHashBug();
    report.push('🔍 IDENTICAL HASH BUG DETECTION:');
    report.push(`  Status: ${bugResult.bugDetected ? '🚨 BUG DETECTED' : '✅ No Bug'}`);
    report.push(`  Analysis: ${bugResult.analysisDetails}`);
    
    if (bugResult.bugDetected) {
      report.push(`  Identical Hash: ${bugResult.identicalHash}`);
      report.push(`  Affected Programs: ${bugResult.affectedPrograms.join(', ')}`);
    }
    report.push('');
    
    // Run comprehensive analysis
    const parityReport = await this.analyzeVKParity();
    report.push('📊 VK PARITY ANALYSIS:');
    report.push(`  Total Programs Tested: ${parityReport.totalPrograms}`);
    report.push(`  Matching VKs: ${parityReport.matchingVKs}/${parityReport.totalPrograms} (${(parityReport.matchingVKs/parityReport.totalPrograms*100).toFixed(1)}%)`);
    report.push(`  Sparky Identical Hash Bug: ${parityReport.sparkyIdenticalHashBug ? '🚨 YES' : '✅ NO'}`);
    report.push(`  VK Diversity Score: ${(parityReport.bugAnalysis.diversityScore * 100).toFixed(1)}%`);
    report.push(`  Suspected Bug Location: ${parityReport.bugAnalysis.suspectedBugLocation}`);
    report.push('');
    
    // Progress tracking
    const progress = this.trackVKParityProgress();
    report.push('📈 PROGRESS TRACKING:');
    report.push(`  Current Progress Score: ${(progress.progressScore * 100).toFixed(1)}%`);
    report.push('  Trends:');
    progress.trends.forEach(trend => report.push(`    - ${trend}`));
    report.push('  Recommendations:');
    progress.recommendations.forEach(rec => report.push(`    - ${rec}`));
    report.push('');
    
    // Circuit minimization
    try {
      const minimal = await this.minimizeCircuitForVKDebugging(null);
      report.push('🔬 CIRCUIT MINIMIZATION:');
      minimal.steps.forEach(step => report.push(`  ${step}`));
      report.push('');
    } catch (error) {
      report.push(`🔬 CIRCUIT MINIMIZATION: Failed - ${(error as Error).message}`);
      report.push('');
    }
    
    return report.join('\n');
  }

  // Helper methods
  
  private storeVKResult(result: VKAnalysisResult): void {
    const key = `${result.backend}-${result.programName}`;
    if (!this.vkHashDatabase.has(key)) {
      this.vkHashDatabase.set(key, []);
    }
    this.vkHashDatabase.get(key)!.push(result);
  }
  
  private estimateCircuitDepth(circuitType: string): number {
    const depthMap: { [key: string]: number } = {
      'Minimal': 1,
      'Simple': 2,
      'LinearCombination': 3,
      'Moderate': 4,
      'Complex': 5,
      'Repetitive': 3,
      'HighDepth': 8,
      'MultiOutput': 4
    };
    
    return depthMap[circuitType] || 1;
  }
  
  private identifyBugLocation(allIdentical: boolean, diversityScore: number): string {
    if (allIdentical) {
      return 'sparky-adapter.js VK generation logic - likely in compile() method';
    } else if (diversityScore < 0.3) {
      return 'Partial VK generation issue - check constraint system processing';
    } else if (diversityScore < 0.7) {
      return 'Constraint optimization differences - check reduce_lincom implementation';
    } else {
      return 'Minor VK differences - likely in specific circuit patterns';
    }
  }
  
  private printParityReport(report: VKParityReport): void {
    console.log('\n=== VK PARITY ANALYSIS RESULTS ===');
    console.log(`Total Programs: ${report.totalPrograms}`);
    console.log(`Matching VKs: ${report.matchingVKs}/${report.totalPrograms} (${(report.matchingVKs/report.totalPrograms*100).toFixed(1)}%)`);
    console.log(`Parity Success: ${report.paritySuccess ? '✅' : '❌'}`);
    console.log(`Sparky Identical Hash Bug: ${report.sparkyIdenticalHashBug ? '🚨 DETECTED' : '✅ Not detected'}`);
    
    if (report.sparkyIdenticalHashBug) {
      console.log(`All Sparky VKs identical: ${report.bugAnalysis.identicalHashValue?.substring(0, 20)}...`);
      console.log(`Suspected location: ${report.bugAnalysis.suspectedBugLocation}`);
    }
    
    console.log(`VK Diversity Score: ${(report.bugAnalysis.diversityScore * 100).toFixed(1)}%`);
    console.log('=======================================\n');
  }
}

// Factory function for easy instantiation
export function createVKParityAnalysis(): VKParityAnalysis {
  return new VKParityAnalysis();
}

// Quick test function for immediate use
export async function quickVKParityTest(): Promise<void> {
  console.log('🚀 Starting Quick VK Parity Test...');
  
  const analysis = createVKParityAnalysis();
  const report = await analysis.generateVKDebuggingReport();
  
  console.log(report);
  console.log('✨ Quick VK Parity Test Complete!');
}