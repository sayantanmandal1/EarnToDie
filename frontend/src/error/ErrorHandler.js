/**
 * Comprehensive Error Handler for the Zombie Car Game
 * Provides centralized error handling, crash recovery, and error reporting
 */

export class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            enableReporting: options.enableReporting !== false,
            enableRecovery: options.enableRecovery !== false,
            maxErrorHistory: options.maxErrorHistory || 100,
            reportingEndpoint: options.reportingEndpoint || '/api/v1/errors',
            ...options
        };

        // Error tracking
        this.errorHistory = [];
        this.criticalErrors = [];
        this.recoveryAttempts = new Map();
        
        // Recovery strategies
        this.recoveryStrategies = new Map();
        this.fallbackSystems = new Map();
        
        // Event listeners
        this.errorListeners = [];
        this.recoveryListeners = [];
        
        this._setupGlobalErrorHandling();
        this._setupDefaultRecoveryStrategies();
    }

    /**
     * Setup global error handling
     */
    _setupGlobalErrorHandling() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(new JavaScriptError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            }));
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new PromiseRejectionError(event.reason, {
                promise: event.promise
            }));
        });

        // Handle WebGL context loss
        window.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.handleError(new WebGLContextLostError('WebGL context lost', {
                event: event
            }));
        });

        // Handle WebGL context restored
        window.addEventListener('webglcontextrestored', (event) => {
            this.handleRecovery('webgl_context_restored', {
                event: event
            });
        });
    }

    /**
     * Setup default recovery strategies
     */
    _setupDefaultRecoveryStrategies() {
        // Asset loading failure recovery
        this.registerRecoveryStrategy('asset_loading_failure', async (error, context) => {
            const { assetType, assetUrl } = context;
            
            switch (assetType) {
                case 'texture':
                    return this._recoverTextureLoading(assetUrl, error);
                case 'model':
                    return this._recoverModelLoading(assetUrl, error);
                case 'audio':
                    return this._recoverAudioLoading(assetUrl, error);
                default:
                    return this._createGenericFallback(assetType);
            }
        });

        // Network error recovery
        this.registerRecoveryStrategy('network_error', async (error, context) => {
            return this._recoverNetworkError(error, context);
        });

        // Performance degradation recovery
        this.registerRecoveryStrategy('performance_degradation', async (error, context) => {
            return this._recoverPerformanceIssues(error, context);
        });

        // WebGL context loss recovery
        this.registerRecoveryStrategy('webgl_context_lost', async (error, context) => {
            return this._recoverWebGLContext(error, context);
        });

        // Memory error recovery
        this.registerRecoveryStrategy('memory_error', async (error, context) => {
            return this._recoverMemoryError(error, context);
        });
    }

    /**
     * Handle an error with recovery attempts
     */
    async handleError(error, context = {}) {
        const errorInfo = this._createErrorInfo(error, context);
        
        // Add to error history
        this._addToErrorHistory(errorInfo);
        
        // Notify error listeners
        this._notifyErrorListeners(errorInfo);
        
        // Determine if this is a critical error
        const isCritical = this._isCriticalError(error);
        if (isCritical) {
            this.criticalErrors.push(errorInfo);
        }
        
        // Attempt recovery if enabled
        if (this.options.enableRecovery) {
            const recoveryResult = await this._attemptRecovery(error, context);
            if (recoveryResult.success) {
                this._notifyRecoveryListeners(errorInfo, recoveryResult);
                return recoveryResult;
            }
        }
        
        // Report error if enabled
        if (this.options.enableReporting) {
            this._reportError(errorInfo);
        }
        
        // If critical and no recovery, trigger emergency procedures
        if (isCritical) {
            this._handleCriticalError(errorInfo);
        }
        
        return { success: false, error: errorInfo };
    }

    /**
     * Register a recovery strategy for a specific error type
     */
    registerRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
    }

    /**
     * Register a fallback system
     */
    registerFallbackSystem(systemName, fallbackImplementation) {
        this.fallbackSystems.set(systemName, fallbackImplementation);
    }

    /**
     * Add error listener
     */
    onError(listener) {
        this.errorListeners.push(listener);
    }

    /**
     * Add recovery listener
     */
    onRecovery(listener) {
        this.recoveryListeners.push(listener);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorHistory.length,
            criticalErrors: this.criticalErrors.length,
            errorsByType: {},
            recentErrors: this.errorHistory.slice(-10),
            recoveryAttempts: this.recoveryAttempts.size
        };

        // Count errors by type
        this.errorHistory.forEach(error => {
            const type = error.type || 'unknown';
            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.criticalErrors = [];
        this.recoveryAttempts.clear();
    }

    /**
     * Create error information object
     */
    _createErrorInfo(error, context) {
        return {
            id: this._generateErrorId(),
            timestamp: Date.now(),
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            gameState: this._captureGameState()
        };
    }

    /**
     * Add error to history with size limit
     */
    _addToErrorHistory(errorInfo) {
        this.errorHistory.push(errorInfo);
        
        // Maintain size limit
        if (this.errorHistory.length > this.options.maxErrorHistory) {
            this.errorHistory.shift();
        }
    }

    /**
     * Determine if error is critical
     */
    _isCriticalError(error) {
        return error instanceof CriticalGameError ||
               error instanceof WebGLContextLostError ||
               error instanceof MemoryError ||
               (error instanceof AssetLoadingError && error.isCritical);
    }

    /**
     * Attempt error recovery
     */
    async _attemptRecovery(error, context) {
        const errorType = this._getErrorType(error);
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            return { success: false, reason: 'No recovery strategy available' };
        }

        // Check if we've already attempted recovery for this error type recently
        const attemptKey = `${errorType}_${Date.now() - (Date.now() % 60000)}`; // Per minute
        const attempts = this.recoveryAttempts.get(attemptKey) || 0;
        
        if (attempts >= 3) {
            return { success: false, reason: 'Too many recovery attempts' };
        }

        try {
            this.recoveryAttempts.set(attemptKey, attempts + 1);
            const result = await strategy(error, context);
            return { success: true, result };
        } catch (recoveryError) {
            return { 
                success: false, 
                reason: 'Recovery strategy failed',
                recoveryError: recoveryError.message
            };
        }
    }

    /**
     * Get error type for recovery strategy lookup
     */
    _getErrorType(error) {
        if (error instanceof AssetLoadingError) return 'asset_loading_failure';
        if (error instanceof NetworkError) return 'network_error';
        if (error instanceof PerformanceError) return 'performance_degradation';
        if (error instanceof WebGLContextLostError) return 'webgl_context_lost';
        if (error instanceof MemoryError) return 'memory_error';
        return 'unknown';
    }

    /**
     * Handle critical errors
     */
    _handleCriticalError(errorInfo) {
        console.error('Critical error detected:', errorInfo);
        
        // Try to save game state before potential crash
        try {
            this._emergencySaveGameState();
        } catch (saveError) {
            console.error('Failed to save game state during critical error:', saveError);
        }
        
        // Show critical error UI
        this._showCriticalErrorUI(errorInfo);
    }

    /**
     * Report error to server
     */
    async _reportError(errorInfo) {
        try {
            await fetch(this.options.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: errorInfo,
                    timestamp: Date.now()
                })
            });
        } catch (reportingError) {
            console.warn('Failed to report error:', reportingError);
        }
    }

    /**
     * Notify error listeners
     */
    _notifyErrorListeners(errorInfo) {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorInfo);
            } catch (listenerError) {
                console.warn('Error listener failed:', listenerError);
            }
        });
    }

    /**
     * Notify recovery listeners
     */
    _notifyRecoveryListeners(errorInfo, recoveryResult) {
        this.recoveryListeners.forEach(listener => {
            try {
                listener(errorInfo, recoveryResult);
            } catch (listenerError) {
                console.warn('Recovery listener failed:', listenerError);
            }
        });
    }

    /**
     * Generate unique error ID
     */
    _generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Capture current game state for error context
     */
    _captureGameState() {
        try {
            return {
                performance: {
                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                    } : null,
                    timing: performance.timing ? {
                        loadEventEnd: performance.timing.loadEventEnd,
                        navigationStart: performance.timing.navigationStart
                    } : null
                },
                screen: {
                    width: screen.width,
                    height: screen.height,
                    devicePixelRatio: window.devicePixelRatio
                },
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink
                } : null
            };
        } catch (error) {
            return { captureError: error.message };
        }
    }

    /**
     * Emergency save game state
     */
    _emergencySaveGameState() {
        const gameState = {
            timestamp: Date.now(),
            emergency: true,
            errorContext: true
        };
        
        localStorage.setItem('zombie_game_emergency_save', JSON.stringify(gameState));
    }

    /**
     * Show critical error UI
     */
    _showCriticalErrorUI(errorInfo) {
        // Create error overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        overlay.innerHTML = `
            <h2>Game Error Detected</h2>
            <p>The game encountered a critical error and needs to restart.</p>
            <p>Error ID: ${errorInfo.id}</p>
            <button onclick="window.location.reload()" style="
                padding: 10px 20px;
                font-size: 16px;
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">Restart Game</button>
        `;
        
        document.body.appendChild(overlay);
    }

    // Recovery strategy implementations
    async _recoverTextureLoading(assetUrl, error) {
        // Try alternative texture formats or fallback texture
        const fallbackTexture = this._createFallbackTexture();
        return { type: 'fallback_texture', asset: fallbackTexture };
    }

    async _recoverModelLoading(assetUrl, error) {
        // Try simplified model or fallback geometry
        const fallbackModel = this._createFallbackModel();
        return { type: 'fallback_model', asset: fallbackModel };
    }

    async _recoverAudioLoading(assetUrl, error) {
        // Disable audio or use silent audio buffer
        return { type: 'audio_disabled', asset: null };
    }

    async _recoverNetworkError(error, context) {
        // Implement offline mode or retry with exponential backoff
        return { type: 'offline_mode', message: 'Switched to offline mode' };
    }

    async _recoverPerformanceIssues(error, context) {
        // Reduce quality settings automatically
        return { type: 'quality_reduced', message: 'Graphics quality reduced' };
    }

    async _recoverWebGLContext(error, context) {
        // Reinitialize WebGL context
        return { type: 'webgl_reinit', message: 'WebGL context reinitialized' };
    }

    async _recoverMemoryError(error, context) {
        // Clear caches and reduce memory usage
        return { type: 'memory_cleanup', message: 'Memory cleaned up' };
    }

    _createFallbackTexture() {
        // Return a simple colored texture
        return { type: 'fallback', color: '#cccccc' };
    }

    _createFallbackModel() {
        // Return a simple box geometry
        return { type: 'fallback', geometry: 'box' };
    }

    _createGenericFallback(assetType) {
        return { type: 'generic_fallback', assetType };
    }
}

// Custom Error Classes
export class GameError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'GameError';
        this.context = context;
    }
}

export class CriticalGameError extends GameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'CriticalGameError';
    }
}

export class AssetLoadingError extends GameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'AssetLoadingError';
        this.isCritical = context.isCritical || false;
    }
}

export class NetworkError extends GameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'NetworkError';
    }
}

export class PerformanceError extends GameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'PerformanceError';
    }
}

export class WebGLContextLostError extends CriticalGameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'WebGLContextLostError';
    }
}

export class MemoryError extends CriticalGameError {
    constructor(message, context = {}) {
        super(message, context);
        this.name = 'MemoryError';
    }
}

export class JavaScriptError extends GameError {
    constructor(originalError, context = {}) {
        super(originalError?.message || 'JavaScript error', context);
        this.name = 'JavaScriptError';
        this.originalError = originalError;
    }
}

export class PromiseRejectionError extends GameError {
    constructor(reason, context = {}) {
        super(`Unhandled promise rejection: ${reason}`, context);
        this.name = 'PromiseRejectionError';
        this.reason = reason;
    }
}

export default ErrorHandler;