/**
 * Analysis tools for comparing backend performance
 * Provides statistical analysis and visualization of benchmark results
 */

import { BenchmarkComparison, BackendBenchmarkResult } from './backend-benchmark.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

export {
  AnalysisReport,
  CategoryAnalysis,
  StatisticalSummary,
  PerformanceMetrics,
  generateAnalysisReport,
  exportResults,
  createPerformanceMatrix,
  analyzeByCategory,
  detectPerformanceRegressions,
  generateRecommendations,
};

interface PerformanceMetrics {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  percentile95: number;
  coefficientOfVariation: number;
}

interface StatisticalSummary {
  snarky: PerformanceMetrics;
  sparky: PerformanceMetrics;
  speedupMetrics: {
    mean: number;
    median: number;
    best: number;
    worst: number;
    consistency: number; // Lower is more consistent
  };
  significanceAnalysis: {
    significantImprovements: number;
    significantRegressions: number;
    insignificantChanges: number;
    averagePValue: number;
  };
}

interface CategoryAnalysis {
  category: string;
  scenarios: string[];
  summary: StatisticalSummary;
  avgSpeedup: number;
  avgMemoryReduction: number;
  recommendation: string;
}

interface AnalysisReport {
  overallSummary: StatisticalSummary;
  categoryAnalysis: CategoryAnalysis[];
  detailedComparisons: BenchmarkComparison[];
  performanceMatrix: string[][];
  recommendations: string[];
  regressionFlags: string[];
  exportTimestamp: string;
}

function generateAnalysisReport(comparisons: BenchmarkComparison[]): AnalysisReport {
  const categories = categorizeComparisons(comparisons);
  const overallSummary = calculateOverallStatistics(comparisons);
  const categoryAnalysis = categories.map(cat => analyzeByCategory(cat.comparisons, cat.name));
  const performanceMatrix = createPerformanceMatrix(comparisons);
  const recommendations = generateRecommendations(categoryAnalysis, overallSummary);
  const regressionFlags = detectPerformanceRegressions(comparisons);

  return {
    overallSummary,
    categoryAnalysis,
    detailedComparisons: comparisons,
    performanceMatrix,
    recommendations,
    regressionFlags,
    exportTimestamp: new Date().toISOString(),
  };
}

function calculateOverallStatistics(comparisons: BenchmarkComparison[]): StatisticalSummary {
  // Extract timing data
  const snarkyTimes = comparisons.map(c => c.snarky.timings.total);
  const sparkyTimes = comparisons.map(c => c.sparky.timings.total);
  const speedups = comparisons.map(c => c.speedup.total);
  const pValues = comparisons.map(c => c.significance.total);

  return {
    snarky: calculateMetrics(snarkyTimes),
    sparky: calculateMetrics(sparkyTimes),
    speedupMetrics: {
      mean: calculateMean(speedups),
      median: calculateMedian(speedups),
      best: Math.max(...speedups),
      worst: Math.min(...speedups),
      consistency: calculateStandardDeviation(speedups),
    },
    significanceAnalysis: {
      significantImprovements: pValues.filter((p, i) => p < 0.05 && speedups[i] > 0).length,
      significantRegressions: pValues.filter((p, i) => p < 0.05 && speedups[i] < 0).length,
      insignificantChanges: pValues.filter(p => p >= 0.05).length,
      averagePValue: calculateMean(pValues),
    },
  };
}

function calculateMetrics(values: number[]): PerformanceMetrics {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);

  return {
    mean,
    median: calculateMedian(values),
    standardDeviation: stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    percentile95: sorted[Math.floor(sorted.length * 0.95)],
    coefficientOfVariation: stdDev / mean,
  };
}

function categorizeComparisons(comparisons: BenchmarkComparison[]): Array<{name: string, comparisons: BenchmarkComparison[]}> {
  const categories: {[key: string]: BenchmarkComparison[]} = {
    'Microbenchmarks': [],
    'Smart Contracts': [],
    'Cryptographic Operations': [],
    'Memory Intensive': [],
    'Large Circuits': [],
  };

  for (const comparison of comparisons) {
    const scenario = comparison.scenario.toLowerCase();
    
    if (scenario.includes('field') || scenario.includes('hash') || scenario.includes('proof generation')) {
      categories['Microbenchmarks'].push(comparison);
    } else if (scenario.includes('contract') || scenario.includes('token')) {
      categories['Smart Contracts'].push(comparison);
    } else if (scenario.includes('hash') || scenario.includes('merkle') || scenario.includes('crypto')) {
      categories['Cryptographic Operations'].push(comparison);
    } else if (scenario.includes('memory') || scenario.includes('concurrent') || scenario.includes('leak')) {
      categories['Memory Intensive'].push(comparison);
    } else if (scenario.includes('large') || scenario.includes('recursive') || scenario.includes('complex')) {
      categories['Large Circuits'].push(comparison);
    } else {
      categories['Microbenchmarks'].push(comparison); // Default category
    }
  }

  return Object.entries(categories)
    .filter(([_, comps]) => comps.length > 0)
    .map(([name, comps]) => ({name, comparisons: comps}));
}

