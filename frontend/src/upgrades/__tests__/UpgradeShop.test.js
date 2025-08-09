/**
 * Unit tests for UpgradeShop class
 */

import UpgradeShop from '../UpgradeShop.js';
import { VehicleTypes, UpgradeConfig } from '../../save/GameDataModels.js';

// Mock SaveManager
class MockSaveManager {
    constructor(initialData = null) {
        this.saveData = initialData || {
            player: {
                money: 1000,
                bestDistance: 5000,
                totalRuns: 10,
                totalZombiesKilled: 50,
                averageRunDistance: 2000,
                longestSurvivalTime: 300,
                totalObstaclesHit: 25
            },
            vehicles: {
                owned: ['STARTER_CAR', 'OLD_TRUCK'],
                selected: 'STARTER_CAR',
                upgrades: {
                    STARTER_CAR: {
                        engine: 1,
                        fuel: 0,
                        armor: 2,
                        weapon: 0,
                        wheels: 1
                    },
                    OLD_TRUCK: {
                        engine: 0,
                        fuel: 1,
                        armor: 0,
                        weapon: 0,
                        wheels: 0
                    }
                }
            }
        };
    }
    
    getSaveData() {
        return this.saveData;
    }
    
    saveToDisk() {
        // Mock save operation
        return true;
    }
}

