import { SaveAPI, RobustSaveAPI, SaveAPIError, SaveConflictError } from '../SaveAPI.js';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

describe('SaveAPI', () => {
    let saveAPI;

    beforeEach(() => {
        jest.clearAllMocks();
        saveAPI = new SaveAPI('/api/v1', 'test-token');
    });

    describe('Basic API Operations', () => {
        test('should make authenticated requests', async () => {
            const mockResponse = { success: true, data: { test: 'data' } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await saveAPI.request('/test');

            expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        test('should handle requests without auth token', async () => {
            saveAPI.authToken = null;
            const mockResponse = { success: true };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            await saveAPI.request('/test');

            expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        });

        test('should handle API errors', async () => {
            const errorResponse = { error: 'Not found' };
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve(errorResponse)
            });

            await expect(saveAPI.request('/test')).rejects.toThrow(SaveAPIError);
        });

        test('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(saveAPI.request('/test')).rejects.toThrow(SaveAPIError);
        });
    });

    describe('Save Data Operations', () => {
        test('should get save data', async () => {
            const mockSaveData = { player: { currency: 1000 } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: { save_data: mockSaveData } })
            });

            const result = await saveAPI.getSaveData();

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save', expect.any(Object));
            expect(result.data.save_data).toEqual(mockSaveData);
        });

        test('should upload save data', async () => {
            const saveData = { player: { currency: 1500 } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await saveAPI.uploadSaveData(saveData);

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: expect.stringContaining('"save_data":{"player":{"currency":1500}}')
            });
        });

        test('should create server backup', async () => {
            const saveData = { player: { currency: 1000 } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, backup_id: 'backup_123' })
            });

            const result = await saveAPI.createServerBackup(saveData, 'test-backup');

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: expect.stringContaining('"backup_name":"test-backup"')
            });
            expect(result.backup_id).toBe('backup_123');
        });

        test('should validate save data', async () => {
            const saveData = { player: { currency: 1000 } };
            const validationResult = { valid: true, issues: [] };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(validationResult)
            });

            const result = await saveAPI.validateSaveData(saveData);

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({ save_data: saveData })
            });
            expect(result.valid).toBe(true);
        });
    });

    describe('Backup Operations', () => {
        test('should get server backups', async () => {
            const backups = [
                { id: 'backup_1', name: 'backup_1', timestamp: Date.now() },
                { id: 'backup_2', name: 'backup_2', timestamp: Date.now() - 1000 }
            ];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: { backups } })
            });

            const result = await saveAPI.getServerBackups();

            expect(result.data.backups).toEqual(backups);
        });

        test('should restore from server backup', async () => {
            const restoredData = { player: { currency: 2000 } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, save_data: restoredData })
            });

            const result = await saveAPI.restoreFromServerBackup('backup_123');

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save/backups/backup_123/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
            expect(result.save_data).toEqual(restoredData);
        });

        test('should delete server backup', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await saveAPI.deleteServerBackup('backup_123');

            expect(fetch).toHaveBeenCalledWith('/api/v1/player/save/backups/backup_123', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            });
        });
    });
});

describe('SaveAPIError', () => {
    test('should identify auth errors', () => {
        const authError = new SaveAPIError(401, 'Unauthorized');
        expect(authError.isAuthError()).toBe(true);
        
        const forbiddenError = new SaveAPIError(403, 'Forbidden');
        expect(forbiddenError.isAuthError()).toBe(true);
        
        const otherError = new SaveAPIError(500, 'Server error');
        expect(otherError.isAuthError()).toBe(false);
    });

    test('should identify validation errors', () => {
        const validationError = new SaveAPIError(400, 'Bad request');
        expect(validationError.isValidationError()).toBe(true);
        
        const otherError = new SaveAPIError(500, 'Server error');
        expect(validationError.isValidationError()).toBe(true);
        expect(otherError.isValidationError()).toBe(false);
    });

    test('should identify server errors', () => {
        const serverError = new SaveAPIError(500, 'Internal server error');
        expect(serverError.isServerError()).toBe(true);
        
        const clientError = new SaveAPIError(400, 'Bad request');
        expect(clientError.isServerError()).toBe(false);
    });

    test('should identify network errors', () => {
        const networkError = new SaveAPIError(0, 'Network error');
        expect(networkError.isNetworkError()).toBe(true);
        
        const serverError = new SaveAPIError(500, 'Server error');
        expect(serverError.isNetworkError()).toBe(false);
    });

    test('should identify conflict errors', () => {
        const conflictError = new SaveAPIError(409, 'Conflict');
        expect(conflictError.isConflictError()).toBe(true);
        
        const otherError = new SaveAPIError(400, 'Bad request');
        expect(otherError.isConflictError()).toBe(false);
    });
});

