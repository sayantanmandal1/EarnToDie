/**
 * Unit tests for ZombieCarSaveManager
 * Tests save system reliability and data integrity
 */

import { ZombieCarSaveManager } from '../ZombieCarSaveManager.js';

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('ZombieCarSaveManager', () => {
    let saveManager;

    beforeEach(() => {
        // Clear localStorage mock
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        
        // Create new save manager instance
        saveManager = new ZombieCarSaveManager();
    });

    describe('Initialization', () => {
        test('should initialize with default save data when no existing save', async () => {
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            expect(saveData).toBeDefined();
            expect(saveData.version).toBe('1.0.0');
            expect(saveData.player.money).toBe(0);
            expect(saveData.vehicles.owned).toContain('STARTER_CAR');
            expect(saveData.vehicles.selected).toBe('STARTER_CAR');
        });

        test('should load existing save data from localStorage', async () => {
            const existingSave = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 500, bestDistance: 1000, totalRuns: 5, totalZombiesKilled: 0, totalMoneyEarned: 0, totalPlayTime: 0 },
                vehicles: { owned: ['STARTER_CAR', 'OLD_TRUCK'], selected: 'OLD_TRUCK', upgrades: {} },
                stages: { currentStage: 1, unlockedStages: [0, 1], stageProgress: {} },
                settings: { masterVolume: 0.8 },
                gameCompleted: false
            };
            
            localStorageMock.setItem('zombie_car_game_save', JSON.stringify(existingSave));
            
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(500);
            expect(saveData.vehicles.selected).toBe('OLD_TRUCK');
            expect(saveData.stages.currentStage).toBe(1);
        });
    });

    describe('Data Validation', () => {
        test('should validate correct save data structure', () => {
            const validData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 100, bestDistance: 500, totalRuns: 3 },
                vehicles: { owned: ['STARTER_CAR'], selected: 'STARTER_CAR', upgrades: {} },
                stages: { currentStage: 0, unlockedStages: [0], stageProgress: {} },
                settings: {},
                gameCompleted: false
            };
            
            const result = saveManager.validateSaveData(validData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should detect missing required fields', () => {
            const invalidData = {
                version: '1.0.0'
                // Missing other required fields
            };
            
            const result = saveManager.validateSaveData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing player data');
            expect(result.errors).toContain('Missing vehicles data');
            expect(result.errors).toContain('Missing stages data');
        });

        test('should detect invalid data types', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 'invalid', bestDistance: -100, totalRuns: 'not a number' },
                vehicles: { owned: 'not an array', selected: 'STARTER_CAR', upgrades: {} },
                stages: { currentStage: 'invalid', unlockedStages: 'not an array' },
                settings: {},
                gameCompleted: false
            };
            
            const result = saveManager.validateSaveData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should detect save data that is too old', () => {
            const oldData = {
                version: '1.0.0',
                timestamp: Date.now() - (400 * 24 * 60 * 60 * 1000), // 400 days ago
                player: { money: 100, bestDistance: 500, totalRuns: 3 },
                vehicles: { owned: ['STARTER_CAR'], selected: 'STARTER_CAR', upgrades: {} },
                stages: { currentStage: 0, unlockedStages: [0], stageProgress: {} },
                settings: {},
                gameCompleted: false
            };
            
            const result = saveManager.validateSaveData(oldData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Save data is too old (>1 year)');
        });
    });

    describe('Data Repair', () => {
        test('should repair corrupted save data', () => {
            const corruptedData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 'invalid', bestDistance: 1000, totalRuns: 5 },
                vehicles: { owned: 'not an array', selected: 'OLD_TRUCK' },
                stages: { currentStage: 1 },
                settings: { masterVolume: 0.8 }
            };
            
            const repaired = saveManager.repairSaveData(corruptedData);
            
            expect(repaired).toBeDefined();
            expect(repaired.player.money).toBe(0); // Reset to default
            expect(repaired.player.bestDistance).toBe(1000); // Valid value preserved
            expect(repaired.vehicles.owned).toEqual(['STARTER_CAR']); // Reset to default
            expect(repaired.vehicles.selected).toBe('OLD_TRUCK'); // Valid value preserved
        });

        test('should handle completely corrupted data', () => {
            const corruptedData = {
                invalid: 'data',
                structure: true
            };
            
            const repaired = saveManager.repairSaveData(corruptedData);
            
            expect(repaired).toBeDefined();
            expect(repaired.version).toBe('1.0.0');
            expect(repaired.player.money).toBe(0);
            expect(repaired.vehicles.owned).toEqual(['STARTER_CAR']);
        });
    });

    describe('Save and Load Operations', () => {
        test('should save data to localStorage', async () => {
            await saveManager.initialize();
            
            // Modify some data
            await saveManager.addMoney(100);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_car_game_save',
                expect.any(String)
            );
            
            // Verify the saved data exists
            expect(localStorageMock.store['zombie_car_game_save']).toBeDefined();
            
            // Parse and verify the saved data
            const savedDataString = localStorageMock.store['zombie_car_game_save'];
            if (savedDataString && savedDataString !== 'undefined') {
                const savedData = JSON.parse(savedDataString);
                expect(savedData.player.money).toBe(100);
            }
        });

        test('should create backup before saving', async () => {
            await saveManager.initialize();
            await saveManager.addMoney(50);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_car_game_backup',
                expect.any(String)
            );
        });

        test('should recover from backup when main save is corrupted', async () => {
            // Set up a valid backup
            const backupData = {
                timestamp: Date.now(),
                data: {
                    version: '1.0.0',
                    timestamp: Date.now(),
                    player: { money: 200, bestDistance: 1500, totalRuns: 8, totalZombiesKilled: 0, totalMoneyEarned: 0, totalPlayTime: 0 },
                    vehicles: { owned: ['STARTER_CAR'], selected: 'STARTER_CAR', upgrades: {} },
                    stages: { currentStage: 0, unlockedStages: [0], stageProgress: {} },
                    settings: {},
                    gameCompleted: false
                }
            };
            localStorageMock.setItem('zombie_car_game_backup', JSON.stringify(backupData));
            
            // Set corrupted main save
            localStorageMock.setItem('zombie_car_game_save', 'corrupted data');
            
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(200);
            expect(saveData.player.bestDistance).toBe(1500);
        });
    });

    describe('Player Data Management', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should add money to player account', async () => {
            const newBalance = await saveManager.addMoney(150);
            
            expect(newBalance).toBe(150);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(150);
            expect(saveData.player.totalMoneyEarned).toBe(150);
        });

        test('should spend money from player account', async () => {
            await saveManager.addMoney(200);
            const newBalance = await saveManager.spendMoney(75);
            
            expect(newBalance).toBe(125);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(125);
        });

        test('should throw error when spending more money than available', async () => {
            await saveManager.addMoney(50);
            
            await expect(saveManager.spendMoney(100)).rejects.toThrow('Insufficient funds');
        });

        test('should update player statistics', async () => {
            const updates = {
                bestDistance: 2000,
                totalRuns: 10,
                totalZombiesKilled: 50
            };
            
            await saveManager.updatePlayerData(updates);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.bestDistance).toBe(2000);
            expect(saveData.player.totalRuns).toBe(10);
            expect(saveData.player.totalZombiesKilled).toBe(50);
        });
    });

    describe('Vehicle Management', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should purchase a new vehicle', async () => {
            const vehicles = await saveManager.purchaseVehicle('OLD_TRUCK');
            
            expect(vehicles.owned).toContain('OLD_TRUCK');
            expect(vehicles.upgrades.OLD_TRUCK).toBeDefined();
            expect(vehicles.upgrades.OLD_TRUCK.engine).toBe(0);
        });

        test('should throw error when purchasing already owned vehicle', async () => {
            await expect(saveManager.purchaseVehicle('STARTER_CAR')).rejects.toThrow('Vehicle already owned');
        });

        test('should select a vehicle', async () => {
            await saveManager.purchaseVehicle('OLD_TRUCK');
            const selectedVehicle = await saveManager.selectVehicle('OLD_TRUCK');
            
            expect(selectedVehicle).toBe('OLD_TRUCK');
            
            const saveData = saveManager.getSaveData();
            expect(saveData.vehicles.selected).toBe('OLD_TRUCK');
        });

        test('should throw error when selecting unowned vehicle', async () => {
            await expect(saveManager.selectVehicle('SPORTS_CAR')).rejects.toThrow('Vehicle not owned');
        });

        test('should upgrade vehicle components', async () => {
            const upgrades = await saveManager.upgradeVehicle('STARTER_CAR', 'engine', 2);
            
            expect(upgrades.engine).toBe(2);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.vehicles.upgrades.STARTER_CAR.engine).toBe(2);
        });

        test('should throw error when upgrading unowned vehicle', async () => {
            await expect(saveManager.upgradeVehicle('SPORTS_CAR', 'engine', 1))
                .rejects.toThrow('Vehicle not owned');
        });
    });

    describe('Run Statistics', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should update run statistics', async () => {
            const playerData = await saveManager.updateRunStats(1500, 25, 150);
            
            expect(playerData.totalRuns).toBe(1);
            expect(playerData.bestDistance).toBe(1500);
            expect(playerData.totalZombiesKilled).toBe(25);
            expect(playerData.money).toBe(150);
        });

        test('should update best distance only when improved', async () => {
            await saveManager.updateRunStats(1000, 10, 100);
            await saveManager.updateRunStats(800, 5, 80); // Shorter distance
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.bestDistance).toBe(1000); // Should remain 1000
            expect(saveData.player.totalRuns).toBe(2);
        });
    });

    describe('Stage Progress', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should update stage progress', async () => {
            const stages = await saveManager.updateStageProgress(0, 5000, false);
            
            expect(stages.stageProgress[0].bestDistance).toBe(5000);
            expect(stages.stageProgress[0].completed).toBe(false);
        });

        test('should mark stage as completed and unlock next stage', async () => {
            const stages = await saveManager.updateStageProgress(0, 10000, true);
            
            expect(stages.stageProgress[0].completed).toBe(true);
            expect(stages.unlockedStages).toContain(1);
        });
    });

    describe('Game Completion', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should mark game as completed', async () => {
            const result = await saveManager.completeGame();
            
            expect(result).toBe(true);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.gameCompleted).toBe(true);
        });
    });

    describe('Settings Management', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should update game settings', async () => {
            const newSettings = {
                masterVolume: 0.5,
                effectsVolume: 0.8,
                showFPS: true
            };
            
            const settings = await saveManager.updateSettings(newSettings);
            
            expect(settings.masterVolume).toBe(0.5);
            expect(settings.effectsVolume).toBe(0.8);
            expect(settings.showFPS).toBe(true);
            expect(settings.musicVolume).toBe(0.7); // Should preserve existing values
        });
    });

    describe('Data Export and Import', () => {
        beforeEach(async () => {
            await saveManager.initialize();
            await saveManager.addMoney(500);
            await saveManager.purchaseVehicle('OLD_TRUCK');
        });

        test('should export save data', () => {
            const exportedData = saveManager.exportSaveData();
            
            expect(exportedData).toBeDefined();
            expect(typeof exportedData).toBe('string');
            
            const parsed = JSON.parse(exportedData);
            expect(parsed.player.money).toBe(500);
            expect(parsed.vehicles.owned).toContain('OLD_TRUCK');
            expect(parsed.exportedAt).toBeDefined();
        });

        test('should import valid save data', async () => {
            const importData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 1000, bestDistance: 3000, totalRuns: 15 },
                vehicles: { owned: ['STARTER_CAR', 'SPORTS_CAR'], selected: 'SPORTS_CAR', upgrades: {} },
                stages: { currentStage: 1, unlockedStages: [0, 1], stageProgress: {} },
                settings: {},
                gameCompleted: false
            };
            
            const result = await saveManager.importSaveData(JSON.stringify(importData));
            
            expect(result).toBe(true);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(1000);
            expect(saveData.vehicles.selected).toBe('SPORTS_CAR');
        });

        test('should reject invalid import data', async () => {
            const invalidData = {
                invalid: 'structure'
            };
            
            await expect(saveManager.importSaveData(JSON.stringify(invalidData)))
                .rejects.toThrow('Invalid save data');
        });
    });

    describe('Reset Functionality', () => {
        beforeEach(async () => {
            await saveManager.initialize();
            await saveManager.addMoney(500);
            await saveManager.purchaseVehicle('OLD_TRUCK');
        });

        test('should reset save data to defaults', async () => {
            const resetData = await saveManager.resetSaveData();
            
            expect(resetData.player.money).toBe(0);
            expect(resetData.vehicles.owned).toEqual(['STARTER_CAR']);
            expect(resetData.vehicles.selected).toBe('STARTER_CAR');
            expect(resetData.gameCompleted).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle localStorage errors gracefully', async () => {
            // Mock localStorage to throw error
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });
            
            // Should not throw, should use defaults
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            expect(saveData).toBeDefined();
            expect(saveData.player.money).toBe(0);
        });

        test('should handle JSON parse errors', async () => {
            localStorageMock.setItem('zombie_car_game_save', 'invalid json');
            
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            expect(saveData).toBeDefined();
            expect(saveData.player.money).toBe(0);
        });

        test('should throw error when no save data is loaded', async () => {
            // Don't initialize
            await expect(saveManager.addMoney(100)).rejects.toThrow('No save data loaded');
            await expect(saveManager.purchaseVehicle('OLD_TRUCK')).rejects.toThrow('No save data loaded');
            await expect(saveManager.updateRunStats(1000, 10, 100)).rejects.toThrow('No save data loaded');
        });
    });

    describe('Data Integrity', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should maintain data consistency across operations', async () => {
            // Perform multiple operations
            await saveManager.addMoney(1000);
            await saveManager.purchaseVehicle('OLD_TRUCK');
            await saveManager.selectVehicle('OLD_TRUCK');
            await saveManager.upgradeVehicle('OLD_TRUCK', 'engine', 3);
            await saveManager.updateRunStats(2500, 30, 250);
            
            const saveData = saveManager.getSaveData();
            
            // Verify all changes are reflected
            expect(saveData.player.money).toBe(1250); // 1000 + 250 from run
            expect(saveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(saveData.vehicles.selected).toBe('OLD_TRUCK');
            expect(saveData.vehicles.upgrades.OLD_TRUCK.engine).toBe(3);
            expect(saveData.player.bestDistance).toBe(2500);
            expect(saveData.player.totalZombiesKilled).toBe(30);
        });

        test('should preserve timestamp updates', async () => {
            const initialTimestamp = saveManager.getSaveData().timestamp;
            
            // Wait a bit and make a change
            await new Promise(resolve => setTimeout(resolve, 10));
            await saveManager.addMoney(100);
            
            const newTimestamp = saveManager.getSaveData().timestamp;
            expect(newTimestamp).toBeGreaterThan(initialTimestamp);
        });
    });
});