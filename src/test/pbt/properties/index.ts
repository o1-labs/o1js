/**
 * Property-based test definitions for backend compatibility
 * 
 * This module exports all property test definitions for easy import
 * and use in test suites.
 */

export {
  FieldProperties,
  createFieldProperties,
  fieldProperties,
  type ConstraintCountComparison,
  type VKComparisonResult,
  type PerformanceMeasurement,
  type PerformanceComparison
} from './FieldProperties.js';

// Re-export commonly used types from infrastructure
export type {
  TestConfig,
  TestResult,
  ComparisonResult
} from '../infrastructure/BackendCompatibilityTestRunner.js';

// Re-export field generators for convenience
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
} from '../generators/FieldGenerators.js';