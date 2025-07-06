"use strict";
/**
 * Sparky Optimization Extensions
 *
 * EXTENSION METHODS: Sparky-specific optimization level control and configuration.
 * These methods are NOT part of the original Snarky API and only available
 * when Sparky backend is active.
 *
 * Created: July 6, 2025 12:49 PM UTC
 * Last Modified: July 6, 2025 12:49 PM UTC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparkyOptimizationExtensions = void 0;
const types_js_1 = require("./types.js");
const index_js_1 = require("./index.js");
const module_loader_js_1 = require("../module-loader.js");
// ===================================================================
// PREDEFINED OPTIMIZATION CONFIGURATIONS
// ===================================================================
/**
 * Predefined optimization configurations for common use cases
 */
const OPTIMIZATION_PRESETS = {
    [types_js_1.OptimizationLevel.NONE]: {
        eliminateZeroConstraints: false,
        eliminateIdentityConstraints: false,
        detectVariableSubstitution: false,
        algebraicSimplification: false,
        constraintBatching: false,
        coefficientOptimization: false,
        semanticConstraintPreservation: false
    },
    [types_js_1.OptimizationLevel.BASIC]: {
        eliminateZeroConstraints: true,
        eliminateIdentityConstraints: true,
        detectVariableSubstitution: false,
        algebraicSimplification: true,
        constraintBatching: false,
        coefficientOptimization: false,
        semanticConstraintPreservation: true
    },
    [types_js_1.OptimizationLevel.AGGRESSIVE]: {
        eliminateZeroConstraints: true,
        eliminateIdentityConstraints: true,
        detectVariableSubstitution: true,
        algebraicSimplification: true,
        constraintBatching: true,
        coefficientOptimization: true,
        semanticConstraintPreservation: true
    },
    [types_js_1.OptimizationLevel.CUSTOM]: {
        // Will be overridden by user configuration
        eliminateZeroConstraints: true,
        eliminateIdentityConstraints: true,
        detectVariableSubstitution: false,
        algebraicSimplification: true,
        constraintBatching: false,
        coefficientOptimization: false,
        semanticConstraintPreservation: true
    }
};
// ===================================================================
// SPARKY OPTIMIZATION EXTENSIONS CLASS
// ===================================================================
/**
 * Sparky Optimization Extensions
 *
 * EXTENSION CLASS: Provides Sparky-specific optimization control features.
 * All methods in this class are EXTENSION METHODS, not part of original Snarky API.
 *
 * @extension This entire class is a Sparky extension
 */
