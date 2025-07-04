#!/usr/bin/env node

/**
 * DETAILED PERFORMANCE PROFILER
 * 
 * This script provides detailed performance measurement capabilities for comparing
 * Sparky vs Snarky at the constraint system level. It's designed to be ruthless
 * in finding performance bottlenecks and differences.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, ZkProgram, Poseidon } from './dist/node/index.js';
import { performance, PerformanceObserver } from 'perf_hooks';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';

// ========== System Performance Monitoring ==========

class SystemMonitor {
  constructor() {
    this.measurements = [];
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCPU = process.cpuUsage();
  }
  
  snapshot(label) {
    const now = performance.now();
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage(this.startCPU);
    
    this.measurements.push({
      label,
      timestamp: now,
      elapsedMs: now - this.startTime,
      memory: {
        heapUsedMB: memory.heapUsed / 1024 / 1024,
        heapTotalMB: memory.heapTotal / 1024 / 1024,
        externalMB: memory.external / 1024 / 1024,
        rssUsedMB: memory.rss / 1024 / 1024,
        deltaMB: (memory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024
      },
      cpu: {
        userMs: cpu.user / 1000,
        systemMs: cpu.system / 1000,
        totalMs: (cpu.user + cpu.system) / 1000
      },
      system: {
        loadAverage: os.loadavg(),
        freeMemoryGB: os.freemem() / 1024 / 1024 / 1024,
        totalMemoryGB: os.totalmem() / 1024 / 1024 / 1024
      }
    });
    
    return this.measurements[this.measurements.length - 1];
  }
  
  getReport() {
    if (this.measurements.length === 0) return null;
    
    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    
    return {
      totalElapsedMs: last.elapsedMs,
      peakMemoryMB: Math.max(...this.measurements.map(m => m.memory.heapUsedMB)),
      totalCpuMs: last.cpu.totalMs,
      averageLoadDuringTest: this.measurements.reduce((sum, m) => sum + m.system.loadAverage[0], 0) / this.measurements.length,
      measurements: this.measurements
    };
  }
}

// ========== Constraint System Analysis ==========

class ConstraintAnalyzer {
  constructor() {
    this.constraintSnapshots = [];
  }
  
  async analyzeConstraintGeneration(program, programName, backend) {
    console.log(`\n🔍 ANALYZING CONSTRAINT GENERATION: ${programName} (${backend})`);
    
    const monitor = new SystemMonitor();
    monitor.snapshot('start');
    
    try {
      // Hook into constraint system generation
      let constraintCount = 0;
      let gateTypes = new Map();
      
      // Try to get constraint information during compilation
      monitor.snapshot('before_compile');
      
      const compileStart = performance.now();
      const { verificationKey } = await program.compile();
      const compileEnd = performance.now();
      
      monitor.snapshot('after_compile');
      
      // Try to extract constraint information
      try {
        constraintCount = await this.getConstraintCount(program, backend);
        gateTypes = await this.getGateTypeDistribution(program, backend);
      } catch (e) {
        console.log(`⚠️ Could not get detailed constraint info: ${e.message}`);
      }
      
      const result = {
        programName,
        backend,
        success: true,
        constraintCount,
        gateTypes: Object.fromEntries(gateTypes),
        compilationTimeMs: compileEnd - compileStart,
        vkSize: this.getVKSize(verificationKey),
        systemReport: monitor.getReport()
      };
      
      console.log(`✅ Analysis complete:`);
      console.log(`   📊 Constraints: ${constraintCount}`);
      console.log(`   ⏱️ Compile time: ${result.compilationTimeMs.toFixed(2)}ms`);
      console.log(`   💾 Peak memory: ${result.systemReport.peakMemoryMB.toFixed(2)}MB`);
      console.log(`   🧠 CPU time: ${result.systemReport.totalCpuMs.toFixed(2)}ms`);
      
      return result;
      
    } catch (error) {
      console.log(`💥 Analysis failed: ${error.message}`);
      return {
        programName,
        backend,
        success: false,
        error: error.message,
        systemReport: monitor.getReport()
      };
    }
  }
  
  async getConstraintCount(program, backend) {
    // This is a simplified version - actual implementation would need deeper access
    if (backend === 'sparky') {
      // Try to access Sparky's constraint system
      try {
        // This would need access to the internal WASM state
        return -1; // Not implemented yet
      } catch (e) {
        return -1;
      }
    } else {
      // Try to access Snarky's constraint system
      try {
        // This would need access to the OCaml constraint system
        return -1; // Not implemented yet
      } catch (e) {
        return -1;
      }
    }
  }
  
  async getGateTypeDistribution(program, backend) {
    // Placeholder for gate type analysis
    const distribution = new Map();
    distribution.set('Generic', 0);
    distribution.set('Poseidon', 0);
    distribution.set('EcAdd', 0);
    distribution.set('EcScale', 0);
    return distribution;
  }
  
  getVKSize(verificationKey) {
    try {
      const vkString = JSON.stringify(verificationKey);
      return {
        jsonBytes: vkString.length,
        estimatedSerializedBytes: vkString.length * 0.75 // Rough estimate
      };
    } catch (e) {
      return { jsonBytes: -1, estimatedSerializedBytes: -1 };
    }
  }
}

// ========== Stress Test Circuits ==========

// Simple but scalable circuits for precise measurement
const createScalableArithmeticProgram = (operationCount) => {
  return ZkProgram({
    name: `ScalableArithmetic${operationCount}`,
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      heavyArithmetic: {
        privateInputs: [Field, Field],
        async method(input, multiplier, addend) {
          let result = input;
          
          // Controlled number of operations for precise measurement
          for (let i = 0; i < operationCount; i++) {
            result = result.mul(multiplier.add(Field(i)));
            result = result.add(addend.mul(Field(i + 1)));
            
            // Add some complexity every 10 operations
            if (i % 10 === 0) {
              const temp = result.mul(result); // Square
              result = result.add(temp.div(Field(i + 1)));
            }
          }
          
          return result;
        }
      }
    }
  });
};

const createScalableHashProgram = (hashCount) => {
  return ZkProgram({
    name: `ScalableHash${hashCount}`,
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      heavyHashing: {
        privateInputs: [Field],
        async method(input, salt) {
          let current = input;
          
          // Controlled number of hash operations
          for (let i = 0; i < hashCount; i++) {
            current = Poseidon.hash([current, salt, Field(i)]);
          }
          
          return current;
        }
      }
    }
  });
};

// ========== Detailed Performance Runner ==========

class DetailedPerformanceRunner {
  constructor() {
    this.analyzer = new ConstraintAnalyzer();
    this.results = [];
  }
  
  async runScalabilityAnalysis() {
    console.log('\n🔬 DETAILED SCALABILITY ANALYSIS');
    console.log('='.repeat(60));
    
    // Test arithmetic scaling
    const arithmeticSizes = [10, 25, 50, 100, 200];
    for (const size of arithmeticSizes) {
      const program = createScalableArithmeticProgram(size);
      
      // Test Snarky
      await switchBackend('snarky');
      const snarkyResult = await this.analyzer.analyzeConstraintGeneration(
        program, `Arithmetic${size}`, 'snarky'
      );
      this.results.push(snarkyResult);
      
      // Test Sparky
      await switchBackend('sparky');
      const sparkyResult = await this.analyzer.analyzeConstraintGeneration(
        program, `Arithmetic${size}`, 'sparky'
      );
      this.results.push(sparkyResult);
      
      // Analysis
      if (snarkyResult.success && sparkyResult.success) {
        const timeRatio = sparkyResult.compilationTimeMs / snarkyResult.compilationTimeMs;
        const memoryRatio = sparkyResult.systemReport.peakMemoryMB / snarkyResult.systemReport.peakMemoryMB;
        
        console.log(`\n📊 ARITHMETIC OPERATIONS: ${size}`);
        console.log(`   ⏱️ Time ratio (Sparky/Snarky): ${timeRatio.toFixed(2)}x`);
        console.log(`   💾 Memory ratio (Sparky/Snarky): ${memoryRatio.toFixed(2)}x`);
        
        if (timeRatio > 3.0) {
          console.log(`   🔥 CRITICAL: Sparky is ${timeRatio.toFixed(1)}x slower!`);
        }
      }
    }
    
    // Test hash scaling
    const hashSizes = [5, 10, 20, 50];
    for (const size of hashSizes) {
      const program = createScalableHashProgram(size);
      
      // Test Snarky
      await switchBackend('snarky');
      const snarkyResult = await this.analyzer.analyzeConstraintGeneration(
        program, `Hash${size}`, 'snarky'
      );
      this.results.push(snarkyResult);
      
      // Test Sparky
      await switchBackend('sparky');
      const sparkyResult = await this.analyzer.analyzeConstraintGeneration(
        program, `Hash${size}`, 'sparky'
      );
      this.results.push(sparkyResult);
      
      // Analysis
      if (snarkyResult.success && sparkyResult.success) {
        const timeRatio = sparkyResult.compilationTimeMs / snarkyResult.compilationTimeMs;
        
        console.log(`\n🔒 HASH OPERATIONS: ${size}`);
        console.log(`   ⏱️ Time ratio (Sparky/Snarky): ${timeRatio.toFixed(2)}x`);
        
        if (timeRatio > 2.0) {
          console.log(`   ⚠️ WARNING: Sparky hash performance ${timeRatio.toFixed(1)}x slower`);
        }
      }
    }
  }
  
  async runMemoryStressTest() {
    console.log('\n🧠 MEMORY STRESS TEST');
    console.log('='.repeat(40));
    
    // Create a memory-intensive circuit
    const MemoryStressProgram = ZkProgram({
      name: 'MemoryStress',
      publicInput: Field,
      publicOutput: Field,
      
      methods: {
        memoryIntensive: {
          privateInputs: [Field, Field, Field],
          async method(input, a, b, c) {
            // Create many variables to stress memory allocation
            const variables = [];
            let current = input;
            
            for (let i = 0; i < 500; i++) {
              const temp1 = current.mul(a.add(Field(i)));
              const temp2 = temp1.add(b.mul(Field(i)));
              const temp3 = temp2.mul(c.sub(Field(i)));
              const temp4 = temp3.add(current);
              variables.push(temp1, temp2, temp3, temp4);
              current = temp4;
            }
            
            // Force interaction between many variables
            let result = Field(0);
            for (let i = 0; i < Math.min(100, variables.length); i += 4) {
              result = result.add(variables[i].mul(variables[i + 1]));
            }
            
            return result;
          }
        }
      }
    });
    
    // Test memory usage on both backends
    for (const backend of ['snarky', 'sparky']) {
      await switchBackend(backend);
      
      console.log(`\n💾 Testing ${backend.toUpperCase()} memory usage...`);
      
      const monitor = new SystemMonitor();
      monitor.snapshot('start');
      
      try {
        const result = await this.analyzer.analyzeConstraintGeneration(
          MemoryStressProgram, 'MemoryStress', backend
        );
        
        console.log(`   Peak memory: ${result.systemReport.peakMemoryMB.toFixed(2)}MB`);
        console.log(`   Memory delta: ${result.systemReport.measurements[result.systemReport.measurements.length - 1].memory.deltaMB.toFixed(2)}MB`);
        
        this.results.push(result);
        
      } catch (error) {
        console.log(`   💥 Failed: ${error.message}`);
      }
    }
  }
  
  generateDetailedReport() {
    console.log('\n📋 DETAILED PERFORMANCE REPORT');
    console.log('='.repeat(60));
    
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemoryGB: os.totalmem() / 1024 / 1024 / 1024,
        nodeVersion: process.version
      },
      testResults: this.results,
      analysis: this.analyzePerformancePatterns(),
      recommendations: this.generateOptimizationRecommendations()
    };
    
    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `detailed-performance-report-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`💾 Detailed report saved to: ${filename}`);
    
    this.printPerformancePatterns();
    this.printOptimizationRecommendations();
    
    return report;
  }
  
  analyzePerformancePatterns() {
    const patterns = {
      timeComplexity: this.analyzeTimeComplexity(),
      memoryComplexity: this.analyzeMemoryComplexity(),
      performanceRegressions: this.identifyPerformanceRegressions(),
      optimizationOpportunities: this.identifyOptimizationOpportunities()
    };
    
    return patterns;
  }
  
  analyzeTimeComplexity() {
    // Group results by program type and analyze scaling
    const arithmeticResults = this.results.filter(r => r.programName.includes('Arithmetic'));
    const hashResults = this.results.filter(r => r.programName.includes('Hash'));
    
    const analysis = {
      arithmetic: this.analyzeScaling(arithmeticResults),
      hashing: this.analyzeScaling(hashResults)
    };
    
    return analysis;
  }
  
  analyzeScaling(results) {
    const snarkyResults = results.filter(r => r.backend === 'snarky' && r.success);
    const sparkyResults = results.filter(r => r.backend === 'sparky' && r.success);
    
    if (snarkyResults.length < 2 || sparkyResults.length < 2) {
      return { scaling: 'insufficient_data' };
    }
    
    // Simple linear regression to estimate scaling
    const snarkyScaling = this.estimateScaling(snarkyResults);
    const sparkyScaling = this.estimateScaling(sparkyResults);
    
    return {
      snarky: snarkyScaling,
      sparky: sparkyScaling,
      comparison: {
        sparkyOverhead: sparkyScaling.intercept - snarkyScaling.intercept,
        sparkyScalingRatio: sparkyScaling.slope / snarkyScaling.slope
      }
    };
  }
  
  estimateScaling(results) {
    // Extract operation count from program name and time
    const dataPoints = results.map(r => {
      const match = r.programName.match(/(\d+)$/);
      const operationCount = match ? parseInt(match[1]) : 0;
      return { x: operationCount, y: r.compilationTimeMs };
    }).filter(p => p.x > 0);
    
    if (dataPoints.length < 2) return { slope: 0, intercept: 0, correlation: 0 };
    
    // Simple linear regression: y = mx + b
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept, dataPoints };
  }
  
  analyzeMemoryComplexity() {
    // Similar analysis for memory usage patterns
    return { analysis: 'memory_complexity_analysis_placeholder' };
  }
  
  identifyPerformanceRegressions() {
    const regressions = [];
    
    // Look for cases where Sparky is significantly slower
    const programTypes = [...new Set(this.results.map(r => r.programName.replace(/\d+$/, '')))];
    
    for (const programType of programTypes) {
      const snarkyResults = this.results.filter(r => 
        r.programName.startsWith(programType) && r.backend === 'snarky' && r.success
      );
      const sparkyResults = this.results.filter(r => 
        r.programName.startsWith(programType) && r.backend === 'sparky' && r.success
      );
      
      if (snarkyResults.length > 0 && sparkyResults.length > 0) {
        const avgSnarkyTime = snarkyResults.reduce((sum, r) => sum + r.compilationTimeMs, 0) / snarkyResults.length;
        const avgSparkyTime = sparkyResults.reduce((sum, r) => sum + r.compilationTimeMs, 0) / sparkyResults.length;
        
        const ratio = avgSparkyTime / avgSnarkyTime;
        
        if (ratio > 2.0) {
          regressions.push({
            programType,
            timeRatio: ratio,
            severity: ratio > 5.0 ? 'critical' : ratio > 3.0 ? 'high' : 'medium',
            avgSnarkyTime,
            avgSparkyTime
          });
        }
      }
    }
    
    return regressions;
  }
  
  identifyOptimizationOpportunities() {
    const opportunities = [];
    
    // Look for patterns that suggest optimization opportunities
    const sparkyResults = this.results.filter(r => r.backend === 'sparky' && r.success);
    
    for (const result of sparkyResults) {
      if (result.systemReport) {
        const cpuEfficiency = result.compilationTimeMs / result.systemReport.totalCpuMs;
        
        if (cpuEfficiency < 0.5) {
          opportunities.push({
            type: 'cpu_utilization',
            program: result.programName,
            description: 'Low CPU utilization suggests I/O or synchronization bottlenecks',
            efficiency: cpuEfficiency
          });
        }
        
        const memoryEfficiency = result.systemReport.peakMemoryMB / result.compilationTimeMs;
        
        if (memoryEfficiency > 0.1) { // More than 0.1MB per ms suggests memory inefficiency
          opportunities.push({
            type: 'memory_efficiency',
            program: result.programName,
            description: 'High memory usage relative to time suggests memory allocation inefficiencies',
            ratio: memoryEfficiency
          });
        }
      }
    }
    
    return opportunities;
  }
  
  generateOptimizationRecommendations() {
    const analysis = this.analyzePerformancePatterns();
    const recommendations = [];
    
    // Time complexity recommendations
    if (analysis.timeComplexity.arithmetic?.comparison?.sparkyScalingRatio > 1.5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Time Complexity',
        title: 'Optimize arithmetic operation scaling',
        description: `Sparky's arithmetic operations scale ${analysis.timeComplexity.arithmetic.comparison.sparkyScalingRatio.toFixed(1)}x worse than Snarky`,
        suggestedActions: [
          'Profile WASM constraint generation for arithmetic operations',
          'Implement constraint batching for multiplication chains',
          'Optimize field arithmetic in WASM layer'
        ]
      });
    }
    
    // Performance regression recommendations
    if (analysis.performanceRegressions.length > 0) {
      const criticalRegressions = analysis.performanceRegressions.filter(r => r.severity === 'critical');
      
      if (criticalRegressions.length > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'Performance Regression',
          title: 'Address critical performance regressions',
          description: `${criticalRegressions.length} circuit types show >5x performance degradation`,
          suggestedActions: [
            'Profile critical regression cases with detailed timing',
            'Identify bottlenecks in WASM constraint generation',
            'Consider optimized constraint generation paths for common patterns'
          ]
        });
      }
    }
    
    // Memory optimization recommendations
    const memoryOpportunities = analysis.optimizationOpportunities.filter(o => o.type === 'memory_efficiency');
    if (memoryOpportunities.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Memory Optimization',
        title: 'Optimize memory allocation patterns',
        description: `${memoryOpportunities.length} test cases show inefficient memory usage`,
        suggestedActions: [
          'Implement memory pooling for constraint objects',
          'Optimize WASM heap allocation patterns',
          'Consider constraint streaming for large circuits'
        ]
      });
    }
    
    return recommendations;
  }
  
  printPerformancePatterns() {
    const analysis = this.analyzePerformancePatterns();
    
    console.log('\n🔍 PERFORMANCE PATTERN ANALYSIS');
    console.log('-'.repeat(50));
    
    if (analysis.performanceRegressions.length > 0) {
      console.log('\n⚠️ PERFORMANCE REGRESSIONS DETECTED:');
      analysis.performanceRegressions.forEach(reg => {
        const severity = reg.severity === 'critical' ? '🔥' : reg.severity === 'high' ? '⚠️' : '📊';
        console.log(`  ${severity} ${reg.programType}: ${reg.timeRatio.toFixed(1)}x slower (${reg.avgSparkyTime.toFixed(0)}ms vs ${reg.avgSnarkyTime.toFixed(0)}ms)`);
      });
    } else {
      console.log('\n✅ No significant performance regressions detected');
    }
    
    if (analysis.optimizationOpportunities.length > 0) {
      console.log('\n💡 OPTIMIZATION OPPORTUNITIES:');
      analysis.optimizationOpportunities.forEach(opp => {
        console.log(`  🎯 ${opp.program}: ${opp.description}`);
      });
    }
  }
  
  printOptimizationRecommendations() {
    const recommendations = this.generateOptimizationRecommendations();
    
    console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    if (recommendations.length === 0) {
      console.log('✅ No specific optimization recommendations - performance is acceptable');
      return;
    }
    
    const critical = recommendations.filter(r => r.priority === 'CRITICAL');
    const high = recommendations.filter(r => r.priority === 'HIGH');
    const medium = recommendations.filter(r => r.priority === 'MEDIUM');
    
    if (critical.length > 0) {
      console.log('\n🔥 CRITICAL PRIORITY:');
      critical.forEach(rec => {
        console.log(`  💥 ${rec.title}`);
        console.log(`     ${rec.description}`);
        rec.suggestedActions.forEach(action => {
          console.log(`     • ${action}`);
        });
      });
    }
    
    if (high.length > 0) {
      console.log('\n⚠️ HIGH PRIORITY:');
      high.forEach(rec => {
        console.log(`  🎯 ${rec.title}`);
        console.log(`     ${rec.description}`);
      });
    }
    
    if (medium.length > 0) {
      console.log('\n📊 MEDIUM PRIORITY:');
      medium.forEach(rec => {
        console.log(`  💡 ${rec.title}`);
        console.log(`     ${rec.description}`);
      });
    }
  }
}

// ========== Main Execution ==========

async function runDetailedPerformanceAnalysis() {
  console.log('\n🔬 STARTING DETAILED PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));
  console.log('This analysis will stress-test both backends with controlled workloads');
  console.log('to identify specific performance bottlenecks and optimization opportunities.');
  console.log('='.repeat(60));
  
  const runner = new DetailedPerformanceRunner();
  
  try {
    await runner.runScalabilityAnalysis();
    await runner.runMemoryStressTest();
    
    console.log('\n📊 Generating comprehensive report...');
    const report = runner.generateDetailedReport();
    
    console.log('\n🎯 ANALYSIS COMPLETE');
    console.log(`💾 Detailed data saved for further analysis`);
    
    return report;
    
  } catch (error) {
    console.error('💥 Performance analysis failed:', error);
    throw error;
  }
}

export { DetailedPerformanceRunner, SystemMonitor, ConstraintAnalyzer, runDetailedPerformanceAnalysis };

if (import.meta.url === `file://${process.argv[1]}`) {
  runDetailedPerformanceAnalysis().catch(console.error);
}