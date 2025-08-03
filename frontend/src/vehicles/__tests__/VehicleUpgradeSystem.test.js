/**
 * Vehicle Upgrade System Tests
 * Comprehensive tests for the vehicle upgrade system
 */

import { VehicleUpgradeSystem } from '../VehicleUpgradeSystem.js';

// Mock electron integration
jest.mock('../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('VehicleUpgradeSystem', () => {
    let upgradeSystem;
    let vehicleConfig;

    beforeEach(() => {
        vehicleConfig = {
            mass: 1500,
            engine: { maxPower: 200, maxTorque: 300 },
            transmission: { gearRatios: [3.5, 2.1, 1.4, 1.0, 0.8] }
        };

        upgradeSystem = new VehicleUpgradeSystem(vehicleConfig, {
            enablePhysicsModification: true,
            enableVisualCustomization: true,
            enableUpgradePreview: true,
            startingCurrency: 5000,
            maxUpgradeLevel: 10
        });

        // Clear localStorage mocks
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
    });

    afterEach(() => {
        upgradeSystem.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(upgradeSystem.playerData.currency).toBe(5000);
            expect(upgradeSystem.playerData.level).toBe(1);
            expect(upgradeSystem.playerData.experience).toBe(0);
            expect(upgradeSystem.currentUpgrades.size).toBe(0);
        });

        test('should emit initialized event', () => {
            const initSpy = jest.fn();
            const newUpgradeSystem = new VehicleUpgradeSystem(vehicleConfig);
            
            newUpgradeSystem.on('initialized', initSpy);
            
            expect(initSpy).toHaveBeenCalledWith({
                categories: expect.arrayContaining(['engine', 'transmission', 'suspension']),
                currency: expect.any(Number),
                level: 1
            });
            
            newUpgradeSystem.dispose();
        });

        test('should create all upgrade categories', () => {
            const categories = Object.keys(upgradeSystem.upgradeCategories);
            expect(categories).toContain('engine');
            expect(categories).toContain('transmission');
            expect(categories).toContain('suspension');
            expect(categories).toContain('tires');
            expect(categories).toContain('brakes');
            expect(categories).toContain('aerodynamics');
            expect(categories).toContain('armor');
            expect(categories).toContain('visual');
        });

        test('should have starting unlocked upgrades', () => {
            expect(upgradeSystem.playerData.unlockedUpgrades.has('engine_power_1')).toBe(true);
            expect(upgradeSystem.playerData.unlockedUpgrades.has('transmission_efficiency_1')).toBe(true);
            expect(upgradeSystem.playerData.unlockedUpgrades.has('suspension_stiffness_1')).toBe(true);
        });
    });

    describe('Upgrade Availability', () => {
        test('should check upgrade availability correctly', () => {
            const enginePower = upgradeSystem.upgradeCategories.engine.upgrades.power;
            expect(upgradeSystem.isUpgradeAvailable(enginePower)).toBe(true);
            
            // Test level requirement
            const turbo = upgradeSystem.upgradeCategories.engine.upgrades.turbo;
            expect(upgradeSystem.isUpgradeAvailable(turbo)).toBe(false); // Requires level 5
        });

        test('should respect prerequisite upgrades', () => {
            const turbo = upgradeSystem.upgradeCategories.engine.upgrades.turbo;
            
            // Should not be available without prerequisites
            upgradeSystem.playerData.level = 5;
            expect(upgradeSystem.isUpgradeAvailable(turbo)).toBe(false);
            
            // Should be available with prerequisites
            upgradeSystem.playerData.unlockedUpgrades.add('engine_power_3');
            upgradeSystem.playerData.unlockedUpgrades.add('engine_cooling_2');
            expect(upgradeSystem.isUpgradeAvailable(turbo)).toBe(true);
        });

        test('should not allow upgrades beyond max level', () => {
            const enginePower = upgradeSystem.upgradeCategories.engine.upgrades.power;
            upgradeSystem.currentUpgrades.set('engine_power', enginePower.maxLevel);
            
            expect(upgradeSystem.isUpgradeAvailable(enginePower)).toBe(false);
        });
    });

    describe('Upgrade Purchasing', () => {
        test('should purchase upgrade successfully', () => {
            const purchaseSpy = jest.fn();
            upgradeSystem.on('upgradePurchased', purchaseSpy);

            const result = upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            
            expect(result.success).toBe(true);
            expect(result.newLevel).toBe(1);
            expect(result.remainingCurrency).toBeLessThan(5000);
            expect(purchaseSpy).toHaveBeenCalled();
            expect(upgradeSystem.getCurrentUpgradeLevel('engine_power')).toBe(1);
        });

        test('should fail purchase with insufficient currency', () => {
            upgradeSystem.playerData.currency = 100; // Not enough for any upgrade
            
            expect(() => {
                upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            }).toThrow('Insufficient currency');
        });

        test('should fail purchase of unavailable upgrade', () => {
            expect(() => {
                upgradeSystem.purchaseUpgrade('engine_turbo', 'engine'); // Requires level 5
            }).toThrow('Upgrade not available');
        });

        test('should fail purchase of invalid upgrade', () => {
            expect(() => {
                upgradeSystem.purchaseUpgrade('invalid_upgrade', 'engine');
            }).toThrow('Invalid upgrade');
        });

        test('should calculate upgrade cost with level scaling', () => {
            const enginePower = upgradeSystem.upgradeCategories.engine.upgrades.power;
            const level1Cost = upgradeSystem.calculateUpgradeCost(enginePower);
            const level2Cost = upgradeSystem.calculateUpgradeCost(enginePower, 2);
            
            expect(level2Cost).toBeGreaterThan(level1Cost);
        });
    });

    describe('Upgrade Effects', () => {
        test('should recalculate effects after purchase', () => {
            const effectsSpy = jest.fn();
            upgradeSystem.on('effectsRecalculated', effectsSpy);

            const initialPower = upgradeSystem.upgradeEffects.power;
            upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            
            expect(upgradeSystem.upgradeEffects.power).toBeGreaterThan(initialPower);
            expect(effectsSpy).toHaveBeenCalled();
        });

        test('should apply diminishing returns correctly', () => {
            const baseValue = 0.1;
            const level1Effect = upgradeSystem.applyDiminishingReturns(baseValue, 1);
            const level5Effect = upgradeSystem.applyDiminishingReturns(baseValue, 5);
            const level10Effect = upgradeSystem.applyDiminishingReturns(baseValue, 10);
            
            expect(level5Effect).toBeLessThan(level1Effect * 5);
            expect(level10Effect).toBeLessThan(level1Effect * 10);
        });

        test('should handle weight effects multiplicatively', () => {
            const armorUpgrade = upgradeSystem.upgradeCategories.armor.upgrades.body_armor;
            upgradeSystem.currentUpgrades.set('armor_body', 1);
            
            const initialWeight = 1.0;
            upgradeSystem.recalculateUpgradeEffects();
            
            expect(upgradeSystem.upgradeEffects.weight).toBeGreaterThan(initialWeight);
        });
    });

    describe('Upgrade Preview', () => {
        test('should generate upgrade preview', () => {
            const preview = upgradeSystem.getUpgradePreview('engine_power', 'engine');
            
            expect(preview).toEqual({
                upgradeId: 'engine_power',
                currentLevel: 0,
                nextLevel: 1,
                cost: expect.any(Number),
                currentEffects: expect.any(Object),
                previewEffects: expect.any(Object),
                effectChanges: expect.any(Object),
                isAvailable: true,
                canAfford: true
            });
        });

        test('should calculate effect changes correctly', () => {
            const preview = upgradeSystem.getUpgradePreview('engine_power', 'engine');
            
            expect(preview.effectChanges.power).toBeDefined();
            expect(preview.effectChanges.power.absolute).toBeGreaterThan(0);
            expect(preview.effectChanges.power.percentage).toBeGreaterThan(0);
        });

        test('should return null for invalid upgrade preview', () => {
            const preview = upgradeSystem.getUpgradePreview('invalid_upgrade', 'engine');
            expect(preview).toBeNull();
        });

        test('should disable preview when option is false', () => {
            const noPreviewSystem = new VehicleUpgradeSystem(vehicleConfig, {
                enableUpgradePreview: false
            });

            const preview = noPreviewSystem.getUpgradePreview('engine_power', 'engine');
            expect(preview).toBeNull();

            noPreviewSystem.dispose();
        });
    });

    describe('Upgrade Comparison', () => {
        test('should compare multiple upgrades', () => {
            const comparison = upgradeSystem.getUpgradeComparison([
                'engine_power',
                'transmission_efficiency',
                'suspension_stiffness'
            ]);

            expect(comparison.upgrades).toHaveLength(3);
            expect(comparison.recommendations).toBeDefined();
            expect(comparison.recommendations.length).toBeGreaterThan(0);
        });

        test('should generate recommendations', () => {
            const comparison = upgradeSystem.getUpgradeComparison(['engine_power', 'transmission_efficiency']);
            
            const recommendationTypes = comparison.recommendations.map(r => r.type);
            expect(recommendationTypes).toContain('most_efficient');
            expect(recommendationTypes).toContain('cheapest');
        });

        test('should calculate upgrade efficiency', () => {
            const enginePower = upgradeSystem.upgradeCategories.engine.upgrades.power;
            const efficiency = upgradeSystem.calculateUpgradeEfficiency(enginePower);
            
            expect(efficiency).toBeGreaterThan(0);
        });
    });

    describe('Visual Customization', () => {
        test('should apply paint customization', () => {
            const customizationSpy = jest.fn();
            upgradeSystem.on('visualCustomizationApplied', customizationSpy);

            const result = upgradeSystem.applyVisualCustomization('paint', {
                primary: '#00ff00',
                finish: 'matte'
            });

            expect(result).toBe(true);
            expect(upgradeSystem.visualCustomization.paintJob.primary).toBe('#00ff00');
            expect(upgradeSystem.visualCustomization.paintJob.finish).toBe('matte');
            expect(customizationSpy).toHaveBeenCalled();
        });

        test('should manage decals', () => {
            const decal = { id: 'flame1', type: 'flames', position: { x: 100, y: 50 } };
            
            // Add decal
            upgradeSystem.applyVisualCustomization('decals', { add: true, decal });
            expect(upgradeSystem.visualCustomization.decals).toContain(decal);
            
            // Remove decal
            upgradeSystem.applyVisualCustomization('decals', { remove: true, decalId: 'flame1' });
            expect(upgradeSystem.visualCustomization.decals).not.toContain(decal);
        });

        test('should apply body kit customization', () => {
            upgradeSystem.applyVisualCustomization('bodykit', { kit: 'aggressive' });
            expect(upgradeSystem.visualCustomization.bodyKit).toBe('aggressive');
        });

        test('should disable customization when option is false', () => {
            const noCustomizationSystem = new VehicleUpgradeSystem(vehicleConfig, {
                enableVisualCustomization: false
            });

            const result = noCustomizationSystem.applyVisualCustomization('paint', { primary: '#00ff00' });
            expect(result).toBe(false);

            noCustomizationSystem.dispose();
        });

        test('should get visual customization options', () => {
            const options = upgradeSystem.getVisualCustomizationOptions();
            
            expect(options.paintJobs).toBeDefined();
            expect(options.decalPackages).toBeDefined();
            expect(options.bodyKits).toBeDefined();
            expect(options.wheels).toBeDefined();
            expect(options.spoilers).toBeDefined();
        });
    });

    describe('Player Progression', () => {
        test('should add currency', () => {
            const currencySpy = jest.fn();
            upgradeSystem.on('currencyAdded', currencySpy);

            const initialCurrency = upgradeSystem.playerData.currency;
            upgradeSystem.addCurrency(1000, 'reward');

            expect(upgradeSystem.playerData.currency).toBe(initialCurrency + 1000);
            expect(currencySpy).toHaveBeenCalledWith({
                amount: 1000,
                source: 'reward',
                newTotal: initialCurrency + 1000
            });
        });

        test('should add experience and level up', () => {
            const levelUpSpy = jest.fn();
            const experienceSpy = jest.fn();
            upgradeSystem.on('levelUp', levelUpSpy);
            upgradeSystem.on('experienceAdded', experienceSpy);

            upgradeSystem.addExperience(500); // Should level up to level 3

            expect(upgradeSystem.playerData.experience).toBe(500);
            expect(upgradeSystem.playerData.level).toBe(3);
            expect(levelUpSpy).toHaveBeenCalled();
            expect(experienceSpy).toHaveBeenCalled();
        });

        test('should calculate level from experience correctly', () => {
            expect(upgradeSystem.calculateLevelFromExperience(0)).toBe(1);
            expect(upgradeSystem.calculateLevelFromExperience(100)).toBe(2);
            expect(upgradeSystem.calculateLevelFromExperience(400)).toBe(3);
            expect(upgradeSystem.calculateLevelFromExperience(900)).toBe(4);
        });

        test('should unlock upgrades by level', () => {
            const initialUnlocked = upgradeSystem.playerData.unlockedUpgrades.size;
            upgradeSystem.unlockUpgradesByLevel(5);
            
            expect(upgradeSystem.playerData.unlockedUpgrades.size).toBeGreaterThan(initialUnlocked);
        });

        test('should get player statistics', () => {
            const stats = upgradeSystem.getPlayerStats();
            
            expect(stats).toEqual({
                currency: expect.any(Number),
                experience: expect.any(Number),
                level: expect.any(Number),
                upgradesPurchased: expect.any(Number),
                totalUpgradesAvailable: expect.any(Number),
                unlockedUpgrades: expect.any(Number),
                nextLevelExperience: expect.any(Number),
                experienceToNextLevel: expect.any(Number)
            });
        });
    });

    describe('Save/Load System', () => {
        test('should save upgrade progress', () => {
            upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            upgradeSystem.addCurrency(1000);
            upgradeSystem.addExperience(200);

            upgradeSystem.saveUpgradeProgress();

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'vehicleUpgradeProgress',
                expect.stringContaining('currency')
            );
        });

        test('should load upgrade progress', () => {
            const saveData = {
                playerData: {
                    currency: 10000,
                    experience: 500,
                    level: 3,
                    unlockedUpgrades: ['engine_power_1', 'transmission_efficiency_1']
                },
                currentUpgrades: { 'engine_power': 2 },
                visualCustomization: { paintJob: { primary: '#00ff00' } }
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(saveData));

            upgradeSystem.loadUpgradeProgress();

            expect(upgradeSystem.playerData.currency).toBe(10000);
            expect(upgradeSystem.playerData.experience).toBe(500);
            expect(upgradeSystem.playerData.level).toBe(3);
            expect(upgradeSystem.getCurrentUpgradeLevel('engine_power')).toBe(2);
        });

        test('should handle corrupted save data gracefully', () => {
            localStorageMock.getItem.mockReturnValue('invalid json');

            expect(() => {
                upgradeSystem.loadUpgradeProgress();
            }).not.toThrow();
        });
    });

    describe('Configuration Import/Export', () => {
        test('should export configuration', () => {
            upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            upgradeSystem.applyVisualCustomization('paint', { primary: '#00ff00' });

            const config = upgradeSystem.exportConfiguration();

            expect(config).toEqual({
                upgrades: expect.any(Object),
                visual: expect.any(Object),
                effects: expect.any(Object),
                playerLevel: expect.any(Number),
                exportDate: expect.any(String)
            });
        });

        test('should import configuration', () => {
            const config = {
                upgrades: { 'engine_power': 3 },
                visual: { paintJob: { primary: '#ff00ff' } }
            };

            const importSpy = jest.fn();
            upgradeSystem.on('configurationImported', importSpy);

            const result = upgradeSystem.importConfiguration(config);

            expect(result).toBe(true);
            expect(upgradeSystem.getCurrentUpgradeLevel('engine_power')).toBe(3);
            expect(upgradeSystem.visualCustomization.paintJob.primary).toBe('#ff00ff');
            expect(importSpy).toHaveBeenCalled();
        });

        test('should reject invalid configuration', () => {
            expect(() => {
                upgradeSystem.importConfiguration(null);
            }).toThrow('Invalid configuration data');

            expect(() => {
                upgradeSystem.importConfiguration('invalid');
            }).toThrow('Invalid configuration data');
        });
    });

    describe('System Management', () => {
        test('should get system status', () => {
            const status = upgradeSystem.getSystemStatus();

            expect(status).toEqual({
                playerStats: expect.any(Object),
                upgradeEffects: expect.any(Object),
                visualCustomization: expect.any(Object),
                currentUpgrades: expect.any(Object),
                availableCategories: expect.any(Array),
                systemOptions: expect.any(Object)
            });
        });

        test('should reset all upgrades', () => {
            upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            upgradeSystem.addCurrency(1000);
            upgradeSystem.addExperience(500);

            const resetSpy = jest.fn();
            upgradeSystem.on('upgradesReset', resetSpy);

            upgradeSystem.resetUpgrades();

            expect(upgradeSystem.currentUpgrades.size).toBe(0);
            expect(upgradeSystem.playerData.currency).toBe(upgradeSystem.options.startingCurrency);
            expect(upgradeSystem.playerData.experience).toBe(0);
            expect(upgradeSystem.playerData.level).toBe(1);
            expect(resetSpy).toHaveBeenCalled();
        });

        test('should dispose properly', () => {
            const saveSpy = jest.spyOn(upgradeSystem, 'saveUpgradeProgress');
            
            upgradeSystem.dispose();

            expect(saveSpy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing upgrade categories gracefully', () => {
            expect(() => {
                upgradeSystem.getAvailableUpgrades('nonexistent');
            }).not.toThrow();

            const result = upgradeSystem.getAvailableUpgrades('nonexistent');
            expect(result).toEqual([]);
        });

        test('should handle zero currency correctly', () => {
            upgradeSystem.playerData.currency = 0;
            
            expect(() => {
                upgradeSystem.purchaseUpgrade('engine_power', 'engine');
            }).toThrow('Insufficient currency');
        });

        test('should handle maximum level upgrades', () => {
            const enginePower = upgradeSystem.upgradeCategories.engine.upgrades.power;
            upgradeSystem.currentUpgrades.set('engine_power', enginePower.maxLevel);

            expect(upgradeSystem.isUpgradeAvailable(enginePower)).toBe(false);
            expect(upgradeSystem.calculateUpgradeCost(enginePower)).toBeNull();
        });

        test('should handle invalid visual customization types', () => {
            const result = upgradeSystem.applyVisualCustomization('invalid_type', {});
            expect(result).toBe(false);
        });
    });
});