/**
 * Unit tests for ErrorHandler
 */

import ErrorHandler, { 
    GameError, 
    CriticalGameError, 
    AssetLoadingError,
    NetworkError,
    PerformanceError,
    WebGLContextLostError,
    MemoryError
} from '../ErrorHandler.js';

// Mock fetch for error reporting
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('ErrorHandler', () => {
    let errorHandler;

    beforeEach(() => {
        // Mock DOM elements
        const mockElement = {
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            style: {},
            innerHTML: '',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        // Mock document.createElement
        document.createElement = jest.fn(() => mockElement);
        
        // Mock document.body
        if (!document.body) {
            document.body = mockElement;
        } else {
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
        }
        errorHandler = new ErrorHandler({
            enableReporting: false, // Disable for testing
            enableRecovery: true
        });
        
        // Clear mocks
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    afterEach(() => {
        if (errorHandler) {
            errorHandler.clearErrorHistory();
        }
    });

    describe('Error Handling', () => {
        test('should handle basic game error', async () => {
            const error = new GameError('Test error');
            const result = await errorHandler.handleError(error);

            expect(result.success).toBe(false);
            expect(result.error.type).toBe('GameError');
            expect(result.error.message).toBe('Test error');
        });

        test('should handle critical game error', async () => {
            const error = new CriticalGameError('Critical test error');
            const result = await errorHandler.handleError(error);

            expect(result.success).toBe(false);
            expect(result.error.type).toBe('CriticalGameError');
            
            // Should be added to critical errors
            const stats = errorHandler.getErrorStats();
            expect(stats.criticalErrors).toBe(1);
        });

        test('should track error history', async () => {
            const error1 = new GameError('Error 1');
            const error2 = new NetworkError('Error 2');
            
            await errorHandler.handleError(error1);
            await errorHandler.handleError(error2);

            const stats = errorHandler.getErrorStats();
            expect(stats.totalErrors).toBe(2);
            expect(stats.errorsByType.GameError).toBe(1);
            expect(stats.errorsByType.NetworkError).toBe(1);
        });

        test('should limit error history size', async () => {
            const handler = new ErrorHandler({ maxErrorHistory: 2 });
            
            await handler.handleError(new GameError('Error 1'));
            await handler.handleError(new GameError('Error 2'));
            await handler.handleError(new GameError('Error 3'));

            const stats = handler.getErrorStats();
            expect(stats.totalErrors).toBe(2); // Should only keep last 2
        });
    });

    describe('Recovery Strategies', () => {
        test('should register and use recovery strategy', async () => {
            const mockRecovery = jest.fn().mockResolvedValue({ recovered: true });
            errorHandler.registerRecoveryStrategy('test_error', mockRecovery);

            const error = new GameError('Test error');
            // Mock the error type detection instead of modifying constructor.name
            Object.defineProperty(error, 'name', { value: 'TestError', writable: true });
            
            // Mock the error type detection
            errorHandler._getErrorType = jest.fn().mockReturnValue('test_error');
            
            const result = await errorHandler.handleError(error);
            
            expect(mockRecovery).toHaveBeenCalledWith(error, {});
            expect(result.success).toBe(true);
        });

        test('should handle recovery strategy failure', async () => {
            const mockRecovery = jest.fn().mockRejectedValue(new Error('Recovery failed'));
            errorHandler.registerRecoveryStrategy('test_error', mockRecovery);

            const error = new GameError('Test error');
            errorHandler._getErrorType = jest.fn().mockReturnValue('test_error');
            
            const result = await errorHandler.handleError(error);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Recovery strategy failed');
        });

        test('should limit recovery attempts', async () => {
            const mockRecovery = jest.fn().mockRejectedValue(new Error('Always fails'));
            errorHandler.registerRecoveryStrategy('test_error', mockRecovery);

            const error = new GameError('Test error');
            errorHandler._getErrorType = jest.fn().mockReturnValue('test_error');
            
            // Trigger multiple errors of same type quickly
            await errorHandler.handleError(error);
            await errorHandler.handleError(error);
            await errorHandler.handleError(error);
            const result = await errorHandler.handleError(error);
            
            expect(result.reason).toBe('Too many recovery attempts');
        });
    });

    describe('Error Listeners', () => {
        test('should notify error listeners', async () => {
            const mockListener = jest.fn();
            errorHandler.onError(mockListener);

            const error = new GameError('Test error');
            await errorHandler.handleError(error);

            expect(mockListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'GameError',
                    message: 'Test error'
                })
            );
        });

        test('should notify recovery listeners', async () => {
            const mockRecoveryListener = jest.fn();
            const mockRecovery = jest.fn().mockResolvedValue({ recovered: true });
            
            errorHandler.onRecovery(mockRecoveryListener);
            errorHandler.registerRecoveryStrategy('test_error', mockRecovery);
            errorHandler._getErrorType = jest.fn().mockReturnValue('test_error');

            const error = new GameError('Test error');
            await errorHandler.handleError(error);

            expect(mockRecoveryListener).toHaveBeenCalled();
        });

        test('should handle listener errors gracefully', async () => {
            const faultyListener = jest.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });
            errorHandler.onError(faultyListener);

            const error = new GameError('Test error');
            
            // Should not throw despite faulty listener
            await expect(errorHandler.handleError(error)).resolves.toBeDefined();
        });
    });

    describe('Error Classification', () => {
        test('should identify critical errors', () => {
            expect(errorHandler._isCriticalError(new CriticalGameError('test'))).toBe(true);
            expect(errorHandler._isCriticalError(new WebGLContextLostError('test'))).toBe(true);
            expect(errorHandler._isCriticalError(new MemoryError('test'))).toBe(true);
            expect(errorHandler._isCriticalError(new GameError('test'))).toBe(false);
        });

        test('should classify asset loading errors correctly', () => {
            const criticalAssetError = new AssetLoadingError('test', { isCritical: true });
            const normalAssetError = new AssetLoadingError('test', { isCritical: false });
            
            expect(errorHandler._isCriticalError(criticalAssetError)).toBe(true);
            expect(errorHandler._isCriticalError(normalAssetError)).toBe(false);
        });
    });

    describe('Global Error Handling', () => {
        test('should setup global error handlers', () => {
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
            
            new ErrorHandler();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
            
            addEventListenerSpy.mockRestore();
        });

        test('should handle unhandled promise rejections', async () => {
            const handler = new ErrorHandler();
            const mockHandleError = jest.spyOn(handler, 'handleError');
            
            // Simulate unhandled rejection
            const rejectionEvent = new Event('unhandledrejection');
            rejectionEvent.reason = 'Test rejection';
            window.dispatchEvent(rejectionEvent);
            
            // Wait for async handling
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockHandleError).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'PromiseRejectionError'
                })
            );
        });
    });

    describe('Emergency Save', () => {
        test('should perform emergency save on critical error', async () => {
            const error = new CriticalGameError('Critical test error');
            await errorHandler.handleError(error);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'zombie_game_emergency_save',
                expect.any(String)
            );
        });

        test('should capture game state in emergency save', async () => {
            const error = new CriticalGameError('Critical test error');
            await errorHandler.handleError(error);

            const saveCall = localStorageMock.setItem.mock.calls.find(
                call => call[0] === 'zombie_game_emergency_save'
            );
            
            expect(saveCall).toBeDefined();
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.emergency).toBe(true);
            expect(savedData.timestamp).toBeDefined();
        });
    });

    describe('Statistics', () => {
        test('should provide comprehensive error statistics', async () => {
            await errorHandler.handleError(new GameError('Error 1'));
            await errorHandler.handleError(new NetworkError('Error 2'));
            await errorHandler.handleError(new CriticalGameError('Critical'));

            const stats = errorHandler.getErrorStats();
            
            expect(stats.totalErrors).toBe(3);
            expect(stats.criticalErrors).toBe(1);
            expect(stats.errorsByType.GameError).toBe(1);
            expect(stats.errorsByType.NetworkError).toBe(1);
            expect(stats.errorsByType.CriticalGameError).toBe(1);
            expect(stats.recentErrors).toHaveLength(3);
        });

        test('should clear error history', () => {
            errorHandler.handleError(new GameError('Test'));
            errorHandler.clearErrorHistory();

            const stats = errorHandler.getErrorStats();
            expect(stats.totalErrors).toBe(0);
            expect(stats.criticalErrors).toBe(0);
        });
    });
});

