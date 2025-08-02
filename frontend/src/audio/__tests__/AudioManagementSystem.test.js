/**
 * Tests for AudioManagementSystem
 */

import { AudioManagementSystem } from '../AudioManagementSystem.js';

// Mock dependencies
jest.mock('../../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        })
    }
}));

jest.mock('../../../assets/AssetManager.js', () => ({
    assetManager: {
        loadAsset: jest.fn()
    }
}));

// Mock Web Audio API
const mockAudioContext = {
    state: 'running',
    sampleRate: 44100,
    outputLatency: 0.01,
    baseLatency: 0.005,
    createGain: jest.fn(() => ({
        gain: { value: 1.0 },
        connect: jest.fn()
    })),
    createDynamicsCompressor: jest.fn(() => ({
        threshold: { value: -24 },
        knee: { value: 30 },
        ratio: { value: 12 },
        attack: { value: 0.003 },
        release: { value: 0.25 },
        connect: jest.fn()
    })),
    createAnalyser: jest.fn(() => ({
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        frequencyBinCount: 1024,
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn()
    })),
    createBufferSource: jest.fn(() => ({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null
    })),
    decodeAudioData: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
    destination: {},
    addEventListener: jest.fn()
};

global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

// Mock Worker
global.Worker = jest.fn(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: null
}));

global.URL = {
    createObjectURL: jest.fn(() => 'blob:mock-url')
};

global.Blob = jest.fn();

