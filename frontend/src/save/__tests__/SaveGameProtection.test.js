/**
 * Save Game Protection System Tests
 */
import SaveGameProtection from '../SaveGameProtection.js';

// Mock crypto API
global.crypto = {
    subtle: {
        digest: jest.fn().mockImplementation((algorithm, data) => {
            const mockHash = new ArrayBuffer(32);
            const view = new Uint8Array(mockHash);
            for (let i = 0; i < 32; i++) {
                view[i] = i;
            }
            return Promise.resolve(mockHash);
        })
    }
};

// Mock IndexedDB
const mockIndexedDB = {
    open: jest.fn().mockImplementation(() => ({
        result: {
            transaction: jest.fn().mockReturnValue({
                objectStore: jest.fn().mockReturnValue({
                    get: jest.fn().mockReturnValue({ 
                        onsuccess: jest.fn(), 
                        onerror: jest.fn(),
                        result: null
                    }),
                    put: jest.fn().mockReturnValue({ 
                        onsuccess: jest.fn(), 
                        onerror: jest.fn() 
                    }),
                    delete: jest.fn().mockReturnValue({ 
                        onsuccess: jest.fn(), 
                        onerror: jest.fn() 
                    }),
                    getAll: jest.fn().mockReturnValue({
                        onsuccess: jest.fn(),
                        onerror: jest.fn(),
                        result: []
                    })
                })
            }),
            createObjectStore: jest.fn()
        },
        onsuccess: jest.fn(),
        onerror: jest.fn(),
        onupgradeneeded: jest.fn()
    }))
};
global.indexedDB = mockIndexedDB;

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock Blob and URL
global.Blob = jest.fn().mockImplementation((content, options) => ({
    size: content[0].length,
    type: options.type
}));

global.URL = {
    createObjectURL: jest.fn().mockReturnValue('mock-blob-url'),
    revokeObjectURL: jest.fn()
};

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
    readAsText: jest.fn(),
    onload: null,
    onerror: null,
    result: null
}));

// Mock CompressionStream
global.CompressionStream = jest.fn().mockImplementation(() => ({
    writable: {
        getWriter: jest.fn().mockReturnValue({
            write: jest.fn(),
            close: jest.fn()
        })
    },
    readable: {
        getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ 
                value: new Uint8Array([1, 2, 3]), 
                done: true 
            })
        })
    }
}));

