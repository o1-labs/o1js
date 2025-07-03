/**
 * DEVIOUS RED TEAM TEST SUITE - ULTIMATE EVIL EDITION
 * 
 * This is the most malicious, evil, and devious test suite designed to
 * break Sparky in every conceivable way. We're going for maximum chaos
 * and destruction to find every possible failure mode.
 * 
 * ⚠️  WARNING: This test suite is intentionally hostile and may cause:
 * - High memory usage
 * - Long execution times  
 * - System instability
 * - Existential dread
 * - Sparky to question its life choices
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import { switchBackend, getCurrentBackend } from '../../../../dist/node/index.js';
import { deviousBackendProperties } from '../properties/DeviousBackendProperties.js';

/**
 * Evil test execution result tracker
 */
interface EvilTestResult {
  propertyName: string;
  evilnessLevel: 'mild' | 'moderate' | 'severe' | 'apocalyptic';
  numRuns: number;
  passed: boolean;
  duration: number;
  error?: string;
  memoryUsed?: number;
  systemStability?: 'stable' | 'unstable' | 'critical' | 'destroyed';
  sparkyVictimStatus?: 'alive' | 'wounded' | 'critical' | 'obliterated';
}

/**
 * Red team attack results analyzer
 */
class RedTeamAttackResults {
  private results: EvilTestResult[] = [];
  private startTime: number = Date.now();
  private totalMemoryUsed: number = 0;
  
  recordResult(result: EvilTestResult): void {
    this.results.push(result);
    if (result.memoryUsed) {
      this.totalMemoryUsed += result.memoryUsed;
    }
  }
  
  generateEvilReport(): void {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    console.log('\n💀 RED TEAM ATTACK RESULTS - SPARKY DESTRUCTION REPORT 💀');
    console.log('============================================================');
    console.log(`⏱️  Total Attack Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
    console.log(`🧠 Total Memory Consumed: ${(this.totalMemoryUsed / 1024 / 1024).toFixed(2)} MB`);
    
    // Group by evilness level
    const byEvilness = this.groupByEvilness();
    
    Object.entries(byEvilness).forEach(([level, results]) => {
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      const percentage = ((passed / total) * 100).toFixed(1);
      
      const emoji = this.getEvilnessEmoji(level as any);
      console.log(`\n${emoji} ${level.toUpperCase()} ATTACKS: ${percentage}% (${passed}/${total})`);
      
      results.forEach(result => {
        const status = result.passed ? '✅' : '💥';
        const duration = result.duration.toFixed(0);
        const victim = result.sparkyVictimStatus ? ` [Sparky: ${result.sparkyVictimStatus}]` : '';
        
        console.log(`   ${status} ${result.propertyName} (${duration}ms, ${result.numRuns} runs)${victim}`);
        
        if (!result.passed && result.error) {
          const errorPreview = result.error.substring(0, 150).replace(/\n/g, ' ');
          console.log(`      💣 Explosion: ${errorPreview}...`);
        }
      });
    });
    
    // Overall destruction assessment
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 OVERALL SPARKY SURVIVAL RATE: ${overallPercentage}%`);
    console.log(`📊 Total Attack Vectors: ${totalTests}`);
    console.log(`✅ Sparky Survived: ${totalPassed}`);
    console.log(`💥 Sparky Destroyed: ${totalTests - totalPassed}`);
    
    // Final verdict
    this.renderFinalVerdict(parseFloat(overallPercentage));
    
    // Attack vector analysis
    this.analyzeAttackEffectiveness();
  }
  
  private groupByEvilness(): Record<string, EvilTestResult[]> {
    return this.results.reduce((acc, result) => {
      const level = result.evilnessLevel;
      if (!acc[level]) acc[level] = [];
      acc[level].push(result);
      return acc;
    }, {} as Record<string, EvilTestResult[]>);
  }
  
  private getEvilnessEmoji(level: 'mild' | 'moderate' | 'severe' | 'apocalyptic'): string {
    switch (level) {
      case 'mild': return '😈';
      case 'moderate': return '👹';
      case 'severe': return '💀';
      case 'apocalyptic': return '☠️';
    }
  }
  
