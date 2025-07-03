/**
 * VK Structure Investigation Test
 * 
 * Deep dive into the actual byte-level structure of VKs to understand
 * why they differ between Snarky and Sparky.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { VKStructureAnalyzer, VKTestPrograms } from './vk-structure-analysis';
import { initializeBindings } from 'o1js';
import * as fs from 'fs';
import * as path from 'path';

describe('VK Structure Investigation', () => {
  let analyzer: VKStructureAnalyzer;
  
  beforeAll(async () => {
    await initializeBindings();
    analyzer = new VKStructureAnalyzer();
  });

  test('analyze VK structure differences', async () => {
    console.log('\n=== VK STRUCTURE INVESTIGATION ===\n');
    
    const analyses = [];
    
    // Analyze each test program
    for (const [name, program] of Object.entries(VKTestPrograms)) {
      console.log(`\nAnalyzing ${name}...`);
      const analysis = await analyzer.analyzeVKStructure(program, name);
      analyses.push(analysis);
      
      // Log immediate findings
      const comparison = analyzer.compareVKStructures(analysis.snarky, analysis.sparky);
      console.log(`\nComparison for ${name}:`);
      console.log(`- VK Hash match: ${comparison.hashMatch ? '✅' : '❌'}`);
      console.log(`- VK Data match: ${comparison.dataMatch ? '✅' : '❌'}`);
      console.log(`- Data length match: ${comparison.lengthMatch ? '✅' : '❌'}`);
      
      if (!comparison.dataMatch && comparison.firstDifferenceOffset !== undefined) {
        console.log(`- First difference at byte ${comparison.firstDifferenceOffset}: ${comparison.differenceDetails}`);
      }
      
      // Log structural patterns
      if (analysis.snarky.structuralElements?.repeatingPatterns) {
        console.log(`\nSnarky repeating patterns: ${analysis.snarky.structuralElements.repeatingPatterns.length}`);
      }
      if (analysis.sparky.structuralElements?.repeatingPatterns) {
        console.log(`Sparky repeating patterns: ${analysis.sparky.structuralElements.repeatingPatterns.length}`);
      }
    }
    
    // Generate report
    const report = analyzer.generateReport(analyses);
    const reportPath = path.join(__dirname, 'vk-structure-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Check for the critical bug
    const sparkyHashes = analyses.map(a => a.sparky.vkHash);
    const uniqueSparkyHashes = new Set(sparkyHashes);
    
    if (uniqueSparkyHashes.size === 1 && analyses.length > 1) {
      console.error('\n🚨 CRITICAL BUG CONFIRMED:');
      console.error('All Sparky VKs have identical hash regardless of circuit!');
      console.error(`Hash: ${sparkyHashes[0]}`);
      
      // Analyze why they're identical
      console.log('\nAnalyzing why Sparky VKs are identical...');
      
      // Check if the data is actually identical
      const sparkyDataSet = new Set(analyses.map(a => a.sparky.vkDataBase64));
      if (sparkyDataSet.size === 1) {
        console.error('- VK data is IDENTICAL across all programs');
        console.error('- This suggests Sparky is not capturing circuit-specific information');
      } else {
        console.log('- VK data differs but hash is the same (hash collision?)');
      }
      
      // Check SHA256 hashes
      const sparkySHA256Set = new Set(analyses.map(a => a.sparky.vkDataSHA256));
      console.log(`- Unique SHA256 hashes: ${sparkySHA256Set.size}`);
      if (sparkySHA256Set.size === 1) {
        console.error('- SHA256 hashes are also identical, confirming data is the same');
      }
    }
    
    // All VKs should be different
    expect(uniqueSparkyHashes.size).toBeGreaterThan(1);
  }, 300000);

  test('trace VK generation process', async () => {
    console.log('\n=== TRACING VK GENERATION ===\n');
    
    // Import bindings to access internal functions
    const { Snarky } = await import('../bindings.js');
    
    // Try to intercept VK generation
    console.log('Attempting to trace VK generation...');
    
    // Test with minimal program
    const program = VKTestPrograms.minimal;
    
    // Switch to Sparky and compile
    await (global as any).switchBackend('sparky');
    
    console.log('Compiling with Sparky...');
    const startTime = performance.now();
    const { verificationKey } = await program.compile();
    const compileTime = performance.now() - startTime;
    
    console.log(`Compilation took ${compileTime.toFixed(2)}ms`);
    console.log(`VK hash: ${verificationKey.hash.toString()}`);
    console.log(`VK data length: ${verificationKey.data.length}`);
    
    // Try to access constraint system
    try {
      const csJson = Snarky.constraintSystem.toJson({});
      console.log('Constraint system captured:');
      console.log(`- Gates: ${(csJson as any).gates?.length || 0}`);
      console.log(`- Public input size: ${(csJson as any).public_input_size || 0}`);
    } catch (e) {
      console.log('Could not capture constraint system:', (e as Error).message);
    }
    
    // Reset to Snarky
    await (global as any).switchBackend('snarky');
  });

  test('examine VK binary format', async () => {
    console.log('\n=== VK BINARY FORMAT EXAMINATION ===\n');
    
    // Get VKs from both backends for the minimal program
    const analysis = await analyzer.analyzeVKStructure(VKTestPrograms.minimal, 'minimal');
    
    // Decode the VK data
    const snarkyBuffer = Buffer.from(analysis.snarky.vkDataBase64, 'base64');
    const sparkyBuffer = Buffer.from(analysis.sparky.vkDataBase64, 'base64');
    
    console.log('VK Binary Structure:');
    console.log(`Snarky VK size: ${snarkyBuffer.length} bytes`);
    console.log(`Sparky VK size: ${sparkyBuffer.length} bytes`);
    
    // Analyze structure in chunks
    const chunkSize = 32; // Field elements are typically 32 bytes
    console.log(`\nAnalyzing in ${chunkSize}-byte chunks (field element size):`);
    
    for (let i = 0; i < Math.min(10, Math.min(snarkyBuffer.length, sparkyBuffer.length) / chunkSize); i++) {
      const offset = i * chunkSize;
      const snarkyChunk = snarkyBuffer.subarray(offset, offset + chunkSize);
      const sparkyChunk = sparkyBuffer.subarray(offset, offset + chunkSize);
      
      const match = snarkyChunk.equals(sparkyChunk);
      console.log(`Chunk ${i} (offset ${offset}): ${match ? '✅ MATCH' : '❌ DIFFER'}`);
      
      if (!match) {
        console.log(`  Snarky: ${snarkyChunk.toString('hex').substring(0, 32)}...`);
        console.log(`  Sparky: ${sparkyChunk.toString('hex').substring(0, 32)}...`);
      }
    }
    
    // Look for specific patterns
    console.log('\nPattern Analysis:');
    
    // Check for all-zero chunks (common in padding)
    let snarkyZeroChunks = 0;
    let sparkyZeroChunks = 0;
    
    for (let i = 0; i < snarkyBuffer.length; i += chunkSize) {
      const chunk = snarkyBuffer.subarray(i, Math.min(i + chunkSize, snarkyBuffer.length));
      if (chunk.every(b => b === 0)) snarkyZeroChunks++;
    }
    
    for (let i = 0; i < sparkyBuffer.length; i += chunkSize) {
      const chunk = sparkyBuffer.subarray(i, Math.min(i + chunkSize, sparkyBuffer.length));
      if (chunk.every(b => b === 0)) sparkyZeroChunks++;
    }
    
    console.log(`Snarky zero chunks: ${snarkyZeroChunks}`);
    console.log(`Sparky zero chunks: ${sparkyZeroChunks}`);
    
    // Check if Sparky VK is a default/dummy VK
    const isDummyVK = sparkyBuffer.subarray(0, 100).every((b, i) => 
      i < 10 ? b === snarkyBuffer[i] : true
    );
    
    if (isDummyVK) {
      console.log('\n⚠️ WARNING: Sparky VK might be using a default/dummy structure');
    }
  });

  test('check VK generation determinism', async () => {
    console.log('\n=== VK GENERATION DETERMINISM TEST ===\n');
    
    // Compile the same program multiple times and check if VKs are consistent
    const program = VKTestPrograms.simple;
    const iterations = 3;
    
    console.log(`Compiling ${program.name} ${iterations} times with each backend...`);
    
    // Test Snarky
    await (global as any).switchBackend('snarky');
    const snarkyVKs = [];
    for (let i = 0; i < iterations; i++) {
      const { verificationKey } = await program.compile();
      snarkyVKs.push(verificationKey.hash.toString());
    }
    
    // Test Sparky
    await (global as any).switchBackend('sparky');
    const sparkyVKs = [];
    for (let i = 0; i < iterations; i++) {
      const { verificationKey } = await program.compile();
      sparkyVKs.push(verificationKey.hash.toString());
    }
    
    // Check consistency
    const snarkyConsistent = new Set(snarkyVKs).size === 1;
    const sparkyConsistent = new Set(sparkyVKs).size === 1;
    
    console.log('\nDeterminism Results:');
    console.log(`Snarky VKs consistent: ${snarkyConsistent ? '✅' : '❌'}`);
    console.log(`  Hashes: ${[...new Set(snarkyVKs)].join(', ')}`);
    console.log(`Sparky VKs consistent: ${sparkyConsistent ? '✅' : '❌'}`);
    console.log(`  Hashes: ${[...new Set(sparkyVKs)].join(', ')}`);
    
    // Both should be deterministic
    expect(snarkyConsistent).toBe(true);
    expect(sparkyConsistent).toBe(true);
    
    // Reset
    await (global as any).switchBackend('snarky');
  });
});