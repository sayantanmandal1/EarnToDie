/**
 * Tests for AudioManagementIntegration
 */

import { AudioManagementIntegration } from '../AudioManagementIntegration.js';

// Mock all dependencies
jest.mock('../AudioManagementSystem.js');
jest.mock('../AudioPerformanceOptimizer.js');
jest.mock('../AudioVisualizationDebugger.js');
jest.mock('../SpatialAudioEngine.js');
jest.mock('../AudioAssetIntegration.js');
jest.mock('../../electron/ElectronIntegration.js');

// Mock implementations
const mockAudioManagement = {
    initialize: jest.fn(),
    updateSettings: jest.fn(),
    setQuality: jest.fn(),
    loadAudio: jest.fn(),
    createSource: jest.fn(),
    enableDebugMode: jest.fn(),
    disableDebugMode: jest.fn(),
    dispose: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    audioContext: { state: 'running' },
    masterGain: { gain: { value: 1.0 } }
};

const mockPerformanceOptimizer = {
    start: jest.fn(),
    stop: jest.fn(),
    dispose: jest.fn(),
    getPooledSource: jest.fn(),
    on: jest.fn(),
    debugMode: false
};

const mockVisualizationDebugger = {
    initialize: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    dispose: jest.fn(),
    on: jest.fn(),
    options: { visualizationFPS: 60 }
};

const mockSpatialAudio = {
    initialize: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    dispose: jest.fn(),
    setEnabled: jest.fn(),
    createSpatialSource: jest.fn(),
    connectToAudioChain: jest.fn(),
    on: jest.fn()
};

const mockAssetIntegration = {
    initialize: jest.fn(),
    dispose: jest.fn(),
    loadAudioAsset: jest.fn()
};

// Set up mocks
require('../AudioManagementSystem.js').AudioManagementSystem.mockImplementation(() => mockAudioManagement);
require('../AudioPerformanceOptimizer.js').default.mockImplementation(() => mockPerformanceOptimizer);
require('../AudioVisualizationDebugger.js').default.mockImplementation(() => mockVisualizationDebugger);
require('../SpatialAudioEngine.js').SpatialAudioEngine.mockImplementation(() => mockSpatialAudio);
require('../AudioAssetIntegration.js').AudioAssetIntegration.mockImplementation(() => mockAssetIntegration);

require('../../electron/ElectronIntegration.js').electronIntegration = {
    getLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
};

