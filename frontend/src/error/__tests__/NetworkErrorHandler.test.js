/**
 * Unit tests for NetworkErrorHandler
 */

import NetworkErrorHandler, { RobustAPIClient } from '../NetworkErrorHandler.js';
import { NetworkError } from '../ErrorHandler.js';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

describe('NetworkErrorHandler', () => {
    let networkHandler;

    beforeEach(() => {
        networkHandler = new NetworkErrorHandler({
            maxRetries: 2,
            baseDelay: 100,
            timeoutMs: 1000
        });
        
        jest.clearAllMocks();
        fetch.mockClear();
    });

    describe('Basic Request Handling', () => {
        test('should make successful request', async () => {
            const mockResponse = { data: 'test' };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve(mockResponse)
            });

            const result = await networkHandler.makeRequest('http://test.com/api');
            
            expect(fetch).toHaveBeenCalledWith('http://test.com/api', expect.any(Object));
            expect(result).toEqual(mockResponse);
        });

        test('should handle text responses', async () => {
            const mockResponse = 'plain text';
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'text/plain' },
                text: () => Promise.resolve(mockResponse)
            });

            const result = await networkHandler.makeRequest('http://test.com/api');
            
            expect(result).toBe(mockResponse);
        });

        test('should handle request timeout', async () => {
            fetch.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 2000))
            );

            await expect(networkHandler.makeRequest('http://test.com/api'))
                .rejects.toThrow(NetworkError);
        }, 10000);
    });

    describe('Retry Logic', () => {
        test('should retry on server error', async () => {
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ success: true })
                });

            const result = await networkHandler.makeRequest('http://test.com/api');
            
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        test('should not retry on client error', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: () => Promise.resolve('Bad request')
            });

            await expect(networkHandler.makeRequest('http://test.com/api'))
                .rejects.toThrow(NetworkError);
            
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on rate limit (429)', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    text: () => Promise.resolve('Rate limited')
                })
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ success: true })
                });

            const result = await networkHandler.makeRequest('http://test.com/api');
            
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        test('should fail after max retries', async () => {
            fetch.mockRejectedValue(new Error('Network error'));

            await expect(networkHandler.makeRequest('http://test.com/api'))
                .rejects.toThrow(NetworkError);
            
            expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('Offline Handling', () => {
        test('should queue non-GET requests when offline', async () => {
            // Set offline state
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            // Trigger offline event to update handler state
            window.dispatchEvent(new Event('offline'));
            
            const requestPromise = networkHandler.makeRequest('http://test.com/api', {
                method: 'POST',
                body: JSON.stringify({ data: 'test' })
            });

            // Wait a bit to ensure request is queued
            await new Promise(resolve => setTimeout(resolve, 10));

            // Request should be queued, not executed immediately
            expect(fetch).not.toHaveBeenCalled();
            
            // Simulate going back online
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
            
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ success: true })
            });
            
            window.dispatchEvent(new Event('online'));
            
            const result = await requestPromise;
            expect(result).toEqual({ success: true });
        });

        test('should allow GET requests when offline', async () => {
            navigator.onLine = false;
            
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(networkHandler.makeRequest('http://test.com/api', { method: 'GET' }))
                .rejects.toThrow(NetworkError);
            
            expect(fetch).toHaveBeenCalled();
        });
    });

    describe('Caching', () => {
        test('should cache GET requests', async () => {
            const mockResponse = { data: 'cached' };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve(mockResponse)
            });

            // First request
            const result1 = await networkHandler.makeRequest('http://test.com/api');
            
            // Second request should use cache
            const result2 = await networkHandler.makeRequest('http://test.com/api');
            
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(mockResponse);
            expect(result2).toEqual(mockResponse);
        });

        test('should respect cache time', async () => {
            const mockResponse = { data: 'test' };
            fetch.mockResolvedValue({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve(mockResponse)
            });

            // First request
            await networkHandler.makeRequest('http://test.com/api', { cacheTime: 50 });
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 60));
            
            // Second request should not use cache
            await networkHandler.makeRequest('http://test.com/api', { cacheTime: 50 });
            
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Network Status', () => {
        test('should provide network status', () => {
            const status = networkHandler.getNetworkStatus();
            
            expect(status).toHaveProperty('isOnline');
            expect(status).toHaveProperty('queuedRequests');
            expect(status).toHaveProperty('cachedRequests');
        });

        test('should test connectivity', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({})
            });

            const isConnected = await networkHandler.testConnectivity();
            expect(isConnected).toBe(true);
        });

        test('should detect connectivity failure', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const isConnected = await networkHandler.testConnectivity();
            expect(isConnected).toBe(false);
        });
    });
});

describe('RobustAPIClient', () => {
    let apiClient;

    beforeEach(() => {
        apiClient = new RobustAPIClient('http://api.test.com', {
            maxRetries: 2,
            baseDelay: 100
        });
        
        jest.clearAllMocks();
        fetch.mockClear();
    });

    describe('HTTP Methods', () => {
        test('should make GET request', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await apiClient.get('/users');
            
            expect(fetch).toHaveBeenCalledWith(
                'http://api.test.com/users',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toEqual({ data: 'test' });
        });

        test('should make POST request with data', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ id: 1 })
            });

            const postData = { name: 'John' };
            const result = await apiClient.post('/users', postData);
            
            expect(fetch).toHaveBeenCalledWith(
                'http://api.test.com/users',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
            );
            expect(result).toEqual({ id: 1 });
        }, 10000);

        test('should make PUT request', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ updated: true })
            });

            const result = await apiClient.put('/users/1', { name: 'Jane' });
            
            expect(fetch).toHaveBeenCalledWith(
                'http://api.test.com/users/1',
                expect.objectContaining({ method: 'PUT' })
            );
            expect(result).toEqual({ updated: true });
        }, 10000);

        test('should make DELETE request', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ deleted: true })
            });

            const result = await apiClient.delete('/users/1');
            
            expect(fetch).toHaveBeenCalledWith(
                'http://api.test.com/users/1',
                expect.objectContaining({ method: 'DELETE' })
            );
            expect(result).toEqual({ deleted: true });
        }, 10000);
    });

    describe('Authentication', () => {
        test('should add auth token to requests', async () => {
            apiClient.setAuthToken('test-token');
            
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({})
            });

            await apiClient.get('/protected');
            
            expect(fetch).toHaveBeenCalledWith(
                'http://api.test.com/protected',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
        });
    });

    describe('Batch Requests', () => {
        test('should handle batch requests', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ id: 1 })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ id: 2 })
                });

            const requests = [
                { method: 'GET', endpoint: '/users/1' },
                { method: 'GET', endpoint: '/users/2' }
            ];

            const results = await apiClient.batchRequests(requests);
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[0].data).toEqual({ id: 1 });
            expect(results[1].success).toBe(true);
            expect(results[1].data).toEqual({ id: 2 });
        });

        test('should handle mixed success/failure in batch', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ id: 1 })
                })
                .mockRejectedValueOnce(new Error('Network error'));

            const requests = [
                { method: 'GET', endpoint: '/users/1' },
                { method: 'GET', endpoint: '/users/2' }
            ];

            const results = await apiClient.batchRequests(requests);
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBeInstanceOf(NetworkError);
        });
    });

    describe('Error Context', () => {
        test('should add context to network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            try {
                await apiClient.post('/users', { name: 'John' });
            } catch (error) {
                expect(error).toBeInstanceOf(NetworkError);
                expect(error.context.method).toBe('POST');
                expect(error.context.endpoint).toBe('/users');
                expect(error.context.hasData).toBe(true);
            }
        });
    });
});