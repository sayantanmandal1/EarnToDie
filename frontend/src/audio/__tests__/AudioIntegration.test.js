import { AudioIntegration } from '../AudioIntegration';

// Mock dependencies
jest.mock('../AudioManager');
jest.mock('../SpatialAudio');
jest.mock('../EngineAudio');

import { AudioManager } from '../AudioManager';
import { SpatialAudio } from '../SpatialAudio';
import { EngineAudio } from '../EngineAudio';

// Mock GameEngine
const mockGameEngine = {
    camera: {
        position: { x: 0, y: 0, z: 0 }
    },
    scene: {
        children: []
    }
};

// Mock Vehicle
const mockVehicle = {
    type: 'sedan',
    getPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getSpeed: jest.fn(() => 50),
    getVelocity: jest.fn(() => ({ x: 5, y: 0, z: 0 })),
    controls: {
        forward: 0.5,
        backward: 0,
        left: 0,
        right: 0
    }
};

// Mock Zombie
const mockZombie = {
    getPosition: jest.fn(() => ({ x: 10, y: 0, z: 5 }))
};

describe('AudioIntegration', () => {
    let audioIntegration;
    let mockAudioManager;
    let mockSpatialAudio;
    let mockEngineAudio;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create mock instances
        mockAudioManager = {
            initialize: jest.fn().mockResolvedValue(true),
            update: jest.fn(),
            playMusic: jest.fn(),
            setMusicIntensity: jest.fn(),
            setVolume: jest.fn(),
            getVolume: jest.fn().mockReturnValue(1.0),
            playImpactSound: jest.fn(),
            playSound: jest.fn(),
            startEngineAudio: jest.fn(),
            stopEngineAudio: jest.fn(),
            updateEngineAudio: jest.fn(),
            dispose: jest.fn()
        };
        
        mockSpatialAudio = {
            initialize: jest.fn(),
            update: jest.fn(),
            dispose: jest.fn()
        };
        
        mockEngineAudio = {
            initialize: jest.fn().mockResolvedValue(true),
            update: jest.fn(),
            startEngine: jest.fn(),
            stopEngine: jest.fn(),
            setThrottle: jest.fn(),
            triggerBackfire: jest.fn(),
            dispose: jest.fn(),
            isActive: false
        };
        
        // Mock constructors
        AudioManager.mockImplementation(() => mockAudioManager);
        SpatialAudio.mockImplementation(() => mockSpatialAudio);
        EngineAudio.mockImplementation(() => mockEngineAudio);
        
        audioIntegration = new AudioIntegration(mockGameEngine);
    });

    afterEach(() => {
        if (audioIntegration) {
            audioIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            const result = await audioIntegration.initialize();
            
            expect(result).toBe(true);
            expect(audioIntegration.isInitialized).toBe(true);
            expect(AudioManager).toHaveBeenCalledWith(mockGameEngine);
            expect(SpatialAudio).toHaveBeenCalledWith(mockAudioManager);
            expect(EngineAudio).toHaveBeenCalledWith(mockAudioManager);
            expect(mockAudioManager.initialize).toHaveBeenCalled();
            expect(mockSpatialAudio.initialize).toHaveBeenCalledWith(mockGameEngine);
            expect(mockEngineAudio.initialize).toHaveBeenCalled();
            expect(mockAudioManager.playMusic).toHaveBeenCalledWith('menu');
        });

        test('should handle initialization failure', async () => {
            mockAudioManager.initialize.mockResolvedValue(false);
            
            const result = await audioIntegration.initialize();
            
            expect(result).toBe(false);
        });

        test('should setup spatial audio reference', async () => {
            await audioIntegration.initialize();
            
            expect(mockAudioManager.spatialAudio).toBe(mockSpatialAudio);
        });
    });

    describe('System Integration', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should integrate with combat system', () => {
            const mockCombatSystem = {};
            
            audioIntegration.integrateCombatSystem(mockCombatSystem);
            
            expect(audioIntegration.eventHandlers.has('collision')).toBe(true);
            expect(audioIntegration.eventHandlers.has('damage')).toBe(true);
            expect(audioIntegration.eventHandlers.has('explosion')).toBe(true);
        });

        test('should integrate with vehicle system', () => {
            const mockVehicleManager = {};
            
            audioIntegration.integrateVehicleSystem(mockVehicleManager);
            
            expect(audioIntegration.eventHandlers.has('vehicleStart')).toBe(true);
            expect(audioIntegration.eventHandlers.has('vehicleStop')).toBe(true);
            expect(audioIntegration.eventHandlers.has('vehicleUpdate')).toBe(true);
        });

        test('should integrate with zombie system', () => {
            const mockZombieManager = {};
            
            audioIntegration.integrateZombieSystem(mockZombieManager);
            
            expect(audioIntegration.eventHandlers.has('zombieSpawn')).toBe(true);
            expect(audioIntegration.eventHandlers.has('zombieDeath')).toBe(true);
            expect(audioIntegration.eventHandlers.has('zombieAttack')).toBe(true);
        });

        test('should integrate with UI system', () => {
            audioIntegration.integrateUISystem();
            
            // Should setup UI audio without errors
            expect(() => {
                // Simulate button click
                const clickEvent = new Event('click');
                Object.defineProperty(clickEvent, 'target', {
                    value: { matches: jest.fn().mockReturnValue(true) }
                });
                document.dispatchEvent(clickEvent);
            }).not.toThrow();
        });

        test('should handle null system integration gracefully', () => {
            expect(() => {
                audioIntegration.integrateCombatSystem(null);
                audioIntegration.integrateVehicleSystem(null);
                audioIntegration.integrateZombieSystem(null);
            }).not.toThrow();
        });
    });

    describe('Game State Management', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should change to gameplay state', () => {
            audioIntegration.setGameState('gameplay');
            
            expect(audioIntegration.gameState).toBe('gameplay');
            expect(mockAudioManager.playMusic).toHaveBeenCalledWith('gameplay_calm');
            expect(mockAudioManager.setMusicIntensity).toHaveBeenCalledWith(0.5);
        });

        test('should change to garage state', () => {
            audioIntegration.setGameState('garage');
            
            expect(audioIntegration.gameState).toBe('garage');
            expect(mockAudioManager.playMusic).toHaveBeenCalledWith('garage');
            expect(mockAudioManager.setMusicIntensity).toHaveBeenCalledWith(0.4);
        });

        test('should handle pause state', () => {
            audioIntegration.setGameState('paused');
            
            expect(audioIntegration.gameState).toBe('paused');
            expect(mockAudioManager.setVolume).toHaveBeenCalled();
        });

        test('should resume from pause state', () => {
            audioIntegration.setGameState('paused');
            audioIntegration.setGameState('gameplay');
            
            expect(mockAudioManager.setVolume).toHaveBeenCalledTimes(2); // Pause and resume
        });

        test('should not change to same state', () => {
            audioIntegration.setGameState('menu');
            const initialCallCount = mockAudioManager.playMusic.mock.calls.length;
            
            audioIntegration.setGameState('menu');
            
            expect(mockAudioManager.playMusic.mock.calls.length).toBe(initialCallCount);
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should handle collision events', () => {
            const collisionEvent = {
                type: 'zombie_collision',
                position: { x: 5, y: 0, z: -2 },
                intensity: 0.8,
                objects: ['zombie', 'vehicle']
            };
            
            audioIntegration._handleCollisionAudio(collisionEvent);
            
            expect(mockAudioManager.playImpactSound).toHaveBeenCalledWith(
                'zombie_hard',
                collisionEvent.position,
                collisionEvent.intensity
            );
            expect(audioIntegration.musicIntensity.combatActivity).toBeGreaterThan(0);
        });

        test('should handle different collision types', () => {
            const metalCollision = {
                position: { x: 0, y: 0, z: 0 },
                intensity: 0.6,
                objects: ['metal', 'vehicle']
            };
            
            audioIntegration._handleCollisionAudio(metalCollision);
            
            expect(mockAudioManager.playImpactSound).toHaveBeenCalledWith(
                'metal',
                metalCollision.position,
                metalCollision.intensity
            );
        });

        test('should handle vehicle start events', () => {
            audioIntegration._handleVehicleStart(mockVehicle);
            
            expect(audioIntegration.currentVehicle).toBe(mockVehicle);
            expect(mockEngineAudio.startEngine).toHaveBeenCalledWith(mockVehicle);
            expect(mockAudioManager.startEngineAudio).toHaveBeenCalledWith(mockVehicle);
        });

        test('should handle vehicle stop events', () => {
            audioIntegration.currentVehicle = mockVehicle;
            audioIntegration._handleVehicleStop(mockVehicle);
            
            expect(mockEngineAudio.stopEngine).toHaveBeenCalled();
            expect(mockAudioManager.stopEngineAudio).toHaveBeenCalled();
            expect(audioIntegration.currentVehicle).toBeNull();
        });

        test('should handle vehicle update events', () => {
            audioIntegration.currentVehicle = mockVehicle;
            const vehicleState = {
                speed: 60,
                controls: { forward: 0.8 }
            };
            
            audioIntegration._handleVehicleUpdate(mockVehicle, vehicleState);
            
            expect(mockEngineAudio.setThrottle).toHaveBeenCalledWith(0.8);
            expect(mockAudioManager.updateEngineAudio).toHaveBeenCalled();
            expect(audioIntegration.musicIntensity.speed).toBeGreaterThan(0);
        });

        test('should handle zombie spawn events', () => {
            const initialZombieCount = audioIntegration.musicIntensity.zombieCount;
            
            audioIntegration._handleZombieSpawn(mockZombie);
            
            expect(mockAudioManager.playSound).toHaveBeenCalledWith(
                'zombie_groan',
                mockZombie.getPosition(),
                0.6
            );
            expect(audioIntegration.musicIntensity.zombieCount).toBe(initialZombieCount + 1);
        });

        test('should handle zombie death events', () => {
            audioIntegration.musicIntensity.zombieCount = 5;
            
            audioIntegration._handleZombieDeath(mockZombie);
            
            expect(mockAudioManager.playSound).toHaveBeenCalledWith(
                'zombie_death',
                mockZombie.getPosition(),
                0.8
            );
            expect(audioIntegration.musicIntensity.zombieCount).toBe(4);
        });

        test('should handle explosion events with backfire', () => {
            audioIntegration.currentVehicle = mockVehicle;
            mockEngineAudio.isActive = true;
            
            const explosionEvent = {
                size: 0.8,
                position: { x: 2, y: 0, z: 0, distanceTo: jest.fn(() => 5) },
                intensity: 1.0
            };
            
            audioIntegration._handleExplosionAudio(explosionEvent);
            
            expect(mockAudioManager.playImpactSound).toHaveBeenCalledWith(
                'explosion_large',
                explosionEvent.position,
                explosionEvent.intensity
            );
            expect(mockEngineAudio.triggerBackfire).toHaveBeenCalled();
        });
    });

    describe('Music Intensity System', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
            audioIntegration.setGameState('gameplay');
        });

        test('should update music intensity based on factors', () => {
            audioIntegration.musicIntensity.zombieCount = 10;
            audioIntegration.musicIntensity.combatActivity = 0.8;
            audioIntegration.musicIntensity.speed = 0.9;
            audioIntegration.musicIntensity.lastUpdate = 0; // Force update
            
            audioIntegration._updateMusicIntensity(0.016);
            
            expect(audioIntegration.musicIntensity.current).toBeGreaterThan(0.5);
            expect(mockAudioManager.setMusicIntensity).toHaveBeenCalled();
        });

        test('should switch to intense music when intensity is high', () => {
            audioIntegration.musicIntensity.current = 0.8;
            audioIntegration.musicIntensity.lastUpdate = 0;
            
            audioIntegration._updateMusicIntensity(0.016);
            
            expect(mockAudioManager.playMusic).toHaveBeenCalledWith('gameplay_intense');
        });

        test('should switch to calm music when intensity is low', () => {
            audioIntegration.musicIntensity.current = 0.6;
            audioIntegration.musicIntensity.lastUpdate = 0;
            
            audioIntegration._updateMusicIntensity(0.016);
            
            expect(mockAudioManager.playMusic).toHaveBeenCalledWith('gameplay_calm');
        });

        test('should decay combat activity over time', () => {
            audioIntegration.musicIntensity.combatActivity = 1.0;
            audioIntegration.musicIntensity.lastUpdate = 0;
            
            audioIntegration._updateMusicIntensity(0.016);
            
            expect(audioIntegration.musicIntensity.combatActivity).toBeLessThan(1.0);
        });

        test('should throttle intensity updates', () => {
            audioIntegration.musicIntensity.lastUpdate = performance.now();
            const initialIntensity = audioIntegration.musicIntensity.current;
            
            audioIntegration._updateMusicIntensity(0.016);
            
            expect(audioIntegration.musicIntensity.current).toBe(initialIntensity);
        });
    });

    describe('Update Loop', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should update all audio systems', () => {
            audioIntegration.update(0.016);
            
            expect(mockAudioManager.update).toHaveBeenCalledWith(0.016);
            expect(mockSpatialAudio.update).toHaveBeenCalledWith(0.016);
            expect(mockEngineAudio.update).toHaveBeenCalled();
        });

        test('should skip update when not initialized', () => {
            audioIntegration.isInitialized = false;
            
            audioIntegration.update(0.016);
            
            expect(mockAudioManager.update).not.toHaveBeenCalled();
        });
    });

    describe('Utility Methods', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should return audio manager instance', () => {
            const manager = audioIntegration.getAudioManager();
            expect(manager).toBe(mockAudioManager);
        });

        test('should return spatial audio instance', () => {
            const spatial = audioIntegration.getSpatialAudio();
            expect(spatial).toBe(mockSpatialAudio);
        });

        test('should return engine audio instance', () => {
            const engine = audioIntegration.getEngineAudio();
            expect(engine).toBe(mockEngineAudio);
        });

        test('should calculate RPM correctly', () => {
            const state = { speed: 60, controls: { forward: 0.8 } };
            const rpm = audioIntegration._calculateRPM(state);
            
            expect(rpm).toBeGreaterThan(800); // Base RPM
            expect(rpm).toBeLessThan(6000); // Max RPM
        });

        test('should calculate gear based on speed', () => {
            expect(audioIntegration._calculateGear(5)).toBe(1);
            expect(audioIntegration._calculateGear(25)).toBe(2);
            expect(audioIntegration._calculateGear(45)).toBe(3);
            expect(audioIntegration._calculateGear(65)).toBe(4);
            expect(audioIntegration._calculateGear(85)).toBe(5);
        });

        test('should get vehicle state when no vehicle', () => {
            const state = audioIntegration._getVehicleState();
            
            expect(state.rpm).toBe(0);
            expect(state.throttle).toBe(0);
            expect(state.speed).toBe(0);
            expect(state.gear).toBe(1);
        });
    });

    describe('Resource Management', () => {
        test('should dispose of all audio systems', async () => {
            await audioIntegration.initialize();
            
            audioIntegration.dispose();
            
            expect(mockEngineAudio.dispose).toHaveBeenCalled();
            expect(mockSpatialAudio.dispose).toHaveBeenCalled();
            expect(mockAudioManager.dispose).toHaveBeenCalled();
            expect(audioIntegration.eventHandlers.size).toBe(0);
            expect(audioIntegration.isInitialized).toBe(false);
        });

        test('should handle disposal when not initialized', () => {
            expect(() => {
                audioIntegration.dispose();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle audio manager initialization failure', async () => {
            mockAudioManager.initialize.mockRejectedValue(new Error('Init failed'));
            
            const result = await audioIntegration.initialize();
            
            expect(result).toBe(false);
        });

        test('should handle engine audio initialization failure', async () => {
            mockEngineAudio.initialize.mockRejectedValue(new Error('Engine init failed'));
            
            const result = await audioIntegration.initialize();
            
            expect(result).toBe(false);
        });

        test('should handle event handler errors gracefully', () => {
            mockAudioManager.playImpactSound.mockImplementation(() => {
                throw new Error('Sound play failed');
            });
            
            expect(() => {
                audioIntegration._handleCollisionAudio({
                    position: { x: 0, y: 0, z: 0 },
                    intensity: 1.0,
                    objects: ['zombie']
                });
            }).not.toThrow();
        });
    });

    describe('Window Event Handling', () => {
        beforeEach(async () => {
            await audioIntegration.initialize();
        });

        test('should handle window focus events', () => {
            // Mock audio context
            mockAudioManager.audioContext = {
                state: 'suspended',
                resume: jest.fn()
            };
            
            // Simulate window focus
            const focusEvent = new Event('focus');
            window.dispatchEvent(focusEvent);
            
            expect(mockAudioManager.audioContext.resume).toHaveBeenCalled();
        });

        test('should handle window blur events', () => {
            // Simulate window blur
            const blurEvent = new Event('blur');
            
            expect(() => {
                window.dispatchEvent(blurEvent);
            }).not.toThrow();
        });
    });
});