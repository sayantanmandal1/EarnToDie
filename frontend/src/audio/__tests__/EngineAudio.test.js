import { EngineAudio } from '../EngineAudio';

// Mock AudioManager
const mockAudioManager = {
    audioContext: {
        createOscillator: jest.fn(() => ({
            type: 'sawtooth',
            frequency: { setValueAtTime: jest.fn(), setTargetAtTime: jest.fn() },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn()
        })),
        createGain: jest.fn(() => ({
            gain: { 
                setValueAtTime: jest.fn(),
                setTargetAtTime: jest.fn(),
                linearRampToValueAtTime: jest.fn()
            },
            connect: jest.fn(),
            _oscillator: null,
            _noiseSource: null,
            _noiseGain: null
        })),
        createBufferSource: jest.fn(() => ({
            buffer: null,
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            loop: false
        })),
        createBuffer: jest.fn(() => ({
            getChannelData: jest.fn(() => new Float32Array(1024))
        })),
        createBiquadFilter: jest.fn(() => ({
            type: 'lowpass',
            frequency: { setValueAtTime: jest.fn(), setTargetAtTime: jest.fn() },
            Q: { setValueAtTime: jest.fn() },
            connect: jest.fn()
        })),
        createDynamicsCompressor: jest.fn(() => ({
            threshold: { setValueAtTime: jest.fn() },
            knee: { setValueAtTime: jest.fn() },
            ratio: { setValueAtTime: jest.fn() },
            attack: { setValueAtTime: jest.fn() },
            release: { setValueAtTime: jest.fn() },
            connect: jest.fn()
        })),
        destination: {},
        currentTime: 0,
        sampleRate: 44100
    },
    audioBuffers: new Map([
        ['engine_start', {}],
        ['engine_idle', {}]
    ]),
    volumes: {
        engine: 1.0,
        master: 1.0
    }
};

// Mock Vehicle
const mockVehicle = {
    type: 'sedan',
    getPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getSpeed: jest.fn(() => 50),
    controls: {
        forward: 0.5,
        backward: 0,
        left: 0,
        right: 0
    }
};

