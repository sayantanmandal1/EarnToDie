import { UpgradeManager } from '../UpgradeManager';
import { EventEmitter } from 'events';

// Mock API client
const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
};

// Mock game engine
const mockGameEngine = new EventEmitter();
mockGameEngine.getActiveVehicle = jest.fn();

// Mock vehicle data
const mockVehicleConfigs = {
    sedan: {
        name: 'Family Sedan',
        base_stats: {
            speed: 60,
            acceleration: 40,
            armor: 30,
            fuelCapacity: 100,
            damage: 25,
            handling: 70
        },
        cost: 0,
        unlock_level: 1,
        upgrade_costs: {
            engine: [100, 200, 400, 800, 1600],
            armor: [150, 300, 600, 1200, 2400],
            weapons: [200, 400, 800, 1600, 3200],
            fuel: [80, 160, 320, 640, 1280],
            tires: [120, 240, 480, 960, 1920]
        }
    }
};

const mockPlayerVehicles = [
    {
        id: 1,
        vehicle_type: 'sedan',
        upgrades: {
            engine: 1,
            armor: 0,
            weapons: 2,
            fuel: 0,
            tires: 1
        },
        current_stats: {
            speed: 65,
            acceleration: 43,
            armor: 30,
            fuelCapacity: 100,
            damage: 41,
            handling: 74
        },
        upgrade_costs: {
            engine: 200,
            armor: 150,
            weapons: 800,
            fuel: 80,
            tires: 240
        }
    }
];

const mockPlayerProfile = {
    player: {
        currency: 1500
    }
};