function analyzeByCategory(comparisons: BenchmarkComparison[], categoryName: string): CategoryAnalysis {
  const scenarios = comparisons.map(c => c.scenario);
  const summary = calculateOverallStatistics(comparisons);
  const avgSpeedup = calculateMean(comparisons.map(c => c.speedup.total));
  const avgMemoryReduction = calculateMean(comparisons.map(c => c.memoryReduction));
  
  let recommendation = generateCategoryRecommendation(categoryName, avgSpeedup, avgMemoryReduction, summary);

  return {
    category: categoryName,
    scenarios,
    summary,
    avgSpeedup,
    avgMemoryReduction,
    recommendation,
  };
}

function generateCategoryRecommendation(
  category: string, 
  avgSpeedup: number, 
  avgMemoryReduction: number, 
  summary: StatisticalSummary
): string {
  const speedupThreshold = 10; // 10% improvement threshold
  const consistencyThreshold = 20; // CV threshold for consistency

  if (avgSpeedup > speedupThreshold && summary.speedupMetrics.consistency < consistencyThreshold) {
    return `Strong performance improvement with consistent gains. Sparky shows excellent performance in ${category}.`;
  } else if (avgSpeedup > speedupThreshold) {
    return `Good performance improvement but with some variability. Consider optimizing for consistency in ${category}.`;
  } else if (avgSpeedup > 0 && avgMemoryReduction > 5) {
    return `Moderate performance gains with good memory efficiency. Sparky provides solid improvements in ${category}.`;
  } else if (avgSpeedup < -5) {
    return `Performance regression detected in ${category}. Investigate potential optimizations for Sparky.`;
  } else {
    return `Minimal performance difference in ${category}. Consider if migration benefits outweigh costs.`;
  }
}

function createPerformanceMatrix(comparisons: BenchmarkComparison[]): string[][] {
  const headers = ['Scenario', 'Snarky (ms)', 'Sparky (ms)', 'Speedup (%)', 'Memory (MB)', 'Significance'];
  const rows = [headers];

  for (const comparison of comparisons) {
    const row = [
      comparison.scenario,
      comparison.snarky.timings.total.toFixed(2),
      comparison.sparky.timings.total.toFixed(2),
      comparison.speedup.total > 0 ? `+${comparison.speedup.total.toFixed(1)}%` : `${comparison.speedup.total.toFixed(1)}%`,
      `${comparison.sparky.memory.peakMB.toFixed(1)} (${comparison.memoryReduction > 0 ? '-' : '+'}${Math.abs(comparison.memoryReduction).toFixed(1)}%)`,
      comparison.significance.total < 0.05 ? '✓' : '~',
    ];
    rows.push(row);
  }

  return rows;
}

function detectPerformanceRegressions(comparisons: BenchmarkComparison[]): string[] {
  const regressions: string[] = [];
  const regressionThreshold = -5; // 5% performance loss threshold

  for (const comparison of comparisons) {
    if (comparison.speedup.total < regressionThreshold && comparison.significance.total < 0.05) {
      regressions.push(
        `REGRESSION: ${comparison.scenario} shows ${Math.abs(comparison.speedup.total).toFixed(1)}% performance loss`
      );
    }
    
    if (comparison.memoryReduction < -20) { // 20% memory increase
      regressions.push(
        `MEMORY REGRESSION: ${comparison.scenario} shows ${Math.abs(comparison.memoryReduction).toFixed(1)}% memory increase`
      );
    }
  }

  return regressions;
}

