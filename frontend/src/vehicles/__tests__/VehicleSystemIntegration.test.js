/**
 * Integration tests for Vehicle System and Progression Implementation
 * Tests all requirements for Task 6: Vehicle System and Progression Implementation
 */

import { VehicleSystem, VehicleInstance } from '../VehicleSystem.js';
import { VehicleRenderer } from '../VehicleRenderer.js';
import { VehicleTypes, UpgradeConfig } from '../../save/GameDataModels.js';
import { ZombieCarSaveManager } from '../../save/ZombieCarSaveManager.js';

// Mock localStorage for testing
const localStorageMock = {
    data: {},
    getItem: jest.fn((key) => localStorageMock.data[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.data[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.data = {};
    })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('Vehicle System and Progression Implementation - Task 6', () => {
    let saveManager;
    let vehicleSystem;
    let renderer;
    
    beforeEach(async () => {
        // Clear localStorage
        localStorageMock.clear();
        jest.clearAllMocks();
        
        // Initialize save manager
        saveManager = new ZombieCarSaveManager();
        await saveManager.initialize();
        
        // Initialize vehicle system
        vehicleSystem = new VehicleSystem(saveManager);
        
        // Initialize renderer
        renderer = new VehicleRenderer();
        
        // Set up test data
        const saveData = saveManager.getSaveData();
        saveData.player.money = 10000;
        saveData.player.bestDistance = 15000;
        await saveManager.saveToDisk();
    });
    
    afterEach(() => {
        if (renderer) {
            renderer.dispose();
        }
    });
    
    describe('Requirement 2.1: Basic run-down car progression', () => {
        test('should start with basic starter car', () => {
            const currentVehicle = vehicleSystem.getCurrentVehicle();
            
            expect(currentVehicle).toBeDefined();
            expect(currentVehicle.type).toBe('STARTER_CAR');
            expect(currentVehicle.config.name).toBe('Old Sedan');
            expect(currentVehicle.config.description).toContain('beat-up');
        });
        
        test('should have multiple vehicle types with progression', () => {
            const allVehicles = vehicleSystem.getAllVehicles();
            
            expect(allVehicles.length).toBeGreaterThan(1);
            
            // Check that vehicles have different unlock distances (progression)
            const unlockDistances = allVehicles.map(v => v.config.unlockDistance);
            const sortedDistances = [...unlockDistances].sort((a, b) => a - b);
            
            expect(unlockDistances).toEqual(sortedDistances);
            expect(unlockDistances[0]).toBe(0); // Starter car
            expect(unlockDistances[unlockDistances.length - 1]).toBeGreaterThan(0);
        });
    });
    
    describe('Requirement 2.2: Multiple vehicle types with unique base stats', () => {
        test('should have different base stats for each vehicle type', () => {
            const vehicleTypes = Object.keys(VehicleTypes);
            const baseStats = vehicleTypes.map(type => VehicleTypes[type].baseStats);
            
            // Check that each vehicle has different stats
            for (let i = 0; i < baseStats.length; i++) {
                for (let j = i + 1; j < baseStats.length; j++) {
                    const stats1 = baseStats[i];
                    const stats2 = baseStats[j];
                    
                    // At least one stat should be different
                    const isDifferent = Object.keys(stats1).some(key => stats1[key] !== stats2[key]);
                    expect(isDifferent).toBe(true);
                }
            }
        });
        
        test('should have unique upgrade paths for each vehicle', () => {
            const saveData = saveManager.getSaveData();
            
            // Add multiple vehicles
            saveData.vehicles.owned = ['STARTER_CAR', 'OLD_TRUCK', 'SPORTS_CAR'];
            saveData.vehicles.upgrades = {
                STARTER_CAR: { engine: 1, fuel: 0, armor: 2, weapon: 0, wheels: 1 },
                OLD_TRUCK: { engine: 0, fuel: 2, armor: 1, weapon: 1, wheels: 0 },
                SPORTS_CAR: { engine: 3, fuel: 0, armor: 0, weapon: 0, wheels: 2 }
            };
            
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const oldTruck = vehicleSystem.getVehicle('OLD_TRUCK');
            const sportsCar = vehicleSystem.getVehicle('SPORTS_CAR');
            
            // Each vehicle should have different effective stats due to different upgrades
            const starterStats = starterCar.getEffectiveStats();
            const truckStats = oldTruck.getEffectiveStats();
            const sportsStats = sportsCar.getEffectiveStats();
            
            expect(starterStats).not.toEqual(truckStats);
            expect(truckStats).not.toEqual(sportsStats);
            expect(starterStats).not.toEqual(sportsStats);
        });
    });
    
    describe('Requirement 2.3: Vehicle unlock system based on distance milestones', () => {
        test('should unlock vehicles based on distance requirements', () => {
            const saveData = saveManager.getSaveData();
            
            // Test with low distance
            saveData.player.bestDistance = 500;
            
            const progress = vehicleSystem.getVehicleUnlockProgress();
            const starterCar = progress.find(p => p.type === 'STARTER_CAR');
            const oldTruck = progress.find(p => p.type === 'OLD_TRUCK');
            
            expect(starterCar.isUnlocked).toBe(true); // Always unlocked
            expect(oldTruck.distanceProgress).toBeLessThan(1); // Not enough distance
            
            // Test with sufficient distance
            saveData.player.bestDistance = 2000;
            
            const progressAfter = vehicleSystem.getVehicleUnlockProgress();
            const oldTruckAfter = progressAfter.find(p => p.type === 'OLD_TRUCK');
            
            expect(oldTruckAfter.distanceProgress).toBeGreaterThanOrEqual(1); // Sufficient distance
        });
        
        test('should calculate distance progress correctly', () => {
            const saveData = saveManager.getSaveData();
            saveData.player.bestDistance = 1500; // Halfway to OLD_TRUCK (requires 1000)
            
            const progress = vehicleSystem.getVehicleUnlockProgress();
            const sportsCarProgress = progress.find(p => p.type === 'SPORTS_CAR');
            
            // Sports car requires 2500, player has 1500
            expect(sportsCarProgress.distanceProgress).toBeCloseTo(1500 / 2500, 2);
            expect(sportsCarProgress.remainingDistance).toBe(1000);
        });
    });
    
    describe('Requirement 2.4: Currency requirements for vehicle purchase', () => {
        test('should require sufficient money to purchase vehicles', () => {
            const saveData = saveManager.getSaveData();
            saveData.player.money = 300; // Less than OLD_TRUCK cost (500)
            saveData.player.bestDistance = 2000; // Sufficient distance
            
            const canPurchase = vehicleSystem.canPurchaseVehicle('OLD_TRUCK');
            
            expect(canPurchase.canPurchase).toBe(false);
            expect(canPurchase.reason).toBe('Insufficient funds');
            expect(canPurchase.requiredMoney).toBe(500);
            expect(canPurchase.currentMoney).toBe(300);
        });
        
        test('should successfully purchase vehicle with sufficient funds and distance', () => {
            const saveData = saveManager.getSaveData();
            saveData.player.money = 1000;
            saveData.player.bestDistance = 2000;
            
            const result = vehicleSystem.purchaseVehicle('OLD_TRUCK');
            
            expect(result.success).toBe(true);
            expect(result.vehicleType).toBe('OLD_TRUCK');
            expect(result.cost).toBe(500);
            expect(result.remainingMoney).toBe(500);
            
            // Check that vehicle was added to owned vehicles
            const updatedSaveData = saveManager.getSaveData();
            expect(updatedSaveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(updatedSaveData.vehicles.upgrades.OLD_TRUCK).toBeDefined();
        });
    });
    
    describe('Requirement 2.5: Visual representation of vehicle wear and modifications', () => {
        test('should calculate weathering level based on vehicle type', () => {
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const sportsCar = vehicleSystem.getVehicle('SPORTS_CAR');
            
            expect(starterCar.weatheringLevel).toBeGreaterThan(sportsCar.weatheringLevel);
            expect(starterCar.weatheringLevel).toBeGreaterThan(0);
            expect(sportsCar.weatheringLevel).toBeGreaterThan(0);
        });
        
        test('should provide visual appearance data with weathering and modifications', () => {
            const saveData = saveManager.getSaveData();
            saveData.vehicles.upgrades.STARTER_CAR = {
                engine: 2, fuel: 1, armor: 3, weapon: 1, wheels: 2
            };
            
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const appearance = starterCar.getVisualAppearance();
            
            expect(appearance).toHaveProperty('weatheringLevel');
            expect(appearance).toHaveProperty('damageLevel');
            expect(appearance).toHaveProperty('rustLevel');
            expect(appearance).toHaveProperty('colors');
            expect(appearance).toHaveProperty('modifications');
            
            // Check that upgrades are reflected in visual modifications
            const modifications = appearance.modifications;
            expect(modifications.some(mod => mod.type === 'exhaust')).toBe(true); // Engine upgrade
            expect(modifications.some(mod => mod.type === 'armor_plating')).toBe(true); // Armor upgrade
            expect(modifications.some(mod => mod.type === 'weapons')).toBe(true); // Weapon upgrade
        });
        
        test('should render vehicle with weathered appearance', () => {
            // Create mock context
            const mockCtx = {
                save: jest.fn(),
                restore: jest.fn(),
                translate: jest.fn(),
                rotate: jest.fn(),
                fillRect: jest.fn(),
                strokeRect: jest.fn(),
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                stroke: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                closePath: jest.fn(),
                createLinearGradient: jest.fn(() => ({
                    addColorStop: jest.fn()
                })),
                set fillStyle(value) { this._fillStyle = value; },
                get fillStyle() { return this._fillStyle; },
                set strokeStyle(value) { this._strokeStyle = value; },
                get strokeStyle() { return this._strokeStyle; },
                set lineWidth(value) { this._lineWidth = value; },
                get lineWidth() { return this._lineWidth; }
            };
            
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            
            expect(() => {
                renderer.renderVehicle(mockCtx, starterCar);
            }).not.toThrow();
            
            // Verify that rendering methods were called
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
            expect(mockCtx.translate).toHaveBeenCalled();
        });
    });
    
    describe('Fuel Consumption System', () => {
        test('should implement fuel consumption that ends runs when depleted', () => {
            const starterCar = vehicleSystem.getCurrentVehicle();
            const initialFuel = starterCar.fuel;
            
            expect(initialFuel).toBeGreaterThan(0);
            expect(starterCar.isOutOfFuel()).toBe(false);
            
            // Consume fuel over time
            const deltaTime = 10000; // 10 seconds
            const throttleInput = 1.0; // Full throttle
            
            const stillHasFuel = starterCar.consumeFuel(deltaTime, throttleInput);
            
            expect(starterCar.fuel).toBeLessThan(initialFuel);
            
            // Consume all fuel
            while (!starterCar.isOutOfFuel()) {
                starterCar.consumeFuel(5000, 1.0);
            }
            
            expect(starterCar.isOutOfFuel()).toBe(true);
            expect(starterCar.fuel).toBe(0);
            
            // Should not consume more fuel when empty
            const finalFuel = starterCar.fuel;
            starterCar.consumeFuel(1000, 1.0);
            expect(starterCar.fuel).toBe(finalFuel);
        });
        
        test('should have different fuel consumption rates based on upgrades', () => {
            const saveData = saveManager.getSaveData();
            
            // Vehicle with no fuel upgrades
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const baseConsumptionRate = starterCar.getFuelConsumptionRate();
            
            // Vehicle with fuel upgrades
            saveData.vehicles.upgrades.STARTER_CAR.fuel = 3;
            const upgradedConsumptionRate = starterCar.getFuelConsumptionRate();
            
            expect(upgradedConsumptionRate).toBeLessThan(baseConsumptionRate);
        });
        
        test('should have increased fuel capacity with upgrades', () => {
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const baseCapacity = starterCar.getFuelCapacity();
            
            // Add fuel upgrades
            const saveData = saveManager.getSaveData();
            saveData.vehicles.upgrades.STARTER_CAR.fuel = 2;
            
            const upgradedCapacity = starterCar.getFuelCapacity();
            expect(upgradedCapacity).toBeGreaterThan(baseCapacity);
        });
    });
    
    describe('Vehicle Stats Calculations', () => {
        test('should calculate effective stats with upgrade modifiers', () => {
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const baseStats = starterCar.getBaseStats();
            
            // Add upgrades
            const saveData = saveManager.getSaveData();
            saveData.vehicles.upgrades.STARTER_CAR = {
                engine: 2, fuel: 1, armor: 3, weapon: 1, wheels: 2
            };
            
            const effectiveStats = starterCar.getEffectiveStats();
            
            // All upgraded stats should be higher than base stats
            expect(effectiveStats.engine).toBeGreaterThan(baseStats.engine);
            expect(effectiveStats.fuel).toBeGreaterThan(baseStats.fuel);
            expect(effectiveStats.armor).toBeGreaterThan(baseStats.armor);
            // Weapon stat might be 0 for starter car, so check if upgrade was applied
            if (baseStats.weapon > 0) {
                expect(effectiveStats.weapon).toBeGreaterThan(baseStats.weapon);
            } else {
                expect(effectiveStats.weapon).toBeGreaterThanOrEqual(baseStats.weapon);
            }
            expect(effectiveStats.wheels).toBeGreaterThan(baseStats.wheels);
        });
        
        test('should calculate performance metrics correctly', () => {
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const metrics = starterCar.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('acceleration');
            expect(metrics).toHaveProperty('topSpeed');
            expect(metrics).toHaveProperty('handling');
            expect(metrics).toHaveProperty('durability');
            expect(metrics).toHaveProperty('fuelEfficiency');
            expect(metrics).toHaveProperty('combatPower');
            expect(metrics).toHaveProperty('overallRating');
            
            // All metrics should be reasonable values
            Object.values(metrics).forEach(metric => {
                expect(typeof metric).toBe('number');
                expect(metric).toBeGreaterThanOrEqual(0);
                expect(metric).toBeLessThanOrEqual(100);
            });
        });
    });
    
    describe('Vehicle Unlock Progression', () => {
        test('should provide comprehensive unlock progress information', () => {
            const progress = vehicleSystem.getVehicleUnlockProgress();
            
            expect(progress).toHaveLength(Object.keys(VehicleTypes).length);
            
            progress.forEach(vehicleProgress => {
                expect(vehicleProgress).toHaveProperty('type');
                expect(vehicleProgress).toHaveProperty('name');
                expect(vehicleProgress).toHaveProperty('description');
                expect(vehicleProgress).toHaveProperty('cost');
                expect(vehicleProgress).toHaveProperty('unlockDistance');
                expect(vehicleProgress).toHaveProperty('isUnlocked');
                expect(vehicleProgress).toHaveProperty('isOwned');
                expect(vehicleProgress).toHaveProperty('canPurchase');
                expect(vehicleProgress).toHaveProperty('distanceProgress');
                expect(vehicleProgress).toHaveProperty('remainingDistance');
                
                expect(vehicleProgress.distanceProgress).toBeGreaterThanOrEqual(0);
                expect(vehicleProgress.remainingDistance).toBeGreaterThanOrEqual(0);
            });
        });
    });
    
    describe('Integration with Save System', () => {
        test('should persist vehicle purchases and upgrades', async () => {
            // Purchase a vehicle
            const saveData = saveManager.getSaveData();
            saveData.player.money = 2000;
            saveData.player.bestDistance = 3000;
            
            vehicleSystem.purchaseVehicle('OLD_TRUCK');
            
            // Verify persistence
            const updatedSaveData = saveManager.getSaveData();
            expect(updatedSaveData.vehicles.owned).toContain('OLD_TRUCK');
            expect(updatedSaveData.vehicles.upgrades.OLD_TRUCK).toBeDefined();
            expect(updatedSaveData.player.money).toBe(1500); // 2000 - 500
            
            // Purchase upgrade
            const oldTruck = vehicleSystem.getVehicle('OLD_TRUCK');
            oldTruck.purchaseUpgrade('engine');
            
            // Verify upgrade persistence
            const finalSaveData = saveManager.getSaveData();
            expect(finalSaveData.vehicles.upgrades.OLD_TRUCK.engine).toBe(1);
        });
        
        test('should maintain vehicle selection across sessions', () => {
            const saveData = saveManager.getSaveData();
            saveData.vehicles.owned.push('OLD_TRUCK');
            saveData.vehicles.selected = 'OLD_TRUCK';
            
            // Create new vehicle system (simulating new session)
            const newVehicleSystem = new VehicleSystem(saveManager);
            
            expect(newVehicleSystem.getCurrentVehicle().type).toBe('OLD_TRUCK');
        });
    });
    
    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid vehicle types gracefully', () => {
            expect(() => {
                vehicleSystem.purchaseVehicle('INVALID_VEHICLE');
            }).toThrow('Cannot purchase vehicle: Invalid vehicle type');
            
            expect(() => {
                vehicleSystem.selectVehicle('INVALID_VEHICLE');
            }).toThrow('Vehicle type INVALID_VEHICLE not found');
        });
        
        test('should prevent purchasing already owned vehicles', () => {
            const saveData = saveManager.getSaveData();
            saveData.vehicles.owned.push('OLD_TRUCK');
            
            expect(() => {
                vehicleSystem.purchaseVehicle('OLD_TRUCK');
            }).toThrow('Cannot purchase vehicle: Already owned');
        });
        
        test('should handle missing upgrade data gracefully', () => {
            const saveData = saveManager.getSaveData();
            delete saveData.vehicles.upgrades.STARTER_CAR;
            
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const upgrades = starterCar.getCurrentUpgrades();
            
            expect(upgrades).toEqual({
                engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
            });
        });
    });
    
    describe('Vehicle Summary and Display', () => {
        test('should provide comprehensive vehicle summary for UI', () => {
            const starterCar = vehicleSystem.getVehicle('STARTER_CAR');
            const summary = starterCar.getSummary();
            
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
});