describe('UpgradeManager', () => {
    let upgradeManager;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup API mock responses
        mockApiClient.get.mockImplementation((url) => {
            if (url === '/api/v1/vehicles/available') {
                return Promise.resolve({ data: { vehicles: mockVehicleConfigs } });
            } else if (url === '/api/v1/vehicles') {
                return Promise.resolve({ data: { vehicles: mockPlayerVehicles } });
            } else if (url === '/api/v1/player/profile') {
                return Promise.resolve({ data: mockPlayerProfile });
            }
            return Promise.reject(new Error('Unknown endpoint'));
        });

        upgradeManager = new UpgradeManager(mockGameEngine, mockApiClient);
    });

    afterEach(() => {
        if (upgradeManager) {
            upgradeManager.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await upgradeManager.initialize();

            expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/vehicles/available');
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/vehicles');
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/player/profile');
            expect(upgradeManager.getPlayerCurrency()).toBe(1500);
            expect(upgradeManager.getPlayerVehicles()).toHaveLength(1);
        });

        test('should handle initialization errors', async () => {
            mockApiClient.get.mockRejectedValue(new Error('Network error'));

            await expect(upgradeManager.initialize()).rejects.toThrow('Network error');
        });

        test('should emit initialized event', async () => {
            const initSpy = jest.fn();
            upgradeManager.on('initialized', initSpy);

            await upgradeManager.initialize();

            expect(initSpy).toHaveBeenCalled();
        });
    });

    describe('Upgrade Information', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should get upgrade info for valid vehicle and category', () => {
            const upgradeInfo = upgradeManager.getUpgradeInfo(1, 'engine');

            expect(upgradeInfo).toMatchObject({
                category: 'engine',
                vehicleId: 1,
                currentLevel: 1,
                nextLevel: 2,
                maxLevel: 5,
                isMaxLevel: false,
                cost: 200,
                canAfford: true
            });
        });

        test('should handle max level upgrades', () => {
            // Mock a vehicle with max engine level
            const maxVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 5 }
            };
            upgradeManager.playerVehicles.set(1, maxVehicle);

            const upgradeInfo = upgradeManager.getUpgradeInfo(1, 'engine');

            expect(upgradeInfo.isMaxLevel).toBe(true);
            expect(upgradeInfo.cost).toBe(0);
            expect(upgradeInfo.canAfford).toBe(false);
        });

        test('should handle insufficient funds', () => {
            upgradeManager.playerCurrency = 50; // Less than upgrade cost

            const upgradeInfo = upgradeManager.getUpgradeInfo(1, 'engine');

            expect(upgradeInfo.canAfford).toBe(false);
        });

        test('should throw error for invalid vehicle', () => {
            expect(() => {
                upgradeManager.getUpgradeInfo(999, 'engine');
            }).toThrow('Vehicle 999 not found');
        });

        test('should throw error for invalid category', () => {
            expect(() => {
                upgradeManager.getUpgradeInfo(1, 'invalid');
            }).toThrow('Invalid upgrade category: invalid');
        });
    });

    describe('Upgrade Purchase', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should purchase upgrade successfully', async () => {
            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            const result = await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/vehicles/upgrade', {
                vehicle_id: 1,
                upgrade_type: 'engine'
            });

            expect(result).toMatchObject({
                success: true,
                newLevel: 2,
                remainingCurrency: 1300 // 1500 - 200
            });

            expect(upgradeManager.getPlayerCurrency()).toBe(1300);
        });

        test('should handle max level upgrade attempt', async () => {
            const maxVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 5 }
            };
            upgradeManager.playerVehicles.set(1, maxVehicle);

            await expect(upgradeManager.purchaseUpgrade(1, 'engine'))
                .rejects.toThrow('engine is already at maximum level');
        });

        test('should handle insufficient funds', async () => {
            upgradeManager.playerCurrency = 50;

            await expect(upgradeManager.purchaseUpgrade(1, 'engine'))
                .rejects.toThrow('Insufficient funds. Need 200, have 50');
        });

        test('should handle API errors', async () => {
            mockApiClient.post.mockRejectedValue({
                response: { status: 400, data: { error: 'Insufficient funds' } }
            });

            await expect(upgradeManager.purchaseUpgrade(1, 'engine'))
                .rejects.toThrow('Insufficient funds');
        });

        test('should emit upgrade completed event', async () => {
            const upgradeSpy = jest.fn();
            upgradeManager.on('upgradeCompleted', upgradeSpy);

            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(upgradeSpy).toHaveBeenCalledWith({
                vehicleId: 1,
                category: 'engine',
                newLevel: 2,
                cost: 200,
                vehicle: updatedVehicle
            });
        });
    });

    describe('Vehicle Upgrades', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should get all upgrades for a vehicle', () => {
            const vehicleUpgrades = upgradeManager.getVehicleUpgrades(1);

            expect(vehicleUpgrades).toMatchObject({
                vehicleId: 1,
                vehicleType: 'sedan',
                vehicleName: 'Family Sedan'
            });

            expect(vehicleUpgrades.upgrades).toHaveProperty('engine');
            expect(vehicleUpgrades.upgrades).toHaveProperty('armor');
            expect(vehicleUpgrades.upgrades).toHaveProperty('weapons');
            expect(vehicleUpgrades.upgrades).toHaveProperty('fuel');
            expect(vehicleUpgrades.upgrades).toHaveProperty('tires');
        });

        test('should get upgrade preview', () => {
            const preview = upgradeManager.getUpgradePreview(1, 'engine');

            expect(preview).toMatchObject({
                category: 'engine',
                currentLevel: 1,
                nextLevel: 2,
                cost: 200
            });

            expect(preview.currentStats).toBeDefined();
            expect(preview.previewStats).toBeDefined();
            expect(preview.statChanges).toBeDefined();
        });

        test('should return null preview for max level', () => {
            const maxVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 5 }
            };
            upgradeManager.playerVehicles.set(1, maxVehicle);

            const preview = upgradeManager.getUpgradePreview(1, 'engine');

            expect(preview).toBeNull();
        });
    });

    describe('Upgrade Statistics', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should calculate upgrade stats correctly', () => {
            const stats = upgradeManager.getUpgradeStats(1);

            expect(stats).toMatchObject({
                totalLevels: 4, // 1+0+2+0+1
                maxPossibleLevels: 25, // 5 categories * 5 levels
                upgradeProgress: '16.0', // (4/25)*100
                isFullyUpgraded: false
            });

            expect(stats.categoryBreakdown).toEqual({
                engine: 1,
                armor: 0,
                weapons: 2,
                fuel: 0,
                tires: 1
            });
        });

        test('should detect fully upgraded vehicle', () => {
            const fullyUpgradedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: {
                    engine: 5,
                    armor: 5,
                    weapons: 5,
                    fuel: 5,
                    tires: 5
                }
            };
            upgradeManager.playerVehicles.set(1, fullyUpgradedVehicle);

            const stats = upgradeManager.getUpgradeStats(1);

            expect(stats.isFullyUpgraded).toBe(true);
            expect(stats.upgradeProgress).toBe('100.0');
        });

        test('should check if player can afford any upgrade', () => {
            const canAfford = upgradeManager.canAffordAnyUpgrade(1);
            expect(canAfford).toBe(true);

            // Test with insufficient funds
            upgradeManager.playerCurrency = 10;
            const cannotAfford = upgradeManager.canAffordAnyUpgrade(1);
            expect(cannotAfford).toBe(false);
        });
    });

    describe('Currency Management', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should get current player currency', () => {
            expect(upgradeManager.getPlayerCurrency()).toBe(1500);
        });

        test('should update player currency', () => {
            const currencySpy = jest.fn();
            upgradeManager.on('currencyUpdated', currencySpy);

            upgradeManager.updatePlayerCurrency(2000);

            expect(upgradeManager.getPlayerCurrency()).toBe(2000);
            expect(currencySpy).toHaveBeenCalledWith(2000, 1500);
        });

        test('should calculate total upgrade cost', () => {
            const totalCost = upgradeManager.getTotalUpgradeCost(1);
            
            // Should calculate cost for remaining upgrades
            expect(totalCost).toBeGreaterThan(0);
        });
    });

    describe('Active Vehicle Integration', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should apply upgrade to active vehicle', async () => {
            const mockActiveVehicle = {
                id: 1,
                applyUpgrade: jest.fn()
            };

            mockGameEngine.getActiveVehicle.mockReturnValue(mockActiveVehicle);

            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(mockActiveVehicle.applyUpgrade).toHaveBeenCalledWith('engine', 2);
        });

        test('should not apply upgrade to inactive vehicle', async () => {
            const mockActiveVehicle = {
                id: 2, // Different vehicle ID
                applyUpgrade: jest.fn()
            };

            mockGameEngine.getActiveVehicle.mockReturnValue(mockActiveVehicle);

            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(mockActiveVehicle.applyUpgrade).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should handle network errors gracefully', async () => {
            mockApiClient.post.mockRejectedValue(new Error('Network error'));

            await expect(upgradeManager.purchaseUpgrade(1, 'engine'))
                .rejects.toThrow('Failed to purchase upgrade. Please try again.');
        });

        test('should handle invalid vehicle gracefully', () => {
            expect(() => upgradeManager.getVehicleUpgrades(999))
                .toThrow('Vehicle 999 not found');
        });

        test('should handle missing vehicle config gracefully', () => {
            const vehicleWithoutConfig = {
                ...mockPlayerVehicles[0],
                vehicle_type: 'unknown'
            };
            upgradeManager.playerVehicles.set(1, vehicleWithoutConfig);

            const upgrades = upgradeManager.getVehicleUpgrades(1);
            expect(upgrades.vehicleName).toBe('unknown');
        });
    });

    describe('Visual Upgrade Effects', () => {
        beforeEach(async () => {
            await upgradeManager.initialize();
        });

        test('should apply visual effects to active vehicle when upgrade is purchased', async () => {
            const mockActiveVehicle = {
                id: 1,
                applyUpgrade: jest.fn(),
                _applyUpgradeVisuals: jest.fn()
            };

            mockGameEngine.getActiveVehicle.mockReturnValue(mockActiveVehicle);

            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(mockActiveVehicle.applyUpgrade).toHaveBeenCalledWith('engine', 2);
        });

        test('should not apply visual effects to inactive vehicle', async () => {
            const mockActiveVehicle = {
                id: 2, // Different vehicle ID
                applyUpgrade: jest.fn(),
                _applyUpgradeVisuals: jest.fn()
            };

            mockGameEngine.getActiveVehicle.mockReturnValue(mockActiveVehicle);

            const updatedVehicle = {
                ...mockPlayerVehicles[0],
                upgrades: { ...mockPlayerVehicles[0].upgrades, engine: 2 }
            };

            mockApiClient.post.mockResolvedValue({
                data: { vehicle: updatedVehicle }
            });

            await upgradeManager.purchaseUpgrade(1, 'engine');

            expect(mockActiveVehicle.applyUpgrade).not.toHaveBeenCalled();
        });
    });

    describe('Disposal', () => {
        test('should dispose properly', async () => {
            await upgradeManager.initialize();
            
            upgradeManager.dispose();

            expect(upgradeManager.playerVehicles.size).toBe(0);
            expect(upgradeManager.vehicleConfigs.size).toBe(0);
        });
    });
});