  private renderFinalVerdict(percentage: number): void {
    console.log('\n' + '='.repeat(60));
    
    if (percentage >= 95) {
      console.log('🛡️  SPARKY IS VIRTUALLY INDESTRUCTIBLE!');
      console.log('   The red team attacks have been repelled with minimal damage.');
      console.log('   Sparky has proven itself worthy of production deployment.');
    } else if (percentage >= 85) {
      console.log('💪 SPARKY IS BATTLE-TESTED AND STRONG!');
      console.log('   Minor vulnerabilities detected but overall excellent resilience.');
      console.log('   Sparky is ready for combat deployment with confidence.');
    } else if (percentage >= 70) {
      console.log('⚔️  SPARKY IS WOUNDED BUT STANDING!');
      console.log('   Significant vulnerabilities found that need addressing.');
      console.log('   Sparky needs medical attention before deployment.');
    } else if (percentage >= 50) {
      console.log('🚨 SPARKY IS CRITICALLY DAMAGED!');
      console.log('   Major structural vulnerabilities compromising integrity.');
      console.log('   Sparky requires extensive surgery before deployment.');
    } else {
      console.log('☠️  SPARKY HAS BEEN OBLITERATED!');
      console.log('   Catastrophic failure across multiple attack vectors.');
      console.log('   Sparky needs to be rebuilt from scratch.');
    }
    
    console.log('='.repeat(60));
  }
  
  private analyzeAttackEffectiveness(): void {
    console.log('\n🔍 ATTACK VECTOR EFFECTIVENESS ANALYSIS:');
    
    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length === 0) {
      console.log('   No attack vectors were successful. Sparky is impenetrable!');
      return;
    }
    
    // Find most effective attacks
    const attacksByEffectiveness = failedTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3);
    
    console.log('\n🎯 MOST DEVASTATING ATTACKS:');
    attacksByEffectiveness.forEach((result, idx) => {
      console.log(`   ${idx + 1}. ${result.propertyName}`);
      console.log(`      Evilness: ${result.evilnessLevel} | Duration: ${result.duration}ms`);
      console.log(`      Damage: ${result.error?.substring(0, 100)}...`);
    });
    
    // Memory consumption analysis
    const memoryHogs = this.results
      .filter(r => r.memoryUsed && r.memoryUsed > 10 * 1024 * 1024) // > 10MB
      .sort((a, b) => (b.memoryUsed || 0) - (a.memoryUsed || 0));
    
    if (memoryHogs.length > 0) {
      console.log('\n🧠 MEMORY CONSUMPTION ATTACKS:');
      memoryHogs.slice(0, 3).forEach((result, idx) => {
        const memMB = ((result.memoryUsed || 0) / 1024 / 1024).toFixed(2);
        console.log(`   ${idx + 1}. ${result.propertyName}: ${memMB} MB`);
      });
    }
  }
}

const redTeamResults = new RedTeamAttackResults();

/**
 * Execute a devious property with maximum evil intent
 */
async function executeDeviousProperty(
  propertyName: string,
  evilnessLevel: 'mild' | 'moderate' | 'severe' | 'apocalyptic',
  property: fc.IAsyncProperty<any>,
  config: { numRuns: number; timeout: number }
): Promise<void> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  let passed = false;
  let error: string | undefined;
  let sparkyVictimStatus: EvilTestResult['sparkyVictimStatus'] = 'alive';
  
  console.log(`\n🔥 Launching ${evilnessLevel} attack: ${propertyName}...`);
  
  try {
    await fc.assert(property, {
      numRuns: config.numRuns,
      timeout: config.timeout,
      verbose: false,
      interruptAfterTimeLimit: config.timeout
    });
    passed = true;
    console.log(`✅ Attack repelled: ${propertyName}`);
  } catch (e) {
    error = (e as Error).message;
    passed = false;
    
    // Determine victim status based on error
    if (error.includes('timeout') || error.includes('TIMEOUT')) {
      sparkyVictimStatus = 'critical';
      console.log(`⏰ Timeout kill: ${propertyName}`);
    } else if (error.includes('memory') || error.includes('heap')) {
      sparkyVictimStatus = 'obliterated';
      console.log(`🧠 Memory assassination: ${propertyName}`);
    } else if (error.includes('crash') || error.includes('segfault')) {
      sparkyVictimStatus = 'obliterated';
      console.log(`💥 Explosive destruction: ${propertyName}`);
    } else {
      sparkyVictimStatus = 'wounded';
      console.log(`🩸 Successful hit: ${propertyName}`);
    }
  }
  
  const duration = performance.now() - startTime;
  const endMemory = process.memoryUsage();
  const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
  
  redTeamResults.recordResult({
    propertyName,
    evilnessLevel,
    numRuns: config.numRuns,
    passed,
    duration,
    error,
    memoryUsed,
    sparkyVictimStatus
  });
}

