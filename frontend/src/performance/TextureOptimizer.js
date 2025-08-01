import * as THREE from 'three';

/**
 * Texture Optimizer - Handles texture compression and optimization
 */
export class TextureOptimizer {
    constructor() {
        this.textureCache = new Map();
        this.compressionFormats = this._detectCompressionSupport();
        this.qualitySettings = {
            high: { maxSize: 2048, quality: 0.95, mipMaps: true },
            medium: { maxSize: 1024, quality: 0.85, mipMaps: true },
            low: { maxSize: 512, quality: 0.7, mipMaps: false }
        };
        this.currentQuality = 'high';
    }

    /**
     * Optimize texture based on current quality settings
     */
    optimizeTexture(texture, options = {}) {
        if (!texture || !texture.image) return texture;

        const cacheKey = this._generateCacheKey(texture, options);
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }

        const settings = this.qualitySettings[this.currentQuality];
        const optimizedTexture = this._processTexture(texture, settings, options);
        
        this.textureCache.set(cacheKey, optimizedTexture);
        return optimizedTexture;
    }

    /**
     * Set quality level for texture optimization
     */
    setQuality(quality) {
        if (!this.qualitySettings[quality]) {
            console.warn(`Invalid texture quality: ${quality}`);
            return;
        }
        
        this.currentQuality = quality;
        this.clearCache(); // Clear cache to force re-optimization
        console.log(`Texture quality set to: ${quality}`);
    }

    /**
     * Create compressed texture atlas
     */
    createTextureAtlas(textures, atlasSize = 2048) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = atlasSize;
        canvas.height = atlasSize;

        const atlas = {
            texture: null,
            uvMappings: new Map(),
            textureSize: atlasSize
        };

        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;

        textures.forEach((texture, key) => {
            if (!texture.image) return;

            const img = texture.image;
            const scale = Math.min(1, atlasSize / Math.max(img.width, img.height));
            const width = Math.floor(img.width * scale);
            const height = Math.floor(img.height * scale);

            // Check if we need to move to next row
            if (currentX + width > atlasSize) {
                currentX = 0;
                currentY += rowHeight;
                rowHeight = 0;
            }

            // Check if we have space
            if (currentY + height > atlasSize) {
                console.warn('Texture atlas is full, some textures may not be included');
                return;
            }

            // Draw texture to atlas
            ctx.drawImage(img, currentX, currentY, width, height);

            // Store UV mapping
            atlas.uvMappings.set(key, {
                u: currentX / atlasSize,
                v: currentY / atlasSize,
                width: width / atlasSize,
                height: height / atlasSize
            });

            currentX += width;
            rowHeight = Math.max(rowHeight, height);
        });

        // Create Three.js texture from canvas
        atlas.texture = new THREE.CanvasTexture(canvas);
        atlas.texture.wrapS = THREE.ClampToEdgeWrapping;
        atlas.texture.wrapT = THREE.ClampToEdgeWrapping;
        atlas.texture.minFilter = THREE.LinearFilter;
        atlas.texture.magFilter = THREE.LinearFilter;

        return atlas;
    }

    /**
     * Compress texture using available formats
     */
    compressTexture(texture, format = 'auto') {
        if (!texture || !texture.image) return texture;

        let targetFormat = format;
        if (format === 'auto') {
            targetFormat = this._selectBestFormat();
        }

        if (!this.compressionFormats[targetFormat]) {
            console.warn(`Compression format ${targetFormat} not supported`);
            return texture;
        }

        return this._applyCompression(texture, targetFormat);
    }

    /**
     * Create mipmap chain for texture
     */
    generateMipmaps(texture, levels = 4) {
        if (!texture || !texture.image) return texture;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = texture.image;

        let width = img.width;
        let height = img.height;
        const mipmaps = [];

        for (let i = 0; i < levels; i++) {
            canvas.width = width;
            canvas.height = height;
            
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Create texture for this mip level
            const mipTexture = new THREE.CanvasTexture(canvas);
            mipTexture.wrapS = texture.wrapS;
            mipTexture.wrapT = texture.wrapT;
            mipTexture.minFilter = THREE.LinearFilter;
            mipTexture.magFilter = THREE.LinearFilter;
            
            mipmaps.push(mipTexture);

            width = Math.max(1, Math.floor(width / 2));
            height = Math.max(1, Math.floor(height / 2));
        }

        return mipmaps;
    }

    /**
     * Optimize texture memory usage
     */
    optimizeMemoryUsage() {
        let totalMemory = 0;
        let optimizedMemory = 0;

        this.textureCache.forEach(texture => {
            if (texture.image) {
                const originalSize = texture.image.width * texture.image.height * 4; // RGBA
                totalMemory += originalSize;
                
                // Estimate optimized size based on format and compression
                const optimizedSize = this._estimateOptimizedSize(texture);
                optimizedMemory += optimizedSize;
            }
        });

        return {
            originalMemory: totalMemory,
            optimizedMemory: optimizedMemory,
            savings: totalMemory - optimizedMemory,
            compressionRatio: totalMemory > 0 ? optimizedMemory / totalMemory : 1
        };
    }

    /**
     * Clear texture cache
     */
    clearCache() {
        this.textureCache.forEach(texture => {
            if (texture.dispose) {
                texture.dispose();
            }
        });
        this.textureCache.clear();
    }

    /**
     * Get optimization statistics
     */
    getStats() {
        const memoryStats = this.optimizeMemoryUsage();
        
        return {
            cachedTextures: this.textureCache.size,
            currentQuality: this.currentQuality,
            supportedFormats: Object.keys(this.compressionFormats).filter(
                format => this.compressionFormats[format]
            ),
            memoryUsage: memoryStats
        };
    }

    /**
     * Process texture with given settings
     */
    _processTexture(texture, settings, options) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = texture.image;

        // Calculate target size
        const maxSize = options.maxSize || settings.maxSize;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        // Draw with quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = settings.quality > 0.9 ? 'high' : 
                                   settings.quality > 0.7 ? 'medium' : 'low';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Create optimized texture
        const optimizedTexture = new THREE.CanvasTexture(canvas);
        optimizedTexture.wrapS = texture.wrapS;
        optimizedTexture.wrapT = texture.wrapT;
        optimizedTexture.minFilter = settings.mipMaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
        optimizedTexture.magFilter = THREE.LinearFilter;
        optimizedTexture.generateMipmaps = settings.mipMaps;

        return optimizedTexture;
    }

    /**
     * Detect supported compression formats
     */
    _detectCompressionSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return { none: true };
        }

        const formats = {
            s3tc: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
            etc1: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
            pvrtc: !!gl.getExtension('WEBGL_compressed_texture_pvrtc'),
            astc: !!gl.getExtension('WEBGL_compressed_texture_astc'),
            etc: !!gl.getExtension('WEBGL_compressed_texture_etc')
        };

        return formats;
    }

    /**
     * Select best compression format
     */
    _selectBestFormat() {
        if (this.compressionFormats.astc) return 'astc';
        if (this.compressionFormats.etc) return 'etc';
        if (this.compressionFormats.s3tc) return 's3tc';
        if (this.compressionFormats.pvrtc) return 'pvrtc';
        if (this.compressionFormats.etc1) return 'etc1';
        return 'none';
    }

    /**
     * Apply compression to texture
     */
    _applyCompression(texture, format) {
        // This is a simplified implementation
        // In a real scenario, you would use proper compression libraries
        console.log(`Applying ${format} compression to texture`);
        return texture; // Return original for now
    }

    /**
     * Generate cache key for texture
     */
    _generateCacheKey(texture, options) {
        const img = texture.image;
        const key = `${img.src || 'canvas'}_${this.currentQuality}_${JSON.stringify(options)}`;
        return key;
    }

    /**
     * Estimate optimized texture size
     */
    _estimateOptimizedSize(texture) {
        if (!texture.image) return 0;
        
        const settings = this.qualitySettings[this.currentQuality];
        const img = texture.image;
        const scale = Math.min(1, settings.maxSize / Math.max(img.width, img.height));
        
        const optimizedWidth = Math.floor(img.width * scale);
        const optimizedHeight = Math.floor(img.height * scale);
        
        // Estimate based on quality and format
        const baseSize = optimizedWidth * optimizedHeight * 4; // RGBA
        const compressionRatio = settings.quality * 0.5 + 0.3; // Rough estimate
        
        return Math.floor(baseSize * compressionRatio);
    }

    /**
     * Dispose of texture optimizer
     */
    dispose() {
        this.clearCache();
    }
}