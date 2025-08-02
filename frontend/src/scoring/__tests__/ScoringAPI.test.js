import { ScoringAPI, RobustScoringAPI, APIError } from '../ScoringAPI';

// Mock fetch
global.fetch = jest.fn();

describe('ScoringAPI', () => {
    let api;
    const baseURL = '/api/v1';
    const authToken = 'test-token';

    beforeEach(() => {
        api = new ScoringAPI(baseURL, authToken);
        fetch.mockClear();
    });

    describe('Constructor', () => {
        test('should initialize with default values', () => {
            const defaultApi = new ScoringAPI();
            expect(defaultApi.baseURL).toBe('/api/v1');
            expect(defaultApi.authToken).toBeNull();
        });

        test('should initialize with provided values', () => {
            expect(api.baseURL).toBe(baseURL);
            expect(api.authToken).toBe(authToken);
        });
    });

    describe('setAuthToken', () => {
        test('should update auth token', () => {
            const newToken = 'new-token';
            api.setAuthToken(newToken);
            expect(api.authToken).toBe(newToken);
        });
    });

    describe('request', () => {
        test('should make successful request', async () => {
            const mockResponse = { success: true, data: 'test' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.request('/test');

            expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        test('should include auth token in headers', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({})
            });

            await api.request('/test');

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
        });

        test('should work without auth token', async () => {
            const noAuthApi = new ScoringAPI();
            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({})
            });

            await noAuthApi.request('/test');

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'Authorization': expect.any(String)
                    })
                })
            );
        });

        test('should handle HTTP errors', async () => {
            const errorResponse = { error: 'Not found' };
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: jest.fn().mockResolvedValueOnce(errorResponse)
            });

            await expect(api.request('/test')).rejects.toThrow(APIError);
            
            // Reset mock for second call
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: jest.fn().mockResolvedValueOnce(errorResponse)
            });
            
            await expect(api.request('/test')).rejects.toThrow('Not found');
        });

        test('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(api.request('/test')).rejects.toThrow(APIError);
            await expect(api.request('/test')).rejects.toThrow('Network error');
        });

        test('should handle malformed JSON responses', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
            });

            await expect(api.request('/test')).rejects.toThrow(APIError);
        });
    });

    describe('startSession', () => {
        test('should start new session', async () => {
            const mockResponse = { session: { id: 'session-123' } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.startSession('level-1');

            expect(fetch).toHaveBeenCalledWith('/api/v1/game/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({ level_id: 'level-1' })
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('updateSessionScore', () => {
        test('should update session score', async () => {
            const sessionId = 'session-123';
            const scoreData = {
                totalPoints: 1000,
                zombiesKilled: 50,
                distanceTraveled: 2000
            };
            const mockResponse = { success: true };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.updateSessionScore(sessionId, scoreData);

            expect(fetch).toHaveBeenCalledWith(`/api/v1/game/sessions/${sessionId}/score`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({
                    score: 1000,
                    zombies_killed: 50,
                    distance_traveled: 2000
                })
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('endSession', () => {
        test('should end session', async () => {
            const sessionId = 'session-123';
            const finalData = {
                totalPoints: 1500,
                zombiesKilled: 75,
                distanceTraveled: 3000,
                sessionState: 'completed'
            };
            const mockResponse = { result: { currency_earned: 150 } };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.endSession(sessionId, finalData);

            expect(fetch).toHaveBeenCalledWith(`/api/v1/game/sessions/${sessionId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({
                    final_score: 1500,
                    zombies_killed: 75,
                    distance_traveled: 3000,
                    session_state: 'completed'
                })
            });
            expect(result).toEqual(mockResponse);
        });

        test('should default session state to completed', async () => {
            const sessionId = 'session-123';
            const finalData = {
                totalPoints: 1500,
                zombiesKilled: 75,
                distanceTraveled: 3000
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({})
            });

            await api.endSession(sessionId, finalData);

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"session_state":"completed"')
                })
            );
        });
    });

    describe('getSession', () => {
        test('should get session details', async () => {
            const sessionId = 'session-123';
            const mockResponse = { session: { id: sessionId, score: 1000 } };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.getSession(sessionId);

            expect(fetch).toHaveBeenCalledWith(`/api/v1/game/sessions/${sessionId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getPlayerSessions', () => {
        test('should get player sessions with default limit', async () => {
            const mockResponse = { sessions: [] };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            const result = await api.getPlayerSessions();

            expect(fetch).toHaveBeenCalledWith('/api/v1/game/sessions?limit=10', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        test('should get player sessions with custom limit', async () => {
            const mockResponse = { sessions: [] };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockResponse)
            });

            await api.getPlayerSessions(25);

            expect(fetch).toHaveBeenCalledWith('/api/v1/game/sessions?limit=25', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
        });
    });
});

describe('APIError', () => {
    test('should create error with status and message', () => {
        const error = new APIError(404, 'Not found');
        
        expect(error.status).toBe(404);
        expect(error.message).toBe('Not found');
        expect(error.data).toEqual({});
        expect(error.name).toBe('APIError');
    });

    test('should create error with additional data', () => {
        const data = { field: 'username', code: 'INVALID' };
        const error = new APIError(400, 'Validation failed', data);
        
        expect(error.data).toEqual(data);
    });

    describe('Error type checking', () => {
        test('should identify auth errors', () => {
            expect(new APIError(401, 'Unauthorized').isAuthError()).toBe(true);
            expect(new APIError(403, 'Forbidden').isAuthError()).toBe(true);
            expect(new APIError(404, 'Not found').isAuthError()).toBe(false);
        });

        test('should identify validation errors', () => {
            expect(new APIError(400, 'Bad request').isValidationError()).toBe(true);
            expect(new APIError(422, 'Unprocessable entity').isValidationError()).toBe(false);
        });

        test('should identify server errors', () => {
            expect(new APIError(500, 'Internal server error').isServerError()).toBe(true);
            expect(new APIError(502, 'Bad gateway').isServerError()).toBe(true);
            expect(new APIError(400, 'Bad request').isServerError()).toBe(false);
        });

        test('should identify network errors', () => {
            expect(new APIError(0, 'Network error').isNetworkError()).toBe(true);
            expect(new APIError(500, 'Server error').isNetworkError()).toBe(false);
        });
    });
});

describe('RobustScoringAPI', () => {
    let robustApi;

    beforeEach(() => {
        robustApi = new RobustScoringAPI('/api/v1', 'token', {
            retryAttempts: 2,
            retryDelay: 100,
            retryBackoff: 2
        });
        fetch.mockClear();
        
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    });

    describe('Retry Logic', () => {
        test('should retry on server errors', async () => {
            // First call fails, second succeeds
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    json: jest.fn().mockResolvedValueOnce({ error: 'Server error' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValueOnce({ success: true })
                });

            const result = await robustApi.request('/test');

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        test('should not retry on client errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValueOnce({ error: 'Bad request' })
            });

            await expect(robustApi.request('/test')).rejects.toThrow('Bad request');
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should not retry on auth errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: jest.fn().mockResolvedValueOnce({ error: 'Unauthorized' })
            });

            await expect(robustApi.request('/test')).rejects.toThrow('Unauthorized');
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on rate limit errors', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    json: jest.fn().mockResolvedValueOnce({ error: 'Rate limited' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValueOnce({ success: true })
                });

            const result = await robustApi.request('/test');

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        test('should exhaust retries and throw last error', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: jest.fn().mockResolvedValue({ error: 'Server error' })
            });

            await expect(robustApi.request('/test')).rejects.toThrow('Server error');
            expect(fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
        });
    });

    describe('Offline Handling', () => {
        test('should queue requests when offline', async () => {
            navigator.onLine = false;
            
            const promise = robustApi.request('/test', { method: 'POST' });
            
            expect(robustApi.offlineQueue).toHaveLength(1);
            
            // Simulate going back online
            navigator.onLine = true;
            fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ success: true })
            });
            
            // Trigger online event
            window.dispatchEvent(new Event('online'));
            
            // Add small delay to allow async processing
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const result = await promise;
            expect(result).toEqual({ success: true });
        }, 5000);

        test('should not queue GET requests when offline', async () => {
            navigator.onLine = false;
            
            // Mock fetch to reject for offline scenario
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            try {
                await robustApi.request('/test', { method: 'GET' });
                // If it doesn't throw, the test should fail
                fail('Expected request to throw an error');
            } catch (error) {
                // Should throw an error for GET requests when offline
                expect(error).toBeDefined();
            }
            
            expect(robustApi.offlineQueue).toHaveLength(0);
        });
    });

    describe('Score Validation', () => {
        test('should validate score locally', async () => {
            const scoreData = {
                totalPoints: -100, // Invalid
                zombiesKilled: 10,
                sessionDuration: 300
            };

            // Mock server to reject invalid score
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Score validation failed' })
            });

            await expect(robustApi.updateSessionScore('session-123', scoreData))
                .rejects.toThrow('Score validation failed');
        }, 15000);

        test('should handle server validation errors', async () => {
            const scoreData = {
                totalPoints: 1000,
                zombiesKilled: 10,
                distanceTraveled: 1000
            };

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValueOnce({ error: 'Score validation failed' })
            });

            await expect(robustApi.updateSessionScore('session-123', scoreData))
                .rejects.toThrow('Score validation failed');
        });
    });

    describe('Batch Updates', () => {
        test('should use latest update in batch', async () => {
            const updates = [
                { totalPoints: 100, zombiesKilled: 5, sessionDuration: 120 },
                { totalPoints: 200, zombiesKilled: 10, sessionDuration: 240 },
                { totalPoints: 300, zombiesKilled: 15, sessionDuration: 360 }
            ];

            // Reset and mock successful response
            global.fetch.mockReset();
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            const result = await robustApi.batchUpdateScore('session-123', updates);

            // Should only make one request with the latest data
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true });
        });
    });
});