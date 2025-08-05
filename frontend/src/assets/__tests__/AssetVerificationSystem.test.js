/**
 * Asset Verification System Tests
 */
import AssetVerificationSystem from '../AssetVerificationSystem.js';

// Mock crypto API
global.crypto = {
    subtle: {
        digest: jest.fn().mockImplementation((algorithm, data) => {
            // Mock SHA-256 hash
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
global.indexedDB = {
    open: jest.fn().mockImplementation(() => ({
        result: {
            transaction: jest.fn().mockReturnValue({
                objectStore: jest.fn().mockReturnValue({
                    get: jest.fn().mockReturnValue({ onsuccess: jest.fn(), onerror: jest.fn() }),
                    put: jest.fn().mockReturnValue({ onsuccess: jest.fn(), onerror: jest.fn() }),
                    delete: jest.fn().mockReturnValue({ onsuccess: jest.fn(), onerror: jest.fn() }),
                    clear: jest.fn().mockReturnValue({ onsuccess: jest.fn(), onerror: jest.fn() })
                })
            }),
            createObjectStore: jest.fn()
        },
        onsuccess: jest.fn(),
        onerror: jest.fn(),
        onupgradeneeded: jest.fn()
    }))
};

// Mock caches API
global.caches = {
    open: jest.fn().mockResolvedValue({
        match: jest.fn().mockResolvedValue(null),
        put: jest.fn().mockResolvedValue(),
        delete: jest.fn().mockResolvedValue(),
        keys: jest.fn().mockResolvedValue([])
    })
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
// Fix localStorage assignment issue
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
});

// Mock Worker
global.Worker = jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    terminate: jest.fn()
}));

// Mock Blob and URL
global.Blob = jest.fn();
global.URL = {
    createObjectURL: jest.fn().mockReturnValue('mock-blob-url')
};

