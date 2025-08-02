/**
 * Professional Asset Management System for Zombie Car Game
 * Handles loading, caching, verification, and optimization of all game assets
 */

import { electronIntegration } from '../electron/ElectronIntegration.js';
import { EventEmitter } from 'events';

export class AssetManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            enableCaching: options.enableCaching !== false,
            enableCompression: options.enableCompression !== false,
            enableIntegrityCheck: options.enableIntegrityCheck !== false,
            maxCacheSize: options.maxCacheSize || 500 * 1024 * 1024, // 500MB
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            preloadCritical: options.preloadCritical !== false,
            ...options
        };

        // Asset storage
        this.assets = new Map();
        this.assetManifest = null;
        this.loadingPromises = new Map();
        this.failedAssets = new Set();
        
        // Cache management
        this.cache = new Map();
        this.cacheSize = 0;
        this.lastAccessed = new Map();
        
        // Loading state
        this.isInitialized = false;
        this.loadingProgress = {
            total: 0,
            loaded: 0,
            failed: 0,
            percentage: 0
        };

        // Asset categories
        this.categories = {
            audio: new Map(),
            textures: new Map(),
            models: new Map(),
            data: new Map(),
            shaders: new Map(),
            fonts: new Map()
        };

        this.logger = electronIntegration.getLogger();
        
        console.log('AssetManager initialized with options:', this.options);
    }

    /**
     * Initialize the asset management system
     */
    async initialize() {
        try {
            // Load asset manifest
            await this.loadAssetManifest();
            
            // Initialize cache
            this.initializeCache();
            
            // Preload critical assets
            if (this.options.preloadCritical) {
                await this.preloadCriticalAssets();
            }
            
            this.isInitialized = true;
            this.logger.info('AssetManager initialized successfully');
            this.emit('initialized');
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize AssetManager:', error);
            throw error;
        }
    }

    /**
     * Load and validate asset manifest
     */
    async loadAssetManifest() {
        try {
            // Try to load from local manifest first
            const manifestPath = electronIntegration.getAssetPath('manifest.json');
            
            let manifestData;
            try {
                const response = await fetch(manifestPath);
                if (response.ok) {
                    manifestData = await response.json();
                } else {
                    throw new Error(`Failed to load manifest: ${response.status}`);
                }
            } catch (error) {
                // Fallback to default manifest
                manifestData = this.getDefaultManifest();
                this.logger.warn('Using default manifest due to load error:', error.message);
            }
            
            // Validate manifest structure
            if (!this.validateManifest(manifestData)) {
                throw new Error('Invalid manifest structure');
            }
            
            this.assetManifest = manifestData;
            this.updateLoadingProgress();
            
            this.logger.info('Asset manifest loaded:', {
                version: manifestData.version,
                totalAssets: this.getTotalAssetCount()
            });
            
        } catch (error) {
            this.logger.error('Failed to load asset manifest:', error);
            throw error;
        }
    }

    /**
     * Get default asset manifest when none is available
     */
    getDefaultManifest() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            assets: {
                audio: {
                    effects: {
                        'engine_start': { path: 'audio/effects/engine_start.mp3', size: 0, checksum: null, critical: true },
                        'engine_idle': { path: 'audio/effects/engine_idle.mp3', size: 0, checksum: null, critical: true },
                        'engine_rev': { path: 'audio/effects/engine_rev.mp3', size: 0, checksum: null, critical: true },
                        'tire_screech': { path: 'audio/effects/tire_screech.mp3', size: 0, checksum: null, critical: false },
                        'brake_squeal': { path: 'audio/effects/brake_squeal.mp3', size: 0, checksum: null, critical: false },
                        'zombie_hit_soft': { path: 'audio/effects/zombie_hit_soft.mp3', size: 0, checksum: null, critical: false },
                        'zombie_hit_hard': { path: 'audio/effects/zombie_hit_hard.mp3', size: 0, checksum: null, critical: false },
                        'zombie_splat': { path: 'audio/effects/zombie_splat.mp3', size: 0, checksum: null, critical: false },
                        'metal_impact': { path: 'audio/effects/metal_impact.mp3', size: 0, checksum: null, critical: false },
                        'glass_break': { path: 'audio/effects/glass_break.mp3', size: 0, checksum: null, critical: false },
                        'explosion_small': { path: 'audio/effects/explosion_small.mp3', size: 0, checksum: null, critical: false },
                        'explosion_large': { path: 'audio/effects/explosion_large.mp3', size: 0, checksum: null, critical: false }
                    },
                    music: {
                        'menu_theme': { path: 'audio/music/menu_theme.mp3', size: 0, checksum: null, critical: true },
                        'gameplay_calm': { path: 'audio/music/gameplay_calm.mp3', size: 0, checksum: null, critical: false },
                        'gameplay_intense': { path: 'audio/music/gameplay_intense.mp3', size: 0, checksum: null, critical: false },
                        'garage_theme': { path: 'audio/music/garage_theme.mp3', size: 0, checksum: null, critical: false }
                    }
                },
                textures: {
                    vehicles: {
                        'sedan_diffuse': { path: 'textures/vehicles/sedan_diffuse.jpg', size: 0, checksum: null, critical: true },
                        'sedan_normal': { path: 'textures/vehicles/sedan_normal.jpg', size: 0, checksum: null, critical: false },
                        'truck_diffuse': { path: 'textures/vehicles/truck_diffuse.jpg', size: 0, checksum: null, critical: false },
                        'monster_truck_diffuse': { path: 'textures/vehicles/monster_truck_diffuse.jpg', size: 0, checksum: null, critical: false }
                    },
                    environment: {
                        'road_texture': { path: 'textures/environment/road.jpg', size: 0, checksum: null, critical: true },
                        'grass_texture': { path: 'textures/environment/grass.jpg', size: 0, checksum: null, critical: true },
                        'building_texture': { path: 'textures/environment/building.jpg', size: 0, checksum: null, critical: false },
                        'sky_texture': { path: 'textures/environment/sky.jpg', size: 0, checksum: null, critical: true }
                    },
                    ui: {
                        'button_normal': { path: 'textures/ui/button_normal.png', size: 0, checksum: null, critical: true },
                        'button_hover': { path: 'textures/ui/button_hover.png', size: 0, checksum: null, critical: true },
                        'hud_background': { path: 'textures/ui/hud_bg.png', size: 0, checksum: null, critical: true }
                    }
                },
                models: {
                    vehicles: {
                        'sedan': { path: 'models/vehicles/sedan.glb', size: 0, checksum: null, critical: true },
                        'truck': { path: 'models/vehicles/truck.glb', size: 0, checksum: null, critical: false },
                        'monster_truck': { path: 'models/vehicles/monster_truck.glb', size: 0, checksum: null, critical: false }
                    },
                    zombies: {
                        'zombie_basic': { path: 'models/zombies/zombie_basic.glb', size: 0, checksum: null, critical: true },
                        'zombie_runner': { path: 'models/zombies/zombie_runner.glb', size: 0, checksum: null, critical: false },
                        'zombie_boss': { path: 'models/zombies/zombie_boss.glb', size: 0, checksum: null, critical: false }
                    },
                    environment: {
                        'building_01': { path: 'models/environment/building_01.glb', size: 0, checksum: null, critical: false },
                        'tree_01': { path: 'models/environment/tree_01.glb', size: 0, checksum: null, critical: false },
                        'debris_01': { path: 'models/environment/debris_01.glb', size: 0, checksum: null, critical: false }
                    }
                },
                data: {
                    levels: {
                        'level_configs': { path: 'data/levels/configs.json', size: 0, checksum: null, critical: true },
                        'vehicle_configs': { path: 'data/vehicles/configs.json', size: 0, checksum: null, critical: true },
                        'zombie_configs': { path: 'data/zombies/configs.json', size: 0, checksum: null, critical: true }
                    }
                }
            }
        };
    }

    /**
     * Validate manifest structure
     */
    validateManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            return false;
        }
        
        if (!manifest.version || !manifest.assets) {
            return false;
        }
        
        // Validate asset structure
        for (const [category, subcategories] of Object.entries(manifest.assets)) {
            if (typeof subcategories !== 'object') {
                return false;
            }
            
            for (const [subcategory, assets] of Object.entries(subcategories)) {
                if (typeof assets !== 'object') {
                    return false;
                }
                
                for (const [assetName, assetInfo] of Object.entries(assets)) {
                    if (!assetInfo.path) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    /**
     * Initialize cache system
     */
    initializeCache() {
        // Set up cache cleanup interval
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Every minute
        
        this.logger.info('Asset cache initialized');
    }

    /**
     * Preload critical assets
     */
    async preloadCriticalAssets() {
        const criticalAssets = this.getCriticalAssets();
        
        this.logger.info(`Preloading ${criticalAssets.length} critical assets`);
        
        const loadPromises = criticalAssets.map(asset => 
            this.loadAsset(asset.category, asset.subcategory, asset.name)
                .catch(error => {
                    this.logger.warn(`Failed to preload critical asset ${asset.name}:`, error);
                    return null;
                })
        );
        
        await Promise.allSettled(loadPromises);
        
        this.logger.info('Critical assets preloading completed');
    }

    /**
     * Get list of critical assets
     */
    getCriticalAssets() {
        const critical = [];
        
        if (!this.assetManifest) return critical;
        
        for (const [category, subcategories] of Object.entries(this.assetManifest.assets)) {
            for (const [subcategory, assets] of Object.entries(subcategories)) {
                for (const [name, info] of Object.entries(assets)) {
                    if (info.critical) {
                        critical.push({ category, subcategory, name, info });
                    }
                }
            }
        }
        
        return critical;
    }

    /**
     * Load an asset by category, subcategory, and name
     */
    async loadAsset(category, subcategory, name, options = {}) {
        const assetKey = `${category}/${subcategory}/${name}`;
        
        // Check if already loaded
        if (this.assets.has(assetKey)) {
            this.updateLastAccessed(assetKey);
            return this.assets.get(assetKey);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has(assetKey)) {
            return this.loadingPromises.get(assetKey);
        }
        
        // Get asset info from manifest
        const assetInfo = this.getAssetInfo(category, subcategory, name);
        if (!assetInfo) {
            throw new Error(`Asset not found in manifest: ${assetKey}`);
        }
        
        // Create loading promise
        const loadingPromise = this.performAssetLoad(assetKey, assetInfo, options);
        this.loadingPromises.set(assetKey, loadingPromise);
        
        try {
            const asset = await loadingPromise;
            this.assets.set(assetKey, asset);
            this.updateLastAccessed(assetKey);
            this.updateLoadingProgress();
            
            this.emit('assetLoaded', { key: assetKey, asset });
            return asset;
            
        } catch (error) {
            this.failedAssets.add(assetKey);
            this.updateLoadingProgress();
            this.emit('assetError', { key: assetKey, error });
            throw error;
            
        } finally {
            this.loadingPromises.delete(assetKey);
        }
    }

    /**
     * Perform the actual asset loading with retry logic
     */
    async performAssetLoad(assetKey, assetInfo, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
            try {
                return await this.loadAssetWithType(assetKey, assetInfo, options);
            } catch (error) {
                lastError = error;
                
                if (attempt < this.options.retryAttempts) {
                    this.logger.warn(`Asset load attempt ${attempt} failed for ${assetKey}, retrying...`);
                    await this.delay(this.options.retryDelay * attempt);
                } else {
                    this.logger.error(`All ${this.options.retryAttempts} attempts failed for ${assetKey}`);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Load asset based on its type
     */
    async loadAssetWithType(assetKey, assetInfo, options = {}) {
        const fullPath = electronIntegration.getAssetPath(assetInfo.path);
        const [category] = assetKey.split('/');
        
        switch (category) {
            case 'audio':
                return await this.loadAudioAsset(fullPath, assetInfo, options);
            case 'textures':
                return await this.loadTextureAsset(fullPath, assetInfo, options);
            case 'models':
                return await this.loadModelAsset(fullPath, assetInfo, options);
            case 'data':
                return await this.loadDataAsset(fullPath, assetInfo, options);
            case 'shaders':
                return await this.loadShaderAsset(fullPath, assetInfo, options);
            case 'fonts':
                return await this.loadFontAsset(fullPath, assetInfo, options);
            default:
                throw new Error(`Unknown asset category: ${category}`);
        }
    }

    /**
     * Load audio asset
     */
    async loadAudioAsset(path, assetInfo, options = {}) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            return {
                type: 'audio',
                buffer: audioBuffer,
                context: audioContext,
                path,
                size: arrayBuffer.byteLength,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            // Return a fallback silent audio buffer
            this.logger.warn(`Failed to load audio asset ${path}, using fallback:`, error);
            return this.createFallbackAudioAsset();
        }
    }

    /**
     * Load texture asset
     */
    async loadTextureAsset(path, assetInfo, options = {}) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                // Create canvas for texture processing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                
                resolve({
                    type: 'texture',
                    image,
                    canvas,
                    width: image.width,
                    height: image.height,
                    path,
                    loadedAt: Date.now()
                });
            };
            
            image.onerror = () => {
                // Create fallback texture
                this.logger.warn(`Failed to load texture ${path}, using fallback`);
                resolve(this.createFallbackTexture());
            };
            
            image.src = path;
        });
    }

    /**
     * Load 3D model asset
     */
    async loadModelAsset(path, assetInfo, options = {}) {
        try {
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            return {
                type: 'model',
                data: arrayBuffer,
                path,
                size: arrayBuffer.byteLength,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            this.logger.warn(`Failed to load model ${path}, using fallback:`, error);
            return this.createFallbackModel();
        }
    }

    /**
     * Load data asset (JSON, etc.)
     */
    async loadDataAsset(path, assetInfo, options = {}) {
        try {
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            let data;
            
            // Try to parse as JSON
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                // If not JSON, return as text
                data = text;
            }
            
            return {
                type: 'data',
                data,
                raw: text,
                path,
                size: text.length,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            this.logger.warn(`Failed to load data asset ${path}:`, error);
            return {
                type: 'data',
                data: {},
                raw: '{}',
                path,
                size: 2,
                loadedAt: Date.now(),
                fallback: true
            };
        }
    }

    /**
     * Load shader asset
     */
    async loadShaderAsset(path, assetInfo, options = {}) {
        try {
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const source = await response.text();
            
            return {
                type: 'shader',
                source,
                path,
                size: source.length,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            this.logger.warn(`Failed to load shader ${path}:`, error);
            return {
                type: 'shader',
                source: '// Fallback shader\nvoid main() { gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }',
                path,
                size: 0,
                loadedAt: Date.now(),
                fallback: true
            };
        }
    }

    /**
     * Load font asset
     */
    async loadFontAsset(path, assetInfo, options = {}) {
        try {
            const fontFace = new FontFace(assetInfo.name || 'CustomFont', `url(${path})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            
            return {
                type: 'font',
                fontFace,
                path,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            this.logger.warn(`Failed to load font ${path}:`, error);
            return {
                type: 'font',
                fontFace: null,
                path,
                loadedAt: Date.now(),
                fallback: true
            };
        }
    }

    /**
     * Create fallback assets
     */
    createFallbackAudioAsset() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        
        return {
            type: 'audio',
            buffer,
            context: audioContext,
            path: 'fallback',
            size: 0,
            loadedAt: Date.now(),
            fallback: true
        };
    }

    createFallbackTexture() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 64;
        canvas.height = 64;
        
        // Create checkerboard pattern
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#000000';
        for (let x = 0; x < 64; x += 8) {
            for (let y = 0; y < 64; y += 8) {
                if ((x + y) % 16 === 0) {
                    ctx.fillRect(x, y, 8, 8);
                }
            }
        }
        
        return {
            type: 'texture',
            image: null,
            canvas,
            width: 64,
            height: 64,
            path: 'fallback',
            loadedAt: Date.now(),
            fallback: true
        };
    }

    createFallbackModel() {
        // Simple cube geometry data
        const cubeData = new ArrayBuffer(1024); // Minimal cube data
        
        return {
            type: 'model',
            data: cubeData,
            path: 'fallback',
            size: cubeData.byteLength,
            loadedAt: Date.now(),
            fallback: true
        };
    }

    /**
     * Get asset info from manifest
     */
    getAssetInfo(category, subcategory, name) {
        if (!this.assetManifest || !this.assetManifest.assets) {
            return null;
        }
        
        const categoryAssets = this.assetManifest.assets[category];
        if (!categoryAssets) return null;
        
        const subcategoryAssets = categoryAssets[subcategory];
        if (!subcategoryAssets) return null;
        
        return subcategoryAssets[name] || null;
    }

    /**
     * Get total asset count from manifest
     */
    getTotalAssetCount() {
        if (!this.assetManifest) return 0;
        
        let count = 0;
        for (const subcategories of Object.values(this.assetManifest.assets)) {
            for (const assets of Object.values(subcategories)) {
                count += Object.keys(assets).length;
            }
        }
        return count;
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress() {
        const total = this.getTotalAssetCount();
        const loaded = this.assets.size;
        const failed = this.failedAssets.size;
        
        this.loadingProgress = {
            total,
            loaded,
            failed,
            percentage: total > 0 ? Math.round((loaded / total) * 100) : 0
        };
        
        this.emit('progressUpdate', this.loadingProgress);
    }

    /**
     * Update last accessed time for cache management
     */
    updateLastAccessed(assetKey) {
        this.lastAccessed.set(assetKey, Date.now());
    }

    /**
     * Clean up cache based on size and access time
     */
    cleanupCache() {
        if (this.cacheSize <= this.options.maxCacheSize) {
            return;
        }
        
        // Sort by last accessed time (oldest first)
        const sortedAssets = Array.from(this.lastAccessed.entries())
            .sort((a, b) => a[1] - b[1]);
        
        // Remove oldest assets until under cache limit
        for (const [assetKey] of sortedAssets) {
            if (this.cacheSize <= this.options.maxCacheSize * 0.8) {
                break;
            }
            
            const asset = this.assets.get(assetKey);
            if (asset && !this.isCriticalAsset(assetKey)) {
                this.unloadAsset(assetKey);
            }
        }
        
        this.logger.info(`Cache cleanup completed. Size: ${this.formatBytes(this.cacheSize)}`);
    }

    /**
     * Check if asset is critical
     */
    isCriticalAsset(assetKey) {
        const [category, subcategory, name] = assetKey.split('/');
        const assetInfo = this.getAssetInfo(category, subcategory, name);
        return assetInfo && assetInfo.critical;
    }

    /**
     * Unload an asset from memory
     */
    unloadAsset(assetKey) {
        const asset = this.assets.get(assetKey);
        if (!asset) return false;
        
        // Clean up asset-specific resources
        if (asset.type === 'audio' && asset.context) {
            asset.context.close();
        }
        
        this.assets.delete(assetKey);
        this.lastAccessed.delete(assetKey);
        
        if (asset.size) {
            this.cacheSize -= asset.size;
        }
        
        this.emit('assetUnloaded', { key: assetKey });
        return true;
    }

    /**
     * Get asset by key
     */
    getAsset(category, subcategory, name) {
        const assetKey = `${category}/${subcategory}/${name}`;
        const asset = this.assets.get(assetKey);
        
        if (asset) {
            this.updateLastAccessed(assetKey);
        }
        
        return asset;
    }

    /**
     * Check if asset is loaded
     */
    isAssetLoaded(category, subcategory, name) {
        const assetKey = `${category}/${subcategory}/${name}`;
        return this.assets.has(assetKey);
    }

    /**
     * Get loading progress
     */
    getLoadingProgress() {
        return { ...this.loadingProgress };
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            totalAssets: this.assets.size,
            cacheSize: this.cacheSize,
            maxCacheSize: this.options.maxCacheSize,
            utilizationPercentage: Math.round((this.cacheSize / this.options.maxCacheSize) * 100),
            failedAssets: this.failedAssets.size
        };
    }

    /**
     * Verify asset integrity (if checksums available)
     */
    async verifyAssetIntegrity(assetKey) {
        if (!this.options.enableIntegrityCheck) {
            return true;
        }
        
        const [category, subcategory, name] = assetKey.split('/');
        const assetInfo = this.getAssetInfo(category, subcategory, name);
        
        if (!assetInfo || !assetInfo.checksum) {
            return true; // No checksum to verify against
        }
        
        const asset = this.assets.get(assetKey);
        if (!asset) {
            return false;
        }
        
        // TODO: Implement checksum verification
        // This would require calculating checksums of loaded assets
        // and comparing against manifest checksums
        
        return true;
    }

    /**
     * Utility methods
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Unload all assets
        for (const assetKey of this.assets.keys()) {
            this.unloadAsset(assetKey);
        }
        
        // Clear all data structures
        this.assets.clear();
        this.cache.clear();
        this.loadingPromises.clear();
        this.failedAssets.clear();
        this.lastAccessed.clear();
        
        // Clear categories
        Object.values(this.categories).forEach(category => category.clear());
        
        this.isInitialized = false;
        this.logger.info('AssetManager disposed');
    }
}

// Export singleton instance
export const assetManager = new AssetManager();