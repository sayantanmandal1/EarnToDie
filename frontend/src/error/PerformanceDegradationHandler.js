/**
 * Performance Degradation Handler
 * Monitors performance and automatically adjusts settings for low-end devices
 */

import { PerformanceError } from './ErrorHandler.js';

export class PerformanceDegradationHandler {
    constructor(options = {}) {
        this.options = {
            targetFPS: options.targetFPS || 30,
            criticalFPS: options.criticalFPS || 15,
            memoryThreshold: options.memoryThreshold || 0.8, // 80% of heap limit
            monitoringInterval: options.monitoringInterval || 1000,
            adjustmentCooldown: options.adjustmentCooldown || 5000,
            enableAutoAdjustment: options.enableAutoAdjustment !== false,
            ...options
        };

        // Performance monitoring
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.frameTimes = [];
        this.currentFPS = 60;
        this.averageFPS = 60;
        
        // Memory monitoring
        this.memoryUsage = 0;
        this.memoryPressure = false;
        
        // Quality settings
        this.currentQualityLevel = 'high';
        this.qualityLevels = {
            ultra: {
                shadowMapSize: 2048,
                maxLights: 8,
                particleCount: 1000,
                lodDistance: 100,
                textureQuality: 1.0,
                antialiasing: true,
                postProcessing: true
            },
            high: {
                shadowMapSize: 1024,
                maxLights: 6,
                particleCount: 500,
                lodDistance: 75,
                textureQuality: 1.0,
                antialiasing: true,
                postProcessing: true
            },
            medium: {
                shadowMapSize: 512,
                maxLights: 4,
                particleCount: 250,
                lodDistance: 50,
                textureQuality: 0.75,
                antialiasing: false,
                postProcessing: false
            },
            low: {
                shadowMapSize: 256,
                maxLights: 2,
                particleCount: 100,
                lodDistance: 25,
                textureQuality: 0.5,
                antialiasing: false,
                postProcessing: false
            },
            potato: {
                shadowMapSize: 128,
                maxLights: 1,
                particleCount: 50,
                lodDistance: 15,
                textureQuality: 0.25,
                antialiasing: false,
                postProcessing: false
            }
        };

        // Adjustment tracking
        this.lastAdjustmentTime = 0;
        this.adjustmentHistory = [];
        
        // Event listeners
        this.performanceListeners = [];
        this.qualityChangeListeners = [];
        
        this._startMonitoring();
        this._detectDeviceCapabilities();
    }

    /**
     * Start performance monitoring
     */
    _startMonitoring() {
        // Frame rate monitoring
        this._monitorFrameRate();
        
        // Memory monitoring
        setInterval(() => {
            this._monitorMemoryUsage();
        }, this.options.monitoringInterval);
        
        // Performance adjustment check
        setInterval(() => {
            this._checkPerformanceAdjustment();
        }, this.options.monitoringInterval);
    }

    /**
     * Monitor frame rate
     */
    _monitorFrameRate() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        this.frameCount++;
        this.frameTimes.push(deltaTime);
        
        // Keep only last 60 frame times
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Calculate current FPS
        this.currentFPS = 1000 / deltaTime;
        
        // Calculate average FPS
        if (this.frameTimes.length > 0) {
            const averageFrameTime = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
            this.averageFPS = 1000 / averageFrameTime;
        }
        
        this.lastFrameTime = now;
        