describe('EngineAudio', () => {
    let engineAudio;

    beforeEach(() => {
        engineAudio = new EngineAudio(mockAudioManager);
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (engineAudio) {
            engineAudio.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            const result = await engineAudio.initialize();
            expect(result).toBe(true);
            expect(engineAudio.processingNodes.masterGain).toBeDefined();
            expect(engineAudio.processingNodes.lowPassFilter).toBeDefined();
            expect(engineAudio.processingNodes.compressor).toBeDefined();
        });

        test('should handle initialization failure', async () => {
            engineAudio.audioContext = null;
            const result = await engineAudio.initialize();
            expect(result).toBe(false);
        });

        test('should create processing chain correctly', async () => {
            await engineAudio.initialize();
            
            expect(mockAudioManager.audioContext.createGain).toHaveBeenCalled();
            expect(mockAudioManager.audioContext.createBiquadFilter).toHaveBeenCalledTimes(2); // Low and high pass
            expect(mockAudioManager.audioContext.createDynamicsCompressor).toHaveBeenCalled();
        });
    });

    describe('Engine Control', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
        });

        test('should start engine successfully', async () => {
            const result = await engineAudio.startEngine(mockVehicle);
            
            expect(result).toBe(true);
            expect(engineAudio.isActive).toBe(true);
            expect(engineAudio.currentVehicle).toBe(mockVehicle);
            expect(engineAudio.engineState.isStarting).toBe(true);
        });

        test('should not start engine if already active', async () => {
            engineAudio.isActive = true;
            const result = await engineAudio.startEngine(mockVehicle);
            
            expect(result).toBe(false);
        });

        test('should stop engine successfully', async () => {
            await engineAudio.startEngine(mockVehicle);
            await engineAudio.stopEngine();
            
            expect(engineAudio.isActive).toBe(false);
            expect(engineAudio.engineState.isRunning).toBe(false);
            expect(engineAudio.currentVehicle).toBeNull();
        });

        test('should handle stop when not active', async () => {
            expect(() => engineAudio.stopEngine()).not.toThrow();
        });
    });

    describe('Engine Parameters', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            // Simulate engine running
            engineAudio.engineState.isRunning = true;
        });

        test('should set throttle correctly', () => {
            engineAudio.setThrottle(0.8);
            expect(engineAudio.engineState.throttle).toBe(0.8);
        });

        test('should clamp throttle to valid range', () => {
            engineAudio.setThrottle(-0.5);
            expect(engineAudio.engineState.throttle).toBe(0);
            
            engineAudio.setThrottle(1.5);
            expect(engineAudio.engineState.throttle).toBe(1);
        });

        test('should set engine load correctly', () => {
            engineAudio.setLoad(0.6);
            expect(engineAudio.engineState.load).toBe(0.6);
        });

        test('should shift gear correctly', () => {
            engineAudio.shiftGear(3);
            expect(engineAudio.engineState.gear).toBe(3);
        });

        test('should trigger backfire effect', () => {
            engineAudio.triggerBackfire();
            expect(engineAudio.mixLevels.backfire).toBe(1.0);
        });
    });

    describe('Audio Update', () => {
        const mockVehicleState = {
            speed: 60,
            controls: { forward: 0.7, backward: 0 },
            rpm: 3000
        };

        beforeEach(async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            engineAudio.engineState.isRunning = true;
        });

        test('should update engine audio parameters', () => {
            engineAudio.update(0.016, mockVehicleState);
            
            expect(engineAudio.engineState.rpm).toBeGreaterThan(0);
            expect(engineAudio.mixLevels.idle).toBeDefined();
            expect(engineAudio.mixLevels.rev).toBeDefined();
        });

        test('should skip update when not active', () => {
            engineAudio.isActive = false;
            
            expect(() => {
                engineAudio.update(0.016, mockVehicleState);
            }).not.toThrow();
        });

        test('should skip update when not running', () => {
            engineAudio.engineState.isRunning = false;
            
            expect(() => {
                engineAudio.update(0.016, mockVehicleState);
            }).not.toThrow();
        });

        test('should throttle updates based on interval', () => {
            const spy = jest.spyOn(engineAudio, '_updateEngineParameters');
            
            // Call update multiple times quickly
            engineAudio.update(0.001, mockVehicleState);
            engineAudio.update(0.001, mockVehicleState);
            
            // Should only update once due to throttling
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('Engine Profiles', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
        });

        test('should use correct profile for sedan', async () => {
            const sedanVehicle = { ...mockVehicle, type: 'sedan' };
            await engineAudio.startEngine(sedanVehicle);
            
            const profile = engineAudio.engineProfiles.sedan;
            expect(profile).toBeDefined();
            expect(profile.baseFreq).toBe(80);
        });

        test('should use correct profile for sports car', async () => {
            const sportsVehicle = { ...mockVehicle, type: 'sports_car' };
            await engineAudio.startEngine(sportsVehicle);
            
            const profile = engineAudio.engineProfiles.sports_car;
            expect(profile).toBeDefined();
            expect(profile.baseFreq).toBe(120);
        });

        test('should fallback to sedan profile for unknown vehicle', async () => {
            const unknownVehicle = { ...mockVehicle, type: 'unknown_type' };
            await engineAudio.startEngine(unknownVehicle);
            
            // Should not throw error and use sedan as fallback
            expect(engineAudio.isActive).toBe(true);
        });
    });

    describe('Audio Mixing', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            engineAudio.engineState.isRunning = true;
        });

        test('should calculate mix levels based on RPM', () => {
            engineAudio.engineState.rpm = 3000;
            engineAudio.engineState.throttle = 0.8;
            
            engineAudio._updateAudioMixing(0.016);
            
            expect(engineAudio.mixLevels.idle).toBeLessThan(1.0);
            expect(engineAudio.mixLevels.rev).toBeGreaterThan(0);
        });

        test('should adjust idle mix with RPM', () => {
            // Low RPM should have high idle mix
            engineAudio.engineState.rpm = 800;
            engineAudio._updateAudioMixing(0.016);
            const lowRpmIdleMix = engineAudio.mixLevels.idle;
            
            // High RPM should have low idle mix
            engineAudio.engineState.rpm = 5000;
            engineAudio._updateAudioMixing(0.016);
            const highRpmIdleMix = engineAudio.mixLevels.idle;
            
            expect(lowRpmIdleMix).toBeGreaterThan(highRpmIdleMix);
        });

        test('should adjust rev mix with throttle', () => {
            // No throttle should have no rev mix
            engineAudio.engineState.throttle = 0;
            engineAudio._updateAudioMixing(0.016);
            const noThrottleRevMix = engineAudio.mixLevels.rev;
            
            // Full throttle should have high rev mix
            engineAudio.engineState.throttle = 1.0;
            engineAudio.engineState.rpm = 5000;
            engineAudio._updateAudioMixing(0.016);
            const fullThrottleRevMix = engineAudio.mixLevels.rev;
            
            expect(fullThrottleRevMix).toBeGreaterThan(noThrottleRevMix);
        });
    });

    describe('Audio Effects', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            engineAudio.engineState.isRunning = true;
        });

        test('should update filter frequencies based on RPM', () => {
            engineAudio.engineState.rpm = 4000;
            engineAudio._updateAudioEffects();
            
            expect(engineAudio.processingNodes.lowPassFilter.frequency.setTargetAtTime).toHaveBeenCalled();
        });

        test('should update oscillator frequencies', () => {
            // Mock engine nodes
            engineAudio.engineNodes.idle = {
                _oscillator: {
                    frequency: { setTargetAtTime: jest.fn() }
                }
            };
            
            engineAudio.engineState.rpm = 3000;
            engineAudio._updateAudioEffects();
            
            expect(engineAudio.engineNodes.idle._oscillator.frequency.setTargetAtTime).toHaveBeenCalled();
        });
    });

    describe('Volume Control', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
        });

        test('should set volume correctly', () => {
            engineAudio.setVolume(0.5);
            
            expect(engineAudio.processingNodes.masterGain.gain.setTargetAtTime).toHaveBeenCalledWith(
                expect.any(Number),
                0,
                0.1
            );
        });

        test('should handle volume setting when not initialized', () => {
            engineAudio.processingNodes.masterGain = null;
            
            expect(() => {
                engineAudio.setVolume(0.5);
            }).not.toThrow();
        });
    });

    describe('Noise Generation', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
        });

        test('should create noise buffer successfully', () => {
            const noiseBuffer = engineAudio._createNoiseBuffer();
            
            expect(noiseBuffer).toBeDefined();
            expect(mockAudioManager.audioContext.createBuffer).toHaveBeenCalled();
        });

        test('should create click buffer for gear shifts', () => {
            const clickBuffer = engineAudio._createClickBuffer();
            
            expect(clickBuffer).toBeDefined();
            expect(mockAudioManager.audioContext.createBuffer).toHaveBeenCalled();
        });
    });

    describe('Resource Management', () => {
        test('should dispose of resources properly', async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            
            engineAudio.dispose();
            
            expect(engineAudio.isActive).toBe(false);
            expect(engineAudio.processingNodes.masterGain).toBeNull();
        });

        test('should stop all engine nodes on disposal', async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            
            // Mock engine nodes
            const mockOscillator = { stop: jest.fn() };
            const mockNoiseSource = { stop: jest.fn() };
            
            engineAudio.engineNodes.idle = {
                _oscillator: mockOscillator,
                _noiseSource: mockNoiseSource
            };
            
            engineAudio._stopAllEngineNodes();
            
            expect(mockOscillator.stop).toHaveBeenCalled();
            expect(mockNoiseSource.stop).toHaveBeenCalled();
        });

        test('should handle disposal errors gracefully', async () => {
            await engineAudio.initialize();
            
            // Mock nodes that throw on disconnect
            engineAudio.processingNodes.masterGain = {
                disconnect: jest.fn(() => {
                    throw new Error('Disconnect failed');
                })
            };
            
            expect(() => {
                engineAudio._disposeProcessingChain();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle startup sound loading failure', async () => {
            await engineAudio.initialize();
            mockAudioManager.audioBuffers.delete('engine_start');
            
            expect(() => {
                engineAudio._playStartupSound(engineAudio.engineProfiles.sedan);
            }).not.toThrow();
        });

        test('should handle oscillator creation failure', async () => {
            await engineAudio.initialize();
            
            mockAudioManager.audioContext.createOscillator.mockImplementation(() => {
                throw new Error('Oscillator creation failed');
            });
            
            expect(() => {
                engineAudio._createEngineOscillator(100, 'idle');
            }).toThrow();
        });

        test('should handle node stop errors gracefully', async () => {
            await engineAudio.initialize();
            
            const mockNode = {
                _oscillator: {
                    stop: jest.fn(() => {
                        throw new Error('Stop failed');
                    })
                },
                _noiseSource: {
                    stop: jest.fn(() => {
                        throw new Error('Stop failed');
                    })
                }
            };
            
            engineAudio.engineNodes.idle = mockNode;
            
            expect(() => {
                engineAudio._stopAllEngineNodes();
            }).not.toThrow();
        });
    });

    describe('Performance', () => {
        beforeEach(async () => {
            await engineAudio.initialize();
            await engineAudio.startEngine(mockVehicle);
            engineAudio.engineState.isRunning = true;
        });

        test('should throttle updates for performance', () => {
            const startTime = performance.now();
            engineAudio.lastUpdateTime = startTime;
            
            // Call update immediately after
            engineAudio.update(0.001, {});
            
            // Should skip update due to throttling
            expect(engineAudio.lastUpdateTime).toBe(startTime);
        });

        test('should update when enough time has passed', () => {
            const oldTime = performance.now() - 100; // 100ms ago
            engineAudio.lastUpdateTime = oldTime;
            
            // Mock performance.now to return a time that's definitely later
            const mockNow = jest.spyOn(performance, 'now').mockReturnValue(oldTime + 200);
            
            engineAudio.update(0.016, { speed: 50, controls: { forward: 0.5 } });
            
            // Should update since enough time has passed
            expect(engineAudio.lastUpdateTime).toBeGreaterThan(oldTime);
            
            mockNow.mockRestore();
        });
    });
});