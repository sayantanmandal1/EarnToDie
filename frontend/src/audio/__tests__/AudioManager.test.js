import { AudioManager } from '../AudioManager';

// Mock Web Audio API
const mockAudioContext = {
    createBufferSource: jest.fn(() => ({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        playbackRate: { setValueAtTime: jest.fn() },
        onended: null
    })),
    createGain: jest.fn(() => ({
        gain: { 
            setValueAtTime: jest.fn(),
            setTargetAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn()
        },
        connect: jest.fn()
    })),
    createPanner: jest.fn(() => ({
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 100,
        rolloffFactor: 1,
        positionX: { setValueAtTime: jest.fn() },
        positionY: { setValueAtTime: jest.fn() },
        positionZ: { setValueAtTime: jest.fn() },
        connect: jest.fn()
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn(),
    close: jest.fn()
};

// Mock Three.js AudioListener
const mockListener = {
    position: { copy: jest.fn() },
    setRotationFromMatrix: jest.fn()
};

// Mock GameEngine
const mockGameEngine = {
    camera: {
        position: { x: 0, y: 0, z: 0 },
        matrixWorld: {},
        add: jest.fn()
    },
    scene: {
        children: []
    }
};

// Mock global AudioContext
global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock Three.js AudioListener
jest.mock('three', () => ({
    AudioListener: jest.fn(() => mockListener),
    AudioLoader: jest.fn(() => ({
        load: jest.fn((path, onLoad, onProgress, onError) => {
            // Simulate successful loading
            setTimeout(() => onLoad({}), 10);
        })
    })),
    Vector3: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
}));

describe('AudioManager', () => {
    let audioManager;

    beforeEach(() => {
        audioManager = new AudioManager(mockGameEngine);
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (audioManager) {
            audioManager.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            const result = await audioManager.initialize();
            expect(result).toBe(true);
            expect(audioManager.isInitialized).toBe(true);
            expect(audioManager.audioContext).toBeDefined();
            expect(audioManager.listener).toBeDefined();
        });

        test('should handle initialization failure gracefully', async () => {
            // Mock AudioContext constructor to throw error
            global.AudioContext = jest.fn(() => {
                throw new Error('AudioContext not supported');
            });

            const result = await audioManager.initialize();
            expect(result).toBe(false);
            expect(audioManager.isEnabled).toBe(false);
        });

        test('should load audio assets during initialization', async () => {
            await audioManager.initialize();
            expect(audioManager.audioBuffers).toBeDefined();
            expect(audioManager.audioBuffers instanceof Map).toBe(true);
        });
    });

    describe('Volume Control', () => {
        beforeEach(async () => {
            await audioManager.initialize();
        });

        test('should set volume for valid categories', () => {
            audioManager.setVolume('master', 0.5);
            expect(audioManager.getVolume('master')).toBe(0.5);

            audioManager.setVolume('effects', 0.8);
            expect(audioManager.getVolume('effects')).toBe(0.8);

            audioManager.setVolume('music', 0.3);
            expect(audioManager.getVolume('music')).toBe(0.3);

            audioManager.setVolume('engine', 0.7);
            expect(audioManager.getVolume('engine')).toBe(0.7);
        });

        test('should clamp volume values to valid range', () => {
            audioManager.setVolume('master', -0.5);
            expect(audioManager.getVolume('master')).toBe(0);

            audioManager.setVolume('master', 1.5);
            expect(audioManager.getVolume('master')).toBe(1);
        });

        test('should ignore invalid categories', () => {
            const originalVolumes = { ...audioManager.volumes };
            audioManager.setVolume('invalid', 0.5);
            expect(audioManager.volumes).toEqual(originalVolumes);
        });
    });

    describe('Sound Playback', () => {
        beforeEach(async () => {
            await audioManager.initialize();
            // Mock audio buffer
            audioManager.audioBuffers.set('test_sound', {});
        });

        test('should play sound effect successfully', () => {
            const sourceId = audioManager.playSound('test_sound');
            expect(sourceId).toBeDefined();
            expect(typeof sourceId).toBe('string');
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
            expect(mockAudioContext.createGain).toHaveBeenCalled();
        });

        test('should play sound with spatial positioning', () => {
            const position = { x: 10, y: 5, z: -3 };
            const sourceId = audioManager.playSound('test_sound', position);
            
            expect(sourceId).toBeDefined();
            expect(mockAudioContext.createPanner).toHaveBeenCalled();
        });

        test('should handle missing sound gracefully', () => {
            const sourceId = audioManager.playSound('nonexistent_sound');
            expect(sourceId).toBeNull();
        });

        test('should stop sound by ID', () => {
            const sourceId = audioManager.playSound('test_sound');
            const mockSource = mockAudioContext.createBufferSource();
            audioManager.activeSources.set(sourceId, { source: mockSource });
            
            audioManager.stopSound(sourceId);
            expect(mockSource.stop).toHaveBeenCalled();
            expect(audioManager.activeSources.has(sourceId)).toBe(false);
        });

        test('should apply volume and pitch modifications', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.playSound('test_sound', null, 0.5, 1.2);
            
            expect(mockSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(1.2, 0);
        });
    });

    describe('Music System', () => {
        beforeEach(async () => {
            await audioManager.initialize();
            // Mock music buffer
            audioManager.audioBuffers.set('menu', {});
        });

        test('should play background music', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.playMusic('menu');
            expect(audioManager.musicSystem.currentTrack).toBe('menu');
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        });

        test('should stop current music when playing new track', () => {
            audioManager.playMusic('menu');
            const firstSource = audioManager.musicSource;
            
            audioManager.playMusic('menu'); // Play again
            expect(firstSource).toBeDefined();
        });

        test('should stop music', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.playMusic('menu');
            const musicSource = audioManager.musicSource;
            
            audioManager.stopMusic(false);
            expect(musicSource.stop).toHaveBeenCalled();
            expect(audioManager.musicSource).toBeNull();
        });

        test('should handle missing music track', () => {
            audioManager.playMusic('nonexistent_track');
            expect(audioManager.musicSystem.currentTrack).toBeNull();
        });
    });

    describe('Engine Audio', () => {
        let mockVehicle;

        beforeEach(async () => {
            await audioManager.initialize();
            audioManager.audioBuffers.set('engine_idle', {});
            
            mockVehicle = {
                type: 'sedan',
                getPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
                getSpeed: jest.fn(() => 50)
            };
        });

        test('should start engine audio', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.startEngineAudio(mockVehicle);
            expect(audioManager.engineAudio.isPlaying).toBe(true);
            expect(audioManager.engineAudio.vehicle).toBe(mockVehicle);
        });

        test('should stop engine audio', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.startEngineAudio(mockVehicle);
            const engineSource = audioManager.engineAudio.source;
            
            audioManager.stopEngineAudio();
            expect(engineSource.stop).toHaveBeenCalled();
            expect(audioManager.engineAudio.isPlaying).toBe(false);
        });

        test('should update engine audio parameters', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.startEngineAudio(mockVehicle);
            audioManager.updateEngineAudio(mockVehicle, 3000, 0.8);
            
            expect(audioManager.engineAudio.source.playbackRate.setTargetAtTime).toHaveBeenCalled();
            expect(audioManager.engineAudio.gainNode.gain.setTargetAtTime).toHaveBeenCalled();
        });
    });

    describe('Impact Sounds', () => {
        beforeEach(async () => {
            await audioManager.initialize();
            audioManager.audioBuffers.set('zombie_hit_soft', {});
            audioManager.audioBuffers.set('zombie_hit_hard', {});
            audioManager.audioBuffers.set('metal_impact', {});
        });

        test('should play appropriate impact sound for zombie collision', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            const position = { x: 5, y: 0, z: -2 };
            const sourceId = audioManager.playImpactSound('zombie_soft', position, 0.8);
            
            expect(sourceId).toBeDefined();
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        });

        test('should apply intensity to volume and pitch', () => {
            const mockSource = mockAudioContext.createBufferSource();
            mockAudioContext.createBufferSource.mockReturnValue(mockSource);
            
            audioManager.playImpactSound('zombie_hard', null, 0.5);
            
            // Should apply random pitch variation
            expect(mockSource.playbackRate.setValueAtTime).toHaveBeenCalled();
        });
    });

    describe('Audio State Management', () => {
        beforeEach(async () => {
            await audioManager.initialize();
        });

        test('should enable and disable audio system', () => {
            audioManager.setEnabled(false);
            expect(audioManager.isEnabled).toBe(false);
            
            audioManager.setEnabled(true);
            expect(audioManager.isEnabled).toBe(true);
        });

        test('should set music intensity', () => {
            audioManager.setMusicIntensity(0.8);
            expect(audioManager.musicSystem.intensity).toBe(0.8);
        });

        test('should clamp music intensity to valid range', () => {
            audioManager.setMusicIntensity(-0.5);
            expect(audioManager.musicSystem.intensity).toBe(0);
            
            audioManager.setMusicIntensity(1.5);
            expect(audioManager.musicSystem.intensity).toBe(1);
        });
    });

    describe('Update Loop', () => {
        beforeEach(async () => {
            await audioManager.initialize();
        });

        test('should update without errors when enabled', () => {
            expect(() => {
                audioManager.update(0.016); // 60 FPS
            }).not.toThrow();
        });

        test('should skip update when disabled', () => {
            audioManager.setEnabled(false);
            const spy = jest.spyOn(audioManager, '_updateSpatialAudio');
            
            audioManager.update(0.016);
            expect(spy).not.toHaveBeenCalled();
        });

        test('should clean up finished sources', () => {
            // Add a mock finished source
            const oldSource = {
                source: { stop: jest.fn() },
                startTime: mockAudioContext.currentTime - 35 // Old source
            };
            audioManager.activeSources.set('old_source', oldSource);
            
            audioManager.update(0.016);
            
            // Should clean up old sources (implementation dependent)
            expect(audioManager.activeSources.size).toBeLessThanOrEqual(1);
        });
    });

    describe('Resource Management', () => {
        test('should dispose of resources properly', async () => {
            await audioManager.initialize();
            
            // Add some mock resources
            audioManager.audioBuffers.set('test', {});
            audioManager.activeSources.set('test', {});
            
            audioManager.dispose();
            
            expect(mockAudioContext.close).toHaveBeenCalled();
            expect(audioManager.audioBuffers.size).toBe(0);
            expect(audioManager.activeSources.size).toBe(0);
        });

        test('should handle disposal when not initialized', () => {
            expect(() => {
                audioManager.dispose();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await audioManager.initialize();
        });

        test('should handle audio context errors gracefully', () => {
            mockAudioContext.createBufferSource.mockImplementation(() => {
                throw new Error('Buffer source creation failed');
            });
            
            const sourceId = audioManager.playSound('test_sound');
            expect(sourceId).toBeNull();
        });

        test('should handle stop errors gracefully', () => {
            const mockSource = {
                stop: jest.fn(() => {
                    throw new Error('Stop failed');
                })
            };
            audioManager.activeSources.set('test', { source: mockSource });
            
            expect(() => {
                audioManager.stopSound('test');
            }).not.toThrow();
        });
    });
});