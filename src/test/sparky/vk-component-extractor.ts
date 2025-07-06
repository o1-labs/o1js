/**
 * VK COMPONENT EXTRACTOR
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Deep extraction and analysis of VK components for debugging
 * Features:
 * - Raw VK data parsing
 * - Sigma commitment extraction
 * - Permutation evaluation analysis
 * - Domain setup comparison
 * - Binary diff analysis
 */

import { Field } from '../../index.js';

// =============================================================================
// VK STRUCTURE DEFINITIONS
// =============================================================================

interface SigmaCommitment {
  index: number;
  commitment: string;
  rawData: number[];
}

interface PermutationEvaluation {
  index: number;
  evaluation: string;
  rawData: number[];
}

interface DomainInfo {
  size: number;
  generator: string;
  offset: string;
  rawData: number[];
}

interface DetailedVKComponents {
  hash: string;
  dataLength: number;
  rawData: number[];
  sigmaCommitments: SigmaCommitment[];
  permutationEvaluations: PermutationEvaluation[];
  domainInfo: DomainInfo;
  publicInputCount: number;
  witnessCount: number;
  constraintCount: number;
  binaryFingerprint: string;
}

// =============================================================================
// BINARY PARSING UTILITIES
// =============================================================================

function parseVKBinary(data: string): number[] {
  try {
    const buffer = Buffer.from(data, 'base64');
    return Array.from(buffer);
  } catch (error) {
    console.error('Failed to parse VK binary data:', error);
    return [];
  }
}

function extractBinaryFingerprint(data: number[]): string {
  // Create a simple fingerprint from the binary data
  const chunks = [];
  for (let i = 0; i < data.length; i += 32) {
    const chunk = data.slice(i, i + 32);
    const sum = chunk.reduce((acc, byte) => acc + byte, 0);
    chunks.push(sum.toString(16).padStart(4, '0'));
  }
  return chunks.join('-');
}

// =============================================================================
// SIGMA COMMITMENT EXTRACTION
// =============================================================================

function extractSigmaCommitments(rawData: number[]): SigmaCommitment[] {
  const commitments: SigmaCommitment[] = [];
  
  // Each sigma commitment is typically 32 bytes (256 bits)
  // This is a simplified extraction - real implementation would need
  // to know the exact VK format from kimchi/pickles
  const commitmentSize = 32;
  let offset = 0;
  
  // Skip header (first 64 bytes typically contain metadata)
  offset = 64;
  
  // Extract sigma commitments (typically 7 for most circuits)
  for (let i = 0; i < 7 && offset + commitmentSize <= rawData.length; i++) {
    const commitmentData = rawData.slice(offset, offset + commitmentSize);
    const commitment = commitmentData.map(b => b.toString(16).padStart(2, '0')).join('');
    
    commitments.push({
      index: i,
      commitment,
      rawData: commitmentData,
    });
    
    offset += commitmentSize;
  }
  
  return commitments;
}

// =============================================================================
// PERMUTATION EVALUATION EXTRACTION
// =============================================================================

function extractPermutationEvaluations(rawData: number[]): PermutationEvaluation[] {
  const evaluations: PermutationEvaluation[] = [];
  
  // Permutation evaluations come after sigma commitments
  // Each evaluation is typically 32 bytes
  const evaluationSize = 32;
  let offset = 64 + (7 * 32); // Skip header + sigma commitments
  
  // Extract permutation evaluations (typically 6 for most circuits)
  for (let i = 0; i < 6 && offset + evaluationSize <= rawData.length; i++) {
    const evaluationData = rawData.slice(offset, offset + evaluationSize);
    const evaluation = evaluationData.map(b => b.toString(16).padStart(2, '0')).join('');
    
    evaluations.push({
      index: i,
      evaluation,
      rawData: evaluationData,
    });
    
    offset += evaluationSize;
  }
  
  return evaluations;
}

// =============================================================================
// DOMAIN EXTRACTION
// =============================================================================

