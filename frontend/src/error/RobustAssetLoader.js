/**
 * Robust Asset Loader with comprehensive error handling and fallback systems
 * Extends the base AssetLoader with enhanced error recovery capabilities
 */

import * as THREE from 'three';
import { AssetLoadingError } from './ErrorHandler.js';

export class RobustAssetLoader {
    constructor(options = {}) {
        this.options = {
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            enableFallbacks: options.enableFallbacks !== false,
            enableCaching: options.enableCaching !== false,
            cacheSize: options.cacheSize || 100,
            compressionFormats: options.compressionFormats || ['webp', 'jpg', 'png'],
            ...options
        };

        // Three.js loaders
        this.loadingManager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = null;
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.fontLoader = new THREE.FontLoader(this.loadingManager);
        
        // Asset caches with LRU eviction
        this.textureCache = new Map();
        this.modelCache = new Map();
        this.audioCache = new Map();
        this.fontCache = new Map();
        this.materialCache = new Map();
        
        // Fallback assets
        this.fallbackAssets = new Map();
        
        // Loading state
        this.loadingQueue = [];
        this.failedAssets = new Map();
        this.retryAttempts = new Map();
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            successfulLoads: 0,
            failedLoads: 0,
            fallbacksUsed: 0,
            cacheHits: 0
        };

