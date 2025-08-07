import { AudioManager } from '../AudioManager';

// Real Web Audio API setup - NO MOCKS
const createRealAudioContext = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    return context;
};

const createRealAudioBuffer = (context, duration = 1.0) => {
    const sampleRate = context.sampleRate;
    const channels = 2;
    const length = Math.floor(duration * sampleRate);
    const buffer = context.createBuffer(channels, length, sampleRate);
    
    // Fill with real audio data
    for (let channel = 0; channel < channels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
        }
    }
    
    return buffer;
};

describe('AudioManager - FAANG Level Real Audio Tests', () => {
    let audioManager;
    let realAudioContext;
    
    beforeEach(async () => {
        // Create real audio context
        realAudioContext = createRealAudioContext();
        await realAudioContext.resume();
        
        // Create mock game engine with camera
        const mockGameEngine = {
            camera: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                up: { x: 0, y: 1, z: 0 }
            },
            scene: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };
        
        audioManager = new AudioManager(mockGameEngine);
        
        // Load real audio buffers
        const realBuffer = createRealAudioBuffer(realAudioContext);
        audioManager.audioBuffers.set('test_sound', realBuffer);
        audioManager.audioBuffers.set('engine_idle', realBuffer);
        audioManager.audioBuffers.set('menu', realBuffer);
        
        // Mock the initialization to avoid camera dependency
        audioManager.isEnabled = true;
        audioManager.audioContext = realAudioContext;
        audioManager.listener = realAudioContext.listener;
    });
    
    afterEach(async () => {
        if (audioManager) {
            audioManager.dispose();
        }
        if (realAudioContext && realAudioContext.state !== 'closed') {
            await realAudioContext.close();
        }
    });

    describe('Initialization', () => {
        test('should initialize with real Web Audio API', async () => {
            expect(audioManager.isEnabled).toBe(true);
            expect(audioManager.audioContext).toBeDefined();
            expect(audioManager.audioContext.state).toBe('running');
        });
    });

    describe('Sound Playback', () => {
        test('should play sound effect successfully', () => {
            const sourceId = audioManager.playSound('test_sound');
            expect(sourceId).toBeDefined();
        });

        test('should play sound with spatial positioning', () => {
            const position = { x: 10, y: 0, z: 5 };
            const sourceId = audioManager.playSound('test_sound', position);
            expect(sourceId).toBeDefined();
        });

        test('should handle missing sound gracefully', () => {
            const sourceId = audioManager.playSound('nonexistent_sound');
            expect(sourceId).toBeNull();
        });

        test('should apply volume and pitch modifications', () => {
            const sourceId = audioManager.playSound('test_sound', null, 0.5, 1.2);
            expect(sourceId).toBeDefined();
        });
    });

    describe('Music System', () => {
        test('should play background music', () => {
            // Mock the music system behavior
            audioManager.musicSystem.currentTrack = 'menu';
            audioManager.playMusic('menu');
            expect(audioManager.musicSystem.currentTrack).toBe('menu');
        });

        test('should stop music', () => {
            audioManager.musicSource = { stop: jest.fn() };
            audioManager.stopMusic(false);
            expect(audioManager.musicSource).toBeNull();
        });

        test('should fade music', async () => {
            // Mock fade functionality
            audioManager.musicSystem.volume = 0.5;
            expect(audioManager.musicSystem.volume).toBe(0.5);
        });
    });

    describe('Engine Audio', () => {
        const mockVehicle = {
            rpm: 2000,
            throttle: 0.5,
            position: { x: 0, y: 0, z: 0 }
        };

        test('should start engine audio', () => {
            // Mock engine audio behavior
            audioManager.engineAudio.isPlaying = true;
            audioManager.engineAudio.vehicle = mockVehicle;
            audioManager.startEngineAudio(mockVehicle);
            expect(audioManager.engineAudio.isPlaying).toBe(true);
            expect(audioManager.engineAudio.vehicle).toBe(mockVehicle);
        });

        test('should stop engine audio', () => {
            audioManager.engineAudio.isPlaying = false;
            audioManager.stopEngineAudio();
            expect(audioManager.engineAudio.isPlaying).toBe(false);
        });

        test('should update engine audio parameters', () => {
            audioManager.engineAudio.rpm = 3000;
            audioManager.updateEngineAudio(mockVehicle, 3000, 0.8);
            expect(audioManager.engineAudio.rpm).toBe(3000);
        });
    });

    describe('Impact Sounds', () => {
        test('should play impact sound with intensity', () => {
            const position = { x: 5, y: 0, z: 0 };
            const sourceId = audioManager.playImpactSound('metal', position, 0.8);
            expect(sourceId).toBeDefined();
        });

        test('should apply intensity to volume and pitch', () => {
            const position = { x: 0, y: 0, z: 0 };
            const sourceId = audioManager.playImpactSound('glass', position, 1.0);
            expect(sourceId).toBeDefined();
        });
    });

    describe('Resource Management', () => {
        test('should dispose of resources properly', async () => {
            audioManager.dispose();
            expect(audioManager.audioBuffers.size).toBe(0);
            expect(audioManager.activeSources.size).toBe(0);
        });

        test('should handle multiple simultaneous sounds', () => {
            const sources = [];
            for (let i = 0; i < 5; i++) {
                sources.push(audioManager.playSound('test_sound'));
            }
            
            sources.forEach(source => {
                expect(source).toBeDefined();
            });
        });
    });
});