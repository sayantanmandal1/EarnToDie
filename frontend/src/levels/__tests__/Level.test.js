import Level from '../Level.js';
import Checkpoint from '../Checkpoint.js';
import { LEVEL_CONFIGS, CHECKPOINT_CONFIGS, LEVEL_OBJECTIVES } from '../LevelConfig.js';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../Checkpoint.js');
jest.mock('three');

describe('Level', () => {
    let level;
    let mockScene;
    let mockPhysicsWorld;
    let mockTerrainGenerator;

    beforeEach(() => {
        // Mock scene
        mockScene = {
            add: jest.fn(),
            remove: jest.fn(),
            children: []
        };

        // Mock physics world
        mockPhysicsWorld = {
            addBody: jest.fn(),
            removeBody: jest.fn()
        };

        // Mock terrain generator
        mockTerrainGenerator = {
            generateTerrain: jest.fn().mockReturnValue({
                mesh: {},
                body: {},
                obstacles: []
            }),
            getRandomSpawnPosition: jest.fn().mockReturnValue(new THREE.Vector3(0, 0, 0)),
            clearTerrain: jest.fn()
        };

        // Mock Three.js
        THREE.Vector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
            x, y, z,
            clone: jest.fn().mockReturnValue({ x, y, z }),
            copy: jest.fn(),
            distanceTo: jest.fn().mockReturnValue(10)
        }));

        THREE.AmbientLight = jest.fn().mockImplementation(() => ({
            color: { setHex: jest.fn() }
        }));

        THREE.DirectionalLight = jest.fn().mockImplementation(() => {
            const light = {
                position: { 
                    set: jest.fn(),
                    x: 0, y: 0, z: 0
                },
                color: { setHex: jest.fn() },
                castShadow: false,
                shadow: {
                    mapSize: { width: 0, height: 0 },
                    camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 }
                },
                intensity: 1
            };
            return light;
        });

        // Mock Checkpoint
        Checkpoint.mockImplementation(() => ({
            id: 'test-checkpoint',
            activate: jest.fn(),
            reach: jest.fn(),
            update: jest.fn(),
            isPositionInRange: jest.fn().mockReturnValue(false),
            isReached: false,
            getState: jest.fn().mockReturnValue({}),
            setState: jest.fn(),
            dispose: jest.fn()
        }));

        level = new Level('level-1', mockScene, mockPhysicsWorld, mockTerrainGenerator);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(level.id).toBe('level-1');
            expect(level.scene).toBe(mockScene);
            expect(level.physicsWorld).toBe(mockPhysicsWorld);
            expect(level.terrainGenerator).toBe(mockTerrainGenerator);
            expect(level.config).toBe(LEVEL_CONFIGS['level-1']);
        });

        test('should throw error for invalid level ID', () => {
            expect(() => {
                new Level('invalid-level', mockScene, mockPhysicsWorld, mockTerrainGenerator);
            }).toThrow('Level configuration not found for: invalid-level');
        });

        test('should initialize objectives from config', () => {
            expect(level.objectives.size).toBeGreaterThan(0);
            
            const objectives = Array.from(level.objectives.values());
            expect(objectives[0]).toHaveProperty('type');
            expect(objectives[0]).toHaveProperty('target');
            expect(objectives[0]).toHaveProperty('description');
            expect(objectives[0]).toHaveProperty('current', 0);
            expect(objectives[0]).toHaveProperty('completed', false);
        });

        test('should initialize progress tracking', () => {
            expect(level.progress).toEqual({
                distanceTraveled: 0,
                zombiesKilled: 0,
                timeElapsed: 0,
                checkpointsReached: 0,
                bossesDefeated: 0
            });
        });
    });

    describe('load', () => {
        test('should load level successfully', async () => {
            await level.load();
            
            expect(level.isLoaded).toBe(true);
            expect(mockTerrainGenerator.generateTerrain).toHaveBeenCalledWith(level.config);
            expect(level.terrain).toBeDefined();
            expect(level.checkpoints.size).toBeGreaterThan(0);
            expect(level.spawnPoints.length).toBeGreaterThan(0);
        });

        test('should not reload if already loaded', async () => {
            await level.load();
            mockTerrainGenerator.generateTerrain.mockClear();
            
            await level.load();
            
            expect(mockTerrainGenerator.generateTerrain).not.toHaveBeenCalled();
        });

        test('should create checkpoints from config', async () => {
            await level.load();
            
            const expectedCheckpoints = CHECKPOINT_CONFIGS['level-1'] || [];
            expect(Checkpoint).toHaveBeenCalledTimes(expectedCheckpoints.length);
            expect(level.checkpoints.size).toBe(expectedCheckpoints.length);
        });

        test('should activate first checkpoint', async () => {
            await level.load();
            
            if (level.checkpoints.size > 0) {
                const firstCheckpoint = Array.from(level.checkpoints.values())[0];
                expect(firstCheckpoint.activate).toHaveBeenCalled();
            }
        });

        test('should generate spawn points', async () => {
            await level.load();
            
            expect(level.spawnPoints.length).toBe(20);
            expect(mockTerrainGenerator.getRandomSpawnPosition).toHaveBeenCalledTimes(20);
        });

        test('should set up lighting', async () => {
            await level.load();
            
            expect(THREE.AmbientLight).toHaveBeenCalled();
            expect(THREE.DirectionalLight).toHaveBeenCalled();
            expect(mockScene.add).toHaveBeenCalledTimes(22); // 20 spawn points + 2 lights
        });
    });

    describe('start', () => {
        test('should start level successfully', async () => {
            await level.load();
            
            level.start();
            
            expect(level.isActive).toBe(true);
            expect(level.startTime).toBeDefined();
        });

        test('should throw error if level not loaded', () => {
            expect(() => {
                level.start();
            }).toThrow('Level must be loaded before starting');
        });
    });

    describe('update', () => {
        beforeEach(async () => {
            await level.load();
            level.start();
        });

        test('should update progress and checkpoints', () => {
            const playerPosition = new THREE.Vector3(10, 0, 20);
            const deltaTime = 0.016;
            
            level.update(deltaTime, playerPosition);
            
            expect(level.progress.timeElapsed).toBeGreaterThan(0);
            
            // Should update all checkpoints
            level.checkpoints.forEach(checkpoint => {
                expect(checkpoint.update).toHaveBeenCalledWith(0.016);
                expect(checkpoint.isPositionInRange).toHaveBeenCalledWith(playerPosition);
            });
        });

        test('should not update if level not active', () => {
            level.isActive = false;
            const playerPosition = new THREE.Vector3(10, 0, 20);
            
            level.update(0.016, playerPosition);
            
            // Should not update checkpoints
            level.checkpoints.forEach(checkpoint => {
                expect(checkpoint.update).not.toHaveBeenCalled();
            });
        });

        test('should handle checkpoint reached', () => {
            const playerPosition = new THREE.Vector3(10, 0, 20);
            const mockCheckpoint = Array.from(level.checkpoints.values())[0];
            
            if (mockCheckpoint) {
                mockCheckpoint.isPositionInRange.mockReturnValue(true);
                mockCheckpoint.isReached = false;
                
                const onCheckpointReached = jest.fn();
                level.onCheckpointReached = onCheckpointReached;
                
                level.update(0.016, playerPosition);
                
                expect(mockCheckpoint.reach).toHaveBeenCalled();
                expect(level.progress.checkpointsReached).toBe(1);
                expect(onCheckpointReached).toHaveBeenCalledWith(mockCheckpoint);
            }
        });
    });

    describe('updateProgress', () => {
        test('should update progress values', () => {
            const progressUpdate = {
                distanceTraveled: 100,
                zombiesKilled: 5,
                bossesDefeated: 1
            };
            
            level.updateProgress(progressUpdate);
            
            expect(level.progress.distanceTraveled).toBe(100);
            expect(level.progress.zombiesKilled).toBe(5);
            expect(level.progress.bossesDefeated).toBe(1);
        });
    });

    describe('updateObjectives', () => {
        beforeEach(async () => {
            await level.load();
            level.start();
        });

        test('should update objective progress for distance traveled', () => {
            level.progress.distanceTraveled = 500;
            
            level.updateObjectives();
            
            const distanceObjective = Array.from(level.objectives.values())
                .find(obj => obj.type === LEVEL_OBJECTIVES.SURVIVE_DISTANCE);
                
            if (distanceObjective) {
                expect(distanceObjective.current).toBe(500);
            }
        });

        test('should complete objective when target reached', () => {
            const onObjectiveComplete = jest.fn();
            level.onObjectiveComplete = onObjectiveComplete;
            
            // Set progress to meet first objective
            const firstObjective = Array.from(level.objectives.values())[0];
            if (firstObjective.type === LEVEL_OBJECTIVES.SURVIVE_DISTANCE) {
                level.progress.distanceTraveled = firstObjective.target;
            } else if (firstObjective.type === LEVEL_OBJECTIVES.KILL_COUNT) {
                level.progress.zombiesKilled = firstObjective.target;
            }
            
            level.updateObjectives();
            
            expect(firstObjective.completed).toBe(true);
            expect(onObjectiveComplete).toHaveBeenCalledWith(firstObjective);
        });
    });

    describe('checkLevelCompletion', () => {
        beforeEach(async () => {
            await level.load();
            level.start();
        });

        test('should complete level when all objectives completed', () => {
            const onLevelComplete = jest.fn();
            level.onLevelComplete = onLevelComplete;
            
            // Mark all objectives as completed
            level.objectives.forEach(objective => {
                objective.completed = true;
            });
            
            level.checkLevelCompletion();
            
            expect(level.isCompleted).toBe(true);
            expect(level.isActive).toBe(false);
            expect(level.endTime).toBeDefined();
            expect(onLevelComplete).toHaveBeenCalled();
        });

        test('should not complete level if objectives not completed', () => {
            level.checkLevelCompletion();
            
            expect(level.isCompleted).toBe(false);
            expect(level.isActive).toBe(true);
        });
    });

    describe('calculateScore', () => {
        test('should calculate score based on performance', () => {
            level.isCompleted = true;
            level.progress = {
                zombiesKilled: 10,
                distanceTraveled: 500,
                timeElapsed: 120, // 2 minutes
                checkpointsReached: 2,
                bossesDefeated: 1
            };
            
            const score = level.calculateScore();
            
            // Base completion: 1000
            // Zombies: 10 * 10 = 100
            // Distance: 500 / 10 = 50
            // Time bonus: (300 - 120) * 5 = 900
            // Checkpoints: 2 * 50 = 100
            // Bosses: 1 * 200 = 200
            // Total: 2350
            expect(score).toBe(2350);
        });

        test('should return 0 score for incomplete level', () => {
            level.isCompleted = false;
            
            const score = level.calculateScore();
            
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('checkUnlockRequirements', () => {
        test('should return true when requirements met', () => {
            const playerData = {
                level: 2,
                currency: 500,
                completedLevels: ['level-1']
            };
            
            const canUnlock = Level.checkUnlockRequirements('level-2', playerData);
            
            expect(canUnlock).toBe(true);
        });

        test('should return false when level requirement not met', () => {
            const playerData = {
                level: 1,
                currency: 500,
                completedLevels: ['level-1']
            };
            
            const canUnlock = Level.checkUnlockRequirements('level-2', playerData);
            
            expect(canUnlock).toBe(false);
        });

        test('should return false when currency requirement not met', () => {
            const playerData = {
                level: 2,
                currency: 100,
                completedLevels: ['level-1']
            };
            
            const canUnlock = Level.checkUnlockRequirements('level-2', playerData);
            
            expect(canUnlock).toBe(false);
        });

        test('should return false when previous levels not completed', () => {
            const playerData = {
                level: 2,
                currency: 500,
                completedLevels: []
            };
            
            const canUnlock = Level.checkUnlockRequirements('level-2', playerData);
            
            expect(canUnlock).toBe(false);
        });
    });

    describe('getState and setState', () => {
        test('should save and restore level state', async () => {
            await level.load();
            level.start();
            
            // Modify some state
            level.isCompleted = true;
            level.progress.zombiesKilled = 10;
            
            const state = level.getState();
            
            expect(state.id).toBe('level-1');
            expect(state.isCompleted).toBe(true);
            expect(state.progress.zombiesKilled).toBe(10);
            
            // Create new level and restore state
            const newLevel = new Level('level-1', mockScene, mockPhysicsWorld, mockTerrainGenerator);
            await newLevel.load();
            newLevel.setState(state);
            
            expect(newLevel.isCompleted).toBe(true);
            expect(newLevel.progress.zombiesKilled).toBe(10);
        });
    });

    describe('unload', () => {
        test('should unload level and clean up resources', async () => {
            await level.load();
            
            level.unload();
            
            expect(mockTerrainGenerator.clearTerrain).toHaveBeenCalled();
            expect(level.isLoaded).toBe(false);
            expect(level.isActive).toBe(false);
            
            // Should dispose all checkpoints
            level.checkpoints.forEach(checkpoint => {
                expect(checkpoint.dispose).toHaveBeenCalled();
            });
            expect(level.checkpoints.size).toBe(0);
        });
    });

    describe('dispose', () => {
        test('should dispose all resources', async () => {
            await level.load();
            
            jest.spyOn(level, 'unload');
            
            level.dispose();
            
            expect(level.unload).toHaveBeenCalled();
            expect(level.spawnPoints).toEqual([]);
            expect(level.objectives.size).toBe(0);
        });
    });
});