/**
 * Sparky Debugging Extensions
 *
 * EXTENSION METHODS: Sparky-specific debugging and diagnostic features.
 * These methods are NOT part of the original Snarky API and only available
 * when Sparky backend is active.
 *
 * Created: July 6, 2025 12:55 PM UTC
 * Last Modified: July 6, 2025 12:55 PM UTC
 */
import { DebugLevel, DebugError } from './types.js';
import { ensureSparkyBackend } from './index.js';
import { getSparkyInstance } from '../module-loader.js';
// ===================================================================
// SPARKY DEBUGGING EXTENSIONS CLASS
// ===================================================================
/**
 * Sparky Debugging Extensions
 *
 * EXTENSION CLASS: Provides Sparky-specific debugging and diagnostic features.
 * All methods in this class are EXTENSION METHODS, not part of original Snarky API.
 *
 * @extension This entire class is a Sparky extension
 */
export class SparkyDebuggingExtensions {
    constructor() {
        this.name = 'SparkyDebugging';
        this.version = '1.0.0';
        this._isActive = false;
        this._debugEntries = [];
        this._constraintTraces = [];
        this._variableTraces = new Map();
        this._config = this.createDefaultConfig();
    }
    // ===================================================================
    // EXTENSION LIFECYCLE
    // ===================================================================
    get isActive() {
        return this._isActive;
    }
    /**
     * Initialize debugging extensions
     *
     * @extension This method is Sparky-specific
     */
    async initialize() {
        ensureSparkyBackend();
        try {
            this._isActive = true;
            this.log(DebugLevel.INFO, 'system', 'Sparky debugging extensions initialized');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new DebugError(`Failed to initialize debugging extensions: ${errorMessage}`, 'INIT_FAILED');
        }
    }
    /**
     * Cleanup debugging extensions
     *
     * @extension This method is Sparky-specific
     */
    async cleanup() {
        this._isActive = false;
        this._debugEntries = [];
        this._constraintTraces = [];
        this._variableTraces.clear();
    }
    /**
     * Get extension status
     *
     * @extension This method is Sparky-specific
     */
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            isActive: this._isActive,
            debugLevel: this._config.level,
            entryCount: this._debugEntries.length,
            constraintTraceCount: this._constraintTraces.length
        };
    }
    // ===================================================================
    // DEBUG CONFIGURATION
    // ===================================================================
    /**
     * Set debug logging level
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param level - Debug level to set
     */
    setDebugLevel(level) {
        ensureSparkyBackend();
        if (!this._isActive) {
            throw new DebugError('Debugging extensions not initialized', 'NOT_INITIALIZED');
        }
        const oldLevel = this._config.level;
        this._config.level = level;
        this.log(DebugLevel.INFO, 'config', `Debug level changed from ${oldLevel} to ${level}`);
    }
    /**
     * Get current debug level
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current debug level
     */
    getDebugLevel() {
        return this._config.level;
    }
    /**
     * Update debug configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param config - Partial debug configuration to update
     */
    updateDebugConfig(config) {
        ensureSparkyBackend();
        if (!this._isActive) {
            throw new DebugError('Debugging extensions not initialized', 'NOT_INITIALIZED');
        }
        this._config = { ...this._config, ...config };
        // Trim debug entries if max changed
        if (config.maxDebugEntries && this._debugEntries.length > config.maxDebugEntries) {
            this._debugEntries = this._debugEntries.slice(-config.maxDebugEntries);
        }
        this.log(DebugLevel.INFO, 'config', 'Debug configuration updated');
    }
    /**
     * Get current debug configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current debug configuration
     */
    getDebugConfig() {
        return { ...this._config };
    }
    // ===================================================================
    // DEBUG LOGGING
    // ===================================================================
    /**
     * Log a debug message
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param level - Debug level of the message
     * @param category - Category of the debug message
     * @param message - Debug message
     * @param metadata - Optional metadata to include
     */
    log(level, category, message, metadata) {
        if (!this.shouldLog(level, category)) {
            return;
        }
        const entry = {
            level,
            category,
            message,
            timestamp: new Date().toISOString(),
            metadata
        };
        this._debugEntries.push(entry);
        // Trim entries if we exceed max
        if (this._debugEntries.length > this._config.maxDebugEntries) {
            this._debugEntries = this._debugEntries.slice(-this._config.maxDebugEntries);
        }
        // Also log to console for immediate visibility
        if (this.shouldLogToConsole(level)) {
            const prefix = `[Sparky:${level.toUpperCase()}:${category}]`;
            const timestamp = new Date().toISOString();
            const fullMessage = `${prefix} ${timestamp} ${message}`;
            switch (level) {
                case DebugLevel.ERROR:
                    console.error(fullMessage, metadata);
                    break;
                case DebugLevel.WARN:
                    console.warn(fullMessage, metadata);
                    break;
                case DebugLevel.INFO:
                    console.info(fullMessage, metadata);
                    break;
                case DebugLevel.DEBUG:
                case DebugLevel.TRACE:
                    console.debug(fullMessage, metadata);
                    break;
            }
        }
    }
    /**
     * Get debug log entries
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param level - Optional level filter
     * @param category - Optional category filter
     * @param limit - Maximum number of entries to return
     * @returns Array of debug entries
     */
    getDebugEntries(level, category, limit) {
        ensureSparkyBackend();
        let entries = [...this._debugEntries];
        if (level) {
            entries = entries.filter(e => e.level === level);
        }
        if (category) {
            entries = entries.filter(e => e.category === category);
        }
        if (limit && limit > 0) {
            entries = entries.slice(-limit);
        }
        return entries;
    }
    /**
     * Clear debug log entries
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param level - Optional level filter for clearing
     * @param category - Optional category filter for clearing
     */
    clearDebugEntries(level, category) {
        ensureSparkyBackend();
        if (!level && !category) {
            this._debugEntries = [];
        }
        else {
            this._debugEntries = this._debugEntries.filter(entry => {
                if (level && entry.level === level)
                    return false;
                if (category && entry.category === category)
                    return false;
                return true;
            });
        }
        this.log(DebugLevel.INFO, 'debug', 'Debug entries cleared');
    }
    // ===================================================================
    // CONSTRAINT DEBUGGING
    // ===================================================================
    /**
     * Trace constraint generation
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param operation - Operation that generated the constraint
     * @param variables - Variables involved in the constraint
     * @param coefficients - Coefficients in the constraint
     * @param sourceLocation - Optional source location information
     */
    traceConstraint(operation, variables, coefficients, sourceLocation) {
        if (!this._config.traceConstraints) {
            return;
        }
        const trace = {
            index: this._constraintTraces.length,
            operation,
            variables,
            coefficients,
            sourceLocation,
            timestamp: new Date().toISOString()
        };
        this._constraintTraces.push(trace);
        this.log(DebugLevel.TRACE, 'constraints', `Constraint generated: ${operation}`, {
            variables,
            coefficients,
            sourceLocation
        });
    }
    /**
     * Get constraint debug information
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Array of constraint debug information
     */
    async getConstraintDebugInfo() {
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Try to get constraint info from WASM
            const sparkyInstance = getSparkyInstance();
            const constraintInfo = [];
            // Combine trace data with WASM data if available
            for (const trace of this._constraintTraces) {
                const debugInfo = {
                    index: trace.index,
                    type: trace.operation,
                    variables: trace.variables,
                    coefficients: trace.coefficients,
                    sourceLocation: trace.sourceLocation,
                    optimizationHistory: [], // TODO: Get from optimization passes
                    isRedundant: false, // TODO: Analyze redundancy
                    properties: {
                        isLinear: true, // TODO: Analyze constraint type
                        isDegreeTwo: false,
                        isBoolean: false,
                        isSatisfiable: true
                    }
                };
                constraintInfo.push(debugInfo);
            }
            return constraintInfo;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(DebugLevel.ERROR, 'constraints', `Failed to get constraint debug info: ${errorMessage}`);
            return [];
        }
    }
    /**
     * Trace variable allocation
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param variableId - ID of the allocated variable
     * @param context - Context in which variable was allocated
     */
    traceVariable(variableId, context) {
        if (!this._config.traceVariables) {
            return;
        }
        if (!this._variableTraces.has(variableId)) {
            this._variableTraces.set(variableId, []);
        }
        const traces = this._variableTraces.get(variableId);
        traces.push(`${new Date().toISOString()}: ${context}`);
        this.log(DebugLevel.TRACE, 'variables', `Variable ${variableId} allocated in: ${context}`);
    }
    /**
     * Get variable trace history
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param variableId - Variable ID to get trace for
     * @returns Array of trace entries for the variable
     */
    getVariableTrace(variableId) {
        return this._variableTraces.get(variableId) || [];
    }
    // ===================================================================
    // PERFORMANCE AND MEMORY DEBUGGING
    // ===================================================================
    /**
     * Get memory usage statistics
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Memory usage statistics
     */
    getMemoryStats() {
        ensureSparkyBackend();
        const memUsage = process.memoryUsage();
        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            arrayBuffers: memUsage.arrayBuffers || 0
        };
    }
    /**
     * Generate debugging report
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Formatted debugging report
     */
    generateDebugReport() {
        ensureSparkyBackend();
        let report = '# Sparky Debug Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n`;
        report += `Debug Level: ${this._config.level}\n`;
        report += `Total Debug Entries: ${this._debugEntries.length}\n`;
        report += `Constraint Traces: ${this._constraintTraces.length}\n`;
        report += `Variable Traces: ${this._variableTraces.size}\n\n`;
        // Memory stats
        const memStats = this.getMemoryStats();
        report += '## Memory Usage\n';
        report += `- Heap Used: ${(memStats.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- Heap Total: ${(memStats.heapTotal / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- RSS: ${(memStats.rss / 1024 / 1024).toFixed(2)} MB\n\n`;
        // Recent debug entries by level
        const levels = [DebugLevel.ERROR, DebugLevel.WARN, DebugLevel.INFO];
        for (const level of levels) {
            const levelEntries = this.getDebugEntries(level, undefined, 10);
            if (levelEntries.length > 0) {
                report += `## Recent ${level.toUpperCase()} Messages\n`;
                for (const entry of levelEntries.slice(-5)) {
                    report += `- [${entry.timestamp}] ${entry.category}: ${entry.message}\n`;
                }
                report += '\n';
            }
        }
        // Constraint summary
        if (this._constraintTraces.length > 0) {
            report += '## Constraint Generation Summary\n';
            const operations = new Map();
            for (const trace of this._constraintTraces) {
                operations.set(trace.operation, (operations.get(trace.operation) || 0) + 1);
            }
            for (const [operation, count] of operations) {
                report += `- ${operation}: ${count} constraints\n`;
            }
            report += '\n';
        }
        return report;
    }
    // ===================================================================
    // PRIVATE HELPERS
    // ===================================================================
    /**
     * Create default debug configuration
     */
    createDefaultConfig() {
        return {
            level: DebugLevel.WARN,
            traceConstraints: false,
            traceVariables: false,
            traceOptimizations: false,
            traceWasmCalls: false,
            maxDebugEntries: 10000,
            categories: ['system', 'constraints', 'variables', 'optimizations', 'wasm']
        };
    }
    /**
     * Check if message should be logged based on level and category
     */
    shouldLog(level, category) {
        // Check if category is enabled
        if (!this._config.categories.includes(category)) {
            return false;
        }
        // Check debug level hierarchy
        const levelOrder = [
            DebugLevel.NONE,
            DebugLevel.ERROR,
            DebugLevel.WARN,
            DebugLevel.INFO,
            DebugLevel.DEBUG,
            DebugLevel.TRACE
        ];
        const currentLevelIndex = levelOrder.indexOf(this._config.level);
        const messageLevelIndex = levelOrder.indexOf(level);
        return messageLevelIndex <= currentLevelIndex && currentLevelIndex > 0;
    }
    /**
     * Check if message should be logged to console
     */
    shouldLogToConsole(level) {
        // Only log to console for higher priority levels
        return [DebugLevel.ERROR, DebugLevel.WARN, DebugLevel.INFO].includes(level);
    }
}
