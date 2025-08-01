/**
 * Unit tests for ErrorHandlingIntegration
 */

import ErrorHandlingIntegration, { 
    initializeErrorHandling, 
    getErrorHandling, 
    handleError 
} from '../ErrorHandlingIntegration.js';
import { GameError, CriticalGameError } from '../ErrorHandler.js';

// Mock all the error handling systems
jest.mock('../ErrorHandler.js');
jest.mock('../NetworkErrorHandler.js');
jest.mock('../PerformanceDegradationHandler.js');
jest.mock('../RobustAssetLoader.js');
jest.mock('../CrashRecoverySystem.js');
jest.mock('../ErrorReportingSystem.js');

describe('ErrorHandlingIntegration', () => {
    let integration;

    beforeEach(() => {
        integration = new ErrorHandlingIntegration({
            enableErrorHandler: true,
            enableNetworkHandler: true,
            enablePerformanceHandler: true,
            enableAssetLoader: true,
            enableCrashRecovery: true,
            enableErrorReporting: true
        });
    });

    afterEach(() => {
        if (integration) {
            integration.destroy();
        }
        
        // Clear global instance
        if (typeof window !== 'undefined') {
            delete window.zombieGameErrorHandling;
        }
    });

    describe('Initialization', () => {
        test('should initialize all systems when enabled', () => {
            expect(integration.isInitialized).toBe(true);
            expect(integration.errorHandler).toBeDefined();
            expect(integration.networkHandler).toBeDefined();
            expect(integration.performanceHandler).toBeDefined();
            expect(integration.assetLoader).toBeDefined();
            expect(integration.crashRecovery).toBeDefined();
            expect(integration.errorReporting).toBeDefined();
        });

        test('should skip disabled systems', () => {
            const limitedIntegration = new ErrorHandlingIntegration({
                enableErrorHandler: true,
                enableNetworkHandler: false,
                enablePerformanceHandler: false,
                enableAssetLoader: false,
                enableCrashRecovery: false,
                enableErrorReporting: false
            });

            expect(limitedIntegration.errorHandler).toBeDefined();
            expect(limitedIntegration.networkHandler).toBeNull();
            expect(limitedIntegration.performanceHandler).toBeNull();
            expect(limitedIntegration.assetLoader).toBeNull();
            expect(limitedIntegration.crashRecovery).toBeNull();
            expect(limitedIntegration.errorReporting).toBeNull();

            limitedIntegration.destroy();
        });

        test('should handle initialization errors gracefully', () => {
            // Mock console.error to avoid test output
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // This should not throw even if systems fail to initialize
            expect(() => {
                new ErrorHandlingIntegration();
            }).not.toThrow();

            consoleSpy.mockRestore();
        });
    });

    describe('Game System Providers', () => {
        test('should register game system providers', () => {
            const mockProvider = {
                getBasicState: jest.fn(() => ({ test: 'state' })),
                getFullState: jest.fn(() => ({ test: 'full_state' })),
                restoreState: jest.fn(),
                validateState: jest.fn(() => true)
            };

            integration.registerGameSystemProvider('testSystem', mockProvider);

            expect(integration.gameSystemProviders.has('testSystem')).toBe(true);
            expect(integration.gameSystemProviders.get('testSystem')).toBe(mockProvider);
        });

        test('should capture game state from providers', () => {
            const mockProvider = {
                getBasicState: jest.fn(() => ({ level: 1, score: 100 }))
            };

            integration.registerGameSystemProvider('gameState', mockProvider);

            const gameState = integration._captureGameState();

            expect(mockProvider.getBasicState).toHaveBeenCalled();
            expect(gameState.gameState).toEqual({ level: 1, score: 100 });
        });

        test('should handle provider errors gracefully', () => {
            const faultyProvider = {
                getBasicState: jest.fn(() => {
                    throw new Error('Provider error');
                })
            };

            integration.registerGameSystemProvider('faultySystem', faultyProvider);

            // Should not throw
            expect(() => {
                integration._captureGameState();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle game errors through integration', async () => {
            const mockHandleError = jest.fn().mockResolvedValue({ success: true });
            integration.errorHandler = { handleError: mockHandleError };

            const error = new GameError('Test error');
            const context = { source: 'test' };

            await integration.handleGameError(error, context);

            expect(mockHandleError).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    source: 'test',
                    timestamp: expect.any(Number),
                    gameState: expect.any(Object),
                    systemState: expect.any(Object)
                })
            );
        });

        test('should handle errors without error handler', async () => {
            integration.errorHandler = null;
            const mockReportError = jest.fn();
            integration.errorReporting = { reportError: mockReportError };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const error = new GameError('Test error');
            await integration.handleGameError(error);

            expect(consoleSpy).toHaveBeenCalled();
            expect(mockReportError).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should handle uninitialized system gracefully', async () => {
            integration.isInitialized = false;
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const error = new GameError('Test error');
            await integration.handleGameError(error);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error handling system not initialized:',
                error
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Network Client', () => {
        test('should provide network client', () => {
            const mockMakeRequest = jest.fn();
            integration.networkHandler = { makeRequest: mockMakeRequest };

            const client = integration.getNetworkClient('http://api.test.com');

            expect(client).toHaveProperty('get');
            expect(client).toHaveProperty('post');
            expect(client).toHaveProperty('put');
            expect(client).toHaveProperty('delete');
        });

        test('should throw if network handler not initialized', () => {
            integration.networkHandler = null;

            expect(() => {
                integration.getNetworkClient('http://api.test.com');
            }).toThrow('Network handler not initialized');
        });
    });

    describe('Asset Loader', () => {
        test('should provide asset loader', () => {
            const mockAssetLoader = { loadTexture: jest.fn() };
            integration.assetLoader = mockAssetLoader;

            const loader = integration.getAssetLoader();

            expect(loader).toBe(mockAssetLoader);
        });

        test('should throw if asset loader not initialized', () => {
            integration.assetLoader = null;

            expect(() => {
                integration.getAssetLoader();
            }).toThrow('Asset loader not initialized');
        });
    });

    describe('Performance Management', () => {
        test('should provide performance settings', () => {
            const mockSettings = { level: 'high', settings: { shadowMapSize: 1024 } };
            integration.performanceHandler = { getQualitySettings: jest.fn(() => mockSettings) };

            const settings = integration.getPerformanceSettings();

            expect(settings).toBe(mockSettings);
        });

        test('should provide default settings if handler not initialized', () => {
            integration.performanceHandler = null;

            const settings = integration.getPerformanceSettings();

            expect(settings).toEqual({ level: 'medium', settings: {} });
        });

        test('should provide performance metrics', () => {
            const mockMetrics = { fps: { current: 60, average: 58 } };
            integration.performanceHandler = { getPerformanceMetrics: jest.fn(() => mockMetrics) };

            const metrics = integration.getPerformanceMetrics();

            expect(metrics).toBe(mockMetrics);
        });
    });

    describe('Crash Recovery', () => {
        test('should trigger recovery', async () => {
            const mockTriggerRecovery = jest.fn().mockResolvedValue(true);
            integration.crashRecovery = { triggerRecovery: mockTriggerRecovery };

            const result = await integration.triggerRecovery('test_reason');

            expect(mockTriggerRecovery).toHaveBeenCalledWith('test_reason');
            expect(result).toBe(true);
        });

        test('should throw if crash recovery not initialized', async () => {
            integration.crashRecovery = null;

            await expect(integration.triggerRecovery()).rejects.toThrow(
                'Crash recovery system not initialized'
            );
        });
    });

    describe('Statistics', () => {
        test('should provide comprehensive error statistics', () => {
            // Mock all system stats
            integration.errorHandler = { getErrorStats: jest.fn(() => ({ totalErrors: 5 })) };
            integration.networkHandler = { getNetworkStatus: jest.fn(() => ({ isOnline: true })) };
            integration.performanceHandler = { getPerformanceMetrics: jest.fn(() => ({ fps: 60 })) };
            integration.assetLoader = { getStats: jest.fn(() => ({ cacheHits: 10 })) };
            integration.crashRecovery = { getStats: jest.fn(() => ({ recoveryAttempts: 0 })) };
            integration.errorReporting = { getStats: jest.fn(() => ({ reportedErrors: 3 })) };

            const stats = integration.getErrorStats();

            expect(stats.initialized).toBe(true);
            expect(stats.systems.errorHandler).toBe(true);
            expect(stats.errorHandler.totalErrors).toBe(5);
            expect(stats.networkHandler.isOnline).toBe(true);
            expect(stats.performanceHandler.fps).toBe(60);
            expect(stats.assetLoader.cacheHits).toBe(10);
            expect(stats.crashRecovery.recoveryAttempts).toBe(0);
            expect(stats.errorReporting.reportedErrors).toBe(3);
        });
    });

    describe('User Context', () => {
        test('should set user ID for error tracking', () => {
            const mockSetUserId = jest.fn();
            integration.errorReporting = { setUserId: mockSetUserId };

            integration.setUserId('user123');

            expect(mockSetUserId).toHaveBeenCalledWith('user123');
        });

        test('should set global context', () => {
            const mockSetGlobalContext = jest.fn();
            integration.errorReporting = { setGlobalContext: mockSetGlobalContext };

            const context = { gameVersion: '1.0.0' };
            integration.setGlobalContext(context);

            expect(mockSetGlobalContext).toHaveBeenCalledWith(context);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup all systems', () => {
            const mockDestroy = jest.fn();
            const mockClearCache = jest.fn();

            integration.errorHandler = { destroy: mockDestroy };
            integration.networkHandler = { destroy: mockDestroy };
            integration.performanceHandler = { destroy: mockDestroy };
            integration.assetLoader = { clearCache: mockClearCache };
            integration.crashRecovery = { destroy: mockDestroy };
            integration.errorReporting = { destroy: mockDestroy };

            integration.destroy();

            expect(mockDestroy).toHaveBeenCalledTimes(4);
            expect(mockClearCache).toHaveBeenCalledTimes(1);
        });

        test('should handle cleanup errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            integration.errorHandler = {
                destroy: jest.fn(() => {
                    throw new Error('Cleanup error');
                })
            };

            // Should not throw
            expect(() => {
                integration.destroy();
            }).not.toThrow();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

describe('Global Functions', () => {
    beforeEach(() => {
        // Clear any existing global instance
        if (typeof window !== 'undefined') {
            delete window.zombieGameErrorHandling;
        }
    });

    describe('initializeErrorHandling', () => {
        test('should create global instance', () => {
            const instance = initializeErrorHandling();

            expect(instance).toBeInstanceOf(ErrorHandlingIntegration);
            expect(instance.isInitialized).toBe(true);
        });

        test('should warn if already initialized', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const instance1 = initializeErrorHandling();
            const instance2 = initializeErrorHandling();

            expect(instance1).toBe(instance2);
            expect(consoleSpy).toHaveBeenCalledWith('Error handling already initialized');

            consoleSpy.mockRestore();
            instance1.destroy();
        });

        test('should make instance globally accessible', () => {
            const instance = initializeErrorHandling();

            if (typeof window !== 'undefined') {
                expect(window.zombieGameErrorHandling).toBe(instance);
            }

            instance.destroy();
        });
    });

    describe('getErrorHandling', () => {
        test('should return global instance', () => {
            const instance = initializeErrorHandling();
            const retrieved = getErrorHandling();

            expect(retrieved).toBe(instance);

            instance.destroy();
        });

        test('should throw if not initialized', () => {
            expect(() => {
                getErrorHandling();
            }).toThrow('Error handling not initialized. Call initializeErrorHandling() first.');
        });
    });

    describe('handleError', () => {
        test('should handle error through global instance', async () => {
            const instance = initializeErrorHandling();
            const mockHandleGameError = jest.spyOn(instance, 'handleGameError').mockResolvedValue({ success: true });

            const error = new GameError('Test error');
            const context = { source: 'test' };

            await handleError(error, context);

            expect(mockHandleGameError).toHaveBeenCalledWith(error, context);

            instance.destroy();
        });

        test('should throw if not initialized', async () => {
            const error = new GameError('Test error');

            await expect(handleError(error)).rejects.toThrow(
                'Error handling not initialized. Call initializeErrorHandling() first.'
            );
        });
    });
});