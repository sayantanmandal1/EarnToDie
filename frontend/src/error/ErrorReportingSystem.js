/**
 * Error Reporting System
 * Collects, aggregates, and reports errors to backend services
 */

export class ErrorReportingSystem {
    constructor(options = {}) {
        this.options = {
            endpoint: options.endpoint || '/api/v1/errors',
            batchSize: options.batchSize || 10,
            flushInterval: options.flushInterval || 30000, // 30 seconds
            maxRetries: options.maxRetries || 3,
            enableLocalStorage: options.enableLocalStorage !== false,
            enableConsoleLogging: options.enableConsoleLogging !== false,
            enableUserFeedback: options.enableUserFeedback !== false,
            privacyMode: options.privacyMode || false,
            ...options
        };

        // Error queue and batching
        this.errorQueue = [];
        this.reportingQueue = [];
        this.flushTimer = null;
        
        // Error aggregation
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        
        // User session info
        this.sessionId = this._generateSessionId();
        this.userId = null;
        this.userAgent = navigator.userAgent;
        this.sessionStartTime = Date.now();
        
        // Reporting state
        this.isReporting = false;
        this.reportingStats = {
            totalErrors: 0,
            reportedErrors: 0,
            failedReports: 0,
            lastReportTime: null
        };

        this._startBatchFlush();
        this._setupStorageCleanup();
    }

    /**
     * Report an error
     */
    reportError(error, context = {}) {
        const errorReport = this._createErrorReport(error, context);
        
        // Add to queue
        this.errorQueue.push(errorReport);
        this.reportingStats.totalErrors++;
        
        // Update aggregation
        this._updateErrorAggregation(errorReport);
        
        // Console logging if enabled
        if (this.options.enableConsoleLogging) {
            console.error('Error reported:', errorReport);
        }
        
        // Store locally if enabled
        if (this.options.enableLocalStorage) {
            this._storeErrorLocally(errorReport);
        }
        
        // Check if immediate flush is needed
        if (this._shouldFlushImmediately(errorReport)) {
            this._flushErrors();
        }
    }

    /**
     * Report multiple errors
     */
    reportErrors(errors) {
        errors.forEach(error => this.reportError(error.error, error.context));
    }

    /**
     * Set user ID for error tracking
     */
    setUserId(userId) {
        this.userId = userId;
    }

    /**
     * Add custom context to all future error reports
     */
    setGlobalContext(context) {
        this.globalContext = { ...this.globalContext, ...context };
    }

    /**
     * Get error statistics
     */
    getStats() {
        return {
            ...this.reportingStats,
            queueSize: this.errorQueue.length,
            sessionId: this.sessionId,
            sessionDuration: Date.now() - this.sessionStartTime,
            topErrors: this._getTopErrors(),
            errorPatterns: Array.from(this.errorPatterns.entries())
        };
    }

    /**
     * Create error report
     */
    _createErrorReport(error, context) {
        const report = {
            id: this._generateErrorId(),
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            
            // Error details
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
            
            // Context
            context: {
                ...this.globalContext,
                ...context
            },
            
            // Environment
            environment: this._captureEnvironment(),
            
            // User interaction
            userActions: this._captureUserActions(),
            
            // Performance metrics
            performance: this._capturePerformanceMetrics(),
            
            // Privacy-filtered data
            sanitized: this.options.privacyMode
        };

        // Apply privacy filtering if enabled
        if (this.options.privacyMode) {
            this._sanitizeReport(report);
        }

        return report;
    }