describe('RobustSaveAPI', () => {
    let robustAPI;

    beforeEach(() => {
        jest.clearAllMocks();
        robustAPI = new RobustSaveAPI('/api/v1', 'test-token', {
            retryAttempts: 3,
            retryDelay: 100
        });
    });

    afterEach(() => {
        if (robustAPI) {
            robustAPI.offlineQueue = [];
        }
    });

    describe('Retry Logic', () => {
        test('should retry on server errors', async () => {
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await robustAPI.request('/test');

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result.success).toBe(true);
        });

        test('should not retry on client errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Bad request' })
            });

            await expect(robustAPI.request('/test')).rejects.toThrow(SaveAPIError);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should not retry on auth errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' })
            });

            await expect(robustAPI.request('/test')).rejects.toThrow(SaveAPIError);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on rate limit errors', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    json: () => Promise.resolve({ error: 'Rate limited' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await robustAPI.request('/test');

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result.success).toBe(true);
        });
    });

    describe('Offline Support', () => {
        test('should queue requests when offline', async () => {
            navigator.onLine = false;

            const promise = robustAPI.request('/test', { method: 'POST' });

            expect(robustAPI.offlineQueue).toHaveLength(1);
            expect(fetch).not.toHaveBeenCalled();

            // Simulate going back online
            navigator.onLine = true;
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            // Trigger online event
            window.dispatchEvent(new Event('online'));

            const result = await promise;
            expect(result.success).toBe(true);
            expect(robustAPI.offlineQueue).toHaveLength(0);
        });

        test('should not queue GET requests when offline', async () => {
            navigator.onLine = false;

            await expect(robustAPI.request('/test')).rejects.toThrow();
            expect(robustAPI.offlineQueue).toHaveLength(0);
        });
    });

    describe('Smart Sync', () => {
        test('should download when server data is newer', async () => {
            const localData = { timestamp: Date.now() - 10000, player: { currency: 500 } };
            const serverData = { timestamp: Date.now(), player: { currency: 1000 } };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: { save_data: serverData } })
            });

            const result = await robustAPI.smartSync(localData);

            expect(result.action).toBe('download');
            expect(result.data).toEqual(serverData);
        });

        test('should upload when local data is newer', async () => {
            const localData = { timestamp: Date.now(), player: { currency: 1000 } };
            const serverData = { timestamp: Date.now() - 10000, player: { currency: 500 } };

            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ data: { save_data: serverData } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await robustAPI.smartSync(localData);

            expect(result.action).toBe('upload');
            expect(result.data).toEqual(localData);
        }, 10000);

        test('should handle no server data', async () => {
            const localData = { timestamp: Date.now(), player: { currency: 1000 } };

            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                    json: () => Promise.resolve({ error: 'Not found' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await robustAPI.smartSync(localData);

            expect(result.action).toBe('upload');
            expect(result.message).toContain('No server data found');
        }, 10000);

        test('should detect data in sync', async () => {
            const timestamp = Date.now();
            const localData = { timestamp, player: { currency: 1000 } };
            const serverData = { timestamp, player: { currency: 1000 } };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: { save_data: serverData } })
            });

            const result = await robustAPI.smartSync(localData);

            expect(result.action).toBe('none');
            expect(result.message).toContain('already in sync');
        }, 10000);
    });

    describe('Conflict Handling', () => {
        test('should handle upload conflicts', async () => {
            const saveData = { player: { currency: 1000 } };
            const serverData = { player: { currency: 1500 } };

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: () => Promise.resolve({
                    error: 'Conflict',
                    server_save_data: serverData,
                    conflict_reason: 'timestamp_mismatch'
                })
            });

            await expect(robustAPI.uploadSaveData(saveData)).rejects.toThrow(SaveConflictError);
        }, 10000);
    });

    describe('Batch Operations', () => {
        test('should perform batch operations', async () => {
            const operations = [
                { type: 'upload', data: { player: { currency: 1000 } } },
                { type: 'backup', data: { player: { currency: 1000 } }, name: 'test-backup' },
                { type: 'validate', data: { player: { currency: 1000 } } }
            ];

            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true, backup_id: 'backup_123' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ valid: true })
                });

            const results = await robustAPI.batchSaveOperations(operations);

            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(results[2].success).toBe(true);
        }, 10000);

        test('should handle batch operation failures', async () => {
            const operations = [
                { type: 'upload', data: { player: { currency: 1000 } } },
                { type: 'invalid', data: {} }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const results = await robustAPI.batchSaveOperations(operations);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toContain('Unknown operation type');
        }, 10000);
    });
});

describe('SaveConflictError', () => {
    test('should provide conflict data access', () => {
        const conflictData = {
            localData: { player: { currency: 1000 } },
            serverData: { player: { currency: 1500 } },
            conflictReason: 'timestamp_mismatch'
        };

        const error = new SaveConflictError('Conflict detected', conflictData);

        expect(error.getLocalData()).toEqual(conflictData.localData);
        expect(error.getServerData()).toEqual(conflictData.serverData);
        expect(error.getConflictReason()).toBe('timestamp_mismatch');
    });
});