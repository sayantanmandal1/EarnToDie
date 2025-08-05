/**
 * Asset Verification System
 * Comprehensive asset verification, integrity checking, and repair system
 */
class AssetVerificationSystem {
    constructor(config = {}) {
        this.config = {
            manifestUrl: '/assets/manifest.json',
            checksumAlgorithm: 'SHA-256',
            verificationInterval: 300000, // 5 minutes
            maxRetryAttempts: 3,
            retryDelay: 2000,
            enableAutoRepair: true,
            enableProgressReporting: true,
            enableCaching: true,
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };
        
        // Asset manifest
        this.manifest = null;
        this.manifestVersion = null;
        
        // Verification state
        this.verificationResults = new Map();
        this.corruptedAssets = new Set();
        this.missingAssets = new Set();
        this.repairedAssets = new Set();
        
        // Cache for verified assets
        this.verifiedCache = new Map();
        this.checksumCache = new Map();
        
        // Progress tracking
        this.verificationProgress = {
            total: 0,
            completed: 0,
            failed: 0,
            repaired: 0,
            status: 'idle' // 'idle', 'loading', 'verifying', 'repairing', 'complete', 'error'
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Performance metrics
        this.metrics = {
            totalVerifications: 0,
            totalRepairs: 0,
            totalDownloads: 0,
            averageVerificationTime: 0,
            lastVerificationTime: null,
            cacheHitRate: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialize asset verification system
     */
    async initialize() {
        console.log('Initializing Asset Verification System...');
        
        try {
            // Load asset manifest
            await this.loadManifest();
            
            // Setup periodic verification
            this.setupPeriodicVerification();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Asset Verification System initialized successfully');
            this.emit('initialized', { manifest: this.manifest });
            
        } catch (error) {
            console.error('Failed to initialize Asset Verification System:', error);
            this.emit('error', { type: 'initialization', error });
            throw error;
        }
    }
    
    /**
     * Load asset manifest
     */
    async loadManifest() {
        try {
            console.log('Loading asset manifest...');
            
            const response = await fetch(this.config.manifestUrl);
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
            }
            
            const manifest = await response.json();
            
            // Validate manifest structure
            this.validateManifest(manifest);
            
            this.manifest = manifest;
            this.manifestVersion = manifest.version || '1.0.0';
            
            console.log(`Asset manifest loaded: ${Object.keys(manifest.assets || {}).length} assets`);
            
        } catch (error) {
            console.error('Failed to load asset manifest:', error);
            
            // Try to load cached manifest
            const cachedManifest = this.loadCachedManifest();
            if (cachedManifest) {
                console.log('Using cached manifest');
                this.manifest = cachedManifest;
                this.manifestVersion = cachedManifest.version || '1.0.0';
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Validate manifest structure
     */
    validateManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            throw new Error('Invalid manifest: not an object');
        }
        
        if (!manifest.assets || typeof manifest.assets !== 'object') {
            throw new Error('Invalid manifest: missing assets object');
        }
        
        // Validate each asset entry
        for (const [path, asset] of Object.entries(manifest.assets)) {
            if (!asset.checksum) {
                throw new Error(`Invalid manifest: asset ${path} missing checksum`);
            }
            
            if (!asset.size || typeof asset.size !== 'number') {
                throw new Error(`Invalid manifest: asset ${path} missing or invalid size`);
            }
            
            if (!asset.type) {
                throw new Error(`Invalid manifest: asset ${path} missing type`);
            }
        }
    }
    
    /**
     * Load cached manifest
     */
    loadCachedManifest() {
        try {
            const cached = localStorage.getItem('asset_manifest_cache');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to load cached manifest:', error);
            return null;
        }
    }
    
    /**
     * Cache manifest
     */
    cacheManifest() {
        try {
            if (this.manifest) {
                localStorage.setItem('asset_manifest_cache', JSON.stringify(this.manifest));
            }
        } catch (error) {
            console.error('Failed to cache manifest:', error);
        }
    }
    
    /**
     * Setup periodic verification
     */
    setupPeriodicVerification() {
        if (this.config.verificationInterval > 0) {
            setInterval(() => {
                this.verifyAllAssets(false); // Background verification
            }, this.config.verificationInterval);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('Connection restored - resuming asset verification');
                this.verifyAllAssets(false);
            });
            
            window.addEventListener('offline', () => {
                console.log('Connection lost - pausing asset verification');
            });
        }
    }
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Asset verification configuration updated:', this.config);
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Clear intervals
        if (this.verificationInterval) {
            clearInterval(this.verificationInterval);
        }
        
        // Clear caches
        this.verifiedCache.clear();
        this.checksumCache.clear();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Clear data
        this.verificationResults.clear();
        this.corruptedAssets.clear();
        this.missingAssets.clear();
        this.repairedAssets.clear();
        
        console.log('Asset Verification System destroyed');
    }
}

export default AssetVerificationSystem;