describe('AssetVerificationSystem', () => {
    let mockAssetManager;
    let verificationSystem;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockAssetManager = {
            getAssetData: jest.fn(),
            onAssetRepaired: jest.fn(),
            addEventListener: jest.fn()
        };

        // Reset localStorage mock
        localStorageMock.getItem.mockReturnValue(null);
        localStorageMock.setItem.mockImplementation(() => {});
    });

    afterEach(() => {
        if (verificationSystem) {
            verificationSystem.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', async () => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
            
            expect(verificationSystem.config.enableVerification).toBe(true);
            expect(verificationSystem.config.enableAutoRepair).toBe(true);
            expect(verificationSystem.config.checksumAlgorithm).toBe('sha256');
            expect(verificationSystem.assetRegistry).toBeInstanceOf(Map);
            expect(verificationSystem.metrics.totalAssets).toBe(0);
        });

        test('should initialize with custom configuration', async () => {
            const customConfig = {
                enableVerification: false,
                enableAutoRepair: false,
                checksumAlgorithm: 'sha1',
                verificationInterval: 60000
            };

            verificationSystem = new AssetVerificationSystem(mockAssetManager, customConfig);
            
            expect(verificationSystem.config.enableVerification).toBe(false);
            expect(verificationSystem.config.enableAutoRepair).toBe(false);
            expect(verificationSystem.config.checksumAlgorithm).toBe('sha1');
            expect(verificationSystem.config.verificationInterval).toBe(60000);
        });

        test('should load existing asset registry from localStorage', async () => {
            const mockRegistry = {
                'asset1': {
                    id: 'asset1',
                    checksum: 'abc123',
                    size: 1024,
                    lastVerified: Date.now()
                }
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockRegistry));
            
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
            
            expect(verificationSystem.assetRegistry.has('asset1')).toBe(true);
            expect(verificationSystem.assetRegistry.get('asset1').checksum).toBe('abc123');
        });
    });

    describe('Asset Registration', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should register new asset', () => {
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            };

            const asset = verificationSystem.registerAsset('test-asset', assetInfo);
            
            expect(asset.id).toBe('test-asset');
            expect(asset.url).toBe('/assets/test.png');
            expect(asset.checksum).toBe('abc123');
            expect(asset.verificationStatus).toBe('pending');
            expect(verificationSystem.assetRegistry.has('test-asset')).toBe(true);
            expect(verificationSystem.metrics.totalAssets).toBe(1);
        });

        test('should save registry after registration', () => {
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            };

            verificationSystem.registerAsset('test-asset', assetInfo);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'asset_registry',
                expect.stringContaining('test-asset')
            );
        });
    });

    describe('Asset Verification', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should verify valid asset', async () => {
            // Register asset
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
            };
            verificationSystem.registerAsset('test-asset', assetInfo);

            // Mock asset data
            const mockData = new ArrayBuffer(1024);
            mockAssetManager.getAssetData.mockResolvedValue(mockData);

            const result = await verificationSystem.verifyAsset('test-asset');
            
            expect(result.valid).toBe(true);
            expect(result.assetId).toBe('test-asset');
            expect(result.expectedChecksum).toBe(assetInfo.checksum);
            expect(verificationSystem.metrics.verifiedAssets).toBe(1);
        });

        test('should detect corrupted asset', async () => {
            // Register asset with different checksum
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'different-checksum'
            };
            verificationSystem.registerAsset('test-asset', assetInfo);

            // Mock asset data
            const mockData = new ArrayBuffer(1024);
            mockAssetManager.getAssetData.mockResolvedValue(mockData);

            const result = await verificationSystem.verifyAsset('test-asset');
            
            expect(result.valid).toBe(false);
            expect(result.assetId).toBe('test-asset');
            expect(verificationSystem.corruptedAssets.has('test-asset')).toBe(true);
            expect(verificationSystem.metrics.corruptedAssets).toBe(1);
        });

        test('should handle verification error', async () => {
            verificationSystem.registerAsset('test-asset', {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            });

            mockAssetManager.getAssetData.mockRejectedValue(new Error('Asset not found'));

            await expect(verificationSystem.verifyAsset('test-asset')).rejects.toThrow('Asset not found');
            
            const asset = verificationSystem.assetRegistry.get('test-asset');
            expect(asset.verificationStatus).toBe('error');
        });

        test('should throw error for non-existent asset', async () => {
            await expect(verificationSystem.verifyAsset('non-existent')).rejects.toThrow('Asset not found: non-existent');
        });
    });

    describe('Asset Repair', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should repair corrupted asset', async () => {
            // Register corrupted asset
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
            };
            verificationSystem.registerAsset('test-asset', assetInfo);
            verificationSystem.corruptedAssets.add('test-asset');

            // Mock successful download
            const mockData = new ArrayBuffer(1024);
            global.fetch.mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(mockData)
            });

            await verificationSystem.repairAsset('test-asset');
            
            const asset = verificationSystem.assetRegistry.get('test-asset');
            expect(asset.verificationStatus).toBe('valid');
            expect(asset.repairCount).toBe(1);
            expect(verificationSystem.corruptedAssets.has('test-asset')).toBe(false);
            expect(mockAssetManager.onAssetRepaired).toHaveBeenCalledWith('test-asset', mockData);
        });

        test('should handle repair failure', async () => {
            verificationSystem.registerAsset('test-asset', {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            });

            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(verificationSystem.repairAsset('test-asset')).rejects.toThrow();
        });

        test('should retry repair on failure', async () => {
            const assetInfo = {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
            };
            verificationSystem.registerAsset('test-asset', assetInfo);

            // Mock first failure, then success
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
                });

            await verificationSystem.repairAsset('test-asset');
            
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Batch Operations', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should verify multiple assets', async () => {
            // Register multiple assets
            for (let i = 0; i < 5; i++) {
                verificationSystem.registerAsset(`asset-${i}`, {
                    url: `/assets/test-${i}.png`,
                    type: 'image',
                    size: 1024,
                    checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
                });
            }

            mockAssetManager.getAssetData.mockResolvedValue(new ArrayBuffer(1024));

            const results = await verificationSystem.verifyAssets(['asset-0', 'asset-1', 'asset-2']);
            
            expect(results).toHaveLength(3);
            expect(results.every(r => r.valid)).toBe(true);
        });

        test('should process assets in batches', async () => {
            // Set small batch size
            verificationSystem.config.batchSize = 2;

            // Register multiple assets
            for (let i = 0; i < 5; i++) {
                verificationSystem.registerAsset(`asset-${i}`, {
                    url: `/assets/test-${i}.png`,
                    type: 'image',
                    size: 1024,
                    checksum: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
                });
            }

            mockAssetManager.getAssetData.mockResolvedValue(new ArrayBuffer(1024));

            const results = await verificationSystem.verifyAssets(['asset-0', 'asset-1', 'asset-2', 'asset-3', 'asset-4']);
            
            expect(results).toHaveLength(5);
            expect(results.every(r => r.valid)).toBe(true);
        });
    });

    describe('Status and Reporting', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should return verification status', () => {
            // Register some assets
            verificationSystem.registerAsset('asset-1', {
                url: '/assets/test-1.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            });

            const asset = verificationSystem.assetRegistry.get('asset-1');
            asset.verificationStatus = 'valid';
            verificationSystem.corruptedAssets.add('asset-2');

            const status = verificationSystem.getVerificationStatus();
            
            expect(status.totalAssets).toBe(1);
            expect(status.verifiedAssets).toBe(1);
            expect(status.corruptedAssets).toBe(1);
            expect(status.verificationInProgress).toBe(false);
        });

        test('should return integrity report', () => {
            // Register assets with different statuses
            verificationSystem.registerAsset('asset-1', {
                url: '/assets/test-1.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            });

            const asset = verificationSystem.assetRegistry.get('asset-1');
            asset.verificationStatus = 'valid';
            asset.lastVerified = Date.now();
            asset.repairCount = 1;

            verificationSystem.corruptedAssets.add('asset-2');

            const report = verificationSystem.getIntegrityReport();
            
            expect(report.summary.totalAssets).toBe(1);
            expect(report.summary.verifiedAssets).toBe(1);
            expect(report.summary.corruptedAssets).toBe(1);
            expect(report.corruptedAssets).toContain('asset-2');
            expect(report.assetDetails).toHaveLength(1);
            expect(report.assetDetails[0].id).toBe('asset-1');
            expect(report.assetDetails[0].status).toBe('valid');
            expect(report.assetDetails[0].repairCount).toBe(1);
        });
    });

    describe('Configuration Updates', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should update configuration', () => {
            const newConfig = {
                enableVerification: false,
                enableAutoRepair: false,
                verificationInterval: 60000
            };

            verificationSystem.updateConfig(newConfig);
            
            expect(verificationSystem.config.enableVerification).toBe(false);
            expect(verificationSystem.config.enableAutoRepair).toBe(false);
            expect(verificationSystem.config.verificationInterval).toBe(60000);
        });
    });

    describe('Cleanup', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should cleanup resources on destroy', () => {
            const mockWorker = {
                terminate: jest.fn()
            };
            verificationSystem.checksumWorker = mockWorker;
            verificationSystem.downloadWorker = mockWorker;

            verificationSystem.destroy();
            
            expect(mockWorker.terminate).toHaveBeenCalledTimes(2);
            expect(verificationSystem.verificationQueue).toHaveLength(0);
            expect(verificationSystem.repairQueue).toHaveLength(0);
            expect(verificationSystem.corruptedAssets.size).toBe(0);
        });

        test('should save registry on destroy', () => {
            verificationSystem.registerAsset('test-asset', {
                url: '/assets/test.png',
                type: 'image',
                size: 1024,
                checksum: 'abc123'
            });

            verificationSystem.destroy();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'asset_registry',
                expect.stringContaining('test-asset')
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            verificationSystem = new AssetVerificationSystem(mockAssetManager);
        });

        test('should handle localStorage errors gracefully', () => {
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should not throw
            expect(() => {
                verificationSystem.registerAsset('test-asset', {
                    url: '/assets/test.png',
                    type: 'image',
                    size: 1024,
                    checksum: 'abc123'
                });
            }).not.toThrow();
        });

        test('should handle IndexedDB errors gracefully', async () => {
            global.indexedDB.open.mockImplementation(() => {
                throw new Error('IndexedDB not available');
            });

            // Should not throw during asset storage
            await expect(verificationSystem.storeAssetInIndexedDB('test', new ArrayBuffer(1024))).rejects.toThrow();
        });

        test('should handle cache API errors gracefully', async () => {
            global.caches.open.mockRejectedValue(new Error('Cache API not available'));

            // Should not throw during asset storage
            await verificationSystem.storeAssetInCache('test', new ArrayBuffer(1024));
            // Should log warning but continue
        });
    });
});