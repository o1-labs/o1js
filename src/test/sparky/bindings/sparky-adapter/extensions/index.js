"use strict";
/**
 * Sparky Extensions Index
 *
 * Central registry for all Sparky-specific extension modules.
 * Extensions are only available when Sparky backend is active.
 *
 * Created: July 6, 2025 12:45 PM UTC
 * Last Modified: July 6, 2025 12:45 PM UTC
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparkyDebuggingExtensions = exports.SparkyPerformanceExtensions = exports.SparkyOptimizationExtensions = exports.ensureExtensionAvailable = exports.ensureSparkyBackend = exports.isExtensionAvailable = exports.getAvailableExtensions = exports.getExtension = exports.getSparkyExtensions = exports.cleanupExtensions = exports.initializeExtensions = void 0;
const optimization_js_1 = require("./optimization.js");
const performance_js_1 = require("./performance.js");
const debugging_js_1 = require("./debugging.js");
const backend_routing_js_1 = require("../backend-routing.js");
// ===================================================================
// EXTENSION INSTANCES
// ===================================================================
let optimizationExtensions = null;
let performanceExtensions = null;
let debuggingExtensions = null;
// ===================================================================
// EXTENSION LIFECYCLE
// ===================================================================
/**
 * Initialize all extension modules
 * Called when Sparky backend becomes active
 */
function initializeExtensions() {
    if ((0, backend_routing_js_1.getCurrentBackendType)() !== 'sparky') {
        throw new Error('Extensions can only be initialized when Sparky backend is active');
    }
    optimizationExtensions = new optimization_js_1.SparkyOptimizationExtensions();
    performanceExtensions = new performance_js_1.SparkyPerformanceExtensions();
    debuggingExtensions = new debugging_js_1.SparkyDebuggingExtensions();
}
exports.initializeExtensions = initializeExtensions;
/**
 * Cleanup all extension modules
 * Called when switching away from Sparky backend
 */
function cleanupExtensions() {
    optimizationExtensions?.cleanup?.();
    performanceExtensions?.cleanup?.();
    debuggingExtensions?.cleanup?.();
    optimizationExtensions = null;
    performanceExtensions = null;
    debuggingExtensions = null;
}
exports.cleanupExtensions = cleanupExtensions;
// ===================================================================
// EXTENSION ACCESS API
// ===================================================================
/**
 * Get all available Sparky extensions
 * Returns null if Sparky backend is not active
 *
 * @extension This function is only available with Sparky backend
 * @returns Complete extension interface or null
 */
function getSparkyExtensions() {
    if ((0, backend_routing_js_1.getCurrentBackendType)() !== 'sparky') {
        return null;
    }
    if (!optimizationExtensions || !performanceExtensions || !debuggingExtensions) {
        initializeExtensions();
    }
    return {
        optimization: optimizationExtensions,
        performance: performanceExtensions,
        debugging: debuggingExtensions
    };
}
exports.getSparkyExtensions = getSparkyExtensions;
/**
 * Get specific extension category
 *
 * @extension This function is only available with Sparky backend
 * @param category - Extension category to retrieve
 * @returns Extension instance or null if not available
 */
function getExtension(category) {
    if ((0, backend_routing_js_1.getCurrentBackendType)() !== 'sparky') {
        return null;
    }
    const extensions = getSparkyExtensions();
    if (!extensions) {
        return null;
    }
    return extensions[category];
}
exports.getExtension = getExtension;
/**
 * Check which extension categories are available
 *
 * @returns Array of available extension category names
 */
function getAvailableExtensions() {
    if ((0, backend_routing_js_1.getCurrentBackendType)() !== 'sparky') {
        return [];
    }
    return ['optimization', 'performance', 'debugging'];
}
exports.getAvailableExtensions = getAvailableExtensions;
/**
 * Check if a specific extension category is available
 *
 * @param category - Extension category to check
 * @returns True if extension is available
 */
function isExtensionAvailable(category) {
    return getAvailableExtensions().includes(category);
}
exports.isExtensionAvailable = isExtensionAvailable;
// ===================================================================
// RUNTIME VALIDATION
// ===================================================================
/**
 * Ensure Sparky backend is active (used by extension methods)
 * @internal
 */
function ensureSparkyBackend() {
    if ((0, backend_routing_js_1.getCurrentBackendType)() !== 'sparky') {
        throw new Error('This extension method requires Sparky backend. Use switchBackend("sparky") first.');
    }
}
exports.ensureSparkyBackend = ensureSparkyBackend;
/**
 * Ensure specific extension is available
 * @internal
 */
function ensureExtensionAvailable(category) {
    ensureSparkyBackend();
    if (!isExtensionAvailable(category)) {
        throw new Error(`Extension category '${category}' is not available`);
    }
}
exports.ensureExtensionAvailable = ensureExtensionAvailable;
// ===================================================================
// EXPORTS
// ===================================================================
// Export individual extension classes
var optimization_js_2 = require("./optimization.js");
Object.defineProperty(exports, "SparkyOptimizationExtensions", { enumerable: true, get: function () { return optimization_js_2.SparkyOptimizationExtensions; } });
var performance_js_2 = require("./performance.js");
Object.defineProperty(exports, "SparkyPerformanceExtensions", { enumerable: true, get: function () { return performance_js_2.SparkyPerformanceExtensions; } });
var debugging_js_2 = require("./debugging.js");
Object.defineProperty(exports, "SparkyDebuggingExtensions", { enumerable: true, get: function () { return debugging_js_2.SparkyDebuggingExtensions; } });
// Export extension types
__exportStar(require("./types.js"), exports);
