/**
 * Sparky Optimization Extensions Test
 * 
 * Comprehensive test for the new Sparky optimization level extension system.
 * Tests extension availability, optimization level control, and API segregation.
 * 
 * Created: July 6, 2025 1:05 PM UTC
 * Last Modified: July 6, 2025 1:05 PM UTC
 */

import { 
  switchBackend, 
  getCurrentBackend,
  getSparkyExtensions,
  getExtension,
  getAvailableExtensions,
  isExtensionAvailable
} from './src/index.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

const TEST_CONFIG = {
  timeout: 30000,
  verbose: true
};

// ===================================================================
// TEST UTILITIES
// ===================================================================

function log(message) {
  if (TEST_CONFIG.verbose) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testWithTimeout(testFn, timeoutMs = TEST_CONFIG.timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    testFn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

// ===================================================================
// EXTENSION AVAILABILITY TESTS
// ===================================================================

async function testExtensionAvailabilityWithSnarky() {
  log('🧪 Testing extension availability with Snarky backend...');
  
  // Switch to Snarky backend
  await switchBackend('snarky');
  assert(getCurrentBackend() === 'snarky', 'Should be using Snarky backend');
  
  // Extensions should NOT be available
  const extensions = getSparkyExtensions();
  assert(extensions === null, 'Extensions should be null with Snarky backend');
  
  const availableExtensions = getAvailableExtensions();
  assert(availableExtensions.length === 0, 'No extensions should be available with Snarky backend');
  
  assert(!isExtensionAvailable('optimization'), 'Optimization extension should not be available');
  assert(!isExtensionAvailable('performance'), 'Performance extension should not be available');
  assert(!isExtensionAvailable('debugging'), 'Debugging extension should not be available');
  
  const optimizationExt = getExtension('optimization');
  assert(optimizationExt === null, 'Optimization extension should be null with Snarky backend');
  
  log('✅ Extension availability with Snarky backend: PASSED');
}

async function testExtensionAvailabilityWithSparky() {
  log('🧪 Testing extension availability with Sparky backend...');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  assert(getCurrentBackend() === 'sparky', 'Should be using Sparky backend');
  
  // Extensions should be available
  const extensions = getSparkyExtensions();
  assert(extensions !== null, 'Extensions should be available with Sparky backend');
  assert(typeof extensions === 'object', 'Extensions should be an object');
  
  // Check extension categories
  assert(extensions.optimization !== undefined, 'Optimization extension should be available');
  assert(extensions.performance !== undefined, 'Performance extension should be available');
  assert(extensions.debugging !== undefined, 'Debugging extension should be available');
  
  const availableExtensions = getAvailableExtensions();
  assert(availableExtensions.length === 3, 'Should have 3 extension categories');
  assert(availableExtensions.includes('optimization'), 'Should include optimization');
  assert(availableExtensions.includes('performance'), 'Should include performance');
  assert(availableExtensions.includes('debugging'), 'Should include debugging');
  
  assert(isExtensionAvailable('optimization'), 'Optimization extension should be available');
  assert(isExtensionAvailable('performance'), 'Performance extension should be available');
  assert(isExtensionAvailable('debugging'), 'Debugging extension should be available');
  
  const optimizationExt = getExtension('optimization');
  assert(optimizationExt !== null, 'Optimization extension should not be null with Sparky backend');
  assert(optimizationExt.name === 'SparkyOptimization', 'Should have correct extension name');
  
  log('✅ Extension availability with Sparky backend: PASSED');
}

// ===================================================================
// OPTIMIZATION LEVEL TESTS
// ===================================================================

async function testOptimizationLevelControl() {
  log('🧪 Testing optimization level control...');
  
  // Ensure Sparky backend is active
  await switchBackend('sparky');
  
  const extensions = getSparkyExtensions();
  const optimization = extensions.optimization;
  
  // Test getting current level
  const currentLevel = await optimization.getOptimizationLevel();
  log(`Current optimization level: ${currentLevel}`);
  assert(typeof currentLevel === 'string', 'Optimization level should be a string');
  
  // Test setting different levels
  log('Testing NONE optimization level...');
  await optimization.setOptimizationLevel('none');
  const noneLevel = await optimization.getOptimizationLevel();
  assert(noneLevel === 'none', 'Should be able to set NONE level');
  
  log('Testing BASIC optimization level...');
  await optimization.setOptimizationLevel('basic');
  const basicLevel = await optimization.getOptimizationLevel();
  assert(basicLevel === 'basic', 'Should be able to set BASIC level');
  
  log('Testing AGGRESSIVE optimization level...');
  await optimization.setOptimizationLevel('aggressive');
  const aggressiveLevel = await optimization.getOptimizationLevel();
  assert(aggressiveLevel === 'aggressive', 'Should be able to set AGGRESSIVE level');
  
  log('✅ Optimization level control: PASSED');
}

async function testOptimizationConfig() {
  log('🧪 Testing optimization configuration...');
  
  const extensions = getSparkyExtensions();
  const optimization = extensions.optimization;
  
  // Test getting configuration for different levels
  await optimization.setOptimizationLevel('none');
  const noneConfig = await optimization.getOptimizationConfig();
  assert(typeof noneConfig === 'object', 'Config should be an object');
  assert(noneConfig.eliminateZeroConstraints === false, 'NONE level should disable zero constraint elimination');
  
  await optimization.setOptimizationLevel('aggressive');
  const aggressiveConfig = await optimization.getOptimizationConfig();
  assert(aggressiveConfig.eliminateZeroConstraints === true, 'AGGRESSIVE level should enable zero constraint elimination');
  assert(aggressiveConfig.constraintBatching === true, 'AGGRESSIVE level should enable constraint batching');
  
  // Test custom configuration
  await optimization.setOptimizationLevel('custom');
  await optimization.setCustomConfig({
    eliminateZeroConstraints: false,
    algebraicSimplification: true
  });
  
  const customConfig = await optimization.getOptimizationConfig();
  assert(customConfig.eliminateZeroConstraints === false, 'Custom config should disable zero constraint elimination');
  assert(customConfig.algebraicSimplification === true, 'Custom config should enable algebraic simplification');
  
  log('✅ Optimization configuration: PASSED');
}

async function testOptimizationStats() {
  log('🧪 Testing optimization statistics...');
  
  const extensions = getSparkyExtensions();
  const optimization = extensions.optimization;
  
  // Test getting statistics
  const stats = await optimization.getOptimizationStats();
  assert(typeof stats === 'object', 'Stats should be an object');
  assert(typeof stats.level === 'string', 'Stats should include level');
  assert(typeof stats.config === 'object', 'Stats should include config');
  assert(typeof stats.constraintsBefore === 'number', 'Stats should include constraints before');
  assert(typeof stats.constraintsAfter === 'number', 'Stats should include constraints after');
  assert(typeof stats.effectiveness === 'number', 'Stats should include effectiveness');
  
  // Test resetting statistics
  await optimization.resetOptimizationStats();
  const resetStats = await optimization.getOptimizationStats();
  assert(resetStats.constraintsBefore === 0, 'Constraints before should be reset to 0');
  assert(resetStats.constraintsAfter === 0, 'Constraints after should be reset to 0');
  
  log('✅ Optimization statistics: PASSED');
}

async function testOptimizationPresets() {
  log('🧪 Testing optimization presets...');
  
  const extensions = getSparkyExtensions();
  const optimization = extensions.optimization;
  
  const presets = optimization.getAvailablePresets();
  assert(Array.isArray(presets), 'Presets should be an array');
  assert(presets.length === 4, 'Should have 4 presets (none, basic, aggressive, custom)');
  
  const presetLevels = presets.map(p => p.level);
  assert(presetLevels.includes('none'), 'Should include NONE preset');
  assert(presetLevels.includes('basic'), 'Should include BASIC preset');
  assert(presetLevels.includes('aggressive'), 'Should include AGGRESSIVE preset');
  assert(presetLevels.includes('custom'), 'Should include CUSTOM preset');
  
  // Check preset structure
  const nonePreset = presets.find(p => p.level === 'none');
  assert(typeof nonePreset.description === 'string', 'Preset should have description');
  assert(typeof nonePreset.config === 'object', 'Preset should have config');
  
  log('✅ Optimization presets: PASSED');
}

// ===================================================================
// ERROR HANDLING TESTS
// ===================================================================

async function testErrorHandling() {
  log('🧪 Testing error handling...');
  
  // Test calling extension methods with Snarky backend
  await switchBackend('snarky');
  
  try {
    const optimizationExt = getExtension('optimization');
    if (optimizationExt !== null) {
      await optimizationExt.setOptimizationLevel('aggressive');
      assert(false, 'Should have thrown error with Snarky backend');
    }
  } catch (error) {
    assert(error.message.includes('Sparky backend'), 'Error should mention Sparky backend requirement');
  }
  
  // Switch back to Sparky for invalid operation tests
  await switchBackend('sparky');
  const extensions = getSparkyExtensions();
  const optimization = extensions.optimization;
  
  // Test invalid optimization level
  try {
    await optimization.setOptimizationLevel('invalid');
    assert(false, 'Should have thrown error for invalid level');
  } catch (error) {
    // Expected error
  }
  
  log('✅ Error handling: PASSED');
}

// ===================================================================
// PERFORMANCE EXTENSION TESTS
// ===================================================================

async function testPerformanceExtension() {
  log('🧪 Testing performance extension...');
  
  await switchBackend('sparky');
  const extensions = getSparkyExtensions();
  const performance = extensions.performance;
  
  assert(performance.name === 'SparkyPerformance', 'Should have correct performance extension name');
  assert(typeof performance.isActive === 'boolean', 'Should have isActive property');
  
  // Test enabling monitoring
  await performance.enableMonitoring({
    categories: ['field_operations'],
    maxMeasurements: 1000
  });
  
  assert(performance.isMonitoringEnabled(), 'Monitoring should be enabled');
  
  // Test configuration
  const config = performance.getConfig();
  assert(config.maxMeasurements === 1000, 'Should have correct max measurements');
  assert(config.categories.includes('field_operations'), 'Should include field operations category');
  
  // Test measurements
  performance.startTiming('test-op', 'field_operations', 'test');
  await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
  performance.endTiming('test-op', 'field_operations', 'test', 1);
  
  const measurements = performance.getMeasurements('field_operations');
  assert(measurements.length > 0, 'Should have recorded measurements');
  
  log('✅ Performance extension: PASSED');
}

// ===================================================================
// DEBUGGING EXTENSION TESTS  
// ===================================================================

async function testDebuggingExtension() {
  log('🧪 Testing debugging extension...');
  
  await switchBackend('sparky');
  const extensions = getSparkyExtensions();
  const debugging = extensions.debugging;
  
  assert(debugging.name === 'SparkyDebugging', 'Should have correct debugging extension name');
  
  // Test debug level setting
  debugging.setDebugLevel('info');
  assert(debugging.getDebugLevel() === 'info', 'Should be able to set debug level');
  
  // Test logging
  debugging.log('info', 'test', 'Test message', { test: true });
  
  const entries = debugging.getDebugEntries('info', 'test');
  assert(entries.length > 0, 'Should have debug entries');
  assert(entries[0].message === 'Test message', 'Should have correct message');
  assert(entries[0].metadata.test === true, 'Should have correct metadata');
  
  // Test constraint tracing
  debugging.traceConstraint('assertEqual', [1, 2], ['1', '-1'], {
    function: 'testFunction',
    line: 42
  });
  
  const constraintInfo = await debugging.getConstraintDebugInfo();
  assert(constraintInfo.length > 0, 'Should have constraint debug info');
  
  log('✅ Debugging extension: PASSED');
}

// ===================================================================
// INTEGRATION TESTS
// ===================================================================

async function testExtensionIntegration() {
  log('🧪 Testing extension integration...');
  
  await switchBackend('sparky');
  
  // Test that all extensions work together
  const extensions = getSparkyExtensions();
  
  // Initialize all extensions
  await extensions.optimization.initialize();
  await extensions.performance.initialize();
  await extensions.debugging.initialize();
  
  // Test status of all extensions
  const optimizationStatus = extensions.optimization.getStatus();
  const performanceStatus = extensions.performance.getStatus();
  const debuggingStatus = extensions.debugging.getStatus();
  
  assert(optimizationStatus.isActive, 'Optimization should be active');
  assert(performanceStatus.isActive, 'Performance should be active');
  assert(debuggingStatus.isActive, 'Debugging should be active');
  
  // Test cross-extension coordination
  extensions.debugging.setDebugLevel('trace');
  await extensions.optimization.setOptimizationLevel('aggressive');
  
  // Should generate debug messages about optimization changes
  const debugEntries = extensions.debugging.getDebugEntries();
  const optimizationMessages = debugEntries.filter(e => 
    e.message.includes('optimization') || e.message.includes('Optimization')
  );
  assert(optimizationMessages.length > 0, 'Should have optimization debug messages');
  
  log('✅ Extension integration: PASSED');
}

// ===================================================================
// MAIN TEST RUNNER
// ===================================================================

async function runAllTests() {
  console.log('🚀 Starting Sparky Optimization Extensions Test Suite');
  console.log('=====================================================');
  
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  
  const tests = [
    { name: 'Extension Availability (Snarky)', fn: testExtensionAvailabilityWithSnarky },
    { name: 'Extension Availability (Sparky)', fn: testExtensionAvailabilityWithSparky },
    { name: 'Optimization Level Control', fn: testOptimizationLevelControl },
    { name: 'Optimization Configuration', fn: testOptimizationConfig },
    { name: 'Optimization Statistics', fn: testOptimizationStats },
    { name: 'Optimization Presets', fn: testOptimizationPresets },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Performance Extension', fn: testPerformanceExtension },
    { name: 'Debugging Extension', fn: testDebuggingExtension },
    { name: 'Extension Integration', fn: testExtensionIntegration }
  ];
  
  for (const test of tests) {
    try {
      log(`\n📋 Running: ${test.name}`);
      await testWithTimeout(test.fn);
      passed++;
      log(`✅ ${test.name}: PASSED`);
    } catch (error) {
      failed++;
      console.error(`❌ ${test.name}: FAILED`);
      console.error(`   Error: ${error.message}`);
      if (TEST_CONFIG.verbose && error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Sparky optimization extensions are working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 SOME TESTS FAILED! Please check the errors above.');
    process.exit(1);
  }
}

// ===================================================================
// RUN TESTS
// ===================================================================

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});