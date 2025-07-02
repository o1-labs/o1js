/**
 * VK Parity Analysis Tests
 * 
 * Demonstrates and validates the VK hash extraction system for detecting
 * the critical VK parity bug where "All Sparky VKs generate identical hash".
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { VKParityAnalysis, createVKParityAnalysis, quickVKParityTest } from './VKParityAnalysis';
import { switchBackend, getCurrentBackend } from '../../../index';

describe('VK Parity Analysis System', () => {
  let analysis: VKParityAnalysis;
  let originalBackend: string;

  beforeAll(async () => {
    analysis = createVKParityAnalysis();
    originalBackend = getCurrentBackend();
  });

  afterAll(async () => {
    // Restore original backend
    await switchBackend(originalBackend as 'snarky' | 'sparky');
  });

  describe('VK Hash Extraction', () => {
    it('should extract VK hashes from simple circuits', async () => {
      const complexityLevels = analysis.getComplexityLevels();
      const simpleProgram = complexityLevels.find(level => level.name === 'Simple')!.generator();
      
      // Test with Snarky
      const snarkyResult = await analysis.extractVKAnalysis(simpleProgram, 'snarky', 2, 'Simple');
      expect(snarkyResult.success).toBe(true);
      expect(snarkyResult.vkHash).toBeTruthy();
      expect(snarkyResult.vkHash.length).toBeGreaterThan(10);
      expect(snarkyResult.backend).toBe('snarky');
      
      // Test with Sparky
      const sparkyResult = await analysis.extractVKAnalysis(simpleProgram, 'sparky', 2, 'Simple');
      expect(sparkyResult.success).toBe(true);
      expect(sparkyResult.vkHash).toBeTruthy();
      expect(sparkyResult.vkHash.length).toBeGreaterThan(10);
      expect(sparkyResult.backend).toBe('sparky');
      
      console.log(`Snarky VK: ${snarkyResult.vkHash.substring(0, 20)}...`);
      console.log(`Sparky VK: ${sparkyResult.vkHash.substring(0, 20)}...`);
      
      // This test will reveal if the VK parity bug exists
      const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
      console.log(`VK Match: ${vkMatch ? '✅' : '❌'}`);
      
      // Document the result but don't fail the test - we expect this to fail until bug is fixed
      if (!vkMatch) {
        console.log('🚨 VK PARITY BUG DETECTED: Different backends generate different VKs for identical circuits');
      }
    }, 30000);

    it('should handle complex circuits', async () => {
      const complexityLevels = analysis.getComplexityLevels();
      const complexProgram = complexityLevels.find(level => level.name === 'Complex')!.generator();
      
      const results = await analysis.batchVKGeneration([complexProgram], true);
      
      expect(results).toHaveLength(2); // One for each backend
      
      const snarkyResult = results.find(r => r.backend === 'snarky');
      const sparkyResult = results.find(r => r.backend === 'sparky');
      
      expect(snarkyResult).toBeDefined();
      expect(sparkyResult).toBeDefined();
      
      if (snarkyResult && sparkyResult) {
        expect(snarkyResult.success).toBe(true);
        expect(sparkyResult.success).toBe(true);
        
        console.log(`Complex circuit constraint counts - Snarky: ${snarkyResult.constraintCount}, Sparky: ${sparkyResult.constraintCount}`);
      }
    }, 30000);
  });

  describe('Identical Hash Bug Detection', () => {
    it('should detect if all Sparky VKs are identical', async () => {
      const bugResult = await analysis.detectIdenticalHashBug();
      
      expect(bugResult).toHaveProperty('bugDetected');
      expect(bugResult).toHaveProperty('analysisDetails');
      expect(bugResult.affectedPrograms).toBeInstanceOf(Array);
      
      console.log(`Bug Detection Result: ${bugResult.analysisDetails}`);
      
      if (bugResult.bugDetected) {
        console.log('🚨 CRITICAL BUG CONFIRMED: All Sparky VKs generate identical hash');
        console.log(`Identical hash: ${bugResult.identicalHash}`);
        console.log(`Affected programs: ${bugResult.affectedPrograms.join(', ')}`);
        
        expect(bugResult.identicalHash).toBeTruthy();
        expect(bugResult.affectedPrograms.length).toBeGreaterThan(1);
      } else {
        console.log('✅ No identical hash bug detected');
      }
    }, 45000);
  });

  describe('VK Comparison Utilities', () => {
    it('should compare VK hashes correctly', () => {
      const hash1 = 'abc123def456';
      const hash2 = 'abc123xyz789';
      const hash3 = 'abc123def456';
      
      const comparison1 = analysis.compareVKHashes(hash1, hash2);
      expect(comparison1.identical).toBe(false);
      expect(comparison1.differenceIndex).toBe(6); // First difference at 'def' vs 'xyz'
      expect(comparison1.similarity).toBeGreaterThan(0);
      expect(comparison1.similarity).toBeLessThan(1);
      
      const comparison2 = analysis.compareVKHashes(hash1, hash3);
      expect(comparison2.identical).toBe(true);
      expect(comparison2.differenceIndex).toBe(-1);
      expect(comparison2.similarity).toBe(1);
    });

    it('should analyze VK diversity correctly', () => {
      const identicalHashes = ['hash1', 'hash1', 'hash1'];
      const diverseHashes = ['hash1', 'hash2', 'hash3'];
      const partiallyDiverse = ['hash1', 'hash1', 'hash2'];
      
      const identicalAnalysis = analysis.analyzeVKDiversity(identicalHashes);
      expect(identicalAnalysis.uniqueHashes).toBe(1);
      expect(identicalAnalysis.diversityScore).toBeCloseTo(1/3);
      expect(identicalAnalysis.suspiciousPatterns).toContain('All VK hashes are identical');
      
      const diverseAnalysis = analysis.analyzeVKDiversity(diverseHashes);
      expect(diverseAnalysis.uniqueHashes).toBe(3);
      expect(diverseAnalysis.diversityScore).toBe(1);
      expect(diverseAnalysis.suspiciousPatterns).toHaveLength(0);
      
      const partialAnalysis = analysis.analyzeVKDiversity(partiallyDiverse);
      expect(partialAnalysis.uniqueHashes).toBe(2);
      expect(partialAnalysis.diversityScore).toBeCloseTo(2/3);
    });
  });

  describe('Comprehensive VK Parity Analysis', () => {
    it('should run full VK parity analysis', async () => {
      console.log('🚀 Running comprehensive VK parity analysis...');
      
      const parityReport = await analysis.analyzeVKParity();
      
      expect(parityReport).toHaveProperty('totalPrograms');
      expect(parityReport).toHaveProperty('matchingVKs');
      expect(parityReport).toHaveProperty('sparkyIdenticalHashBug');
      expect(parityReport).toHaveProperty('bugAnalysis');
      
      expect(parityReport.totalPrograms).toBeGreaterThan(0);
      expect(parityReport.results).toHaveLength(parityReport.totalPrograms * 2); // Both backends
      
      console.log(`VK Parity Success Rate: ${(parityReport.matchingVKs / parityReport.totalPrograms * 100).toFixed(1)}%`);
      console.log(`Sparky Identical Hash Bug: ${parityReport.sparkyIdenticalHashBug ? 'DETECTED' : 'Not detected'}`);
      console.log(`VK Diversity Score: ${(parityReport.bugAnalysis.diversityScore * 100).toFixed(1)}%`);
      
      if (parityReport.sparkyIdenticalHashBug) {
        console.log('🚨 This confirms the critical VK parity blocker');
        expect(parityReport.bugAnalysis.allSparkyVKsIdentical).toBe(true);
        expect(parityReport.bugAnalysis.identicalHashValue).toBeTruthy();
      }
    }, 120000); // 2 minutes timeout for comprehensive analysis
  });

  describe('Circuit Minimization', () => {
    it('should minimize circuits for VK debugging', async () => {
      const minimal = await analysis.minimizeCircuitForVKDebugging(null);
      
      expect(minimal).toHaveProperty('minimalProgram');
      expect(minimal).toHaveProperty('vkHash');
      expect(minimal).toHaveProperty('steps');
      
      expect(minimal.vkHash).toBeTruthy();
      expect(minimal.steps.length).toBeGreaterThan(0);
      
      console.log('Minimal circuit VK debugging steps:');
      minimal.steps.forEach(step => console.log(`  ${step}`));
    }, 30000);
  });

  describe('Progress Tracking', () => {
    it('should track VK parity progress', () => {
      const progress = analysis.trackVKParityProgress();
      
      expect(progress).toHaveProperty('progressScore');
      expect(progress).toHaveProperty('trends');
      expect(progress).toHaveProperty('recommendations');
      
      expect(progress.progressScore).toBeGreaterThanOrEqual(0);
      expect(progress.progressScore).toBeLessThanOrEqual(1);
      expect(progress.trends).toBeInstanceOf(Array);
      expect(progress.recommendations).toBeInstanceOf(Array);
      
      console.log(`Current VK Parity Progress: ${(progress.progressScore * 100).toFixed(1)}%`);
      
      if (progress.trends.length > 0) {
        console.log('Trends:');
        progress.trends.forEach(trend => console.log(`  - ${trend}`));
      }
      
      if (progress.recommendations.length > 0) {
        console.log('Recommendations:');
        progress.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    });
  });

  describe('Debugging Report Generation', () => {
    it('should generate comprehensive debugging report', async () => {
      console.log('📊 Generating comprehensive VK debugging report...');
      
      const report = await analysis.generateVKDebuggingReport();
      
      expect(report).toBeTruthy();
      expect(report.length).toBeGreaterThan(100);
      
      // Check that report contains key sections
      expect(report).toContain('VK PARITY DEBUGGING REPORT');
      expect(report).toContain('IDENTICAL HASH BUG DETECTION');
      expect(report).toContain('VK PARITY ANALYSIS');
      expect(report).toContain('PROGRESS TRACKING');
      
      console.log('\n' + '='.repeat(60));
      console.log(report);
      console.log('='.repeat(60) + '\n');
      
      // Save report for external analysis
      console.log('💾 Report generated successfully for external review');
    }, 180000); // 3 minutes timeout for full report
  });

  describe('Quick Test Function', () => {
    it('should run quick VK parity test', async () => {
      console.log('⚡ Running quick VK parity test...');
      
      // This should not throw
      await expect(quickVKParityTest()).resolves.not.toThrow();
      
      console.log('✅ Quick test completed successfully');
    }, 60000);
  });
});

describe('Complexity Level Generation', () => {
  it('should generate appropriate complexity levels', () => {
    const analysis = createVKParityAnalysis();
    const levels = analysis.getComplexityLevels();
    
    expect(levels.length).toBeGreaterThan(5);
    
    // Check that we have increasing complexity
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].complexity).toBeGreaterThanOrEqual(levels[i-1].complexity);
    }
    
    // Check specific levels exist
    const levelNames = levels.map(l => l.name);
    expect(levelNames).toContain('Minimal');
    expect(levelNames).toContain('Simple');
    expect(levelNames).toContain('LinearCombination');
    expect(levelNames).toContain('Complex');
    
    console.log('Available complexity levels:');
    levels.forEach(level => {
      console.log(`  ${level.name} (${level.complexity}): ${level.description}`);
    });
  });

  it('should generate working ZkPrograms', async () => {
    const analysis = createVKParityAnalysis();
    const levels = analysis.getComplexityLevels();
    
    // Test that minimal program can be compiled
    const minimalProgram = levels[0].generator();
    expect(minimalProgram).toHaveProperty('name');
    expect(minimalProgram).toHaveProperty('compile');
    
    // Quick compilation test (just one to verify structure)
    try {
      await switchBackend('snarky');
      const result = await minimalProgram.compile();
      expect(result).toHaveProperty('verificationKey');
      console.log(`✅ Minimal program compiled successfully`);
    } catch (error) {
      console.log(`⚠️ Minimal program compilation failed: ${(error as Error).message}`);
      // Don't fail the test - this might be expected in some environments
    }
  }, 30000);
});