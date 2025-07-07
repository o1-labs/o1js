/**
 * Sparky Performance Extensions
 *
 * EXTENSION METHODS: Sparky-specific performance monitoring and profiling.
 * These methods are NOT part of the original Snarky API and only available
 * when Sparky backend is active.
 *
 * Created: July 6, 2025 12:52 PM UTC
 * Last Modified: July 6, 2025 12:52 PM UTC
 */
import { PerformanceCategory, PerformanceError } from './types.js';
import { ensureSparkyBackend } from './index.js';
// ===================================================================
// PERFORMANCE MEASUREMENT STORAGE
// ===================================================================
/**
 * Ring buffer for storing performance measurements
 */
class PerformanceRingBuffer {
    constructor(capacity) {
        this.capacity = capacity;
        this.head = 0;
        this.size = 0;
        this.buffer = new Array(capacity);
    }
    push(measurement) {
        this.buffer[this.head] = measurement;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
    }
    getAll() {
        if (this.size === 0)
            return [];
        const result = [];
        for (let i = 0; i < this.size; i++) {
            const index = (this.head - this.size + i + this.capacity) % this.capacity;
            result.push(this.buffer[index]);
        }
        return result;
    }
    clear() {
        this.head = 0;
        this.size = 0;
    }
    getCapacity() {
        return this.capacity;
    }
    setCapacity(newCapacity) {
        if (newCapacity <= 0) {
            throw new Error('Capacity must be positive');
        }
        const currentData = this.getAll();
        this.buffer = new Array(newCapacity);
        this.capacity = newCapacity;
        this.head = 0;
        this.size = 0;
        // Restore as much data as possible
        const dataToRestore = currentData.slice(-newCapacity);
        for (const measurement of dataToRestore) {
            this.push(measurement);
        }
    }
}
// ===================================================================
// SPARKY PERFORMANCE EXTENSIONS CLASS
// ===================================================================
/**
 * Sparky Performance Extensions
 *
 * EXTENSION CLASS: Provides Sparky-specific performance monitoring features.
 * All methods in this class are EXTENSION METHODS, not part of original Snarky API.
 *
 * @extension This entire class is a Sparky extension
 */