class SparkyOptimizationExtensions {
    name = 'SparkyOptimization';
    version = '1.0.0';
    _isActive = false;
    _currentLevel = types_js_1.OptimizationLevel.AGGRESSIVE;
    _customConfig = { ...OPTIMIZATION_PRESETS.custom };
    _stats;
    constructor() {
        this._stats = this.createEmptyStats();
    }
    // ===================================================================
    // EXTENSION LIFECYCLE
    // ===================================================================
    get isActive() {
        return this._isActive;
    }
    /**
     * Initialize optimization extensions
     *
     * @extension This method is Sparky-specific
     */
    async initialize() {
        (0, index_js_1.ensureSparkyBackend)();
        try {
            // Get current optimization mode from WASM
            const sparkyInstance = (0, module_loader_js_1.getSparkyInstance)();
            if (sparkyInstance && sparkyInstance.getOptimizationMode) {
                const currentMode = sparkyInstance.getOptimizationMode();
                this._currentLevel = this.wasmModeToLevel(currentMode);
            }
            this._isActive = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new types_js_1.OptimizationError(`Failed to initialize optimization extensions: ${errorMessage}`, 'INIT_FAILED');
        }
    }
    /**
     * Cleanup optimization extensions
     *
     * @extension This method is Sparky-specific
     */
    async cleanup() {
        this._isActive = false;
        this._stats = this.createEmptyStats();
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
            lastActivity: this._stats.lastOptimizationTime,
            currentLevel: this._currentLevel
        };
    }
    // ===================================================================
    // OPTIMIZATION LEVEL CONTROL
    // ===================================================================
    /**
     * Set optimization level for constraint generation
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param level - Optimization level to apply
     * @throws OptimizationError if level change fails
     */
    async setOptimizationLevel(level) {
        (0, index_js_1.ensureSparkyBackend)();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            const config = level === types_js_1.OptimizationLevel.CUSTOM
                ? this._customConfig
                : OPTIMIZATION_PRESETS[level];
            // Update WASM optimization mode
            const sparkyInstance = (0, module_loader_js_1.getSparkyInstance)();
            if (sparkyInstance && sparkyInstance.setOptimizationMode) {
                const wasmMode = this.levelToWasmMode(level);
                sparkyInstance.setOptimizationMode(wasmMode);
            }
            this._currentLevel = level;
            this.updateStatsConfig(config);
            console.log(`✅ Sparky optimization level set to: ${level}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new types_js_1.OptimizationError(`Failed to set optimization level to ${level}: ${errorMessage}`, 'LEVEL_SET_FAILED');
        }
    }
    /**
     * Get current optimization level
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current optimization level
     */
    async getOptimizationLevel() {
        (0, index_js_1.ensureSparkyBackend)();
        if (!this._isActive) {
            await this.initialize();
        }
        // Sync with WASM state in case it changed externally
        try {
            const sparkyInstance = (0, module_loader_js_1.getSparkyInstance)();
            if (sparkyInstance && sparkyInstance.getOptimizationMode) {
                const wasmMode = sparkyInstance.getOptimizationMode();
                this._currentLevel = this.wasmModeToLevel(wasmMode);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to sync optimization level with WASM:', errorMessage);
        }
        return this._currentLevel;
    }
    /**
     * Set custom optimization configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @param config - Custom optimization configuration
     * @throws OptimizationError if configuration is invalid
     */
    async setCustomConfig(config) {
        (0, index_js_1.ensureSparkyBackend)();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Validate configuration
            this.validateOptimizationConfig(config);
            // Merge with current custom config
            this._customConfig = { ...this._customConfig, ...config };
            // Apply if currently using custom level
            if (this._currentLevel === types_js_1.OptimizationLevel.CUSTOM) {
                await this.setOptimizationLevel(types_js_1.OptimizationLevel.CUSTOM);
            }
            console.log('✅ Sparky custom optimization configuration updated');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new types_js_1.OptimizationError(`Failed to set custom optimization config: ${errorMessage}`, 'CUSTOM_CONFIG_FAILED');
        }
    }
    /**
     * Get current optimization configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current optimization configuration
     */
    async getOptimizationConfig() {
        (0, index_js_1.ensureSparkyBackend)();
        const level = await this.getOptimizationLevel();
        return level === types_js_1.OptimizationLevel.CUSTOM
            ? { ...this._customConfig }
            : { ...OPTIMIZATION_PRESETS[level] };
    }
    // ===================================================================
    // OPTIMIZATION STATISTICS
    // ===================================================================
    /**
     * Get optimization statistics and performance metrics
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Detailed optimization statistics
     */
    async getOptimizationStats() {
        (0, index_js_1.ensureSparkyBackend)();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Try to get updated stats from WASM
            const sparkyInstance = (0, module_loader_js_1.getSparkyInstance)();
            if (sparkyInstance && sparkyInstance.getOptimizationStats) {
                const wasmStats = sparkyInstance.getOptimizationStats();
                this.updateStatsFromWasm(wasmStats);
            }
            return { ...this._stats };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to get optimization stats from WASM:', errorMessage);
            return { ...this._stats };
        }
    }
    /**
     * Reset optimization statistics
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     */
    async resetOptimizationStats() {
        (0, index_js_1.ensureSparkyBackend)();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Reset WASM stats if available
            const sparkyInstance = (0, module_loader_js_1.getSparkyInstance)();
            if (sparkyInstance && sparkyInstance.resetOptimizationStats) {
                sparkyInstance.resetOptimizationStats();
            }
            this._stats = this.createEmptyStats();
            console.log('✅ Sparky optimization statistics reset');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new types_js_1.OptimizationError(`Failed to reset optimization stats: ${errorMessage}`, 'STATS_RESET_FAILED');
        }
    }
    // ===================================================================
    // OPTIMIZATION PRESETS
    // ===================================================================
    /**
     * Get available optimization level presets
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Available optimization levels with descriptions
     */
    getAvailablePresets() {
        return [
            {
                level: types_js_1.OptimizationLevel.NONE,
                description: 'No optimizations - preserve all constraints as generated',
                config: { ...OPTIMIZATION_PRESETS.none }
            },
            {
                level: types_js_1.OptimizationLevel.BASIC,
                description: 'Basic optimizations - algebraic simplification and redundancy elimination',
                config: { ...OPTIMIZATION_PRESETS.basic }
            },
            {
                level: types_js_1.OptimizationLevel.AGGRESSIVE,
                description: 'Full optimization pipeline - maximum constraint reduction',
                config: { ...OPTIMIZATION_PRESETS.aggressive }
            },
            {
                level: types_js_1.OptimizationLevel.CUSTOM,
                description: 'User-defined custom optimization configuration',
                config: { ...this._customConfig }
            }
        ];
    }
    // ===================================================================
    // PRIVATE HELPERS
    // ===================================================================
    /**
     * Convert optimization level to WASM optimization mode string
     */
    levelToWasmMode(level) {
        switch (level) {
            case types_js_1.OptimizationLevel.NONE:
                return 'none';
            case types_js_1.OptimizationLevel.BASIC:
                return 'basic';
            case types_js_1.OptimizationLevel.AGGRESSIVE:
                return 'aggressive';
            case types_js_1.OptimizationLevel.CUSTOM:
                return 'custom';
            default:
                return 'aggressive';
        }
    }
    /**
     * Convert WASM optimization mode string to optimization level
     */
    wasmModeToLevel(mode) {
        switch (mode) {
            case 'none':
                return types_js_1.OptimizationLevel.NONE;
            case 'basic':
                return types_js_1.OptimizationLevel.BASIC;
            case 'aggressive':
                return types_js_1.OptimizationLevel.AGGRESSIVE;
            case 'custom':
                return types_js_1.OptimizationLevel.CUSTOM;
            default:
                return types_js_1.OptimizationLevel.AGGRESSIVE;
        }
    }
    /**
     * Create empty optimization statistics
     */
    createEmptyStats() {
        return {
            level: this._currentLevel,
            config: { ...this._customConfig },
            constraintsBefore: 0,
            constraintsAfter: 0,
            constraintsEliminated: 0,
            effectiveness: 0,
            optimizationTimeMs: 0,
            memoryStats: {
                peakMemoryBytes: 0,
                currentMemoryBytes: 0
            },
            passStats: {},
            lastOptimizationTime: new Date().toISOString()
        };
    }
    /**
     * Update stats configuration
     */
    updateStatsConfig(config) {
        this._stats.level = this._currentLevel;
        this._stats.config = { ...config };
        this._stats.lastOptimizationTime = new Date().toISOString();
    }
    /**
     * Update statistics from WASM data
     */
    updateStatsFromWasm(wasmStats) {
        if (!wasmStats)
            return;
        // Map WASM stats to our interface
        if (typeof wasmStats.constraints_before === 'number') {
            this._stats.constraintsBefore = wasmStats.constraints_before;
        }
        if (typeof wasmStats.constraints_after === 'number') {
            this._stats.constraintsAfter = wasmStats.constraints_after;
        }
        if (typeof wasmStats.constraints_eliminated === 'number') {
            this._stats.constraintsEliminated = wasmStats.constraints_eliminated;
        }
        if (typeof wasmStats.optimization_time_ms === 'number') {
            this._stats.optimizationTimeMs = wasmStats.optimization_time_ms;
        }
        // Calculate effectiveness
        if (this._stats.constraintsBefore > 0) {
            this._stats.effectiveness = Math.round((this._stats.constraintsEliminated / this._stats.constraintsBefore) * 100);
        }
    }
    /**
     * Validate optimization configuration
     */
    validateOptimizationConfig(config) {
        const validKeys = [
            'eliminateZeroConstraints',
            'eliminateIdentityConstraints',
            'detectVariableSubstitution',
            'algebraicSimplification',
            'constraintBatching',
            'coefficientOptimization',
            'semanticConstraintPreservation'
        ];
        for (const key of Object.keys(config)) {
            if (!validKeys.includes(key)) {
                throw new types_js_1.OptimizationError(`Invalid optimization config key: ${key}`, 'INVALID_CONFIG_KEY');
            }
            if (typeof config[key] !== 'boolean') {
                throw new types_js_1.OptimizationError(`Optimization config value for ${key} must be boolean`, 'INVALID_CONFIG_VALUE');
            }
        }
    }
}
exports.SparkyOptimizationExtensions = SparkyOptimizationExtensions;
