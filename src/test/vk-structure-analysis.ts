/**
 * VK Structure Analysis Tool
 * 
 * Examines the actual structure and content of verification keys
 * to understand why they differ between Snarky and Sparky backends.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from 'o1js';
import * as crypto from 'crypto';

interface VKStructureAnalysis {
  backend: string;
  programName: string;
  vkHash: string;
  vkDataLength: number;
  vkDataBase64: string;
  vkDataHex: string;
  vkDataSHA256: string;
  decodedStructure?: any;
  structuralElements?: {
    header?: string;
    domainSize?: number;
    publicInputSize?: number;
    commitments?: string[];
    evaluations?: string[];
  };
}

export class VKStructureAnalyzer {
  /**
   * Analyze VK structure for a given program
   */
  async analyzeVKStructure(
    program: ReturnType<typeof ZkProgram>,
    programName: string
  ): Promise<{ snarky: VKStructureAnalysis; sparky: VKStructureAnalysis }> {
    // Analyze with Snarky
    await switchBackend('snarky');
    const snarkyAnalysis = await this.captureVKStructure(program, programName, 'snarky');
    
    // Analyze with Sparky
    await switchBackend('sparky');
    const sparkyAnalysis = await this.captureVKStructure(program, programName, 'sparky');
    
    // Reset to Snarky
    await switchBackend('snarky');
    
    return { snarky: snarkyAnalysis, sparky: sparkyAnalysis };
  }

  /**
   * Capture and analyze VK structure
   */
  private async captureVKStructure(
    program: ReturnType<typeof ZkProgram>,
    programName: string,
    backend: string
  ): Promise<VKStructureAnalysis> {
    console.log(`\n[VK Structure] Analyzing ${programName} with ${backend}...`);
    
    const { verificationKey } = await program.compile();
    
    // Basic analysis
    const vkHash = verificationKey.hash.toString();
    const vkDataBase64 = verificationKey.data;
    const vkDataLength = vkDataBase64.length;
    
    // Convert base64 to hex for analysis
    const vkDataBuffer = Buffer.from(vkDataBase64, 'base64');
    const vkDataHex = vkDataBuffer.toString('hex');
    
    // Calculate SHA256 of the raw data
    const vkDataSHA256 = crypto.createHash('sha256').update(vkDataBuffer).digest('hex');
    
    // Try to decode the structure
    const decodedStructure = this.tryDecodeVKStructure(vkDataBuffer);
    const structuralElements = this.extractStructuralElements(vkDataBuffer);
    
    const analysis: VKStructureAnalysis = {
      backend,
      programName,
      vkHash,
      vkDataLength,
      vkDataBase64,
      vkDataHex,
      vkDataSHA256,
      decodedStructure,
      structuralElements
    };
    
    console.log(`[VK Structure] ${backend} VK hash: ${vkHash.substring(0, 20)}...`);
    console.log(`[VK Structure] ${backend} VK data length: ${vkDataLength}`);
    console.log(`[VK Structure] ${backend} VK SHA256: ${vkDataSHA256.substring(0, 20)}...`);
    
    return analysis;
  }

  /**
   * Try to decode VK structure based on known formats
   */
  private tryDecodeVKStructure(buffer: Buffer): any {
    try {
      // VKs are typically serialized with specific structure
      // Try to parse as a structured format
      
      const decoded: any = {
        rawBytes: buffer.length,
        possibleSections: []
      };
      
      // Look for patterns in the data
      // VKs often have:
      // 1. Header with version/format info
      // 2. Domain size and public input size
      // 3. Commitment points (G1/G2 elements)
      // 4. Polynomial evaluations
      
      // Check if it starts with a recognizable pattern
      const first8Bytes = buffer.subarray(0, 8);
      decoded.headerPattern = first8Bytes.toString('hex');
      
      // Try to identify sections by looking for patterns
      // G1 points are typically 64 bytes (2 field elements)
      // G2 points are typically 128 bytes (4 field elements)
      
      let offset = 0;
      const sectionSizes = [8, 32, 64, 128]; // Common section sizes
      
      for (const size of sectionSizes) {
        if (offset + size <= buffer.length) {
          const section = buffer.subarray(offset, offset + size);
          const isAllZeros = section.every(b => b === 0);
          const isHighEntropy = this.calculateEntropy(section) > 0.9;
          
          decoded.possibleSections.push({
            offset,
            size,
            hex: section.toString('hex').substring(0, 32) + '...',
            characteristics: {
              allZeros: isAllZeros,
              highEntropy: isHighEntropy
            }
          });
        }
      }
      
      return decoded;
    } catch (error) {
      console.error('[VK Structure] Decode error:', error);
      return null;
    }
  }

  /**
   * Extract structural elements from VK data
   */
  private extractStructuralElements(buffer: Buffer): any {
    try {
      const elements: any = {};
      
      // VKs typically have a specific layout
      // This is a heuristic approach to identify components
      
      // First 32 bytes often contain metadata
      if (buffer.length >= 32) {
        elements.header = buffer.subarray(0, 32).toString('hex');
      }
      
      // Look for repeating patterns (likely commitment points)
      const patterns = this.findRepeatingPatterns(buffer, 32);
      if (patterns.length > 0) {
        elements.repeatingPatterns = patterns.map(p => ({
          offset: p.offset,
          length: p.length,
          count: p.count,
          sample: p.data.toString('hex').substring(0, 20) + '...'
        }));
      }
      
      // Analyze entropy distribution
      const entropyBlocks = [];
      const blockSize = 64;
      for (let i = 0; i < buffer.length; i += blockSize) {
        const block = buffer.subarray(i, Math.min(i + blockSize, buffer.length));
        entropyBlocks.push({
          offset: i,
          entropy: this.calculateEntropy(block)
        });
      }
      elements.entropyDistribution = entropyBlocks;
      
      // Check for specific field element patterns
      // Field elements in VKs are often 32 bytes
      const fieldElements = [];
      for (let i = 0; i <= buffer.length - 32; i += 32) {
        const element = buffer.subarray(i, i + 32);
        const asHex = element.toString('hex');
        
        // Check if it looks like a field element (not all zeros, not all ones)
        const isValid = !element.every(b => b === 0) && !element.every(b => b === 0xFF);
        if (isValid) {
          fieldElements.push({
            offset: i,
            hex: asHex.substring(0, 16) + '...',
            decimal: this.hexToDecimal(asHex).substring(0, 20) + '...'
          });
        }
      }
      elements.possibleFieldElements = fieldElements.slice(0, 10); // First 10
      
      return elements;
    } catch (error) {
      console.error('[VK Structure] Extract error:', error);
      return null;
    }
  }

  /**
   * Find repeating patterns in buffer
   */
  private findRepeatingPatterns(buffer: Buffer, minLength: number = 8): any[] {
    const patterns = [];
    const seen = new Map<string, { offset: number; count: number }>();
    
    for (let len = minLength; len <= Math.min(128, buffer.length / 2); len *= 2) {
      for (let i = 0; i <= buffer.length - len; i++) {
        const chunk = buffer.subarray(i, i + len);
        const key = chunk.toString('hex');
        
        if (seen.has(key)) {
          seen.get(key)!.count++;
        } else {
          seen.set(key, { offset: i, count: 1 });
        }
      }
    }
    
    // Return patterns that appear more than once
    for (const [key, info] of seen) {
      if (info.count > 1) {
        patterns.push({
          offset: info.offset,
          length: key.length / 2,
          count: info.count,
          data: Buffer.from(key, 'hex')
        });
      }
    }
    
    return patterns.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  /**
   * Calculate entropy of a buffer
   */
  private calculateEntropy(buffer: Buffer): number {
    const freq = new Array(256).fill(0);
    for (const byte of buffer) {
      freq[byte]++;
    }
    
    let entropy = 0;
    const len = buffer.length;
    for (const count of freq) {
      if (count > 0) {
        const p = count / len;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy / 8; // Normalize to 0-1
  }

  /**
   * Convert hex to decimal string
   */
  private hexToDecimal(hex: string): string {
    try {
      return BigInt('0x' + hex).toString();
    } catch {
      return 'invalid';
    }
  }

  /**
   * Compare two VK structures and identify differences
   */
  compareVKStructures(
    analysis1: VKStructureAnalysis,
    analysis2: VKStructureAnalysis
  ): {
    hashMatch: boolean;
    dataMatch: boolean;
    lengthMatch: boolean;
    sha256Match: boolean;
    firstDifferenceOffset?: number;
    differenceDetails?: string;
    structuralDifferences?: string[];
  } {
    const hashMatch = analysis1.vkHash === analysis2.vkHash;
    const dataMatch = analysis1.vkDataBase64 === analysis2.vkDataBase64;
    const lengthMatch = analysis1.vkDataLength === analysis2.vkDataLength;
    const sha256Match = analysis1.vkDataSHA256 === analysis2.vkDataSHA256;
    
    let firstDifferenceOffset: number | undefined;
    let differenceDetails: string | undefined;
    const structuralDifferences: string[] = [];
    
    if (!dataMatch) {
      // Find first byte that differs
      const buffer1 = Buffer.from(analysis1.vkDataBase64, 'base64');
      const buffer2 = Buffer.from(analysis2.vkDataBase64, 'base64');
      
      for (let i = 0; i < Math.min(buffer1.length, buffer2.length); i++) {
        if (buffer1[i] !== buffer2[i]) {
          firstDifferenceOffset = i;
          differenceDetails = `Byte ${i}: ${buffer1[i].toString(16)} vs ${buffer2[i].toString(16)}`;
          break;
        }
      }
      
      if (!firstDifferenceOffset && buffer1.length !== buffer2.length) {
        firstDifferenceOffset = Math.min(buffer1.length, buffer2.length);
        differenceDetails = `Length difference: ${buffer1.length} vs ${buffer2.length}`;
      }
    }
    
    // Compare structural elements
    if (analysis1.structuralElements && analysis2.structuralElements) {
      if (analysis1.structuralElements.header !== analysis2.structuralElements.header) {
        structuralDifferences.push('Different headers');
      }
      
      const patterns1 = analysis1.structuralElements.repeatingPatterns || [];
      const patterns2 = analysis2.structuralElements.repeatingPatterns || [];
      if (patterns1.length !== patterns2.length) {
        structuralDifferences.push(`Different pattern counts: ${patterns1.length} vs ${patterns2.length}`);
      }
    }
    
    return {
      hashMatch,
      dataMatch,
      lengthMatch,
      sha256Match,
      firstDifferenceOffset,
      differenceDetails,
      structuralDifferences: structuralDifferences.length > 0 ? structuralDifferences : undefined
    };
  }

  /**
   * Generate detailed report
   */
  generateReport(analyses: Array<{ snarky: VKStructureAnalysis; sparky: VKStructureAnalysis }>): string {
    let report = '# VK Structure Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary
    report += '## Summary\n\n';
    const allSparkyHashes = analyses.map(a => a.sparky.vkHash);
    const uniqueSparkyHashes = new Set(allSparkyHashes);
    
    if (uniqueSparkyHashes.size === 1 && analyses.length > 1) {
      report += `⚠️ **CRITICAL**: All ${analyses.length} Sparky VKs have identical hash: ${allSparkyHashes[0]}\n\n`;
    }
    
    // Detailed analysis
    report += '## Detailed Structure Analysis\n\n';
    
    for (const { snarky, sparky } of analyses) {
      report += `### ${snarky.programName}\n\n`;
      
      const comparison = this.compareVKStructures(snarky, sparky);
      
      report += '#### Comparison Results\n';
      report += `- Hash match: ${comparison.hashMatch ? '✅' : '❌'}\n`;
      report += `- Data match: ${comparison.dataMatch ? '✅' : '❌'}\n`;
      report += `- Length match: ${comparison.lengthMatch ? '✅' : '❌'} (Snarky: ${snarky.vkDataLength}, Sparky: ${sparky.vkDataLength})\n`;
      report += `- SHA256 match: ${comparison.sha256Match ? '✅' : '❌'}\n`;
      
      if (comparison.firstDifferenceOffset !== undefined) {
        report += `- First difference at offset: ${comparison.firstDifferenceOffset}\n`;
        report += `- Difference: ${comparison.differenceDetails}\n`;
      }
      
      report += '\n#### Snarky VK Structure\n';
      report += `- Hash: ${snarky.vkHash}\n`;
      report += `- SHA256: ${snarky.vkDataSHA256}\n`;
      report += `- First 100 bytes (hex): ${snarky.vkDataHex.substring(0, 200)}...\n`;
      
      report += '\n#### Sparky VK Structure\n';
      report += `- Hash: ${sparky.vkHash}\n`;
      report += `- SHA256: ${sparky.vkDataSHA256}\n`;
      report += `- First 100 bytes (hex): ${sparky.vkDataHex.substring(0, 200)}...\n`;
      
      report += '\n---\n\n';
    }
    
    return report;
  }
}

// Test programs for analysis
export const VKTestPrograms = {
  minimal: ZkProgram({
    name: 'MinimalVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        async method(pub) {
          pub.assertEquals(Field(42));
        }
      }
    }
  }),
  
  simple: ZkProgram({
    name: 'SimpleVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(pub, x) {
          x.mul(x).assertEquals(pub);
        }
      }
    }
  }),
  
  complex: ZkProgram({
    name: 'ComplexVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field],
        async method(pub, a, b, c) {
          a.mul(b).add(b.mul(c)).add(a.mul(c)).assertEquals(pub);
        }
      }
    }
  })
};