        // Continue monitoring
        requestAnimationFrame(() => this._monitorFrameRate());
    }

    /**
     * Monitor memory usage
     */
    _monitorMemoryUsage() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            
            this.memoryUsage = used / limit;
            this.memoryPressure = this.memoryUsage > this.options.memoryThreshold;
            
            if (this.memoryPressure) {
                this._handleMemoryPressure();
            }
        }
    }

    /**
     * Check if performance adjustment is needed
     */
    _checkPerformanceAdjustment() {
        if (!this.options.enableAutoAdjustment) return;
        
        const now = Date.now();
        if (now - this.lastAdjustmentTime < this.options.adjustmentCooldown) {
            return;
        }

        const needsAdjustment = this._needsPerformanceAdjustment();
        
        if (needsAdjustment.downgrade) {
            this._downgradeQuality(needsAdjustment.reason);
        } else if (needsAdjustment.upgrade) {
            this._upgradeQuality();
        }
    }

    /**
     * Determine if performance adjustment is needed
     */
    _needsPerformanceAdjustment() {
        // Check for critical performance issues
        if (this.averageFPS < this.options.criticalFPS) {
            return {
                downgrade: true,
                reason: 'critical_fps',
                severity: 'high'
            };
        }
        
        // Check for memory pressure
        if (this.memoryPressure) {
            return {
                downgrade: true,
                reason: 'memory_pressure',
                severity: 'medium'
            };
        }
        
        // Check for below-target FPS
        if (this.averageFPS < this.options.targetFPS) {
            return {
                downgrade: true,
                reason: 'low_fps',
                severity: 'low'
            };
        }
        
        // Check if we can upgrade quality
        if (this.averageFPS > this.options.targetFPS * 1.5 && 
            this.currentQualityLevel !== 'ultra' &&
            !this.memoryPressure) {
            return {
                upgrade: true,
                reason: 'performance_headroom'
            };
        }
        
        return { downgrade: false, upgrade: false };
    }

    /**
     * Downgrade quality settings
     */
    _downgradeQuality(reason) {
        const qualityOrder = ['ultra', 'high', 'medium', 'low', 'potato'];
        const currentIndex = qualityOrder.indexOf(this.currentQualityLevel);
        
        if (currentIndex < qualityOrder.length - 1) {
            const newQuality = qualityOrder[currentIndex + 1];
            this._setQualityLevel(newQuality, reason);
            
            console.warn(`Performance degradation detected (${reason}), downgrading to ${newQuality} quality`);
        } else {
            // Already at lowest quality, trigger critical performance error
            this._handleCriticalPerformance(reason);
        }
    }

    /**
     * Upgrade quality settings
     */
    _upgradeQuality() {
        const qualityOrder = ['ultra', 'high', 'medium', 'low', 'potato'];
        const currentIndex = qualityOrder.indexOf(this.currentQualityLevel);
        
        if (currentIndex > 0) {
            const newQuality = qualityOrder[currentIndex - 1];
            this._setQualityLevel(newQuality, 'performance_improvement');
            
            console.log(`Performance improved, upgrading to ${newQuality} quality`);
        }
    }

    /**
     * Set quality level
     */
    _setQualityLevel(qualityLevel, reason) {
        const oldQuality = this.currentQualityLevel;
        this.currentQualityLevel = qualityLevel;
        this.lastAdjustmentTime = Date.now();
        
        // Record adjustment
        this.adjustmentHistory.push({
            timestamp: Date.now(),
            from: oldQuality,
            to: qualityLevel,
            reason: reason,
            fps: this.averageFPS,
            memoryUsage: this.memoryUsage
        });
        
        // Keep only last 20 adjustments
        if (this.adjustmentHistory.length > 20) {
            this.adjustmentHistory.shift();
        }
        
        // Notify listeners
        this._notifyQualityChange(oldQuality, qualityLevel, reason);
    }

    /**
     * Handle memory pressure
     */
    _handleMemoryPressure() {
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear caches
        this._clearCaches();
        
        // Reduce object pools
        this._reduceObjectPools();
    }

    /**
     * Handle critical performance issues
     */
    _handleCriticalPerformance(reason) {
        const error = new PerformanceError(`Critical performance degradation: ${reason}`, {
            fps: this.averageFPS,
            memoryUsage: this.memoryUsage,
            qualityLevel: this.currentQualityLevel,
            adjustmentHistory: this.adjustmentHistory.slice(-5)
        });
        
        // Notify performance listeners
        this._notifyPerformanceListeners(error);
        
        // Emergency performance measures
        this._emergencyPerformanceMeasures();
    }

    /**
     * Emergency performance measures
     */
    _emergencyPerformanceMeasures() {
        // Disable all non-essential features
        this._disableNonEssentialFeatures();
        
        // Reduce render resolution
        this._reduceRenderResolution();
        
        // Pause non-critical systems
        this._pauseNonCriticalSystems();
    }

    /**
     * Detect device capabilities
     */
    _detectDeviceCapabilities() {
        const capabilities = {
            gpu: this._detectGPU(),
            memory: this._detectMemory(),
            cores: navigator.hardwareConcurrency || 4,
            mobile: this._isMobileDevice(),
            webgl: this._detectWebGLCapabilities()
        };
        
        // Set initial quality based on capabilities
        const recommendedQuality = this._getRecommendedQuality(capabilities);
        this._setQualityLevel(recommendedQuality, 'device_detection');
        
        console.log('Device capabilities detected:', capabilities);
        console.log('Recommended quality level:', recommendedQuality);
    }

    /**
     * Detect GPU information
     */
    _detectGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl || typeof gl.getExtension !== 'function') return 'unknown';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
            
            return 'unknown';
        } catch (error) {
            console.warn('GPU detection failed:', error);
            return 'unknown';
        }
    }

    /**
     * Detect available memory
     */
    _detectMemory() {
        if (performance.memory) {
            return {
                limit: performance.memory.jsHeapSizeLimit,
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            };
        }
        
        return null;
    }

    /**
     * Check if mobile device
     */
    _isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Detect WebGL capabilities
     */
    _detectWebGLCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return null;
        
        return {
            version: gl.getParameter(gl.VERSION),
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            extensions: gl.getSupportedExtensions ? gl.getSupportedExtensions() : []
        };
    }

    /**
     * Get recommended quality based on device capabilities
     */
    _getRecommendedQuality(capabilities) {
        let score = 0;
        
        // Memory score
        if (capabilities.memory) {
            const memoryGB = capabilities.memory.limit / (1024 * 1024 * 1024);
            if (memoryGB > 4) score += 3;
            else if (memoryGB > 2) score += 2;
            else if (memoryGB > 1) score += 1;
        } else {
            score += 2; // Default assumption
        }
        
        // CPU score
        if (capabilities.cores > 6) score += 2;
        else if (capabilities.cores > 4) score += 1;
        
        // Mobile penalty
        if (capabilities.mobile) score -= 2;
        
        // GPU score (basic heuristic)
        const gpu = (capabilities.gpu || 'unknown').toLowerCase();
        if (gpu.includes('nvidia') || gpu.includes('amd') || gpu.includes('radeon')) {
            score += 2;
        } else if (gpu.includes('intel')) {
            score += 1;
        }
        
        // Map score to quality level
        if (score >= 7) return 'ultra';
        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        if (score >= 1) return 'low';
        return 'potato';
    }

    /**
     * Get current quality settings
     */
    getQualitySettings() {
        return {
            level: this.currentQualityLevel,
            settings: this.qualityLevels[this.currentQualityLevel]
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            fps: {
                current: this.currentFPS,
                average: this.averageFPS,
                target: this.options.targetFPS
            },
            memory: {
                usage: this.memoryUsage,
                pressure: this.memoryPressure,
                threshold: this.options.memoryThreshold
            },
            quality: {
                level: this.currentQualityLevel,
                adjustments: this.adjustmentHistory.length
            }
        };
    }

    /**
     * Add performance listener
     */
    onPerformanceIssue(listener) {
        this.performanceListeners.push(listener);
    }

    /**
     * Add quality change listener
     */
    onQualityChange(listener) {
        this.qualityChangeListeners.push(listener);
    }

    /**
     * Notify performance listeners
     */
    _notifyPerformanceListeners(error) {
        this.performanceListeners.forEach(listener => {
            try {
                listener(error);
            } catch (listenerError) {
                console.warn('Performance listener failed:', listenerError);
            }
        });
    }

    /**
     * Notify quality change listeners
     */
    _notifyQualityChange(oldQuality, newQuality, reason) {
        this.qualityChangeListeners.forEach(listener => {
            try {
                listener(oldQuality, newQuality, reason);
            } catch (listenerError) {
                console.warn('Quality change listener failed:', listenerError);
            }
        });
    }

    // Placeholder methods for integration with game systems
    _clearCaches() {
        // To be implemented with actual cache clearing logic
        console.log('Clearing caches to free memory');
    }

    _reduceObjectPools() {
        // To be implemented with actual object pool reduction
        console.log('Reducing object pool sizes');
    }

    _disableNonEssentialFeatures() {
        // To be implemented with actual feature disabling
        console.log('Disabling non-essential features');
    }

    _reduceRenderResolution() {
        // To be implemented with actual resolution reduction
        console.log('Reducing render resolution');
    }

    _pauseNonCriticalSystems() {
        // To be implemented with actual system pausing
        console.log('Pausing non-critical systems');
    }
}

export default PerformanceDegradationHandler;