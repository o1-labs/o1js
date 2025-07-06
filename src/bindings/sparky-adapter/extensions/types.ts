/**
 * Sparky Extensions Type Definitions
 * 
 * Comprehensive type system for Sparky-specific extension functionality.
 * All extension types are clearly marked as Sparky-only.
 * 
 * Created: July 6, 2025 12:47 PM UTC
 * Last Modified: July 6, 2025 12:47 PM UTC
 */

// ===================================================================
// OPTIMIZATION EXTENSION TYPES
// ===================================================================

/**
 * Available optimization levels for Sparky constraint generation
 * 
 * @extension These optimization levels are Sparky-specific
 */
export enum OptimizationLevel {
  /** No optimizations applied - preserve all constraints as generated */
  NONE = 'none',
  
  /** Basic algebraic simplification and constant folding */
  BASIC = 'basic',
  
  /** Full optimization pipeline including advanced constraint elimination */
  AGGRESSIVE = 'aggressive',
  
  /** User-defined custom optimization configuration */
  CUSTOM = 'custom'
}

/**
 * Detailed optimization configuration for custom optimization level
 * 
 * @extension This configuration is Sparky-specific
 */
export interface OptimizationConfig {
  /** Enable elimination of zero constraints (literal "0 = 0") */
  eliminateZeroConstraints: boolean;
  
  /** Enable elimination of identity constraints (degenerate patterns) */
  eliminateIdentityConstraints: boolean;
  
  /** Enable variable substitution pattern detection */
  detectVariableSubstitution: boolean;
  
  /** Enable algebraic simplification (constant folding, like terms) */
  algebraicSimplification: boolean;
  
  /** Enable constraint batching optimization */
  constraintBatching: boolean;
  
  /** Enable advanced coefficient optimization */
  coefficientOptimization: boolean;
  
  /** Enable semantic constraint preservation (if/then patterns) */
  semanticConstraintPreservation: boolean;
}

/**
 * Statistics about optimization performance and effects
 * 
 * @extension These statistics are Sparky-specific
 */
export interface OptimizationStats {
  /** Current optimization level */
  level: OptimizationLevel;
  
  /** Current optimization configuration */
  config: OptimizationConfig;
  
  /** Total constraints before optimization */
  constraintsBefore: number;
  
  /** Total constraints after optimization */
  constraintsAfter: number;
  
  /** Number of constraints eliminated */
  constraintsEliminated: number;
  
  /** Optimization effectiveness percentage (0-100) */
  effectiveness: number;
  
  /** Time spent in optimization passes (milliseconds) */
  optimizationTimeMs: number;
  
  /** Memory usage statistics */
  memoryStats: {
    /** Peak memory usage during optimization (bytes) */
    peakMemoryBytes: number;
    
    /** Current memory usage (bytes) */
    currentMemoryBytes: number;
  };
  
  /** Per-pass optimization statistics */
  passStats: {
    [passName: string]: {
      constraintsEliminated: number;
      timeMs: number;
      memoryDeltaBytes: number;
    };
  };
  
  /** Last optimization timestamp */
  lastOptimizationTime: string;
}

// ===================================================================
// PERFORMANCE EXTENSION TYPES
// ===================================================================

/**
 * Performance monitoring categories
 * 
 * @extension These categories are Sparky-specific
 */
export enum PerformanceCategory {
  FIELD_OPERATIONS = 'field_operations',
  CONSTRAINT_GENERATION = 'constraint_generation',
  OPTIMIZATION_PASSES = 'optimization_passes',
  MEMORY_MANAGEMENT = 'memory_management',
  WASM_BRIDGE = 'wasm_bridge'
}

/**
 * Performance measurement result
 * 
 * @extension This interface is Sparky-specific
 */
export interface PerformanceMeasurement {
  /** Category of the measurement */
  category: PerformanceCategory;
  
  /** Operation name */
  operation: string;
  
  /** Execution time in nanoseconds */
  timeNs: number;
  
  /** Memory usage delta in bytes */
  memoryDeltaBytes: number;
  
  /** Number of operations performed */
  operationCount: number;
  
  /** Operations per second */
  operationsPerSecond: number;
  
  /** Timestamp of measurement */
  timestamp: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Performance monitoring configuration
 * 
 * @extension This configuration is Sparky-specific
 */
export interface PerformanceConfig {
  /** Enable automatic performance tracking */
  enabled: boolean;
  
