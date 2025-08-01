import { PerformanceIntegration } from '../PerformanceIntegration';
import { PerformanceManager } from '../PerformanceManager';
import { PoolManager } from '../ObjectPool';
import { LODSystem } from '../LODSystem';
import { TextureOptimizer } from '../TextureOptimizer';
import { PerformanceBenchmark } from '../PerformanceBenchmark';

// Mock all performance modules
jest.mock('../PerformanceManager');
jest.mock('../ObjectPool');
jest.mock('../LODSystem');
jest.mock('../TextureOptimizer');
jest.mock('../PerformanceBenchmark');

describe('PerformanceIntegration', () => {
    let performanceIntegration;
    let mockGameEngine;

    beforeEach(() => {
        mockGameEngine = {
            scene: {},
            renderer: {},
            camera: {}
        };

        // Reset all mocks
        jest.clearAllMocks();

        performanceIntegration = new PerformanceIntegration(mockGameEngine);
    });

    afterEach(() => {
        if (performanceIntegration && performanceIntegration.isInitialized) {
            performanceIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with game engine', () => {
            expect(performanceIntegration.gameEngine).toBe(mockGameEngine);
            expect(performanceIntegration.isInitialized).toBe(false);
        });

        test('should initialize all performance systems', async () => {
            // Reset mocks to ensure clean state
            jest.clearAllMocks();
            
            await performanceIntegration.initialize();

            expect(PerformanceManager).toHaveBeenCalledWith(mockGameEngine);
            expect(PoolManager).toHaveBeenCalled();
            expect(LODSystem).toHaveBeenCalledWith(mockGameEngine.camera);
            expect(TextureOptimizer).toHaveBeenCalled();
            expect(PerformanceBenchmark).toHaveBeenCalledWith(mockGameEngine);
            expect(performanceIntegration.isInitialized).toBe(true);
        });

        test('should handle initialization errors', async () => {
            // Create a fresh instance for this test
            const failingIntegration = new PerformanceIntegration(mockGameEngine);
            
            PerformanceManager.mockImplementationOnce(() => {
                throw new Error('Initialization failed');
            });

            await expect(failingIntegration.initialize())
                .rejects.toThrow('Initialization failed');
        });

        test('should setup object pools during initialization', async () => {
            const mockCreatePool = jest.fn();
            PoolManager.mockImplementationOnce(() => ({
                createPool: mockCreatePool
            }));

            const freshIntegration = new PerformanceIntegration(mockGameEngine);
            await freshIntegration.initialize();

            expect(mockCreatePool).toHaveBeenCalledWith(
                'particle_default',
                expect.any(Function),
                expect.any(Function),
                50
            );
            expect(mockCreatePool).toHaveBeenCalledWith(
                'zombie_walker',
                expect.any(Function),
                expect.any(Function),
                10
            );
        });
    });

    describe('Update System', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should update all performance systems', () => {
            const mockUpdate = jest.fn();
            performanceIntegration.performanceManager = { update: mockUpdate };
            performanceIntegration.lodSystem = { update: mockUpdate };

            performanceIntegration.update(0.1);

            expect(mockUpdate).toHaveBeenCalledTimes(2);
        });

        test('should throttle updates based on interval', () => {
            const mockUpdate = jest.fn();
            performanceIntegration.performanceManager = { update: mockUpdate };
            performanceIntegration.lodSystem = { update: mockUpdate };

            // First update should not trigger (interval not reached)
            performanceIntegration.update(0.05);
            expect(mockUpdate).not.toHaveBeenCalled();

            // Second update should trigger (interval exceeded)
            performanceIntegration.update(0.06);
            expect(mockUpdate).toHaveBeenCalledTimes(2);
        });

        test('should not update when not initialized', () => {
            performanceIntegration.isInitialized = false;
            const mockUpdate = jest.fn();
            performanceIntegration.performanceManager = { update: mockUpdate };

            performanceIntegration.update(0.1);

            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    describe('Quality Management', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should set quality level on all systems', () => {
            const mockSetQuality = jest.fn();
            performanceIntegration.performanceManager = { setQualityLevel: mockSetQuality };
            performanceIntegration.textureOptimizer = { setQuality: mockSetQuality };

            performanceIntegration.setQualityLevel('medium');

            expect(mockSetQuality).toHaveBeenCalledWith('medium');
            expect(mockSetQuality).toHaveBeenCalledTimes(2);
        });

        test('should not set quality when not initialized', () => {
            performanceIntegration.isInitialized = false;
            const mockSetQuality = jest.fn();
            performanceIntegration.performanceManager = { setQualityLevel: mockSetQuality };

            performanceIntegration.setQualityLevel('low');

            expect(mockSetQuality).not.toHaveBeenCalled();
        });
    });

    describe('Vehicle Registration', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should register vehicle for optimization', () => {
            const mockVehicle = {
                mesh: {
                    material: { map: 'texture' }
                }
            };

            const mockCreateLOD = jest.fn(() => ['lod1', 'lod2']);
            const mockRegisterObject = jest.fn();
            const mockSetFrustumCulling = jest.fn();
            const mockOptimizeTexture = jest.fn(() => 'optimized');

            performanceIntegration.lodSystem = {
                createVehicleLOD: mockCreateLOD,
                registerObject: mockRegisterObject
            };
            performanceIntegration.performanceManager = {
                setFrustumCulling: mockSetFrustumCulling
            };
            performanceIntegration.textureOptimizer = {
                optimizeTexture: mockOptimizeTexture
            };

            performanceIntegration.registerVehicle(mockVehicle);

            expect(mockCreateLOD).toHaveBeenCalledWith(mockVehicle);
            expect(mockRegisterObject).toHaveBeenCalledWith(mockVehicle.mesh, ['lod1', 'lod2']);
            expect(mockSetFrustumCulling).toHaveBeenCalledWith(mockVehicle.mesh, true);
            expect(mockOptimizeTexture).toHaveBeenCalledWith('texture');
        });

        test('should not register invalid vehicle', () => {
            const mockRegisterObject = jest.fn();
            performanceIntegration.lodSystem = { registerObject: mockRegisterObject };

            performanceIntegration.registerVehicle(null);

            expect(mockRegisterObject).not.toHaveBeenCalled();
        });
    });

    describe('Zombie Registration', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should register zombie for optimization', () => {
            const mockZombie = { mesh: {} };

            const mockCreateLOD = jest.fn(() => ['lod1', 'lod2']);
            const mockRegisterObject = jest.fn();
            const mockSetFrustumCulling = jest.fn();

            performanceIntegration.lodSystem = {
                createZombieLOD: mockCreateLOD,
                registerObject: mockRegisterObject
            };
            performanceIntegration.performanceManager = {
                setFrustumCulling: mockSetFrustumCulling
            };

            performanceIntegration.registerZombie(mockZombie);

            expect(mockCreateLOD).toHaveBeenCalledWith(mockZombie);
            expect(mockRegisterObject).toHaveBeenCalledWith(mockZombie.mesh, ['lod1', 'lod2']);
            expect(mockSetFrustumCulling).toHaveBeenCalledWith(mockZombie.mesh, true);
        });
    });

    describe('Object Pool Management', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should acquire particle from pool', () => {
            const mockParticle = { id: 'particle1' };
            const mockAcquire = jest.fn(() => mockParticle);
            performanceIntegration.poolManager = { acquire: mockAcquire };

            const result = performanceIntegration.acquireParticle('explosion');

            expect(mockAcquire).toHaveBeenCalledWith('particle_explosion');
            expect(result).toBe(mockParticle);
        });

        test('should handle pool acquisition errors', () => {
            const mockAcquire = jest.fn(() => {
                throw new Error('Pool error');
            });
            performanceIntegration.poolManager = { acquire: mockAcquire };

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const result = performanceIntegration.acquireParticle('explosion');

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to acquire particle of type explosion:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        test('should release particle to pool', () => {
            const mockParticle = { id: 'particle1' };
            const mockRelease = jest.fn();
            performanceIntegration.poolManager = { release: mockRelease };

            performanceIntegration.releaseParticle(mockParticle, 'smoke');

            expect(mockRelease).toHaveBeenCalledWith('particle_smoke', mockParticle);
        });

        test('should acquire zombie from pool', () => {
            const mockZombie = { id: 'zombie1' };
            const mockAcquire = jest.fn(() => mockZombie);
            performanceIntegration.poolManager = { acquire: mockAcquire };

            const result = performanceIntegration.acquireZombie('runner');

            expect(mockAcquire).toHaveBeenCalledWith('zombie_runner');
            expect(result).toBe(mockZombie);
        });

        test('should release zombie to pool', () => {
            const mockZombie = { id: 'zombie1' };
            const mockRelease = jest.fn();
            performanceIntegration.poolManager = { release: mockRelease };

            performanceIntegration.releaseZombie(mockZombie, 'crawler');

            expect(mockRelease).toHaveBeenCalledWith('zombie_crawler', mockZombie);
        });
    });

    describe('Benchmarking', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should run performance benchmark', async () => {
            const mockResults = { frameRate: { average: 60 } };
            const mockRunBenchmarks = jest.fn(() => Promise.resolve(mockResults));
            performanceIntegration.benchmark = { runAllBenchmarks: mockRunBenchmarks };

            const result = await performanceIntegration.runBenchmark();

            expect(mockRunBenchmarks).toHaveBeenCalled();
            expect(result).toBe(mockResults);
        });

        test('should handle missing benchmark system', async () => {
            performanceIntegration.benchmark = null;
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const result = await performanceIntegration.runBenchmark();

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Benchmark system not initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('Statistics', () => {
        beforeEach(async () => {
            await performanceIntegration.initialize();
        });

        test('should get comprehensive performance statistics', () => {
            const mockStats = {
                manager: { frameRate: 60 },
                lod: { totalObjects: 10 },
                pools: { particle_default: { active: 5 } },
                textures: { cachedTextures: 20 }
            };

            performanceIntegration.performanceManager = {
                getPerformanceStats: () => mockStats.manager
            };
            performanceIntegration.lodSystem = {
                getStats: () => mockStats.lod
            };
            performanceIntegration.poolManager = {
                getAllStats: () => mockStats.pools
            };
            performanceIntegration.textureOptimizer = {
                getStats: () => mockStats.textures
            };

            const result = performanceIntegration.getPerformanceStats();

            expect(result.manager).toBe(mockStats.manager);
            expect(result.lod).toBe(mockStats.lod);
            expect(result.pools).toBe(mockStats.pools);
            expect(result.textures).toBe(mockStats.textures);
            expect(result.timestamp).toBeDefined();
        });

        test('should return null when not initialized', () => {
            performanceIntegration.isInitialized = false;
            const result = performanceIntegration.getPerformanceStats();
            expect(result).toBeNull();
        });

        test('should get current quality settings', () => {
            const mockSettings = { shadowMapSize: 1024 };
            performanceIntegration.performanceManager = {
                getCurrentSettings: () => mockSettings
            };

            const result = performanceIntegration.getCurrentSettings();
            expect(result).toBe(mockSettings);
        });
    });

    describe('Disposal', () => {
        test('should dispose all performance systems', async () => {
            await performanceIntegration.initialize();

            const mockDispose = jest.fn();
            const mockClearAll = jest.fn();

            performanceIntegration.performanceManager = { dispose: mockDispose };
            performanceIntegration.poolManager = { clearAll: mockClearAll };
            performanceIntegration.lodSystem = { dispose: mockDispose };
            performanceIntegration.textureOptimizer = { dispose: mockDispose };

            performanceIntegration.dispose();

            expect(mockDispose).toHaveBeenCalledTimes(3);
            expect(mockClearAll).toHaveBeenCalled();
            expect(performanceIntegration.isInitialized).toBe(false);
        });

        test('should handle disposal when systems are null', () => {
            performanceIntegration.performanceManager = null;
            performanceIntegration.poolManager = null;

            expect(() => {
                performanceIntegration.dispose();
            }).not.toThrow();
        });
    });

    describe('Pool Object Creation', () => {
        test('should create particle with correct properties', () => {
            const particle = performanceIntegration._createParticle('explosion');

            expect(particle.visible).toBe(false);
            expect(particle.material.color).toBeDefined();
        });

        test('should reset particle state', () => {
            const mockParticle = {
                visible: true,
                position: { set: jest.fn() },
                scale: { set: jest.fn() },
                material: { opacity: 0.5 }
            };

            performanceIntegration._resetParticle(mockParticle);

            expect(mockParticle.visible).toBe(false);
            expect(mockParticle.position.set).toHaveBeenCalledWith(0, 0, 0);
            expect(mockParticle.scale.set).toHaveBeenCalledWith(1, 1, 1);
            expect(mockParticle.material.opacity).toBe(1.0);
        });

        test('should create zombie for pool', () => {
            const zombie = performanceIntegration._createZombieForPool('walker');

            expect(zombie.type).toBe('walker');
            expect(zombie.isActive).toBe(false);
            expect(zombie.health).toBe(100);
            expect(zombie.mesh).toBeDefined();
        });

        test('should reset zombie state', () => {
            const mockZombie = {
                isActive: true,
                health: 50,
                mesh: {
                    visible: true,
                    position: { set: jest.fn() }
                }
            };

            performanceIntegration._resetZombie(mockZombie);

            expect(mockZombie.isActive).toBe(false);
            expect(mockZombie.health).toBe(100);
            expect(mockZombie.mesh.visible).toBe(false);
            expect(mockZombie.mesh.position.set).toHaveBeenCalledWith(0, 0, 0);
        });
    });
});