/**
 * SaveAPI handles backend communication for save data synchronization
 * Provides robust API integration with retry logic and error handling
 */

export class SaveAPI {
    constructor(baseURL = '/api/v1', authToken = null) {
        this.baseURL = baseURL;
        this.authToken = authToken;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new SaveAPIError(response.status, errorData.error || 'Request failed', errorData);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof SaveAPIError) {
                throw error;
            }
            throw new SaveAPIError(0, 'Network error', { originalError: error.message });
        }
    }

    /**
     * Get player's save data from server
     */
    async getSaveData() {
        return await this.request('/player/save');
    }

    /**
     * Upload save data to server
     */
    async uploadSaveData(saveData) {
        return await this.request('/player/save', {
            method: 'PUT',
            body: JSON.stringify({
                save_data: saveData,
                timestamp: Date.now()
            })
        });
    }

    /**
     * Create backup of save data on server
     */
    async createServerBackup(saveData, backupName = null) {
        return await this.request('/player/save/backup', {
            method: 'POST',
            body: JSON.stringify({
                save_data: saveData,
                backup_name: backupName || `backup_${Date.now()}`,
                timestamp: Date.now()
            })
        });
    }

    /**
     * Get list of server backups
     */
    async getServerBackups() {
        return await this.request('/player/save/backups');
    }

    /**
     * Restore from server backup
     */
    async restoreFromServerBackup(backupId) {
        return await this.request(`/player/save/backups/${backupId}/restore`, {
            method: 'POST'
        });
    }

    /**
     * Delete server backup
     */
    async deleteServerBackup(backupId) {
        return await this.request(`/player/save/backups/${backupId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Validate save data integrity on server
     */
    async validateSaveData(saveData) {
        return await this.request('/player/save/validate', {
            method: 'POST',
            body: JSON.stringify({
                save_data: saveData
            })
        });
    }

    /**
     * Get save data synchronization status
     */
    async getSyncStatus() {
        return await this.request('/player/save/sync-status');
    }

    /**
     * Force synchronization with server
     */
    async forceSyncWithServer(localSaveData) {
        return await this.request('/player/save/sync', {
            method: 'POST',
            body: JSON.stringify({
                local_save_data: localSaveData,
                force_sync: true
            })
        });
    }

    /**
     * Report save data corruption
     */
    async reportCorruption(corruptionDetails) {
        return await this.request('/player/save/report-corruption', {
            method: 'POST',
            body: JSON.stringify({
                corruption_details: corruptionDetails,
                timestamp: Date.now()
            })
        });
    }
}

/**
 * Custom Save API Error class
 */
export class SaveAPIError extends Error {
    constructor(status, message, data = {}) {
        super(message);
        this.name = 'SaveAPIError';
        this.status = status;
        this.data = data;
    }

    /**
     * Check if error is due to authentication
     */
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }

    /**
     * Check if error is due to validation
     */
    isValidationError() {
        return this.status === 400;
    }

    /**
     * Check if error is server-side
     */
    isServerError() {
        return this.status >= 500;
    }

    /**
     * Check if error is network-related
     */
    isNetworkError() {
        return this.status === 0;
    }

    /**
     * Check if error is due to save data conflict
     */
    isConflictError() {
        return this.status === 409;
    }
}

/**
 * Robust Save API with retry logic and offline support
 */
export class RobustSaveAPI extends SaveAPI {
    constructor(baseURL, authToken, options = {}) {
        super(baseURL, authToken);
        
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.retryBackoff = options.retryBackoff || 2;
        
        // Queue for offline requests
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        
        this._setupNetworkListeners();
    }

    /**
     * Setup network status listeners
     */
    _setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this._processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Make request with retry logic
     */
    async request(endpoint, options = {}) {
        // If offline, queue non-GET requests
        if (!navigator.onLine && options.method && options.method !== 'GET') {
            return this._queueOfflineRequest(endpoint, options);
        }

        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                return await super.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except 429 (rate limit)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }
                
                // Don't retry on auth errors
                if (error.isAuthError()) {
                    throw error;
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts - 1) {
                    const delay = this.retryDelay * Math.pow(this.retryBackoff, attempt);
                    await this._sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Queue request for when back online
     */
    _queueOfflineRequest(endpoint, options) {
        return new Promise((resolve, reject) => {
            this.offlineQueue.push({
                endpoint,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Process queued offline requests
     */
    async _processOfflineQueue() {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        
        for (const request of queue) {
            try {
                const result = await super.request(request.endpoint, request.options);
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
        }
    }

    /**
     * Sleep utility for retry delays
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Upload save data with conflict resolution
     */
    async uploadSaveData(saveData) {
        try {
            return await super.uploadSaveData(saveData);
        } catch (error) {
            if (error.isConflictError()) {
                // Handle save data conflict
                const serverData = error.data.server_save_data;
                throw new SaveConflictError('Save data conflict detected', {
                    localData: saveData,
                    serverData: serverData,
                    conflictReason: error.data.conflict_reason
                });
            }
            throw error;
        }
    }

    /**
     * Smart sync that handles conflicts automatically
     */
    async smartSync(localSaveData) {
        try {
            // First, try to get server data
            const serverResponse = await this.getSaveData();
            const serverData = serverResponse?.data?.save_data;
            
            // Compare timestamps
            const localTimestamp = localSaveData.timestamp;
            const serverTimestamp = serverData?.timestamp;
            
            if (serverData && serverTimestamp > localTimestamp) {
                // Server is newer, return server data
                return {
                    action: 'download',
                    data: serverData,
                    message: 'Server data is newer, downloading'
                };
            } else if (serverData && localTimestamp > serverTimestamp) {
                // Local is newer, upload
                await this.uploadSaveData(localSaveData);
                return {
                    action: 'upload',
                    data: localSaveData,
                    message: 'Local data is newer, uploaded to server'
                };
            } else {
                // Same timestamp, data is in sync
                return {
                    action: 'none',
                    data: localSaveData,
                    message: 'Data is already in sync'
                };
            }
        } catch (error) {
            if (error.status === 404) {
                // No server data exists, upload local data
                await this.uploadSaveData(localSaveData);
                return {
                    action: 'upload',
                    data: localSaveData,
                    message: 'No server data found, uploaded local data'
                };
            }
            throw error;
        }
    }

    /**
     * Batch operations for multiple save operations
     */
    async batchSaveOperations(operations) {
        const results = [];
        
        for (const operation of operations) {
            try {
                let result;
                switch (operation.type) {
                    case 'upload':
                        result = await this.uploadSaveData(operation.data);
                        break;
                    case 'backup':
                        result = await this.createServerBackup(operation.data, operation.name);
                        break;
                    case 'validate':
                        result = await this.validateSaveData(operation.data);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
                
                results.push({
                    operation: operation.type,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    operation: operation.type,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

/**
 * Save Conflict Error for handling data conflicts
 */
export class SaveConflictError extends Error {
    constructor(message, conflictData) {
        super(message);
        this.name = 'SaveConflictError';
        this.conflictData = conflictData;
    }

    /**
     * Get local save data
     */
    getLocalData() {
        return this.conflictData.localData;
    }

    /**
     * Get server save data
     */
    getServerData() {
        return this.conflictData.serverData;
    }

    /**
     * Get conflict reason
     */
    getConflictReason() {
        return this.conflictData.conflictReason;
    }
}

export default SaveAPI;