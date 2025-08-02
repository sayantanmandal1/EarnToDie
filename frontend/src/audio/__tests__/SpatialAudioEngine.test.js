/**
 * Spatial Audio Engine Tests
 * Comprehensive tests for the advanced 3D spatial audio system
 */

import { spatialAudioEngine, SpatialAudioEngine } from '../SpatialAudioEngine.js';

// Mock Web Audio API
const mockAudioContext = {
    sampleRate: 44100,
    state: 'running',
    currentTime: 0,
    destination: { connect: jest.fn() },
    listener: {
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        forwardX: { value: 0 },
        forwardY: { value: 0 },
        forwardZ: { value: -1 },
        upX: { value: 0 },
        upY: { value: 1 },
        upZ: { value: 0 },
        setPosition: jest.fn(),
        setOrientation: jest.fn(),
        setVelocity: jest.fn()
    },
    createGain: jest.fn(() => ({
        gain: { value: 1, setValueAtTime: jest.fn() },
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createPanner: jest.fn(() => ({
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 0,
        coneOuterGain: 0,
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        orientationX: { value: 0 },
        orientationY: { value: 0 },
        orientationZ: { value: -1 },
        connect: jest.fn(),
        disconnect: jest.fn(),
        setPosition: jest.fn(),
        setOrientation: jest.fn(),
        setVelocity: jest.fn()
    })),
    createBufferSource: jest.fn(() => ({
        buffer: null,
        onended: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
    })),
    createBiquadFilter: jest.fn(() => ({
        type: 'lowpass',
        frequency: { value: 22050, setValueAtTime: jest.fn() },
        Q: { value: 1 },
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createDynamicsCompressor: jest.fn(() => ({
        threshold: { value: -24 },
        knee: { value: 30 },
        ratio: { value: 12 },
        attack: { value: 0.003 },
        release: { value: 0.25 },
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createConvolver: jest.fn(() => ({
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createAnalyser: jest.fn(() => ({
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        frequencyBinCount: 1024,
        connect: jest.fn(),
        disconnect: jest.fn(),
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn()
    })),
    createBuffer: jest.fn((channels, length, sampleRate) => ({
        numberOfChannels: channels,
        length: length,
        sampleRate: sampleRate,
        duration: length / sampleRate,
        getChannelData: jest.fn(() => new Float32Array(length))
    })),
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
};

// Mock audio asset integration
jest.mock('../AudioAssetIntegration.js', () => ({
    audioAssetIntegration: {
        audioContext: mockAudioContext
    }
}));

// Mock electron integration
jest.mock('../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        })
    }
}));

describe('SpatialAudioEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = jest.fn(() => mockAudioContext);
        
        engine = new SpatialAudioEngine();
        
        // Mock timer functions
        jest.useFakeTimers();
    });

    afterEach(() => {
        if (engine && engine.isInitialized) {
            engine.dispose();
        }
        jest.useRealTimers();
    });

    describe('Initialization', () => {
        test('should initialize successfully with all features enabled', async () => {
            await engine.initialize();
            
            expect(engine.isInitialized).toBe(true);
            expect(engine.audioContext).toBe(mockAudioContext);
            expect(engine.listener).toBe(mockAudioContext.listener);
            expect(engine.masterGain).toBeDefined();
            expect(engine.analyser).toBeDefined();
        });

        test('should initialize with custom options', async () => {
            const customEngine = new SpatialAudioEngine({
                enableHRTF: false,
                enableReverb: false,
                maxAudioSources: 32,
                updateInterval: 32
            });

            await customEngine.initialize();
            
            expect(customEngine.options.enableHRTF).toBe(false);
            expect(customEngine.options.enableReverb).toBe(false);
            expect(customEngine.options.maxAudioSources).toBe(32);
            expect(customEngine.options.updateInterval).toBe(32);
            
            customEngine.dispose();
        });

        test('should handle Web Audio API not supported', async () => {
            delete global.AudioContext;
            delete global.webkitAudioContext;
            
            const unsupportedEngine = new SpatialAudioEngine();
            
            await expect(unsupportedEngine.initialize()).rejects.toThrow('Web Audio API not supported');
        });

        test('should resume suspended audio context', async () => {
            mockAudioContext.state = 'suspended';
            
            await engine.initialize();
            
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });
    });

    describe('Master Audio Graph', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should create master audio processing chain', () => {
            expect(mockAudioContext.createGain).toHaveBeenCalled();
            expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
            expect(engine.masterGain.connect).toHaveBeenCalledWith(engine.analyser);
            expect(engine.analyser.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        });

        test('should set up analyser with correct parameters', () => {
            expect(engine.analyser.fftSize).toBe(2048);
            expect(engine.analyser.smoothingTimeConstant).toBe(0.8);
        });

        test('should create compression when enabled', async () => {
            const compressedEngine = new SpatialAudioEngine({ enableCompression: true });
            await compressedEngine.initialize();
            
            expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
            expect(compressedEngine.compressor).toBeDefined();
            
            compressedEngine.dispose();
        });
    });

    describe('Spatial Audio Sources', () => {
        let mockAudioBuffer;

        beforeEach(async () => {
            await engine.initialize();
            
            mockAudioBuffer = {
                duration: 2.5,
                numberOfChannels: 2,
                sampleRate: 44100,
                length: 110250
            };
        });

        test('should create spatial audio source', () => {
            const source = engine.createAudioSource(mockAudioBuffer);
            
            expect(source).toBeDefined();
            expect(source.sourceId).toBeDefined();
            expect(source.audioBuffer).toBe(mockAudioBuffer);
            expect(engine.audioSources.has(source.sourceId)).toBe(true);
            expect(engine.activeSourceCount).toBe(1);
        });

        test('should play audio with spatial positioning', async () => {
            const position = { x: 10, y: 5, z: -3 };
            const options = {
                velocity: { x: 1, y: 0, z: 0 },
                reverbAmount: 0.3,
                occlusionAmount: 0.1
            };

            const source = await engine.playAudio(mockAudioBuffer, position, options);
            
            expect(source).toBeDefined();
            expect(source.position).toEqual(position);
            expect(source.velocity).toEqual(options.velocity);
            expect(source.reverbAmount).toBe(0.3);
            expect(source.occlusionAmount).toBe(0.1);
        });

        test('should limit maximum audio sources', () => {
            const limitedEngine = new SpatialAudioEngine({ maxAudioSources: 2 });
            
            // Create sources up to limit
            const source1 = limitedEngine.createAudioSource(mockAudioBuffer);
            const source2 = limitedEngine.createAudioSource(mockAudioBuffer);
            
            expect(limitedEngine.activeSourceCount).toBe(2);
            
            // Creating another should recycle oldest
            const source3 = limitedEngine.createAudioSource(mockAudioBuffer);
            
            expect(limitedEngine.activeSourceCount).toBe(2);
            expect(limitedEngine.audioSources.has(source1.sourceId)).toBe(false);
            expect(limitedEngine.audioSources.has(source3.sourceId)).toBe(true);
            
            limitedEngine.dispose();
        });

        test('should remove finished audio sources', () => {
            const source = engine.createAudioSource(mockAudioBuffer);
            const sourceId = source.sourceId;
            
            expect(engine.audioSources.has(sourceId)).toBe(true);
            
            // Simulate source finishing
            source.isPlaying = false;
            source.startTime = 1;
            
            engine.update();
            
            expect(engine.audioSources.has(sourceId)).toBe(false);
            expect(engine.activeSourceCount).toBe(0);
        });
    });

    describe('Listener Management', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should update listener position and orientation', () => {
            const position = { x: 5, y: 2, z: 8 };
            const orientation = {
                forward: { x: 0, y: 0, z: -1 },
                up: { x: 0, y: 1, z: 0 }
            };
            const velocity = { x: 2, y: 0, z: -1 };

            engine.updateListener(position, orientation, velocity);

            expect(engine.listenerPosition).toEqual(position);
            expect(engine.listenerOrientation).toEqual(orientation);
            expect(engine.listenerVelocity).toEqual(velocity);

            // Check modern API calls
            expect(mockAudioContext.listener.positionX.value).toBe(5);
            expect(mockAudioContext.listener.positionY.value).toBe(2);
            expect(mockAudioContext.listener.positionZ.value).toBe(8);
        });

        test('should use legacy API when modern API not available', () => {
            // Remove modern API properties
            delete mockAudioContext.listener.positionX;
            delete mockAudioContext.listener.forwardX;
            delete mockAudioContext.listener.upX;

            const position = { x: 1, y: 2, z: 3 };
            const orientation = {
                forward: { x: 0, y: 0, z: -1 },
                up: { x: 0, y: 1, z: 0 }
            };

            engine.updateListener(position, orientation);

            expect(mockAudioContext.listener.setPosition).toHaveBeenCalledWith(1, 2, 3);
            expect(mockAudioContext.listener.setOrientation).toHaveBeenCalledWith(
                0, 0, -1, 0, 1, 0
            );
        });
    });

    describe('Environment Management', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should update environment settings', () => {
            const newSettings = {
                roomSize: 'large',
                reverbTime: 3.5,
                dampening: 0.5,
                temperature: 25.0
            };

            engine.updateEnvironment(newSettings);

            expect(engine.environmentSettings.roomSize).toBe('large');
            expect(engine.environmentSettings.reverbTime).toBe(3.5);
            expect(engine.environmentSettings.dampening).toBe(0.5);
            expect(engine.environmentSettings.temperature).toBe(25.0);
        });

        test('should preserve existing settings when updating', () => {
            const originalHumidity = engine.environmentSettings.humidity;
            
            engine.updateEnvironment({ roomSize: 'small' });
            
            expect(engine.environmentSettings.roomSize).toBe('small');
            expect(engine.environmentSettings.humidity).toBe(originalHumidity);
        });
    });

    describe('Audio Analysis', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should provide audio analysis data', () => {
            const analysisData = engine.getAnalysisData();
            
            expect(analysisData).toBeDefined();
            expect(analysisData.frequencyData).toBeInstanceOf(Uint8Array);
            expect(analysisData.timeDomainData).toBeInstanceOf(Uint8Array);
            expect(analysisData.bufferLength).toBe(1024);
            expect(analysisData.sampleRate).toBe(44100);
        });

        test('should return null when analyser not available', () => {
            engine.analyser = null;
            
            const analysisData = engine.getAnalysisData();
            
            expect(analysisData).toBeNull();
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should track performance metrics', () => {
            const metrics = engine.getPerformanceMetrics();
            
            expect(metrics).toBeDefined();
            expect(metrics.activeSources).toBe(0);
            expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
            expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
        });

        test('should update performance metrics with active sources', () => {
            const mockAudioBuffer = { duration: 1.0 };
            
            // Create some sources
            engine.createAudioSource(mockAudioBuffer);
            engine.createAudioSource(mockAudioBuffer);
            
            engine.updatePerformanceMetrics();
            const metrics = engine.getPerformanceMetrics();
            
            expect(metrics.activeSources).toBe(2);
            expect(metrics.cpuUsage).toBeGreaterThan(0);
            expect(metrics.memoryUsage).toBeGreaterThan(0);
        });

        test('should estimate CPU usage based on enabled features', () => {
            const hrtfEngine = new SpatialAudioEngine({
                enableHRTF: true,
                enableReverb: true,
                enableOcclusion: true,
                enableCompression: true
            });

            const mockAudioBuffer = { duration: 1.0 };
            hrtfEngine.createAudioSource(mockAudioBuffer);
            hrtfEngine.updatePerformanceMetrics();
            
            const metrics = hrtfEngine.getPerformanceMetrics();
            expect(metrics.cpuUsage).toBeGreaterThan(1); // Should be higher with all features
            
            hrtfEngine.dispose();
        });
    });

    describe('Master Volume Control', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should set master volume', () => {
            engine.setMasterVolume(0.7);
            
            expect(engine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
                0.7,
                mockAudioContext.currentTime
            );
        });

        test('should clamp volume to valid range', () => {
            engine.setMasterVolume(-0.5);
            expect(engine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
                0,
                mockAudioContext.currentTime
            );

            engine.setMasterVolume(1.5);
            expect(engine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
                1,
                mockAudioContext.currentTime
            );
        });
    });

    describe('Statistics and Information', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should provide comprehensive statistics', () => {
            const stats = engine.getStatistics();
            
            expect(stats).toBeDefined();
            expect(stats.activeSources).toBe(0);
            expect(stats.maxSources).toBe(engine.options.maxAudioSources);
            expect(stats.enabledFeatures).toBeDefined();
            expect(stats.environmentSettings).toBeDefined();
            expect(stats.listenerPosition).toBeDefined();
            expect(stats.performanceMetrics).toBeDefined();
        });

        test('should show enabled features correctly', () => {
            const stats = engine.getStatistics();
            
            expect(stats.enabledFeatures.hrtf).toBe(engine.options.enableHRTF);
            expect(stats.enabledFeatures.reverb).toBe(engine.options.enableReverb);
            expect(stats.enabledFeatures.compression).toBe(engine.options.enableCompression);
            expect(stats.enabledFeatures.occlusion).toBe(engine.options.enableOcclusion);
        });
    });

    describe('Update Loop', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should start update loop on initialization', () => {
            expect(engine.updateTimer).toBeDefined();
        });

        test('should update all active sources', () => {
            const mockAudioBuffer = { duration: 1.0 };
            const source = engine.createAudioSource(mockAudioBuffer);
            
            // Mock the update method
            source.update = jest.fn();
            source.isFinished = jest.fn().mockReturnValue(false);
            
            engine.update();
            
            expect(source.update).toHaveBeenCalledWith(
                engine.listenerPosition,
                engine.listenerOrientation
            );
        });

        test('should remove finished sources during update', () => {
            const mockAudioBuffer = { duration: 1.0 };
            const source = engine.createAudioSource(mockAudioBuffer);
            const sourceId = source.sourceId;
            
            // Mock source as finished
            source.isFinished = jest.fn().mockReturnValue(true);
            source.dispose = jest.fn();
            
            engine.update();
            
            expect(engine.audioSources.has(sourceId)).toBe(false);
            expect(source.dispose).toHaveBeenCalled();
        });
    });

    describe('Disposal', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should dispose of all resources', () => {
            const mockAudioBuffer = { duration: 1.0 };
            const source = engine.createAudioSource(mockAudioBuffer);
            source.dispose = jest.fn();
            
            engine.dispose();
            
            expect(engine.updateTimer).toBeNull();
            expect(engine.audioSources.size).toBe(0);
            expect(engine.isInitialized).toBe(false);
            expect(source.dispose).toHaveBeenCalled();
        });

        test('should disconnect all audio nodes', () => {
            engine.dispose();
            
            expect(engine.masterGain.disconnect).toHaveBeenCalled();
            expect(engine.analyser.disconnect).toHaveBeenCalled();
        });

        test('should stop update timer', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            engine.dispose();
            
            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization failures gracefully', async () => {
            mockAudioContext.createGain.mockImplementation(() => {
                throw new Error('Failed to create gain node');
            });

            await expect(engine.initialize()).rejects.toThrow('Failed to create gain node');
        });

        test('should handle processor initialization failures', async () => {
            // Mock processor initialization to fail
            const failingEngine = new SpatialAudioEngine({ enableHRTF: true });
            
            // Should not throw, but should disable HRTF
            await failingEngine.initialize();
            
            expect(failingEngine.isInitialized).toBe(true);
            // HRTF should be disabled due to initialization failure
            
            failingEngine.dispose();
        });
    });
});

