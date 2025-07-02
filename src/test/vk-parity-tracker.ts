/**
 * Simple VK Parity Progress Tracker
 * 
 * Tracks progress toward 100% VK parity without overengineering
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface ProgressSnapshot {
  timestamp: Date;
  commit: string;
  parityRate: number;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  duration: number;
  criticalBlockers: string[];
}

export interface ProgressHistory {
  snapshots: ProgressSnapshot[];
  milestones: {
    firstPassing?: Date;
    halfwayPoint?: Date;
    fullParity?: Date;
  };
  trend: 'improving' | 'stable' | 'declining';
}

export class VkParityTracker {
  private readonly historyFile: string;

  constructor(dataDir: string = './test-results') {
    this.historyFile = join(dataDir, 'vk-parity-history.json');
  }

  async recordProgress(snapshot: Omit<ProgressSnapshot, 'timestamp' | 'commit'>): Promise<void> {
    const fullSnapshot: ProgressSnapshot = {
      ...snapshot,
      timestamp: new Date(),
      commit: this.getCurrentCommit()
    };

    const history = await this.loadHistory();
    history.snapshots.push(fullSnapshot);
    
    // Keep only last 100 snapshots to prevent unbounded growth
    if (history.snapshots.length > 100) {
      history.snapshots = history.snapshots.slice(-100);
    }

    // Update milestones
    this.updateMilestones(history, fullSnapshot);
    
    // Update trend
    history.trend = this.calculateTrend(history.snapshots);

    await this.saveHistory(history);
    this.printProgress(fullSnapshot, history);
  }

  async generateProgressReport(): Promise<void> {
    const history = await this.loadHistory();
    
    if (history.snapshots.length === 0) {
      console.log('📊 No progress data available yet');
      return;
    }

    const latest = history.snapshots[history.snapshots.length - 1];
    const first = history.snapshots[0];
    const totalProgress = latest.parityRate - first.parityRate;

    console.log('\n=== VK Parity Progress Report ===');
    console.log(`📈 Current Rate: ${(latest.parityRate * 100).toFixed(1)}%`);
    console.log(`📊 Total Progress: ${(totalProgress * 100).toFixed(1)}% (since tracking started)`);
    console.log(`📅 Data Points: ${history.snapshots.length}`);
    console.log(`🎯 Trend: ${this.getTrendEmoji(history.trend)} ${history.trend}`);

    if (history.milestones.firstPassing) {
      console.log(`🎉 First Passing: ${history.milestones.firstPassing.toLocaleDateString()}`);
    }
    if (history.milestones.halfwayPoint) {
      console.log(`🚀 Halfway Point: ${history.milestones.halfwayPoint.toLocaleDateString()}`);
    }
    if (history.milestones.fullParity) {
      console.log(`🏆 FULL PARITY ACHIEVED: ${history.milestones.fullParity.toLocaleDateString()}`);
    }

    // Show recent progress
    if (history.snapshots.length >= 5) {
      const recent = history.snapshots.slice(-5);
      console.log('\n📊 Recent Progress:');
      recent.forEach(snapshot => {
        const rate = (snapshot.parityRate * 100).toFixed(1);
        const date = snapshot.timestamp.toLocaleDateString();
        console.log(`  ${date}: ${rate}% (${snapshot.passingTests}/${snapshot.totalTests})`);
      });
    }

    if (latest.criticalBlockers.length > 0) {
      console.log('\n🚨 Current Blockers:');
      latest.criticalBlockers.forEach(blocker => console.log(`  • ${blocker}`));
    }

    console.log('\n🎯 Next Actions:');
    this.getNextActions(latest).forEach(action => console.log(`  • ${action}`));
  }

  private async loadHistory(): Promise<ProgressHistory> {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert timestamp strings back to Date objects
      parsed.snapshots = parsed.snapshots.map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp)
      }));
      
      if (parsed.milestones.firstPassing) {
        parsed.milestones.firstPassing = new Date(parsed.milestones.firstPassing);
      }
      if (parsed.milestones.halfwayPoint) {
        parsed.milestones.halfwayPoint = new Date(parsed.milestones.halfwayPoint);
      }
      if (parsed.milestones.fullParity) {
        parsed.milestones.fullParity = new Date(parsed.milestones.fullParity);
      }
      
      return parsed;
    } catch {
      return {
        snapshots: [],
        milestones: {},
        trend: 'stable'
      };
    }
  }

  private async saveHistory(history: ProgressHistory): Promise<void> {
    await fs.mkdir(join(this.historyFile, '..'), { recursive: true });
    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
  }

  private updateMilestones(history: ProgressHistory, snapshot: ProgressSnapshot): void {
    if (snapshot.parityRate > 0 && !history.milestones.firstPassing) {
      history.milestones.firstPassing = snapshot.timestamp;
    }
    
    if (snapshot.parityRate >= 0.5 && !history.milestones.halfwayPoint) {
      history.milestones.halfwayPoint = snapshot.timestamp;
    }
    
    if (snapshot.parityRate >= 1.0 && !history.milestones.fullParity) {
      history.milestones.fullParity = snapshot.timestamp;
    }
  }

  private calculateTrend(snapshots: ProgressSnapshot[]): 'improving' | 'stable' | 'declining' {
    if (snapshots.length < 3) return 'stable';
    
    const recent = snapshots.slice(-5);
    const first = recent[0].parityRate;
    const last = recent[recent.length - 1].parityRate;
    const delta = last - first;
    
    if (delta > 0.02) return 'improving';  // >2% improvement
    if (delta < -0.02) return 'declining'; // >2% decline
    return 'stable';
  }

  private printProgress(snapshot: ProgressSnapshot, history: ProgressHistory): void {
    const rate = (snapshot.parityRate * 100).toFixed(1);
    const trend = this.getTrendEmoji(history.trend);
    
    console.log(`\n📊 Progress Recorded: ${rate}% ${trend}`);
    console.log(`   Tests: ${snapshot.passingTests}/${snapshot.totalTests} passing`);
    console.log(`   Duration: ${snapshot.duration}ms`);
    console.log(`   Commit: ${snapshot.commit}`);
    
    if (snapshot.parityRate >= 1.0) {
      console.log('🎉🎉🎉 FULL VK PARITY ACHIEVED! 🎉🎉🎉');
    } else if (snapshot.parityRate >= 0.8) {
      console.log('🚀 Getting close! Almost there!');
    } else if (snapshot.parityRate >= 0.5) {
      console.log('📈 Major progress! Halfway point reached!');
    } else if (snapshot.parityRate > 0) {
      console.log('✨ Progress! Some tests are now passing!');
    }
  }

  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  private getNextActions(snapshot: ProgressSnapshot): string[] {
    const actions: string[] = [];
    
    if (snapshot.parityRate === 0) {
      actions.push('Fix critical VK generation blocker');
      actions.push('Debug constraint routing bug');
      actions.push('Investigate identical Sparky VK hashes');
    } else if (snapshot.parityRate < 0.2) {
      actions.push('Implement missing constraint optimizations');
      actions.push('Fix basic VK generation differences');
    } else if (snapshot.parityRate < 0.5) {
      actions.push('Address constraint count discrepancies');
      actions.push('Implement reduce_lincom optimization');
    } else if (snapshot.parityRate < 0.8) {
      actions.push('Fix remaining edge cases');
      actions.push('Optimize advanced features');
    } else if (snapshot.parityRate < 1.0) {
      actions.push('Final debugging of failing tests');
      actions.push('Performance optimization');
    } else {
      actions.push('Maintain parity with ongoing development');
      actions.push('Performance benchmarking');
    }
    
    return actions;
  }

  private getCurrentCommit(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 7);
    } catch {
      return 'unknown';
    }
  }
}

// CLI interface
export async function trackProgress(): Promise<void> {
  const tracker = new VkParityTracker();
  await tracker.generateProgressReport();
}

// CLI execution check for ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  trackProgress().catch(console.error);
}