function generateRecommendations(
  categoryAnalysis: CategoryAnalysis[], 
  overallSummary: StatisticalSummary
): string[] {
  const recommendations: string[] = [];

  // Overall performance assessment
  if (overallSummary.speedupMetrics.mean > 15) {
    recommendations.push('Strong overall performance improvement detected. Sparky migration is highly recommended.');
  } else if (overallSummary.speedupMetrics.mean > 5) {
    recommendations.push('Moderate performance improvement detected. Sparky migration is recommended for performance-critical applications.');
  } else if (overallSummary.speedupMetrics.mean < -5) {
    recommendations.push('Performance regression detected. Investigate Sparky optimization opportunities before migration.');
  }

  // Consistency analysis
  if (overallSummary.speedupMetrics.consistency > 30) {
    recommendations.push('High performance variability detected. Consider workload-specific optimization strategies.');
  }

  // Category-specific recommendations
  const bestCategory = categoryAnalysis.reduce((best, cat) => 
    cat.avgSpeedup > best.avgSpeedup ? cat : best
  );
  
  if (bestCategory.avgSpeedup > 20) {
    recommendations.push(`Exceptional performance in ${bestCategory.category}. Prioritize migration for these workloads.`);
  }

  const worstCategory = categoryAnalysis.reduce((worst, cat) => 
    cat.avgSpeedup < worst.avgSpeedup ? cat : worst
  );
  
  if (worstCategory.avgSpeedup < -5) {
    recommendations.push(`Performance concerns in ${worstCategory.category}. Consider optimization or delayed migration.`);
  }

  // Memory recommendations
  const avgMemoryReduction = calculateMean(categoryAnalysis.map(cat => cat.avgMemoryReduction));
  if (avgMemoryReduction > 15) {
    recommendations.push('Significant memory efficiency improvements detected. Sparky recommended for memory-constrained environments.');
  }

  // Statistical significance
  const significantResults = overallSummary.significanceAnalysis.significantImprovements;
  const totalResults = categoryAnalysis.reduce((sum, cat) => sum + cat.scenarios.length, 0);
  
  if (significantResults / totalResults > 0.7) {
    recommendations.push('High statistical confidence in performance improvements. Results are reliable for decision-making.');
  } else if (significantResults / totalResults < 0.3) {
    recommendations.push('Low statistical confidence in results. Consider running additional benchmarks with larger sample sizes.');
  }

  return recommendations;
}

function exportResults(report: AnalysisReport, outputPath: string = './benchmark-results'): void {
  // Export JSON report
  const jsonPath = join(outputPath, `analysis-report-${Date.now()}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Export CSV matrix
  const csvPath = join(outputPath, `performance-matrix-${Date.now()}.csv`);
  const csvContent = report.performanceMatrix.map(row => row.join(',')).join('\n');
  writeFileSync(csvPath, csvContent);

  // Export markdown summary
  const mdPath = join(outputPath, `benchmark-summary-${Date.now()}.md`);
  const mdContent = generateMarkdownReport(report);
  writeFileSync(mdPath, mdContent);

  console.log(`Results exported to:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  CSV: ${csvPath}`);
  console.log(`  Markdown: ${mdPath}`);
}

function generateMarkdownReport(report: AnalysisReport): string {
  let md = '# o1js Backend Performance Analysis\n\n';
  md += `Report generated: ${new Date(report.exportTimestamp).toLocaleString()}\n\n`;

  // Executive Summary
  md += '## Executive Summary\n\n';
  const overall = report.overallSummary;
  md += `- **Average Performance Improvement**: ${overall.speedupMetrics.mean.toFixed(1)}%\n`;
  md += `- **Best Case Improvement**: ${overall.speedupMetrics.best.toFixed(1)}%\n`;
  md += `- **Worst Case**: ${overall.speedupMetrics.worst.toFixed(1)}%\n`;
  md += `- **Statistically Significant Improvements**: ${overall.significanceAnalysis.significantImprovements}\n`;
  md += `- **Performance Regressions**: ${overall.significanceAnalysis.significantRegressions}\n\n`;

  // Category Analysis
  md += '## Category Analysis\n\n';
  for (const category of report.categoryAnalysis) {
    md += `### ${category.category}\n\n`;
    md += `- **Average Speedup**: ${category.avgSpeedup.toFixed(1)}%\n`;
    md += `- **Memory Reduction**: ${category.avgMemoryReduction.toFixed(1)}%\n`;
    md += `- **Scenarios Tested**: ${category.scenarios.length}\n`;
    md += `- **Recommendation**: ${category.recommendation}\n\n`;
  }

  // Performance Matrix
  md += '## Detailed Results\n\n';
  md += '| Scenario | Snarky (ms) | Sparky (ms) | Speedup | Memory | Significant |\n';
  md += '|----------|-------------|-------------|---------|--------|-------------|\n';
  
  for (let i = 1; i < report.performanceMatrix.length; i++) {
    const row = report.performanceMatrix[i];
    md += `| ${row.join(' | ')} |\n`;
  }
  md += '\n';

  // Recommendations
  if (report.recommendations.length > 0) {
    md += '## Recommendations\n\n';
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
    md += '\n';
  }

  // Regression Flags
  if (report.regressionFlags.length > 0) {
    md += '## Performance Concerns\n\n';
    for (const flag of report.regressionFlags) {
      md += `⚠️ ${flag}\n\n`;
    }
  }

  return md;
}

// Utility functions
function calculateMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function calculateStandardDeviation(values: number[]): number {
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
}