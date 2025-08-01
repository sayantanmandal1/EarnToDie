import { UpgradeIntegration } from '../UpgradeIntegration';
import { EventEmitter } from 'events';

// Mock systems
const mockUpgradeManager = new EventEmitter();
mockUpgradeManager.isInitialized = false;
mockUpgradeManager.initialize = jest.fn().mockResolvedValue(true);
mockUpgradeManager.getPlayerCurrency = jest.fn().mockReturnValue(1000);
mockUpgradeManager.updatePlayerCurrency = jest.fn();
mockUpgradeManager.getPlayerVehicles = jest.fn().mockReturnValue([
    { id: 1, vehicle_type: 'sedan' },
    { id: 2, vehicle_type: 'suv' }
]);
mockUpgradeManager.canAffordAnyUpgrade = jest.fn().mockReturnValue(true);
mockUpgradeManager.getVehicleUpgrades = jest.fn().mockReturnValue({
    upgrades: {
        engine: { isMaxLevel: false, canAfford: true, currentLevel: 1, cost: 200 },
        armor: { isMaxLevel: false, canAfford: true, currentLevel: 0, cost: 150 },
        weapons: { isMaxLevel: true, canAfford: false, currentLevel: 5, cost: 0 }
    }
});

const mockScoringSystem = new EventEmitter();
mockScoringSystem.calculateCurrency = jest.fn().mockReturnValue({
    baseCurrency: 100,
    bonusCurrency: 20,
    totalCurrency: 120,
    bonusMultiplier: 1.2
});
mockScoringSystem.getSessionStats = jest.fn().mockReturnValue({
    totalPoints: 1000,
    zombiesKilled: 50,
    achievements: [
        { id: 'first_blood', name: 'First Blood' },
        { id: 'kill_10', name: 'Zombie Hunter' }
    ]
});

const mockApiClient = {
    post: jest.fn()
};

