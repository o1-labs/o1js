/**
 * Automatic Test Discovery System
 * 
 * Automatically discovers test suites in the appropriate directories
 * based on backend and test tier, eliminating need for manual mapping.
 */

import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

export interface DiscoveredSuite {
  name: string;
  path: string;
  tier: string;
  backend?: string;
  category?: string;
}

export interface TestDiscoveryConfig {
  baseDir: string;
  backends: string[];
  integrationSuites: boolean;
  pattern: RegExp;
}

export class TestDiscovery {
  private config: TestDiscoveryConfig;

  constructor(config?: Partial<TestDiscoveryConfig>) {
    this.config = {
      baseDir: resolve(__dirname, '..', 'suites'),
      backends: ['snarky', 'sparky'],
      integrationSuites: true,
      pattern: /\.suite\.(ts|js)$/,
      ...config
    };
  }

  /**
   * Discover all test suites for a specific backend
   */
  discoverBackendSuites(backend: string): DiscoveredSuite[] {
    const backendDir = join(this.config.baseDir, `${backend}-only`);
    
    if (!this.directoryExists(backendDir)) {
      console.warn(`⚠️  Backend directory not found: ${backendDir}`);
      return [];
    }

    return this.scanDirectory(backendDir, backend);
  }

  /**
   * Discover all integration test suites
   */
  discoverIntegrationSuites(): DiscoveredSuite[] {
    if (!this.config.integrationSuites) {
      return [];
    }

    const integrationDir = join(this.config.baseDir, 'integration');
    
    if (!this.directoryExists(integrationDir)) {
      console.warn(`⚠️  Integration directory not found: ${integrationDir}`);
      return [];
    }

    return this.scanDirectory(integrationDir, undefined);
  }

  /**
   * Discover suites by tier (smoke, core, comprehensive)
   */
  discoverSuitesByTier(tier: string, backend?: string): DiscoveredSuite[] {
    let allSuites: DiscoveredSuite[] = [];

    if (backend) {
      // Backend-specific suites
      allSuites = this.discoverBackendSuites(backend);
    } else {
      // Integration suites
      allSuites = this.discoverIntegrationSuites();
    }

    // Filter by tier based on naming conventions
    return allSuites.filter(suite => this.matchesTier(suite, tier));
  }

  /**
   * Get all available test suites with metadata
   */
  discoverAllSuites(): {
    snarky: DiscoveredSuite[];
    sparky: DiscoveredSuite[];
    integration: DiscoveredSuite[];
  } {
    return {
      snarky: this.discoverBackendSuites('snarky'),
      sparky: this.discoverBackendSuites('sparky'),
      integration: this.discoverIntegrationSuites()
    };
  }

  /**
   * Get optimal test distribution for parallel execution
   */
  getOptimalDistribution(processCount: number, tiers: string[]): {
    [processId: string]: DiscoveredSuite[];
  } {
    const allSuites = this.discoverAllSuites();
    
    // Filter by requested tiers
    const filteredSuites = {
      snarky: allSuites.snarky.filter(s => tiers.some(tier => this.matchesTier(s, tier))),
      sparky: allSuites.sparky.filter(s => tiers.some(tier => this.matchesTier(s, tier))),
      integration: tiers.includes('comprehensive') ? allSuites.integration : []
    };

    // Distribute across processes
    const distribution: { [processId: string]: DiscoveredSuite[] } = {};
    
    // Backend-isolated processes
    const backendProcesses = Math.floor(processCount * 0.8); // 80% for backend processes
    const snarkyProcesses = Math.ceil(backendProcesses / 2);
    const sparkyProcesses = Math.floor(backendProcesses / 2);

    // Distribute snarky suites
    for (let i = 0; i < snarkyProcesses; i++) {
      const processId = `snarky-${i + 1}`;
      distribution[processId] = this.distributeSuites(filteredSuites.snarky, i, snarkyProcesses);
    }

    // Distribute sparky suites
    for (let i = 0; i < sparkyProcesses; i++) {
      const processId = `sparky-${i + 1}`;
      distribution[processId] = this.distributeSuites(filteredSuites.sparky, i, sparkyProcesses);
    }

    // Integration process if needed
    if (filteredSuites.integration.length > 0) {
      distribution['integration'] = filteredSuites.integration;
    }

    return distribution;
  }

