/**
 * Property-Based Testing Infrastructure for o1js Backend Compatibility
 * 
 * This module provides utilities for testing compatibility between
 * Snarky (OCaml) and Sparky (Rust) backends using property-based testing.
 */

// Core infrastructure
export {
  BackendCompatibilityTestRunner,
  ConsoleTestLogger,
  createBackendComparisonProperty,
  type TestConfig,
  type TestResult,
  type TestLogger,
  type ComparisonResult
} from './infrastructure/BackendCompatibilityTestRunner.js';

// Backend testing utilities
export {
  switchBackend,
  getCurrentBackend,
  runWithBackend,
  compareBackends,
  initializeBackendUtils,
  deepCompare,
  FieldCompare,
  BoolCompare,
  GroupCompare,
  PerformanceCompare,
  ConstraintCompare,
  ErrorCompare,
  aggregateResults,
  formatAggregatedResults,
  type Backend,
  type BackendResult,
  type ConstraintSystemState,
  type BackendContext,
  type AggregatedResults
} from './utils/BackendTestUtils.js';

// Ruthless backend parity testing (new comprehensive framework)
export {
  RuthlessFieldGenerators,
  RuthlessCircuitGenerators,
  RuthlessScenarioGenerators,
  ruthlessGenerators
} from './generators/RuthlessFieldGenerators.js';

export {
  RuthlessBackendParityProperties,
  ruthlessBackendParityProperties,
  type BackendComparisonResult,
  type VKComparisonResult
} from './properties/RuthlessBackendParityProperties.js';

// Devious red team testing (maximum evil edition)
export {
  MemoryAttackGenerators,
  NumericalTrapGenerators,
  StateCorruptionGenerators,
  CryptographicAttackGenerators,
  CircuitAttackGenerators,
  PerformanceAttackGenerators,
  ValidationBypassGenerators,
  DeviousAttackGenerators,
  deviousGenerators
} from './generators/DeviousFieldGenerators.js';

export {
  DeviousBackendProperties,
  deviousBackendProperties
} from './properties/DeviousBackendProperties.js';

// Original mock-based testing framework
export {
  FieldGenerators,
  FieldOperationGenerators,
  ConstraintGenerators,
  ComplexityGenerators,
  FieldTestGenerators,
  type MockField,
  type MockBool,
  type FieldOperation,
  type ComplexityParams,
  FieldOperationType
} from './generators/FieldGenerators.js';

export {
  FieldProperties,
  createFieldProperties,
  fieldProperties,
  type ConstraintCountComparison,
  type VKComparisonResult as MockVKComparisonResult,
  type PerformanceMeasurement,
  type PerformanceComparison
} from './properties/FieldProperties.js';

// Re-export fast-check for convenience
export { fc } from 'fast-check';