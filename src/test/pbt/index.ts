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

// Re-export fast-check for convenience
export { fc } from 'fast-check';