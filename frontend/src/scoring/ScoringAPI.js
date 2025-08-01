/**
 * API client for scoring system integration with backend
 */

export class ScoringAPI {
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
                throw new APIError(response.status, errorData.error || 'Request failed', errorData);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(0, 'Network error', { originalError: error.message });
        }
    }

    /**
     * Start a new game session
     */
    async startSession(levelId) {
        return await this.request('/game/sessions', {
            method: 'POST',
            body: JSON.stringify({
                level_id: levelId
            })
        });
    }

    /**
     * Update session score
     */
    async updateSessionScore(sessionId, scoreData) {
        return await this.request(`/game/sessions/${sessionId}/score`, {
            method: 'PUT',
            body: JSON.stringify({
                score: scoreData.totalPoints,
                zombies_killed: scoreData.zombiesKilled,
                distance_traveled: scoreData.distanceTraveled
            })
        });
    }

    /**
     * End game session
     */
    async endSession(sessionId, finalData) {
        return await this.request(`/game/sessions/${sessionId}/end`, {
            method: 'POST',
            body: JSON.stringify({
                final_score: finalData.totalPoints,
                zombies_killed: finalData.zombiesKilled,
                distance_traveled: finalData.distanceTraveled,
                session_state: finalData.sessionState || 'completed'
            })
        });
    }

    /**
     * Get session details
     */
    async getSession(sessionId) {
        return await this.request(`/game/sessions/${sessionId}`);
    }

    /**
     * Get player's recent sessions
     */
    async getPlayerSessions(limit = 10) {
        return await this.request(`/game/sessions?limit=${limit}`);
    }

    /**
     * Get active session
     */
    async getActiveSession() {
        return await this.request('/game/sessions/active');
    }

    /**
     * Submit achievement data
     */
    async submitAchievements(sessionId, achievements) {
        return await this.request(`/game/sessions/${sessionId}/achievements`, {
            method: 'POST',
            body: JSON.stringify({
                achievements: achievements.map(a => ({
                    id: a.id,
                    name: a.name,
                    points: a.points,
                    unlocked_at: a.unlockedAt
                }))
            })
        });
    }

    /**
     * Get player statistics
     */
    async getPlayerStats() {
        return await this.request('/players/stats');
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(type = 'total_score', limit = 100) {
        return await this.request(`/leaderboard?type=${type}&limit=${limit}`);
    }

    /**
     * Validate score (anti-cheat)
     */
    async validateScore(sessionId, scoreData, sessionDuration) {
        return await this.request(`/game/sessions/${sessionId}/validate`, {
            method: 'POST',
            body: JSON.stringify({
                score_data: scoreData,
                session_duration: sessionDuration
            })
        });
    }

    /**
     * Report suspicious activity
     */
    async reportSuspiciousActivity(sessionId, reason, details) {
        return await this.request('/security/report', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                reason,
                details
            })
        });
    }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(status, message, data = {}) {
        super(message);
        this.name = 'APIError';
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
}

/**
 * Scoring API client with retry logic and error handling
 */
export class RobustScoringAPI extends ScoringAPI {
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
        // If offline, queue the request (except GET requests)
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
     * Update session score with automatic retry and validation
     */
    async updateSessionScore(sessionId, scoreData) {
        try {
            // Validate score locally first
            const validation = this._validateScoreLocally(scoreData);
            if (!validation.isValid) {
                console.warn('Score validation failed locally:', validation.issues);
                // Still attempt to send, let server decide
            }

            return await super.updateSessionScore(sessionId, scoreData);
        } catch (error) {
            if (error.isValidationError()) {
                console.error('Server rejected score:', error.data);
                // Could implement local fallback or correction here
            }
            throw error;
        }
    }

    /**
     * Local score validation
     */
    _validateScoreLocally(scoreData) {
        const issues = [];
        
        // Basic sanity checks
        if (scoreData.totalPoints < 0) {
            issues.push('Negative score');
        }
        
        if (scoreData.zombiesKilled < 0) {
            issues.push('Negative zombie count');
        }
        
        if (scoreData.distanceTraveled < 0) {
            issues.push('Negative distance');
        }
        
        // Points per zombie ratio check
        if (scoreData.zombiesKilled > 0) {
            const pointsPerZombie = scoreData.totalPoints / scoreData.zombiesKilled;
            if (pointsPerZombie > 2000) {
                issues.push('Excessive points per zombie');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Batch update multiple score updates
     */
    async batchUpdateScore(sessionId, updates) {
        // If multiple updates are queued, send only the latest
        const latestUpdate = updates[updates.length - 1];
        return await this.updateSessionScore(sessionId, latestUpdate);
    }
}

export default ScoringAPI;