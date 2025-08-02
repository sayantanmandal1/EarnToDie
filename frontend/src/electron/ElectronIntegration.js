/**
 * Electron Integration for Zombie Car Game
 * Handles communication between the game and Electron main process
 */

export class ElectronIntegration {
    constructor() {
        this.isElectron = this.checkElectronEnvironment();
        this.electronAPI = window.electronAPI;
        this.gameAPI = window.gameAPI;
        this.nodeAPI = window.nodeAPI;

        this.menuHandlers = new Map();
        this.setupMenuHandlers();

        console.log('ElectronIntegration initialized:', {
            isElectron: this.isElectron,
            platform: this.getPlatform(),
            isDev: this.isDevelopment()
        });
    }

    /**
     * Check if running in Electron environment
     */
    checkElectronEnvironment() {
        return !!(window.electronAPI && window.gameAPI && window.nodeAPI);
    }

    /**
     * Get platform information
     */
    getPlatform() {
        if (this.isElectron) {
            return this.electronAPI.platform;
        }
        return 'web';
    }

    /**
     * Check if in development mode
     */
    isDevelopment() {
        if (this.isElectron) {
            return this.electronAPI.isDev;
        }
        return process.env.NODE_ENV === 'development';
    }

    /**
     * Setup menu event handlers
     */
    setupMenuHandlers() {
        if (!this.isElectron) return;

        // File menu handlers
        this.electronAPI.onMenuNewGame(() => {
            this.handleMenuAction('new-game');
        });

        this.electronAPI.onMenuSaveGame(() => {
            this.handleMenuAction('save-game');
        });

        this.electronAPI.onMenuLoadGame(() => {
            this.handleMenuAction('load-game');
        });

        // Game menu handlers
        this.electronAPI.onMenuTogglePause(() => {
            this.handleMenuAction('toggle-pause');
        });

        this.electronAPI.onMenuRestartLevel(() => {
            this.handleMenuAction('restart-level');
        });

        this.electronAPI.onMenuSettings(() => {
            this.handleMenuAction('settings');
        });

        // View menu handlers
        this.electronAPI.onMenuZoomIn(() => {
            this.handleMenuAction('zoom-in');
        });

        this.electronAPI.onMenuZoomOut(() => {
            this.handleMenuAction('zoom-out');
        });

        this.electronAPI.onMenuResetZoom(() => {
            this.handleMenuAction('reset-zoom');
        });

        // Help menu handlers
        this.electronAPI.onMenuShowControls(() => {
            this.handleMenuAction('show-controls');
        });
    }

    /**
     * Handle menu actions
     */
    handleMenuAction(action) {
        const handler = this.menuHandlers.get(action);
        if (handler) {
            handler();
        } else {
            console.warn(`No handler registered for menu action: ${action}`);
        }
    }

    /**
     * Register menu action handler
     */
    registerMenuHandler(action, handler) {
        this.menuHandlers.set(action, handler);
    }

    /**
     * Unregister menu action handler
     */
    unregisterMenuHandler(action) {
        this.menuHandlers.delete(action);
    }

    /**
     * Show save dialog
     */
    async showSaveDialog() {
        if (!this.isElectron) {
            throw new Error('Save dialog only available in Electron');
        }
        return await this.electronAPI.showSaveDialog();
    }

    /**
     * Show open dialog
     */
    async showOpenDialog() {
        if (!this.isElectron) {
            throw new Error('Open dialog only available in Electron');
        }
        return await this.electronAPI.showOpenDialog();
    }

    /**
     * Report error to main process
     */
    async reportError(error) {
        if (!this.isElectron) {
            console.error('Game Error:', error);
            return;
        }

        const errorData = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        return await this.electronAPI.reportError(errorData);
    }

    /**
     * Report performance warning
     */
    async reportPerformanceWarning(warning) {
        if (!this.isElectron) {
            console.warn('Performance Warning:', warning);
            return;
        }

        const warningData = {
            message: warning.message || 'Performance issue detected',
            fps: warning.fps,
            memory: warning.memory,
            timestamp: Date.now()
        };

        return await this.electronAPI.reportPerformanceWarning(warningData);
    }