  /** Categories to monitor */
  categories: PerformanceCategory[];
  
  /** Maximum number of measurements to retain */
  maxMeasurements: number;
  
  /** Measurement sampling rate (0.0 - 1.0) */
  samplingRate: number;
  
  /** Enable detailed memory profiling */
  detailedMemoryProfiling: boolean;
}

// ===================================================================
// DEBUGGING EXTENSION TYPES
// ===================================================================

/**
 * Debug logging levels for Sparky operations
 * 
 * @extension These debug levels are Sparky-specific
 */
export enum DebugLevel {
  NONE = 'none',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

/**
 * Constraint system debugging information
 * 
 * @extension This interface is Sparky-specific
 */
export interface ConstraintDebugInfo {
  /** Constraint index in system */
  index: number;
  
  /** Constraint type */
  type: string;
  
  /** Variables involved in constraint */
  variables: number[];
  
  /** Coefficients in constraint */
  coefficients: string[];
  
  /** Constant term */
  constant?: string;
  
  /** Source location that generated this constraint */
  sourceLocation?: {
    function: string;
    line?: number;
    column?: number;
  };
  
  /** Optimization passes that affected this constraint */
  optimizationHistory: string[];
  
  /** Whether constraint is redundant */
  isRedundant: boolean;
  
  /** Mathematical properties */
  properties: {
    isLinear: boolean;
    isDegreeTwo: boolean;
    isBoolean: boolean;
    isSatisfiable: boolean;
  };
}

/**
 * Debug tracing configuration
 * 
 * @extension This configuration is Sparky-specific
 */
export interface DebugConfig {
  /** Debug logging level */
  level: DebugLevel;
  
  /** Enable constraint tracing */
  traceConstraints: boolean;
  
  /** Enable variable allocation tracing */
  traceVariables: boolean;
  
  /** Enable optimization pass tracing */
  traceOptimizations: boolean;
  
  /** Enable WASM bridge call tracing */
  traceWasmCalls: boolean;
  
  /** Maximum number of debug entries to retain */
  maxDebugEntries: number;
  
  /** Categories to debug */
  categories: string[];
}

// ===================================================================
// COMMON EXTENSION TYPES
// ===================================================================

/**
 * Base extension interface that all extensions implement
 * 
 * @extension This interface is Sparky-specific
 */
export interface BaseExtension {
  /** Extension name */
  readonly name: string;
  
  /** Extension version */
  readonly version: string;
  
  /** Whether extension is currently active */
  readonly isActive: boolean;
  
  /** Initialize the extension */
  initialize?(): Promise<void>;
  
  /** Cleanup extension resources */
  cleanup?(): Promise<void>;
  
  /** Get extension status */
  getStatus(): {
    name: string;
    version: string;
    isActive: boolean;
    lastActivity?: string;
  };
}

/**
 * Extension capability flags
 * 
 * @extension These capabilities are Sparky-specific
 */
export interface ExtensionCapabilities {
  /** Supports real-time optimization level changes */
  supportsRuntimeOptimization: boolean;
  
  /** Supports performance profiling */
  supportsPerformanceProfiling: boolean;
  
  /** Supports constraint debugging */
  supportsConstraintDebugging: boolean;
  
  /** Supports custom optimization passes */
  supportsCustomOptimizations: boolean;
  
  /** Supports memory profiling */
  supportsMemoryProfiling: boolean;
}

// ===================================================================
// ERROR TYPES
// ===================================================================

/**
 * Extension-specific error types
 * 
 * @extension These errors are Sparky-specific
 */
export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly extensionName: string,
    public readonly errorCode?: string
  ) {
    super(`[${extensionName}] ${message}`);
    this.name = 'ExtensionError';
  }
}

export class OptimizationError extends ExtensionError {
  constructor(message: string, errorCode?: string) {
    super(message, 'Optimization', errorCode);
    this.name = 'OptimizationError';
  }
}

export class PerformanceError extends ExtensionError {
  constructor(message: string, errorCode?: string) {
    super(message, 'Performance', errorCode);
    this.name = 'PerformanceError';
  }
}

export class DebugError extends ExtensionError {
  constructor(message: string, errorCode?: string) {
    super(message, 'Debug', errorCode);
    this.name = 'DebugError';
  }
}