describe('SaveGameProtection', () => {
    let mockSaveManager;
    let saveProtection;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSaveManager = {
            getCurrentSaveData: jest.fn(),
            loadSaveData: jest.fn(),
            getGameVersion: jest.fn().mockReturnValue('1.0.0'),
            addEventListener: jest.fn()
        };

        // Reset localStorage mock
        localStorageMock.getItem.mockReturnValue(null);
        localStorageMock.setItem.mockImplementation(() => {});

        // Mock IndexedDB success callbacks
        mockIndexedDB.open.mockImplementation(() => {
            const request = {
                result: {
                    transaction: jest.fn().mockReturnValue({
                        objectStore: jest.fn().mockReturnValue({
                            get: jest.fn().mockReturnValue({ 
                                onsuccess: jest.fn(), 
                                onerror: jest.fn(),
                                result: null
                            }),
                            put: jest.fn().mockReturnValue({ 
                                onsuccess: jest.fn(), 
                                onerror: jest.fn() 
                            }),
                            delete: jest.fn().mockReturnValue({ 
                                onsuccess: jest.fn(), 
                                onerror: jest.fn() 
                            }),
                            getAll: jest.fn().mockReturnValue({
                                onsuccess: jest.fn(),
                                onerror: jest.fn(),
                                result: []
                            })
                        })
                    }),
                    createObjectStore: jest.fn()
                },
                onsuccess: jest.fn(),
                onerror: jest.fn(),
                onupgradeneeded: jest.fn()
            };

            // Simulate successful connection
            setTimeout(() => {
                if (request.onsuccess) request.onsuccess();
            }, 0);

            return request;
        });
    });

    afterEach(() => {
        if (saveProtection) {
            saveProtection.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', async () => {
            saveProtection = new SaveGameProtection(mockSaveManager);
            
            expect(saveProtection.config.enableAutoBackup).toBe(true);
            expect(saveProtection.config.enableCorruptionDetection).toBe(true);
            expect(saveProtection.config.maxBackups).toBe(10);
            expect(saveProtection.config.checksumAlgorithm).toBe('sha256');
            expect(saveProtection.backupStorage).toBeInstanceOf(Map);
            expect(saveProtection.backupMetadata).toBeInstanceOf(Map);
        });

        test('should initialize with custom configuration', async () => {
            const customConfig = {
                enableAutoBackup: false,
                enableCorruptionDetection: false,
                maxBackups: 5,
                backupInterval: 60000,
                enableCloudSync: true
            };

            saveProtection = new SaveGameProtection(mockSaveManager, customConfig);
            
            expect(saveProtection.config.enableAutoBackup).toBe(false);
            expect(saveProtection.config.enableCorruptionDetection).toBe(false);
            expect(saveProtection.config.maxBackups).toBe(5);
            expect(saveProtection.config.backupInterval).toBe(60000);
            expect(saveProtection.config.enableCloudSync).toBe(true);
        });

        test('should load existing backup metadata', async () => {
            const mockMetadata = {
                'backup1': {
                    id: 'backup1',
                    timestamp: Date.now(),
                    type: 'auto',
                    checksum: 'abc123'
                }
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetadata));
            
            saveProtection = new SaveGameProtection(mockSaveManager);
            
            expect(saveProtection.backupMetadata.has('backup1')).toBe(true);
            expect(saveProtection.backupMetadata.get('backup1').checksum).toBe('abc123');
        });
    });

    describe('Backup Creation', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should create manual backup', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const result = await saveProtection.createBackup(mockSaveData, 'manual');
            
            expect(result.success).toBe(true);
            expect(result.backupId).toContain('manual_');
            expect(result.metadata.type).toBe('manual');
            expect(saveProtection.metrics.totalBackups).toBe(1);
            expect(saveProtection.metrics.successfulBackups).toBe(1);
        });

        test('should create auto backup', async () => {
            const mockSaveData = {
                playerLevel: 15,
                gameProgress: { level: 8 },
                timestamp: Date.now()
            };

            mockSaveManager.getCurrentSaveData.mockResolvedValue(mockSaveData);

            await saveProtection.performAutoBackup();
            
            expect(saveProtection.metrics.totalBackups).toBe(1);
            expect(saveProtection.backupMetadata.size).toBe(1);
        });

        test('should skip auto backup if data unchanged', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            // Create initial backup
            await saveProtection.createBackup(mockSaveData, 'manual');
            
            // Mock same data for auto backup
            mockSaveManager.getCurrentSaveData.mockResolvedValue(mockSaveData);

            await saveProtection.performAutoBackup();
            
            // Should still be only 1 backup
            expect(saveProtection.metrics.totalBackups).toBe(1);
        });

        test('should handle backup creation failure', async () => {
            // Mock IndexedDB failure
            mockIndexedDB.open.mockImplementation(() => {
                const request = {
                    onsuccess: jest.fn(),
                    onerror: jest.fn(),
                    onupgradeneeded: jest.fn()
                };

                setTimeout(() => {
                    if (request.onerror) request.onerror();
                }, 0);

                return request;
            });

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            await expect(saveProtection.createBackup(mockSaveData, 'manual')).rejects.toThrow();
            expect(saveProtection.metrics.failedBackups).toBe(1);
        });

        test('should cleanup old backups', async () => {
            // Set max backups to 2
            saveProtection.config.maxBackups = 2;

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            // Create 3 backups
            await saveProtection.createBackup(mockSaveData, 'manual');
            await saveProtection.createBackup(mockSaveData, 'manual');
            await saveProtection.createBackup(mockSaveData, 'manual');

            // Should only have 2 backups
            expect(saveProtection.backupMetadata.size).toBe(2);
        });
    });

    describe('Corruption Detection', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should detect corrupted save data', async () => {
            const corruptedSave = {
                // Missing required fields
                gameProgress: { level: 5 }
            };

            const isCorrupted = await saveProtection.checkSaveCorruption(corruptedSave);
            expect(isCorrupted).toBe(true);
        });

        test('should validate good save data', async () => {
            const validSave = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const isCorrupted = await saveProtection.checkSaveCorruption(validSave);
            expect(isCorrupted).toBe(false);
        });

        test('should detect invalid player level', async () => {
            const invalidSave = {
                playerLevel: -5, // Invalid negative level
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const isCorrupted = await saveProtection.checkSaveCorruption(invalidSave);
            expect(isCorrupted).toBe(true);
        });

        test('should detect invalid timestamp', async () => {
            const invalidSave = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: 'invalid-timestamp'
            };

            const isCorrupted = await saveProtection.checkSaveCorruption(invalidSave);
            expect(isCorrupted).toBe(true);
        });

        test('should perform corruption check on initialization', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            mockSaveManager.getCurrentSaveData.mockResolvedValue(mockSaveData);

            // Should not throw and should complete successfully
            expect(() => {
                saveProtection = new SaveGameProtection(mockSaveManager);
            }).not.toThrow();
        });
    });

    describe('Recovery Operations', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should recover from backup', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            // Create backup first
            const backupResult = await saveProtection.createBackup(mockSaveData, 'manual');
            
            // Mock current corrupted save
            mockSaveManager.getCurrentSaveData.mockResolvedValue({
                playerLevel: 'corrupted'
            });

            // Perform recovery
            const recoveryResult = await saveProtection.recoverFromBackup(backupResult.backupId);
            
            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.backupId).toBe(backupResult.backupId);
            expect(mockSaveManager.loadSaveData).toHaveBeenCalledWith(mockSaveData);
            expect(saveProtection.metrics.successfulRecoveries).toBe(1);
        });

        test('should handle recovery failure', async () => {
            await expect(saveProtection.recoverFromBackup('non-existent-backup')).rejects.toThrow();
        });

        test('should create pre-recovery backup', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const currentSave = {
                playerLevel: 15,
                gameProgress: { level: 8 },
                timestamp: Date.now()
            };

            // Create backup first
            const backupResult = await saveProtection.createBackup(mockSaveData, 'manual');
            
            // Mock current save
            mockSaveManager.getCurrentSaveData.mockResolvedValue(currentSave);

            // Perform recovery
            await saveProtection.recoverFromBackup(backupResult.backupId);
            
            // Should have created pre-recovery backup
            expect(saveProtection.backupMetadata.size).toBe(2);
        });
    });

    describe('Export/Import Operations', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
            
            // Mock DOM methods
            document.createElement = jest.fn().mockReturnValue({
                href: '',
                download: '',
                click: jest.fn(),
                remove: jest.fn()
            });
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
        });

        test('should export save game', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const result = await saveProtection.exportSaveGame(mockSaveData);
            
            expect(result.success).toBe(true);
            expect(result.filename).toContain('savegame_');
            expect(result.size).toBeGreaterThan(0);
            expect(global.Blob).toHaveBeenCalled();
        });

        test('should export with custom filename', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            const result = await saveProtection.exportSaveGame(mockSaveData, {
                filename: 'custom-save.json'
            });
            
            expect(result.filename).toBe('custom-save.json');
        });

        test('should import save game', async () => {
            const mockFileContent = JSON.stringify({
                version: '1.0',
                gameVersion: '1.0.0',
                exportTimestamp: Date.now(),
                saveData: {
                    playerLevel: 10,
                    gameProgress: { level: 5 },
                    timestamp: Date.now()
                },
                checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
            });

            const mockFile = {
                name: 'test-save.json'
            };

            // Mock FileReader
            const mockFileReader = {
                readAsText: jest.fn(),
                onload: null,
                onerror: null,
                result: mockFileContent
            };

            global.FileReader = jest.fn().mockReturnValue(mockFileReader);

            const importPromise = saveProtection.importSaveGame(mockFile);
            
            // Simulate file read completion
            setTimeout(() => {
                mockFileReader.onload({ target: { result: mockFileContent } });
            }, 0);

            const result = await importPromise;
            
            expect(result.success).toBe(true);
            expect(result.filename).toBe('test-save.json');
            expect(mockSaveManager.loadSaveData).toHaveBeenCalled();
        });

        test('should validate import data format', async () => {
            const invalidFileContent = JSON.stringify({
                // Missing required fields
                invalidData: true
            });

            const mockFile = {
                name: 'invalid-save.json'
            };

            const mockFileReader = {
                readAsText: jest.fn(),
                onload: null,
                onerror: null,
                result: invalidFileContent
            };

            global.FileReader = jest.fn().mockReturnValue(mockFileReader);

            const importPromise = saveProtection.importSaveGame(mockFile);
            
            setTimeout(() => {
                mockFileReader.onload({ target: { result: invalidFileContent } });
            }, 0);

            await expect(importPromise).rejects.toThrow('Invalid save game file format');
        });
    });

    describe('Event System', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should emit backup created event', async () => {
            const eventHandler = jest.fn();
            saveProtection.on('backupCreated', eventHandler);

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            await saveProtection.createBackup(mockSaveData, 'manual');
            
            expect(eventHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'manual',
                    metadata: expect.any(Object)
                })
            );
        });

        test('should emit corruption detected event', async () => {
            const eventHandler = jest.fn();
            saveProtection.on('corruptionDetected', eventHandler);

            const corruptedSave = {
                // Missing required fields
                gameProgress: { level: 5 }
            };

            mockSaveManager.getCurrentSaveData.mockResolvedValue(corruptedSave);

            await saveProtection.performCorruptionCheck();
            
            expect(eventHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    saveType: 'current'
                })
            );
        });

        test('should remove event listeners', () => {
            const eventHandler = jest.fn();
            saveProtection.on('backupCreated', eventHandler);
            saveProtection.off('backupCreated', eventHandler);

            // Event should not be called
            saveProtection.emit('backupCreated', {});
            expect(eventHandler).not.toHaveBeenCalled();
        });
    });

    describe('Status and Reporting', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should return system status', () => {
            const status = saveProtection.getSystemStatus();
            
            expect(status).toHaveProperty('backupCount');
            expect(status).toHaveProperty('lastBackupTime');
            expect(status).toHaveProperty('backupInProgress');
            expect(status).toHaveProperty('corruptedSaves');
            expect(status).toHaveProperty('metrics');
            expect(status.backupInProgress).toBe(false);
            expect(Array.isArray(status.corruptedSaves)).toBe(true);
        });

        test('should return backup list', async () => {
            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            await saveProtection.createBackup(mockSaveData, 'manual');
            await saveProtection.createBackup(mockSaveData, 'auto');

            const backupList = saveProtection.getBackupList();
            
            expect(backupList).toHaveLength(2);
            expect(backupList[0]).toHaveProperty('id');
            expect(backupList[0]).toHaveProperty('type');
            expect(backupList[0]).toHaveProperty('timestamp');
            // Should be sorted by timestamp (newest first)
            expect(backupList[0].timestamp).toBeGreaterThanOrEqual(backupList[1].timestamp);
        });
    });

    describe('Configuration Updates', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should update configuration', () => {
            const newConfig = {
                enableAutoBackup: false,
                maxBackups: 5,
                backupInterval: 60000
            };

            saveProtection.updateConfig(newConfig);
            
            expect(saveProtection.config.enableAutoBackup).toBe(false);
            expect(saveProtection.config.maxBackups).toBe(5);
            expect(saveProtection.config.backupInterval).toBe(60000);
        });
    });

    describe('Cleanup', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should cleanup resources on destroy', () => {
            // Create some test data
            saveProtection.backupStorage.set('test', 'data');
            saveProtection.backupMetadata.set('test', { id: 'test' });
            saveProtection.corruptedSaves.add('test');

            saveProtection.destroy();
            
            expect(saveProtection.backupStorage.size).toBe(0);
            expect(saveProtection.backupMetadata.size).toBe(0);
            expect(saveProtection.corruptedSaves.size).toBe(0);
        });

        test('should save metadata on destroy', () => {
            saveProtection.backupMetadata.set('test', { id: 'test' });
            
            saveProtection.destroy();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'save_backup_metadata',
                expect.stringContaining('test')
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            saveProtection = new SaveGameProtection(mockSaveManager);
        });

        test('should handle localStorage errors gracefully', async () => {
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            // Should not throw
            await expect(saveProtection.createBackup(mockSaveData, 'manual')).resolves.toBeDefined();
        });

        test('should handle checksum calculation errors', async () => {
            // Mock crypto.subtle.digest to throw
            global.crypto.subtle.digest.mockRejectedValue(new Error('Crypto not available'));

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            await expect(saveProtection.createBackup(mockSaveData, 'manual')).rejects.toThrow();
        });

        test('should handle compression errors gracefully', async () => {
            // Mock CompressionStream to throw
            global.CompressionStream = jest.fn().mockImplementation(() => {
                throw new Error('Compression not supported');
            });

            const mockSaveData = {
                playerLevel: 10,
                gameProgress: { level: 5 },
                timestamp: Date.now()
            };

            // Should fall back to uncompressed data
            const result = await saveProtection.createBackup(mockSaveData, 'manual');
            expect(result.success).toBe(true);
        });
    });
});