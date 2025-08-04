/**
 * Telemetry and Analytics System
 * Collects anonymous usage data and performance metrics
 */

class TelemetrySystem {
    constructor() {
        this.enabled = false;
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.events = [];
        this.batchSize = 50;
        this.flushInterval = 30000; // 30 seconds
        this.endpoint = 'https://analytics.zombiecargame.com/api/events';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        this.sessionStartTime = Date.now();
        this.lastActivityTime = Date.now();
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            // Check user consent
            this.enabled = await this.checkUserConsent();
            
            if (this.enabled) {
                this.startSession();
                this.setupEventListeners();
                this.startPeriodicFlush();
                console.log('Telemetry system initialized');
            } else {
                console.log('Telemetry disabled by user preference');
            }
        } catch (error) {
            console.error('Failed to initialize telemetry system:', error);
            this.enabled = false;
        }
    }

    async checkUserConsent() {
        try {
            // Check stored user preference
            const consent = localStorage.getItem('telemetry_consent');
            if (consent !== null) {
                return consent === 'true';
            }

            // Show consent dialog for new users
            return await this.showConsentDialog();
        } catch (error) {
            console.error('Error checking user consent:', error);
            return false; // Default to disabled
        }
    }

    async showConsentDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'telemetry-consent-dialog';
            dialog.innerHTML = `
                <div class="consent-overlay">
                    <div class="consent-modal">
                        <h3>Help Improve Zombie Car Game</h3>
                        <p>We'd like to collect anonymous usage data to help improve the game experience. This includes:</p>
                        <ul>
                            <li>Performance metrics and crash reports</li>
                            <li>Feature usage statistics</li>
                            <li>General gameplay patterns</li>
                        </ul>
                        <p><strong>We do NOT collect:</strong></p>
                        <ul>
                            <li>Personal information</li>
                            <li>Save game data</li>
                            <li>Screenshots or recordings</li>
                        </ul>
                        <p>You can change this setting anytime in the game options.</p>
                        <div class="consent-buttons">
                            <button id="consent-allow">Allow Analytics</button>
                            <button id="consent-deny">No Thanks</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            document.getElementById('consent-allow').onclick = () => {
                localStorage.setItem('telemetry_consent', 'true');
                document.body.removeChild(dialog);
                resolve(true);
            };

            document.getElementById('consent-deny').onclick = () => {
                localStorage.setItem('telemetry_consent', 'false');
                document.body.removeChild(dialog);
                resolve(false);
            };
        });
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        let userId = localStorage.getItem('anonymous_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('anonymous_user_id', userId);
        }
        return userId;
    }

    startSession() {
        this.trackEvent('session_start', {
            platform: this.getPlatform(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            user_agent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            game_version: this.getGameVersion()
        });
    }

    setupEventListeners() {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('session_pause');
            } else {
                this.trackEvent('session_resume');
                this.lastActivityTime = Date.now();
            }
        });

        // Track window focus/blur
        window.addEventListener('focus', () => {
            this.trackEvent('window_focus');
            this.lastActivityTime = Date.now();
        });

        window.addEventListener('blur', () => {
            this.trackEvent('window_blur');
        });

        // Track errors
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error ? event.error.stack : null
            });
        });

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('unhandled_promise_rejection', {
                reason: event.reason ? event.reason.toString() : 'Unknown',
                stack: event.reason && event.reason.stack ? event.reason.stack : null
            });
        });

        // Track beforeunload for session end
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });
    }

    trackEvent(eventName, properties = {}) {
        if (!this.enabled) return;

        const event = {
            event_name: eventName,
            timestamp: Date.now(),
            session_id: this.sessionId,
            user_id: this.userId,
            properties: {
                ...properties,
                session_duration: Date.now() - this.sessionStartTime,
                time_since_last_activity: Date.now() - this.lastActivityTime
            }
        };

        this.events.push(event);
        this.lastActivityTime = Date.now();

        // Flush if batch is full
        if (this.events.length >= this.batchSize) {
            this.flushEvents();
        }
    }

    trackError(errorType, errorData) {
        if (!this.enabled) return;

        this.trackEvent('error_occurred', {
            error_type: errorType,
            error_data: errorData,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        // Immediately flush error events
        this.flushEvents();
    }

    trackPerformance(metricName, value, unit = 'ms') {
        if (!this.enabled) return;

        this.trackEvent('performance_metric', {
            metric_name: metricName,
            value: value,
            unit: unit,
            timestamp: Date.now()
        });
    }

    trackGameplayEvent(eventType, gameData) {
        if (!this.enabled) return;

        this.trackEvent('gameplay_event', {
            event_type: eventType,
            game_data: gameData,
            timestamp: Date.now()
        });
    }

    trackFeatureUsage(featureName, usageData = {}) {
        if (!this.enabled) return;

        this.trackEvent('feature_usage', {
            feature_name: featureName,
            usage_data: usageData,
            timestamp: Date.now()
        });
    }

    trackUserAction(actionType, actionData = {}) {
        if (!this.enabled) return;

        this.trackEvent('user_action', {
            action_type: actionType,
            action_data: actionData,
            timestamp: Date.now()
        });
    }

    async flushEvents() {
        if (!this.enabled || this.events.length === 0) return;

        const eventsToSend = [...this.events];
        this.events = [];

        try {
            await this.sendEvents(eventsToSend);
        } catch (error) {
            console.error('Failed to send telemetry events:', error);
            // Re-add events to queue for retry (up to a limit)
            if (this.events.length < 1000) {
                this.events.unshift(...eventsToSend);
            }
        }
    }

    async sendEvents(events, attempt = 1) {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `ZombieCarGame/${this.getGameVersion()}`
                },
                body: JSON.stringify({
                    events: events,
                    client_info: {
                        game_version: this.getGameVersion(),
                        platform: this.getPlatform(),
                        timestamp: Date.now()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`Sent ${events.length} telemetry events`);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`Retrying telemetry send (attempt ${attempt + 1}/${this.retryAttempts})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.sendEvents(events, attempt + 1);
            } else {
                throw error;
            }
        }
    }

    startPeriodicFlush() {
        setInterval(() => {
            this.flushEvents();
        }, this.flushInterval);
    }

    endSession() {
        if (!this.enabled) return;

        const sessionDuration = Date.now() - this.sessionStartTime;
        this.trackEvent('session_end', {
            session_duration: sessionDuration,
            events_sent: this.events.length
        });

        // Force flush remaining events
        this.flushEvents();
    }

    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('electron')) return 'desktop';
        if (userAgent.includes('mobile')) return 'mobile';
        if (userAgent.includes('tablet')) return 'tablet';
        return 'web';
    }

    getGameVersion() {
        // This would be injected during build process
        return window.GAME_VERSION || '1.0.0';
    }

    // Public API for game systems
    enable() {
        this.enabled = true;
        localStorage.setItem('telemetry_consent', 'true');
        this.startSession();
        console.log('Telemetry enabled');
    }

    disable() {
        this.enabled = false;
        localStorage.setItem('telemetry_consent', 'false');
        this.events = []; // Clear pending events
        console.log('Telemetry disabled');
    }

    isEnabled() {
        return this.enabled;
    }

    // Game-specific tracking methods
    trackLevelStart(levelData) {
        this.trackGameplayEvent('level_start', levelData);
    }

    trackLevelComplete(levelData, completionStats) {
        this.trackGameplayEvent('level_complete', {
            ...levelData,
            completion_stats: completionStats
        });
    }

    trackVehicleUpgrade(upgradeData) {
        this.trackGameplayEvent('vehicle_upgrade', upgradeData);
    }

    trackCrash(crashData) {
        this.trackError('game_crash', crashData);
    }

    trackLoadTime(loadType, duration) {
        this.trackPerformance(`${loadType}_load_time`, duration);
    }

    trackFPS(averageFPS, minFPS, maxFPS) {
        this.trackPerformance('fps_metrics', {
            average: averageFPS,
            min: minFPS,
            max: maxFPS
        });
    }

    trackMemoryUsage(memoryData) {
        this.trackPerformance('memory_usage', memoryData);
    }

    // A/B Testing support
    trackExperiment(experimentName, variant, outcome = null) {
        this.trackEvent('experiment_event', {
            experiment_name: experimentName,
            variant: variant,
            outcome: outcome
        });
    }

    // Custom event tracking
    track(eventName, properties = {}) {
        this.trackEvent(eventName, properties);
    }
}

// CSS for consent dialog
const consentDialogCSS = `
.telemetry-consent-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
}

.consent-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
}

.consent-modal {
    background: #2a2a2a;
    color: #ffffff;
    padding: 30px;
    border-radius: 10px;
    max-width: 500px;
    margin: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.consent-modal h3 {
    margin-top: 0;
    color: #ff6b35;
    font-size: 24px;
}

.consent-modal ul {
    margin: 15px 0;
    padding-left: 20px;
}

.consent-modal li {
    margin: 5px 0;
}

.consent-buttons {
    display: flex;
    gap: 15px;
    margin-top: 25px;
    justify-content: center;
}

.consent-buttons button {
    padding: 12px 24px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
}

#consent-allow {
    background: #ff6b35;
    color: white;
}

#consent-allow:hover {
    background: #e55a2b;
}

#consent-deny {
    background: #666;
    color: white;
}

#consent-deny:hover {
    background: #555;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = consentDialogCSS;
document.head.appendChild(style);

// Create global instance
window.telemetry = new TelemetrySystem();

export default TelemetrySystem;