describe('Custom Error Classes', () => {
    test('GameError should have correct properties', () => {
        const error = new GameError('Test message', { test: 'context' });
        
        expect(error.name).toBe('GameError');
        expect(error.message).toBe('Test message');
        expect(error.context.test).toBe('context');
        expect(error instanceof Error).toBe(true);
    });

    test('CriticalGameError should extend GameError', () => {
        const error = new CriticalGameError('Critical message');
        
        expect(error.name).toBe('CriticalGameError');
        expect(error instanceof GameError).toBe(true);
        expect(error instanceof Error).toBe(true);
    });

    test('AssetLoadingError should have isCritical property', () => {
        const criticalError = new AssetLoadingError('Asset failed', { isCritical: true });
        const normalError = new AssetLoadingError('Asset failed', { isCritical: false });
        
        expect(criticalError.isCritical).toBe(true);
        expect(normalError.isCritical).toBe(false);
    });

    test('NetworkError should have correct type', () => {
        const error = new NetworkError('Network failed', { status: 500 });
        
        expect(error.name).toBe('NetworkError');
        expect(error.context.status).toBe(500);
    });

    test('WebGLContextLostError should be critical', () => {
        const error = new WebGLContextLostError('Context lost');
        
        expect(error.name).toBe('WebGLContextLostError');
        expect(error instanceof CriticalGameError).toBe(true);
    });
});