describe('💀 DEVIOUS RED TEAM TEST SUITE - MAXIMUM EVIL EDITION 💀', () => {
  
  beforeAll(async () => {
    console.log('💀'.repeat(60));
    console.log('🔥 INITIATING RED TEAM ATTACK ON SPARKY 🔥');
    console.log('⚠️  WARNING: This test suite is designed to be maximally evil!');
    console.log('⚠️  Expect high resource usage and potential system instability!');
    console.log('💀'.repeat(60));
    
    // Ensure we start in a clean state
    await switchBackend('snarky');
    const currentBackend = getCurrentBackend();
    console.log(`🎯 Starting backend: ${currentBackend}`);
    console.log(`⚔️  Target: Sparky (prepare for annihilation)`);
  });

  afterAll(() => {
    redTeamResults.generateEvilReport();
    console.log('\n💀 RED TEAM ATTACK SEQUENCE COMPLETE 💀');
  });

  describe('😈 MILD EVILNESS ATTACKS (Warmup)', () => {
    
    test('Hash Collision Attack (Mild Evil)', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('hash_collision') && p.evilnessLevel === 'moderate');
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
  });

  describe('👹 MODERATE EVILNESS ATTACKS (Getting Serious)', () => {
    
    test('Memory Exhaustion Attack', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('memory_exhaustion'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
    
    test('Backend Switching Chaos Attack', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('backend_switching_chaos'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
    
    test('Performance Asymmetry Attack', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('performance_asymmetry'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
  });

  describe('💀 SEVERE EVILNESS ATTACKS (Nuclear Option)', () => {
    
    test('Circuit Malformation Attack', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('circuit_malformation'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
  });

  describe('☠️  APOCALYPTIC ATTACKS (Total Annihilation)', () => {
    
    test('Division by Zero Chaos (Apocalyptic)', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('division_by_zero_chaos'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
    
    test('Chaos Monkey Ultimate Destruction', async () => {
      const properties = deviousBackendProperties.getAllDeviousProperties()
        .filter(p => p.name.includes('chaos_monkey_ultimate'));
      
      for (const { name, property, config, evilnessLevel } of properties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
  });

  describe('🔥 COMPREHENSIVE EVIL BARRAGE (Everything at Once)', () => {
    
    test('All Remaining Devious Properties', async () => {
      const allProperties = deviousBackendProperties.getAllDeviousProperties();
      const testedNames = new Set([
        'devious_hash_collision_attack',
        'devious_memory_exhaustion_attack', 
        'devious_backend_switching_chaos',
        'devious_performance_asymmetry_attack',
        'devious_circuit_malformation_attack',
        'devious_division_by_zero_chaos',
        'devious_chaos_monkey_ultimate'
      ]);
      
      const remainingProperties = allProperties.filter(p => !testedNames.has(p.name));
      
      for (const { name, property, config, evilnessLevel } of remainingProperties) {
        await executeDeviousProperty(name, evilnessLevel, property, config);
      }
    });
  });

  describe('🎯 FINAL BOSS BATTLE (Ultimate Test)', () => {
    
    test('The Ultimate Evil Test of Ultimate Destiny', async () => {
      console.log('\n⚔️  FINAL BOSS BATTLE: TESTING SPARKY\'S WILL TO LIVE ⚔️');
      
      // This is the most evil test possible - run everything in rapid succession
      const allProperties = deviousBackendProperties.getAllDeviousProperties()
        .sort((a, b) => {
          const evilOrder = { 'mild': 1, 'moderate': 2, 'severe': 3, 'apocalyptic': 4 };
          return evilOrder[b.evilnessLevel] - evilOrder[a.evilnessLevel];
        });
      
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3;
      
      for (const { name, property, config, evilnessLevel } of allProperties.slice(0, 3)) {
        console.log(`🔥 Final boss attack: ${name} (${evilnessLevel})`);
        
        try {
          // Reduced runs for final boss to prevent infinite torture
          const bossConfig = { 
            numRuns: Math.max(1, Math.floor(config.numRuns / 3)), 
            timeout: config.timeout 
          };
          
          await executeDeviousProperty(name, evilnessLevel, property, bossConfig);
          consecutiveFailures = 0; // Reset on success
        } catch (error) {
          consecutiveFailures++;
          console.log(`💥 Boss attack failed: ${(error as Error).message.substring(0, 100)}...`);
          
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log('☠️  Sparky has been completely obliterated! Ending boss battle.');
            break;
          }
        }
      }
      
      console.log('\n🏁 FINAL BOSS BATTLE COMPLETE');
    });
  });
});