describe('AudioManagementSystem', () => {
    let audioSystem;

    beforeEach(() => {
        jest.clearAllMocks();
        audioSystem = new AudioManagementSystem({
            debugMode: true
        });
    });

    afterEach(async () => {
        if (audioSystem) {
            await audioSystem.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(audioSystem.options.streamingEnabled).toBe(true);
            expect(audioSystem.options.defaultQuality).toBe('high');
            expect(audioSystem.options.adaptiveQuality).toBe(true);
            expect(audioSystem.options.visualizationEnabled).toBe(true);
        });

        test('should initialize audio context', async () => {
            await audioSystem.initialize();
            
            expect(global.AudioContext).toHaveBeenCalled();
            expect(audioSystem.audioContext).toBeDefined();
            expect(audioSystem.masterGain).toBeDefined();
            expect(audioSystem.compressor).toBeDefined();
        });

        test('should set up audio processing chain', async () => {
            await audioSystem.initialize();
            
            expect(mockAudioContext.createGain).toHaveBeenCalled();
            expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
        });

        test('should initialize visualization when enabled', async () => {
            await audioSystem.initialize();
            
            expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
            expect(audioSystem.analyser).toBeDefined();
            expect(audioSystem.visualizationData.frequencyData).toBeInstanceOf(Uint8Array);
        });

        test('should emit initialized event', async () => {
            const initSpy = jest.fn();
            audioSystem.on('initialized', initSpy);
            
            await audioSystem.initialize();
            
            expect(initSpy).toHaveBeenCalled();
        });
    });

    describe('Quality Management', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should set audio quality', async () => {
            const oldQuality = audioSystem.currentQuality;
            
            await audioSystem.setQuality('low');
            
            expect(audioSystem.currentQuality).toBe('low');
        });

        test('should emit quality changed event', async () => {
            const qualitySpy = jest.fn();
            audioSystem.on('qualityChanged', qualitySpy);
            
            await audioSystem.setQuality('ultra');
            
            expect(qualitySpy).toHaveBeenCalledWith({
                oldQuality: 'high',
                newQuality: 'ultra'
            });
        });

        test('should throw error for invalid quality', async () => {
            await expect(audioSystem.setQuality('invalid')).rejects.toThrow('Invalid quality level: invalid');
        });

        test('should downgrade quality under high load', () => {
            audioSystem.performanceMonitor.cpuLoad = 0.9;
            audioSystem.currentQuality = 'ultra';
            
            audioSystem.optimizePerformance();
            
            expect(audioSystem.currentQuality).toBe('high');
        });

        test('should upgrade quality under low load', () => {
            audioSystem.performanceMonitor.cpuLoad = 0.3;
            audioSystem.performanceMonitor.memoryUsage = 50 * 1024 * 1024; // 50MB
            audioSystem.currentQuality = 'low';
            
            audioSystem.optimizePerformance();
            
            expect(audioSystem.currentQuality).toBe('medium');
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should update performance metrics', () => {
            const performanceSpy = jest.fn();
            audioSystem.on('performanceUpdate', performanceSpy);
            
            audioSystem.updatePerformanceMetrics();
            
            expect(performanceSpy).toHaveBeenCalled();
            expect(audioSystem.performanceMonitor.activeSources).toBeDefined();
            expect(audioSystem.performanceMonitor.memoryUsage).toBeDefined();
            expect(audioSystem.performanceMonitor.cpuLoad).toBeDefined();
        });

        test('should estimate memory usage', () => {
            // Add mock buffer
            audioSystem.audioBuffers.set('test', {
                buffer: { length: 1000, numberOfChannels: 2 },
                lastUsed: Date.now()
            });
            
            const memoryUsage = audioSystem.estimateMemoryUsage();
            
            expect(memoryUsage).toBeGreaterThan(0);
        });

        test('should estimate CPU load', () => {
            audioSystem.streamingSources.set('test1', {});
            audioSystem.streamingSources.set('test2', {});
            
            const cpuLoad = audioSystem.estimateCPULoad();
            
            expect(cpuLoad).toBeGreaterThan(0);
            expect(cpuLoad).toBeLessThanOrEqual(1);
        });

        test('should trigger garbage collection when memory threshold exceeded', () => {
            const gcSpy = jest.fn();
            audioSystem.on('garbageCollected', gcSpy);
            
            // Mock high memory usage
            audioSystem.performanceMonitor.memoryUsage = audioSystem.options.memoryLimit * 0.9;
            
            audioSystem.checkMemoryUsage();
            
            expect(gcSpy).toHaveBeenCalled();
        });
    });

    describe('Audio Buffer Management', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should load audio asset', async () => {
            const mockAsset = {
                arrayBuffer: new ArrayBuffer(1000)
            };
            const mockBuffer = { length: 1000, numberOfChannels: 2 };
            
            require('../../../assets/AssetManager.js').assetManager.loadAsset.mockResolvedValue(mockAsset);
            mockAudioContext.decodeAudioData.mockResolvedValue(mockBuffer);
            
            const result = await audioSystem.loadAudio('test-asset');
            
            expect(result.buffer).toBe(mockBuffer);
            expect(audioSystem.audioBuffers.has('test-asset')).toBe(true);
        });

        test('should return cached buffer if already loaded', async () => {
            const mockBuffer = { buffer: {}, lastUsed: Date.now() };
            audioSystem.audioBuffers.set('cached-asset', mockBuffer);
            
            const result = await audioSystem.loadAudio('cached-asset');
            
            expect(result).toBe(mockBuffer);
            expect(require('../../../assets/AssetManager.js').assetManager.loadAsset).not.toHaveBeenCalled();
        });

        test('should create audio source', () => {
            const mockBuffer = { buffer: { length: 1000 } };
            audioSystem.audioBuffers.set('test-asset', mockBuffer);
            
            const result = audioSystem.createSource('test-asset', { volume: 0.5 });
            
            expect(result.source).toBeDefined();
            expect(result.gainNode).toBeDefined();
            expect(result.sourceId).toBeDefined();
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        });

        test('should clean up old buffers', () => {
            const oldTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
            audioSystem.audioBuffers.set('old-buffer', { lastUsed: oldTime });
            audioSystem.audioBuffers.set('new-buffer', { lastUsed: Date.now() });
            
            audioSystem.cleanupOldBuffers();
            
            expect(audioSystem.audioBuffers.has('old-buffer')).toBe(false);
            expect(audioSystem.audioBuffers.has('new-buffer')).toBe(true);
        });
    });

    describe('Visualization', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should set up visualization', () => {
            expect(audioSystem.analyser).toBeDefined();
            expect(audioSystem.visualizationData.frequencyData).toBeInstanceOf(Uint8Array);
            expect(audioSystem.visualizationData.waveformData).toBeInstanceOf(Uint8Array);
        });

        test('should calculate volume level', () => {
            audioSystem.visualizationData.waveformData = new Uint8Array([100, 150, 120, 180]);
            
            audioSystem.calculateVolumeLevel();
            
            expect(audioSystem.visualizationData.volumeLevel).toBeGreaterThan(0);
            expect(audioSystem.visualizationData.peakLevel).toBeGreaterThan(0);
        });

        test('should return visualization data when enabled', () => {
            const data = audioSystem.getVisualizationData();
            
            expect(data.isEnabled).toBe(true);
            expect(data.frequencyData).toBeDefined();
            expect(data.waveformData).toBeDefined();
        });

        test('should return disabled state when visualization disabled', () => {
            audioSystem.options.visualizationEnabled = false;
            
            const data = audioSystem.getVisualizationData();
            
            expect(data.isEnabled).toBe(false);
        });
    });

    describe('Settings Management', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should get current settings', () => {
            const settings = audioSystem.getSettings();
            
            expect(settings.quality).toBe('high');
            expect(settings.streamingEnabled).toBe(true);
            expect(settings.visualizationEnabled).toBe(true);
            expect(settings.masterVolume).toBe(1.0);
        });

        test('should update settings', () => {
            const settingsSpy = jest.fn();
            audioSystem.on('settingsUpdated', settingsSpy);
            
            audioSystem.updateSettings({
                masterVolume: 0.5,
                visualizationEnabled: false
            });
            
            expect(audioSystem.masterGain.gain.value).toBe(0.5);
            expect(audioSystem.options.visualizationEnabled).toBe(false);
            expect(settingsSpy).toHaveBeenCalled();
        });

        test('should clamp master volume to valid range', () => {
            audioSystem.updateSettings({ masterVolume: 2.0 });
            expect(audioSystem.masterGain.gain.value).toBe(1.0);
            
            audioSystem.updateSettings({ masterVolume: -0.5 });
            expect(audioSystem.masterGain.gain.value).toBe(0.0);
        });
    });

    describe('Debug Mode', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should enable debug mode', () => {
            audioSystem.enableDebugMode();
            
            expect(audioSystem.debugMode).toBe(true);
            expect(audioSystem.debugInterval).toBeDefined();
        });

        test('should disable debug mode', () => {
            audioSystem.enableDebugMode();
            audioSystem.disableDebugMode();
            
            expect(audioSystem.debugMode).toBe(false);
            expect(audioSystem.debugInterval).toBeNull();
        });

        test('should log debug info when enabled', () => {
            const logSpy = jest.spyOn(audioSystem.logger, 'debug');
            audioSystem.debugMode = true;
            
            audioSystem.logDebugInfo();
            
            expect(logSpy).toHaveBeenCalled();
        });
    });

    describe('Worker Integration', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should create streaming worker', () => {
            expect(global.Worker).toHaveBeenCalled();
            expect(audioSystem.streamingWorker).toBeDefined();
        });

        test('should handle worker messages', () => {
            const mockData = { type: 'audioProcessed', data: {} };
            
            audioSystem.handleProcessedAudio = jest.fn();
            audioSystem.handleWorkerMessage(mockData);
            
            expect(audioSystem.handleProcessedAudio).toHaveBeenCalledWith({});
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', async () => {
            global.AudioContext = jest.fn(() => {
                throw new Error('Audio context creation failed');
            });
            
            const newSystem = new AudioManagementSystem();
            
            await expect(newSystem.initialize()).rejects.toThrow('Audio context creation failed');
        });

        test('should handle audio loading errors', async () => {
            await audioSystem.initialize();
            
            require('../../../assets/AssetManager.js').assetManager.loadAsset.mockRejectedValue(
                new Error('Asset load failed')
            );
            
            await expect(audioSystem.loadAudio('invalid-asset')).rejects.toThrow('Asset load failed');
        });

        test('should handle source creation errors', async () => {
            await audioSystem.initialize();
            
            expect(() => {
                audioSystem.createSource('non-existent-asset');
            }).toThrow('Audio not loaded: non-existent-asset');
        });
    });

    describe('Disposal', () => {
        test('should dispose cleanly', async () => {
            await audioSystem.initialize();
            
            // Add some data to clean up
            audioSystem.audioBuffers.set('test', {});
            audioSystem.streamingSources.set('test', { source: { stop: jest.fn() } });
            
            await audioSystem.dispose();
            
            expect(audioSystem.audioBuffers.size).toBe(0);
            expect(audioSystem.streamingSources.size).toBe(0);
            expect(mockAudioContext.close).toHaveBeenCalled();
        });

        test('should handle disposal errors gracefully', async () => {
            await audioSystem.initialize();
            
            mockAudioContext.close.mockRejectedValue(new Error('Close failed'));
            
            // Should not throw
            await expect(audioSystem.dispose()).resolves.toBeUndefined();
        });
    });

    describe('Performance Statistics', () => {
        beforeEach(async () => {
            await audioSystem.initialize();
        });

        test('should return performance statistics', () => {
            const stats = audioSystem.getPerformanceStats();
            
            expect(stats.activeSources).toBeDefined();
            expect(stats.memoryUsage).toBeDefined();
            expect(stats.cpuLoad).toBeDefined();
            expect(stats.qualityMetrics).toBeDefined();
            expect(stats.bufferCount).toBeDefined();
            expect(stats.activeSourceCount).toBeDefined();
            expect(stats.memoryUsagePercent).toBeDefined();
        });

        test('should calculate memory usage percentage correctly', () => {
            audioSystem.performanceMonitor.memoryUsage = audioSystem.options.memoryLimit * 0.5;
            
            const stats = audioSystem.getPerformanceStats();
            
            expect(stats.memoryUsagePercent).toBe(50);
        });
    });
});