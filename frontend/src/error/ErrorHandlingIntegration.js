/**
 * Error Handling Integration
 * Integrates all error handling systems into a cohesive error management solution
 */

import ErrorHandler from './ErrorHandler.js';
import NetworkErrorHandler from './NetworkErrorHandler.js';
import PerformanceDegradationHandler from './PerformanceDegradationHandler.js';
import RobustAssetLoader from './RobustAssetLoader.js';
import CrashRecoverySystem from './CrashRecoverySystem.js';
import ErrorReportingSystem from './ErrorReportingSystem.js';

export class ErrorHandlingIntegration {
    constructor(options = {}) {
        this.options = {
            enableErrorHandler: options.enableErrorHandler !== false,
            enableNetworkHandler: options.enableNetworkHandler !== false,
            enablePerformanceHandler: options.enablePerformanceHandler !== false,
            enableAssetLoader: options.enableAssetLoader !== false,
            enableCrashRecovery: options.enableCrashRecovery !== false,
            enableErrorReporting: options.enableErrorReporting !== false,
            ...options
        };

        // Initialize all error handling systems
        this.errorHandler = null;
        this.networkHandler = null;
        this.performanceHandler = null;
        this.assetLoader = null;
        this.crashRecovery = null;
        this.errorReporting = null;

        // Integration state
        this.isInitialized = false;
        this.gameSystemProviders = new Map();
        
        this._initializeSystems();
        this._setupIntegrations();
    }

