/**
 * Crash Recovery System
 * Handles game crashes, saves state, and provides recovery mechanisms
 */

import { CriticalGameError } from './ErrorHandler.js';

export class CrashRecoverySystem {
    constructor(options = {}) {
        this.options = {
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            maxRecoveryAttempts: options.maxRecoveryAttempts || 3,
            recoveryTimeout: options.recoveryTimeout || 10000, // 10 seconds
            enableHeartbeat: options.enableHeartbeat !== false,
            heartbeatInterval: options.heartbeatInterval || 5000, // 5 seconds
            ...options
        };

        // Recovery state
        this.isRecovering = false;
        this.recoveryAttempts = 0;
        this.lastHeartbeat = Date.now();
        this.gameState = null;
        this.systemState = null;
        
        // Recovery callbacks
        this.recoveryCallbacks = new Map();
        this.stateProviders = new Map();
        
        // Monitoring
        this.heartbeatTimer = null;
        this.autoSaveTimer = null;
        this.watchdogTimer = null;
        
        this._setupCrashDetection();
        this._startHeartbeat();
        this._startAutoSave();
        this._checkForPreviousCrash();
    }

    /**
     * Setup crash detection mechanisms
     */
    _setupCrashDetection() {
        // Page visibility change (tab switching, minimizing)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._emergencySave('visibility_change');
            } else {
                this._resumeFromBackground();
            }
        });

        // Before unload (page refresh, close)
        window.addEventListener('beforeunload', (event) => {
            this._emergencySave('before_unload');
        });

        // Page hide (more reliable than beforeunload)
        window.addEventListener('pagehide', (event) => {
            this._emergencySave('page_hide');
        });

        // Unhandled errors
        window.addEventListener('error', (event) => {
            this._handlePotentialCrash('javascript_error', {
                error: event.error,
                filename: event.filename,
                lineno: event.lineno
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this._handlePotentialCrash('promise_rejection', {
                reason: event.reason
            });
        });

        // WebGL context loss
        window.addEventListener('webglcontextlost', (event) => {
            this._handlePotentialCrash('webgl_context_lost', {
                event: event
            });
        });

        // Memory pressure (if available)
        if ('memory' in performance) {
            setInterval(() => {
                this._checkMemoryPressure();
            }, 10000);
        }
    }

    /**
     * Start heartbeat monitoring
     */
    _startHeartbeat() {
        if (!this.options.enableHeartbeat) return;

        this.heartbeatTimer = setInterval(() => {
            this._sendHeartbeat();
        }, this.options.heartbeatInterval);

        // Watchdog timer to detect frozen main thread
        this._resetWatchdog();
    }

    /**
     * Start auto-save system
     */
    _startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            this._performAutoSave();
        }, this.options.autoSaveInterval);
    }

    /**
     * Check for previous crash on startup
     */
    _checkForPreviousCrash() {
        const crashData = this._getCrashData();
        if (crashData) {
            console.warn('Previous crash detected:', crashData);
            this._offerRecovery(crashData);
        }
    }

    /**
     * Register a state provider for crash recovery
     */
    registerStateProvider(name, provider) {
        this.stateProviders.set(name, provider);
    }

    /**
     * Register a recovery callback
     */
    registerRecoveryCallback(name, callback) {
        this.recoveryCallbacks.set(name, callback);
    }

    /**
     * Manually trigger crash recovery
     */
    async triggerRecovery(reason = 'manual') {
        if (this.isRecovering) {
            console.warn('Recovery already in progress');
            return false;
        }

        console.log(`Triggering crash recovery: ${reason}`);
        return this._performRecovery(reason);
    }

    /**
     * Send heartbeat
     */
    _sendHeartbeat() {
        this.lastHeartbeat = Date.now();
        this._resetWatchdog();
        
        // Store heartbeat in localStorage for crash detection
        localStorage.setItem('zombie_game_heartbeat', JSON.stringify({
            timestamp: this.lastHeartbeat,
            gameState: this._captureBasicGameState()
        }));
    }

    /**
     * Reset watchdog timer
     */
    _resetWatchdog() {
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
        }

        this.watchdogTimer = setTimeout(() => {
            this._handleWatchdogTimeout();
        }, this.options.heartbeatInterval * 3); // 3x heartbeat interval
    }

    /**
     * Handle watchdog timeout (main thread frozen)
     */
    _handleWatchdogTimeout() {
        console.error('Watchdog timeout - main thread may be frozen');
        this._handlePotentialCrash('watchdog_timeout', {
            lastHeartbeat: this.lastHeartbeat,
            timeSinceHeartbeat: Date.now() - this.lastHeartbeat
        });
    }

    /**
     * Handle potential crash
     */
    _handlePotentialCrash(reason, context = {}) {
        console.error(`Potential crash detected: ${reason}`, context);
        
        // Save crash information
        this._saveCrashData(reason, context);
        
        // Attempt immediate recovery for non-critical issues
        if (this._isRecoverableError(reason)) {
            this._attemptImmediateRecovery(reason, context);
        } else {
            // Critical error - prepare for crash
            this._prepareCrashRecovery(reason, context);
        }
    }

    /**
     * Check if error is recoverable
     */
    _isRecoverableError(reason) {
        const recoverableErrors = [
            'webgl_context_lost',
            'memory_pressure',
            'performance_degradation'
        ];
        return recoverableErrors.includes(reason);
    }

    /**
     * Attempt immediate recovery
     */
    async _attemptImmediateRecovery(reason, context) {
        try {
            const callback = this.recoveryCallbacks.get(reason);
            if (callback) {
                await callback(context);
                console.log(`Immediate recovery successful for: ${reason}`);
                return true;
            }
        } catch (error) {
            console.error(`Immediate recovery failed for ${reason}:`, error);
        }
        return false;
    }

    /**
     * Prepare for crash recovery
     */
    _prepareCrashRecovery(reason, context) {
        // Emergency save
        this._emergencySave(reason);
        
        // Show crash warning to user
        this._showCrashWarning(reason, context);
        
        // Set up recovery data
        this._setupRecoveryData(reason, context);
    }

    /**
     * Perform emergency save
     */
    _emergencySave(reason) {
        try {
            const gameState = this._captureFullGameState();
            const crashData = {
                timestamp: Date.now(),
                reason: reason,
                gameState: gameState,
                systemState: this._captureSystemState(),
                recovery: true
            };

            localStorage.setItem('zombie_game_crash_recovery', JSON.stringify(crashData));
            console.log(`Emergency save completed: ${reason}`);
        } catch (error) {
            console.error('Emergency save failed:', error);
        }
    }

    /**
     * Perform auto-save
     */
    _performAutoSave() {
        try {
            const gameState = this._captureFullGameState();
            const autoSaveData = {
                timestamp: Date.now(),
                gameState: gameState,
                type: 'auto_save'
            };

            localStorage.setItem('zombie_game_auto_save', JSON.stringify(autoSaveData));
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Capture basic game state
     */
    _captureBasicGameState() {
        const state = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Add basic state from providers
        this.stateProviders.forEach((provider, name) => {
            try {
                const providerState = provider.getBasicState();
                if (providerState) {
                    state[name] = providerState;
                }
            } catch (error) {
                console.warn(`Failed to get basic state from ${name}:`, error);
            }
        });

        return state;
    }

    /**
     * Capture full game state
     */
    _captureFullGameState() {
        const state = this._captureBasicGameState();

        // Add full state from providers
        this.stateProviders.forEach((provider, name) => {
            try {
                const providerState = provider.getFullState();
                if (providerState) {
                    state[name] = providerState;
                }
            } catch (error) {
                console.warn(`Failed to get full state from ${name}:`, error);
            }
        });

        return state;
    }

    /**
     * Capture system state
     */
    _captureSystemState() {
        return {
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            timing: {
                now: performance.now(),
                timeOrigin: performance.timeOrigin
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
    }

    /**
     * Save crash data
     */
    _saveCrashData(reason, context) {
        const crashData = {
            timestamp: Date.now(),
            reason: reason,
            context: context,
            gameState: this._captureFullGameState(),
            systemState: this._captureSystemState(),
            recoveryAttempts: this.recoveryAttempts
        };

        localStorage.setItem('zombie_game_last_crash', JSON.stringify(crashData));
    }

    /**
     * Get crash data
     */
    _getCrashData() {
        try {
            const crashData = localStorage.getItem('zombie_game_crash_recovery');
            return crashData ? JSON.parse(crashData) : null;
        } catch (error) {
            console.error('Failed to parse crash data:', error);
            return null;
        }
    }

    /**
     * Offer recovery to user
     */
    _offerRecovery(crashData) {
        const timeSinceCrash = Date.now() - crashData.timestamp;
        
        // Only offer recovery if crash was recent (within 1 hour)
        if (timeSinceCrash > 3600000) {
            this._clearCrashData();
            return;
        }

        // Show recovery UI
        this._showRecoveryUI(crashData);
    }

    /**
     * Show recovery UI
     */
    _showRecoveryUI(crashData) {
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

        const crashTime = new Date(crashData.timestamp).toLocaleString();
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 500px; padding: 20px;">
                <h2>Game Recovery Available</h2>
                <p>The game crashed at ${crashTime}</p>
                <p>Reason: ${crashData.reason}</p>
                <p>Would you like to recover your progress?</p>
                <div style="margin-top: 20px;">
                    <button id="recover-btn" style="
                        padding: 10px 20px;
                        font-size: 16px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 0 10px;
                    ">Recover Game</button>
                    <button id="fresh-start-btn" style="
                        padding: 10px 20px;
                        font-size: 16px;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 0 10px;
                    ">Fresh Start</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Handle recovery choice
        document.getElementById('recover-btn').onclick = () => {
            document.body.removeChild(overlay);
            this._performRecovery('user_choice', crashData);
        };

        document.getElementById('fresh-start-btn').onclick = () => {
            document.body.removeChild(overlay);
            this._clearCrashData();
        };
    }

    /**
     * Show crash warning
     */
    _showCrashWarning(reason, context) {
        // Create a non-blocking warning
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            max-width: 300px;
        `;

        warning.innerHTML = `
            <strong>Warning:</strong> Game instability detected (${reason})
            <br>Saving progress...
        `;

        document.body.appendChild(warning);

        // Remove warning after 5 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                document.body.removeChild(warning);
            }
        }, 5000);
    }

    /**
     * Setup recovery data
     */
    _setupRecoveryData(reason, context) {
        const recoveryData = {
            timestamp: Date.now(),
            reason: reason,
            context: context,
            prepared: true
        };

        localStorage.setItem('zombie_game_recovery_prepared', JSON.stringify(recoveryData));
    }

    /**
     * Perform recovery
     */
    async _performRecovery(reason, crashData = null) {
        if (this.isRecovering) return false;

        this.isRecovering = true;
        this.recoveryAttempts++;

        try {
            console.log(`Starting recovery attempt ${this.recoveryAttempts}/${this.options.maxRecoveryAttempts}`);

            // Get crash data if not provided
            if (!crashData) {
                crashData = this._getCrashData();
            }

            if (!crashData) {
                throw new Error('No crash data available for recovery');
            }

            // Restore game state
            await this._restoreGameState(crashData.gameState);

            // Run recovery callbacks
            await this._runRecoveryCallbacks(crashData);

            // Clear crash data on successful recovery
            this._clearCrashData();

            console.log('Recovery completed successfully');
            this.isRecovering = false;
            this.recoveryAttempts = 0;
            return true;

        } catch (error) {
            console.error('Recovery failed:', error);
            this.isRecovering = false;

            if (this.recoveryAttempts >= this.options.maxRecoveryAttempts) {
                console.error('Maximum recovery attempts reached');
                this._handleRecoveryFailure(error);
                return false;
            }

            // Try again after delay
            setTimeout(() => {
                this._performRecovery(reason, crashData);
            }, 2000);

            return false;
        }
    }

    /**
     * Restore game state
     */
    async _restoreGameState(gameState) {
        if (!gameState) return;

        // Restore state using providers
        for (const [name, provider] of this.stateProviders) {
            if (gameState[name] && provider.restoreState) {
                try {
                    await provider.restoreState(gameState[name]);
                    console.log(`Restored state for: ${name}`);
                } catch (error) {
                    console.warn(`Failed to restore state for ${name}:`, error);
                }
            }
        }
    }

    /**
     * Run recovery callbacks
     */
    async _runRecoveryCallbacks(crashData) {
        for (const [name, callback] of this.recoveryCallbacks) {
            try {
                await callback(crashData);
                console.log(`Recovery callback completed: ${name}`);
            } catch (error) {
                console.warn(`Recovery callback failed for ${name}:`, error);
            }
        }
    }

    /**
     * Handle recovery failure
     */
    _handleRecoveryFailure(error) {
        // Show failure message to user
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
            <div style="text-align: center; max-width: 500px; padding: 20px;">
                <h2>Recovery Failed</h2>
                <p>Unable to recover from the previous crash.</p>
                <p>The game will start fresh.</p>
                <button onclick="window.location.reload()" style="
                    padding: 10px 20px;
                    font-size: 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                ">Start Fresh</button>
            </div>
        `;

        document.body.appendChild(overlay);
        this._clearCrashData();
    }

    /**
     * Clear crash data
     */
    _clearCrashData() {
        localStorage.removeItem('zombie_game_crash_recovery');
        localStorage.removeItem('zombie_game_last_crash');
        localStorage.removeItem('zombie_game_recovery_prepared');
    }

    /**
     * Resume from background
     */
    _resumeFromBackground() {
        // Check if game state is still valid
        const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
        
        if (timeSinceHeartbeat > 60000) { // 1 minute
            console.warn('Long background time detected, checking game state');
            this._validateGameState();
        }
    }

    /**
     * Validate game state after background
     */
    _validateGameState() {
        // Run validation through state providers
        this.stateProviders.forEach((provider, name) => {
            if (provider.validateState) {
                try {
                    const isValid = provider.validateState();
                    if (!isValid) {
                        console.warn(`Invalid state detected in ${name}`);
                        this._handlePotentialCrash('invalid_state', { provider: name });
                    }
                } catch (error) {
                    console.warn(`State validation failed for ${name}:`, error);
                }
            }
        });
    }

    /**
     * Check memory pressure
     */
    _checkMemoryPressure() {
        if (!performance.memory) return;

        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        const usage = used / limit;

        if (usage > 0.9) { // 90% memory usage
            this._handlePotentialCrash('memory_pressure', {
                usage: usage,
                used: used,
                limit: limit
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
        }
    }

    /**
     * Get recovery statistics
     */
    getStats() {
        return {
            isRecovering: this.isRecovering,
            recoveryAttempts: this.recoveryAttempts,
            lastHeartbeat: this.lastHeartbeat,
            timeSinceHeartbeat: Date.now() - this.lastHeartbeat,
            hasCrashData: !!this._getCrashData()
        };
    }
}

export default CrashRecoverySystem;