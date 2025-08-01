/**
 * Network Error Handler with retry mechanisms and offline support
 * Provides robust network error handling for API calls
 */

import { NetworkError } from './ErrorHandler.js';

export class NetworkErrorHandler {
    constructor(options = {}) {
        this.options = {
            maxRetries: options.maxRetries || 3,
            baseDelay: options.baseDelay || 1000,
            maxDelay: options.maxDelay || 30000,
            backoffFactor: options.backoffFactor || 2,
            jitterFactor: options.jitterFactor || 0.1,
            timeoutMs: options.timeoutMs || 10000,
            retryableStatusCodes: options.retryableStatusCodes || [408, 429, 500, 502, 503, 504],
            ...options
        };

        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.requestCache = new Map();
        
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
     * Make a network request with retry logic
     */
    async makeRequest(url, options = {}) {
        const requestId = this._generateRequestId(url, options);
        
        // Check cache for GET requests
        if ((!options.method || options.method === 'GET') && this.requestCache.has(requestId)) {
            const cached = this.requestCache.get(requestId);
            if (Date.now() - cached.timestamp < (options.cacheTime || 60000)) {
                return cached.data;
            }
        }

        // If offline, queue non-GET requests
        if (!this.isOnline && options.method && options.method !== 'GET') {
            return this._queueOfflineRequest(url, options);
        }

        return this._executeRequestWithRetry(url, options, requestId);
    }

    /**
     * Execute request with retry logic
     */
    async _executeRequestWithRetry(url, options, requestId) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
            try {
                const result = await this._executeRequest(url, options);
                
                // Cache successful GET requests
                if (!options.method || options.method === 'GET') {
                    this.requestCache.set(requestId, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (except rate limiting)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw new NetworkError(`Client error: ${error.message}`, {
                        status: error.status,
                        url,
                        attempt: attempt + 1
                    });
                }
                
                // Don't retry on the last attempt
                if (attempt === this.options.maxRetries) {
                    break;
                }
                
                // Calculate delay with exponential backoff and jitter
                const delay = this._calculateDelay(attempt);
                await this._sleep(delay);
            }
        }
        
        throw new NetworkError(`Request failed after ${this.options.maxRetries + 1} attempts: ${lastError.message}`, {
            status: lastError.status,
            url,
            attempts: this.options.maxRetries + 1,
            lastError: lastError.message
        });
    }

    /**
     * Execute a single request with timeout
     */
    async _executeRequest(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.text().catch(() => '');
                throw {
                    status: response.status,
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    data: errorData
                };
            }
            
            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw {
                    status: 0,
                    message: 'Request timeout',
                    timeout: true
                };
            }
            
            if (error.status) {
                throw error;
            }
            
            throw {
                status: 0,
                message: error.message || 'Network error',
                networkError: true
            };
        }
    }

    /**
     * Calculate delay with exponential backoff and jitter
     */
    _calculateDelay(attempt) {
        const exponentialDelay = this.options.baseDelay * Math.pow(this.options.backoffFactor, attempt);
        const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = cappedDelay * this.options.jitterFactor * Math.random();
        
        return cappedDelay + jitter;
    }

    /**
     * Queue request for when back online
     */
    _queueOfflineRequest(url, options) {
        return new Promise((resolve, reject) => {
            this.offlineQueue.push({
                url,
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
                const result = await this._executeRequestWithRetry(
                    request.url, 
                    request.options,
                    this._generateRequestId(request.url, request.options)
                );
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
        }
    }

    /**
     * Generate request ID for caching
     */
    _generateRequestId(url, options) {
        const key = `${options.method || 'GET'}_${url}_${JSON.stringify(options.body || {})}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear request cache
     */
    clearCache() {
        this.requestCache.clear();
    }

    /**
     * Get network status
     */
    getNetworkStatus() {
        return {
            isOnline: this.isOnline,
            queuedRequests: this.offlineQueue.length,
            cachedRequests: this.requestCache.size
        };
    }

    /**
     * Test network connectivity
     */
    async testConnectivity(testUrl = '/api/v1/health') {
        try {
            await this._executeRequest(testUrl, {
                method: 'GET',
                cache: 'no-cache'
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

/**
 * Enhanced API client with network error handling
 */
export class RobustAPIClient {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.networkHandler = new NetworkErrorHandler(options);
        this.defaultHeaders = options.defaultHeaders || {};
        this.authToken = null;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Make GET request
     */
    async get(endpoint, options = {}) {
        return this._makeRequest('GET', endpoint, null, options);
    }

    /**
     * Make POST request
     */
    async post(endpoint, data, options = {}) {
        return this._makeRequest('POST', endpoint, data, options);
    }

    /**
     * Make PUT request
     */
    async put(endpoint, data, options = {}) {
        return this._makeRequest('PUT', endpoint, data, options);
    }

    /**
     * Make DELETE request
     */
    async delete(endpoint, options = {}) {
        return this._makeRequest('DELETE', endpoint, null, options);
    }

    /**
     * Make PATCH request
     */
    async patch(endpoint, data, options = {}) {
        return this._makeRequest('PATCH', endpoint, data, options);
    }

    /**
     * Make request with error handling
     */
    async _makeRequest(method, endpoint, data, options) {
        const url = `${this.baseURL}${endpoint}`;
        
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.authToken) {
            requestOptions.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add body for non-GET requests
        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        try {
            return await this.networkHandler.makeRequest(url, requestOptions);
        } catch (error) {
            // Add additional context to network errors
            if (error instanceof NetworkError) {
                error.context = {
                    ...error.context,
                    method,
                    endpoint,
                    hasData: !!data
                };
            }
            throw error;
        }
    }

    /**
     * Batch requests with error handling
     */
    async batchRequests(requests) {
        const results = await Promise.allSettled(
            requests.map(request => 
                this._makeRequest(
                    request.method,
                    request.endpoint,
                    request.data,
                    request.options
                )
            )
        );

        return results.map((result, index) => ({
            request: requests[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    /**
     * Get network status
     */
    getNetworkStatus() {
        return this.networkHandler.getNetworkStatus();
    }

    /**
     * Test connectivity
     */
    async testConnectivity() {
        return this.networkHandler.testConnectivity(`${this.baseURL}/health`);
    }

    /**
     * Clear request cache
     */
    clearCache() {
        this.networkHandler.clearCache();
    }
}

export default NetworkErrorHandler;