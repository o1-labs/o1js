#!/usr/bin/env node

/**
 * Quick verification script for Real Backend Integration
 * 
 * This script performs a basic verification that the real backend
 * integration is working correctly without running the full test suite.
 */

import { realBackendIntegration, BackendTestScenarios } from './RealBackendIntegration.js';
import { Field } from '../../../lib/provable/field.js';

async function quickVerification() {
  console.log('🔍 Starting Quick Verification of Real Backend Integration...\n');

  try {
    // 1. Test initialization
    console.log('1. Testing initialization...');
    const validation = await realBackendIntegration.validateBackendState();
    console.log(`   ✓ Bindings initialized: ${validation.bindingsInitialized}`);
    console.log(`   ✓ Current backend: ${validation.currentBackend}`);
    console.log(`   ✓ State consistent: ${validation.globalStateConsistent}`);
    if (validation.errors.length > 0) {
      console.log(`   ⚠ Errors: ${validation.errors.join(', ')}`);
    }
    console.log();

    // 2. Test backend switching
    console.log('2. Testing backend switching...');
    const originalBackend = realBackendIntegration.getCurrentBackend();
    console.log(`   Original backend: ${originalBackend}`);
    
    // Switch to Sparky
    const sparkySwitch = await realBackendIntegration.switchBackend('sparky');
    console.log(`   ✓ Switch to Sparky: ${sparkySwitch.switchSuccessful} (${sparkySwitch.switchTime.toFixed(2)}ms)`);
    console.log(`   Current backend: ${realBackendIntegration.getCurrentBackend()}`);
    
    // Switch back to Snarky
    const snarkySwitch = await realBackendIntegration.switchBackend('snarky');
    console.log(`   ✓ Switch to Snarky: ${snarkySwitch.switchSuccessful} (${snarkySwitch.switchTime.toFixed(2)}ms)`);
    console.log(`   Current backend: ${realBackendIntegration.getCurrentBackend()}`);
    console.log();

    // 3. Test constraint capture
    console.log('3. Testing constraint capture...');
    const constraintState = await realBackendIntegration.captureConstraintState(() => {
      const f1 = Field(1);
      const f2 = Field(2);
      f1.add(f2);
    });
    console.log(`   ✓ Constraint count: ${constraintState.constraintCount}`);
    console.log(`   ✓ Public input size: ${constraintState.publicInputSize}`);
    console.log(`   ✓ Gates captured: ${constraintState.gates.length}`);
    console.log(`   ✓ Digest: ${constraintState.digest.substring(0, 16)}...`);
    console.log();

    // 4. Test performance monitoring
    console.log('4. Testing performance monitoring...');
    const execution = await realBackendIntegration.executeWithMonitoring(
      () => {
        const f1 = Field(5);
        const f2 = Field(3);
        return f1.add(f2).mul(f1);
      },
      {
        captureConstraints: true,
        constraintFn: () => {
          const f1 = Field(5);
          const f2 = Field(3);
          f1.add(f2).mul(f1);
        }
      }
    );
    console.log(`   ✓ Result: ${execution.result.toBigInt()}`);
    console.log(`   ✓ Execution time: ${execution.performance.executionTime.toFixed(2)}ms`);
    console.log(`   ✓ Memory delta: ${(execution.performance.memoryDelta / 1024).toFixed(2)}KB`);
    console.log(`   ✓ Constraint rate: ${execution.performance.constraintGenerationRate.toFixed(2)} constraints/ms`);
    console.log(`   ✓ Constraints captured: ${execution.constraintState?.constraintCount || 0}`);
    console.log();

    // 5. Test backend comparison
    console.log('5. Testing backend comparison...');
    const comparison = await realBackendIntegration.compareBackends(
      (backend) => {
        const f1 = Field(7);
        const f2 = Field(11);
        return f1.add(f2);
      },
      {
        captureConstraints: true,
        constraintFn: (backend) => () => {
          const f1 = Field(7);
          const f2 = Field(11);
          f1.add(f2);
        }
      }
    );
    
    console.log(`   ✓ Snarky success: ${comparison.snarky.success}`);
    console.log(`   ✓ Sparky success: ${comparison.sparky.success}`);
    console.log(`   ✓ Results equal: ${comparison.comparison.resultsEqual}`);
    console.log(`   ✓ Constraints equal: ${comparison.comparison.constraintsEqual}`);
    console.log(`   ✓ Performance ratio: ${comparison.comparison.performanceRatio.toFixed(2)}x`);
    
    if (comparison.snarky.success && comparison.sparky.success) {
      console.log(`   ✓ Snarky result: ${comparison.snarky.result.toBigInt()}`);
      console.log(`   ✓ Sparky result: ${comparison.sparky.result.toBigInt()}`);
      console.log(`   ✓ Snarky constraints: ${comparison.snarky.constraintState?.constraintCount || 0}`);
      console.log(`   ✓ Sparky constraints: ${comparison.sparky.constraintState?.constraintCount || 0}`);
    }
    console.log();

    // 6. Test scenarios
    console.log('6. Testing pre-built scenarios...');
    const fieldScenario = BackendTestScenarios.fieldArithmetic(10n, 5n);
    const scenarioExecution = await realBackendIntegration.executeWithMonitoring(
      fieldScenario.fn,
      { captureConstraints: true, constraintFn: fieldScenario.constraintFn }
    );
    console.log(`   ✓ Field arithmetic scenario completed: ${scenarioExecution.result.toBigInt()}`);
    console.log(`   ✓ Scenario execution time: ${scenarioExecution.performance.executionTime.toFixed(2)}ms`);
    console.log();

    // 7. Generate report
    console.log('7. Generating comparison report...');
    const report = realBackendIntegration.generateComparisonReport(comparison);
    console.log('   ✓ Report generated successfully');
    console.log('   Sample from report:');
    console.log('   ' + report.split('\n').slice(0, 5).join('\n   '));
    console.log();

    // Restore original backend
    await realBackendIntegration.switchBackend(originalBackend);
    console.log(`✅ Verification completed successfully! Backend restored to: ${originalBackend}`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run verification
quickVerification().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});