describe('UpgradeIntegration', () => {
    let upgradeIntegration;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApiClient.post.mockResolvedValue({
            data: { success: true, new_currency: 1120 }
        });

        upgradeIntegration = new UpgradeIntegration(
            mockUpgradeManager,
            mockScoringSystem,
            mockApiClient
        );
    });

    afterEach(() => {
        if (upgradeIntegration) {
            upgradeIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await upgradeIntegration.initialize();

            expect(mockUpgradeManager.initialize).toHaveBeenCalled();
            expect(upgradeIntegration.isInitialized).toBe(true);
        });

        test('should handle missing systems', async () => {
            const integration = new UpgradeIntegration(null, mockScoringSystem, mockApiClient);

            await expect(integration.initialize())
                .rejects.toThrow('Required systems not available');
        });

        test('should emit initialized event', async () => {
            const initSpy = jest.fn();
            upgradeIntegration.on('initialized', initSpy);

            await upgradeIntegration.initialize();

            expect(initSpy).toHaveBeenCalled();
        });
    });

    describe('Session End Handling', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should handle session end and convert currency', async () => {
            const currencyEarnedSpy = jest.fn();
            upgradeIntegration.on('currencyEarned', currencyEarnedSpy);

            const sessionResult = {
                final_score: 1000,
                zombies_killed: 50,
                currency_earned: 120
            };

            // Simulate session end
            mockScoringSystem.emit('sessionEnded', sessionResult);

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/player/currency', {
                amount: 120,
                operation: 'add',
                source: 'gameplay'
            });

            expect(mockUpgradeManager.updatePlayerCurrency).toHaveBeenCalledWith(1120);
            expect(currencyEarnedSpy).toHaveBeenCalledWith({
                amount: 120,
                breakdown: expect.any(Object),
                sessionResult
            });
        });

        test('should handle zero currency earned', async () => {
            mockScoringSystem.calculateCurrency.mockReturnValue({
                totalCurrency: 0
            });

            const currencyEarnedSpy = jest.fn();
            upgradeIntegration.on('currencyEarned', currencyEarnedSpy);

            mockScoringSystem.emit('sessionEnded', {});

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockApiClient.post).not.toHaveBeenCalled();
            expect(currencyEarnedSpy).not.toHaveBeenCalled();
        });

        test('should handle currency update errors', async () => {
            // Set up error listener first
            const errorSpy = jest.fn();
            upgradeIntegration.on('error', errorSpy);

            // Reset the mock to ensure it rejects
            mockApiClient.post.mockReset();
            mockApiClient.post.mockRejectedValue(new Error('Network error'));

            // Ensure the scoring system returns currency to trigger the API call
            mockScoringSystem.calculateCurrency.mockReturnValue({
                baseCurrency: 100,
                bonusCurrency: 20,
                totalCurrency: 120,
                bonusMultiplier: 1.2
            });

            mockScoringSystem.emit('sessionEnded', {});

            // Wait longer for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(errorSpy).toHaveBeenCalledWith({
                type: 'currency_conversion',
                error: expect.any(Error)
            });
        });
    });

    describe('Points Scoring Handling', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should handle points scored and emit currency preview', () => {
            const currencyPreviewSpy = jest.fn();
            upgradeIntegration.on('currencyPreview', currencyPreviewSpy);

            const pointsData = {
                totalPoints: 500,
                basePoints: 50,
                multiplier: 2.0
            };

            mockScoringSystem.emit('pointsScored', pointsData);

            expect(currencyPreviewSpy).toHaveBeenCalledWith({
                points: 500,
                potentialCurrency: 50, // 500 * 0.1
                conversionRate: 0.1
            });
        });
    });

    describe('Upgrade Completion Handling', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should handle upgrade completion', () => {
            const upgradeIntegratedSpy = jest.fn();
            upgradeIntegration.on('upgradeIntegrated', upgradeIntegratedSpy);

            const upgradeData = {
                vehicleId: 1,
                category: 'engine',
                newLevel: 2,
                cost: 200
            };

            mockUpgradeManager.emit('upgradeCompleted', upgradeData);

            expect(upgradeIntegratedSpy).toHaveBeenCalledWith({
                ...upgradeData,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Achievement Handling', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should handle achievement with currency bonus', async () => {
            const bonusCurrencyEarnedSpy = jest.fn();
            upgradeIntegration.on('bonusCurrencyEarned', bonusCurrencyEarnedSpy);

            const achievement = {
                id: 'boss_slayer',
                name: 'Boss Slayer',
                currencyBonus: 50
            };

            mockScoringSystem.emit('achievementUnlocked', achievement);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(bonusCurrencyEarnedSpy).toHaveBeenCalledWith({
                amount: 50,
                source: 'achievement',
                achievement
            });
        });

        test('should ignore achievement without currency bonus', () => {
            const bonusCurrencyEarnedSpy = jest.fn();
            upgradeIntegration.on('bonusCurrencyEarned', bonusCurrencyEarnedSpy);

            const achievement = {
                id: 'first_blood',
                name: 'First Blood'
                // No currencyBonus property
            };

            mockScoringSystem.emit('achievementUnlocked', achievement);

            expect(bonusCurrencyEarnedSpy).not.toHaveBeenCalled();
        });
    });

    describe('Upgrade Recommendations', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should get upgrade recommendations', () => {
            const recommendations = upgradeIntegration.getUpgradeRecommendations(1);

            expect(recommendations).toMatchObject({
                vehicleId: 1,
                playerCurrency: 1000,
                totalAffordable: 2 // engine and armor (weapons is maxed)
            });

            expect(recommendations.recommendations).toHaveLength(2);
            expect(recommendations.recommendations[0]).toHaveProperty('category');
            expect(recommendations.recommendations[0]).toHaveProperty('priority');
            expect(recommendations.recommendations[0]).toHaveProperty('reasoning');
        });

        test('should prioritize engine upgrades', () => {
            const recommendations = upgradeIntegration.getUpgradeRecommendations(1);

            // Engine should have higher priority than armor
            const engineRec = recommendations.recommendations.find(r => r.category === 'engine');
            const armorRec = recommendations.recommendations.find(r => r.category === 'armor');

            expect(engineRec.priority).toBeGreaterThan(armorRec.priority);
        });

        test('should handle vehicle not found', () => {
            mockUpgradeManager.getVehicleUpgrades.mockImplementation(() => {
                throw new Error('Vehicle not found');
            });

            const recommendations = upgradeIntegration.getUpgradeRecommendations(999);

            expect(recommendations).toBeNull();
        });
    });

    describe('Currency Preview', () => {
        test('should calculate currency preview correctly', () => {
            const preview = upgradeIntegration.getCurrencyPreview(1000);

            expect(preview).toMatchObject({
                points: 1000,
                baseCurrency: 100, // 1000 * 0.1
                bonusMultiplier: 1.1, // 1 + (2 achievements * 0.05)
                totalCurrency: 110, // 100 * 1.1
                conversionRate: 0.1
            });
        });
    });

    describe('Integration Statistics', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should get integration statistics', () => {
            const stats = upgradeIntegration.getIntegrationStats();

            expect(stats).toMatchObject({
                session: {
                    points: 1000,
                    zombiesKilled: 50,
                    achievements: 2
                },
                currency: {
                    current: 1000,
                    potential: expect.any(Number),
                    conversionRate: 0.1
                },
                upgrades: {
                    totalVehicles: 2,
                    affordableUpgrades: expect.any(Number)
                }
            });
        });
    });

    describe('Currency Settings', () => {
        test('should update currency settings', () => {
            const settingsUpdatedSpy = jest.fn();
            upgradeIntegration.on('settingsUpdated', settingsUpdatedSpy);

            const newSettings = {
                conversionRate: 0.15,
                autoConvert: false
            };

            upgradeIntegration.updateCurrencySettings(newSettings);

            expect(upgradeIntegration.currencySettings.conversionRate).toBe(0.15);
            expect(upgradeIntegration.currencySettings.autoConvert).toBe(false);
            expect(settingsUpdatedSpy).toHaveBeenCalledWith(upgradeIntegration.currencySettings);
        });
    });

    describe('Currency Sync', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should sync currency with backend', async () => {
            mockUpgradeManager.loadPlayerCurrency = jest.fn().mockResolvedValue(true);

            await upgradeIntegration.syncCurrency();

            expect(mockUpgradeManager.loadPlayerCurrency).toHaveBeenCalled();
        });

        test('should handle sync errors', async () => {
            mockUpgradeManager.loadPlayerCurrency = jest.fn().mockRejectedValue(new Error('Sync failed'));

            await expect(upgradeIntegration.syncCurrency())
                .rejects.toThrow('Sync failed');
        });
    });

    describe('Currency Update Prevention', () => {
        beforeEach(async () => {
            await upgradeIntegration.initialize();
        });

        test('should prevent concurrent currency updates', async () => {
            // Make the first call hang
            let resolveFirst;
            const firstPromise = new Promise(resolve => {
                resolveFirst = resolve;
            });
            mockApiClient.post.mockReturnValueOnce(firstPromise);

            // Start first update
            const firstUpdate = upgradeIntegration._updatePlayerCurrency(100);

            // Start second update immediately
            const secondUpdate = upgradeIntegration._updatePlayerCurrency(50);

            // Resolve first update
            resolveFirst({ data: { success: true } });
            await firstUpdate;

            // Second update should have been queued/ignored
            await secondUpdate;

            // Should only have been called once
            expect(mockApiClient.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('Disposal', () => {
        test('should dispose properly', async () => {
            await upgradeIntegration.initialize();

            upgradeIntegration.dispose();

            expect(upgradeIntegration.isInitialized).toBe(false);
        });
    });
});