        this._setupLoadingManager();
        this._createFallbackAssets();
    }

    /**
     * Setup loading manager with error handling
     */
    _setupLoadingManager() {
        this.loadingManager.onLoad = () => {
            console.log('All assets loaded successfully');
        };

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = itemsLoaded / itemsTotal;
            this._notifyProgress(progress, itemsLoaded, itemsTotal);
        };

        this.loadingManager.onError = (url) => {
            console.error(`Loading manager error for: ${url}`);
            this._handleLoadingError(url, new Error('Loading manager error'));
        };
    }

    /**
     * Create fallback assets
     */
    _createFallbackAssets() {
        // Fallback texture (checkerboard pattern)
        this.fallbackAssets.set('texture', this._createFallbackTexture());
        
        // Fallback model (simple cube)
        this.fallbackAssets.set('model', this._createFallbackModel());
        
        // Fallback material
        this.fallbackAssets.set('material', this._createFallbackMaterial());
        
        // Silent audio buffer
        this.fallbackAssets.set('audio', this._createSilentAudioBuffer());
    }

    /**
     * Load texture with comprehensive error handling
     */
    async loadTexture(url, options = {}) {
        this.stats.totalRequests++;
        
        // Check cache first
        const cacheKey = this._getCacheKey('texture', url, options);
        if (this.options.enableCaching && this.textureCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.textureCache.get(cacheKey);
        }

        try {
            const texture = await this._loadTextureWithRetry(url, options);
            
            // Cache successful load
            if (this.options.enableCaching) {
                this._addToCache(this.textureCache, cacheKey, texture);
            }
            
            this.stats.successfulLoads++;
            return texture;
        } catch (error) {
            this.stats.failedLoads++;
            return this._handleTextureLoadingError(url, error, options);
        }
    }

    /**
     * Load model with error handling
     */
    async loadModel(url, options = {}) {
        this.stats.totalRequests++;
        
        const cacheKey = this._getCacheKey('model', url, options);
        if (this.options.enableCaching && this.modelCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.modelCache.get(cacheKey).clone();
        }

        try {
            const model = await this._loadModelWithRetry(url, options);
            
            if (this.options.enableCaching) {
                this._addToCache(this.modelCache, cacheKey, model);
            }
            
            this.stats.successfulLoads++;
            return model.clone();
        } catch (error) {
            this.stats.failedLoads++;
            return this._handleModelLoadingError(url, error, options);
        }
    }

    /**
     * Load audio with error handling
     */
    async loadAudio(url, options = {}) {
        this.stats.totalRequests++;
        
        const cacheKey = this._getCacheKey('audio', url, options);
        if (this.options.enableCaching && this.audioCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.audioCache.get(cacheKey);
        }

        try {
            const audioBuffer = await this._loadAudioWithRetry(url, options);
            
            if (this.options.enableCaching) {
                this._addToCache(this.audioCache, cacheKey, audioBuffer);
            }
            
            this.stats.successfulLoads++;
            return audioBuffer;
        } catch (error) {
            this.stats.failedLoads++;
            return this._handleAudioLoadingError(url, error, options);
        }
    }

    /**
     * Load font with error handling
     */
    async loadFont(url, options = {}) {
        this.stats.totalRequests++;
        
        const cacheKey = this._getCacheKey('font', url, options);
        if (this.options.enableCaching && this.fontCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.fontCache.get(cacheKey);
        }

        try {
            const font = await this._loadFontWithRetry(url, options);
            
            if (this.options.enableCaching) {
                this._addToCache(this.fontCache, cacheKey, font);
            }
            
            this.stats.successfulLoads++;
            return font;
        } catch (error) {
            this.stats.failedLoads++;
            return this._handleFontLoadingError(url, error, options);
        }
    }

    /**
     * Load texture with retry logic
     */
    async _loadTextureWithRetry(url, options) {
        const retryKey = `texture_${url}`;
        let attempts = this.retryAttempts.get(retryKey) || 0;
        
        for (let i = attempts; i < this.options.maxRetries; i++) {
            try {
                // Try different formats if available
                const urlToTry = this._getOptimalTextureUrl(url, i);
                const texture = await this._loadTextureAsync(urlToTry);
                
                // Apply options
                this._applyTextureOptions(texture, options);
                
                // Reset retry count on success
                this.retryAttempts.delete(retryKey);
                return texture;
            } catch (error) {
                attempts++;
                this.retryAttempts.set(retryKey, attempts);
                
                if (i < this.options.maxRetries - 1) {
                    await this._sleep(this.options.retryDelay * (i + 1));
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Load model with retry logic
     */
    async _loadModelWithRetry(url, options) {
        if (!this.gltfLoader) {
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
            this.gltfLoader = new GLTFLoader(this.loadingManager);
        }

        const retryKey = `model_${url}`;
        let attempts = this.retryAttempts.get(retryKey) || 0;
        
        for (let i = attempts; i < this.options.maxRetries; i++) {
            try {
                const gltf = await this._loadModelAsync(url);
                const model = this._processModel(gltf.scene, options);
                
                this.retryAttempts.delete(retryKey);
                return model;
            } catch (error) {
                attempts++;
                this.retryAttempts.set(retryKey, attempts);
                
                if (i < this.options.maxRetries - 1) {
                    await this._sleep(this.options.retryDelay * (i + 1));
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Load audio with retry logic
     */
    async _loadAudioWithRetry(url, options) {
        const retryKey = `audio_${url}`;
        let attempts = this.retryAttempts.get(retryKey) || 0;
        
        for (let i = attempts; i < this.options.maxRetries; i++) {
            try {
                const audioBuffer = await this._loadAudioAsync(url);
                
                this.retryAttempts.delete(retryKey);
                return audioBuffer;
            } catch (error) {
                attempts++;
                this.retryAttempts.set(retryKey, attempts);
                
                if (i < this.options.maxRetries - 1) {
                    await this._sleep(this.options.retryDelay * (i + 1));
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Load font with retry logic
     */
    async _loadFontWithRetry(url, options) {
        const retryKey = `font_${url}`;
        let attempts = this.retryAttempts.get(retryKey) || 0;
        
        for (let i = attempts; i < this.options.maxRetries; i++) {
            try {
                const font = await this._loadFontAsync(url);
                
                this.retryAttempts.delete(retryKey);
                return font;
            } catch (error) {
                attempts++;
                this.retryAttempts.set(retryKey, attempts);
                
                if (i < this.options.maxRetries - 1) {
                    await this._sleep(this.options.retryDelay * (i + 1));
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Handle texture loading error with fallbacks
     */
    _handleTextureLoadingError(url, error, options) {
        console.error(`Failed to load texture: ${url}`, error);
        
        this.failedAssets.set(url, {
            type: 'texture',
            error: error.message,
            timestamp: Date.now()
        });

        if (this.options.enableFallbacks) {
            this.stats.fallbacksUsed++;
            
            // Try to find alternative texture
            const fallbackUrl = this._findAlternativeTexture(url);
            if (fallbackUrl) {
                return this.loadTexture(fallbackUrl, options);
            }
            
            // Use fallback texture
            return this.fallbackAssets.get('texture');
        }

        throw new AssetLoadingError(`Failed to load texture: ${url}`, {
            url,
            type: 'texture',
            error: error.message,
            isCritical: options.critical || false
        });
    }

    /**
     * Handle model loading error with fallbacks
     */
    _handleModelLoadingError(url, error, options) {
        console.error(`Failed to load model: ${url}`, error);
        
        this.failedAssets.set(url, {
            type: 'model',
            error: error.message,
            timestamp: Date.now()
        });

        if (this.options.enableFallbacks) {
            this.stats.fallbacksUsed++;
            
            // Try simplified version
            const simplifiedUrl = this._findSimplifiedModel(url);
            if (simplifiedUrl) {
                return this.loadModel(simplifiedUrl, options);
            }
            
            // Use fallback model
            return this.fallbackAssets.get('model');
        }

        throw new AssetLoadingError(`Failed to load model: ${url}`, {
            url,
            type: 'model',
            error: error.message,
            isCritical: options.critical || false
        });
    }

    /**
     * Handle audio loading error with fallbacks
     */
    _handleAudioLoadingError(url, error, options) {
        console.error(`Failed to load audio: ${url}`, error);
        
        this.failedAssets.set(url, {
            type: 'audio',
            error: error.message,
            timestamp: Date.now()
        });

        if (this.options.enableFallbacks) {
            this.stats.fallbacksUsed++;
            
            // For audio, we can return silent buffer or null
            if (options.allowSilent !== false) {
                return this.fallbackAssets.get('audio');
            }
        }

        throw new AssetLoadingError(`Failed to load audio: ${url}`, {
            url,
            type: 'audio',
            error: error.message,
            isCritical: options.critical || false
        });
    }

    /**
     * Handle font loading error with fallbacks
     */
    _handleFontLoadingError(url, error, options) {
        console.error(`Failed to load font: ${url}`, error);
        
        this.failedAssets.set(url, {
            type: 'font',
            error: error.message,
            timestamp: Date.now()
        });

        if (this.options.enableFallbacks) {
            this.stats.fallbacksUsed++;
            
            // Try system font fallback
            const systemFont = this._getSystemFontFallback();
            if (systemFont) {
                return systemFont;
            }
        }

        throw new AssetLoadingError(`Failed to load font: ${url}`, {
            url,
            type: 'font',
            error: error.message,
            isCritical: options.critical || false
        });
    }

    /**
     * Get optimal texture URL based on format support
     */
    _getOptimalTextureUrl(originalUrl, attempt) {
        if (attempt === 0) return originalUrl;
        
        // Try different formats on retry
        const formats = this.options.compressionFormats;
        const formatIndex = (attempt - 1) % formats.length;
        const format = formats[formatIndex];
        
        // Replace extension with new format
        return originalUrl.replace(/\.[^.]+$/, `.${format}`);
    }

    /**
     * Apply texture options
     */
    _applyTextureOptions(texture, options) {
        if (options.wrapS) texture.wrapS = options.wrapS;
        if (options.wrapT) texture.wrapT = options.wrapT;
        if (options.repeat) texture.repeat.set(options.repeat.x, options.repeat.y);
        if (options.flipY !== undefined) texture.flipY = options.flipY;
        if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
        if (options.minFilter) texture.minFilter = options.minFilter;
        if (options.magFilter) texture.magFilter = options.magFilter;
    }

    /**
     * Process loaded model
     */
    _processModel(model, options) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = options.castShadow !== false;
                child.receiveShadow = options.receiveShadow !== false;
                
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => this._configureMaterial(mat, options));
                    } else {
                        this._configureMaterial(child.material, options);
                    }
                }
            }
        });
        
        return model;
    }

    /**
     * Configure material properties
     */
    _configureMaterial(material, options) {
        if (options.metalness !== undefined) material.metalness = options.metalness;
        if (options.roughness !== undefined) material.roughness = options.roughness;
        if (options.transparent !== undefined) material.transparent = options.transparent;
        if (options.opacity !== undefined) material.opacity = options.opacity;
    }

    /**
     * Find alternative texture
     */
    _findAlternativeTexture(url) {
        // Try different resolutions
        const resolutions = ['_1k', '_512', '_256'];
        for (const res of resolutions) {
            const altUrl = url.replace(/(\.[^.]+)$/, `${res}$1`);
            if (altUrl !== url) {
                return altUrl;
            }
        }
        return null;
    }

    /**
     * Find simplified model
     */
    _findSimplifiedModel(url) {
        // Try LOD versions
        const lodSuffixes = ['_lod1', '_lod2', '_simple'];
        for (const suffix of lodSuffixes) {
            const altUrl = url.replace(/(\.[^.]+)$/, `${suffix}$1`);
            if (altUrl !== url) {
                return altUrl;
            }
        }
        return null;
    }

    /**
     * Get system font fallback
     */
    _getSystemFontFallback() {
        // Return a basic system font configuration
        return {
            family: 'Arial, sans-serif',
            size: 16,
            weight: 'normal'
        };
    }

    /**
     * Create fallback texture
     */
    _createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Create magenta/black checkerboard (missing texture indicator)
        context.fillStyle = '#ff00ff';
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = '#000000';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if ((i + j) % 2 === 0) {
                    context.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Create fallback model
     */
    _createFallbackModel() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff,
            wireframe: true
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Create fallback material
     */
    _createFallbackMaterial() {
        return new THREE.MeshBasicMaterial({ 
            color: 0xff00ff,
            transparent: true,
            opacity: 0.5
        });
    }

    /**
     * Create silent audio buffer
     */
    _createSilentAudioBuffer() {
        // Create a short silent audio buffer
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
        return buffer;
    }

    /**
     * Add to cache with LRU eviction
     */
    _addToCache(cache, key, value) {
        // Remove oldest if at capacity
        if (cache.size >= this.options.cacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        cache.set(key, value);
    }

    /**
     * Get cache key
     */
    _getCacheKey(type, url, options) {
        return `${type}_${url}_${JSON.stringify(options)}`;
    }

    /**
     * Handle loading error
     */
    _handleLoadingError(url, error) {
        console.error(`Asset loading error for ${url}:`, error);
    }

    /**
     * Notify progress
     */
    _notifyProgress(progress, loaded, total) {
        // Override in subclass or add event listeners
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Async texture loading
     */
    _loadTextureAsync(url) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Async model loading
     */
    _loadModelAsync(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Async audio loading
     */
    _loadAudioAsync(url) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Async font loading
     */
    _loadFontAsync(url) {
        return new Promise((resolve, reject) => {
            this.fontLoader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: {
                textures: this.textureCache.size,
                models: this.modelCache.size,
                audio: this.audioCache.size,
                fonts: this.fontCache.size
            },
            failedAssets: this.failedAssets.size,
            retryAttempts: this.retryAttempts.size
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.textureCache.clear();
        this.modelCache.clear();
        this.audioCache.clear();
        this.fontCache.clear();
        this.materialCache.clear();
        this.failedAssets.clear();
        this.retryAttempts.clear();
    }

    /**
     * Get failed assets
     */
    getFailedAssets() {
        return Array.from(this.failedAssets.entries()).map(([url, info]) => ({
            url,
            ...info
        }));
    }
}

export default RobustAssetLoader;