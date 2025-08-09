/**
 * Unit tests for Vehicle System
 * Tests vehicle progression, unlocking, stats calculations, and fuel consumption
 */

import { VehicleSystem, VehicleInstance } from '../VehicleSystem.js';
import { VehicleTypes, UpgradeConfig } from '../../save/GameDataModels.js';

// Mock save manager
const createMockSaveManager = (initialData = {}) => {
    const defaultData = {
        player: {
            money: 1000,
            bestDistance: 0,
            totalRuns: 0,
            totalZombiesKilled: 0,
            totalMoneyEarned: 0
        },
        vehicles: {
            owned: ['STARTER_CAR'],
            selected: 'STARTER_CAR',
            upgrades: {
                STARTER_CAR: {
                    engine: 0,
                    fuel: 0,
                    armor: 0,
                    weapon: 0,
                    wheels: 0
                }
            }
        },
        stages: {
            currentStage: 0,
            unlockedStages: [0]
        }
    };
    
    const saveData = { ...defaultData, ...initialData };
    
    return {
        getSaveData: jest.fn(() => saveData),
        saveGame: jest.fn((data) => {
            Object.assign(saveData, data);
        })
    };
};

describe('VehicleSystem', () => {
    let vehicleSystem;
    let mockSaveManager;
    
    beforeEach(() => {
        mockSaveManager = createMockSaveManager();
        vehicleSystem = new VehicleSystem(mockSaveManager);
    });
    
    describe('Initialization', () => {
        test('should initialize with all vehicle types', () => {
            const allVehicles = vehicleSystem.getAllVehicles();
            expect(allVehicles).toHaveLength(Object.keys(VehicleTypes).length);
            
            Object.keys(VehicleTypes).forEach(vehicleType => {
                expect(vehicleSystem.getVehicle(vehicleType)).toBeDefined();
            });
        });
        
        test('should set starter car as current vehicle by default', () => {
            const currentVehicle = vehicleSystem.getCurrentVehicle();
            expect(currentVehicle.type).toBe('STARTER_CAR');
        });
        
        test('should use saved selected vehicle if available', () => {
            const saveManager = createMockSaveManager({
                vehicles: {
                    owned: ['STARTER_CAR', 'OLD_TRUCK'],
                    selected: 'OLD_TRUCK',
                    upgrades: {
                        STARTER_CAR: { engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0 },
                        OLD_TRUCK: { engine: 1, fuel: 0, armor: 0, weapon: 0, wheels: 0 }
                    }
                }
            });
            
            const system = new VehicleSystem(saveManager);
            expect(system.getCurrentVehicle().type).toBe('OLD_TRUCK');
        });
    });
    
    describe('Vehicle Unlocking', () => {
        test('should check if vehicle is unlocked correctly', () => {
            const playerStats = { bestDistance: 1500, money: 2000 };
            
            // Starter car should always be unlocked
            expect(vehicleSystem.isVehicleUnlocked('STARTER_CAR', playerStats)).toBe(true);
            
            // Old truck requires 1000 distance and ownership
            expect(vehicleSystem.isVehicleUnlocked('OLD_TRUCK', playerStats)).toBe(false); // Not owned
            
            // Add to owned vehicles
            mockSaveManager.getSaveData().vehicles.owned.push('OLD_TRUCK');
            expect(vehicleSystem.isVehicleUnlocked('OLD_TRUCK', playerStats)).toBe(true);
        });
        
        test('should get unlocked vehicles correctly', () => {
            // Initially only starter car should be unlocked
            const unlockedVehicles = vehicleSystem.getUnlockedVehicles();
            expect(unlockedVehicles).toHaveLength(1);
            expect(unlockedVehicles[0].type).toBe('STARTER_CAR');
        });
        
        test('should get locked vehicles correctly', () => {
            const lockedVehicles = vehicleSystem.getLockedVehicles();
            expect(lockedVehicles.length).toBe(Object.keys(VehicleTypes).length - 1);
        });
        
        test('should get vehicle unlock progress', () => {
            const progress = vehicleSystem.getVehicleUnlockProgress();
            
            expect(progress).toHaveLength(Object.keys(VehicleTypes).length);
            
            const starterCarProgress = progress.find(p => p.type === 'STARTER_CAR');
            expect(starterCarProgress.isUnlocked).toBe(true);
            expect(starterCarProgress.isOwned).toBe(true);
            expect(starterCarProgress.canPurchase).toBe(false); // Already owned
            
            const oldTruckProgress = progress.find(p => p.type === 'OLD_TRUCK');
            expect(oldTruckProgress.isUnlocked).toBe(false);
            expect(oldTruckProgress.isOwned).toBe(false);
            expect(oldTruckProgress.distanceProgress).toBe(0); // No distance yet
        });
    });
    
    describe('Vehicle Purchasing', () => {
        test('should check if vehicle can be purchased', () => {
            // Set up player with enough distance and money for old truck
            mockSaveManager.getSaveData().player.bestDistance = 1500;
            mockSaveManager.getSaveData().player.money = 1000;
            
            const canPurchase = vehicleSystem.canPurchaseVehicle('OLD_TRUCK');
            expect(canPurchase.canPurchase).toBe(true);
        });
        
        test('should prevent purchase if already owned', () => {
            mockSaveManager.getSaveData().vehicles.owned.push('OLD_TRUCK');
            
            const canPurchase = vehicleSystem.canPurchaseVehicle('OLD_TRUCK');
            expect(canPurchase.canPurchase).toBe(false);
            expect(canPurchase.reason).toBe('Already owned');
        });
        
        test('should prevent purchase if distance requirement not met', () => {
            mockSaveManager.getSaveData().player.bestDistance = 500; // Less than 1000 required
            mockSaveManager.getSaveData().player.money = 1000;
            
            const canPurchase = vehicleSystem.canPurchaseVehicle('OLD_TRUCK');
            expect(canPurchase.canPurchase).toBe(false);
            expect(canPurchase.reason).toBe('Distance requirement not met');
            expect(canPurchase.requiredDistance).toBe(1000);
            expect(canPurchase.currentDistance).toBe(500);
        });
        
        test('should prevent purchase if insufficient funds', () => {
            mockSaveManager.getSaveData().player.bestDistance = 1500;
            mockSaveManager.getSaveData().player.money = 200; // Less than 500 required
            
            const canPurchase = vehicleSystem.canPurchaseVehicle('OLD_TRUCK');
            expect(canPurchase.canPurchase).toBe(false);
            expect(canPurchase.reason).toBe('Insufficient funds');
            expect(canPurchase.requiredMoney).toBe(500);
            expect(canPurchase.currentMoney).toBe(200);
        });
        
        test('should successfully purchase vehicle', () => {
            mockSaveManager.getSaveData().player.bestDistance = 1500;
            mockSaveManager.getSaveData().player.money = 1000;
            
            const result = vehicleSystem.purchaseVehicle('OLD_TRUCK');
            
            expect(result.success).toBe(true);
            expect(result.vehicleType).toBe('OLD_TRUCK');
            expect(result.cost).toBe(500);
            expect(result.remainingMoney).toBe(500);
            
            // Check that vehicle was added to owned vehicles
            const saveData = mockSaveManager.getSaveData();
            expect(saveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(saveData.vehicles.upgrades.OLD_TRUCK).toBeDefined();
            expect(saveData.player.money).toBe(500);
        });
        
        test('should throw error when trying to purchase invalid vehicle', () => {
            expect(() => {
                vehicleSystem.purchaseVehicle('INVALID_VEHICLE');
            }).toThrow('Cannot purchase vehicle: Invalid vehicle type');
        });
    });
    
    describe('Vehicle Selection', () => {
        test('should select owned vehicle successfully', () => {
            mockSaveManager.getSaveData().vehicles.owned.push('OLD_TRUCK');
            
            const selectedVehicle = vehicleSystem.selectVehicle('OLD_TRUCK');
            
            expect(selectedVehicle.type).toBe('OLD_TRUCK');
            expect(vehicleSystem.getCurrentVehicle().type).toBe('OLD_TRUCK');
            expect(mockSaveManager.getSaveData().vehicles.selected).toBe('OLD_TRUCK');
        });
        
        test('should throw error when selecting unowned vehicle', () => {
            expect(() => {
                vehicleSystem.selectVehicle('OLD_TRUCK');
            }).toThrow('Vehicle OLD_TRUCK is not owned');
        });
        
        test('should throw error when selecting invalid vehicle', () => {
            expect(() => {
                vehicleSystem.selectVehicle('INVALID_VEHICLE');
            }).toThrow('Vehicle type INVALID_VEHICLE not found');
        });
    });
});

describe('VehicleInstance', () => {
    let vehicleInstance;
    let mockSaveManager;
    
    beforeEach(() => {
        mockSaveManager = createMockSaveManager();
        const config = VehicleTypes.STARTER_CAR;
        vehicleInstance = new VehicleInstance('STARTER_CAR', config, mockSaveManager);
    });
    
    describe('Stats Calculations', () => {
        test('should return correct base stats', () => {
            const baseStats = vehicleInstance.getBaseStats();
            expect(baseStats).toEqual(VehicleTypes.STARTER_CAR.baseStats);
        });
        
        test('should calculate effective stats with no upgrades', () => {
            const effectiveStats = vehicleInstance.getEffectiveStats();
            const baseStats = vehicleInstance.getBaseStats();
            
            expect(effectiveStats).toEqual(baseStats);
        });
        
        test('should calculate effective stats with upgrades', () => {
            // Add some upgrades
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = 2;
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.armor = 1;
            
            const effectiveStats = vehicleInstance.getEffectiveStats();
            const baseStats = vehicleInstance.getBaseStats();
            
            // Engine should be improved
            expect(effectiveStats.engine).toBeGreaterThan(baseStats.engine);
            // Armor should be improved
            expect(effectiveStats.armor).toBeGreaterThan(baseStats.armor);
            // Fuel should remain the same (no fuel upgrades)
            expect(effectiveStats.fuel).toBe(baseStats.fuel);
        });
        
        test('should calculate performance metrics correctly', () => {
            const metrics = vehicleInstance.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('acceleration');
            expect(metrics).toHaveProperty('topSpeed');
            expect(metrics).toHaveProperty('handling');
            expect(metrics).toHaveProperty('durability');
            expect(metrics).toHaveProperty('fuelEfficiency');
            expect(metrics).toHaveProperty('combatPower');
            expect(metrics).toHaveProperty('overallRating');
            
            // All metrics should be numbers between 0 and 100
            Object.values(metrics).forEach(metric => {
                expect(typeof metric).toBe('number');
                expect(metric).toBeGreaterThanOrEqual(0);
                expect(metric).toBeLessThanOrEqual(100);
            });
        });
    });
    
    describe('Fuel System', () => {
        test('should initialize with full fuel', () => {
            expect(vehicleInstance.fuel).toBe(vehicleInstance.getFuelCapacity());
            expect(vehicleInstance.getFuelPercentage()).toBe(1);
            expect(vehicleInstance.isOutOfFuel()).toBe(false);
        });
        
        test('should consume fuel when throttling', () => {
            const initialFuel = vehicleInstance.fuel;
            const deltaTime = 1000; // 1 second
            const throttleInput = 0.8;
            
            const stillHasFuel = vehicleInstance.consumeFuel(deltaTime, throttleInput);
            
            expect(stillHasFuel).toBe(true);
            expect(vehicleInstance.fuel).toBeLessThan(initialFuel);
        });
        
        test('should consume less fuel when idling', () => {
            const initialFuel = vehicleInstance.fuel;
            const deltaTime = 1000;
            
            // Consume fuel with no throttle (idling)
            vehicleInstance.consumeFuel(deltaTime, 0);
            const fuelAfterIdling = vehicleInstance.fuel;
            
            // Reset fuel and consume with full throttle
            vehicleInstance.fuel = initialFuel;
            vehicleInstance.consumeFuel(deltaTime, 1.0);
            const fuelAfterFullThrottle = vehicleInstance.fuel;
            
            expect(fuelAfterIdling).toBeGreaterThan(fuelAfterFullThrottle);
        });
        
        test('should not consume fuel when already empty', () => {
            vehicleInstance.fuel = 0;
            
            const stillHasFuel = vehicleInstance.consumeFuel(1000, 1.0);
            
            expect(stillHasFuel).toBe(false);
            expect(vehicleInstance.fuel).toBe(0);
            expect(vehicleInstance.isOutOfFuel()).toBe(true);
        });
        
        test('should refill fuel to capacity', () => {
            vehicleInstance.fuel = 50;
            vehicleInstance.refillFuel();
            
            expect(vehicleInstance.fuel).toBe(vehicleInstance.getFuelCapacity());
            expect(vehicleInstance.getFuelPercentage()).toBe(1);
        });
        
        test('should have increased fuel capacity with upgrades', () => {
            const baseCapacity = vehicleInstance.getFuelCapacity();
            
            // Add fuel upgrades
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.fuel = 2;
            
            const upgradedCapacity = vehicleInstance.getFuelCapacity();
            expect(upgradedCapacity).toBeGreaterThan(baseCapacity);
        });
        
        test('should have better fuel efficiency with upgrades', () => {
            const baseConsumptionRate = vehicleInstance.getFuelConsumptionRate();
            
            // Add fuel upgrades
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.fuel = 3;
            
            const upgradedConsumptionRate = vehicleInstance.getFuelConsumptionRate();
            expect(upgradedConsumptionRate).toBeLessThan(baseConsumptionRate);
        });
    });
    
    describe('Damage System', () => {
        test('should take damage correctly', () => {
            const damage = vehicleInstance.takeDamage(30);
            
            expect(damage).toBeCloseTo(30, 1); // Allow small floating point differences
            expect(vehicleInstance.health).toBe(70);
            expect(vehicleInstance.getHealthPercentage()).toBe(0.7);
        });
        
        test('should reduce damage with armor upgrades', () => {
            // Add armor upgrades
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.armor = 3;
            
            const damage = vehicleInstance.takeDamage(100);
            
            // Should take less than 100 damage due to armor
            expect(damage).toBeLessThan(100);
            expect(vehicleInstance.health).toBeGreaterThan(0);
        });
        
        test('should not take damage when already destroyed', () => {
            vehicleInstance.health = 0;
            
            const damage = vehicleInstance.takeDamage(50);
            
            expect(damage).toBe(0);
            expect(vehicleInstance.health).toBe(0);
        });
        
        test('should repair correctly', () => {
            vehicleInstance.health = 50;
            vehicleInstance.repair(30);
            
            expect(vehicleInstance.health).toBe(80);
            expect(vehicleInstance.getHealthPercentage()).toBe(0.8);
        });
        
        test('should not repair above maximum health', () => {
            vehicleInstance.health = 90;
            vehicleInstance.repair(20);
            
            expect(vehicleInstance.health).toBe(100);
        });
        
        test('should correctly identify destroyed state', () => {
            expect(vehicleInstance.isDestroyed()).toBe(false);
            
            vehicleInstance.takeDamage(100);
            expect(vehicleInstance.isDestroyed()).toBe(true);
        });
    });
    
    describe('Upgrade System', () => {
        test('should calculate upgrade costs correctly', () => {
            const engineCost = vehicleInstance.getUpgradeCost('engine');
            expect(engineCost).toBe(UpgradeConfig.baseCosts.engine);
            
            // Add one upgrade and check cost scaling
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = 1;
            const nextEngineCost = vehicleInstance.getUpgradeCost('engine');
            expect(nextEngineCost).toBeGreaterThan(engineCost);
        });
        
        test('should return null cost for max level upgrades', () => {
            // Set to max level
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = UpgradeConfig.maxLevel;
            
            const cost = vehicleInstance.getUpgradeCost('engine');
            expect(cost).toBeNull();
        });
        
        test('should check upgrade availability correctly', () => {
            expect(vehicleInstance.canUpgrade('engine')).toBe(true);
            
            // Set to max level
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = UpgradeConfig.maxLevel;
            expect(vehicleInstance.canUpgrade('engine')).toBe(false);
        });
        
        test('should purchase upgrades successfully', () => {
            mockSaveManager.getSaveData().player.money = 1000;
            
            const result = vehicleInstance.purchaseUpgrade('engine');
            
            expect(result.success).toBe(true);
            expect(result.category).toBe('engine');
            expect(result.newLevel).toBe(1);
            expect(result.cost).toBe(UpgradeConfig.baseCosts.engine);
            expect(result.remainingMoney).toBe(1000 - UpgradeConfig.baseCosts.engine);
            
            // Check that upgrade was applied
            const upgrades = vehicleInstance.getCurrentUpgrades();
            expect(upgrades.engine).toBe(1);
        });
        
        test('should throw error when purchasing upgrade at max level', () => {
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = UpgradeConfig.maxLevel;
            
            expect(() => {
                vehicleInstance.purchaseUpgrade('engine');
            }).toThrow('Cannot upgrade engine: already at max level');
        });
        
        test('should throw error when insufficient funds', () => {
            mockSaveManager.getSaveData().player.money = 50; // Less than engine cost
            
            expect(() => {
                vehicleInstance.purchaseUpgrade('engine');
            }).toThrow('Insufficient funds');
        });
    });
    
    describe('Visual Appearance', () => {
        test('should calculate weathering level based on vehicle type', () => {
            const starterCarWeathering = vehicleInstance.weatheringLevel;
            
            const sportsCarInstance = new VehicleInstance('SPORTS_CAR', VehicleTypes.SPORTS_CAR, mockSaveManager);
            const sportsCarWeathering = sportsCarInstance.weatheringLevel;
            
            // Starter car should be more weathered than sports car
            expect(starterCarWeathering).toBeGreaterThan(sportsCarWeathering);
        });
        
        test('should get visual appearance data', () => {
            const appearance = vehicleInstance.getVisualAppearance();
            
            expect(appearance).toHaveProperty('weatheringLevel');
            expect(appearance).toHaveProperty('damageLevel');
            expect(appearance).toHaveProperty('rustLevel');
            expect(appearance).toHaveProperty('upgrades');
            expect(appearance).toHaveProperty('colors');
            expect(appearance).toHaveProperty('modifications');
            
            expect(appearance.upgrades).toHaveProperty('hasEngineUpgrades');
            expect(appearance.upgrades).toHaveProperty('hasArmorPlating');
            expect(appearance.upgrades).toHaveProperty('hasWeapons');
        });
        
        test('should show visual modifications based on upgrades', () => {
            // Add various upgrades
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.engine = 2;
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.armor = 1;
            mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR.weapon = 1;
            
            const appearance = vehicleInstance.getVisualAppearance();
            const modifications = appearance.modifications;
            
            expect(modifications.some(mod => mod.type === 'exhaust')).toBe(true);
            expect(modifications.some(mod => mod.type === 'armor_plating')).toBe(true);
            expect(modifications.some(mod => mod.type === 'weapons')).toBe(true);
        });
        
        test('should get vehicle colors based on type', () => {
            const appearance = vehicleInstance.getVisualAppearance();
            const colors = appearance.colors;
            
            expect(colors).toHaveProperty('primary');
            expect(colors).toHaveProperty('secondary');
            expect(colors).toHaveProperty('rust');
            expect(colors).toHaveProperty('damage');
        });
    });
    
    describe('Vehicle Summary', () => {
        test('should provide comprehensive vehicle summary', () => {
            const summary = vehicleInstance.getSummary();
            
            expect(summary).toHaveProperty('type');
            expect(summary).toHaveProperty('name');
            expect(summary).toHaveProperty('description');
            expect(summary).toHaveProperty('baseStats');
            expect(summary).toHaveProperty('effectiveStats');
            expect(summary).toHaveProperty('upgrades');
            expect(summary).toHaveProperty('performance');
            expect(summary).toHaveProperty('appearance');
            expect(summary).toHaveProperty('health');
            expect(summary).toHaveProperty('fuel');
            expect(summary).toHaveProperty('fuelCapacity');
            expect(summary).toHaveProperty('fuelPercentage');
            expect(summary).toHaveProperty('isDestroyed');
            expect(summary).toHaveProperty('isOutOfFuel');
            
            expect(summary.type).toBe('STARTER_CAR');
            expect(summary.name).toBe(VehicleTypes.STARTER_CAR.name);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle missing upgrade data gracefully', () => {
            // Remove upgrade data
            delete mockSaveManager.getSaveData().vehicles.upgrades.STARTER_CAR;
            
            const upgrades = vehicleInstance.getCurrentUpgrades();
            expect(upgrades).toEqual({
                engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
            });
        });
        
        test('should handle negative damage gracefully', () => {
            const initialHealth = vehicleInstance.health;
            vehicleInstance.takeDamage(-10);
            
            expect(vehicleInstance.health).toBe(initialHealth);
        });
        
        test('should handle negative repair gracefully', () => {
            vehicleInstance.health = 50;
            vehicleInstance.repair(-10);
            
            expect(vehicleInstance.health).toBe(50);
        });
        
        test('should handle fuel consumption with zero delta time', () => {
            const initialFuel = vehicleInstance.fuel;
            vehicleInstance.consumeFuel(0, 1.0);
            
            expect(vehicleInstance.fuel).toBe(initialFuel);
        });
    });
});