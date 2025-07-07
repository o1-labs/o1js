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
export var OptimizationLevel;
(function (OptimizationLevel) {
    /** No optimizations applied - preserve all constraints as generated */
    OptimizationLevel["NONE"] = "none";
    /** Basic algebraic simplification and constant folding */
    OptimizationLevel["BASIC"] = "basic";
    /** Full optimization pipeline including advanced constraint elimination */
    OptimizationLevel["AGGRESSIVE"] = "aggressive";
    /** User-defined custom optimization configuration */
    OptimizationLevel["CUSTOM"] = "custom";
})(OptimizationLevel || (OptimizationLevel = {}));
// ===================================================================
// PERFORMANCE EXTENSION TYPES
// ===================================================================
/**
 * Performance monitoring categories
 *
 * @extension These categories are Sparky-specific
 */
export var PerformanceCategory;
(function (PerformanceCategory) {
    PerformanceCategory["FIELD_OPERATIONS"] = "field_operations";
    PerformanceCategory["CONSTRAINT_GENERATION"] = "constraint_generation";
    PerformanceCategory["OPTIMIZATION_PASSES"] = "optimization_passes";
    PerformanceCategory["MEMORY_MANAGEMENT"] = "memory_management";
    PerformanceCategory["WASM_BRIDGE"] = "wasm_bridge";
})(PerformanceCategory || (PerformanceCategory = {}));
// ===================================================================
// DEBUGGING EXTENSION TYPES
// ===================================================================
/**
 * Debug logging levels for Sparky operations
 *
 * @extension These debug levels are Sparky-specific
 */
export var DebugLevel;
(function (DebugLevel) {
    DebugLevel["NONE"] = "none";
    DebugLevel["ERROR"] = "error";
    DebugLevel["WARN"] = "warn";
    DebugLevel["INFO"] = "info";
    DebugLevel["DEBUG"] = "debug";
    DebugLevel["TRACE"] = "trace";
})(DebugLevel || (DebugLevel = {}));
// ===================================================================
// ERROR TYPES
// ===================================================================
/**
 * Extension-specific error types
 *
 * @extension These errors are Sparky-specific
 */
export class ExtensionError extends Error {
    constructor(message, extensionName, errorCode) {
        super(`[${extensionName}] ${message}`);
        this.extensionName = extensionName;
        this.errorCode = errorCode;
        this.name = 'ExtensionError';
    }
}
export class OptimizationError extends ExtensionError {
    constructor(message, errorCode) {
        super(message, 'Optimization', errorCode);
        this.name = 'OptimizationError';
    }
}
export class PerformanceError extends ExtensionError {
    constructor(message, errorCode) {
        super(message, 'Performance', errorCode);
        this.name = 'PerformanceError';
    }
}
export class DebugError extends ExtensionError {
    constructor(message, errorCode) {
        super(message, 'Debug', errorCode);
        this.name = 'DebugError';
    }
}
