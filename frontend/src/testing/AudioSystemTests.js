/**
 * Audio System Test Suite
 * Comprehensive tests for audio engine components with mock audio context
 */
import SpatialAudioEngine from '../audio/SpatialAudioEngine.js';
import AudioManagementSystem from '../audio/AudioManagementSystem.js';
import AudioAssetIntegration from '../audio/AudioAssetIntegration.js';

describe('Audio System Tests', () => {
    let mockAudioContext;
    let spatialAudioEngine;
    let audioManager;

    beforeEach(() => {
        // Create mock audio context
        mockAudioContext = global.testUtils.createMock('audioContext');
        
        // Mock global AudioContext
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = global.AudioContext;
        
        // Initialize audio systems
        spatialAudioEngine = new SpatialAudioEngine({
            enableHRTF: true,
            maxDistance: 100,
            rolloffFactor: 1,
            dopplerFactor: 1
        });
        
        audioManager = new AudioManagementSystem({
            masterVolume: 1.0,
            enableSpatialAudio: true,
            maxConcurrentSounds: 32
        });
    });

    afterEach(() => {
        if (spatialAudioEngine) {
            spatialAudioEngine.destroy();
        }
        if (audioManager) {
            audioManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Spatial Audio Engine', () => {
        test('should initialize with mock audio context', () => {
            expect(spatialAudioEngine.audioContext).toBeDefined();
            expect(spatialAudioEngine.listener).toBeDefined();
            expect(spatialAudioEngine.config.enableHRTF).toBe(true);
        });

        test('should create spatial audio source', () => {
            const audioBuffer = new ArrayBuffer(1024);
            const source = spatialAudioEngine.createSpatialSource(audioBuffer, {
                position: { x: 10, y: 0, z: 5 },
                volume: 0.8,
                loop: false
            });

            expect(source).toBeDefined();
            expect(source.position).toEqual({ x: 10, y: 0, z: 5 });
            expect(source.volume).toBe(0.8);
            expect(mockAudioContext.createPanner).toHaveBeenCalled();
        });

        test('should update listener position and orientation', () => {
            const position = { x: 5, y: 2, z: -3 };
            const orientation = { 
                forward: { x: 0, y: 0, z: -1 },
                up: { x: 0, y: 1, z: 0 }
            };

            spatialAudioEngine.updateListener(position, orientation);

            expect(spatialAudioEngine.listener.position).toEqual(position);
            expect(spatialAudioEngine.listener.orientation).toEqual(orientation);
        });

        test('should calculate distance attenuation correctly', () => {
            const sourcePosition = { x: 0, y: 0, z: 0 };
            const listenerPosition = { x: 10, y: 0, z: 0 };
            
            const attenuation = spatialAudioEngine.calculateDistanceAttenuation(
                sourcePosition, 
                listenerPosition,
                100 // maxDistance
            );

            expect(attenuation).toBeGreaterThan(0);
            expect(attenuation).toBeLessThanOrEqual(1);
            
            // Closer sources should have higher attenuation
            const closerAttenuation = spatialAudioEngine.calculateDistanceAttenuation(
                sourcePosition,
                { x: 5, y: 0, z: 0 },
                100
            );
            
            expect(closerAttenuation).toBeGreaterThan(attenuation);
        });

        test('should handle Doppler effect calculation', () => {
            const sourceVelocity = { x: 10, y: 0, z: 0 }; // Moving towards listener
            const listenerVelocity = { x: 0, y: 0, z: 0 }; // Stationary
            const soundSpeed = 343; // m/s

            const dopplerShift = spatialAudioEngine.calculateDopplerShift(
                sourceVelocity,
                listenerVelocity,
                soundSpeed
            );

            expect(dopplerShift).toBeGreaterThan(1); // Higher frequency when approaching
            
            // Test moving away
            const awayVelocity = { x: -10, y: 0, z: 0 };
            const awayShift = spatialAudioEngine.calculateDopplerShift(
                awayVelocity,
                listenerVelocity,
                soundSpeed
            );
            
            expect(awayShift).toBeLessThan(1); // Lower frequency when moving away
        });

        test('should manage multiple spatial sources', () => {
            const sources = [];
            
            // Create multiple sources
            for (let i = 0; i < 5; i++) {
                const audioBuffer = new ArrayBuffer(1024);
                const source = spatialAudioEngine.createSpatialSource(audioBuffer, {
                    position: { x: i * 10, y: 0, z: 0 },
                    volume: 0.5
                });
                sources.push(source);
            }

            expect(spatialAudioEngine.activeSources.size).toBe(5);
            
            // Update all source positions
            sources.forEach((source, index) => {
                spatialAudioEngine.updateSourcePosition(source.id, {
                    x: index * 10 + 5,
                    y: 1,
                    z: 0
                });
            });

            // Verify positions were updated
            sources.forEach((source, index) => {
                const updatedSource = spatialAudioEngine.getSource(source.id);
                expect(updatedSource.position.x).toBe(index * 10 + 5);
                expect(updatedSource.position.y).toBe(1);
            });
        });

        test('should handle audio occlusion', () => {
            const sourcePosition = { x: 10, y: 0, z: 0 };
            const listenerPosition = { x: 0, y: 0, z: 0 };
            const obstacles = [
                {
                    position: { x: 5, y: 0, z: 0 },
                    size: { x: 2, y: 3, z: 2 },
                    material: 'concrete' // High occlusion
                }
            ];

            const occlusion = spatialAudioEngine.calculateOcclusion(
                sourcePosition,
                listenerPosition,
                obstacles
            );

            expect(occlusion).toBeGreaterThan(0);
            expect(occlusion).toBeLessThanOrEqual(1);
            
            // Test without obstacles
            const noOcclusion = spatialAudioEngine.calculateOcclusion(
                sourcePosition,
                listenerPosition,
                []
            );
            
            expect(noOcclusion).toBe(0); // No occlusion without obstacles
        });
    });

    describe('Audio Management System', () => {
        test('should initialize with correct configuration', () => {
            expect(audioManager.config.masterVolume).toBe(1.0);
            expect(audioManager.config.enableSpatialAudio).toBe(true);
            expect(audioManager.config.maxConcurrentSounds).toBe(32);
        });

        test('should load and manage audio assets', async () => {
            const mockAudioData = new ArrayBuffer(2048);
            const assetId = 'engine_sound';
            
            // Mock fetch for audio loading
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(mockAudioData)
            });

            const result = await audioManager.loadAudioAsset(assetId, '/audio/engine.mp3');
            
            expect(result.success).toBe(true);
            expect(audioManager.audioAssets.has(assetId)).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith('/audio/engine.mp3');
        });

        test('should play audio with volume control', async () => {
            const mockAudioData = new ArrayBuffer(2048);
            const assetId = 'test_sound';
            
            // Load audio asset
            audioManager.audioAssets.set(assetId, {
                buffer: mockAudioData,
                duration: 2.5,
                channels: 2,
                sampleRate: 44100
            });

            const playResult = await audioManager.playSound(assetId, {
                volume: 0.7,
                loop: false,
                fadeIn: 0.5
            });

            expect(playResult.success).toBe(true);
            expect(playResult.soundId).toBeDefined();
            expect(audioManager.activeSounds.has(playResult.soundId)).toBe(true);
            
            // Verify audio context methods were called
            expect(mockAudioContext.createGain).toHaveBeenCalled();
        });

        test('should handle concurrent sound limit', async () => {
            const mockAudioData = new ArrayBuffer(1024);
            const assetId = 'test_sound';
            
            audioManager.audioAssets.set(assetId, {
                buffer: mockAudioData,
                duration: 1.0,
                channels: 1,
                sampleRate: 44100
            });

            // Try to play more sounds than the limit
            const playPromises = [];
            for (let i = 0; i < 35; i++) { // Exceeds maxConcurrentSounds (32)
                playPromises.push(audioManager.playSound(assetId, { volume: 0.1 }));
            }

            const results = await Promise.all(playPromises);
            
            // Should have exactly maxConcurrentSounds active
            expect(audioManager.activeSounds.size).toBeLessThanOrEqual(32);
            
            // Some sounds should have been rejected or oldest ones stopped
            const successfulSounds = results.filter(r => r.success).length;
            expect(successfulSounds).toBeLessThanOrEqual(32);
        });

        test('should apply audio effects', () => {
            const mockGainNode = mockAudioContext.createGain();
            const mockFilterNode = mockAudioContext.createBiquadFilter();
            
            mockAudioContext.createBiquadFilter = jest.fn(() => mockFilterNode);
            
            const effects = {
                lowpass: { frequency: 1000, Q: 1 },
                highpass: { frequency: 200, Q: 0.7 },
                reverb: { roomSize: 0.8, damping: 0.5 }
            };

            const effectChain = audioManager.createEffectChain(effects);
            
            expect(effectChain).toBeDefined();
            expect(effectChain.length).toBeGreaterThan(0);
            expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
        });

        test('should handle audio streaming', async () => {
            const streamUrl = 'https://example.com/stream.mp3';
            
            // Mock MediaSource API
            global.MediaSource = jest.fn().mockImplementation(() => ({
                addSourceBuffer: jest.fn().mockReturnValue({
                    appendBuffer: jest.fn(),
                    addEventListener: jest.fn()
                }),
                endOfStream: jest.fn(),
                readyState: 'open'
            }));

            const streamResult = await audioManager.createAudioStream(streamUrl, {
                bufferSize: 4096,
                preloadTime: 2.0
            });

            expect(streamResult.success).toBe(true);
            expect(streamResult.streamId).toBeDefined();
        });

        test('should measure audio performance', async () => {
            const { result, executionTime, memoryDelta } = await global.testUtils.measurePerformance(async () => {
                const mockAudioData = new ArrayBuffer(1024);
                const results = [];
                
                // Simulate loading and playing multiple sounds
                for (let i = 0; i < 10; i++) {
                    audioManager.audioAssets.set(`sound_${i}`, {
                        buffer: mockAudioData,
                        duration: 1.0,
                        channels: 1,
                        sampleRate: 44100
                    });
                    
                    const playResult = await audioManager.playSound(`sound_${i}`, {
                        volume: 0.5
                    });
                    results.push(playResult);
                }
                
                return results;
            });

            expect(executionTime).toBeLessThan(100); // Should complete quickly
            expect(result).toHaveLength(10);
            expect(result.every(r => r.success)).toBe(true);
        });
    });

    describe('Audio Asset Integration', () => {
        let audioAssetIntegration;

        beforeEach(() => {
            audioAssetIntegration = new AudioAssetIntegration({
                baseUrl: '/audio/',
                enableCompression: true,
                enableCaching: true
            });
        });

        afterEach(() => {
            if (audioAssetIntegration) {
                audioAssetIntegration.destroy();
            }
        });

        test('should load audio assets with proper format detection', async () => {
            const assetConfigs = [
                { id: 'engine', url: 'engine.mp3', type: 'sfx' },
                { id: 'music', url: 'background.ogg', type: 'music' },
                { id: 'voice', url: 'narrator.wav', type: 'voice' }
            ];

            // Mock different audio formats
            global.fetch = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'audio/mpeg' },
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
                })
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'audio/ogg' },
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048))
                })
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'audio/wav' },
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(4096))
                });

            const results = await audioAssetIntegration.loadAssets(assetConfigs);
            
            expect(results.success).toBe(true);
            expect(results.loadedAssets).toHaveLength(3);
            
            // Verify format detection
            const engineAsset = results.loadedAssets.find(a => a.id === 'engine');
            expect(engineAsset.format).toBe('mp3');
            
            const musicAsset = results.loadedAssets.find(a => a.id === 'music');
            expect(musicAsset.format).toBe('ogg');
        });

        test('should handle audio compression', async () => {
            const originalData = new ArrayBuffer(10000); // 10KB
            
            const compressedResult = await audioAssetIntegration.compressAudio(originalData, {
                quality: 0.8,
                format: 'mp3'
            });

            expect(compressedResult.success).toBe(true);
            expect(compressedResult.compressedData.byteLength).toBeLessThan(originalData.byteLength);
            expect(compressedResult.compressionRatio).toBeGreaterThan(0);
        });

        test('should validate audio asset integrity', async () => {
            const validAudioData = new ArrayBuffer(1024);
            const invalidAudioData = new ArrayBuffer(0); // Empty buffer
            
            const validResult = await audioAssetIntegration.validateAudioAsset(validAudioData, {
                expectedFormat: 'mp3',
                minSize: 512,
                maxSize: 2048
            });
            
            expect(validResult.valid).toBe(true);
            
            const invalidResult = await audioAssetIntegration.validateAudioAsset(invalidAudioData, {
                expectedFormat: 'mp3',
                minSize: 512,
                maxSize: 2048
            });
            
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.errors).toContain('Audio data too small');
        });

        test('should handle audio caching', async () => {
            const assetId = 'cached_sound';
            const audioData = new ArrayBuffer(1024);
            
            // Cache audio asset
            await audioAssetIntegration.cacheAudioAsset(assetId, audioData, {
                ttl: 3600000, // 1 hour
                compress: true
            });

            // Retrieve from cache
            const cachedData = await audioAssetIntegration.getCachedAudioAsset(assetId);
            
            expect(cachedData).toBeDefined();
            expect(cachedData.byteLength).toBeGreaterThan(0);
        });
    });

    describe('Audio Performance Tests', () => {
        test('should handle real-time audio processing', async () => {
            const bufferSize = 1024;
            const sampleRate = 44100;
            const channels = 2;
            
            // Mock ScriptProcessorNode
            const mockProcessor = {
                onaudioprocess: null,
                connect: jest.fn(),
                disconnect: jest.fn()
            };
            
            mockAudioContext.createScriptProcessor = jest.fn(() => mockProcessor);
            
            const processor = audioManager.createAudioProcessor({
                bufferSize,
                inputChannels: channels,
                outputChannels: channels
            });

            expect(processor).toBeDefined();
            expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(
                bufferSize, channels, channels
            );

            // Simulate audio processing
            const inputBuffer = new Float32Array(bufferSize);
            const outputBuffer = new Float32Array(bufferSize);
            
            // Fill input with test signal
            for (let i = 0; i < bufferSize; i++) {
                inputBuffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate); // 440Hz sine wave
            }

            const { executionTime } = await global.testUtils.measurePerformance(() => {
                // Simulate audio processing callback
                if (mockProcessor.onaudioprocess) {
                    mockProcessor.onaudioprocess({
                        inputBuffer: { getChannelData: () => inputBuffer },
                        outputBuffer: { getChannelData: () => outputBuffer }
                    });
                }
            });

            // Audio processing should be very fast (sub-millisecond)
            expect(executionTime).toBeLessThan(1);
        });

        test('should maintain low latency', async () => {
            const latencyMeasurements = [];
            
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                
                // Simulate audio playback request
                const mockAudioData = new ArrayBuffer(1024);
                audioManager.audioAssets.set('latency_test', {
                    buffer: mockAudioData,
                    duration: 0.1,
                    channels: 1,
                    sampleRate: 44100
                });

                await audioManager.playSound('latency_test', { volume: 0.1 });
                
                const endTime = performance.now();
                latencyMeasurements.push(endTime - startTime);
            }

            const averageLatency = latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / latencyMeasurements.length;
            const maxLatency = Math.max(...latencyMeasurements);

            // Audio latency should be minimal
            expect(averageLatency).toBeLessThan(10); // 10ms average
            expect(maxLatency).toBeLessThan(20); // 20ms maximum
        });

        test('should handle memory efficiently with large audio files', async () => {
            const largeSizes = [1024 * 1024, 2 * 1024 * 1024, 5 * 1024 * 1024]; // 1MB, 2MB, 5MB
            const memoryUsages = [];

            for (const size of largeSizes) {
                const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                // Create large audio buffer
                const largeAudioData = new ArrayBuffer(size);
                audioManager.audioAssets.set(`large_audio_${size}`, {
                    buffer: largeAudioData,
                    duration: 10.0,
                    channels: 2,
                    sampleRate: 44100
                });

                const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                memoryUsages.push(finalMemory - initialMemory);
                
                // Cleanup
                audioManager.audioAssets.delete(`large_audio_${size}`);
            }

            // Memory usage should scale reasonably with file size
            expect(memoryUsages[1]).toBeGreaterThan(memoryUsages[0]);
            expect(memoryUsages[2]).toBeGreaterThan(memoryUsages[1]);
            
            // But shouldn't be excessive (allow for some overhead)
            expect(memoryUsages[0]).toBeLessThan(largeSizes[0] * 2);
            expect(memoryUsages[1]).toBeLessThan(largeSizes[1] * 2);
        });
    });

    describe('Audio Context State Management', () => {
        test('should handle audio context suspension and resumption', async () => {
            expect(mockAudioContext.state).toBe('running');
            
            // Suspend audio context
            await audioManager.suspendAudio();
            expect(mockAudioContext.suspend).toHaveBeenCalled();
            
            // Resume audio context
            await audioManager.resumeAudio();
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        test('should handle audio context creation failure', () => {
            // Mock AudioContext constructor to throw
            global.AudioContext = jest.fn(() => {
                throw new Error('AudioContext not supported');
            });

            expect(() => {
                new SpatialAudioEngine();
            }).toThrow('AudioContext not supported');
        });

        test('should gracefully degrade without Web Audio API', () => {
            // Remove AudioContext
            delete global.AudioContext;
            delete global.webkitAudioContext;

            const fallbackAudioManager = new AudioManagementSystem({
                enableFallback: true
            });

            expect(fallbackAudioManager.audioContext).toBeNull();
            expect(fallbackAudioManager.fallbackMode).toBe(true);
            
            // Should still be able to "play" sounds (silently)
            const playResult = fallbackAudioManager.playSound('test', { volume: 0.5 });
            expect(playResult.success).toBe(true);
        });
    });
});

export default {
    name: 'Audio System Tests',
    description: 'Comprehensive audio engine testing with mock audio context',
    category: 'audio',
    priority: 'high'
};