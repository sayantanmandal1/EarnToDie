/**
 * Audio Management Integration System
 * Integrates all audio management components into a unified system
 */

import { EventEmitter } from 'events';
import { AudioManagementSystem } from './AudioManagementSystem.js';
import AudioPerformanceOptimizer from './AudioPerformanceOptimizer.js';
import AudioVisualizationDebugger from './AudioVisualizationDebugger.js';
import { SpatialAudioEngine } from './SpatialAudioEngine.js';
import { AudioAssetIntegration } from './AudioAssetIntegration.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AudioManagementIntegration extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // Component enablement
            enablePerformanceOptimization: options.enablePerformanceOptimization !== false,
            enableVisualizationDebugger: options.enableVisualizationDebugger !== false,
            enableSpatialAudio: options.enableSpatialAudio !== false,
            enableAssetIntegration: options.enableAssetIntegration !== false,
            
            // Integration settings
            autoStart: options.autoStart !== false,
            enableCrossComponentOptimization: options.enableCrossComponentOptimization !== false,
            enableUnifiedSettings: options.enableUnifiedSettings !== false,
            
            // Performance settings
            globalPerformanceMode: options.globalPerformanceMode || 'balanced', // 'performance', 'quality', 'balanced'
            adaptivePerformance: options.adaptivePerformance !== false,
            
            // Debug settings
            enableGlobalDebugMode: options.enableGlobalDebugMode || false,
            logLevel: options.logLevel || 'info',
            
            ...options
        };
        
        // Core components
        this.audioManagement = null;
        this.performanceOptimizer = null;
        this.visualizationDebugger = null;
        this.spatialAudio = null;
        this.assetIntegration = null;
        
        // Integration state
        this.isInitialized = false;
        this.isRunning = false;
        this.componentStates = new Map();
        
        // Unified settings
        this.unifiedSettings = {
            masterVolume: 1.0,
            quality: 'high',
            performanceMode: this.options.globalPerformanceMode,
            spatialAudioEnabled: true,
            visualizationEnabled: true,
            debugMode: this.options.enableGlobalDebugMode
        };
        
        // Performance metrics aggregation
        this.aggregatedMetrics = {
            overall: {
                cpuUsage: 0,
                memoryUsage: 0,
                audioLatency: 0,
                quality: 'good'
            },
            components: new Map()
        };
        
        // Event coordination
        this.eventCoordinator = {
            eventQueue: [],
            processingEvents: false,
            eventHandlers: new Map()
        };
        
        this.logger = electronIntegration.getLogger();
        
        // Set up event coordination
        this.setupEventCoordination();
    }

    /**
     * Initialize the integrated audio management system
     */
    async initialize() {
        try {
            this.logger.info('Initializing Audio Management Integration...');
            
            // Initialize core audio management system
            await this.initializeAudioManagement();
            
            // Initialize optional components
            await this.initializeOptionalComponents();
            
            // Set up component integration
            this.setupComponentIntegration();
            
            // Apply initial settings
            await this.applyUnifiedSettings();
            
            // Start components if auto-start is enabled
            if (this.options.autoStart) {
                await this.start();
            }
            
            this.isInitialized = true;
            this.emit('initialized');
            
            this.logger.info('Audio Management Integration initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Audio Management Integration:', error);
            throw error;
        }
    }

    /**
     * Initialize core audio management system
     */
    async initializeAudioManagement() {
        this.audioManagement = new AudioManagementSystem({
            ...this.options.audioManagement,
            debugMode: this.options.enableGlobalDebugMode
        });
        
        await this.audioManagement.initialize();
        this.componentStates.set('audioManagement', 'initialized');
        
        // Bind events
        this.audioManagement.on('performanceUpdate', (data) => {
            this.handleComponentPerformanceUpdate('audioManagement', data);
        });
        
        this.audioManagement.on('qualityChanged', (data) => {
            this.handleQualityChange('audioManagement', data);
        });
    }

    /**
     * Initialize optional components
     */
    async initializeOptionalComponents() {
        // Initialize Performance Optimizer
        if (this.options.enablePerformanceOptimization) {
            await this.initializePerformanceOptimizer();
        }
        
        // Initialize Visualization Debugger
        if (this.options.enableVisualizationDebugger) {
            await this.initializeVisualizationDebugger();
        }
        
        // Initialize Spatial Audio
        if (this.options.enableSpatialAudio) {
            await this.initializeSpatialAudio();
        }
        
        // Initialize Asset Integration
        if (this.options.enableAssetIntegration) {
            await this.initializeAssetIntegration();
        }
    }

    /**
     * Initialize Performance Optimizer
     */
    async initializePerformanceOptimizer() {
        this.performanceOptimizer = new AudioPerformanceOptimizer(
            this.audioManagement,
            this.options.performanceOptimizer
        );
        
        this.componentStates.set('performanceOptimizer', 'initialized');
        
        // Bind events
        this.performanceOptimizer.on('optimizationPerformed', (data) => {
            this.handleOptimizationPerformed(data);
        });
        
        this.performanceOptimizer.on('performanceMonitored', (data) => {
            this.handleComponentPerformanceUpdate('performanceOptimizer', data);
        });
    }

    /**
     * Initialize Visualization Debugger
     */
    async initializeVisualizationDebugger() {
        this.visualizationDebugger = new AudioVisualizationDebugger(
            this.audioManagement,
            this.options.visualizationDebugger
        );
        
        // Create canvas if not provided
        const canvas = this.options.visualizationCanvas || this.createVisualizationCanvas();
        await this.visualizationDebugger.initialize(canvas);
        
        this.componentStates.set('visualizationDebugger', 'initialized');
    }

    /**
     * Initialize Spatial Audio
     */
    async initializeSpatialAudio() {
        this.spatialAudio = new SpatialAudioEngine({
            ...this.options.spatialAudio,
            audioContext: this.audioManagement.audioContext
        });
        
        await this.spatialAudio.initialize();
        this.componentStates.set('spatialAudio', 'initialized');
        
        // Integrate with audio management
        this.integrateSpatialAudio();
    }

    /**
     * Initialize Asset Integration
     */
    async initializeAssetIntegration() {
        this.assetIntegration = new AudioAssetIntegration(this.options.assetIntegration);
        await this.assetIntegration.initialize();
        
        this.componentStates.set('assetIntegration', 'initialized');
    }

    /**
     * Set up component integration
     */
    setupComponentIntegration() {
        // Cross-component optimization
        if (this.options.enableCrossComponentOptimization) {
            this.setupCrossComponentOptimization();
        }
        
        // Unified event handling
        this.setupUnifiedEventHandling();
        
        // Performance metrics aggregation
        this.setupMetricsAggregation();
    }

    /**
     * Set up cross-component optimization
     */
    setupCrossComponentOptimization() {
        // Performance optimizer influences visualization
        if (this.performanceOptimizer && this.visualizationDebugger) {
            this.performanceOptimizer.on('optimizationPerformed', (data) => {
                if (data.strategy === 'aggressive') {
                    // Reduce visualization complexity
                    this.visualizationDebugger.options.visualizationFPS = 30;
                } else {
                    // Restore normal visualization
                    this.visualizationDebugger.options.visualizationFPS = 60;
                }
            });
        }
        
        // Spatial audio influences performance optimization
        if (this.spatialAudio && this.performanceOptimizer) {
            this.spatialAudio.on('sourceCountChanged', (count) => {
                // Adjust performance thresholds based on spatial source count
                const threshold = Math.max(0.5, 0.8 - (count * 0.05));
                this.performanceOptimizer.options.cpuThreshold = threshold;
            });
        }
    }

    /**
     * Set up unified event handling
     */
    setupUnifiedEventHandling() {
        // Register event handlers for cross-component coordination
        this.eventCoordinator.eventHandlers.set('qualityChange', (data) => {
            this.coordinateQualityChange(data);
        });
        
        this.eventCoordinator.eventHandlers.set('performanceOptimization', (data) => {
            this.coordinatePerformanceOptimization(data);
        });
        
        this.eventCoordinator.eventHandlers.set('settingsUpdate', (data) => {
            this.coordinateSettingsUpdate(data);
        });
    }

    /**
     * Set up metrics aggregation
     */
    setupMetricsAggregation() {
        // Aggregate metrics from all components
        setInterval(() => {
            this.aggregateMetrics();
        }, 1000);
    }

    /**
     * Start all components
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Audio Management Integration already running');
            return;
        }
        
        this.logger.info('Starting Audio Management Integration...');
        
        try {
            // Start performance optimizer
            if (this.performanceOptimizer) {
                this.performanceOptimizer.start();
                this.componentStates.set('performanceOptimizer', 'running');
            }
            
            // Start visualization debugger
            if (this.visualizationDebugger) {
                this.visualizationDebugger.start();
                this.componentStates.set('visualizationDebugger', 'running');
            }
            
            // Start spatial audio
            if (this.spatialAudio) {
                this.spatialAudio.start();
                this.componentStates.set('spatialAudio', 'running');
            }
            
            this.isRunning = true;
            this.emit('started');
            
            this.logger.info('Audio Management Integration started successfully');
            
        } catch (error) {
            this.logger.error('Failed to start Audio Management Integration:', error);
            throw error;
        }
    }

    /**
     * Stop all components
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.logger.info('Stopping Audio Management Integration...');
        
        try {
            // Stop components
            if (this.performanceOptimizer) {
                this.performanceOptimizer.stop();
                this.componentStates.set('performanceOptimizer', 'stopped');
            }
            
            if (this.visualizationDebugger) {
                this.visualizationDebugger.stop();
                this.componentStates.set('visualizationDebugger', 'stopped');
            }
            
            if (this.spatialAudio) {
                this.spatialAudio.stop();
                this.componentStates.set('spatialAudio', 'stopped');
            }
            
            this.isRunning = false;
            this.emit('stopped');
            
            this.logger.info('Audio Management Integration stopped');
            
        } catch (error) {
            this.logger.error('Error stopping Audio Management Integration:', error);
        }
    }

    /**
     * Apply unified settings to all components
     */
    async applyUnifiedSettings() {
        if (!this.options.enableUnifiedSettings) {
            return;
        }
        
        try {
            // Apply to audio management
            if (this.audioManagement) {
                await this.audioManagement.updateSettings({
                    masterVolume: this.unifiedSettings.masterVolume,
                    quality: this.unifiedSettings.quality,
                    visualizationEnabled: this.unifiedSettings.visualizationEnabled
                });
            }
            
            // Apply to spatial audio
            if (this.spatialAudio) {
                this.spatialAudio.setEnabled(this.unifiedSettings.spatialAudioEnabled);
            }
            
            // Apply debug mode
            if (this.unifiedSettings.debugMode) {
                this.enableGlobalDebugMode();
            } else {
                this.disableGlobalDebugMode();
            }
            
            this.emit('unifiedSettingsApplied', this.unifiedSettings);
            
        } catch (error) {
            this.logger.error('Failed to apply unified settings:', error);
        }
    }

    /**
     * Update unified settings
     */
    async updateUnifiedSettings(newSettings) {
        const oldSettings = { ...this.unifiedSettings };
        
        // Merge new settings
        Object.assign(this.unifiedSettings, newSettings);
        
        // Apply changes
        await this.applyUnifiedSettings();
        
        this.emit('unifiedSettingsChanged', {
            oldSettings,
            newSettings: this.unifiedSettings
        });
    }

    /**
     * Load audio asset through integrated system
     */
    async loadAudio(assetId, options = {}) {
        try {
            // Use asset integration if available
            if (this.assetIntegration) {
                return await this.assetIntegration.loadAudioAsset(assetId, options);
            }
            
            // Fallback to audio management system
            return await this.audioManagement.loadAudio(assetId, options);
            
        } catch (error) {
            this.logger.error(`Failed to load audio ${assetId}:`, error);
            throw error;
        }
    }

    /**
     * Create spatial audio source
     */
    createSpatialSource(assetId, position, options = {}) {
        if (!this.spatialAudio) {
            throw new Error('Spatial audio not enabled');
        }
        
        return this.spatialAudio.createSpatialSource(assetId, position, options);
    }

    /**
     * Get optimized audio source (uses performance optimizer if available)
     */
    getOptimizedSource(assetId, options = {}) {
        if (this.performanceOptimizer) {
            return this.performanceOptimizer.getPooledSource(assetId, options);
        }
        
        return this.audioManagement.createSource(assetId, options);
    }

    /**
     * Event coordination methods
     */
    setupEventCoordination() {
        // Process event queue
        setInterval(() => {
            this.processEventQueue();
        }, 50); // Process every 50ms
    }

    processEventQueue() {
        if (this.eventCoordinator.processingEvents || this.eventCoordinator.eventQueue.length === 0) {
            return;
        }
        
        this.eventCoordinator.processingEvents = true;
        
        try {
            while (this.eventCoordinator.eventQueue.length > 0) {
                const event = this.eventCoordinator.eventQueue.shift();
                this.processCoordinatedEvent(event);
            }
        } finally {
            this.eventCoordinator.processingEvents = false;
        }
    }

    processCoordinatedEvent(event) {
        const handler = this.eventCoordinator.eventHandlers.get(event.type);
        if (handler) {
            try {
                handler(event.data);
            } catch (error) {
                this.logger.warn(`Error processing coordinated event ${event.type}:`, error);
            }
        }
    }

    /**
     * Component event handlers
     */
    handleComponentPerformanceUpdate(componentName, data) {
        this.aggregatedMetrics.components.set(componentName, data);
        this.emit('componentPerformanceUpdate', { componentName, data });
    }

    handleQualityChange(componentName, data) {
        this.eventCoordinator.eventQueue.push({
            type: 'qualityChange',
            data: { componentName, ...data }
        });
    }

    handleOptimizationPerformed(data) {
        this.eventCoordinator.eventQueue.push({
            type: 'performanceOptimization',
            data
        });
    }

    /**
     * Event coordination handlers
     */
    coordinateQualityChange(data) {
        // Propagate quality changes to all relevant components
        if (data.componentName !== 'audioManagement' && this.audioManagement) {
            this.audioManagement.setQuality(data.newQuality);
        }
        
        // Update unified settings
        this.unifiedSettings.quality = data.newQuality;
    }

    coordinatePerformanceOptimization(data) {
        // Coordinate performance optimizations across components
        if (data.strategy === 'aggressive') {
            // Reduce quality across all components
            this.updateUnifiedSettings({ quality: 'medium' });
        }
    }

    coordinateSettingsUpdate(data) {
        // Coordinate settings updates across components
        this.applyUnifiedSettings();
    }

    /**
     * Metrics aggregation
     */
    aggregateMetrics() {
        let totalCpuUsage = 0;
        let totalMemoryUsage = 0;
        let maxLatency = 0;
        let componentCount = 0;
        
        for (const [componentName, metrics] of this.aggregatedMetrics.components) {
            if (metrics.cpuUsage !== undefined) {
                totalCpuUsage += metrics.cpuUsage;
                componentCount++;
            }
            
            if (metrics.memoryUsage !== undefined) {
                totalMemoryUsage += metrics.memoryUsage;
            }
            
            if (metrics.audioLatency !== undefined) {
                maxLatency = Math.max(maxLatency, metrics.audioLatency);
            }
        }
        
        // Calculate aggregated metrics
        this.aggregatedMetrics.overall = {
            cpuUsage: componentCount > 0 ? totalCpuUsage / componentCount : 0,
            memoryUsage: totalMemoryUsage,
            audioLatency: maxLatency,
            quality: this.calculateOverallQuality()
        };
        
        this.emit('metricsAggregated', this.aggregatedMetrics.overall);
    }

    calculateOverallQuality() {
        const metrics = this.aggregatedMetrics.overall;
        
        if (metrics.cpuUsage > 0.8 || metrics.memoryUsage > 0.9 || metrics.audioLatency > 0.1) {
            return 'poor';
        } else if (metrics.cpuUsage > 0.6 || metrics.memoryUsage > 0.7 || metrics.audioLatency > 0.05) {
            return 'fair';
        } else if (metrics.cpuUsage > 0.4 || metrics.memoryUsage > 0.5 || metrics.audioLatency > 0.02) {
            return 'good';
        } else {
            return 'excellent';
        }
    }

    /**
     * Utility methods
     */
    createVisualizationCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.border = '1px solid #333';
        return canvas;
    }

    integrateSpatialAudio() {
        // Connect spatial audio to main audio chain
        if (this.spatialAudio && this.audioManagement) {
            this.spatialAudio.connectToAudioChain(this.audioManagement.masterGain);
        }
    }

    enableGlobalDebugMode() {
        if (this.audioManagement) {
            this.audioManagement.enableDebugMode();
        }
        
        if (this.performanceOptimizer) {
            this.performanceOptimizer.debugMode = true;
        }
        
        this.logger.info('Global debug mode enabled');
    }

    disableGlobalDebugMode() {
        if (this.audioManagement) {
            this.audioManagement.disableDebugMode();
        }
        
        if (this.performanceOptimizer) {
            this.performanceOptimizer.debugMode = false;
        }
        
        this.logger.info('Global debug mode disabled');
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            componentStates: Object.fromEntries(this.componentStates),
            unifiedSettings: { ...this.unifiedSettings },
            aggregatedMetrics: { ...this.aggregatedMetrics.overall },
            componentCount: this.componentStates.size
        };
    }

    /**
     * Get all component references
     */
    getComponents() {
        return {
            audioManagement: this.audioManagement,
            performanceOptimizer: this.performanceOptimizer,
            visualizationDebugger: this.visualizationDebugger,
            spatialAudio: this.spatialAudio,
            assetIntegration: this.assetIntegration
        };
    }

    /**
     * Export system configuration
     */
    exportConfiguration() {
        return {
            options: this.options,
            unifiedSettings: this.unifiedSettings,
            componentStates: Object.fromEntries(this.componentStates),
            systemStatus: this.getSystemStatus()
        };
    }

    /**
     * Dispose of the integrated system
     */
    async dispose() {
        try {
            this.logger.info('Disposing Audio Management Integration...');
            
            // Stop all components
            await this.stop();
            
            // Dispose components
            if (this.audioManagement) {
                await this.audioManagement.dispose();
            }
            
            if (this.performanceOptimizer) {
                this.performanceOptimizer.dispose();
            }
            
            if (this.visualizationDebugger) {
                this.visualizationDebugger.dispose();
            }
            
            if (this.spatialAudio) {
                this.spatialAudio.dispose();
            }
            
            if (this.assetIntegration) {
                this.assetIntegration.dispose();
            }
            
            // Clear state
            this.componentStates.clear();
            this.aggregatedMetrics.components.clear();
            this.eventCoordinator.eventQueue = [];
            
            // Remove all listeners
            this.removeAllListeners();
            
            this.logger.info('Audio Management Integration disposed');
            
        } catch (error) {
            this.logger.error('Error disposing Audio Management Integration:', error);
        }
    }
}

// Export singleton instance
export const audioManagementIntegration = new AudioManagementIntegration();
export default AudioManagementIntegration;