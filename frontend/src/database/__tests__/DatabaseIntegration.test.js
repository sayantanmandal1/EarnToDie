/**
 * Database Integration Tests
 */

import { DatabaseIntegration } from '../DatabaseIntegration.js';

// Mock electron integration
jest.mock('../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        isElectron: false,
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        })
    }
}));

describe('DatabaseIntegration', () => {
    let dbIntegration;

    beforeEach(() => {
        dbIntegration = new DatabaseIntegration();
    });

    afterEach(() => {
        if (dbIntegration) {
            dbIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize without Electron', async () => {
            const result = await dbIntegration.initialize();
            expect(result).toBe(false);
            expect(dbIntegration.isAvailable()).toBe(false);
        });

        test('should provide default player profile when database not available', async () => {
            const profile = await dbIntegration.getPlayerProfile();
            
            expect(profile).toMatchObject({
                id: 1,
                username: 'Player',
                level: 1,
                total_currency: 1000
            });
        });

        test('should provide default vehicles when database not available', async () => {
            const vehicles = await dbIntegration.getPlayerVehicles();
            
            expect(vehicles).toHaveLength(1);
            expect(vehicles[0]).toMatchObject({
                vehicle_type: 'sedan',
                is_owned: true
            });
        });
    });

    describe('Player Profile Operations', () => {
        test('should handle profile updates gracefully when database not available', async () => {
            const result = await dbIntegration.updatePlayerProfile({
                username: 'TestPlayer',
                level: 5
            });
            
            expect(result).toBe(false);
        });

        test('should handle currency operations when database not available', async () => {
            const addResult = await dbIntegration.addCurrency(100);
            const spendResult = await dbIntegration.spendCurrency(50);
            
            expect(addResult).toBe(false);
            expect(spendResult).toBe(false);
        });
    });

    describe('Vehicle Operations', () => {
        test('should handle vehicle purchase when database not available', async () => {
            const result = await dbIntegration.purchaseVehicle('truck', 5000);
            expect(result).toBe(false);
        });

        test('should handle vehicle upgrade when database not available', async () => {
            const result = await dbIntegration.upgradeVehicle(1, 'engine', 1000);
            expect(result).toBe(false);
        });
    });

    describe('Level Progress Operations', () => {
        test('should handle level progress updates when database not available', async () => {
            const result = await dbIntegration.updateLevelProgress('level-1', {
                score: 1000,
                completed: true,
                stars: 3
            });
            
            expect(result).toBe(false);
        });

        test('should return empty array for level progress when database not available', async () => {
            const progress = await dbIntegration.getLevelProgress();
            expect(progress).toEqual([]);
        });
    });

    describe('Game Session Operations', () => {
        test('should handle session start when database not available', async () => {
            const sessionId = await dbIntegration.startGameSession('level-1', 'sedan');
            expect(sessionId).toBeNull();
        });

        test('should handle session end when database not available', async () => {
            const result = await dbIntegration.endGameSession(1, {
                score: 1000,
                completed: true
            });
            
            expect(result).toBe(false);
        });
    });

    describe('Save Game Operations', () => {
        test('should return empty array for save games when database not available', async () => {
            const saves = await dbIntegration.getSaveGames();
            expect(saves).toEqual([]);
        });

        test('should handle save game creation when database not available', async () => {
            const result = await dbIntegration.createSaveGame({
                save_name: 'Test Save',
                save_data: { test: true }
            });
            
            expect(result).toBe(false);
        });
    });

    describe('Statistics Operations', () => {
        test('should return empty array for statistics when database not available', async () => {
            const stats = await dbIntegration.getStatistics();
            expect(stats).toEqual([]);
        });

        test('should handle statistic increment when database not available', async () => {
            const result = await dbIntegration.incrementStatistic('test_stat', 1);
            expect(result).toBe(false);
        });
    });

    describe('Export/Import Operations', () => {
        test('should return null for export when database not available', async () => {
            const data = await dbIntegration.exportGameData();
            expect(data).toBeNull();
        });

        test('should return false for import when database not available', async () => {
            const result = await dbIntegration.importGameData({});
            expect(result).toBe(false);
        });
    });

    describe('Cache Management', () => {
        test('should handle cache refresh when database not available', async () => {
            await expect(dbIntegration.refreshCache()).resolves.not.toThrow();
        });

        test('should detect when cache needs refresh', () => {
            // Set last update to old timestamp
            dbIntegration.lastCacheUpdate = Date.now() - (10 * 60 * 1000); // 10 minutes ago
            
            expect(dbIntegration.shouldRefreshCache()).toBe(true);
        });
    });
});