describe('UpgradeShop', () => {
    let upgradeShop;
    let mockSaveManager;
    
    beforeEach(() => {
        mockSaveManager = new MockSaveManager();
        upgradeShop = new UpgradeShop(mockSaveManager);
    });
    
    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(upgradeShop.categories).toEqual(UpgradeConfig.categories);
            expect(upgradeShop.maxLevel).toBe(UpgradeConfig.maxLevel);
            expect(upgradeShop.baseCosts).toEqual(UpgradeConfig.baseCosts);
            expect(upgradeShop.costMultiplier).toBe(UpgradeConfig.costMultiplier);
        });
        
        test('should initialize event listeners map', () => {
            expect(upgradeShop.listeners).toBeInstanceOf(Map);
            expect(upgradeShop.listeners.size).toBe(0);
        });
    });
    
    describe('getUpgradeCategories', () => {
        test('should return all upgrade categories with correct information', () => {
            const categories = upgradeShop.getUpgradeCategories();
            
            expect(categories).toHaveLength(UpgradeConfig.categories.length);
            
            categories.forEach(category => {
                expect(category).toHaveProperty('id');
                expect(category).toHaveProperty('name');
                expect(category).toHaveProperty('description');
                expect(category).toHaveProperty('icon');
                expect(category).toHaveProperty('visual');
                expect(category).toHaveProperty('statAffected');
                expect(category).toHaveProperty('multiplier');
                
                expect(UpgradeConfig.categories).toContain(category.id);
            });
        });
    });
    
    describe('calculateUpgradeCost', () => {
        test('should calculate correct cost for level 0', () => {
            const cost = upgradeShop.calculateUpgradeCost('engine', 0);
            expect(cost).toBe(UpgradeConfig.baseCosts.engine);
        });
        
        test('should calculate correct cost for higher levels', () => {
            const cost = upgradeShop.calculateUpgradeCost('engine', 2);
            const expectedCost = Math.round(UpgradeConfig.baseCosts.engine * Math.pow(UpgradeConfig.costMultiplier, 2));
            expect(cost).toBe(expectedCost);
        });
        
        test('should return null for max level', () => {
            const cost = upgradeShop.calculateUpgradeCost('engine', UpgradeConfig.maxLevel);
            expect(cost).toBeNull();
        });
        
        test('should handle all categories', () => {
            UpgradeConfig.categories.forEach(category => {
                const cost = upgradeShop.calculateUpgradeCost(category, 0);
                expect(cost).toBe(UpgradeConfig.baseCosts[category]);
            });
        });
    });
    
    describe('calculateUpgradeEffect', () => {
        test('should return 0 for level 0', () => {
            const baseStats = VehicleTypes.STARTER_CAR.baseStats;
            const effect = upgradeShop.calculateUpgradeEffect('engine', 0, baseStats);
            expect(effect).toBe(0);
        });
        
        test('should calculate correct effect for level 1', () => {
            const baseStats = VehicleTypes.STARTER_CAR.baseStats;
            const effect = upgradeShop.calculateUpgradeEffect('engine', 1, baseStats);
            
            const expectedMultiplier = 1 + UpgradeConfig.effects.engine.multiplier;
            const expectedValue = Math.round(baseStats.engine * expectedMultiplier);
            const expectedEffect = expectedValue - baseStats.engine;
            
            expect(effect).toBe(expectedEffect);
        });
        
        test('should calculate correct effect for higher levels', () => {
            const baseStats = VehicleTypes.STARTER_CAR.baseStats;
            const effect = upgradeShop.calculateUpgradeEffect('engine', 3, baseStats);
            
            const expectedMultiplier = 1 + (UpgradeConfig.effects.engine.multiplier * 3);
            const expectedValue = Math.round(baseStats.engine * expectedMultiplier);
            const expectedEffect = expectedValue - baseStats.engine;
            
            expect(effect).toBe(expectedEffect);
        });
    });
    
    describe('getUpgradeInfo', () => {
        test('should return complete upgrade information', () => {
            const info = upgradeShop.getUpgradeInfo('STARTER_CAR', 'engine');
            
            expect(info).toHaveProperty('category', 'engine');
            expect(info).toHaveProperty('vehicleType', 'STARTER_CAR');
            expect(info).toHaveProperty('currentLevel', 1); // From mock data
            expect(info).toHaveProperty('maxLevel', UpgradeConfig.maxLevel);
            expect(info).toHaveProperty('cost');
            expect(info).toHaveProperty('nextLevelCost');
            expect(info).toHaveProperty('canUpgrade');
            expect(info).toHaveProperty('canAfford');
            expect(info).toHaveProperty('currentEffect');
            expect(info).toHaveProperty('nextLevelEffect');
            expect(info).toHaveProperty('effectIncrease');
            expect(info).toHaveProperty('description');
            expect(info).toHaveProperty('visual');
            expect(info).toHaveProperty('isMaxLevel');
        });
        
        test('should throw error for invalid category', () => {
            expect(() => {
                upgradeShop.getUpgradeInfo('STARTER_CAR', 'invalid_category');
            }).toThrow('Invalid upgrade category: invalid_category');
        });
        
        test('should throw error for invalid vehicle type', () => {
            expect(() => {
                upgradeShop.getUpgradeInfo('INVALID_VEHICLE', 'engine');
            }).toThrow('Invalid vehicle type: INVALID_VEHICLE');
        });
    });
    
    describe('canUpgrade', () => {
        test('should return true for valid upgrade', () => {
            const result = upgradeShop.canUpgrade('STARTER_CAR', 'fuel');
            expect(result.canUpgrade).toBe(true);
        });
        
        test('should return false for unowned vehicle', () => {
            const result = upgradeShop.canUpgrade('SPORTS_CAR', 'engine');
            expect(result.canUpgrade).toBe(false);
            expect(result.reason).toBe('Vehicle not owned');
        });
        
        test('should return false for max level', () => {
            // Set engine to max level
            mockSaveManager.saveData.vehicles.upgrades.STARTER_CAR.engine = UpgradeConfig.maxLevel;
            
            const result = upgradeShop.canUpgrade('STARTER_CAR', 'engine');
            expect(result.canUpgrade).toBe(false);
            expect(result.reason).toBe('Max level reached');
        });
    });
    
    describe('canAffordUpgrade', () => {
        test('should return true when player can afford upgrade', () => {
            const result = upgradeShop.canAffordUpgrade('STARTER_CAR', 'fuel');
            expect(result.canUpgrade).toBe(true);
            expect(result).toHaveProperty('cost');
        });
        
        test('should return false when player cannot afford upgrade', () => {
            // Set money to 0
            mockSaveManager.saveData.player.money = 0;
            
            const result = upgradeShop.canAffordUpgrade('STARTER_CAR', 'fuel');
            expect(result.canUpgrade).toBe(false);
            expect(result.reason).toBe('Insufficient funds');
            expect(result).toHaveProperty('required');
            expect(result).toHaveProperty('available');
            expect(result).toHaveProperty('shortfall');
        });
        
        test('should inherit canUpgrade restrictions', () => {
            const result = upgradeShop.canAffordUpgrade('SPORTS_CAR', 'engine');
            expect(result.canUpgrade).toBe(false);
            expect(result.reason).toBe('Vehicle not owned');
        });
    });
    
    describe('purchaseUpgrade', () => {
        test('should successfully purchase upgrade', () => {
            const initialMoney = mockSaveManager.saveData.player.money;
            const initialLevel = mockSaveManager.saveData.vehicles.upgrades.STARTER_CAR.fuel;
            const expectedCost = upgradeShop.calculateUpgradeCost('fuel', initialLevel);
            
            const result = upgradeShop.purchaseUpgrade('STARTER_CAR', 'fuel');
            
            expect(result.success).toBe(true);
            expect(result.vehicleType).toBe('STARTER_CAR');
            expect(result.category).toBe('fuel');
            expect(result.oldLevel).toBe(initialLevel);
            expect(result.newLevel).toBe(initialLevel + 1);
            expect(result.cost).toBe(expectedCost);
            expect(result.remainingMoney).toBe(initialMoney - expectedCost);
            
            // Check that save data was updated
            expect(mockSaveManager.saveData.player.money).toBe(initialMoney - expectedCost);
            expect(mockSaveManager.saveData.vehicles.upgrades.STARTER_CAR.fuel).toBe(initialLevel + 1);
        });
        
        test('should throw error when upgrade cannot be afforded', () => {
            mockSaveManager.saveData.player.money = 0;
            
            expect(() => {
                upgradeShop.purchaseUpgrade('STARTER_CAR', 'fuel');
            }).toThrow('Cannot purchase upgrade: Insufficient funds');
        });
        
        test('should throw error for invalid upgrade', () => {
            expect(() => {
                upgradeShop.purchaseUpgrade('SPORTS_CAR', 'engine');
            }).toThrow('Cannot purchase upgrade: Vehicle not owned');
        });
        
        test('should initialize vehicle upgrades if not exists', () => {
            // Add a new vehicle without upgrades
            mockSaveManager.saveData.vehicles.owned.push('SPORTS_CAR');
            delete mockSaveManager.saveData.vehicles.upgrades.SPORTS_CAR;
            
            const result = upgradeShop.purchaseUpgrade('SPORTS_CAR', 'engine');
            
            expect(result.success).toBe(true);
            expect(mockSaveManager.saveData.vehicles.upgrades.SPORTS_CAR).toBeDefined();
            expect(mockSaveManager.saveData.vehicles.upgrades.SPORTS_CAR.engine).toBe(1);
        });
    });
    
    describe('getVisualChanges', () => {
        test('should return visual changes for engine upgrades', () => {
            const changes = upgradeShop.getVisualChanges('STARTER_CAR', 'engine', 3);
            
            expect(changes).toHaveLength(2); // exhaust_enhancement + turbo_charger
            expect(changes[0].type).toBe('exhaust_enhancement');
            expect(changes[0].level).toBe(3);
            expect(changes[1].type).toBe('turbo_charger');
            expect(changes[1].level).toBe(1);
        });
        
        test('should return visual changes for armor upgrades', () => {
            const changes = upgradeShop.getVisualChanges('STARTER_CAR', 'armor', 4);
            
            expect(changes).toHaveLength(3); // armor_plating + reinforced_bumper + roll_cage
            expect(changes.some(c => c.type === 'armor_plating')).toBe(true);
            expect(changes.some(c => c.type === 'reinforced_bumper')).toBe(true);
            expect(changes.some(c => c.type === 'roll_cage')).toBe(true);
        });
        
        test('should return visual changes for weapon upgrades', () => {
            const changes = upgradeShop.getVisualChanges('STARTER_CAR', 'weapon', 5);
            
            expect(changes).toHaveLength(4); // All weapon visual changes
            expect(changes.some(c => c.type === 'roof_mounted_gun')).toBe(true);
            expect(changes.some(c => c.type === 'gun_turret')).toBe(true);
            expect(changes.some(c => c.type === 'dual_weapons')).toBe(true);
        });
    });
    
    describe('getPerformanceChanges', () => {
        test('should calculate performance changes correctly', () => {
            const changes = upgradeShop.getPerformanceChanges('STARTER_CAR', 'engine', 1, 2);
            
            expect(changes).toHaveProperty('category', 'engine');
            expect(changes).toHaveProperty('oldLevel', 1);
            expect(changes).toHaveProperty('newLevel', 2);
            expect(changes).toHaveProperty('improvement');
            expect(changes).toHaveProperty('percentage');
            expect(changes).toHaveProperty('metrics');
            
            expect(changes.metrics).toHaveProperty('acceleration');
            expect(changes.metrics).toHaveProperty('topSpeed');
            expect(changes.metrics).toHaveProperty('fuelConsumption');
        });
        
        test('should handle different categories correctly', () => {
            const fuelChanges = upgradeShop.getPerformanceChanges('STARTER_CAR', 'fuel', 0, 1);
            expect(fuelChanges.metrics).toHaveProperty('fuelCapacity');
            expect(fuelChanges.metrics).toHaveProperty('range');
            
            const armorChanges = upgradeShop.getPerformanceChanges('STARTER_CAR', 'armor', 0, 1);
            expect(armorChanges.metrics).toHaveProperty('damageReduction');
            expect(armorChanges.metrics).toHaveProperty('durability');
        });
    });
    
    describe('getTotalUpgradeCost', () => {
        test('should calculate total upgrade costs correctly', () => {
            const costInfo = upgradeShop.getTotalUpgradeCost('STARTER_CAR');
            
            expect(costInfo).toHaveProperty('totalSpent');
            expect(costInfo).toHaveProperty('totalRemaining');
            expect(costInfo).toHaveProperty('totalToMax');
            expect(costInfo).toHaveProperty('completionPercentage');
            
            expect(costInfo.totalSpent).toBeGreaterThan(0); // Has some upgrades
            expect(costInfo.totalRemaining).toBeGreaterThan(0); // Not maxed out
            expect(costInfo.totalToMax).toBe(costInfo.totalSpent + costInfo.totalRemaining);
        });
        
        test('should handle vehicle with no upgrades', () => {
            const costInfo = upgradeShop.getTotalUpgradeCost('OLD_TRUCK');
            
            expect(costInfo.totalSpent).toBeGreaterThanOrEqual(0);
            expect(costInfo.totalRemaining).toBeGreaterThan(0);
        });
    });
    
    describe('getUpgradeRecommendations', () => {
        test('should provide recommendations based on player stats', () => {
            const recommendations = upgradeShop.getUpgradeRecommendations('STARTER_CAR', mockSaveManager.saveData.player);
            
            expect(Array.isArray(recommendations)).toBe(true);
            
            recommendations.forEach(rec => {
                expect(rec).toHaveProperty('category');
                expect(rec).toHaveProperty('priority');
                expect(rec).toHaveProperty('reason');
                expect(rec).toHaveProperty('expectedBenefit');
                expect(['high', 'medium', 'low']).toContain(rec.priority);
            });
        });
        
        test('should prioritize recommendations correctly', () => {
            const recommendations = upgradeShop.getUpgradeRecommendations('STARTER_CAR', mockSaveManager.saveData.player);
            
            // Should be sorted by priority (high to low)
            for (let i = 0; i < recommendations.length - 1; i++) {
                const currentPriority = recommendations[i].priority;
                const nextPriority = recommendations[i + 1].priority;
                
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                expect(priorityOrder[currentPriority]).toBeGreaterThanOrEqual(priorityOrder[nextPriority]);
            }
        });
    });
    
    describe('getShopStatistics', () => {
        test('should return comprehensive shop statistics', () => {
            const stats = upgradeShop.getShopStatistics();
            
            expect(stats).toHaveProperty('totalUpgrades');
            expect(stats).toHaveProperty('maxPossibleUpgrades');
            expect(stats).toHaveProperty('totalSpent');
            expect(stats).toHaveProperty('upgradeCompletionPercentage');
            expect(stats).toHaveProperty('averageUpgradeLevel');
            expect(stats).toHaveProperty('ownedVehicles');
            expect(stats).toHaveProperty('fullyUpgradedVehicles');
            
            expect(stats.totalUpgrades).toBeGreaterThan(0);
            expect(stats.maxPossibleUpgrades).toBeGreaterThan(0);
            expect(stats.ownedVehicles).toBe(2); // STARTER_CAR and OLD_TRUCK
        });
    });
    
    describe('resetVehicleUpgrades', () => {
        test('should reset upgrades and provide refund', () => {
            const initialMoney = mockSaveManager.saveData.player.money;
            const costInfo = upgradeShop.getTotalUpgradeCost('STARTER_CAR');
            const expectedRefund = Math.round(costInfo.totalSpent * 0.75);
            
            const result = upgradeShop.resetVehicleUpgrades('STARTER_CAR');
            
            expect(result.success).toBe(true);
            expect(result.vehicleType).toBe('STARTER_CAR');
            expect(result.refundAmount).toBe(expectedRefund);
            expect(result.newMoney).toBe(initialMoney + expectedRefund);
            
            // Check that upgrades were reset
            const upgrades = mockSaveManager.saveData.vehicles.upgrades.STARTER_CAR;
            Object.values(upgrades).forEach(level => {
                expect(level).toBe(0);
            });
        });
        
        test('should throw error for unowned vehicle', () => {
            expect(() => {
                upgradeShop.resetVehicleUpgrades('SPORTS_CAR');
            }).toThrow('Vehicle SPORTS_CAR is not owned');
        });
    });
    
    describe('Event System', () => {
        test('should add and remove event listeners', () => {
            const callback = jest.fn();
            
            upgradeShop.addEventListener('upgradeCompleted', callback);
            expect(upgradeShop.listeners.get('upgradeCompleted')).toContain(callback);
            
            upgradeShop.removeEventListener('upgradeCompleted', callback);
            expect(upgradeShop.listeners.get('upgradeCompleted')).not.toContain(callback);
        });
        
        test('should emit events correctly', () => {
            const callback = jest.fn();
            const testData = { test: 'data' };
            
            upgradeShop.addEventListener('testEvent', callback);
            upgradeShop.emit('testEvent', testData);
            
            expect(callback).toHaveBeenCalledWith(testData);
        });
        
        test('should emit upgradeCompleted event on purchase', () => {
            const callback = jest.fn();
            upgradeShop.addEventListener('upgradeCompleted', callback);
            
            const result = upgradeShop.purchaseUpgrade('STARTER_CAR', 'fuel');
            
            expect(callback).toHaveBeenCalledWith(result);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle missing upgrade data gracefully', () => {
            delete mockSaveManager.saveData.vehicles.upgrades.STARTER_CAR;
            
            const info = upgradeShop.getUpgradeInfo('STARTER_CAR', 'engine');
            expect(info.currentLevel).toBe(0);
        });
        
        test('should handle empty save data', () => {
            mockSaveManager.saveData = {
                player: { money: 0 },
                vehicles: { owned: [], upgrades: {} }
            };
            
            const stats = upgradeShop.getShopStatistics();
            expect(stats.totalUpgrades).toBe(0);
            expect(stats.ownedVehicles).toBe(0);
        });
        
        test('should handle invalid category gracefully in visual changes', () => {
            const changes = upgradeShop.getVisualChanges('STARTER_CAR', 'invalid', 1);
            expect(Array.isArray(changes)).toBe(true);
            expect(changes).toHaveLength(0);
        });
    });
});