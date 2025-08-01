import LevelManager from '../LevelManager.js';
import Level from '../Level.js';
import TerrainGenerator from '../TerrainGenerator.js';
import { LEVEL_CONFIGS } from '../LevelConfig.js';

// Mock dependencies
jest.mock('../Level.js');
jest.mock('../TerrainGenerator.js');

describe('LevelManager', () => {
    let levelManager;
    let mockScene;
    let mockPhysicsWorld;
    let mockGameEngine;

    beforeEach(() => {
        // Mock scene
        mockScene = {
            add: jest.fn(),
            remove: jest.fn()
        };

        // Mock physics world
        mockPhysicsWorld = {
            addBody: jest.fn(),
            removeBody: jest.fn()
        };

        // Mock game engine
        mockGameEngine = {
            vehicleManager: {
                getActiveVehicle: jest.fn().mockReturnValue({
                    position: { x: 10, y: 0, z: 20, clone: jest.fn() }
                })
            },
            combatSystem: {
                getStats: jest.fn().mockReturnValue({ zombiesKilled: 5 })
            },
            zombieManager: {
                getStats: jest.fn().mockReturnValue({ bossesKilled: 1 })
            }
        };

        // Mock TerrainGenerator
        TerrainGenerator.mockImplementation(() => ({
            generateTerrain: jest.fn(),
            clearTerrain: jest.fn(),
            dispose: jest.fn()
        }));

        // Mock Level
        Level.mockImplementation((levelId) => ({
            id: levelId,
            config: LEVEL_CONFIGS[levelId],
            isLoaded: false,
            isActive: false,
            isCompleted: false,
            progress: {
                distanceTraveled: 0,
                zombiesKilled: 0,
                timeElapsed: 0,
                checkpointsReached: 0,
                bossesDefeated: 0
            },
            objectives: new Map(),
            load: jest.fn().mockResolvedValue(),
            start: jest.fn(),
            update: jest.fn(),
            updateProgress: jest.fn(),
            unload: jest.fn(),
            dispose: jest.fn(),
            onLevelComplete: null,
            onObjectiveComplete: null,
            onCheckpointReached: null
        }));

        Level.checkUnlockRequirements = jest.fn().mockReturnValue(true);

        levelManager = new LevelManager(mockScene, mockPhysicsWorld, mockGameEngine);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(levelManager.scene).toBe(mockScene);
            expect(levelManager.physicsWorld).toBe(mockPhysicsWorld);
            expect(levelManager.gameEngine).toBe(mockGameEngine);
            expect(levelManager.currentLevel).toBeNull();
            expect(levelManager.levels).toBeInstanceOf(Map);
            expect(levelManager.unlockedLevels).toContain('level-1');
        });

        test('should initialize player progress', () => {
            expect(levelManager.playerProgress).toEqual({
                level: 1,
                currency: 0,
                completedLevels: [],
                levelStats: expect.any(Map)
            });
        });

        test('should create terrain generator', () => {
            expect(TerrainGenerator).toHaveBeenCalledWith(mockScene, mockPhysicsWorld);
        });
    });

    describe('loadLevel', () => {
        test('should load level successfully', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            expect(Level).toHaveBeenCalledWith('level-1', mockScene, mockPhysicsWorld, expect.any(Object));
            expect(level.load).toHaveBeenCalled();
            expect(levelManager.currentLevel).toBe(level);
            expect(levelManager.levels.get('level-1')).toBe(level);
        });

        test('should throw error for invalid level ID', async () => {
            await expect(levelManager.loadLevel('invalid-level')).rejects.toThrow('Level not found: invalid-level');
        });

        test('should throw error for locked level', async () => {
            levelManager.unlockedLevels.delete('level-1');
            
            await expect(levelManager.loadLevel('level-1')).rejects.toThrow('Level not unlocked: level-1');
        });

        test('should unload current level before loading new one', async () => {
            // Load first level
            const firstLevel = await levelManager.loadLevel('level-1');
            
            // Load second level
            const secondLevel = await levelManager.loadLevel('level-2');
            
            expect(firstLevel.unload).toHaveBeenCalled();
            expect(levelManager.currentLevel).toBe(secondLevel);
        });

        test('should set up event handlers', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            expect(level.onLevelComplete).toBeDefined();
            expect(level.onObjectiveComplete).toBeDefined();
            expect(level.onCheckpointReached).toBeDefined();
        });
    });

    describe('startLevel', () => {
        test('should start current level', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            levelManager.startLevel();
            
            expect(level.start).toHaveBeenCalled();
        });

        test('should throw error if no level loaded', () => {
            expect(() => {
                levelManager.startLevel();
            }).toThrow('No level loaded');
        });

        test('should call onLevelStart callback', async () => {
            const onLevelStart = jest.fn();
            levelManager.onLevelStart = onLevelStart;
            
            const level = await levelManager.loadLevel('level-1');
            levelManager.startLevel();
            
            expect(onLevelStart).toHaveBeenCalledWith(level);
        });
    });

    describe('update', () => {
        test('should update current level and progress tracking', async () => {
            const level = await levelManager.loadLevel('level-1');
            level.isActive = true;
            
            levelManager.update(0.016);
            
            expect(level.update).toHaveBeenCalledWith(0.016, expect.any(Object));
            expect(level.updateProgress).toHaveBeenCalled();
        });

        test('should not update if no current level', () => {
            levelManager.update(0.016);
            
            // Should not throw error
            expect(true).toBe(true);
        });

        test('should not update if level not active', async () => {
            const level = await levelManager.loadLevel('level-1');
            level.isActive = false;
            
            levelManager.update(0.016);
            
            expect(level.update).not.toHaveBeenCalled();
        });

        test('should track distance traveled', async () => {
            const level = await levelManager.loadLevel('level-1');
            level.isActive = true;
            
            // Set up initial position
            levelManager.lastPlayerPosition = { x: 0, y: 0, z: 0, distanceTo: jest.fn().mockReturnValue(10) };
            
            levelManager.update(0.016);
            
            expect(level.updateProgress).toHaveBeenCalledWith(expect.objectContaining({
                zombiesKilled: 5,
                bossesDefeated: 1
            }));
        });
    });

    describe('handleLevelComplete', () => {
        test('should update player progress and unlock levels', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            const results = {
                levelId: 'level-1',
                levelName: 'Test Level',
                rewards: { currency: 100, experience: 50 },
                score: 1000,
                completionTime: 120
            };
            
            jest.spyOn(levelManager, 'saveProgress').mockImplementation(() => {});
            
            levelManager.handleLevelComplete(results);
            
            expect(levelManager.playerProgress.completedLevels).toContain('level-1');
            expect(levelManager.playerProgress.currency).toBe(100);
            expect(levelManager.saveProgress).toHaveBeenCalled();
        });

        test('should call onLevelComplete callback', async () => {
            const onLevelComplete = jest.fn();
            levelManager.onLevelComplete = onLevelComplete;
            
            const results = { levelId: 'level-1', rewards: { currency: 100, experience: 50 } };
            
            jest.spyOn(levelManager, 'saveProgress').mockImplementation(() => {});
            
            levelManager.handleLevelComplete(results);
            
            expect(onLevelComplete).toHaveBeenCalledWith(results);
        });
    });

    describe('checkAndUnlockLevels', () => {
        test('should unlock levels when requirements met', () => {
            Level.checkUnlockRequirements.mockImplementation((levelId, playerData) => {
                return levelId === 'level-2';
            });
            
            levelManager.checkAndUnlockLevels();
            
            expect(levelManager.unlockedLevels).toContain('level-2');
        });

        test('should not unlock levels when requirements not met', () => {
            Level.checkUnlockRequirements.mockReturnValue(false);
            
            const initialUnlockedCount = levelManager.unlockedLevels.size;
            
            levelManager.checkAndUnlockLevels();
            
            expect(levelManager.unlockedLevels.size).toBe(initialUnlockedCount);
        });
    });

    describe('isLevelUnlocked', () => {
        test('should return true for unlocked level', () => {
            expect(levelManager.isLevelUnlocked('level-1')).toBe(true);
        });

        test('should return false for locked level', () => {
            expect(levelManager.isLevelUnlocked('level-6')).toBe(false);
        });
    });

    describe('getAvailableLevels', () => {
        test('should return all levels with unlock status', () => {
            levelManager.playerProgress.completedLevels = ['level-1'];
            levelManager.playerProgress.levelStats.set('level-1', {
                bestScore: 1500,
                bestTime: 180,
                completionCount: 2
            });
            
            const levels = levelManager.getAvailableLevels();
            
            expect(levels).toHaveLength(Object.keys(LEVEL_CONFIGS).length);
            
            const level1 = levels.find(l => l.id === 'level-1');
            expect(level1.unlocked).toBe(true);
            expect(level1.completed).toBe(true);
            expect(level1.stats).toEqual({
                bestScore: 1500,
                bestTime: 180,
                completionCount: 2
            });
        });
    });

    describe('getCurrentLevelInfo', () => {
        test('should return current level info', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            const info = levelManager.getCurrentLevelInfo();
            
            expect(info.level).toBe(level);
            expect(info.config).toBe(level.config);
            expect(info.progress).toBe(level.progress);
        });

        test('should return null if no current level', () => {
            const info = levelManager.getCurrentLevelInfo();
            
            expect(info).toBeNull();
        });
    });

    describe('restartLevel', () => {
        test('should restart current level', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            jest.spyOn(levelManager, 'loadLevel').mockResolvedValue(level);
            jest.spyOn(levelManager, 'startLevel').mockImplementation(() => {});
            
            await levelManager.restartLevel();
            
            expect(levelManager.loadLevel).toHaveBeenCalledWith('level-1');
            expect(levelManager.startLevel).toHaveBeenCalled();
        });

        test('should throw error if no current level', async () => {
            await expect(levelManager.restartLevel()).rejects.toThrow('No level to restart');
        });
    });

    describe('saveProgress and loadProgress', () => {
        beforeEach(() => {
            // Mock localStorage
            global.localStorage = {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            };
        });

        test('should save progress to localStorage', () => {
            levelManager.playerProgress.currency = 500;
            levelManager.unlockedLevels.add('level-2');
            
            levelManager.saveProgress();
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'zombie_game_progress',
                expect.stringContaining('"currency":500')
            );
        });

        test('should load progress from localStorage', () => {
            const progressData = {
                playerProgress: {
                    level: 3,
                    currency: 1000,
                    completedLevels: ['level-1', 'level-2'],
                    levelStats: [['level-1', { bestScore: 1500 }]]
                },
                unlockedLevels: ['level-1', 'level-2', 'level-3']
            };
            
            localStorage.getItem.mockReturnValue(JSON.stringify(progressData));
            
            levelManager.loadProgress();
            
            expect(levelManager.playerProgress.level).toBe(3);
            expect(levelManager.playerProgress.currency).toBe(1000);
            expect(levelManager.unlockedLevels).toContain('level-3');
        });

        test('should handle corrupted save data', () => {
            localStorage.getItem.mockReturnValue('invalid json');
            
            jest.spyOn(levelManager, 'resetProgress').mockImplementation(() => {});
            
            levelManager.loadProgress();
            
            expect(levelManager.resetProgress).toHaveBeenCalled();
        });
    });

    describe('resetProgress', () => {
        test('should reset player progress to defaults', () => {
            levelManager.playerProgress.currency = 1000;
            levelManager.unlockedLevels.add('level-2');
            
            levelManager.resetProgress();
            
            expect(levelManager.playerProgress.currency).toBe(0);
            expect(levelManager.playerProgress.level).toBe(1);
            expect(levelManager.unlockedLevels.size).toBe(1);
            expect(levelManager.unlockedLevels).toContain('level-1');
        });
    });

    describe('getPlayerProgress', () => {
        test('should return player progress data', () => {
            levelManager.playerProgress.currency = 500;
            levelManager.unlockedLevels.add('level-2');
            
            const progress = levelManager.getPlayerProgress();
            
            expect(progress.currency).toBe(500);
            expect(progress.unlockedLevels).toContain('level-2');
        });
    });

    describe('dispose', () => {
        test('should dispose all resources', async () => {
            const level = await levelManager.loadLevel('level-1');
            
            levelManager.dispose();
            
            expect(level.dispose).toHaveBeenCalled();
            expect(levelManager.levels.size).toBe(0);
            expect(levelManager.terrainGenerator.dispose).toHaveBeenCalled();
        });
    });
});