    /**
     * Get app information
     */
    async getAppInfo() {
        if (!this.isElectron) {
            return {
                name: 'Zombie Car Game',
                version: '1.0.0',
                platform: 'web'
            };
        }
        return await this.electronAPI.getAppInfo();
    }

    /**
     * Database operations
     */
    async createDatabaseBackup() {
        if (!this.isElectron) {
            throw new Error('Database backup only available in Electron');
        }
        return await this.electronAPI.createDatabaseBackup();
    }

    async getDatabaseInfo() {
        if (!this.isElectron) {
            return null;
        }
        return await this.electronAPI.getDatabaseInfo();
    }

    async performDatabaseMaintenance() {
        if (!this.isElectron) {
            return false;
        }
        return await this.electronAPI.performDatabaseMaintenance();
    }

    /**
     * Get performance information
     */
    getPerformanceInfo() {
        if (!this.isElectron) {
            return {
                memory: performance.memory || {},
                platform: 'web'
            };
        }
        return this.gameAPI.getPerformanceInfo();
    }

    /**
     * Get asset path
     */
    getAssetPath(assetPath) {
        if (!this.isElectron) {
            return assetPath;
        }
        return this.gameAPI.getAssetPath(assetPath);
    }

    /**
     * Enhanced local storage with JSON support
     */
    getStorage() {
        if (this.isElectron && this.gameAPI.storage) {
            return this.gameAPI.storage;
        }

        // Fallback to regular localStorage
        return {
            setItem: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
            },
            getItem: (key) => {
                const item = localStorage.getItem(key);
                try {
                    return item ? JSON.parse(item) : null;
                } catch (e) {
                    return item;
                }
            },
            removeItem: (key) => {
                localStorage.removeItem(key);
            },
            clear: () => {
                localStorage.clear();
            }
        };
    }

    /**
     * Enhanced logging
     */
    getLogger() {
        if (this.isElectron && this.gameAPI.log) {
            return this.gameAPI.log;
        }

        // Fallback to console
        return {
            info: (...args) => console.log('[GAME INFO]', ...args),
            warn: (...args) => console.warn('[GAME WARN]', ...args),
            error: (...args) => console.error('[GAME ERROR]', ...args),
            debug: (...args) => console.debug('[GAME DEBUG]', ...args)
        };
    }

    /**
     * File system utilities (read-only)
     */
    getFileSystem() {
        if (!this.isElectron || !this.nodeAPI.fs) {
            return null;
        }
        return this.nodeAPI.fs;
    }

    /**
     * Path utilities
     */
    getPath() {
        if (!this.isElectron || !this.nodeAPI.path) {
            return {
                join: (...args) => args.join('/'),
                dirname: (path) => path.split('/').slice(0, -1).join('/'),
                basename: (path) => path.split('/').pop(),
                extname: (path) => {
                    const parts = path.split('.');
                    return parts.length > 1 ? '.' + parts.pop() : '';
                }
            };
        }
        return this.nodeAPI.path;
    }

    /**
     * OS information
     */
    getOSInfo() {
        if (!this.isElectron || !this.nodeAPI.os) {
            return {
                platform: () => 'web',
                arch: () => 'unknown'
            };
        }
        return this.nodeAPI.os;
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (!this.isElectron) return;

        // Remove all menu listeners
        this.electronAPI.removeAllListeners('menu-new-game');
        this.electronAPI.removeAllListeners('menu-save-game');
        this.electronAPI.removeAllListeners('menu-load-game');
        this.electronAPI.removeAllListeners('menu-toggle-pause');
        this.electronAPI.removeAllListeners('menu-restart-level');
        this.electronAPI.removeAllListeners('menu-settings');
        this.electronAPI.removeAllListeners('menu-zoom-in');
        this.electronAPI.removeAllListeners('menu-zoom-out');
        this.electronAPI.removeAllListeners('menu-reset-zoom');
        this.electronAPI.removeAllListeners('menu-show-controls');

        this.menuHandlers.clear();

        console.log('ElectronIntegration disposed');
    }
}

// Create singleton instance
export const electronIntegration = new ElectronIntegration();