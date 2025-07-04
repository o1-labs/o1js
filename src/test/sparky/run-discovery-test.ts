#!/usr/bin/env node
/**
 * Test Discovery Validation
 * 
 * Simple script to test the automatic test discovery system
 * before running the full parallel infrastructure.
 */

import { TestDiscovery } from './shared/TestDiscovery.js';

async function testDiscovery() {
  console.log('🔍 Testing Automatic Test Discovery...');
  console.log('');

  try {
    const discovery = new TestDiscovery();
    
    // Test discovery report
    const report = discovery.getDiscoveryReport();
    console.log(report);
    
    // Test specific discoveries
    console.log('🧪 Testing Specific Discoveries:');
    console.log('');
    
    // Snarky suites
    const snarkySuites = discovery.discoverBackendSuites('snarky');
    console.log(`📋 Snarky suites: ${snarkySuites.length} found`);
    snarkySuites.forEach(suite => {
      console.log(`  • ${suite.name} [${suite.tier}] - ${suite.path}`);
    });
    console.log('');
    
    // Sparky suites
    const sparkySuites = discovery.discoverBackendSuites('sparky');
    console.log(`📋 Sparky suites: ${sparkySuites.length} found`);
    sparkySuites.forEach(suite => {
      console.log(`  • ${suite.name} [${suite.tier}] - ${suite.path}`);
    });
    console.log('');
    
    // Integration suites
    const integrationSuites = discovery.discoverIntegrationSuites();
    console.log(`📋 Integration suites: ${integrationSuites.length} found`);
    integrationSuites.forEach(suite => {
      console.log(`  • ${suite.name} [${suite.tier}] - ${suite.path}`);
    });
    console.log('');
    
    // Test optimal distribution
    console.log('⚡ Testing Optimal Distribution (4 processes):');
    const distribution = discovery.getOptimalDistribution(4, ['smoke', 'core']);
    Object.entries(distribution).forEach(([processId, suites]) => {
      console.log(`  Process ${processId}: ${suites.length} suites`);
      suites.forEach(suite => {
        console.log(`    - ${suite.name} [${suite.tier}]`);
      });
    });
    console.log('');
    
    console.log('✅ Test discovery completed successfully!');
    
  } catch (error) {
    console.error('❌ Test discovery failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testDiscovery();
}

export { testDiscovery };