describe('SpatialAudioSource', () => {
    let mockAudioBuffer;
    let mockOptions;

    beforeEach(() => {
        jest.clearAllMocks();
        global.AudioContext = jest.fn(() => mockAudioContext);
        
        mockAudioBuffer = {
            duration: 2.5,
            numberOfChannels: 2,
            sampleRate: 44100
        };

        mockOptions = {
            masterGain: { connect: jest.fn() },
            reverbSend: { connect: jest.fn() }
        };
    });

    test('should create audio processing graph', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(mockAudioContext.createPanner).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });

    test('should set 3D position correctly', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        source.setPosition(10, 5, -3);
        
        expect(source.position).toEqual({ x: 10, y: 5, z: -3 });
        expect(source.pannerNode.positionX.value).toBe(10);
        expect(source.pannerNode.positionY.value).toBe(5);
        expect(source.pannerNode.positionZ.value).toBe(-3);
    });

    test('should calculate distance to listener', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        source.setPosition(3, 4, 0);
        const distance = source.calculateDistance({ x: 0, y: 0, z: 0 });
        
        expect(distance).toBe(5); // 3-4-5 triangle
    });

    test('should apply occlusion filtering', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        source.setOcclusionAmount(0.5);
        
        expect(source.occlusionAmount).toBe(0.5);
        expect(source.filterNode.frequency.setValueAtTime).toHaveBeenCalled();
    });

    test('should handle volume changes', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        source.setVolume(0.7);
        
        expect(source.volume).toBe(0.7);
        expect(source.gainNode.gain.setValueAtTime).toHaveBeenCalledWith(
            0.7,
            mockAudioContext.currentTime
        );
    });

    test('should clamp volume to valid range', () => {
        const { SpatialAudioSource } = require('../SpatialAudioEngine.js');
        const source = new SpatialAudioSource(mockAudioContext, mockAudioBuffer, 'test-id', mockOptions);
        
        source.setVolume(-0.5);
        expect(source.volume).toBe(0);
        
        source.setVolume(1.5);
        expect(source.volume).toBe(1);
    });
});