import SaveManager from '../SaveManager.js';
import { SaveAPIError } from '../SaveAPI.js';

// Create a proper localStorage mock
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Override the global localStorage with our mock
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

// Mock API client
const mockApiClient = {
    request: jest.fn()
};

describe('SaveManager', () => {
    let saveManager;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
        
        saveManager = new SaveManager(mockApiClient, {
            autoSaveInterval: 0, // Disable auto-save for tests
            syncOnlineEnabled: false // Disable sync for tests
        });
    });

    afterEach(() => {
        if (saveManager) {
            saveManager.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default save state', async () => {
            const result = await saveManager.initialize();
            
            expect(result).toBe(true);
            expect(saveManager.saveState.version).toBe('1.0.0');
            expect(saveManager.saveState.player.currency).toBe(0);
            expect(saveManager.saveState.levels.unlocked).toContain('level_1');
        });

        test('should load existing save data from localStorage', async () => {
            const existingSaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 1000, level: 5 },
                vehicles: { owned: ['vehicle_1'], selected: 'vehicle_1' },
                levels: { unlocked: ['level_1', 'level_2'] }
            };
            
            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingSaveData));
            
            await saveManager.initialize();
            
            expect(saveManager.saveState.player.currency).toBe(1000);
            expect(saveManager.saveState.player.level).toBe(5);
            expect(saveManager.saveState.vehicles.owned).toContain('vehicle_1');
        });

        test('should handle corrupted save data', async () => {
            localStorageMock.getItem.mockReturnValue('invalid json');
            
            const result = await saveManager.initialize();
            
            expect(result).toBe(true);
            expect(saveManager.saveState.player.currency).toBe(0); // Should use defaults
        });
    });

    describe('Save Data Validation', () => {
        test('should validate correct save data', () => {
            const validData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 100 },
                vehicles: { owned: [] },
                levels: { progress: {} }
            };
            
            const validation = saveManager.validateSaveData(validData);
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should detect missing required fields', () => {
            const invalidData = {
                version: '1.0.0'
                // Missing other required fields
            };
            
            const validation = saveManager.validateSaveData(invalidData);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Missing timestamp');
            expect(validation.errors).toContain('Missing player data');
        });

        test('should detect invalid data types', () => {
            const invalidData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 'invalid' },
                vehicles: { owned: 'not an array' },
                levels: { progress: 'not an object' }
            };
            
            const validation = saveManager.validateSaveData(invalidData);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Invalid currency type');
            expect(validation.errors).toContain('Invalid vehicles.owned type');
        });
    });

    describe('Save Data Repair', () => {
        test('should repair corrupted save data', () => {
            const corruptedData = {
                player: { currency: 'invalid', level: 5 },
                vehicles: { owned: 'not an array' },
                levels: { progress: { level_1: { score: 1000 } } }
            };
            
            const repaired = saveManager.repairSaveData(corruptedData, ['Invalid currency type']);
            
            expect(repaired).toBeTruthy();
            expect(repaired.player.level).toBe(5); // Valid data preserved
            expect(repaired.player.currency).toBe(0); // Invalid data replaced with default
            expect(repaired.version).toBe('1.0.0');
            expect(repaired.timestamp).toBeDefined();
        });
    });

    describe('Local Storage Operations', () => {
        test('should save to localStorage', async () => {
            saveManager.saveState.player.currency = 500;
            
            const result = await saveManager.saveToLocalStorage();
            
            expect(result).toBe(true);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_car_game_save',
                expect.any(String)
            );
        });

        test('should create backup before saving', async () => {
            saveManager.saveState.player.currency = 500;
            
            await saveManager.saveToLocalStorage();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_car_game_backups',
                expect.any(String)
            );
        });

        test('should handle localStorage errors', async () => {
            const originalSetItem = localStorageMock.setItem;
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            
            await expect(saveManager.saveToLocalStorage()).rejects.toThrow('Storage quota exceeded');
            
            // Restore original mock
            localStorageMock.setItem = originalSetItem;
        });
    });

    describe('Backup Management', () => {
        test('should create and manage backups', async () => {
            const backups = [
                { timestamp: Date.now() - 1000, data: { player: { currency: 100 } } },
                { timestamp: Date.now() - 2000, data: { player: { currency: 200 } } }
            ];
            
            localStorageMock.getItem.mockReturnValue(JSON.stringify(backups));
            
            await saveManager.createBackup();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_car_game_backups',
                expect.stringContaining('"currency":0') // Current save state
            );
        });

        test('should limit number of backups', async () => {
            saveManager.options.maxLocalSaves = 2;
            
            const manyBackups = Array.from({ length: 5 }, (_, i) => ({
                timestamp: Date.now() - i * 1000,
                data: { player: { currency: i * 100 } }
            }));
            
            localStorageMock.getItem.mockReturnValue(JSON.stringify(manyBackups));
            
            await saveManager.createBackup();
            
            const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedBackups).toHaveLength(2); // Should keep only 2 backups
        });

        test('should recover from backup', async () => {
            const backups = [
                { 
                    timestamp: Date.now() - 1000, 
                    data: { 
                        version: '1.0.0',
                        timestamp: Date.now() - 1000,
                        player: { currency: 1000 },
                        vehicles: { owned: [] },
                        levels: { progress: {} }
                    } 
                }
            ];
            
            localStorageMock.getItem.mockReturnValue(JSON.stringify(backups));
            
            const result = await saveManager.recoverFromBackup();
            
            expect(result).toBe(true);
            expect(saveManager.saveState.player.currency).toBe(1000);
        });
    });

    describe('Data Updates', () => {
        test('should update player data', () => {
            const playerData = { currency: 1500, level: 3 };
            
            saveManager.updatePlayerData(playerData);
            
            expect(saveManager.saveState.player.currency).toBe(1500);
            expect(saveManager.saveState.player.level).toBe(3);
            expect(saveManager.saveState.timestamp).toBeGreaterThan(0);
        });

        test('should update vehicle data', () => {
            const vehicleData = { owned: ['vehicle_1', 'vehicle_2'], selected: 'vehicle_2' };
            
            saveManager.updateVehicleData(vehicleData);
            
            expect(saveManager.saveState.vehicles.owned).toEqual(['vehicle_1', 'vehicle_2']);
            expect(saveManager.saveState.vehicles.selected).toBe('vehicle_2');
        });

        test('should update level progress', () => {
            const levelId = 'level_2';
            const progressData = { completed: true, score: 5000, time: 120000 };
            
            saveManager.updateLevelProgress(levelId, progressData);
            
            expect(saveManager.saveState.levels.progress[levelId]).toEqual(progressData);
            expect(saveManager.saveState.levels.bestScores[levelId]).toBe(5000);
            expect(saveManager.saveState.levels.completed).toContain(levelId);
        });

        test('should update statistics', () => {
            const stats = { totalZombiesKilled: 50, totalDistanceTraveled: 1000 };
            
            saveManager.updateStatistics(stats);
            
            expect(saveManager.saveState.statistics.totalZombiesKilled).toBe(50);
            expect(saveManager.saveState.statistics.totalDistanceTraveled).toBe(1000);
        });

        test('should add achievements', () => {
            const achievement = { id: 'first_kill', name: 'First Kill', points: 10 };
            
            saveManager.addAchievement(achievement);
            
            expect(saveManager.saveState.achievements).toHaveLength(1);
            expect(saveManager.saveState.achievements[0].id).toBe('first_kill');
            expect(saveManager.saveState.achievements[0].unlockedAt).toBeDefined();
        });

        test('should not add duplicate achievements', () => {
            const achievement = { id: 'first_kill', name: 'First Kill', points: 10 };
            
            saveManager.addAchievement(achievement);
            saveManager.addAchievement(achievement); // Try to add again
            
            expect(saveManager.saveState.achievements).toHaveLength(1);
        });
    });

    describe('Backend Synchronization', () => {
        beforeEach(() => {
            saveManager.options.syncOnlineEnabled = true;
        });

        test('should sync with backend when local data is newer', async () => {
            const serverData = {
                timestamp: Date.now() - 10000,
                player: { currency: 500 }
            };
            
            mockApiClient.request
                .mockResolvedValueOnce({ data: { save_data: serverData } }) // GET request
                .mockResolvedValueOnce({ success: true }); // PUT request
            
            saveManager.saveState.timestamp = Date.now();
            saveManager.saveState.player.currency = 1000;
            
            await saveManager.syncWithBackend();
            
            expect(mockApiClient.request).toHaveBeenCalledWith('/player/save', {
                method: 'PUT',
                body: expect.stringContaining('"currency":1000')
            });
        });

        test('should download server data when it is newer', async () => {
            const serverData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 2000 },
                vehicles: { owned: [] },
                levels: { progress: {} },
                settings: {},
                achievements: [],
                statistics: { totalZombiesKilled: 0, totalDistanceTraveled: 0, totalGamesPlayed: 0, totalPlayTime: 0 },
                gameState: { currentSession: null, lastLevel: null, checkpoint: null }
            };
            
            // Mock the API call for getting server data
            mockApiClient.request.mockImplementation((url) => {
                if (url === '/player/save') {
                    return Promise.resolve({ data: { save_data: serverData } });
                }
                return Promise.resolve({ data: {} });
            });
            
            saveManager.saveState.timestamp = Date.now() - 10000;
            saveManager.saveState.player.currency = 500;
            
            await saveManager.syncWithBackend();
            
            expect(saveManager.saveState.player.currency).toBe(2000);
        });

        test('should handle sync errors gracefully', async () => {
            mockApiClient.request.mockRejectedValue(new SaveAPIError(500, 'Server error'));
            
            await saveManager.syncWithBackend();
            
            expect(saveManager.syncStatus.lastError).toBe('Server error');
            expect(saveManager.syncStatus.syncInProgress).toBe(false);
        });

        test('should merge save data intelligently', () => {
            const localData = {
                player: { currency: 1000, level: 3 },
                statistics: { totalZombiesKilled: 100, totalDistanceTraveled: 5000 },
                levels: { bestScores: { level_1: 2000, level_2: 1500 } },
                achievements: [{ id: 'achievement_1' }]
            };
            
            const serverData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 1500, level: 4 },
                statistics: { totalZombiesKilled: 80, totalDistanceTraveled: 6000 },
                levels: { bestScores: { level_1: 1800, level_3: 3000 } },
                achievements: [{ id: 'achievement_2' }]
            };
            
            const merged = saveManager.mergeSaveData(localData, serverData);
            
            expect(merged.player.currency).toBe(1500); // Server data used
            expect(merged.statistics.totalZombiesKilled).toBe(100); // Max value used
            expect(merged.statistics.totalDistanceTraveled).toBe(6000); // Max value used
            expect(merged.levels.bestScores.level_1).toBe(2000); // Max score used
            expect(merged.levels.bestScores.level_3).toBe(3000); // Server score used
            expect(merged.achievements).toHaveLength(2); // Both achievements merged
        });
    });

    describe('Import/Export', () => {
        test('should export save data', () => {
            saveManager.saveState.player.currency = 1000;
            saveManager.saveState.vehicles.owned = ['vehicle_1'];
            
            const exported = saveManager.exportSaveData();
            const parsed = JSON.parse(exported);
            
            expect(parsed.player.currency).toBe(1000);
            expect(parsed.vehicles.owned).toContain('vehicle_1');
            expect(parsed.exportedAt).toBeDefined();
            expect(parsed.gameVersion).toBe('1.0.0');
        });

        test('should import save data', async () => {
            const importData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { currency: 2000, level: 5 },
                vehicles: { owned: ['vehicle_1', 'vehicle_2'] },
                levels: { progress: {} },
                settings: {},
                achievements: [],
                statistics: { totalZombiesKilled: 0, totalDistanceTraveled: 0, totalGamesPlayed: 0, totalPlayTime: 0 },
                gameState: { currentSession: null, lastLevel: null, checkpoint: null }
            };
            
            const result = await saveManager.importSaveData(JSON.stringify(importData));
            
            expect(result).toBe(true);
            expect(saveManager.saveState.player.currency).toBe(2000);
            expect(saveManager.saveState.vehicles.owned).toEqual(['vehicle_1', 'vehicle_2']);
        });

        test('should reject invalid import data', async () => {
            const invalidData = { invalid: 'data' };
            
            await expect(saveManager.importSaveData(JSON.stringify(invalidData)))
                .rejects.toThrow('Invalid save data');
        });
    });

    describe('Auto-save', () => {
        test('should start and stop auto-save', () => {
            jest.useFakeTimers();
            
            saveManager.options.autoSaveInterval = 1000;
            saveManager.startAutoSave();
            
            expect(saveManager.autoSaveTimer).toBeDefined();
            
            saveManager.stopAutoSave();
            
            expect(saveManager.autoSaveTimer).toBeNull();
            
            jest.useRealTimers();
        });

        test('should perform auto-save at intervals', async () => {
            jest.useFakeTimers();
            
            const saveSpy = jest.spyOn(saveManager, 'saveToLocalStorage').mockResolvedValue(true);
            
            saveManager.options.autoSaveInterval = 1000;
            saveManager.startAutoSave();
            
            jest.advanceTimersByTime(1000);
            
            expect(saveSpy).toHaveBeenCalledTimes(1);
            
            jest.advanceTimersByTime(1000);
            
            expect(saveSpy).toHaveBeenCalledTimes(2);
            
            saveManager.stopAutoSave();
            jest.useRealTimers();
        });
    });

    describe('Status and Utilities', () => {
        test('should return save manager status', () => {
            const status = saveManager.getStatus();
            
            expect(status.initialized).toBe(true);
            expect(status.saveState.version).toBe('1.0.0');
            expect(status.backupCount).toBe(0);
        });

        test('should clear all save data', async () => {
            saveManager.saveState.player.currency = 1000;
            
            const result = await saveManager.clearAllSaveData();
            
            expect(result).toBe(true);
            expect(saveManager.saveState.player.currency).toBe(0);
            expect(localStorageMock.removeItem).toHaveBeenCalledTimes(4); // All storage keys
        });
    });

    describe('Event Handling', () => {
        test('should emit events on save operations', async () => {
            const saveCompletedSpy = jest.fn();
            saveManager.on('saveCompleted', saveCompletedSpy);
            
            await saveManager.saveToLocalStorage();
            
            expect(saveCompletedSpy).toHaveBeenCalledWith(saveManager.saveState);
        });

        test('should emit events on data updates', () => {
            const playerDataUpdatedSpy = jest.fn();
            saveManager.on('playerDataUpdated', playerDataUpdatedSpy);
            
            const playerData = { currency: 500 };
            saveManager.updatePlayerData(playerData);
            
            expect(playerDataUpdatedSpy).toHaveBeenCalledWith(saveManager.saveState.player);
        });

        test('should emit events on achievement unlock', () => {
            const achievementUnlockedSpy = jest.fn();
            saveManager.on('achievementUnlocked', achievementUnlockedSpy);
            
            const achievement = { id: 'test_achievement', name: 'Test' };
            saveManager.addAchievement(achievement);
            
            expect(achievementUnlockedSpy).toHaveBeenCalledWith(achievement);
        });
    });
});