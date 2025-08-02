const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure communication between main and renderer processes
 * This script runs in the renderer process but has access to Node.js APIs
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File system operations
    showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    
    // Error reporting
    reportError: (errorData) => ipcRenderer.invoke('report-error', errorData),
    reportPerformanceWarning: (warningData) => ipcRenderer.invoke('performance-warning', warningData),
    
    // App information
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // Database operations
    createDatabaseBackup: () => ipcRenderer.invoke('database-backup'),
    getDatabaseInfo: () => ipcRenderer.invoke('database-info'),
    performDatabaseMaintenance: () => ipcRenderer.invoke('database-maintenance'),
    
    // Menu event listeners
    onMenuNewGame: (callback) => ipcRenderer.on('menu-new-game', callback),
    onMenuSaveGame: (callback) => ipcRenderer.on('menu-save-game', callback),
    onMenuLoadGame: (callback) => ipcRenderer.on('menu-load-game', callback),
    onMenuTogglePause: (callback) => ipcRenderer.on('menu-toggle-pause', callback),
    onMenuRestartLevel: (callback) => ipcRenderer.on('menu-restart-level', callback),
    onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),
    onMenuZoomIn: (callback) => ipcRenderer.on('menu-zoom-in', callback),
    onMenuZoomOut: (callback) => ipcRenderer.on('menu-zoom-out', callback),
    onMenuResetZoom: (callback) => ipcRenderer.on('menu-reset-zoom', callback),
    onMenuShowControls: (callback) => ipcRenderer.on('menu-show-controls', callback),
    
    // Remove event listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform information
    platform: process.platform,
    
    // Development mode check
    isDev: process.env.NODE_ENV === 'development'
});

// Expose a limited set of Node.js APIs for game functionality
contextBridge.exposeInMainWorld('nodeAPI', {
    // Path utilities
    path: {
        join: (...args) => require('path').join(...args),
        dirname: (path) => require('path').dirname(path),
        basename: (path) => require('path').basename(path),
        extname: (path) => require('path').extname(path)
    },
    
    // File system utilities (read-only for security)
    fs: {
        // Only expose safe, read-only operations
        exists: (path) => require('fs').existsSync(path),
        readFile: (path) => require('fs').promises.readFile(path, 'utf8'),
        readdir: (path) => require('fs').promises.readdir(path),
        stat: (path) => require('fs').promises.stat(path)
    },
    
    // OS information
    os: {
        platform: () => require('os').platform(),
        arch: () => require('os').arch(),
        cpus: () => require('os').cpus(),
        totalmem: () => require('os').totalmem(),
        freemem: () => require('os').freemem()
    }
});

// Expose game-specific APIs
contextBridge.exposeInMainWorld('gameAPI', {
    // Performance monitoring
    getPerformanceInfo: () => {
        return {
            memory: process.memoryUsage(),
            platform: process.platform,
            arch: process.arch,
            versions: process.versions
        };
    },
    
    // Asset management
    getAssetPath: (assetPath) => {
        const path = require('path');
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
            return `http://localhost:3000/${assetPath}`;
        } else {
            return path.join(__dirname, '../assets/', assetPath);
        }
    },
    
    // Local storage helpers
    storage: {
        setItem: (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
        },
        getItem: (key) => {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        },
        removeItem: (key) => {
            localStorage.removeItem(key);
        },
        clear: () => {
            localStorage.clear();
        }
    },
    
    // Console logging with levels
    log: {
        info: (...args) => console.log('[GAME INFO]', ...args),
        warn: (...args) => console.warn('[GAME WARN]', ...args),
        error: (...args) => console.error('[GAME ERROR]', ...args),
        debug: (...args) => {
            if (process.env.NODE_ENV === 'development') {
                console.debug('[GAME DEBUG]', ...args);
            }
        }
    }
});

// Security: Remove access to Node.js globals in renderer
delete window.require;
delete window.exports;
delete window.module;

// Log successful preload
console.log('Preload script loaded successfully');