    /**
     * Initialize all error handling systems
     */
    _initializeSystems() {
        try {
            // Main error handler
            if (this.options.enableErrorHandler) {
                this.errorHandler = new ErrorHandler({
                    enableReporting: this.options.enableErrorReporting,
                    enableRecovery: true,
                    ...this.options.errorHandler
                });
                console.log('Error handler initialized');
            }

            // Network error handler
            if (this.options.enableNetworkHandler) {
                this.networkHandler = new NetworkErrorHandler({
                    maxRetries: 3,
                    baseDelay: 1000,
                    ...this.options.networkHandler
                });
                console.log('Network error handler initialized');
            }

            // Performance degradation handler
            if (this.options.enablePerformanceHandler) {
                this.performanceHandler = new PerformanceDegradationHandler({
                    targetFPS: 30,
                    enableAutoAdjustment: true,
                    ...this.options.performanceHandler
                });
                console.log('Performance degradation handler initialized');
            }

            // Robust asset loader
            if (this.options.enableAssetLoader) {
                this.assetLoader = new RobustAssetLoader({
                    maxRetries: 3,
                    enableFallbacks: true,
                    enableCaching: true,
                    ...this.options.assetLoader
                });
                console.log('Robust asset loader initialized');
            }

            // Crash recovery system
            if (this.options.enableCrashRecovery) {
                this.crashRecovery = new CrashRecoverySystem({
                    autoSaveInterval: 30000,
                    enableHeartbeat: true,
                    ...this.options.crashRecovery
                });
                console.log('Crash recovery system initialized');
            }

            // Error reporting system
            if (this.options.enableErrorReporting) {
                this.errorReporting = new ErrorReportingSystem({
                    endpoint: '/api/v1/errors',
                    batchSize: 10,
                    enableLocalStorage: true,
                    ...this.options.errorReporting
                });
                console.log('Error reporting system initialized');
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize error handling systems:', error);
            this._handleInitializationError(error);
        }
    }

    /**
     * Setup integrations between systems
     */
    _setupIntegrations() {
        if (!this.isInitialized) return;

        // Connect error handler to reporting system
        if (this.errorHandler && this.errorReporting) {
            this.errorHandler.onError((errorInfo) => {
                this.errorReporting.reportError(errorInfo, {
                    source: 'error_handler',
                    gameState: this._captureGameState()
                });
            });
        }

        // Connect performance handler to error handler
        if (this.performanceHandler && this.errorHandler) {
            this.performanceHandler.onPerformanceIssue((error) => {
                this.errorHandler.handleError(error, {
                    source: 'performance_handler',
                    metrics: this.performanceHandler.getPerformanceMetrics()
                });
            });

            this.performanceHandler.onQualityChange((oldQuality, newQuality, reason) => {
                console.log(`Quality changed from ${oldQuality} to ${newQuality}: ${reason}`);
                
                // Report quality changes as informational events
                if (this.errorReporting) {
                    this.errorReporting.reportError(new Error('Quality adjustment'), {
                        type: 'quality_change',
                        oldQuality,
                        newQuality,
                        reason,
                        source: 'performance_handler'
                    });
                }
            });
        }

        // Connect crash recovery to error handler
        if (this.crashRecovery && this.errorHandler) {
            this.crashRecovery.registerRecoveryCallback('error_handler', async (crashData) => {
                // Reset error handler state after crash recovery
                if (this.errorHandler.clearErrorHistory) {
                    this.errorHandler.clearErrorHistory();
                }
            });
        }

        // Connect network handler to error handler
        if (this.networkHandler && this.errorHandler) {
            // Network errors are already handled by NetworkErrorHandler
            // but we can add additional integration if needed
        }

        // Setup asset loader error handling
        if (this.assetLoader && this.errorHandler) {
            // Asset loading errors are handled internally by RobustAssetLoader
            // but we can add monitoring
            const originalLoadTexture = this.assetLoader.loadTexture.bind(this.assetLoader);
            this.assetLoader.loadTexture = async (url, options) => {
                try {
                    return await originalLoadTexture(url, options);
                } catch (error) {
                    this.errorHandler.handleError(error, {
                        source: 'asset_loader',
                        assetType: 'texture',
                        assetUrl: url
                    });
                    throw error;
                }
            };
        }

        console.log('Error handling system integrations completed');
    }

    /**
     * Register a game system provider for state capture and recovery
     */
    registerGameSystemProvider(name, provider) {
        this.gameSystemProviders.set(name, provider);

        // Register with crash recovery system
        if (this.crashRecovery) {
            this.crashRecovery.registerStateProvider(name, provider);
        }

        console.log(`Game system provider registered: ${name}`);
    }

    /**
     * Handle a game error through the integrated system
     */
    async handleGameError(error, context = {}) {
        if (!this.isInitialized) {
            console.error('Error handling system not initialized:', error);
            return;
        }

        // Add integration context
        const enhancedContext = {
            ...context,
            timestamp: Date.now(),
            gameState: this._captureGameState(),
            systemState: this._captureSystemState()
        };

        // Route through main error handler
        if (this.errorHandler) {
            return await this.errorHandler.handleError(error, enhancedContext);
        } else {
            // Fallback error handling
            console.error('Game error (no error handler):', error, enhancedContext);
            
            if (this.errorReporting) {
                this.errorReporting.reportError(error, enhancedContext);
            }
        }
    }

    /**
     * Get network client for API calls
     */
    getNetworkClient(baseURL) {
        if (!this.networkHandler) {
            throw new Error('Network handler not initialized');
        }

        return {
            get: (endpoint, options) => this.networkHandler.makeRequest(`${baseURL}${endpoint}`, { method: 'GET', ...options }),
            post: (endpoint, data, options) => this.networkHandler.makeRequest(`${baseURL}${endpoint}`, { method: 'POST', body: JSON.stringify(data), ...options }),
            put: (endpoint, data, options) => this.networkHandler.makeRequest(`${baseURL}${endpoint}`, { method: 'PUT', body: JSON.stringify(data), ...options }),
            delete: (endpoint, options) => this.networkHandler.makeRequest(`${baseURL}${endpoint}`, { method: 'DELETE', ...options })
        };
    }

    /**
     * Get asset loader
     */
    getAssetLoader() {
        if (!this.assetLoader) {
            throw new Error('Asset loader not initialized');
        }
        return this.assetLoader;
    }

    /**
     * Get performance settings
     */
    getPerformanceSettings() {
        if (!this.performanceHandler) {
            return { level: 'medium', settings: {} };
        }
        return this.performanceHandler.getQualitySettings();
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.performanceHandler) {
            return {};
        }
        return this.performanceHandler.getPerformanceMetrics();
    }

    /**
     * Trigger manual crash recovery
     */
    async triggerRecovery(reason = 'manual') {
        if (!this.crashRecovery) {
            throw new Error('Crash recovery system not initialized');
        }
        return await this.crashRecovery.triggerRecovery(reason);
    }

