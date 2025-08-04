/**
 * Professional Game Features
 * Advanced game features including recording, replay, tutorial, and accessibility
 */
class ProfessionalGameFeatures {
    constructor(config = {}) {
        this.config = {
            // Feature toggles
            enableScreenshotCapture: true,
            enableVideoRecording: true,
            enableReplaySystem: true,
            enableTutorialSystem: true,
            enableAccessibilityFeatures: true,
            
            // Screenshot settings
            screenshotFormat: 'png', // 'png', 'jpeg', 'webp'
            screenshotQuality: 0.9,
            screenshotPath: 'screenshots',
            
            // Video recording settings
            videoFormat: 'webm', // 'webm', 'mp4'
            videoQuality: 'high', // 'low', 'medium', 'high', 'ultra'
            videoFrameRate: 60,
            videoBitrate: 8000, // kbps
            maxRecordingDuration: 300, // 5 minutes
            
            // Replay system settings
            replayBufferSize: 1000, // Number of frames to keep
            replayCompressionLevel: 5,
            maxReplayDuration: 180, // 3 minutes
            replayAutoSave: true,
            
            // Tutorial system settings
            tutorialAutoStart: true,
            tutorialSkippable: true,
            tutorialProgressSave: true,
            tutorialHighlightColor: '#ffff00',
            
            // Accessibility settings
            enableColorBlindSupport: true,
            enableHighContrast: true,
            enableLargeText: true,
            enableAudioCues: true,
            enableSubtitles: true,
            enableReducedMotion: true,
            
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // Feature components
        this.screenshotCapture = null;
        this.videoRecorder = null;
        this.replaySystem = null;
        this.tutorialSystem = null;
        this.accessibilityManager = null;
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }

    /**
     * Initialize professional game features
     */
    async initialize() {
        console.log('Initializing Professional Game Features...');
        
        try {
            // Initialize screenshot capture
            if (this.config.enableScreenshotCapture) {
                await this.initializeScreenshotCapture();
            }
            
            // Initialize video recording
            if (this.config.enableVideoRecording) {
                await this.initializeVideoRecording();
            }
            
            // Initialize replay system
            if (this.config.enableReplaySystem) {
                await this.initializeReplaySystem();
            }
            
            // Initialize tutorial system
            if (this.config.enableTutorialSystem) {
                await this.initializeTutorialSystem();
            }
            
            // Initialize accessibility features
            if (this.config.enableAccessibilityFeatures) {
                await this.initializeAccessibilityFeatures();
            }
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            console.log('Professional Game Features initialized');
            this.emit('initialized', {
                features: this.getEnabledFeatures(),
                config: this.config
            });
            
        } catch (error) {
            console.error('Failed to initialize Professional Game Features:', error);
            throw error;
        }
    }

    /**
     * Initialize screenshot capture system
     */
    async initializeScreenshotCapture() {
        console.log('Initializing screenshot capture system...');
        
        this.screenshotCapture = new ScreenshotCapture({
            format: this.config.screenshotFormat,
            quality: this.config.screenshotQuality,
            outputPath: this.config.screenshotPath,
            debugMode: this.config.debugMode
        });
        
        await this.screenshotCapture.initialize();
        console.log('Screenshot capture system initialized');
    }

    /**
     * Initialize video recording system
     */
    async initializeVideoRecording() {
        console.log('Initializing video recording system...');
        
        this.videoRecorder = new VideoRecorder({
            format: this.config.videoFormat,
            quality: this.config.videoQuality,
            frameRate: this.config.videoFrameRate,
            bitrate: this.config.videoBitrate,
            maxDuration: this.config.maxRecordingDuration,
            debugMode: this.config.debugMode
        });
        
        await this.videoRecorder.initialize();
        console.log('Video recording system initialized');
    }

    /**
     * Initialize replay system
     */
    async initializeReplaySystem() {
        console.log('Initializing replay system...');
        
        this.replaySystem = new ReplaySystem({
            bufferSize: this.config.replayBufferSize,
            compressionLevel: this.config.replayCompressionLevel,
            maxDuration: this.config.maxReplayDuration,
            autoSave: this.config.replayAutoSave,
            debugMode: this.config.debugMode
        });
        
        await this.replaySystem.initialize();
        console.log('Replay system initialized');
    }

    /**
     * Initialize tutorial system
     */
    async initializeTutorialSystem() {
        console.log('Initializing tutorial system...');
        
        this.tutorialSystem = new TutorialSystem({
            autoStart: this.config.tutorialAutoStart,
            skippable: this.config.tutorialSkippable,
            progressSave: this.config.tutorialProgressSave,
            highlightColor: this.config.tutorialHighlightColor,
            debugMode: this.config.debugMode
        });
        
        await this.tutorialSystem.initialize();
        console.log('Tutorial system initialized');
    }

    /**
     * Initialize accessibility features
     */
    async initializeAccessibilityFeatures() {
        console.log('Initializing accessibility features...');
        
        this.accessibilityManager = new AccessibilityManager({
            colorBlindSupport: this.config.enableColorBlindSupport,
            highContrast: this.config.enableHighContrast,
            largeText: this.config.enableLargeText,
            audioCues: this.config.enableAudioCues,
            subtitles: this.config.enableSubtitles,
            reducedMotion: this.config.enableReducedMotion,
            debugMode: this.config.debugMode
        });
        
        await this.accessibilityManager.initialize();
        console.log('Accessibility features initialized');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        console.log('Setting up keyboard shortcuts...');
        
        // Screenshot shortcuts
        if (this.screenshotCapture) {
            this.addKeyboardShortcut('F12', () => this.takeScreenshot());
            this.addKeyboardShortcut('Ctrl+F12', () => this.takeScreenshot(true)); // Full screen
        }
        
        // Video recording shortcuts
        if (this.videoRecorder) {
            this.addKeyboardShortcut('F9', () => this.toggleVideoRecording());
            this.addKeyboardShortcut('Shift+F9', () => this.stopVideoRecording());
        }
        
        // Replay shortcuts
        if (this.replaySystem) {
            this.addKeyboardShortcut('F10', () => this.saveReplay());
            this.addKeyboardShortcut('Ctrl+F10', () => this.playLastReplay());
        }
        
        // Tutorial shortcuts
        if (this.tutorialSystem) {
            this.addKeyboardShortcut('F1', () => this.showTutorial());
            this.addKeyboardShortcut('Escape', () => this.hideTutorial());
        }
        
        // Accessibility shortcuts
        if (this.accessibilityManager) {
            this.addKeyboardShortcut('Ctrl+Alt+H', () => this.toggleHighContrast());
            this.addKeyboardShortcut('Ctrl+Alt+T', () => this.toggleLargeText());
        }
        
        console.log('Keyboard shortcuts configured');
    }

    /**
     * Take screenshot
     */
    async takeScreenshot(fullScreen = false) {
        if (!this.screenshotCapture) {
            console.warn('Screenshot capture not available');
            return null;
        }

        try {
            console.log('Taking screenshot...');
            const screenshot = await this.screenshotCapture.capture(fullScreen);
            
            this.emit('screenshotTaken', {
                filename: screenshot.filename,
                path: screenshot.path,
                size: screenshot.size,
                timestamp: screenshot.timestamp
            });
            
            // Show notification
            this.showNotification('Screenshot saved!', `Saved as ${screenshot.filename}`);
            
            return screenshot;
            
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            this.showNotification('Screenshot failed', error.message, 'error');
            throw error;
        }
    }

    /**
     * Toggle video recording
     */
    async toggleVideoRecording() {
        if (!this.videoRecorder) {
            console.warn('Video recording not available');
            return;
        }

        try {
            if (this.videoRecorder.isRecording()) {
                await this.stopVideoRecording();
            } else {
                await this.startVideoRecording();
            }
        } catch (error) {
            console.error('Failed to toggle video recording:', error);
            this.showNotification('Recording error', error.message, 'error');
        }
    }

    /**
     * Start video recording
     */
    async startVideoRecording() {
        if (!this.videoRecorder) {
            console.warn('Video recording not available');
            return;
        }

        try {
            console.log('Starting video recording...');
            const recording = await this.videoRecorder.startRecording();
            
            this.emit('recordingStarted', {
                id: recording.id,
                timestamp: recording.timestamp,
                settings: recording.settings
            });
            
            this.showNotification('Recording started', 'Video recording in progress...');
            
            return recording;
            
        } catch (error) {
            console.error('Failed to start video recording:', error);
            this.showNotification('Recording failed', error.message, 'error');
            throw error;
        }
    }

    /**
     * Stop video recording
     */
    async stopVideoRecording() {
        if (!this.videoRecorder) {
            console.warn('Video recording not available');
            return;
        }

        try {
            console.log('Stopping video recording...');
            const recording = await this.videoRecorder.stopRecording();
            
            this.emit('recordingStopped', {
                filename: recording.filename,
                path: recording.path,
                duration: recording.duration,
                size: recording.size
            });
            
            this.showNotification('Recording saved!', `Saved as ${recording.filename}`);
            
            return recording;
            
        } catch (error) {
            console.error('Failed to stop video recording:', error);
            this.showNotification('Recording error', error.message, 'error');
            throw error;
        }
    }

    /**
     * Save replay
     */
    async saveReplay(name = null) {
        if (!this.replaySystem) {
            console.warn('Replay system not available');
            return null;
        }

        try {
            console.log('Saving replay...');
            const replay = await this.replaySystem.saveReplay(name);
            
            this.emit('replaySaved', {
                filename: replay.filename,
                path: replay.path,
                duration: replay.duration,
                frames: replay.frames
            });
            
            this.showNotification('Replay saved!', `Saved as ${replay.filename}`);
            
            return replay;
            
        } catch (error) {
            console.error('Failed to save replay:', error);
            this.showNotification('Replay error', error.message, 'error');
            throw error;
        }
    }

    /**
     * Play last replay
     */
    async playLastReplay() {
        if (!this.replaySystem) {
            console.warn('Replay system not available');
            return;
        }

        try {
            console.log('Playing last replay...');
            const replay = await this.replaySystem.playLastReplay();
            
            this.emit('replayStarted', {
                filename: replay.filename,
                duration: replay.duration
            });
            
            return replay;
            
        } catch (error) {
            console.error('Failed to play replay:', error);
            this.showNotification('Replay error', error.message, 'error');
            throw error;
        }
    }

    /**
     * Show tutorial
     */
    async showTutorial(tutorialId = 'main') {
        if (!this.tutorialSystem) {
            console.warn('Tutorial system not available');
            return;
        }

        try {
            console.log(`Starting tutorial: ${tutorialId}`);
            await this.tutorialSystem.startTutorial(tutorialId);
            
            this.emit('tutorialStarted', {
                tutorialId,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Failed to show tutorial:', error);
            throw error;
        }
    }

    /**
     * Hide tutorial
     */
    async hideTutorial() {
        if (!this.tutorialSystem) {
            console.warn('Tutorial system not available');
            return;
        }

        try {
            console.log('Hiding tutorial...');
            await this.tutorialSystem.hideTutorial();
            
            this.emit('tutorialHidden', {
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Failed to hide tutorial:', error);
            throw error;
        }
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        if (!this.accessibilityManager) {
            console.warn('Accessibility manager not available');
            return;
        }

        try {
            const enabled = this.accessibilityManager.toggleHighContrast();
            this.showNotification(
                'High Contrast',
                enabled ? 'High contrast enabled' : 'High contrast disabled'
            );
            
            this.emit('accessibilityChanged', {
                feature: 'highContrast',
                enabled
            });
            
        } catch (error) {
            console.error('Failed to toggle high contrast:', error);
        }
    }

    /**
     * Toggle large text mode
     */
    toggleLargeText() {
        if (!this.accessibilityManager) {
            console.warn('Accessibility manager not available');
            return;
        }

        try {
            const enabled = this.accessibilityManager.toggleLargeText();
            this.showNotification(
                'Large Text',
                enabled ? 'Large text enabled' : 'Large text disabled'
            );
            
            this.emit('accessibilityChanged', {
                feature: 'largeText',
                enabled
            });
            
        } catch (error) {
            console.error('Failed to toggle large text:', error);
        }
    }

    /**
     * Add keyboard shortcut
     */
    addKeyboardShortcut(keys, callback) {
        document.addEventListener('keydown', (event) => {
            if (this.matchesShortcut(event, keys)) {
                event.preventDefault();
                callback();
            }
        });
    }

    /**
     * Check if event matches shortcut
     */
    matchesShortcut(event, keys) {
        const keyParts = keys.toLowerCase().split('+');
        const eventKeys = [];
        
        if (event.ctrlKey) eventKeys.push('ctrl');
        if (event.altKey) eventKeys.push('alt');
        if (event.shiftKey) eventKeys.push('shift');
        eventKeys.push(event.key.toLowerCase());
        
        return keyParts.every(key => eventKeys.includes(key)) && 
               keyParts.length === eventKeys.length;
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `game-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        // Emit notification event
        this.emit('notificationShown', {
            title,
            message,
            type,
            timestamp: Date.now()
        });
    }

    /**
     * Get enabled features
     */
    getEnabledFeatures() {
        return {
            screenshotCapture: !!this.screenshotCapture,
            videoRecording: !!this.videoRecorder,
            replaySystem: !!this.replaySystem,
            tutorialSystem: !!this.tutorialSystem,
            accessibilityFeatures: !!this.accessibilityManager
        };
    }

    /**
     * Get feature statistics
     */
    getFeatureStatistics() {
        const stats = {
            screenshots: {
                taken: 0,
                totalSize: 0
            },
            recordings: {
                created: 0,
                totalDuration: 0,
                totalSize: 0
            },
            replays: {
                saved: 0,
                played: 0
            },
            tutorials: {
                started: 0,
                completed: 0
            },
            accessibility: {
                featuresUsed: 0,
                activeFeatures: []
            }
        };

        // Collect statistics from each system
        if (this.screenshotCapture) {
            Object.assign(stats.screenshots, this.screenshotCapture.getStatistics());
        }
        
        if (this.videoRecorder) {
            Object.assign(stats.recordings, this.videoRecorder.getStatistics());
        }
        
        if (this.replaySystem) {
            Object.assign(stats.replays, this.replaySystem.getStatistics());
        }
        
        if (this.tutorialSystem) {
            Object.assign(stats.tutorials, this.tutorialSystem.getStatistics());
        }
        
        if (this.accessibilityManager) {
            Object.assign(stats.accessibility, this.accessibilityManager.getStatistics());
        }

        return stats;
    }

    /**
     * Export user settings
     */
    exportSettings() {
        const settings = {
            features: this.config,
            accessibility: this.accessibilityManager?.getSettings() || {},
            tutorial: this.tutorialSystem?.getProgress() || {},
            shortcuts: this.getKeyboardShortcuts()
        };

        return settings;
    }

    /**
     * Import user settings
     */
    importSettings(settings) {
        try {
            // Apply feature settings
            if (settings.features) {
                Object.assign(this.config, settings.features);
            }
            
            // Apply accessibility settings
            if (settings.accessibility && this.accessibilityManager) {
                this.accessibilityManager.applySettings(settings.accessibility);
            }
            
            // Apply tutorial progress
            if (settings.tutorial && this.tutorialSystem) {
                this.tutorialSystem.setProgress(settings.tutorial);
            }
            
            console.log('Settings imported successfully');
            this.emit('settingsImported', settings);
            
        } catch (error) {
            console.error('Failed to import settings:', error);
            throw error;
        }
    }

    /**
     * Get keyboard shortcuts
     */
    getKeyboardShortcuts() {
        return {
            screenshot: 'F12',
            screenshotFullScreen: 'Ctrl+F12',
            toggleRecording: 'F9',
            stopRecording: 'Shift+F9',
            saveReplay: 'F10',
            playReplay: 'Ctrl+F10',
            showTutorial: 'F1',
            hideTutorial: 'Escape',
            toggleHighContrast: 'Ctrl+Alt+H',
            toggleLargeText: 'Ctrl+Alt+T'
        };
    }

    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('Cleaning up Professional Game Features...');
        
        // Cleanup individual systems
        if (this.screenshotCapture) {
            await this.screenshotCapture.cleanup();
        }
        
        if (this.videoRecorder) {
            await this.videoRecorder.cleanup();
        }
        
        if (this.replaySystem) {
            await this.replaySystem.cleanup();
        }
        
        if (this.tutorialSystem) {
            await this.tutorialSystem.cleanup();
        }
        
        if (this.accessibilityManager) {
            await this.accessibilityManager.cleanup();
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        console.log('Professional Game Features cleanup completed');
    }
}

/**
 * Screenshot Capture System
 */
class ScreenshotCapture {
    constructor(config) {
        this.config = config;
        this.statistics = {
            taken: 0,
            totalSize: 0
        };
    }

    async initialize() {
        console.log('Screenshot capture system ready');
    }

    async capture(fullScreen = false) {
        // Mock screenshot capture
        await this.delay(100);
        
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.${this.config.format}`;
        const size = Math.floor(Math.random() * 2000000) + 500000; // 0.5-2.5MB
        
        const screenshot = {
            filename,
            path: `${this.config.outputPath}/${filename}`,
            size,
            timestamp,
            fullScreen,
            format: this.config.format,
            quality: this.config.quality
        };
        
        // Update statistics
        this.statistics.taken++;
        this.statistics.totalSize += size;
        
        console.log(`Screenshot captured: ${filename}`);
        return screenshot;
    }

    getStatistics() {
        return { ...this.statistics };
    }

    async cleanup() {
        console.log('Screenshot capture cleanup completed');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Video Recorder System
 */
class VideoRecorder {
    constructor(config) {
        this.config = config;
        this.recording = false;
        this.currentRecording = null;
        this.statistics = {
            created: 0,
            totalDuration: 0,
            totalSize: 0
        };
    }

    async initialize() {
        console.log('Video recorder system ready');
    }

    isRecording() {
        return this.recording;
    }

    async startRecording() {
        if (this.recording) {
            throw new Error('Recording already in progress');
        }
        
        const timestamp = Date.now();
        this.currentRecording = {
            id: `recording_${timestamp}`,
            timestamp,
            startTime: timestamp,
            settings: {
                format: this.config.format,
                quality: this.config.quality,
                frameRate: this.config.frameRate,
                bitrate: this.config.bitrate
            }
        };
        
        this.recording = true;
        console.log(`Video recording started: ${this.currentRecording.id}`);
        
        return this.currentRecording;
    }

    async stopRecording() {
        if (!this.recording || !this.currentRecording) {
            throw new Error('No recording in progress');
        }
        
        const endTime = Date.now();
        const duration = endTime - this.currentRecording.startTime;
        const filename = `${this.currentRecording.id}.${this.config.format}`;
        const size = Math.floor((duration / 1000) * (this.config.bitrate * 125)); // Approximate size
        
        const recording = {
            ...this.currentRecording,
            filename,
            path: `videos/${filename}`,
            duration,
            size,
            endTime
        };
        
        // Update statistics
        this.statistics.created++;
        this.statistics.totalDuration += duration;
        this.statistics.totalSize += size;
        
        this.recording = false;
        this.currentRecording = null;
        
        console.log(`Video recording completed: ${filename}`);
        return recording;
    }

    getStatistics() {
        return { ...this.statistics };
    }

    async cleanup() {
        if (this.recording) {
            await this.stopRecording();
        }
        console.log('Video recorder cleanup completed');
    }
}

/**
 * Replay System
 */
class ReplaySystem {
    constructor(config) {
        this.config = config;
        this.buffer = [];
        this.replays = [];
        this.statistics = {
            saved: 0,
            played: 0
        };
    }

    async initialize() {
        console.log('Replay system ready');
    }

    recordFrame(gameState) {
        // Add frame to buffer
        this.buffer.push({
            timestamp: Date.now(),
            state: gameState
        });
        
        // Maintain buffer size
        if (this.buffer.length > this.config.bufferSize) {
            this.buffer.shift();
        }
    }

    async saveReplay(name = null) {
        if (this.buffer.length === 0) {
            throw new Error('No replay data available');
        }
        
        const timestamp = Date.now();
        const filename = name || `replay_${timestamp}`;
        const duration = this.buffer[this.buffer.length - 1].timestamp - this.buffer[0].timestamp;
        
        const replay = {
            filename: `${filename}.replay`,
            path: `replays/${filename}.replay`,
            timestamp,
            duration,
            frames: this.buffer.length,
            data: [...this.buffer] // Copy buffer
        };
        
        this.replays.push(replay);
        this.statistics.saved++;
        
        console.log(`Replay saved: ${replay.filename}`);
        return replay;
    }

    async playLastReplay() {
        if (this.replays.length === 0) {
            throw new Error('No replays available');
        }
        
        const replay = this.replays[this.replays.length - 1];
        this.statistics.played++;
        
        console.log(`Playing replay: ${replay.filename}`);
        return replay;
    }

    getStatistics() {
        return { ...this.statistics };
    }

    async cleanup() {
        this.buffer = [];
        console.log('Replay system cleanup completed');
    }
}

/**
 * Tutorial System
 */
class TutorialSystem {
    constructor(config) {
        this.config = config;
        this.currentTutorial = null;
        this.progress = {};
        this.statistics = {
            started: 0,
            completed: 0
        };
    }

    async initialize() {
        console.log('Tutorial system ready');
    }

    async startTutorial(tutorialId) {
        this.currentTutorial = {
            id: tutorialId,
            startTime: Date.now(),
            currentStep: 0,
            steps: this.getTutorialSteps(tutorialId)
        };
        
        this.statistics.started++;
        console.log(`Tutorial started: ${tutorialId}`);
    }

    async hideTutorial() {
        if (this.currentTutorial) {
            console.log(`Tutorial hidden: ${this.currentTutorial.id}`);
            this.currentTutorial = null;
        }
    }

    getTutorialSteps(tutorialId) {
        const tutorials = {
            main: [
                { title: 'Welcome', content: 'Welcome to Zombie Car Game!' },
                { title: 'Controls', content: 'Use WASD to drive your vehicle' },
                { title: 'Combat', content: 'Ram into zombies to eliminate them' },
                { title: 'Upgrades', content: 'Visit the garage to upgrade your vehicle' }
            ],
            driving: [
                { title: 'Acceleration', content: 'Press W to accelerate' },
                { title: 'Steering', content: 'Use A and D to steer' },
                { title: 'Braking', content: 'Press S to brake or reverse' }
            ],
            combat: [
                { title: 'Ramming', content: 'Drive into zombies to eliminate them' },
                { title: 'Combos', content: 'Chain kills for bonus points' },
                { title: 'Boss Zombies', content: 'Some zombies require multiple hits' }
            ]
        };
        
        return tutorials[tutorialId] || tutorials.main;
    }

    getProgress() {
        return { ...this.progress };
    }

    setProgress(progress) {
        this.progress = { ...progress };
    }

    getStatistics() {
        return { ...this.statistics };
    }

    async cleanup() {
        this.currentTutorial = null;
        console.log('Tutorial system cleanup completed');
    }
}

/**
 * Accessibility Manager
 */
class AccessibilityManager {
    constructor(config) {
        this.config = config;
        this.settings = {
            highContrast: false,
            largeText: false,
            colorBlindMode: 'none',
            audioCues: true,
            subtitles: true,
            reducedMotion: false
        };
        this.statistics = {
            featuresUsed: 0,
            activeFeatures: []
        };
    }

    async initialize() {
        console.log('Accessibility manager ready');
        this.applyAccessibilityStyles();
    }

    toggleHighContrast() {
        this.settings.highContrast = !this.settings.highContrast;
        this.applyAccessibilityStyles();
        this.updateStatistics('highContrast', this.settings.highContrast);
        return this.settings.highContrast;
    }

    toggleLargeText() {
        this.settings.largeText = !this.settings.largeText;
        this.applyAccessibilityStyles();
        this.updateStatistics('largeText', this.settings.largeText);
        return this.settings.largeText;
    }

    applyAccessibilityStyles() {
        const body = document.body;
        
        // High contrast
        if (this.settings.highContrast) {
            body.classList.add('high-contrast');
        } else {
            body.classList.remove('high-contrast');
        }
        
        // Large text
        if (this.settings.largeText) {
            body.classList.add('large-text');
        } else {
            body.classList.remove('large-text');
        }
        
        // Reduced motion
        if (this.settings.reducedMotion) {
            body.classList.add('reduced-motion');
        } else {
            body.classList.remove('reduced-motion');
        }
    }

    updateStatistics(feature, enabled) {
        if (enabled && !this.statistics.activeFeatures.includes(feature)) {
            this.statistics.activeFeatures.push(feature);
            this.statistics.featuresUsed++;
        } else if (!enabled && this.statistics.activeFeatures.includes(feature)) {
            this.statistics.activeFeatures = this.statistics.activeFeatures.filter(f => f !== feature);
        }
    }

    getSettings() {
        return { ...this.settings };
    }

    applySettings(settings) {
        Object.assign(this.settings, settings);
        this.applyAccessibilityStyles();
    }

    getStatistics() {
        return { ...this.statistics };
    }

    async cleanup() {
        // Remove accessibility classes
        const body = document.body;
        body.classList.remove('high-contrast', 'large-text', 'reduced-motion');
        console.log('Accessibility manager cleanup completed');
    }
}

export default ProfessionalGameFeatures;