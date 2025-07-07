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
import { OptimizationLevel, OptimizationError } from './types.js';
import { ensureSparkyBackend } from './index.js';
import { getSparkyInstance } from '../module-loader.js';
// ===================================================================
// PREDEFINED OPTIMIZATION CONFIGURATIONS
// ===================================================================
/**
 * Predefined optimization configurations for common use cases
 */
const OPTIMIZATION_PRESETS = {
    [OptimizationLevel.NONE]: {
        eliminateZeroConstraints: false,
        eliminateIdentityConstraints: false,
        detectVariableSubstitution: false,
        algebraicSimplification: false,
        constraintBatching: false,
        coefficientOptimization: false,
        semanticConstraintPreservation: false
    },
    [OptimizationLevel.BASIC]: {
        eliminateZeroConstraints: true,
        eliminateIdentityConstraints: true,
        detectVariableSubstitution: false,
        algebraicSimplification: true,
        constraintBatching: false,
        coefficientOptimization: false,
        semanticConstraintPreservation: true
    },
    [OptimizationLevel.AGGRESSIVE]: {
        eliminateZeroConstraints: true,
        eliminateIdentityConstraints: true,
        detectVariableSubstitution: true,
        algebraicSimplification: true,
        constraintBatching: true,
        coefficientOptimization: true,
        semanticConstraintPreservation: true
    },
    [OptimizationLevel.CUSTOM]: {
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
export class SparkyOptimizationExtensions {
    constructor() {
        this.name = 'SparkyOptimization';
        this.version = '1.0.0';
        this._isActive = false;
        this._currentLevel = OptimizationLevel.AGGRESSIVE;
        this._customConfig = { ...OPTIMIZATION_PRESETS.custom };
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
        ensureSparkyBackend();
        try {
            // Get current optimization mode from WASM
            const sparkyInstance = getSparkyInstance();
            if (sparkyInstance && sparkyInstance.getOptimizationMode) {
                const currentMode = sparkyInstance.getOptimizationMode();
                this._currentLevel = this.wasmModeToLevel(currentMode);
            }
            this._isActive = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new OptimizationError(`Failed to initialize optimization extensions: ${errorMessage}`, 'INIT_FAILED');
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
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            const config = level === OptimizationLevel.CUSTOM
                ? this._customConfig
                : OPTIMIZATION_PRESETS[level];
            // Update WASM optimization mode
            const sparkyInstance = getSparkyInstance();
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
            throw new OptimizationError(`Failed to set optimization level to ${level}: ${errorMessage}`, 'LEVEL_SET_FAILED');
        }
    }
    /**
     * Get current optimization level
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current optimization level
     */
    async getOptimizationLevel() {
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        // Sync with WASM state in case it changed externally
        try {
            const sparkyInstance = getSparkyInstance();
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
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Validate configuration
            this.validateOptimizationConfig(config);
            // Merge with current custom config
            this._customConfig = { ...this._customConfig, ...config };
            // Apply if currently using custom level
            if (this._currentLevel === OptimizationLevel.CUSTOM) {
                await this.setOptimizationLevel(OptimizationLevel.CUSTOM);
            }
            console.log('✅ Sparky custom optimization configuration updated');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new OptimizationError(`Failed to set custom optimization config: ${errorMessage}`, 'CUSTOM_CONFIG_FAILED');
        }
    }
    /**
     * Get current optimization configuration
     *
     * @extension This method is Sparky-specific and NOT part of original Snarky API
     * @returns Current optimization configuration
     */
    async getOptimizationConfig() {
        ensureSparkyBackend();
        const level = await this.getOptimizationLevel();
        return level === OptimizationLevel.CUSTOM
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
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Try to get updated stats from WASM
            const sparkyInstance = getSparkyInstance();
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
        ensureSparkyBackend();
        if (!this._isActive) {
            await this.initialize();
        }
        try {
            // Reset WASM stats if available
            const sparkyInstance = getSparkyInstance();
            if (sparkyInstance && sparkyInstance.resetOptimizationStats) {
                sparkyInstance.resetOptimizationStats();
            }
            this._stats = this.createEmptyStats();
            console.log('✅ Sparky optimization statistics reset');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new OptimizationError(`Failed to reset optimization stats: ${errorMessage}`, 'STATS_RESET_FAILED');
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
                level: OptimizationLevel.NONE,
                description: 'No optimizations - preserve all constraints as generated',
                config: { ...OPTIMIZATION_PRESETS.none }
            },
            {
                level: OptimizationLevel.BASIC,
                description: 'Basic optimizations - algebraic simplification and redundancy elimination',
                config: { ...OPTIMIZATION_PRESETS.basic }
            },
            {
                level: OptimizationLevel.AGGRESSIVE,
                description: 'Full optimization pipeline - maximum constraint reduction',
                config: { ...OPTIMIZATION_PRESETS.aggressive }
            },
            {
                level: OptimizationLevel.CUSTOM,
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
            case OptimizationLevel.NONE:
                return 'none';
            case OptimizationLevel.BASIC:
                return 'basic';
            case OptimizationLevel.AGGRESSIVE:
                return 'aggressive';
            case OptimizationLevel.CUSTOM:
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
                return OptimizationLevel.NONE;
            case 'basic':
                return OptimizationLevel.BASIC;
            case 'aggressive':
                return OptimizationLevel.AGGRESSIVE;
            case 'custom':
                return OptimizationLevel.CUSTOM;
            default:
                return OptimizationLevel.AGGRESSIVE;
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
                throw new OptimizationError(`Invalid optimization config key: ${key}`, 'INVALID_CONFIG_KEY');
            }
            if (typeof config[key] !== 'boolean') {
                throw new OptimizationError(`Optimization config value for ${key} must be boolean`, 'INVALID_CONFIG_VALUE');
            }
        }
    }
}