export class SparkyPerformanceExtensions {
    constructor() {
        this.name = 'SparkyPerformance';
        this.version = '1.0.0';
        this._isActive = false;
        this._startTimes = new Map();
        this._config = this.createDefaultConfig();
        this._measurements = new PerformanceRingBuffer(this._config.maxMeasurements);
    }
    // ===================================================================
    // EXTENSION LIFECYCLE
    // ===================================================================
    get isActive() {
        return this._isActive;
    }
    /**
     * Initialize performance extensions
     *
     * @extension This method is Sparky-specific
     */
    async initialize() {
        ensureSparkyBackend();
        try {
            this._isActive = true;
            console.log('✅ Sparky performance monitoring initialized');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new PerformanceError(`Failed to initialize performance extensions: ${errorMessage}`, 'INIT_FAILED');
        }
    }
    /**
     * Cleanup performance extensions
     *
     * @extension This method is Sparky-specific
     */
    async cleanup() {
        this._isActive = false;
        this._measurements.clear();
        this._startTimes.clear();
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
            measurementCount: this._measurements.getAll().length,
            activeOperations: this._startTimes.size
        };
    }
    // ===================================================================
    // PERFORMANCE MONITORING CONTROL
    // ===================================================================
    /**
     * Enable performance monitoring
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param config - Optional performance monitoring configuration
     */
    async enableMonitoring(config) {
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        if (config) {
            this.updateConfig(config);
        }
        this._config.enabled = true;
        console.log('✅ Sparky performance monitoring enabled');
    }
    /**
     * Disable performance monitoring
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     */
    async disableMonitoring() {
        ensureSparkyBackend();
        this._config.enabled = false;
        console.log('✅ Sparky performance monitoring disabled');
    }
    /**
     * Check if performance monitoring is enabled
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns True if monitoring is enabled
     */
    isMonitoringEnabled() {
        return this._config.enabled;
    }
    /**
     * Update performance monitoring configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param config - Partial configuration to update
     */
    updateConfig(config) {
        ensureSparkyBackend();
        const oldMaxMeasurements = this._config.maxMeasurements;
        this._config = { ...this._config, ...config };
        // Update ring buffer capacity if changed
        if (config.maxMeasurements && config.maxMeasurements !== oldMaxMeasurements) {
            this._measurements.setCapacity(config.maxMeasurements);
        }
        console.log('✅ Sparky performance configuration updated');
    }
    /**
     * Get current performance configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current configuration
     */
    getConfig() {
        return { ...this._config };
    }
    // ===================================================================
    // PERFORMANCE MEASUREMENT
    // ===================================================================
    /**
     * Start timing an operation
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param operationId - Unique identifier for the operation
     * @param category - Performance category
     * @param operation - Operation name
     */
    startTiming(operationId, category, operation) {
        ensureSparkyBackend();
        if (!this._config.enabled || !this.shouldSample()) {
            return;
        }
        if (!this._config.categories.includes(category)) {
            return;
        }
        const timeNs = process.hrtime.bigint();
        const memoryBytes = this._config.detailedMemoryProfiling
            ? process.memoryUsage().heapUsed
            : 0;
        this._startTimes.set(operationId, { timeNs, memoryBytes });
    }
    /**
     * End timing an operation and record measurement
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param operationId - Unique identifier for the operation
     * @param category - Performance category
     * @param operation - Operation name
     * @param operationCount - Number of operations performed (default: 1)
     * @param metadata - Additional metadata to record
     */
    endTiming(operationId, category, operation, operationCount = 1, metadata) {
        ensureSparkyBackend();
        if (!this._config.enabled) {
            return;
        }
        const startData = this._startTimes.get(operationId);
        if (!startData) {
            return; // Timing wasn't started or sampling skipped
        }
        this._startTimes.delete(operationId);
        const endTimeNs = process.hrtime.bigint();
        const endMemoryBytes = this._config.detailedMemoryProfiling
            ? process.memoryUsage().heapUsed
            : 0;
        const timeNs = Number(endTimeNs - startData.timeNs);
        const memoryDeltaBytes = endMemoryBytes - startData.memoryBytes;
        const operationsPerSecond = operationCount > 0
            ? (operationCount * 1000000000) / timeNs
            : 0;
        const measurement = {
            category,
            operation,
            timeNs,
            memoryDeltaBytes,
            operationCount,
            operationsPerSecond,
            timestamp: new Date().toISOString(),
            metadata
        };
        this._measurements.push(measurement);
    }
    /**
     * Record a one-shot performance measurement
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param category - Performance category
     * @param operation - Operation name
     * @param timeNs - Execution time in nanoseconds
     * @param operationCount - Number of operations performed
     * @param memoryDeltaBytes - Memory usage change in bytes
     * @param metadata - Additional metadata
     */
    recordMeasurement(category, operation, timeNs, operationCount = 1, memoryDeltaBytes = 0, metadata) {
        ensureSparkyBackend();
        if (!this._config.enabled || !this.shouldSample()) {
            return;
        }
        if (!this._config.categories.includes(category)) {
            return;
        }
        const operationsPerSecond = operationCount > 0
            ? (operationCount * 1000000000) / timeNs
            : 0;
        const measurement = {
            category,
            operation,
            timeNs,
            memoryDeltaBytes,
            operationCount,
            operationsPerSecond,
            timestamp: new Date().toISOString(),
            metadata
        };
        this._measurements.push(measurement);
    }
    // ===================================================================
    // PERFORMANCE ANALYSIS
    // ===================================================================
    /**
     * Get all performance measurements
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param category - Optional category filter
     * @returns Array of performance measurements
     */
    getMeasurements(category) {
        ensureSparkyBackend();
        const allMeasurements = this._measurements.getAll();
        if (category) {
            return allMeasurements.filter(m => m.category === category);
        }
        return allMeasurements;
    }
    /**
     * Get performance statistics for a specific operation
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param operation - Operation name to analyze
     * @param category - Optional category filter
     * @returns Performance statistics
     */
    getOperationStats(operation, category) {
        ensureSparkyBackend();
        const measurements = this.getMeasurements(category)
            .filter(m => m.operation === operation);
        if (measurements.length === 0) {
            return null;
        }
        const times = measurements.map(m => m.timeNs);
        const totalOperations = measurements.reduce((sum, m) => sum + m.operationCount, 0);
        const totalTime = times.reduce((sum, time) => sum + time, 0);
        return {
            operation,
            category,
            count: measurements.length,
            averageTimeNs: totalTime / measurements.length,
            minTimeNs: Math.min(...times),
            maxTimeNs: Math.max(...times),
            totalTimeNs: totalTime,
            averageOpsPerSec: totalOperations > 0 ? (totalOperations * 1000000000) / totalTime : 0,
            totalOperations
        };
    }
    /**
     * Clear all performance measurements
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     */
    clearMeasurements() {
        ensureSparkyBackend();
        this._measurements.clear();
        console.log('✅ Sparky performance measurements cleared');
    }
    /**
     * Generate performance report
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Formatted performance report
     */
    generateReport() {
        ensureSparkyBackend();
        const measurements = this._measurements.getAll();
        if (measurements.length === 0) {
            return 'No performance measurements available';
        }
        const categories = [...new Set(measurements.map(m => m.category))];
        const operations = [...new Set(measurements.map(m => m.operation))];
        let report = '# Sparky Performance Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n`;
        report += `Total measurements: ${measurements.length}\n`;
        report += `Categories: ${categories.join(', ')}\n`;
        report += `Operations: ${operations.length}\n\n`;
        for (const category of categories) {
            report += `## ${category}\n\n`;
            const categoryOps = [...new Set(measurements
                    .filter(m => m.category === category)
                    .map(m => m.operation))];
            for (const operation of categoryOps) {
                const stats = this.getOperationStats(operation, category);
                if (stats) {
                    report += `### ${operation}\n`;
                    report += `- Count: ${stats.count}\n`;
                    report += `- Average time: ${(stats.averageTimeNs / 1000000).toFixed(2)}ms\n`;
                    report += `- Min time: ${(stats.minTimeNs / 1000000).toFixed(2)}ms\n`;
                    report += `- Max time: ${(stats.maxTimeNs / 1000000).toFixed(2)}ms\n`;
                    report += `- Average ops/sec: ${Math.round(stats.averageOpsPerSec).toLocaleString()}\n`;
                    report += `- Total operations: ${stats.totalOperations.toLocaleString()}\n\n`;
                }
            }
        }
        return report;
    }
    // ===================================================================
    // PRIVATE HELPERS
    // ===================================================================
    /**
     * Create default performance configuration
     */
    createDefaultConfig() {
        return {
            enabled: false,
            categories: Object.values(PerformanceCategory),
            maxMeasurements: 10000,
            samplingRate: 1.0,
            detailedMemoryProfiling: false
        };
    }
    /**
     * Determine if current operation should be sampled
     */
    shouldSample() {
        return Math.random() < this._config.samplingRate;
    }
}