function extractDomainInfo(rawData: number[]): DomainInfo {
  // Domain information is typically at the end of the VK
  // This is a simplified extraction
  const domainSize = 32;
  const offset = Math.max(0, rawData.length - (domainSize * 3));
  
  const sizeData = rawData.slice(offset, offset + domainSize);
  const generatorData = rawData.slice(offset + domainSize, offset + domainSize * 2);
  const offsetData = rawData.slice(offset + domainSize * 2, offset + domainSize * 3);
  
  return {
    size: sizeData.reduce((acc, byte) => acc + byte, 0), // Simplified
    generator: generatorData.map(b => b.toString(16).padStart(2, '0')).join(''),
    offset: offsetData.map(b => b.toString(16).padStart(2, '0')).join(''),
    rawData: [...sizeData, ...generatorData, ...offsetData],
  };
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

export function extractDetailedVKComponents(verificationKey: any): DetailedVKComponents {
  const rawData = parseVKBinary(verificationKey.data || '');
  
  const components: DetailedVKComponents = {
    hash: verificationKey.hash?.toString() || 'missing',
    dataLength: verificationKey.data?.length || 0,
    rawData,
    sigmaCommitments: extractSigmaCommitments(rawData),
    permutationEvaluations: extractPermutationEvaluations(rawData),
    domainInfo: extractDomainInfo(rawData),
    publicInputCount: 0, // To be filled from other sources
    witnessCount: 0, // To be filled from other sources
    constraintCount: 0, // To be filled from other sources
    binaryFingerprint: extractBinaryFingerprint(rawData),
  };
  
  return components;
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

export interface VKComponentComparison {
  hashMatch: boolean;
  dataLengthMatch: boolean;
  sigmaCommitmentsMatch: boolean;
  permutationEvaluationsMatch: boolean;
  domainInfoMatch: boolean;
  binaryFingerprintMatch: boolean;
  differences: string[];
}

export function compareVKComponents(
  snarkyComponents: DetailedVKComponents,
  sparkyComponents: DetailedVKComponents
): VKComponentComparison {
  const comparison: VKComponentComparison = {
    hashMatch: snarkyComponents.hash === sparkyComponents.hash,
    dataLengthMatch: snarkyComponents.dataLength === sparkyComponents.dataLength,
    sigmaCommitmentsMatch: true,
    permutationEvaluationsMatch: true,
    domainInfoMatch: true,
    binaryFingerprintMatch: snarkyComponents.binaryFingerprint === sparkyComponents.binaryFingerprint,
    differences: [],
  };
  
  // Compare sigma commitments
  if (snarkyComponents.sigmaCommitments.length !== sparkyComponents.sigmaCommitments.length) {
    comparison.sigmaCommitmentsMatch = false;
    comparison.differences.push(
      `Sigma commitment count: ${snarkyComponents.sigmaCommitments.length} vs ${sparkyComponents.sigmaCommitments.length}`
    );
  } else {
    for (let i = 0; i < snarkyComponents.sigmaCommitments.length; i++) {
      const snarkyCommitment = snarkyComponents.sigmaCommitments[i];
      const sparkyCommitment = sparkyComponents.sigmaCommitments[i];
      
      if (snarkyCommitment.commitment !== sparkyCommitment.commitment) {
        comparison.sigmaCommitmentsMatch = false;
        comparison.differences.push(
          `Sigma commitment ${i}: ${snarkyCommitment.commitment.substring(0, 16)}... vs ${sparkyCommitment.commitment.substring(0, 16)}...`
        );
      }
    }
  }
  
  // Compare permutation evaluations
  if (snarkyComponents.permutationEvaluations.length !== sparkyComponents.permutationEvaluations.length) {
    comparison.permutationEvaluationsMatch = false;
    comparison.differences.push(
      `Permutation evaluation count: ${snarkyComponents.permutationEvaluations.length} vs ${sparkyComponents.permutationEvaluations.length}`
    );
  } else {
    for (let i = 0; i < snarkyComponents.permutationEvaluations.length; i++) {
      const snarkyEvaluation = snarkyComponents.permutationEvaluations[i];
      const sparkyEvaluation = sparkyComponents.permutationEvaluations[i];
      
      if (snarkyEvaluation.evaluation !== sparkyEvaluation.evaluation) {
        comparison.permutationEvaluationsMatch = false;
        comparison.differences.push(
          `Permutation evaluation ${i}: ${snarkyEvaluation.evaluation.substring(0, 16)}... vs ${sparkyEvaluation.evaluation.substring(0, 16)}...`
        );
      }
    }
  }
  
  // Compare domain info
  if (snarkyComponents.domainInfo.size !== sparkyComponents.domainInfo.size) {
    comparison.domainInfoMatch = false;
    comparison.differences.push(
      `Domain size: ${snarkyComponents.domainInfo.size} vs ${sparkyComponents.domainInfo.size}`
    );
  }
  
  if (snarkyComponents.domainInfo.generator !== sparkyComponents.domainInfo.generator) {
    comparison.domainInfoMatch = false;
    comparison.differences.push(
      `Domain generator: ${snarkyComponents.domainInfo.generator.substring(0, 16)}... vs ${sparkyComponents.domainInfo.generator.substring(0, 16)}...`
    );
  }
  
  return comparison;
}

// =============================================================================
// DETAILED REPORTING
// =============================================================================

export function generateVKComponentReport(
  circuitName: string,
  snarkyComponents: DetailedVKComponents,
  sparkyComponents: DetailedVKComponents,
  comparison: VKComponentComparison
): string {
  const report = [];
  
  report.push(`VK COMPONENT ANALYSIS REPORT: ${circuitName}`);
  report.push('=' .repeat(80));
  
  report.push('\n🔍 OVERVIEW:');
  report.push(`  Hash Match: ${comparison.hashMatch ? '✅' : '❌'}`);
  report.push(`  Data Length Match: ${comparison.dataLengthMatch ? '✅' : '❌'}`);
  report.push(`  Sigma Commitments Match: ${comparison.sigmaCommitmentsMatch ? '✅' : '❌'}`);
  report.push(`  Permutation Evaluations Match: ${comparison.permutationEvaluationsMatch ? '✅' : '❌'}`);
  report.push(`  Domain Info Match: ${comparison.domainInfoMatch ? '✅' : '❌'}`);
  report.push(`  Binary Fingerprint Match: ${comparison.binaryFingerprintMatch ? '✅' : '❌'}`);
  
  report.push('\n📊 SNARKY COMPONENTS:');
  report.push(`  Hash: ${snarkyComponents.hash}`);
  report.push(`  Data Length: ${snarkyComponents.dataLength}`);
  report.push(`  Sigma Commitments: ${snarkyComponents.sigmaCommitments.length}`);
  report.push(`  Permutation Evaluations: ${snarkyComponents.permutationEvaluations.length}`);
  report.push(`  Binary Fingerprint: ${snarkyComponents.binaryFingerprint}`);
  
  report.push('\n📊 SPARKY COMPONENTS:');
  report.push(`  Hash: ${sparkyComponents.hash}`);
  report.push(`  Data Length: ${sparkyComponents.dataLength}`);
  report.push(`  Sigma Commitments: ${sparkyComponents.sigmaCommitments.length}`);
  report.push(`  Permutation Evaluations: ${sparkyComponents.permutationEvaluations.length}`);
  report.push(`  Binary Fingerprint: ${sparkyComponents.binaryFingerprint}`);
  
  if (comparison.differences.length > 0) {
    report.push('\n❌ DIFFERENCES:');
    comparison.differences.forEach(diff => {
      report.push(`  - ${diff}`);
    });
  }
  
  report.push('\n🔍 DETAILED SIGMA COMMITMENTS:');
  report.push('Snarky:');
  snarkyComponents.sigmaCommitments.forEach((commitment, i) => {
    report.push(`  ${i}: ${commitment.commitment.substring(0, 32)}...`);
  });
  report.push('Sparky:');
  sparkyComponents.sigmaCommitments.forEach((commitment, i) => {
    report.push(`  ${i}: ${commitment.commitment.substring(0, 32)}...`);
  });
  
  report.push('\n🔍 DETAILED PERMUTATION EVALUATIONS:');
  report.push('Snarky:');
  snarkyComponents.permutationEvaluations.forEach((evaluation, i) => {
    report.push(`  ${i}: ${evaluation.evaluation.substring(0, 32)}...`);
  });
  report.push('Sparky:');
  sparkyComponents.permutationEvaluations.forEach((evaluation, i) => {
    report.push(`  ${i}: ${evaluation.evaluation.substring(0, 32)}...`);
  });
  
  return report.join('\n');
}

// =============================================================================
// HEX DUMP UTILITIES
// =============================================================================

export function generateHexDump(data: number[], label: string): string {
  const lines = [];
  lines.push(`${label} HEX DUMP:`);
  lines.push('-' .repeat(80));
  
  for (let i = 0; i < data.length; i += 16) {
    const chunk = data.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, '0');
    const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = chunk.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
    
    lines.push(`${offset}: ${hex.padEnd(47, ' ')} |${ascii}|`);
  }
  
  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  DetailedVKComponents,
  SigmaCommitment,
  PermutationEvaluation,
  DomainInfo,
};