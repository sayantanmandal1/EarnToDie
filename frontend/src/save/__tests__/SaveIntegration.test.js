import SaveIntegration from '../SaveIntegration.js';
import { EventEmitter } from 'events';

// Mock the SaveManager and SaveAPI
jest.mock('../SaveManager.js');
jest.mock('../SaveAPI.js');

// Mock game engine components
class MockGameEngine extends EventEmitter {
    constructor() {
        super();
        this.levelManager = new EventEmitter();
        this.upgradeManager = new EventEmitter();
        this.scoringSystem = new EventEmitter();
        this.vehicleManager = new EventEmitter();
        this.gameStateManager = new EventEmitter();
        this.achievementSystem = new EventEmitter();
    }

    getLevelManager() { return this.levelManager; }
    getUpgradeManager() { return this.upgradeManager; }
    getScoringSystem() { return this.scoringSystem; }
    getVehicleManager() { return this.vehicleManager; }
    getGameStateManager() { return this.gameStateManager; }
    getAchievementSystem() { return this.achievementSystem; }
    setPlayerInfo() {}
    applySettings() {}
}

describe('SaveIntegration', () => {
    let saveIntegration;
    let mockGameEngine;

    beforeEach(() => {
        mockGameEngine = new MockGameEngine();
        saveIntegration = new SaveIntegration(mockGameEngine, {
            autoSaveOnLevelComplete: true,
            autoSaveOnUpgrade: true,
            autoSaveOnAchievement: true
        });

        // Mock the save manager methods
        saveIntegration.saveManager = {
            initialize: jest.fn().mockResolvedValue(true),
            updateLevelProgress: jest.fn(),
            updateStatistics: jest.fn(),
            updateVehicleData: jest.fn(),
            updatePlayerData: jest.fn(),
            addAchievement: jest.fn(),
            saveToLocalStorage: jest.fn().mockResolvedValue(true),
            debouncedSave: jest.fn(),
            syncWithBackend: jest.fn().mockResolvedValue(true),
            dispose: jest.fn(),
            getStatus: jest.fn().mockReturnValue({ initialized: true, autoSaveEnabled: true }),
            saveState: {
                player: { id: 'player_1', currency: 1000 },
                vehicles: { owned: ['vehicle_1'], selected: 'vehicle_1', upgrades: {} },
                levels: { unlocked: ['level_1'], completed: [], bestScores: {} },
                settings: {},
                gameState: { currentSession: null, lastLevel: null, checkpoint: null }
            },
            getSaveState: jest.fn().mockReturnValue({
                player: { id: 'player_1', currency: 1000 },
                vehicles: { owned: ['vehicle_1'], selected: 'vehicle_1', upgrades: {} },
                levels: { unlocked: ['level_1'], completed: [], bestScores: {} },
                settings: {}
            }),
            getPlayerData: jest.fn().mockReturnValue({ currency: 1000, totalScore: 5000 }),
            getVehicleData: jest.fn().mockReturnValue({ owned: ['vehicle_1'], upgrades: {} }),
            getLevelData: jest.fn().mockReturnValue({ unlocked: ['level_1'], bestScores: {} }),
            on: jest.fn()
        };
    });

    afterEach(() => {
        if (saveIntegration) {
            saveIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            const result = await saveIntegration.initialize();

            expect(result).toBe(true);
            expect(saveIntegration.saveManager.initialize).toHaveBeenCalled();
            expect(saveIntegration.eventListeners.size).toBeGreaterThan(0);
        });

        test('should setup event listeners for all game systems', async () => {
            await saveIntegration.initialize();

            // Check that event listeners are registered
            expect(saveIntegration.eventListeners.has('levelManager.levelCompleted')).toBe(true);
            expect(saveIntegration.eventListeners.has('upgradeManager.upgradeCompleted')).toBe(true);
            expect(saveIntegration.eventListeners.has('scoringSystem.scoreUpdated')).toBe(true);
            expect(saveIntegration.eventListeners.has('vehicleManager.vehicleSelected')).toBe(true);
            expect(saveIntegration.eventListeners.has('gameStateManager.stateChanged')).toBe(true);
            expect(saveIntegration.eventListeners.has('achievementSystem.achievementUnlocked')).toBe(true);
        });
    });

    describe('Level Management Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle level completion', async () => {
            const levelData = {
                levelId: 'level_2',
                score: 5000,
                completionTime: 120000,
                stats: {
                    zombiesKilled: 50,
                    distanceTraveled: 1000
                }
            };

            await saveIntegration.handleLevelComplete(levelData);

            expect(saveIntegration.saveManager.updateLevelProgress).toHaveBeenCalledWith('level_2', {
                completed: true,
                completedAt: expect.any(Number),
                score: 5000,
                time: 120000,
                stats: levelData.stats
            });

            expect(saveIntegration.saveManager.updateStatistics).toHaveBeenCalledWith({
                totalGamesPlayed: 1,
                totalPlayTime: 120000,
                totalZombiesKilled: 50,
                totalDistanceTraveled: 1000
            });

            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should handle checkpoint reached', async () => {
            const checkpointData = {
                levelId: 'level_1',
                checkpointId: 'checkpoint_2'
            };

            await saveIntegration.handleCheckpointReached(checkpointData);

            expect(saveIntegration.saveManager.updateLevelProgress).toHaveBeenCalledWith('level_1', {
                lastCheckpoint: 'checkpoint_2',
                checkpointReachedAt: expect.any(Number),
                checkpointData: checkpointData
            });
        });

        test('should handle level unlocked', async () => {
            const levelId = 'level_3';

            await saveIntegration.handleLevelUnlocked(levelId);

            expect(saveIntegration.saveManager.updateLevelProgress).toHaveBeenCalledWith(levelId, {
                unlockedAt: expect.any(Number)
            });
        });

        test('should not duplicate level completion saves', async () => {
            const levelData = { levelId: 'level_2', score: 5000 };

            // Complete the same level twice
            await saveIntegration.handleLevelComplete(levelData);
            await saveIntegration.handleLevelComplete(levelData);

            // Should only save once
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalledTimes(1);
        });
    });

    describe('Upgrade Management Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle upgrade completed', async () => {
            const upgradeData = {
                vehicleId: 'vehicle_1',
                category: 'engine',
                newLevel: 2,
                cost: 500,
                remainingCurrency: 1500
            };

            await saveIntegration.handleUpgradeCompleted(upgradeData);

            expect(saveIntegration.saveManager.updateVehicleData).toHaveBeenCalled();
            expect(saveIntegration.saveManager.updatePlayerData).toHaveBeenCalledWith({
                currency: 1500
            });
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should handle currency updates', async () => {
            await saveIntegration.handleCurrencyUpdated(1200, 1000);

            expect(saveIntegration.saveManager.updatePlayerData).toHaveBeenCalledWith({
                currency: 1200
            });

            // Should save on significant changes (>= 100)
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should not save on small currency changes', async () => {
            await saveIntegration.handleCurrencyUpdated(1050, 1000);

            expect(saveIntegration.saveManager.updatePlayerData).toHaveBeenCalledWith({
                currency: 1050
            });

            // Should not save on small changes (< 100)
            expect(saveIntegration.saveManager.saveToLocalStorage).not.toHaveBeenCalled();
        });
    });

    describe('Scoring System Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle score updates', async () => {
            const scoreData = {
                totalPoints: 6000,
                zombiesKilled: 75,
                distanceTraveled: 1500
            };

            await saveIntegration.handleScoreUpdated(scoreData);

            expect(saveIntegration.saveManager.updatePlayerData).toHaveBeenCalledWith({
                totalScore: 6000
            });

            expect(saveIntegration.saveManager.updateStatistics).toHaveBeenCalledWith({
                totalZombiesKilled: 75,
                totalDistanceTraveled: 1500
            });
        });

        test('should detect score milestones', async () => {
            // Set current total score to be below the milestone
            saveIntegration.saveManager.getPlayerData.mockReturnValue({ 
                currency: 1000, 
                totalScore: 500 // Below 1000 milestone
            });

            const scoreData = {
                totalPoints: 1000, // Milestone threshold
                zombiesKilled: 50,
                distanceTraveled: 1000
            };

            await saveIntegration.handleScoreUpdated(scoreData);

            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should handle high score achieved', async () => {
            const scoreData = {
                levelId: 'level_1',
                score: 7000
            };

            await saveIntegration.handleHighScoreAchieved(scoreData);

            expect(saveIntegration.saveManager.updateLevelProgress).toHaveBeenCalledWith('level_1', {
                score: 7000,
                highScoreAchievedAt: expect.any(Number)
            });

            expect(saveIntegration.saveManager.updatePlayerData).toHaveBeenCalledWith({
                totalScore: 7000
            });
        });
    });

    describe('Vehicle Management Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle vehicle selection', async () => {
            const vehicleData = { id: 'vehicle_2' };

            await saveIntegration.handleVehicleSelected(vehicleData);

            expect(saveIntegration.saveManager.updateVehicleData).toHaveBeenCalledWith({
                selected: 'vehicle_2'
            });
        });

        test('should handle vehicle unlocked', async () => {
            const vehicleData = { id: 'vehicle_3' };

            await saveIntegration.handleVehicleUnlocked(vehicleData);

            expect(saveIntegration.saveManager.updateVehicleData).toHaveBeenCalledWith({
                owned: ['vehicle_1', 'vehicle_3'] // Should add to existing owned vehicles
            });
        });

        test('should not duplicate owned vehicles', async () => {
            const vehicleData = { id: 'vehicle_1' }; // Already owned

            await saveIntegration.handleVehicleUnlocked(vehicleData);

            // Should not call updateVehicleData since vehicle is already owned
            expect(saveIntegration.saveManager.updateVehicleData).not.toHaveBeenCalled();
        });
    });

    describe('Game State Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle game state changes', async () => {
            const newState = 'playing';
            const oldState = 'menu';

            await saveIntegration.handleGameStateChanged(newState, oldState);

            expect(saveIntegration.saveManager.debouncedSave).toHaveBeenCalled();
        });

        test('should handle session started', async () => {
            const sessionData = {
                sessionId: 'session_123',
                levelId: 'level_2'
            };

            await saveIntegration.handleSessionStarted(sessionData);

            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should handle session ended', async () => {
            const sessionData = {
                sessionId: 'session_123',
                duration: 180000
            };

            await saveIntegration.handleSessionEnded(sessionData);

            expect(saveIntegration.saveManager.updateStatistics).toHaveBeenCalledWith({
                totalPlayTime: 180000,
                totalGamesPlayed: 1
            });

            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });
    });

    describe('Achievement Integration', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should handle achievement unlocked', async () => {
            const achievement = {
                id: 'first_kill',
                name: 'First Kill',
                description: 'Kill your first zombie',
                points: 10
            };

            await saveIntegration.handleAchievementUnlocked(achievement);

            expect(saveIntegration.saveManager.addAchievement).toHaveBeenCalledWith(achievement);
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should not duplicate achievement unlocks', async () => {
            const achievement = { id: 'first_kill', name: 'First Kill' };

            // Unlock the same achievement twice
            await saveIntegration.handleAchievementUnlocked(achievement);
            await saveIntegration.handleAchievementUnlocked(achievement);

            // Should only save once
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalledTimes(1);
        });
    });

    describe('Progress Loading', () => {
        test('should load progress into game systems', async () => {
            mockGameEngine.setPlayerInfo = jest.fn();
            mockGameEngine.applySettings = jest.fn();
            mockGameEngine.vehicleManager.setOwnedVehicles = jest.fn();
            mockGameEngine.vehicleManager.selectVehicle = jest.fn();
            mockGameEngine.levelManager.setUnlockedLevels = jest.fn();
            mockGameEngine.levelManager.setCompletedLevels = jest.fn();
            mockGameEngine.levelManager.setBestScores = jest.fn();
            mockGameEngine.upgradeManager.loadUpgradeData = jest.fn();

            await saveIntegration.initialize();

            expect(mockGameEngine.setPlayerInfo).toHaveBeenCalledWith({
                id: 'player_1',
                currency: 1000
            });
            expect(mockGameEngine.vehicleManager.setOwnedVehicles).toHaveBeenCalledWith(['vehicle_1']);
            expect(mockGameEngine.vehicleManager.selectVehicle).toHaveBeenCalledWith('vehicle_1');
            expect(mockGameEngine.levelManager.setUnlockedLevels).toHaveBeenCalledWith(['level_1']);
        });
    });

    describe('Force Operations', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should force save', async () => {
            const result = await saveIntegration.forceSave();

            expect(result).toBe(true);
            expect(saveIntegration.saveManager.saveToLocalStorage).toHaveBeenCalled();
        });

        test('should force sync', async () => {
            saveIntegration.saveManager.syncWithBackend = jest.fn().mockResolvedValue(true);

            const result = await saveIntegration.forceSync();

            expect(result).toBe(true);
            expect(saveIntegration.saveManager.syncWithBackend).toHaveBeenCalled();
        });

        test('should handle force save errors', async () => {
            saveIntegration.saveManager.saveToLocalStorage.mockRejectedValue(new Error('Save failed'));

            await expect(saveIntegration.forceSave()).rejects.toThrow('Save failed');
        });
    });

    describe('Status and Utilities', () => {
        beforeEach(async () => {
            await saveIntegration.initialize();
        });

        test('should return integration status', () => {
            saveIntegration.saveManager.getStatus = jest.fn().mockReturnValue({
                initialized: true,
                autoSaveEnabled: true
            });

            const status = saveIntegration.getStatus();

            expect(status.saveManager.initialized).toBe(true);
            expect(status.integration.eventListeners).toBeGreaterThan(0);
            expect(status.integration.milestones).toBeDefined();
        });

        test('should track milestones', async () => {
            // Trigger some events to create milestones
            await saveIntegration.handleLevelComplete({ levelId: 'level_1', score: 1000 });
            await saveIntegration.handleUpgradeCompleted({ 
                vehicleId: 'vehicle_1', 
                category: 'engine', 
                newLevel: 2 
            });
            await saveIntegration.handleAchievementUnlocked({ id: 'achievement_1' });

            const status = saveIntegration.getStatus();

            expect(status.integration.milestones.levelsCompleted).toBe(1);
            expect(status.integration.milestones.upgradesPurchased).toBe(1);
            expect(status.integration.milestones.achievementsUnlocked).toBe(1);
        });
    });

    describe('Event Listener Management', () => {
        test('should properly dispose event listeners', async () => {
            await saveIntegration.initialize();

            const initialListenerCount = saveIntegration.eventListeners.size;
            expect(initialListenerCount).toBeGreaterThan(0);

            saveIntegration.dispose();

            expect(saveIntegration.eventListeners.size).toBe(0);
        });

        test('should handle missing game systems gracefully', async () => {
            // Create game engine without some systems
            const incompleteGameEngine = {
                getLevelManager: () => null,
                getUpgradeManager: () => mockGameEngine.upgradeManager,
                getScoringSystem: () => null,
                getVehicleManager: () => null,
                getGameStateManager: () => null,
                getAchievementSystem: () => null
            };

            const incompleteIntegration = new SaveIntegration(incompleteGameEngine);
            incompleteIntegration.saveManager = saveIntegration.saveManager;

            // Should not throw errors
            await expect(incompleteIntegration.initialize()).resolves.toBe(true);

            incompleteIntegration.dispose();
        });
    });

    describe('Auto-save Configuration', () => {
        test('should respect auto-save options', async () => {
            const noAutoSaveIntegration = new SaveIntegration(mockGameEngine, {
                autoSaveOnLevelComplete: false,
                autoSaveOnUpgrade: false,
                autoSaveOnAchievement: false
            });

            noAutoSaveIntegration.saveManager = {
                ...saveIntegration.saveManager,
                saveToLocalStorage: jest.fn().mockResolvedValue(true)
            };

            await noAutoSaveIntegration.initialize();

            // These should not trigger auto-save
            await noAutoSaveIntegration.handleLevelComplete({ levelId: 'level_1', score: 1000 });
            await noAutoSaveIntegration.handleUpgradeCompleted({ 
                vehicleId: 'vehicle_1', 
                category: 'engine', 
                newLevel: 2 
            });
            await noAutoSaveIntegration.handleAchievementUnlocked({ id: 'achievement_1' });

            expect(noAutoSaveIntegration.saveManager.saveToLocalStorage).not.toHaveBeenCalled();

            noAutoSaveIntegration.dispose();
        });
    });
});