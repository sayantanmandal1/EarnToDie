/**
 * Audio Performance Optimizer
 * Advanced performance optimization for audio systems
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AudioPerformanceOptimizer extends EventEmitter {
    constructor(audioManagementSystem, options = {}) {
        super();
        
        this.audioSystem = audioManagementSystem;
        this.options = {
            // Performance thresholds
            cpuThreshold: options.cpuThreshold || 0.7,
            memoryThreshold: options.memoryThreshold || 0.8,
            latencyThreshold: options.latencyThreshold || 0.05, // 50ms
            
            // Optimization strategies
            enableDynamicBuffering: options.enableDynamicBuffering !== false,
            enableSourcePooling: options.enableSourcePooling !== false,
            enableAdaptiveQuality: options.enableAdaptiveQuality !== false,
            enablePredictiveLoading: options.enablePredictiveLoading !== false,
            
            // Optimization intervals
            monitoringInterval: options.monitoringInterval || 1000,
            optimizationInterval: options.optimizationInterval || 5000,
            
            // Buffer management
            minBufferSize: options.minBufferSize || 4096,
            maxBufferSize: options.maxBufferSize || 16384,
            bufferGrowthFactor: options.bufferGrowthFactor || 1.5,
            
            // Source pooling
            maxPoolSize: options.maxPoolSize || 20,
            poolCleanupInterval: options.poolCleanupInterval || 30000,
            
            ...options
        };
        
        // Performance metrics
        this.metrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            audioLatency: 0,
            bufferUnderruns: 0,
            sourceCreations: 0,
            optimizationActions: 0,
            lastOptimization: Date.now()
        };
        
        // Optimization state
        this.optimizationState = {
            currentStrategy: 'balanced',
            adaptiveQualityEnabled: true,
            bufferSize: this.options.minBufferSize,
            sourcePoolEnabled: true
        };
        
        // Source pool for reuse
        this.sourcePool = new Map();
        this.poolStats = {
            hits: 0,
            misses: 0,
            created: 0,
            recycled: 0
        };
        
        // Predictive loading
        this.loadingPredictor = {
            patterns: new Map(),
            predictions: new Map(),
            accuracy: 0
        };
        
        // Performance history for trend analysis
        this.performanceHistory = [];
        this.maxHistorySize = 100;
        
        this.logger = electronIntegration.getLogger();
        this.isRunning = false;
        
        // Bind to audio system events
        this.bindAudioSystemEvents();
    }

    /**
     * Bind to audio system events
     */
    bindAudioSystemEvents() {
        this.audioSystem.on('performanceUpdate', (data) => {
            this.updateMetrics(data);
        });
        
        this.audioSystem.on('qualityChanged', (data) => {
            this.onQualityChanged(data);
        });
        
        this.audioSystem.on('audioDropout', (data) => {
            this.onAudioDropout(data);
        });
        
        this.audioSystem.on('garbageCollected', () => {
            this.onGarbageCollected();
        });
    }

    /**
     * Start performance optimization
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Audio Performance Optimizer already running');
            return;
        }
        
        this.logger.info('Starting Audio Performance Optimizer...');
        
        // Start monitoring
        this.monitoringInterval = setInterval(() => {
            this.monitorPerformance();
        }, this.options.monitoringInterval);
        
        // Start optimization
        this.optimizationInterval = setInterval(() => {
            this.optimizePerformance();
        }, this.options.optimizationInterval);
        
        // Start pool cleanup
        if (this.options.enableSourcePooling) {
            this.poolCleanupInterval = setInterval(() => {
                this.cleanupSourcePool();
            }, this.options.poolCleanupInterval);
        }
        
        this.isRunning = true;
        this.emit('started');
        
        this.logger.info('Audio Performance Optimizer started');
    }

    /**
     * Stop performance optimization
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.logger.info('Stopping Audio Performance Optimizer...');
        
        // Clear intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = null;
        }
        
        if (this.poolCleanupInterval) {
            clearInterval(this.poolCleanupInterval);
            this.poolCleanupInterval = null;
        }
        
        // Clear source pool
        this.clearSourcePool();
        
        this.isRunning = false;
        this.emit('stopped');
        
        this.logger.info('Audio Performance Optimizer stopped');
    }

    /**
     * Monitor performance metrics
     */
    monitorPerformance() {
        try {
            const stats = this.audioSystem.getPerformanceStats();
            
            // Update current metrics
            this.metrics.cpuUsage = stats.cpuLoad || 0;
            this.metrics.memoryUsage = stats.memoryUsagePercent / 100 || 0;
            this.metrics.audioLatency = stats.qualityMetrics?.audioLatency || 0;
            
            // Add to performance history
            this.addToPerformanceHistory({
                timestamp: Date.now(),
                cpuUsage: this.metrics.cpuUsage,
                memoryUsage: this.metrics.memoryUsage,
                audioLatency: this.metrics.audioLatency,
                activeSourceCount: stats.activeSourceCount,
                bufferCount: stats.bufferCount
            });
            
            // Emit performance data
            this.emit('performanceMonitored', {
                metrics: this.metrics,
                stats: stats,
                optimizationState: this.optimizationState
            });
            
        } catch (error) {
            this.logger.warn('Performance monitoring error:', error);
        }
    }

    /**
     * Add data to performance history
     */
    addToPerformanceHistory(data) {
        this.performanceHistory.push(data);
        
        // Limit history size
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }
    }

    /**
     * Optimize performance based on current metrics
     */
    optimizePerformance() {
        try {
            const optimizationNeeded = this.assessOptimizationNeed();
            
            if (!optimizationNeeded) {
                return;
            }
            
            this.logger.info('Performing audio performance optimization...');
            
            // Determine optimization strategy
            const strategy = this.determineOptimizationStrategy();
            
            // Apply optimizations
            this.applyOptimizationStrategy(strategy);
            
            // Update metrics
            this.metrics.optimizationActions++;
            this.metrics.lastOptimization = Date.now();
            
            this.emit('optimizationPerformed', {
                strategy: strategy,
                metrics: this.metrics,
                timestamp: Date.now()
            });
            
        } catch (error) {
            this.logger.error('Performance optimization error:', error);
        }
    }

    /**
     * Assess if optimization is needed
     */
    assessOptimizationNeed() {
        // Check CPU usage
        if (this.metrics.cpuUsage > this.options.cpuThreshold) {
            this.logger.debug(`CPU usage high: ${(this.metrics.cpuUsage * 100).toFixed(1)}%`);
            return true;
        }
        
        // Check memory usage
        if (this.metrics.memoryUsage > this.options.memoryThreshold) {
            this.logger.debug(`Memory usage high: ${(this.metrics.memoryUsage * 100).toFixed(1)}%`);
            return true;
        }
        
        // Check audio latency
        if (this.metrics.audioLatency > this.options.latencyThreshold) {
            this.logger.debug(`Audio latency high: ${(this.metrics.audioLatency * 1000).toFixed(1)}ms`);
            return true;
        }
        
        // Check for buffer underruns
        if (this.metrics.bufferUnderruns > 0) {
            this.logger.debug(`Buffer underruns detected: ${this.metrics.bufferUnderruns}`);
            return true;
        }
        
        return false;
    }

    /**
     * Determine optimization strategy based on current conditions
     */
    determineOptimizationStrategy() {
        const cpuHigh = this.metrics.cpuUsage > this.options.cpuThreshold;
        const memoryHigh = this.metrics.memoryUsage > this.options.memoryThreshold;
        const latencyHigh = this.metrics.audioLatency > this.options.latencyThreshold;
        
        if (cpuHigh && memoryHigh) {
            return 'aggressive';
        } else if (cpuHigh || memoryHigh) {
            return 'moderate';
        } else if (latencyHigh) {
            return 'latency-focused';
        } else {
            return 'conservative';
        }
    }

    /**
     * Apply optimization strategy
     */
    applyOptimizationStrategy(strategy) {
        this.optimizationState.currentStrategy = strategy;
        
        switch (strategy) {
            case 'aggressive':
                this.applyAggressiveOptimizations();
                break;
            case 'moderate':
                this.applyModerateOptimizations();
                break;
            case 'latency-focused':
                this.applyLatencyOptimizations();
                break;
            case 'conservative':
                this.applyConservativeOptimizations();
                break;
        }
    }

    /**
     * Apply aggressive optimizations
     */
    applyAggressiveOptimizations() {
        this.logger.info('Applying aggressive performance optimizations');
        
        // Reduce audio quality
        if (this.options.enableAdaptiveQuality) {
            this.requestQualityReduction('aggressive');
        }
        
        // Reduce buffer sizes
        if (this.options.enableDynamicBuffering) {
            this.optimizeBufferSizes('reduce');
        }
        
        // Enable source pooling
        if (this.options.enableSourcePooling) {
            this.optimizationState.sourcePoolEnabled = true;
        }
        
        // Trigger garbage collection
        this.audioSystem.triggerGarbageCollection();
        
        // Disable non-essential features
        this.disableNonEssentialFeatures();
    }

    /**
     * Apply moderate optimizations
     */
    applyModerateOptimizations() {
        this.logger.info('Applying moderate performance optimizations');
        
        // Slightly reduce quality if needed
        if (this.options.enableAdaptiveQuality && this.metrics.cpuUsage > 0.8) {
            this.requestQualityReduction('moderate');
        }
        
        // Optimize buffer sizes
        if (this.options.enableDynamicBuffering) {
            this.optimizeBufferSizes('balance');
        }
        
        // Enable source pooling
        if (this.options.enableSourcePooling) {
            this.optimizationState.sourcePoolEnabled = true;
        }
    }

    /**
     * Apply latency-focused optimizations
     */
    applyLatencyOptimizations() {
        this.logger.info('Applying latency-focused optimizations');
        
        // Reduce buffer sizes for lower latency
        if (this.options.enableDynamicBuffering) {
            this.optimizeBufferSizes('latency');
        }
        
        // Prioritize real-time processing
        this.prioritizeRealTimeProcessing();
    }

    /**
     * Apply conservative optimizations
     */
    applyConservativeOptimizations() {
        this.logger.info('Applying conservative optimizations');
        
        // Minor buffer optimizations
        if (this.options.enableDynamicBuffering) {
            this.optimizeBufferSizes('conservative');
        }
        
        // Clean up unused resources
        this.cleanupUnusedResources();
    }

    /**
     * Request quality reduction from audio system
     */
    requestQualityReduction(level) {
        const currentQuality = this.audioSystem.currentQuality;
        const qualityLevels = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = qualityLevels.indexOf(currentQuality);
        
        let targetIndex = currentIndex;
        
        switch (level) {
            case 'aggressive':
                targetIndex = Math.max(0, currentIndex - 2);
                break;
            case 'moderate':
                targetIndex = Math.max(0, currentIndex - 1);
                break;
        }
        
        if (targetIndex < currentIndex) {
            const targetQuality = qualityLevels[targetIndex];
            this.audioSystem.setQuality(targetQuality);
            this.logger.info(`Quality reduced to ${targetQuality} for performance`);
        }
    }

    /**
     * Optimize buffer sizes
     */
    optimizeBufferSizes(mode) {
        let newBufferSize = this.optimizationState.bufferSize;
        
        switch (mode) {
            case 'reduce':
                newBufferSize = Math.max(
                    this.options.minBufferSize,
                    Math.floor(newBufferSize / this.options.bufferGrowthFactor)
                );
                break;
            case 'balance':
                // Find optimal balance
                newBufferSize = this.calculateOptimalBufferSize();
                break;
            case 'latency':
                newBufferSize = this.options.minBufferSize;
                break;
            case 'conservative':
                newBufferSize = Math.min(
                    this.options.maxBufferSize,
                    Math.floor(newBufferSize * 1.1)
                );
                break;
        }
        
        if (newBufferSize !== this.optimizationState.bufferSize) {
            this.optimizationState.bufferSize = newBufferSize;
            this.logger.info(`Buffer size optimized to ${newBufferSize}`);
        }
    }

    /**
     * Calculate optimal buffer size
     */
    calculateOptimalBufferSize() {
        // Use performance history to determine optimal size
        if (this.performanceHistory.length < 10) {
            return this.optimizationState.bufferSize;
        }
        
        const recentHistory = this.performanceHistory.slice(-10);
        const avgCpuUsage = recentHistory.reduce((sum, h) => sum + h.cpuUsage, 0) / recentHistory.length;
        const avgLatency = recentHistory.reduce((sum, h) => sum + h.audioLatency, 0) / recentHistory.length;
        
        // Balance between CPU usage and latency
        const cpuFactor = Math.max(0.5, 1 - avgCpuUsage);
        const latencyFactor = Math.min(2, 1 + avgLatency * 10);
        
        const optimalSize = Math.floor(this.options.minBufferSize * cpuFactor * latencyFactor);
        
        return Math.max(
            this.options.minBufferSize,
            Math.min(this.options.maxBufferSize, optimalSize)
        );
    }

    /**
     * Disable non-essential features
     */
    disableNonEssentialFeatures() {
        // Temporarily disable visualization if enabled
        if (this.audioSystem.options.visualizationEnabled) {
            this.audioSystem.updateSettings({ visualizationEnabled: false });
            this.logger.info('Visualization disabled for performance');
        }
    }

    /**
     * Prioritize real-time processing
     */
    prioritizeRealTimeProcessing() {
        // This would involve platform-specific optimizations
        // For now, we'll just log the intent
        this.logger.info('Prioritizing real-time audio processing');
    }

    /**
     * Clean up unused resources
     */
    cleanupUnusedResources() {
        // Trigger audio system garbage collection
        this.audioSystem.triggerGarbageCollection();
        
        // Clean up source pool
        this.cleanupSourcePool();
        
        this.logger.debug('Unused resources cleaned up');
    }

    /**
     * Get or create audio source from pool
     */
    getPooledSource(assetId, options = {}) {
        if (!this.options.enableSourcePooling || !this.optimizationState.sourcePoolEnabled) {
            this.poolStats.misses++;
            return this.audioSystem.createSource(assetId, options);
        }
        
        const poolKey = `${assetId}_${JSON.stringify(options)}`;
        const pool = this.sourcePool.get(poolKey) || [];
        
        if (pool.length > 0) {
            const source = pool.pop();
            this.poolStats.hits++;
            this.poolStats.recycled++;
            
            // Reset source state
            this.resetSourceState(source);
            
            return source;
        } else {
            this.poolStats.misses++;
            const newSource = this.audioSystem.createSource(assetId, options);
            this.poolStats.created++;
            
            // Mark for pooling when finished
            this.markForPooling(newSource, poolKey);
            
            return newSource;
        }
    }

    /**
     * Reset source state for reuse
     */
    resetSourceState(source) {
        // Reset gain
        if (source.gainNode) {
            source.gainNode.gain.value = 1.0;
        }
        
        // Reset any other properties
        source.lastUsed = Date.now();
    }

    /**
     * Mark source for pooling when finished
     */
    markForPooling(source, poolKey) {
        const originalOnEnded = source.source.onended;
        
        source.source.onended = () => {
            // Call original handler
            if (originalOnEnded) {
                originalOnEnded();
            }
            
            // Add to pool
            this.returnSourceToPool(source, poolKey);
        };
    }

    /**
     * Return source to pool
     */
    returnSourceToPool(source, poolKey) {
        if (!this.sourcePool.has(poolKey)) {
            this.sourcePool.set(poolKey, []);
        }
        
        const pool = this.sourcePool.get(poolKey);
        
        if (pool.length < this.options.maxPoolSize) {
            source.pooledAt = Date.now();
            pool.push(source);
        }
    }

    /**
     * Clean up source pool
     */
    cleanupSourcePool() {
        const now = Date.now();
        const maxAge = 60000; // 1 minute
        
        for (const [poolKey, pool] of this.sourcePool.entries()) {
            const validSources = pool.filter(source => 
                (now - source.pooledAt) < maxAge
            );
            
            if (validSources.length === 0) {
                this.sourcePool.delete(poolKey);
            } else {
                this.sourcePool.set(poolKey, validSources);
            }
        }
    }

    /**
     * Clear entire source pool
     */
    clearSourcePool() {
        this.sourcePool.clear();
        this.poolStats = {
            hits: 0,
            misses: 0,
            created: 0,
            recycled: 0
        };
    }

    /**
     * Event handlers
     */
    updateMetrics(data) {
        // Update metrics from audio system
        if (data.qualityMetrics) {
            this.metrics.audioLatency = data.qualityMetrics.audioLatency || 0;
        }
    }

    onQualityChanged(data) {
        this.logger.info(`Audio quality changed: ${data.oldQuality} -> ${data.newQuality}`);
    }

    onAudioDropout(data) {
        this.metrics.bufferUnderruns++;
        this.logger.warn('Audio dropout detected:', data);
    }

    onGarbageCollected() {
        this.logger.debug('Audio garbage collection completed');
    }

    /**
     * Get optimization statistics
     */
    getOptimizationStats() {
        return {
            metrics: { ...this.metrics },
            optimizationState: { ...this.optimizationState },
            poolStats: { ...this.poolStats },
            performanceHistory: this.performanceHistory.slice(-10), // Last 10 entries
            isRunning: this.isRunning
        };
    }

    /**
     * Get pool efficiency
     */
    getPoolEfficiency() {
        const total = this.poolStats.hits + this.poolStats.misses;
        return total > 0 ? (this.poolStats.hits / total) * 100 : 0;
    }

    /**
     * Dispose of the optimizer
     */
    dispose() {
        this.stop();
        this.removeAllListeners();
        this.logger.info('Audio Performance Optimizer disposed');
    }
}

export default AudioPerformanceOptimizer;