/**
 * Integration tests for the complete save system
 * Tests the interaction between SaveManager and GameDataModels
 */

import { ZombieCarSaveManager } from '../ZombieCarSaveManager.js';
import { VehicleTypes, UpgradeConfig, GameDataUtils } from '../GameDataModels.js';

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

describe('Save System Integration', () => {
    let saveManager;

    beforeEach(() => {
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        saveManager = new ZombieCarSaveManager();
    });

    describe('Complete Game Flow', () => {
        test('should handle a complete game progression flow', async () => {
            // Initialize save system
            await saveManager.initialize();
            
            // Verify initial state
            let saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(0);
            expect(saveData.vehicles.owned).toEqual(['STARTER_CAR']);
            expect(saveData.vehicles.selected).toBe('STARTER_CAR');
            
            // Simulate first run
            await saveManager.updateRunStats(1500, 25, 150);
            
            saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(150);
            expect(saveData.player.bestDistance).toBe(1500);
            expect(saveData.player.totalRuns).toBe(1);
            expect(saveData.player.totalZombiesKilled).toBe(25);
            
            // Purchase vehicle upgrades
            await saveManager.spendMoney(100);
            await saveManager.upgradeVehicle('STARTER_CAR', 'engine', 1);
            
            saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(50);
            expect(saveData.vehicles.upgrades.STARTER_CAR.engine).toBe(1);
            
            // Purchase new vehicle
            await saveManager.addMoney(500);
            await saveManager.purchaseVehicle('OLD_TRUCK');
            await saveManager.selectVehicle('OLD_TRUCK');
            
            saveData = saveManager.getSaveData();
            expect(saveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(saveData.vehicles.selected).toBe('OLD_TRUCK');
            expect(saveData.vehicles.upgrades.OLD_TRUCK).toBeDefined();
            
            // Update stage progress
            await saveManager.updateStageProgress(0, 8000, false);
            await saveManager.updateStageProgress(0, 10000, true); // Complete stage
            
            saveData = saveManager.getSaveData();
            expect(saveData.stages.stageProgress[0].bestDistance).toBe(10000);
            expect(saveData.stages.stageProgress[0].completed).toBe(true);
            expect(saveData.stages.unlockedStages).toContain(1);
            
            // Verify data persistence
            const exportedData = saveManager.exportSaveData();
            expect(exportedData).toBeDefined();
            
            const parsedExport = JSON.parse(exportedData);
            expect(parsedExport.player.money).toBe(550);
            expect(parsedExport.vehicles.selected).toBe('OLD_TRUCK');
            expect(parsedExport.stages.stageProgress[0].completed).toBe(true);
        });

        test('should maintain data consistency across save/load cycles', async () => {
            // Initialize and set up some data
            await saveManager.initialize();
            await saveManager.addMoney(1000);
            await saveManager.purchaseVehicle('SPORTS_CAR');
            await saveManager.upgradeVehicle('SPORTS_CAR', 'engine', 3);
            await saveManager.updateRunStats(5000, 100, 500);
            
            // Get current state
            const originalData = saveManager.getSaveData();
            
            // Verify the original data is correct
            expect(originalData.player.money).toBe(1500); // 1000 + 500 from run
            expect(originalData.vehicles.owned).toContain('SPORTS_CAR');
            expect(originalData.vehicles.upgrades.SPORTS_CAR.engine).toBe(3);
            expect(originalData.player.bestDistance).toBe(5000);
            
            // Create new save manager instance (simulating app restart)
            const newSaveManager = new ZombieCarSaveManager();
            await newSaveManager.initialize();
            
            // Verify data was loaded correctly
            const loadedData = newSaveManager.getSaveData();
            expect(loadedData.player.money).toBe(originalData.player.money);
            expect(loadedData.vehicles.owned).toEqual(originalData.vehicles.owned);
            expect(loadedData.vehicles.upgrades.SPORTS_CAR.engine).toBe(3);
            expect(loadedData.player.bestDistance).toBe(5000);
        });
    });

    describe('Game Data Model Integration', () => {
        beforeEach(async () => {
            await saveManager.initialize();
        });

        test('should correctly calculate upgrade costs using game data models', async () => {
            await saveManager.purchaseVehicle('OLD_TRUCK');
            
            // Calculate expected cost using game data models
            const baseCost = UpgradeConfig.baseCosts.engine;
            const expectedCost = Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, 0));
            
            // Verify the cost calculation matches
            expect(expectedCost).toBe(baseCost); // Level 0 -> 1 should be base cost
            
            // Test with higher level
            await saveManager.upgradeVehicle('OLD_TRUCK', 'engine', 1);
            await saveManager.upgradeVehicle('OLD_TRUCK', 'engine', 2);
            
            const level2Cost = Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, 2));
            expect(level2Cost).toBeGreaterThan(baseCost);
        });

        test('should use vehicle unlock requirements correctly', async () => {
            const saveData = saveManager.getSaveData();
            
            // Check unlock status for different vehicles
            const starterStatus = GameDataUtils.getVehicleUnlockStatus('STARTER_CAR', saveData.player);
            expect(starterStatus.unlocked).toBe(true);
            
            const sportsCarStatus = GameDataUtils.getVehicleUnlockStatus('SPORTS_CAR', saveData.player);
            expect(sportsCarStatus.unlocked).toBe(false);
            expect(sportsCarStatus.distanceRequired).toBe(VehicleTypes.SPORTS_CAR.unlockDistance);
            
            // Update distance and check again
            await saveManager.updateRunStats(3000, 50, 300);
            const updatedData = saveManager.getSaveData();
            const updatedStatus = GameDataUtils.getVehicleUnlockStatus('SPORTS_CAR', updatedData.player);
            expect(updatedStatus.unlocked).toBe(true);
        });

        test('should calculate money from distance using game balance', async () => {
            const distance = 2000;
            const expectedMoney = GameDataUtils.calculateMoneyFromDistance(distance, 0);
            
            // Simulate a run and verify money calculation
            await saveManager.updateRunStats(distance, 30, expectedMoney);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(expectedMoney);
            expect(saveData.player.totalMoneyEarned).toBe(expectedMoney);
        });

        test('should handle milestone bonuses correctly', async () => {
            const distance = 5000; // Should trigger milestone bonus
            const baseMoney = GameDataUtils.calculateMoneyFromDistance(distance, 0);
            const milestoneBonus = GameDataUtils.getMilestoneBonus(distance);
            
            expect(milestoneBonus).toBeGreaterThan(0);
            
            // Simulate run with milestone
            const totalMoney = baseMoney + milestoneBonus;
            await saveManager.updateRunStats(distance, 40, totalMoney);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(totalMoney);
        });
    });

    describe('Error Recovery Integration', () => {
        test('should recover from corrupted data using game data models', async () => {
            // Set up corrupted save data
            const corruptedSave = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 'invalid', bestDistance: -100 },
                vehicles: { owned: 'not an array', selected: null },
                stages: { currentStage: 'invalid' },
                settings: null,
                gameCompleted: 'not a boolean'
            };
            
            localStorageMock.setItem('zombie_car_game_save', JSON.stringify(corruptedSave));
            
            // Initialize should repair the data
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            
            // Verify data was repaired to valid defaults
            expect(saveData.player.money).toBe(0);
            expect(saveData.vehicles.owned).toEqual(['STARTER_CAR']);
            expect(saveData.vehicles.selected).toBe('STARTER_CAR');
            expect(saveData.stages.currentStage).toBe(0);
            expect(typeof saveData.gameCompleted).toBe('boolean');
        });

        test('should maintain game balance after data repair', async () => {
            // Create partially corrupted data with some valid values
            const partiallyCorrrupted = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { money: 500, bestDistance: 2000, totalRuns: 'invalid' },
                vehicles: { owned: ['STARTER_CAR', 'OLD_TRUCK'], selected: 'OLD_TRUCK', upgrades: {} },
                stages: { currentStage: 1, unlockedStages: [0, 1], stageProgress: {} },
                settings: {},
                gameCompleted: false
            };
            
            localStorageMock.setItem('zombie_car_game_save', JSON.stringify(partiallyCorrrupted));
            
            await saveManager.initialize();
            
            const saveData = saveManager.getSaveData();
            
            // Valid data should be preserved
            expect(saveData.player.money).toBe(500);
            expect(saveData.player.bestDistance).toBe(2000);
            expect(saveData.vehicles.selected).toBe('OLD_TRUCK');
            
            // Invalid data should be reset to defaults
            expect(saveData.player.totalRuns).toBe(0);
            
            // Should still be able to perform game operations
            await saveManager.addMoney(100);
            await saveManager.upgradeVehicle('OLD_TRUCK', 'engine', 1);
            
            const updatedData = saveManager.getSaveData();
            expect(updatedData.player.money).toBe(600);
            expect(updatedData.vehicles.upgrades.OLD_TRUCK.engine).toBe(1);
        });
    });

    describe('Performance and Reliability', () => {
        test('should handle rapid save operations without data corruption', async () => {
            await saveManager.initialize();
            
            // Perform rapid operations
            const operations = [];
            for (let i = 0; i < 10; i++) {
                operations.push(saveManager.addMoney(10));
                operations.push(saveManager.updateRunStats(100 * i, i, 10));
            }
            
            await Promise.all(operations);
            
            const saveData = saveManager.getSaveData();
            expect(saveData.player.money).toBe(200); // 10 * 10 + 10 * 10
            expect(saveData.player.totalRuns).toBe(10);
            expect(saveData.player.bestDistance).toBe(900); // Highest distance from loop
        });

        test('should maintain data integrity with concurrent operations', async () => {
            await saveManager.initialize();
            
            // Simulate concurrent game operations
            const concurrentOps = [
                saveManager.addMoney(500),
                saveManager.purchaseVehicle('OLD_TRUCK'),
                saveManager.updateRunStats(1500, 25, 150),
                saveManager.updateStageProgress(0, 1500, false)
            ];
            
            await Promise.all(concurrentOps);
            
            const saveData = saveManager.getSaveData();
            
            // All operations should have completed successfully
            expect(saveData.player.money).toBe(650); // 500 + 150
            expect(saveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(saveData.player.bestDistance).toBe(1500);
            expect(saveData.stages.stageProgress[0].bestDistance).toBe(1500);
        });
    });
});