  /**
   * Scan directory for test suite files
   */
  private scanDirectory(directory: string, backend?: string): DiscoveredSuite[] {
    const suites: DiscoveredSuite[] = [];

    try {
      const files = readdirSync(directory);
      
      for (const file of files) {
        const filePath = join(directory, file);
        const stat = statSync(filePath);
        
        if (stat.isFile() && this.config.pattern.test(file)) {
          const suite = this.createSuiteMetadata(file, filePath, backend);
          if (suite) {
            suites.push(suite);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to scan directory ${directory}: ${(error as Error).message}`);
    }

    return suites.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Create suite metadata from file
   */
  private createSuiteMetadata(filename: string, fullPath: string, backend?: string): DiscoveredSuite | null {
    // Extract suite name from filename
    const nameMatch = filename.match(/^(.+)\.suite\.(ts|js)$/);
    if (!nameMatch) {
      return null;
    }

    const baseName = nameMatch[1];
    const tier = this.inferTier(baseName);
    const category = this.inferCategory(baseName);

    return {
      name: baseName,
      path: fullPath,
      tier,
      backend,
      category
    };
  }

  /**
   * Infer test tier from suite name
   */
  private inferTier(suiteName: string): string {
    const name = suiteName.toLowerCase();
    
    // Tier detection based on naming patterns
    if (name.includes('smoke') || name.includes('simple') || name.includes('basic')) {
      return 'smoke';
    }
    
    if (name.includes('comprehensive') || name.includes('full') || name.includes('complete') ||
        name.includes('security') || name.includes('performance') || name.includes('stress')) {
      return 'comprehensive';
    }
    
    // Default to core tier
    return 'core';
  }

  /**
   * Infer test category from suite name
   */
  private inferCategory(suiteName: string): string {
    const name = suiteName.toLowerCase();
    
    if (name.includes('field')) return 'field-operations';
    if (name.includes('vk') || name.includes('verification')) return 'vk-parity';
    if (name.includes('poseidon') || name.includes('hash')) return 'cryptography';
    if (name.includes('group') || name.includes('curve')) return 'elliptic-curves';
    if (name.includes('switch') || name.includes('integration')) return 'integration';
    if (name.includes('performance') || name.includes('benchmark')) return 'performance';
    if (name.includes('security') || name.includes('property')) return 'security';
    
    return 'general';
  }

  /**
   * Check if suite matches tier
   */
  private matchesTier(suite: DiscoveredSuite, tier: string): boolean {
    // Exact tier match
    if (suite.tier === tier) {
      return true;
    }
    
    // Tier inclusion rules
    if (tier === 'core' && suite.tier === 'smoke') {
      return true; // Core includes smoke tests
    }
    
    if (tier === 'comprehensive') {
      return true; // Comprehensive includes all tests
    }
    
    return false;
  }

  /**
   * Distribute suites across processes evenly
   */
  private distributeSuites(suites: DiscoveredSuite[], processIndex: number, totalProcesses: number): DiscoveredSuite[] {
    const suitesPerProcess = Math.ceil(suites.length / totalProcesses);
    const startIndex = processIndex * suitesPerProcess;
    const endIndex = Math.min(startIndex + suitesPerProcess, suites.length);
    
    return suites.slice(startIndex, endIndex);
  }

  /**
   * Check if directory exists
   */
  private directoryExists(path: string): boolean {
    try {
      const stat = statSync(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get detailed discovery report
   */
  getDiscoveryReport(): string {
    const allSuites = this.discoverAllSuites();
    
    const lines = [
      '🔍 TEST DISCOVERY REPORT',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      ''
    ];

    // Snarky suites
    if (allSuites.snarky.length > 0) {
      lines.push(`📋 Snarky Suites (${allSuites.snarky.length}):`);
      allSuites.snarky.forEach(suite => {
        lines.push(`  • ${suite.name} [${suite.tier}] (${suite.category})`);
      });
      lines.push('');
    }

    // Sparky suites
    if (allSuites.sparky.length > 0) {
      lines.push(`📋 Sparky Suites (${allSuites.sparky.length}):`);
      allSuites.sparky.forEach(suite => {
        lines.push(`  • ${suite.name} [${suite.tier}] (${suite.category})`);
      });
      lines.push('');
    }

    // Integration suites
    if (allSuites.integration.length > 0) {
      lines.push(`📋 Integration Suites (${allSuites.integration.length}):`);
      allSuites.integration.forEach(suite => {
        lines.push(`  • ${suite.name} [${suite.tier}] (${suite.category})`);
      });
      lines.push('');
    }

    // Summary
    const totalSuites = allSuites.snarky.length + allSuites.sparky.length + allSuites.integration.length;
    lines.push(`📊 Total: ${totalSuites} test suites discovered`);

    return lines.join('\n');
  }
}

export default TestDiscovery;