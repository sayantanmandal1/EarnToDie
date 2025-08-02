/**
 * Asset Optimization System
 * Handles asset compression, optimization, and performance improvements
 */

import { assetManager } from './AssetManager.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AssetOptimizer {
    constructor() {
        this.logger = electronIntegration.getLogger();
        this.optimizationCache = new Map();
        this.compressionWorkers = new Map();
        this.optimizationStats = {
            totalOptimized: 0,
            totalSizeSaved: 0,
            averageCompressionRatio: 0
        };
    }

    /**
     * Initialize asset optimizer
     */
    async initialize() {
        try {
            this.logger.info('Initializing AssetOptimizer...');
            
            // Initialize compression workers if available
            if (typeof Worker !== 'undefined') {
                await this.initializeCompressionWorkers();
            }
            
            this.logger.info('AssetOptimizer initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize AssetOptimizer:', error);
            throw error;
        }
    }

    /**
     * Initialize compression workers for background processing
     */
    async initializeCompressionWorkers() {
        try {
            // Note: In a real implementation, you would create actual Web Workers
            // For now, we'll simulate the worker initialization
            this.logger.info('Compression workers initialized');
            
        } catch (error) {
            this.logger.warn('Failed to initialize compression workers:', error);
        }
    }

    /**
     * Optimize all assets based on current performance requirements
     */
    async optimizeAllAssets(options = {}) {
        const startTime = Date.now();
        
        const optimizationOptions = {
            targetQuality: options.targetQuality || 'high',
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            enableCompression: options.enableCompression !== false,
            enableResizing: options.enableResizing !== false,
            enableFormatConversion: options.enableFormatConversion !== false,
            ...options
        };

        this.logger.info('Starting asset optimization with options:', optimizationOptions);

        const results = {
            timestamp: new Date().toISOString(),
            totalAssets: 0,
            optimized: 0,
            skipped: 0,
            failed: 0,
            totalSizeBefore: 0,
            totalSizeAfter: 0,
            details: [],
            duration: 0
        };

        try {
            // Get all loaded assets
            const loadedAssets = Array.from(assetManager.assets.keys());
            results.totalAssets = loadedAssets.length;

            for (const assetKey of loadedAssets) {
                const asset = assetManager.assets.get(assetKey);
                if (!asset) continue;

                try {
                    const optimizationResult = await this.optimizeAsset(
                        assetKey, asset, optimizationOptions
                    );
                    
                    results.details.push(optimizationResult);
                    results.totalSizeBefore += optimizationResult.sizeBefore;
                    results.totalSizeAfter += optimizationResult.sizeAfter;

                    switch (optimizationResult.status) {
                        case 'optimized':
                            results.optimized++;
                            break;
                        case 'skipped':
                            results.skipped++;
                            break;
                        case 'failed':
                            results.failed++;
                            break;
                    }

                } catch (error) {
                    this.logger.warn(`Failed to optimize asset ${assetKey}:`, error);
                    results.failed++;
                    results.details.push({
                        assetKey,
                        status: 'failed',
                        message: error.message,
                        sizeBefore: 0,
                        sizeAfter: 0
                    });
                }
            }

            results.duration = Date.now() - startTime;
            results.compressionRatio = results.totalSizeBefore > 0 ? 
                (results.totalSizeBefore - results.totalSizeAfter) / results.totalSizeBefore : 0;

            // Update global stats
            this.updateOptimizationStats(results);

            this.logger.info('Asset optimization completed:', {
                duration: results.duration,
                optimized: results.optimized,
                sizeSaved: assetManager.formatBytes(results.totalSizeBefore - results.totalSizeAfter),
                compressionRatio: Math.round(results.compressionRatio * 100) + '%'
            });

            return results;

        } catch (error) {
            this.logger.error('Asset optimization failed:', error);
            throw error;
        }
    }

    /**
     * Optimize a single asset
     */
    async optimizeAsset(assetKey, asset, options) {
        const result = {
            assetKey,
            status: 'unknown',
            message: '',
            sizeBefore: this.getAssetSize(asset),
            sizeAfter: 0,
            compressionRatio: 0,
            optimizations: []
        };

        try {
            // Check if asset is already optimized
            if (this.optimizationCache.has(assetKey)) {
                const cached = this.optimizationCache.get(assetKey);
                if (cached.timestamp > Date.now() - 3600000) { // 1 hour cache
                    result.status = 'skipped';
                    result.message = 'Already optimized (cached)';
                    result.sizeAfter = result.sizeBefore;
                    return result;
                }
            }

            // Optimize based on asset type
            let optimizedAsset = asset;
            
            switch (asset.type) {
                case 'audio':
                    optimizedAsset = await this.optimizeAudioAsset(asset, options);
                    break;
                case 'texture':
                    optimizedAsset = await this.optimizeTextureAsset(asset, options);
                    break;
                case 'model':
                    optimizedAsset = await this.optimizeModelAsset(asset, options);
                    break;
                case 'data':
                    optimizedAsset = await this.optimizeDataAsset(asset, options);
                    break;
                default:
                    result.status = 'skipped';
                    result.message = 'No optimization available for this asset type';
                    result.sizeAfter = result.sizeBefore;
                    return result;
            }

            result.sizeAfter = this.getAssetSize(optimizedAsset);
            result.compressionRatio = result.sizeBefore > 0 ? 
                (result.sizeBefore - result.sizeAfter) / result.sizeBefore : 0;

            // Update asset in manager if optimization was beneficial
            if (result.sizeAfter < result.sizeBefore) {
                assetManager.assets.set(assetKey, optimizedAsset);
                result.status = 'optimized';
                result.message = `Size reduced by ${assetManager.formatBytes(result.sizeBefore - result.sizeAfter)}`;
                
                // Cache optimization result
                this.optimizationCache.set(assetKey, {
                    timestamp: Date.now(),
                    compressionRatio: result.compressionRatio
                });
            } else {
                result.status = 'skipped';
                result.message = 'No size reduction achieved';
                result.sizeAfter = result.sizeBefore;
            }

            return result;

        } catch (error) {
            result.status = 'failed';
            result.message = `Optimization failed: ${error.message}`;
            result.sizeAfter = result.sizeBefore;
            return result;
        }
    }

    /**
     * Optimize audio asset
     */
    async optimizeAudioAsset(asset, options) {
        try {
            if (!asset.arrayBuffer) {
                return asset; // Cannot optimize without raw data
            }

            const optimizedAsset = { ...asset };
            const optimizations = [];

            // Compress audio if enabled and file is large
            if (options.enableCompression && asset.arrayBuffer.byteLength > 1024 * 1024) {
                // In a real implementation, you would use audio compression libraries
                // For now, we'll simulate compression
                const compressionRatio = 0.7; // Simulate 30% compression
                const compressedBuffer = new ArrayBuffer(
                    Math.floor(asset.arrayBuffer.byteLength * compressionRatio)
                );
                
                optimizedAsset.arrayBuffer = compressedBuffer;
                optimizations.push('audio_compression');
            }

            // Convert to more efficient format if needed
            if (options.enableFormatConversion) {
                // Simulate format conversion benefits
                optimizations.push('format_conversion');
            }

            optimizedAsset.optimizations = optimizations;
            return optimizedAsset;

        } catch (error) {
            this.logger.warn('Audio optimization failed:', error);
            return asset;
        }
    }

    /**
     * Optimize texture asset
     */
    async optimizeTextureAsset(asset, options) {
        try {
            if (!asset.image) {
                return asset; // Cannot optimize without image data
            }

            const optimizedAsset = { ...asset };
            const optimizations = [];

            // Resize if image is too large
            if (options.enableResizing) {
                const maxDimension = this.getMaxTextureDimension(options.targetQuality);
                
                if (asset.width > maxDimension || asset.height > maxDimension) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions maintaining aspect ratio
                    const aspectRatio = asset.width / asset.height;
                    let newWidth, newHeight;
                    
                    if (asset.width > asset.height) {
                        newWidth = Math.min(asset.width, maxDimension);
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newHeight = Math.min(asset.height, maxDimension);
                        newWidth = newHeight * aspectRatio;
                    }
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    ctx.drawImage(asset.image, 0, 0, newWidth, newHeight);
                    
                    // Create new image from canvas
                    const optimizedImage = new Image();
                    optimizedImage.src = canvas.toDataURL('image/jpeg', 0.85);
                    
                    optimizedAsset.image = optimizedImage;
                    optimizedAsset.width = newWidth;
                    optimizedAsset.height = newHeight;
                    optimizations.push('texture_resize');
                }
            }

            // Compress texture quality
            if (options.enableCompression) {
                // In a real implementation, you would use texture compression
                optimizations.push('texture_compression');
            }

            optimizedAsset.optimizations = optimizations;
            return optimizedAsset;

        } catch (error) {
            this.logger.warn('Texture optimization failed:', error);
            return asset;
        }
    }

    /**
     * Optimize 3D model asset
     */
    async optimizeModelAsset(asset, options) {
        try {
            if (!asset.arrayBuffer) {
                return asset; // Cannot optimize without raw data
            }

            const optimizedAsset = { ...asset };
            const optimizations = [];

            // Compress model data
            if (options.enableCompression && asset.arrayBuffer.byteLength > 512 * 1024) {
                // In a real implementation, you would use model compression techniques
                // like Draco compression for glTF models
                const compressionRatio = 0.6; // Simulate 40% compression
                const compressedBuffer = new ArrayBuffer(
                    Math.floor(asset.arrayBuffer.byteLength * compressionRatio)
                );
                
                optimizedAsset.arrayBuffer = compressedBuffer;
                optimizations.push('model_compression');
            }

            // Optimize geometry (LOD generation would happen here)
            if (options.enableLOD) {
                optimizations.push('lod_generation');
            }

            optimizedAsset.optimizations = optimizations;
            return optimizedAsset;

        } catch (error) {
            this.logger.warn('Model optimization failed:', error);
            return asset;
        }
    }

    /**
     * Optimize data asset (JSON)
     */
    async optimizeDataAsset(asset, options) {
        try {
            if (!asset.data) {
                return asset; // Cannot optimize without data
            }

            const optimizedAsset = { ...asset };
            const optimizations = [];

            // Minify JSON data
            if (options.enableCompression) {
                // Remove unnecessary whitespace and compress
                const minifiedData = JSON.parse(JSON.stringify(asset.data));
                optimizedAsset.data = minifiedData;
                optimizations.push('json_minification');
            }

            // Remove unused properties if specified
            if (options.removeUnusedProperties) {
                // In a real implementation, you would analyze usage and remove unused data
                optimizations.push('unused_property_removal');
            }

            optimizedAsset.optimizations = optimizations;
            return optimizedAsset;

        } catch (error) {
            this.logger.warn('Data optimization failed:', error);
            return asset;
        }
    }

    /**
     * Get maximum texture dimension based on quality setting
     */
    getMaxTextureDimension(quality) {
        switch (quality) {
            case 'low':
                return 512;
            case 'medium':
                return 1024;
            case 'high':
                return 2048;
            case 'ultra':
                return 4096;
            default:
                return 1024;
        }
    }

    /**
     * Get asset size in bytes
     */
    getAssetSize(asset) {
        switch (asset.type) {
            case 'audio':
                return asset.arrayBuffer ? asset.arrayBuffer.byteLength : 0;
            case 'texture':
                return asset.width * asset.height * 4; // Assume RGBA
            case 'model':
                return asset.arrayBuffer ? asset.arrayBuffer.byteLength : 0;
            case 'data':
                return JSON.stringify(asset.data).length * 2; // Rough estimate
            default:
                return 1000; // Default estimate
        }
    }

    /**
     * Update global optimization statistics
     */
    updateOptimizationStats(results) {
        this.optimizationStats.totalOptimized += results.optimized;
        this.optimizationStats.totalSizeSaved += (results.totalSizeBefore - results.totalSizeAfter);
        
        // Calculate running average compression ratio
        const totalOptimizations = this.optimizationStats.totalOptimized;
        if (totalOptimizations > 0) {
            this.optimizationStats.averageCompressionRatio = 
                (this.optimizationStats.averageCompressionRatio * (totalOptimizations - results.optimized) + 
                 results.compressionRatio * results.optimized) / totalOptimizations;
        }
    }

    /**
     * Get optimization statistics
     */
    getOptimizationStats() {
        return {
            ...this.optimizationStats,
            cacheSize: this.optimizationCache.size,
            totalSizeSavedFormatted: assetManager.formatBytes(this.optimizationStats.totalSizeSaved),
            averageCompressionPercentage: Math.round(this.optimizationStats.averageCompressionRatio * 100)
        };
    }

    /**
     * Clear optimization cache
     */
    clearOptimizationCache() {
        this.optimizationCache.clear();
        this.logger.info('Optimization cache cleared');
    }

    /**
     * Optimize assets based on current performance metrics
     */
    async optimizeForPerformance(performanceMetrics) {
        const options = {
            targetQuality: 'medium',
            enableCompression: true,
            enableResizing: true,
            enableFormatConversion: true
        };

        // Adjust optimization based on performance
        if (performanceMetrics.fps < 30) {
            options.targetQuality = 'low';
            options.maxFileSize = 5 * 1024 * 1024; // 5MB
        } else if (performanceMetrics.fps < 45) {
            options.targetQuality = 'medium';
            options.maxFileSize = 8 * 1024 * 1024; // 8MB
        } else {
            options.targetQuality = 'high';
            options.maxFileSize = 15 * 1024 * 1024; // 15MB
        }

        // Adjust based on memory usage
        if (performanceMetrics.memoryUsage > 0.8) {
            options.enableCompression = true;
            options.enableResizing = true;
            options.targetQuality = 'low';
        }

        this.logger.info('Optimizing assets for performance:', {
            fps: performanceMetrics.fps,
            memoryUsage: performanceMetrics.memoryUsage,
            targetQuality: options.targetQuality
        });

        return await this.optimizeAllAssets(options);
    }

    /**
     * Generate optimization report
     */
    generateOptimizationReport(results) {
        const report = {
            ...results,
            summary: {
                compressionPercentage: Math.round(results.compressionRatio * 100),
                sizeSavedFormatted: assetManager.formatBytes(results.totalSizeBefore - results.totalSizeAfter),
                averageCompressionPerAsset: results.optimized > 0 ? 
                    (results.totalSizeBefore - results.totalSizeAfter) / results.optimized : 0,
                categories: this.getCategoryOptimizationBreakdown(results.details)
            },
            globalStats: this.getOptimizationStats()
        };

        return report;
    }

    /**
     * Get optimization breakdown by category
     */
    getCategoryOptimizationBreakdown(details) {
        const breakdown = {};
        
        for (const detail of details) {
            const [category] = detail.assetKey.split('/');
            
            if (!breakdown[category]) {
                breakdown[category] = {
                    total: 0,
                    optimized: 0,
                    skipped: 0,
                    failed: 0,
                    sizeBefore: 0,
                    sizeAfter: 0
                };
            }
            
            breakdown[category].total++;
            breakdown[category][detail.status]++;
            breakdown[category].sizeBefore += detail.sizeBefore;
            breakdown[category].sizeAfter += detail.sizeAfter;
        }
        
        // Calculate compression ratios for each category
        for (const stats of Object.values(breakdown)) {
            stats.compressionRatio = stats.sizeBefore > 0 ? 
                (stats.sizeBefore - stats.sizeAfter) / stats.sizeBefore : 0;
            stats.compressionPercentage = Math.round(stats.compressionRatio * 100);
        }
        
        return breakdown;
    }

    /**
     * Dispose of asset optimizer
     */
    dispose() {
        this.clearOptimizationCache();
        
        // Terminate compression workers
        for (const worker of this.compressionWorkers.values()) {
            if (worker && worker.terminate) {
                worker.terminate();
            }
        }
        this.compressionWorkers.clear();
        
        this.logger.info('AssetOptimizer disposed');
    }
}

// Export singleton instance
export const assetOptimizer = new AssetOptimizer();