describe('AudioManagementIntegration', () => {
    let integration;

    beforeEach(() => {
        jest.clearAllMocks();
        integration = new AudioManagementIntegration({
            enablePerformanceOptimization: true,
            enableVisualizationDebugger: true,
            enableSpatialAudio: true,
            enableAssetIntegration: true,
            autoStart: false
        });
    });

    afterEach(async () => {
        if (integration) {
            await integration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(integration.options.enablePerformanceOptimization).toBe(true);
            expect(integration.options.enableVisualizationDebugger).toBe(true);
            expect(integration.options.enableSpatialAudio).toBe(true);
            expect(integration.options.enableAssetIntegration).toBe(true);
        });

        test('should initialize all components', async () => {
            await integration.initialize();
            
            expect(mockAudioManagement.initialize).toHaveBeenCalled();
            expect(mockVisualizationDebugger.initialize).toHaveBeenCalled();
            expect(mockSpatialAudio.initialize).toHaveBeenCalled();
            expect(mockAssetIntegration.initialize).toHaveBeenCalled();
            
            expect(integration.isInitialized).toBe(true);
        });

        test('should emit initialized event', async () => {
            const initSpy = jest.fn();
            integration.on('initialized', initSpy);
            
            await integration.initialize();
            
            expect(initSpy).toHaveBeenCalled();
        });

        test('should handle initialization errors', async () => {
            mockAudioManagement.initialize.mockRejectedValue(new Error('Init failed'));
            
            await expect(integration.initialize()).rejects.toThrow('Init failed');
        });

        test('should initialize only enabled components', async () => {
            const limitedIntegration = new AudioManagementIntegration({
                enablePerformanceOptimization: false,
                enableVisualizationDebugger: false,
                enableSpatialAudio: true,
                enableAssetIntegration: false
            });
            
            await limitedIntegration.initialize();
            
            expect(limitedIntegration.performanceOptimizer).toBeNull();
            expect(limitedIntegration.visualizationDebugger).toBeNull();
            expect(limitedIntegration.spatialAudio).toBeDefined();
            expect(limitedIntegration.assetIntegration).toBeNull();
            
            await limitedIntegration.dispose();
        });
    });

    describe('Component Management', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should start all components', async () => {
            await integration.start();
            
            expect(mockPerformanceOptimizer.start).toHaveBeenCalled();
            expect(mockVisualizationDebugger.start).toHaveBeenCalled();
            expect(mockSpatialAudio.start).toHaveBeenCalled();
            
            expect(integration.isRunning).toBe(true);
        });

        test('should stop all components', async () => {
            await integration.start();
            await integration.stop();
            
            expect(mockPerformanceOptimizer.stop).toHaveBeenCalled();
            expect(mockVisualizationDebugger.stop).toHaveBeenCalled();
            expect(mockSpatialAudio.stop).toHaveBeenCalled();
            
            expect(integration.isRunning).toBe(false);
        });

        test('should track component states', async () => {
            await integration.start();
            
            const status = integration.getSystemStatus();
            
            expect(status.componentStates.audioManagement).toBe('initialized');
            expect(status.componentStates.performanceOptimizer).toBe('running');
            expect(status.componentStates.visualizationDebugger).toBe('running');
            expect(status.componentStates.spatialAudio).toBe('running');
        });
    });

    describe('Unified Settings', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should apply unified settings to all components', async () => {
            await integration.updateUnifiedSettings({
                masterVolume: 0.8,
                quality: 'medium',
                spatialAudioEnabled: false
            });
            
            expect(mockAudioManagement.updateSettings).toHaveBeenCalledWith({
                masterVolume: 0.8,
                quality: 'medium',
                visualizationEnabled: true
            });
            
            expect(mockSpatialAudio.setEnabled).toHaveBeenCalledWith(false);
        });

        test('should emit settings changed event', async () => {
            const settingsSpy = jest.fn();
            integration.on('unifiedSettingsChanged', settingsSpy);
            
            await integration.updateUnifiedSettings({ masterVolume: 0.5 });
            
            expect(settingsSpy).toHaveBeenCalled();
        });

        test('should enable global debug mode', async () => {
            await integration.updateUnifiedSettings({ debugMode: true });
            
            expect(mockAudioManagement.enableDebugMode).toHaveBeenCalled();
            expect(mockPerformanceOptimizer.debugMode).toBe(true);
        });

        test('should disable global debug mode', async () => {
            await integration.updateUnifiedSettings({ debugMode: false });
            
            expect(mockAudioManagement.disableDebugMode).toHaveBeenCalled();
            expect(mockPerformanceOptimizer.debugMode).toBe(false);
        });
    });

    describe('Audio Loading', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should load audio through asset integration when available', async () => {
            const mockAudioData = { buffer: 'mock-buffer' };
            mockAssetIntegration.loadAudioAsset.mockResolvedValue(mockAudioData);
            
            const result = await integration.loadAudio('test-asset');
            
            expect(mockAssetIntegration.loadAudioAsset).toHaveBeenCalledWith('test-asset', {});
            expect(result).toBe(mockAudioData);
        });

        test('should fallback to audio management when asset integration unavailable', async () => {
            integration.assetIntegration = null;
            const mockAudioData = { buffer: 'mock-buffer' };
            mockAudioManagement.loadAudio.mockResolvedValue(mockAudioData);
            
            const result = await integration.loadAudio('test-asset');
            
            expect(mockAudioManagement.loadAudio).toHaveBeenCalledWith('test-asset', {});
            expect(result).toBe(mockAudioData);
        });

        test('should handle loading errors', async () => {
            mockAssetIntegration.loadAudioAsset.mockRejectedValue(new Error('Load failed'));
            
            await expect(integration.loadAudio('invalid-asset')).rejects.toThrow('Load failed');
        });
    });

    describe('Spatial Audio Integration', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should create spatial audio source', () => {
            const position = { x: 1, y: 0, z: 0 };
            const mockSource = { id: 'spatial-source' };
            mockSpatialAudio.createSpatialSource.mockReturnValue(mockSource);
            
            const result = integration.createSpatialSource('test-asset', position);
            
            expect(mockSpatialAudio.createSpatialSource).toHaveBeenCalledWith('test-asset', position, {});
            expect(result).toBe(mockSource);
        });

        test('should throw error when spatial audio not enabled', () => {
            integration.spatialAudio = null;
            
            expect(() => {
                integration.createSpatialSource('test-asset', { x: 0, y: 0, z: 0 });
            }).toThrow('Spatial audio not enabled');
        });

        test('should integrate spatial audio with main audio chain', async () => {
            await integration.initialize();
            
            expect(mockSpatialAudio.connectToAudioChain).toHaveBeenCalledWith(mockAudioManagement.masterGain);
        });
    });

    describe('Performance Optimization Integration', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should get optimized source through performance optimizer', () => {
            const mockSource = { id: 'optimized-source' };
            mockPerformanceOptimizer.getPooledSource.mockReturnValue(mockSource);
            
            const result = integration.getOptimizedSource('test-asset');
            
            expect(mockPerformanceOptimizer.getPooledSource).toHaveBeenCalledWith('test-asset', {});
            expect(result).toBe(mockSource);
        });

        test('should fallback to audio management when optimizer unavailable', () => {
            integration.performanceOptimizer = null;
            const mockSource = { id: 'regular-source' };
            mockAudioManagement.createSource.mockReturnValue(mockSource);
            
            const result = integration.getOptimizedSource('test-asset');
            
            expect(mockAudioManagement.createSource).toHaveBeenCalledWith('test-asset', {});
            expect(result).toBe(mockSource);
        });
    });

    describe('Event Coordination', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should coordinate quality changes across components', () => {
            integration.coordinateQualityChange({
                componentName: 'performanceOptimizer',
                newQuality: 'low'
            });
            
            expect(mockAudioManagement.setQuality).toHaveBeenCalledWith('low');
            expect(integration.unifiedSettings.quality).toBe('low');
        });

        test('should coordinate performance optimizations', async () => {
            const updateSpy = jest.spyOn(integration, 'updateUnifiedSettings');
            
            integration.coordinatePerformanceOptimization({
                strategy: 'aggressive'
            });
            
            expect(updateSpy).toHaveBeenCalledWith({ quality: 'medium' });
        });

        test('should handle component performance updates', () => {
            const performanceSpy = jest.fn();
            integration.on('componentPerformanceUpdate', performanceSpy);
            
            const mockData = { cpuUsage: 0.5, memoryUsage: 0.3 };
            integration.handleComponentPerformanceUpdate('audioManagement', mockData);
            
            expect(performanceSpy).toHaveBeenCalledWith({
                componentName: 'audioManagement',
                data: mockData
            });
        });
    });

    describe('Cross-Component Optimization', () => {
        beforeEach(async () => {
            integration.options.enableCrossComponentOptimization = true;
            await integration.initialize();
        });

        test('should reduce visualization complexity during aggressive optimization', () => {
            // Simulate optimization event
            const optimizationData = { strategy: 'aggressive' };
            
            // Find the event handler that was registered
            const calls = mockPerformanceOptimizer.on.mock.calls;
            const optimizationCall = calls.find(call => call[0] === 'optimizationPerformed');
            
            if (optimizationCall) {
                const handler = optimizationCall[1];
                handler(optimizationData);
                
                expect(mockVisualizationDebugger.options.visualizationFPS).toBe(30);
            }
        });

        test('should adjust performance thresholds based on spatial source count', () => {
            // Find the spatial audio event handler
            const calls = mockSpatialAudio.on.mock.calls;
            const sourceCountCall = calls.find(call => call[0] === 'sourceCountChanged');
            
            if (sourceCountCall) {
                const handler = sourceCountCall[1];
                handler(5); // 5 spatial sources
                
                expect(mockPerformanceOptimizer.options.cpuThreshold).toBe(0.55); // 0.8 - (5 * 0.05)
            }
        });
    });

    describe('Metrics Aggregation', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should aggregate metrics from all components', () => {
            // Add mock component metrics
            integration.aggregatedMetrics.components.set('audioManagement', {
                cpuUsage: 0.4,
                memoryUsage: 0.3,
                audioLatency: 0.02
            });
            
            integration.aggregatedMetrics.components.set('performanceOptimizer', {
                cpuUsage: 0.2,
                memoryUsage: 0.1,
                audioLatency: 0.01
            });
            
            integration.aggregateMetrics();
            
            const overall = integration.aggregatedMetrics.overall;
            expect(overall.cpuUsage).toBe(0.3); // Average of 0.4 and 0.2
            expect(overall.memoryUsage).toBe(0.4); // Sum of 0.3 and 0.1
            expect(overall.audioLatency).toBe(0.02); // Max of 0.02 and 0.01
        });

        test('should calculate overall quality correctly', () => {
            integration.aggregatedMetrics.overall = {
                cpuUsage: 0.3,
                memoryUsage: 0.4,
                audioLatency: 0.01
            };
            
            const quality = integration.calculateOverallQuality();
            expect(quality).toBe('good');
        });

        test('should emit metrics aggregated event', () => {
            const metricsSpy = jest.fn();
            integration.on('metricsAggregated', metricsSpy);
            
            integration.aggregateMetrics();
            
            expect(metricsSpy).toHaveBeenCalled();
        });
    });

    describe('System Status', () => {
        beforeEach(async () => {
            await integration.initialize();
        });

        test('should return comprehensive system status', () => {
            const status = integration.getSystemStatus();
            
            expect(status.isInitialized).toBe(true);
            expect(status.isRunning).toBe(false);
            expect(status.componentStates).toBeDefined();
            expect(status.unifiedSettings).toBeDefined();
            expect(status.aggregatedMetrics).toBeDefined();
            expect(status.componentCount).toBeGreaterThan(0);
        });

        test('should return all component references', () => {
            const components = integration.getComponents();
            
            expect(components.audioManagement).toBeDefined();
            expect(components.performanceOptimizer).toBeDefined();
            expect(components.visualizationDebugger).toBeDefined();
            expect(components.spatialAudio).toBeDefined();
            expect(components.assetIntegration).toBeDefined();
        });

        test('should export system configuration', () => {
            const config = integration.exportConfiguration();
            
            expect(config.options).toBeDefined();
            expect(config.unifiedSettings).toBeDefined();
            expect(config.componentStates).toBeDefined();
            expect(config.systemStatus).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle component initialization errors', async () => {
            mockSpatialAudio.initialize.mockRejectedValue(new Error('Spatial audio init failed'));
            
            await expect(integration.initialize()).rejects.toThrow('Spatial audio init failed');
        });

        test('should handle component start errors gracefully', async () => {
            await integration.initialize();
            
            mockPerformanceOptimizer.start.mockImplementation(() => {
                throw new Error('Start failed');
            });
            
            await expect(integration.start()).rejects.toThrow('Start failed');
        });

        test('should handle settings update errors', async () => {
            await integration.initialize();
            
            mockAudioManagement.updateSettings.mockRejectedValue(new Error('Settings update failed'));
            
            // Should not throw, but log error
            await integration.updateUnifiedSettings({ masterVolume: 0.5 });
            
            // Verify error was handled gracefully
            expect(integration.unifiedSettings.masterVolume).toBe(0.5);
        });
    });

    describe('Disposal', () => {
        test('should dispose all components cleanly', async () => {
            await integration.initialize();
            await integration.start();
            
            await integration.dispose();
            
            expect(mockAudioManagement.dispose).toHaveBeenCalled();
            expect(mockPerformanceOptimizer.dispose).toHaveBeenCalled();
            expect(mockVisualizationDebugger.dispose).toHaveBeenCalled();
            expect(mockSpatialAudio.dispose).toHaveBeenCalled();
            expect(mockAssetIntegration.dispose).toHaveBeenCalled();
            
            expect(integration.componentStates.size).toBe(0);
        });

        test('should handle disposal errors gracefully', async () => {
            await integration.initialize();
            
            mockAudioManagement.dispose.mockRejectedValue(new Error('Dispose failed'));
            
            // Should not throw
            await expect(integration.dispose()).resolves.toBeUndefined();
        });
    });

    describe('Auto-start Feature', () => {
        test('should auto-start when enabled', async () => {
            const autoStartIntegration = new AudioManagementIntegration({
                autoStart: true,
                enablePerformanceOptimization: true
            });
            
            const startSpy = jest.spyOn(autoStartIntegration, 'start');
            
            await autoStartIntegration.initialize();
            
            expect(startSpy).toHaveBeenCalled();
            
            await autoStartIntegration.dispose();
        });

        test('should not auto-start when disabled', async () => {
            const manualStartIntegration = new AudioManagementIntegration({
                autoStart: false
            });
            
            const startSpy = jest.spyOn(manualStartIntegration, 'start');
            
            await manualStartIntegration.initialize();
            
            expect(startSpy).not.toHaveBeenCalled();
            
            await manualStartIntegration.dispose();
        });
    });
});