    /**
     * Capture environment information
     */
    _captureEnvironment() {
        return {
            userAgent: this.userAgent,
            url: window.location.href,
            referrer: document.referrer,
            timestamp: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio
            }
        };
    }

    /**
     * Capture user actions (breadcrumbs)
     */
    _captureUserActions() {
        // This would be populated by user interaction tracking
        return this.userActions || [];
    }

    /**
     * Capture performance metrics
     */
    _capturePerformanceMetrics() {
        const metrics = {};

        // Memory usage
        if (performance.memory) {
            metrics.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }

        // Timing
        if (performance.timing) {
            const timing = performance.timing;
            metrics.timing = {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: timing.responseStart - timing.navigationStart
            };
        }

        // Connection
        if (navigator.connection) {
            metrics.connection = {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            };
        }

        return metrics;
    }

    /**
     * Update error aggregation
     */
    _updateErrorAggregation(errorReport) {
        const key = `${errorReport.type}_${errorReport.message}`;
        const count = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, count + 1);

        // Track error patterns
        const pattern = this._extractErrorPattern(errorReport);
        if (pattern) {
            const patternCount = this.errorPatterns.get(pattern) || 0;
            this.errorPatterns.set(pattern, patternCount + 1);
        }
    }

    /**
     * Extract error pattern for analysis
     */
    _extractErrorPattern(errorReport) {
        // Extract meaningful patterns from stack trace
        if (!errorReport.stack) return null;

        const stackLines = errorReport.stack.split('\n');
        const relevantLines = stackLines
            .filter(line => line.includes('.js:'))
            .slice(0, 3) // Top 3 stack frames
            .map(line => {
                // Extract file and line number
                const match = line.match(/([^/]+\.js):(\d+)/);
                return match ? `${match[1]}:${match[2]}` : line;
            });

        return relevantLines.join(' -> ');
    }

    /**
     * Check if immediate flush is needed
     */
    _shouldFlushImmediately(errorReport) {
        // Flush immediately for critical errors
        const criticalTypes = ['CriticalGameError', 'WebGLContextLostError', 'MemoryError'];
        if (criticalTypes.includes(errorReport.type)) {
            return true;
        }

        // Flush when queue is full
        if (this.errorQueue.length >= this.options.batchSize) {
            return true;
        }

        return false;
    }

    /**
     * Start batch flush timer
     */
    _startBatchFlush() {
        this.flushTimer = setInterval(() => {
            if (this.errorQueue.length > 0) {
                this._flushErrors();
            }
        }, this.options.flushInterval);
    }

    /**
     * Flush errors to server
     */
    async _flushErrors() {
        if (this.isReporting || this.errorQueue.length === 0) {
            return;
        }

        this.isReporting = true;
        const errorsToReport = this.errorQueue.splice(0, this.options.batchSize);
        
        try {
            await this._sendErrorBatch(errorsToReport);
            this.reportingStats.reportedErrors += errorsToReport.length;
            this.reportingStats.lastReportTime = Date.now();
            
            // Remove from local storage on successful report
            if (this.options.enableLocalStorage) {
                this._removeStoredErrors(errorsToReport);
            }
        } catch (error) {
            console.error('Failed to report errors:', error);
            this.reportingStats.failedReports += errorsToReport.length;
            
            // Put errors back in queue for retry
            this.errorQueue.unshift(...errorsToReport);
        } finally {
            this.isReporting = false;
        }
    }

    /**
     * Send error batch to server
     */
    async _sendErrorBatch(errors) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            errors: errors,
            aggregation: {
                errorCounts: Object.fromEntries(this.errorCounts),
                errorPatterns: Object.fromEntries(this.errorPatterns)
            }
        };

        let lastError;
        for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
            try {
                const response = await fetch(this.options.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Wait before retry
                if (attempt < this.options.maxRetries - 1) {
                    await this._sleep(1000 * Math.pow(2, attempt));
                }
            }
        }

        throw lastError;
    }

    /**
     * Store error locally
     */
    _storeErrorLocally(errorReport) {
        try {
            const stored = JSON.parse(localStorage.getItem('zombie_game_error_reports') || '[]');
            stored.push(errorReport);
            
            // Keep only last 50 errors
            if (stored.length > 50) {
                stored.splice(0, stored.length - 50);
            }
            
            localStorage.setItem('zombie_game_error_reports', JSON.stringify(stored));
        } catch (error) {
            console.warn('Failed to store error locally:', error);
        }
    }

    /**
     * Remove stored errors
     */
    _removeStoredErrors(reportedErrors) {
        try {
            const stored = JSON.parse(localStorage.getItem('zombie_game_error_reports') || '[]');
            const reportedIds = new Set(reportedErrors.map(e => e.id));
            
            const remaining = stored.filter(error => !reportedIds.has(error.id));
            localStorage.setItem('zombie_game_error_reports', JSON.stringify(remaining));
        } catch (error) {
            console.warn('Failed to remove stored errors:', error);
        }
    }

    /**
     * Setup storage cleanup
     */
    _setupStorageCleanup() {
        // Clean up old stored errors on startup
        try {
            const stored = JSON.parse(localStorage.getItem('zombie_game_error_reports') || '[]');
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            const recent = stored.filter(error => error.timestamp > oneWeekAgo);
            localStorage.setItem('zombie_game_error_reports', JSON.stringify(recent));
        } catch (error) {
            console.warn('Failed to clean up stored errors:', error);
        }
    }

    /**
     * Get top errors by frequency
     */
    _getTopErrors(limit = 10) {
        return Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([error, count]) => ({ error, count }));
    }

    /**
     * Sanitize report for privacy
     */
    _sanitizeReport(report) {
        // Remove or hash sensitive information
        if (report.environment.url) {
            report.environment.url = this._hashSensitiveData(report.environment.url);
        }
        
        if (report.environment.referrer) {
            report.environment.referrer = this._hashSensitiveData(report.environment.referrer);
        }
        
        // Remove user-specific context
        if (report.context.userId) {
            report.context.userId = this._hashSensitiveData(report.context.userId);
        }
        
        // Sanitize stack trace
        if (report.stack) {
            report.stack = this._sanitizeStackTrace(report.stack);
        }
    }

    /**
     * Hash sensitive data
     */
    _hashSensitiveData(data) {
        // Simple hash for privacy (in production, use proper hashing)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hashed_${Math.abs(hash)}`;
    }

    /**
     * Sanitize stack trace
     */
    _sanitizeStackTrace(stack) {
        return stack
            .split('\n')
            .map(line => {
                // Remove file paths, keep only filenames
                return line.replace(/https?:\/\/[^/]+/g, '').replace(/\/[^/]*\//g, '/');
            })
            .join('\n');
    }

    /**
     * Generate session ID
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate error ID
     */
    _generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show user feedback dialog
     */
    showUserFeedbackDialog(errorReport) {
        if (!this.options.enableUserFeedback) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        overlay.innerHTML = `
            <div style="background: #333; padding: 20px; border-radius: 10px; max-width: 500px;">
                <h3>Help Us Improve</h3>
                <p>An error occurred. Would you like to provide feedback?</p>
                <textarea id="feedback-text" placeholder="What were you doing when this happened?" 
                    style="width: 100%; height: 100px; margin: 10px 0; padding: 10px; border-radius: 5px; border: none;"></textarea>
                <div>
                    <button id="send-feedback" style="
                        padding: 10px 20px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">Send Feedback</button>
                    <button id="skip-feedback" style="
                        padding: 10px 20px;
                        background: #666;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Skip</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('send-feedback').onclick = () => {
            const feedback = document.getElementById('feedback-text').value;
            this._sendUserFeedback(errorReport, feedback);
            document.body.removeChild(overlay);
        };

        document.getElementById('skip-feedback').onclick = () => {
            document.body.removeChild(overlay);
        };
    }

    /**
     * Send user feedback
     */
    async _sendUserFeedback(errorReport, feedback) {
        try {
            await fetch(`${this.options.endpoint}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    errorId: errorReport.id,
                    sessionId: this.sessionId,
                    feedback: feedback,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.warn('Failed to send user feedback:', error);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        // Flush remaining errors
        if (this.errorQueue.length > 0) {
            this._flushErrors();
        }
    }
}

export default ErrorReportingSystem;