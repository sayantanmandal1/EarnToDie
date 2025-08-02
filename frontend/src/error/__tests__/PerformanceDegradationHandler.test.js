/**
 * Unit tests for PerformanceDegradationHandler
 */

import PerformanceDegradationHandler from '../PerformanceDegradationHandler.js';

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
        jsHeapSizeLimit: 200000000
    }
};

// Mock navigator
global.navigator = {
    ...global.navigator,
    hardwareConcurrency: 4,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    onLine: true
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

describe('PerformanceDegradationHandler', () => {
    let performanceHandler;

    beforeEach(() => {
        performanceHandler = new PerformanceDegradationHandler({
            targetFPS: 30,
            criticalFPS: 15,
            monitoringInterval: 100,
            adjustmentCooldown: 200
        });
        
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (performanceHandler) {
            performanceHandler.destroy?.();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default quality settings', () => {
            const settings = performanceHandler.getQualitySettings();
            
            expect(settings.level).toBeDefined();
            expect(settings.settings).toHaveProperty('shadowMapSize');
            expect(settings.settings).toHaveProperty('maxLights');
            expect(settings.settings).toHaveProperty('particleCount');
        });

        test('should detect device capabilities', () => {
            // Device detection happens in constructor
            expect(performanceHandler.currentQualityLevel).toBeDefined();
        });
    });

    describe('Performance Monitoring', () => {
        test('should track frame rate', () => {
            const metrics = performanceHandler.getPerformanceMetrics();
            
            expect(metrics.fps).toHaveProperty('current');
            expect(metrics.fps).toHaveProperty('average');
            expect(metrics.fps).toHaveProperty('target');
        });

        test('should monitor memory usage', () => {
            const metrics = performanceHandler.getPerformanceMetrics();
            
            expect(metrics.memory).toHaveProperty('usage');
            expect(metrics.memory).toHaveProperty('pressure');
            expect(metrics.memory).toHaveProperty('threshold');
        });

        test('should detect memory pressure', () => {
            // Mock high memory usage
            if (!performance.memory) {
                performance.memory = {};
            }
            performance.memory.usedJSHeapSize = 180000000; // 90% of limit
            
            performanceHandler._monitorMemoryUsage();
            
            const metrics = performanceHandler.getPerformanceMetrics();
            expect(metrics.memory.pressure).toBe(true);
        });
    });

    describe('Quality Adjustment', () => {
        test('should downgrade quality on low FPS', () => {
            const initialQuality = performanceHandler.currentQualityLevel;
            
            // Mock low FPS
            performanceHandler.averageFPS = 10; // Below critical threshold
            
            performanceHandler._checkPerformanceAdjustment();
            
            // Should have downgraded (unless already at lowest)
            if (initialQuality !== 'potato') {
                expect(performanceHandler.currentQualityLevel).not.toBe(initialQuality);
            }
        });

        test('should upgrade quality when performance improves', () => {
            // Start with low quality
            performanceHandler._setQualityLevel('low', 'test');
            
            // Mock high FPS
            performanceHandler.averageFPS = 60;
            performanceHandler.memoryPressure = false;
            
            performanceHandler._checkPerformanceAdjustment();
            
            // Should have upgraded
            expect(performanceHandler.currentQualityLevel).toBe('medium');
        });

        test('should respect adjustment cooldown', () => {
            const initialQuality = performanceHandler.currentQualityLevel;
            
            // Make an adjustment
            performanceHandler._setQualityLevel('low', 'test');
            
            // Immediately try another adjustment
            performanceHandler.averageFPS = 10;
            performanceHandler._checkPerformanceAdjustment();
            
            // Should not have changed due to cooldown
            expect(performanceHandler.currentQualityLevel).toBe('low');
        });

        test('should track adjustment history', () => {
            performanceHandler._setQualityLevel('medium', 'test_reason');
            performanceHandler._setQualityLevel('low', 'another_reason');
            
            expect(performanceHandler.adjustmentHistory).toHaveLength(2);
            expect(performanceHandler.adjustmentHistory[0].reason).toBe('test_reason');
            expect(performanceHandler.adjustmentHistory[1].reason).toBe('another_reason');
        });
    });

    describe('Quality Levels', () => {
        test('should have all quality levels defined', () => {
            const levels = ['ultra', 'high', 'medium', 'low', 'potato'];
            
            levels.forEach(level => {
                expect(performanceHandler.qualityLevels[level]).toBeDefined();
                expect(performanceHandler.qualityLevels[level]).toHaveProperty('shadowMapSize');
                expect(performanceHandler.qualityLevels[level]).toHaveProperty('maxLights');
                expect(performanceHandler.qualityLevels[level]).toHaveProperty('particleCount');
            });
        });

        test('should have decreasing quality values', () => {
            const ultra = performanceHandler.qualityLevels.ultra;
            const potato = performanceHandler.qualityLevels.potato;
            
            expect(ultra.shadowMapSize).toBeGreaterThan(potato.shadowMapSize);
            expect(ultra.maxLights).toBeGreaterThan(potato.maxLights);
            expect(ultra.particleCount).toBeGreaterThan(potato.particleCount);
        });
    });

    describe('Device Detection', () => {
        test('should detect mobile devices', () => {
            const originalUserAgent = navigator.userAgent;
            
            // Mock mobile user agent
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                configurable: true
            });
            
            const isMobile = performanceHandler._isMobileDevice();
            expect(isMobile).toBe(true);
            
            // Restore original
            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                configurable: true
            });
        });

        test('should recommend appropriate quality for device', () => {
            const capabilities = {
                memory: { limit: 4 * 1024 * 1024 * 1024 }, // 4GB
                cores: 8,
                mobile: false,
                gpu: 'NVIDIA GeForce GTX 1060'
            };
            
            const quality = performanceHandler._getRecommendedQuality(capabilities);
            expect(['ultra', 'high', 'medium'].includes(quality)).toBe(true);
        });

        test('should recommend lower quality for mobile', () => {
            const capabilities = {
                memory: { limit: 2 * 1024 * 1024 * 1024 }, // 2GB
                cores: 4,
                mobile: true,
                gpu: 'Adreno 640'
            };
            
            const quality = performanceHandler._getRecommendedQuality(capabilities);
            expect(['medium', 'low', 'potato'].includes(quality)).toBe(true);
        });
    });

    describe('Event Listeners', () => {
        test('should notify performance listeners', () => {
            const mockListener = jest.fn();
            performanceHandler.onPerformanceIssue(mockListener);
            
            // Trigger critical performance issue
            performanceHandler.currentQualityLevel = 'potato';
            performanceHandler._handleCriticalPerformance('test_reason');
            
            expect(mockListener).toHaveBeenCalled();
        });

        test('should notify quality change listeners', () => {
            const mockListener = jest.fn();
            performanceHandler.onQualityChange(mockListener);
            
            performanceHandler._setQualityLevel('low', 'test_reason');
            
            expect(mockListener).toHaveBeenCalledWith(
                expect.any(String), // old quality
                'low',              // new quality
                'test_reason'       // reason
            );
        });

        test('should handle listener errors gracefully', () => {
            const faultyListener = jest.fn(() => {
                throw new Error('Listener error');
            });
            performanceHandler.onQualityChange(faultyListener);
            
            // Should not throw
            expect(() => {
                performanceHandler._setQualityLevel('medium', 'test');
            }).not.toThrow();
        });
    });

    describe('Emergency Measures', () => {
        test('should trigger emergency measures on critical performance', () => {
            const mockDisableFeatures = jest.spyOn(performanceHandler, '_disableNonEssentialFeatures');
            const mockReduceResolution = jest.spyOn(performanceHandler, '_reduceRenderResolution');
            const mockPauseSystems = jest.spyOn(performanceHandler, '_pauseNonCriticalSystems');
            
            performanceHandler._emergencyPerformanceMeasures();
            
            expect(mockDisableFeatures).toHaveBeenCalled();
            expect(mockReduceResolution).toHaveBeenCalled();
            expect(mockPauseSystems).toHaveBeenCalled();
        });

        test('should handle memory pressure', () => {
            const mockClearCaches = jest.spyOn(performanceHandler, '_clearCaches');
            const mockReducePools = jest.spyOn(performanceHandler, '_reduceObjectPools');
            
            performanceHandler._handleMemoryPressure();
            
            expect(mockClearCaches).toHaveBeenCalled();
            expect(mockReducePools).toHaveBeenCalled();
        });
    });

    describe('WebGL Detection', () => {
        test('should detect WebGL capabilities', () => {
            // Mock WebGL context
            const mockCanvas = {
                getContext: jest.fn(() => ({
                    getParameter: jest.fn((param) => {
                        switch (param) {
                            case 'VERSION': return 'WebGL 2.0';
                            case 'VENDOR': return 'WebKit';
                            case 'RENDERER': return 'WebKit WebGL';
                            case 'MAX_TEXTURE_SIZE': return 4096;
                            case 'MAX_VIEWPORT_DIMS': return [4096, 4096];
                            default: return null;
                        }
                    }),
                    getSupportedExtensions: jest.fn(() => ['EXT_texture_filter_anisotropic'])
                }))
            };
            
            document.createElement = jest.fn(() => mockCanvas);
            
            const capabilities = performanceHandler._detectWebGLCapabilities();
            
            expect(capabilities).toHaveProperty('version');
            expect(capabilities).toHaveProperty('vendor');
            expect(capabilities).toHaveProperty('renderer');
            expect(capabilities).toHaveProperty('maxTextureSize');
        });

        test('should handle WebGL unavailable', () => {
            const mockCanvas = {
                getContext: jest.fn(() => null)
            };
            
            document.createElement = jest.fn(() => mockCanvas);
            
            const capabilities = performanceHandler._detectWebGLCapabilities();
            
            expect(capabilities).toBeNull();
        });
    });
});