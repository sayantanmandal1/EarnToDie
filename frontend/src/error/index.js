/**
 * Error Handling Module
 * Comprehensive error handling and stability system for the Zombie Car Game
 */

// Main integration
export { 
    default as ErrorHandlingIntegration,
    initializeErrorHandling,
    getErrorHandling,
    handleError
} from './ErrorHandlingIntegration.js';

// Core error handler
export { 
    default as ErrorHandler,
    GameError,
    CriticalGameError,
    AssetLoadingError,
    NetworkError,
    PerformanceError,
    WebGLContextLostError,
    MemoryError,
    JavaScriptError,
    PromiseRejectionError
} from './ErrorHandler.js';

// Network error handling
export { 
    default as NetworkErrorHandler,
    RobustAPIClient
} from './NetworkErrorHandler.js';

// Performance degradation handling
export { 
    default as PerformanceDegradationHandler
} from './PerformanceDegradationHandler.js';

// Robust asset loading
export { 
    default as RobustAssetLoader
} from './RobustAssetLoader.js';

// Crash recovery
export { 
    default as CrashRecoverySystem
} from './CrashRecoverySystem.js';

// Error reporting
export { 
    default as ErrorReportingSystem
} from './ErrorReportingSystem.js';

// Convenience exports for common use cases
export const ErrorTypes = {
    GAME_ERROR: 'GameError',
    CRITICAL_GAME_ERROR: 'CriticalGameError',
    ASSET_LOADING_ERROR: 'AssetLoadingError',
    NETWORK_ERROR: 'NetworkError',
    PERFORMANCE_ERROR: 'PerformanceError',
    WEBGL_CONTEXT_LOST_ERROR: 'WebGLContextLostError',
    MEMORY_ERROR: 'MemoryError',
    JAVASCRIPT_ERROR: 'JavaScriptError',
    PROMISE_REJECTION_ERROR: 'PromiseRejectionError'
};

export const RecoveryStrategies = {
    ASSET_LOADING_FAILURE: 'asset_loading_failure',
    NETWORK_ERROR: 'network_error',
    PERFORMANCE_DEGRADATION: 'performance_degradation',
    WEBGL_CONTEXT_LOST: 'webgl_context_lost',
    MEMORY_ERROR: 'memory_error'
};

export const QualityLevels = {
    ULTRA: 'ultra',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    POTATO: 'potato'
};

/**
 * Quick setup function for common error handling configuration
 */
export function setupErrorHandling(gameConfig = {}) {
    const options = {
        // Enable all systems by default
        enableErrorHandler: true,
        enableNetworkHandler: true,
        enablePerformanceHandler: true,
        enableAssetLoader: true,
        enableCrashRecovery: true,
        enableErrorReporting: true,

        // Error handler configuration
        errorHandler: {
            enableReporting: true,
            enableRecovery: true,
            maxErrorHistory: 100
        },

        // Network handler configuration
        networkHandler: {
            maxRetries: 3,
            baseDelay: 1000,
            timeoutMs: 10000
        },

        // Performance handler configuration
        performanceHandler: {
            targetFPS: gameConfig.targetFPS || 30,
            criticalFPS: gameConfig.criticalFPS || 15,
            enableAutoAdjustment: true
        },

        // Asset loader configuration
        assetLoader: {
            maxRetries: 3,
            enableFallbacks: true,
            enableCaching: true,
            cacheSize: 100
        },

        // Crash recovery configuration
        crashRecovery: {
            autoSaveInterval: 30000,
            enableHeartbeat: true,
            maxRecoveryAttempts: 3
        },

        // Error reporting configuration
        errorReporting: {
            endpoint: gameConfig.errorEndpoint || '/api/v1/errors',
            batchSize: 10,
            enableLocalStorage: true,
            enableUserFeedback: true,
            privacyMode: gameConfig.privacyMode || false
        },

        // Override with provided config
        ...gameConfig.errorHandling
    };

    return initializeErrorHandling(options);
}

/**
 * Create a game system provider interface
 */
export function createGameSystemProvider(name, getBasicState, getFullState, restoreState, validateState) {
    return {
        name,
        getBasicState: getBasicState || (() => ({})),
        getFullState: getFullState || getBasicState || (() => ({})),
        restoreState: restoreState || (() => Promise.resolve()),
        validateState: validateState || (() => true)
    };
}

/**
 * Utility function to wrap async functions with error handling
 */
export function withErrorHandling(asyncFn, context = {}) {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            await handleError(error, {
                ...context,
                function: asyncFn.name,
                arguments: args.length
            });
            throw error;
        }
    };
}

/**
 * Utility function to wrap event handlers with error handling
 */
export function withEventErrorHandling(eventHandler, context = {}) {
    return (event) => {
        try {
            return eventHandler(event);
        } catch (error) {
            handleError(error, {
                ...context,
                eventType: event.type,
                eventTarget: event.target?.tagName
            });
        }
    };
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring(fn, name) {
    return function(...args) {
        const start = performance.now();
        try {
            const result = fn.apply(this, args);
            
            // Handle async functions
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    const duration = performance.now() - start;
                    if (duration > 100) { // Log slow operations
                        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
                    }
                });
            }
            
            const duration = performance.now() - start;
            if (duration > 50) { // Log slow sync operations
                console.warn(`Slow sync operation: ${name} took ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            handleError(error, {
                function: name,
                duration: duration,
                source: 'performance_monitoring'
            });
            throw error;
        }
    };
}

export default {
    ErrorHandlingIntegration,
    initializeErrorHandling,
    getErrorHandling,
    handleError,
    setupErrorHandling,
    createGameSystemProvider,
    withErrorHandling,
    withEventErrorHandling,
    withPerformanceMonitoring,
    ErrorTypes,
    RecoveryStrategies,
    QualityLevels
};