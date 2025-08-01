import {
    VEHICLE_TYPES,
    VEHICLE_CONFIGS,
    VEHICLE_CATEGORIES,
    getVehicleConfig,
    getAllVehicleTypes,
    getVehiclesByCategory,
    getAvailableVehicles,
    calculateUpgradedStats
} from '../VehicleConfig';

describe('VehicleConfig', () => {
    describe('Constants', () => {
        test('should have all required vehicle types', () => {
            const expectedTypes = [
                'sedan', 'suv', 'truck', 'sports_car', 'monster_truck',
                'armored_car', 'buggy', 'motorcycle', 'tank', 'hovercraft',
                'muscle_car', 'racing_car', 'pickup_truck', 'van', 'convertible'
            ];

            const actualTypes = Object.values(VEHICLE_TYPES);
            
            expectedTypes.forEach(type => {
                expect(actualTypes).toContain(type);
            });
            
            expect(actualTypes.length).toBeGreaterThanOrEqual(15);
        });

        test('should have configurations for all vehicle types', () => {
            Object.values(VEHICLE_TYPES).forEach(type => {
                expect(VEHICLE_CONFIGS[type]).toBeDefined();
                expect(VEHICLE_CONFIGS[type].name).toBeDefined();
                expect(VEHICLE_CONFIGS[type].stats).toBeDefined();
            });
        });

        test('should have all required vehicle categories', () => {
            const expectedCategories = [
                'starter', 'utility', 'performance', 'heavy', 'military', 'special', 'offroad'
            ];

            const actualCategories = Object.values(VEHICLE_CATEGORIES);
            
            expectedCategories.forEach(category => {
                expect(actualCategories).toContain(category);
            });
        });
    });

    describe('Vehicle Configuration Structure', () => {
        test('should have required properties for each vehicle', () => {
            Object.entries(VEHICLE_CONFIGS).forEach(([type, config]) => {
                expect(config.name).toBeDefined();
                expect(config.description).toBeDefined();
                expect(config.stats).toBeDefined();
                expect(config.cost).toBeDefined();
                expect(config.unlockLevel).toBeDefined();
                expect(config.category).toBeDefined();

                // Check stats structure
                expect(config.stats.speed).toBeDefined();
                expect(config.stats.acceleration).toBeDefined();
                expect(config.stats.armor).toBeDefined();
                expect(config.stats.fuelCapacity).toBeDefined();
                expect(config.stats.damage).toBeDefined();
                expect(config.stats.handling).toBeDefined();
                expect(config.stats.braking).toBeDefined();
                expect(config.stats.mass).toBeDefined();
                expect(config.stats.fuelConsumption).toBeDefined();
            });
        });

        test('should have reasonable stat values', () => {
            Object.entries(VEHICLE_CONFIGS).forEach(([type, config]) => {
                const stats = config.stats;
                
                // Stats should be positive
                expect(stats.speed).toBeGreaterThan(0);
                expect(stats.acceleration).toBeGreaterThan(0);
                expect(stats.armor).toBeGreaterThanOrEqual(0);
                expect(stats.fuelCapacity).toBeGreaterThan(0);
                expect(stats.damage).toBeGreaterThan(0);
                expect(stats.handling).toBeGreaterThan(0);
                expect(stats.braking).toBeGreaterThan(0);
                expect(stats.mass).toBeGreaterThan(0);
                expect(stats.fuelConsumption).toBeGreaterThan(0);

                // Stats should be within reasonable ranges
                expect(stats.speed).toBeLessThanOrEqual(150);
                expect(stats.acceleration).toBeLessThanOrEqual(100);
                expect(stats.armor).toBeLessThanOrEqual(100);
                expect(stats.fuelCapacity).toBeLessThanOrEqual(500);
                expect(stats.damage).toBeLessThanOrEqual(100);
                expect(stats.handling).toBeLessThanOrEqual(100);
                expect(stats.braking).toBeLessThanOrEqual(100);
                expect(stats.mass).toBeLessThanOrEqual(10000);
                expect(stats.fuelConsumption).toBeLessThanOrEqual(50);
            });
        });

        test('should have reasonable cost and unlock progression', () => {
            Object.entries(VEHICLE_CONFIGS).forEach(([type, config]) => {
                expect(config.cost).toBeGreaterThanOrEqual(0);
                expect(config.unlockLevel).toBeGreaterThan(0);
                expect(config.unlockLevel).toBeLessThanOrEqual(20);
            });
        });
    });

    describe('getVehicleConfig', () => {
        test('should return correct config for valid vehicle type', () => {
            const sedanConfig = getVehicleConfig(VEHICLE_TYPES.SEDAN);
            
            expect(sedanConfig).toBe(VEHICLE_CONFIGS[VEHICLE_TYPES.SEDAN]);
            expect(sedanConfig.name).toBe('Family Sedan');
        });

        test('should return sedan config for invalid vehicle type', () => {
            const invalidConfig = getVehicleConfig('invalid_type');
            
            expect(invalidConfig).toBe(VEHICLE_CONFIGS[VEHICLE_TYPES.SEDAN]);
        });

        test('should return sedan config for undefined input', () => {
            const undefinedConfig = getVehicleConfig(undefined);
            
            expect(undefinedConfig).toBe(VEHICLE_CONFIGS[VEHICLE_TYPES.SEDAN]);
        });
    });

    describe('getAllVehicleTypes', () => {
        test('should return all vehicle types', () => {
            const allTypes = getAllVehicleTypes();
            
            expect(allTypes).toEqual(Object.values(VEHICLE_TYPES));
            expect(allTypes.length).toBeGreaterThanOrEqual(15);
        });

        test('should return array of strings', () => {
            const allTypes = getAllVehicleTypes();
            
            allTypes.forEach(type => {
                expect(typeof type).toBe('string');
            });
        });
    });

    describe('getVehiclesByCategory', () => {
        test('should return vehicles in performance category', () => {
            const performanceVehicles = getVehiclesByCategory('performance');
            
            expect(performanceVehicles.length).toBeGreaterThan(0);
            performanceVehicles.forEach(vehicle => {
                expect(vehicle.category).toBe('performance');
                expect(vehicle.type).toBeDefined();
                expect(vehicle.name).toBeDefined();
            });
        });

        test('should return vehicles in military category', () => {
            const militaryVehicles = getVehiclesByCategory('military');
            
            expect(militaryVehicles.length).toBeGreaterThan(0);
            militaryVehicles.forEach(vehicle => {
                expect(vehicle.category).toBe('military');
            });
        });

        test('should return empty array for non-existent category', () => {
            const nonExistentVehicles = getVehiclesByCategory('non_existent');
            
            expect(nonExistentVehicles).toEqual([]);
        });

        test('should include all required properties in returned vehicles', () => {
            const starterVehicles = getVehiclesByCategory('starter');
            
            starterVehicles.forEach(vehicle => {
                expect(vehicle.type).toBeDefined();
                expect(vehicle.name).toBeDefined();
                expect(vehicle.stats).toBeDefined();
                expect(vehicle.cost).toBeDefined();
                expect(vehicle.unlockLevel).toBeDefined();
                expect(vehicle.category).toBe('starter');
            });
        });
    });

    describe('getAvailableVehicles', () => {
        test('should return vehicles available at level 1', () => {
            const level1Vehicles = getAvailableVehicles(1);
            
            expect(level1Vehicles.length).toBeGreaterThan(0);
            level1Vehicles.forEach(vehicle => {
                expect(vehicle.unlockLevel).toBeLessThanOrEqual(1);
            });
        });

        test('should return more vehicles at higher levels', () => {
            const level1Vehicles = getAvailableVehicles(1);
            const level10Vehicles = getAvailableVehicles(10);
            
            expect(level10Vehicles.length).toBeGreaterThanOrEqual(level1Vehicles.length);
        });

        test('should return all vehicles at max level', () => {
            const maxLevelVehicles = getAvailableVehicles(20);
            const allVehicles = Object.keys(VEHICLE_CONFIGS);
            
            expect(maxLevelVehicles.length).toBe(allVehicles.length);
        });

        test('should return empty array for level 0', () => {
            const level0Vehicles = getAvailableVehicles(0);
            
            expect(level0Vehicles).toEqual([]);
        });

        test('should include sedan at level 1', () => {
            const level1Vehicles = getAvailableVehicles(1);
            const sedanVehicle = level1Vehicles.find(v => v.type === VEHICLE_TYPES.SEDAN);
            
            expect(sedanVehicle).toBeDefined();
            expect(sedanVehicle.unlockLevel).toBe(1);
        });
    });

    describe('calculateUpgradedStats', () => {
        const baseStats = {
            speed: 60,
            acceleration: 40,
            armor: 30,
            fuelCapacity: 100,
            damage: 25,
            handling: 70,
            braking: 60,
            fuelConsumption: 10
        };

        test('should return unchanged stats with no upgrades', () => {
            const upgrades = { engine: 0, armor: 0, fuel: 0, tires: 0, weapons: 0 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats).toEqual(baseStats);
        });

        test('should apply engine upgrades correctly', () => {
            const upgrades = { engine: 5, armor: 0, fuel: 0, tires: 0, weapons: 0 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.speed).toBeGreaterThan(baseStats.speed);
            expect(upgradedStats.acceleration).toBeGreaterThan(baseStats.acceleration);
            expect(upgradedStats.speed).toBeCloseTo(baseStats.speed * 1.5); // 5 * 0.1 = 0.5 increase
        });

        test('should apply armor upgrades correctly', () => {
            const upgrades = { engine: 0, armor: 3, fuel: 0, tires: 0, weapons: 0 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.armor).toBe(baseStats.armor + 30); // 3 * 10 = 30 increase
        });

        test('should apply fuel upgrades correctly', () => {
            const upgrades = { engine: 0, armor: 0, fuel: 2, tires: 0, weapons: 0 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.fuelCapacity).toBeGreaterThan(baseStats.fuelCapacity);
            expect(upgradedStats.fuelConsumption).toBeLessThan(baseStats.fuelConsumption);
            expect(upgradedStats.fuelCapacity).toBeCloseTo(baseStats.fuelCapacity * 1.4); // 2 * 0.2 = 0.4 increase
        });

        test('should apply tire upgrades correctly', () => {
            const upgrades = { engine: 0, armor: 0, fuel: 0, tires: 4, weapons: 0 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.handling).toBeGreaterThan(baseStats.handling);
            expect(upgradedStats.braking).toBeGreaterThan(baseStats.braking);
            expect(upgradedStats.handling).toBeCloseTo(baseStats.handling * 1.4); // 4 * 0.1 = 0.4 increase
        });

        test('should apply weapon upgrades correctly', () => {
            const upgrades = { engine: 0, armor: 0, fuel: 0, tires: 0, weapons: 3 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.damage).toBeGreaterThan(baseStats.damage);
            expect(upgradedStats.damage).toBeCloseTo(baseStats.damage * 1.6); // 3 * 0.2 = 0.6 increase
        });

        test('should apply multiple upgrades correctly', () => {
            const upgrades = { engine: 2, armor: 1, fuel: 1, tires: 2, weapons: 1 };
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats.speed).toBeGreaterThan(baseStats.speed);
            expect(upgradedStats.armor).toBeGreaterThan(baseStats.armor);
            expect(upgradedStats.fuelCapacity).toBeGreaterThan(baseStats.fuelCapacity);
            expect(upgradedStats.handling).toBeGreaterThan(baseStats.handling);
            expect(upgradedStats.damage).toBeGreaterThan(baseStats.damage);
        });

        test('should not modify original stats object', () => {
            const originalStats = { ...baseStats };
            const upgrades = { engine: 5, armor: 3, fuel: 2, tires: 4, weapons: 1 };
            
            calculateUpgradedStats(baseStats, upgrades);
            
            expect(baseStats).toEqual(originalStats);
        });

        test('should handle zero upgrades gracefully', () => {
            const upgrades = {};
            const upgradedStats = calculateUpgradedStats(baseStats, upgrades);
            
            expect(upgradedStats).toEqual(baseStats);
        });
    });

    describe('Vehicle Balance', () => {
        test('should have balanced progression in unlock levels', () => {
            const vehicles = Object.values(VEHICLE_CONFIGS);
            const unlockLevels = vehicles.map(v => v.unlockLevel).sort((a, b) => a - b);
            
            // Should start at level 1
            expect(unlockLevels[0]).toBe(1);
            
            // Should have reasonable progression (no huge gaps)
            for (let i = 1; i < unlockLevels.length; i++) {
                const gap = unlockLevels[i] - unlockLevels[i - 1];
                expect(gap).toBeLessThanOrEqual(3); // No more than 3 level gaps
            }
        });

        test('should have cost progression that matches unlock levels', () => {
            const vehicles = Object.values(VEHICLE_CONFIGS);
            
            // Generally, higher level vehicles should cost more
            const lowLevelVehicles = vehicles.filter(v => v.unlockLevel <= 5);
            const highLevelVehicles = vehicles.filter(v => v.unlockLevel >= 10);
            
            const avgLowCost = lowLevelVehicles.reduce((sum, v) => sum + v.cost, 0) / lowLevelVehicles.length;
            const avgHighCost = highLevelVehicles.reduce((sum, v) => sum + v.cost, 0) / highLevelVehicles.length;
            
            expect(avgHighCost).toBeGreaterThan(avgLowCost);
        });

        test('should have starter vehicle with zero cost', () => {
            const starterVehicles = getVehiclesByCategory('starter');
            const freeVehicle = starterVehicles.find(v => v.cost === 0);
            
            expect(freeVehicle).toBeDefined();
            expect(freeVehicle.unlockLevel).toBe(1);
        });
    });
});