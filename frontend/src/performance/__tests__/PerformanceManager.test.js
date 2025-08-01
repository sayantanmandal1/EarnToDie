import { PerformanceManager } from '../PerformanceManager';
import * as THREE from 'three';

// Mock Three.js components
jest.mock('three', () => ({
    Frustum: jest.fn(() => ({
        setFromProjectionMatrix: jest.fn(),
        intersectsSphere: jest.fn(() => true)
    })),
    Matrix4: jest.fn(() => ({
        multiplyMatrices: jest.fn()
    }))
}));

describe('PerformanceManager', () => {
    let mockGameEngine;
    let performanceManager;

    beforeEach(() => {
        // Mock game engine
        mockGameEngine = {
            scene: {
                traverse: jest.fn()
            },
            renderer: {
                setPixelRatio: jest.fn(),
                shadowMap: { enabled: true },
                info: { render: { calls: 0, triangles: 0 } }
            },
            camera: {
                position: { x: 0, y: 0, z: 0 },
                projectionMatrix: {},
                matrixWorldInverse: {}
            }
        };

        performanceManager = new PerformanceManager(mockGameEngine);
    });

    afterEach(() => {
        if (performanceManager) {
            performanceManager.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(performanceManager.performanceLevel).toBe('high');
            expect(performanceManager.frameRate).toBe(60);
            expect(performanceManager.autoAdjustEnabled).toBe(true);
        });

        test('should have quality settings for all levels', () => {
            expect(performanceManager.qualitySettings.high).toBeDefined();
            expect(performanceManager.qualitySettings.medium).toBeDefined();
            expect(performanceManager.qualitySettings.low).toBeDefined();
        });
    });

    describe('Quality Management', () => {
        test('should set quality level', () => {
            performanceManager.setQualityLevel('medium');
            expect(performanceManager.performanceLevel).toBe('medium');
        });

        test('should warn on invalid quality level', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            performanceManager.setQualityLevel('invalid');
            expect(consoleSpy).toHaveBeenCalledWith('Invalid quality level: invalid');
            consoleSpy.mockRestore();
        });

        test('should apply quality settings to renderer', () => {
            performanceManager.setQualityLevel('low');
            expect(mockGameEngine.renderer.setPixelRatio).toHaveBeenCalledWith(1);
        });
    });

    describe('LOD Management', () => {
        test('should register LOD object', () => {
            const mockObject = { position: { x: 0, y: 0, z: 0 } };
            const lodLevels = [
                { maxDistance: 50, visible: true },
                { maxDistance: 100, visible: false }
            ];

            performanceManager.registerLODObject(mockObject, lodLevels);
            expect(performanceManager.lodObjects.has(mockObject)).toBe(true);
        });

        test('should unregister LOD object', () => {
            const mockObject = { position: { x: 0, y: 0, z: 0 } };
            const lodLevels = [{ maxDistance: 50, visible: true }];

            performanceManager.registerLODObject(mockObject, lodLevels);
            performanceManager.unregisterLODObject(mockObject);
            expect(performanceManager.lodObjects.has(mockObject)).toBe(false);
        });
    });

    describe('Performance Monitoring', () => {
        test('should track frame rate', () => {
            const deltaTime = 1/60; // 60 FPS
            performanceManager._updateFrameRate(deltaTime);
            
            expect(performanceManager.frameRateHistory.length).toBeGreaterThan(0);
        });

        test('should get performance statistics', () => {
            const stats = performanceManager.getPerformanceStats();
            
            expect(stats).toHaveProperty('frameRate');
            expect(stats).toHaveProperty('averageFrameRate');
            expect(stats).toHaveProperty('qualityLevel');
            expect(stats).toHaveProperty('lodObjects');
            expect(stats).toHaveProperty('renderInfo');
        });

        test('should limit frame rate history size', () => {
            // Add more frames than history size
            for (let i = 0; i < 100; i++) {
                performanceManager._updateFrameRate(1/60);
            }
            
            expect(performanceManager.frameRateHistory.length).toBeLessThanOrEqual(
                performanceManager.frameRateHistorySize
            );
        });
    });

    describe('Auto Quality Adjustment', () => {
        test('should reduce quality on poor performance', () => {
            performanceManager.performanceLevel = 'high'; // Start with high quality
            performanceManager.frameRateHistory = Array(60).fill(25); // Low FPS
            performanceManager.lastAdjustment = 0; // Allow adjustment
            
            performanceManager._autoAdjustQuality();
            
            // Should have adjusted to lower quality
            expect(performanceManager.performanceLevel).toBe('medium');
        });

        test('should increase quality on good performance', () => {
            performanceManager.performanceLevel = 'low';
            performanceManager.frameRateHistory = Array(60).fill(70); // High FPS
            performanceManager.lastAdjustment = 0; // Allow adjustment
            
            // Mock the setQualityLevel method to track calls
            const setQualitySpy = jest.spyOn(performanceManager, 'setQualityLevel');
            
            performanceManager._autoAdjustQuality();
            
            expect(setQualitySpy).toHaveBeenCalledWith('medium');
        });

        test('should respect adjustment cooldown', () => {
            performanceManager.performanceLevel = 'auto';
            performanceManager.frameRateHistory = Array(60).fill(25); // Low FPS
            performanceManager.lastAdjustment = performance.now(); // Recent adjustment
            
            const originalLevel = performanceManager.performanceLevel;
            performanceManager._autoAdjustQuality();
            
            expect(performanceManager.performanceLevel).toBe(originalLevel);
        });
    });

    describe('Frustum Culling', () => {
        test('should enable frustum culling for object', () => {
            const mockObject = {};
            performanceManager.setFrustumCulling(mockObject, true);
            
            expect(performanceManager.culledObjects.has(mockObject)).toBe(true);
        });

        test('should disable frustum culling for object', () => {
            const mockObject = {};
            performanceManager.setFrustumCulling(mockObject, true);
            performanceManager.setFrustumCulling(mockObject, false);
            
            expect(performanceManager.culledObjects.has(mockObject)).toBe(false);
        });
    });

    describe('Update Loop', () => {
        test('should update all systems', () => {
            const deltaTime = 1/60;
            
            // Spy on internal methods
            const updateFrameRateSpy = jest.spyOn(performanceManager, '_updateFrameRate');
            const updateLODSpy = jest.spyOn(performanceManager, '_updateLOD');
            const updateFrustumSpy = jest.spyOn(performanceManager, '_updateFrustumCulling');
            
            performanceManager.update(deltaTime);
            
            expect(updateFrameRateSpy).toHaveBeenCalledWith(deltaTime);
            expect(updateLODSpy).toHaveBeenCalledWith(deltaTime);
            expect(updateFrustumSpy).toHaveBeenCalled();
        });

        test('should auto-adjust quality when enabled', () => {
            performanceManager.performanceLevel = 'auto';
            const autoAdjustSpy = jest.spyOn(performanceManager, '_autoAdjustQuality');
            
            performanceManager.update(1/60);
            
            expect(autoAdjustSpy).toHaveBeenCalled();
        });
    });

    describe('Memory Usage', () => {
        test('should return memory usage when available', () => {
            // Mock performance.memory
            Object.defineProperty(performance, 'memory', {
                value: {
                    usedJSHeapSize: 50 * 1048576, // 50MB
                    totalJSHeapSize: 100 * 1048576, // 100MB
                    jsHeapSizeLimit: 200 * 1048576 // 200MB
                },
                configurable: true
            });

            const memoryUsage = performanceManager._getMemoryUsage();
            
            expect(memoryUsage).toEqual({
                used: 50,
                total: 100,
                limit: 200
            });
        });

        test('should return null when memory API unavailable', () => {
            // Remove performance.memory
            delete performance.memory;
            
            const memoryUsage = performanceManager._getMemoryUsage();
            expect(memoryUsage).toBeNull();
        });
    });

    describe('Disposal', () => {
        test('should clean up resources on dispose', () => {
            const mockObject = {};
            performanceManager.registerLODObject(mockObject, []);
            performanceManager.setFrustumCulling(mockObject, true);
            
            performanceManager.dispose();
            
            expect(performanceManager.lodObjects.size).toBe(0);
            expect(performanceManager.culledObjects.size).toBe(0);
            expect(performanceManager.frameRateHistory.length).toBe(0);
        });
    });
});