    /**
     * Get comprehensive error statistics
     */
    getErrorStats() {
        const stats = {
            initialized: this.isInitialized,
            systems: {
                errorHandler: !!this.errorHandler,
                networkHandler: !!this.networkHandler,
                performanceHandler: !!this.performanceHandler,
                assetLoader: !!this.assetLoader,
                crashRecovery: !!this.crashRecovery,
                errorReporting: !!this.errorReporting
            }
        };

        // Collect stats from each system
        if (this.errorHandler && this.errorHandler.getErrorStats) {
            stats.errorHandler = this.errorHandler.getErrorStats();
        }

        if (this.networkHandler && this.networkHandler.getNetworkStatus) {
            stats.networkHandler = this.networkHandler.getNetworkStatus();
        }

        if (this.performanceHandler && this.performanceHandler.getPerformanceMetrics) {
            stats.performanceHandler = this.performanceHandler.getPerformanceMetrics();
        }

        if (this.assetLoader && this.assetLoader.getStats) {
            stats.assetLoader = this.assetLoader.getStats();
        }

        if (this.crashRecovery && this.crashRecovery.getStats) {
            stats.crashRecovery = this.crashRecovery.getStats();
        }

        if (this.errorReporting && this.errorReporting.getStats) {
            stats.errorReporting = this.errorReporting.getStats();
        }

        return stats;
    }

    /**
     * Set user ID for error tracking
     */
    setUserId(userId) {
        if (this.errorReporting) {
            this.errorReporting.setUserId(userId);
        }
    }

    /**
     * Set global context for error reporting
     */
    setGlobalContext(context) {
        if (this.errorReporting) {
            this.errorReporting.setGlobalContext(context);
        }
    }

    /**
     * Capture current game state
     */
    _captureGameState() {
        const gameState = {};

        // Collect state from registered providers
        this.gameSystemProviders.forEach((provider, name) => {
            try {
                if (provider.getBasicState) {
                    gameState[name] = provider.getBasicState();
                }
            } catch (error) {
                console.warn(`Failed to capture game state from ${name}:`, error);
            }
        });

        return gameState;
    }

    /**
     * Capture system state
     */
    _captureSystemState() {
        return {
            performance: this.performanceHandler ? this.performanceHandler.getPerformanceMetrics() : null,
            network: this.networkHandler ? this.networkHandler.getNetworkStatus() : null,
            assets: this.assetLoader ? this.assetLoader.getStats() : null,
            recovery: this.crashRecovery ? this.crashRecovery.getStats() : null
        };
    }

    /**
     * Handle initialization error
     */
    _handleInitializationError(error) {
        console.error('Error handling system initialization failed:', error);
        
        // Try to show user-friendly error message
        try {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                font-family: Arial, sans-serif;
            `;
            errorDiv.innerHTML = `
                <strong>Error System Initialization Failed</strong><br>
                Some error handling features may not work properly.<br>
                Please refresh the page to try again.
            `;
            document.body.appendChild(errorDiv);

            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    document.body.removeChild(errorDiv);
                }
            }, 10000);
        } catch (uiError) {
            console.error('Failed to show initialization error UI:', uiError);
        }
    }

    /**
     * Cleanup all systems
     */
    destroy() {
        try {
            if (this.errorHandler && this.errorHandler.destroy) {
                this.errorHandler.destroy();
            }

            if (this.networkHandler && this.networkHandler.destroy) {
                this.networkHandler.destroy();
            }

            if (this.performanceHandler && this.performanceHandler.destroy) {
                this.performanceHandler.destroy();
            }

            if (this.assetLoader && this.assetLoader.clearCache) {
                this.assetLoader.clearCache();
            }

            if (this.crashRecovery && this.crashRecovery.destroy) {
                this.crashRecovery.destroy();
            }

            if (this.errorReporting && this.errorReporting.destroy) {
                this.errorReporting.destroy();
            }

            console.log('Error handling systems cleaned up');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Create singleton instance for global use
let globalErrorHandling = null;

/**
 * Initialize global error handling
 */
export function initializeErrorHandling(options = {}) {
    if (globalErrorHandling) {
        console.warn('Error handling already initialized');
        return globalErrorHandling;
    }

    globalErrorHandling = new ErrorHandlingIntegration(options);
    
    // Make it globally accessible for debugging
    if (typeof window !== 'undefined') {
        window.zombieGameErrorHandling = globalErrorHandling;
    }

    return globalErrorHandling;
}

/**
 * Get global error handling instance
 */
export function getErrorHandling() {
    if (!globalErrorHandling) {
        throw new Error('Error handling not initialized. Call initializeErrorHandling() first.');
    }
    return globalErrorHandling;
}

/**
 * Clear global instance (for testing)
 */
export function clearGlobalErrorHandling() {
    if (globalErrorHandling) {
        globalErrorHandling.destroy();
        globalErrorHandling = null;
    }
    if (typeof window !== 'undefined') {
        delete window.zombieGameErrorHandling;
    }
}

/**
 * Convenience function to handle errors
 */
export async function handleError(error, context = {}) {
    const errorHandling = getErrorHandling();
    return await errorHandling.handleGameError(error, context);
}

export default ErrorHandlingIntegration;