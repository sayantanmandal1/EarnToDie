/**
 * Asset Integrity Integration System
 * Integrates all asset verification, repair, and update systems
 */
import AssetVerificationSystem from './AssetVerificationSystem.js';
import AssetUpdateManager from './AssetUpdateManager.js';

class AssetIntegrityIntegration {
    constructor(assetManager, config = {}) {
        this.assetManager = assetManager;
        
        // Configuration
        this.config = {
            enableVerification: true,
            enableAutoRepair: true,
            enableAutoUpdate: false,
            enableStartupCheck: true,
            enablePeriodicCheck: true,
            startupTimeout: 30000, // 30 seconds
            reportingEndpoint: '/api/assets/integrity-report',
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // System components
        this.verificationSystem = null;
        this.updateManager = null;
        
        // State tracking
        this.initialized = false;
        this.startupCheckCompleted = false;
        this.lastIntegrityReport = null;
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Metrics
        this.metrics = {
            startupTime: 0,
            totalChecks: 0,
            failedChecks: 0,
            repairedAssets: 0,
            updatedAssets: 0,
            criticalErrors: 0
        };

        this.initialize();
    }

    /**
     * Initialize asset integrity system
     */
    async initialize() {
        console.log('Initializing Asset Integrity Integration...');
        const startTime = Date.now();

        try {
            // Initialize verification system
            await this.initializeVerificationSystem();
            
            // Initialize update manager
            await this.initializeUpdateManager();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Perform startup integrity check
            if (this.config.enableStartupCheck) {
                await this.performStartupIntegrityCheck();
            }
            
            this.initialized = true;
            this.metrics.startupTime = Date.now() - startTime;
            
            console.log(`Asset Integrity Integration initialized in ${this.metrics.startupTime}ms`);
            
            // Emit initialization complete event
            this.emit('initialized', {
                startupTime: this.metrics.startupTime,
                verificationEnabled: this.config.enableVerification,
                autoRepairEnabled: this.config.enableAutoRepair,
                autoUpdateEnabled: this.config.enableAutoUpdate
            });
            
        } catch (error) {
            console.error('Failed to initialize Asset Integrity Integration:', error);
            this.metrics.criticalErrors++;
            throw error;
        }
    }

    /**
     * Initialize verification system
     */
    async initializeVerificationSystem() {
        console.log('Initializing asset verification system...');
        
        this.verificationSystem = new AssetVerificationSystem(this.assetManager, {
            enableVerification: this.config.enableVerification,
            enableAutoRepair: this.config.enableAutoRepair,
            debugMode: this.config.debugMode
        });

        // Listen to verification events
        this.verificationSystem.addEventListener?.('assetCorrupted', (event) => {
            this.handleAssetCorruption(event.detail);
        });

        this.verificationSystem.addEventListener?.('assetRepaired', (event) => {
            this.handleAssetRepair(event.detail);
        });

        console.log('Asset verification system initialized');
    }

    /**
     * Initialize update manager
     */
    async initializeUpdateManager() {
        console.log('Initializing asset update manager...');
        
        this.updateManager = new AssetUpdateManager(this.verificationSystem, {
            enableAutoUpdate: this.config.enableAutoUpdate,
            debugMode: this.config.debugMode
        });

        // Listen to update events
        this.updateManager.on('updateAvailable', (updateInfo) => {
            this.handleUpdateAvailable(updateInfo);
        });

        this.updateManager.on('updateCompleted', (result) => {
            this.handleUpdateCompleted(result);
        });

        this.updateManager.on('updateFailed', (error) => {
            this.handleUpdateFailed(error);
        });

        console.log('Asset update manager initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for asset manager events
        if (this.assetManager && this.assetManager.addEventListener) {
            this.assetManager.addEventListener('assetLoaded', (event) => {
                this.handleAssetLoaded(event.detail);
            });

            this.assetManager.addEventListener('assetError', (event) => {
                this.handleAssetError(event.detail);
            });
        }

        // Listen for application lifecycle events
        window.addEventListener('beforeunload', () => {
            this.handleApplicationShutdown();
        });

        // Listen for network status changes
        window.addEventListener('online', () => {
            this.handleNetworkRestore();
        });

        window.addEventListener('offline', () => {
            this.handleNetworkLoss();
        });
    }

    /**
     * Perform startup integrity check
     */
    async performStartupIntegrityCheck() {
        console.log('Performing startup integrity check...');
        const startTime = Date.now();

        try {
            // Set timeout for startup check
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Startup check timeout')), this.config.startupTimeout);
            });

            // Perform verification with timeout
            const verificationPromise = this.verificationSystem.forceVerification();
            
            const results = await Promise.race([verificationPromise, timeoutPromise]);
            
            // Analyze results
            const report = this.analyzeVerificationResults(results);
            
            // Generate startup report
            const startupReport = {
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                totalAssets: report.totalAssets,
                validAssets: report.validAssets,
                corruptedAssets: report.corruptedAssets,
                repairedAssets: report.repairedAssets,
                criticalIssues: report.criticalIssues,
                status: report.criticalIssues.length > 0 ? 'warning' : 'healthy'
            };

            this.lastIntegrityReport = startupReport;
            this.startupCheckCompleted = true;

            console.log(`Startup integrity check completed in ${startupReport.duration}ms`);
            console.log(`Status: ${startupReport.status}`);
            console.log(`Assets: ${startupReport.validAssets}/${startupReport.totalAssets} valid`);

            if (startupReport.corruptedAssets > 0) {
                console.warn(`Found ${startupReport.corruptedAssets} corrupted assets`);
            }

            // Emit startup check completed event
            this.emit('startupCheckCompleted', startupReport);

            // Send report to server if configured
            if (this.config.reportingEndpoint) {
                await this.sendIntegrityReport(startupReport);
            }

            return startupReport;

        } catch (error) {
            console.error('Startup integrity check failed:', error);
            this.metrics.criticalErrors++;
            
            const failedReport = {
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                status: 'failed',
                error: error.message,
                criticalIssues: [error.message]
            };

            this.lastIntegrityReport = failedReport;
            this.emit('startupCheckFailed', failedReport);
            
            throw error;
        }
    }

    /**
     * Analyze verification results
     */
    analyzeVerificationResults(results) {
        const report = {
            totalAssets: results.length,
            validAssets: 0,
            corruptedAssets: 0,
            repairedAssets: 0,
            criticalIssues: [],
            warnings: []
        };

        results.forEach(result => {
            if (result.valid) {
                report.validAssets++;
            } else {
                report.corruptedAssets++;
                
                if (result.error) {
                    report.criticalIssues.push(`Asset ${result.assetId}: ${result.error}`);
                } else {
                    report.warnings.push(`Asset ${result.assetId}: checksum mismatch`);
                }
            }
        });

        // Check for critical thresholds
        const corruptionRate = report.corruptedAssets / report.totalAssets;
        if (corruptionRate > 0.1) { // More than 10% corrupted
            report.criticalIssues.push(`High corruption rate: ${(corruptionRate * 100).toFixed(1)}%`);
        }

        return report;
    }

    /**
     * Handle asset corruption
     */
    handleAssetCorruption(assetInfo) {
        console.warn(`Asset corruption detected: ${assetInfo.assetId}`);
        
        this.metrics.failedChecks++;
        
        // Emit corruption event
        this.emit('assetCorrupted', assetInfo);
        
        // Trigger repair if auto-repair is enabled
        if (this.config.enableAutoRepair && this.verificationSystem) {
            this.verificationSystem.queueAssetRepair(assetInfo.assetId);
        }
    }

    /**
     * Handle asset repair
     */
    handleAssetRepair(assetInfo) {
        console.log(`Asset repaired: ${assetInfo.assetId}`);
        
        this.metrics.repairedAssets++;
        
        // Emit repair event
        this.emit('assetRepaired', assetInfo);
        
        // Notify asset manager if available
        if (this.assetManager && this.assetManager.onAssetRepaired) {
            this.assetManager.onAssetRepaired(assetInfo.assetId);
        }
    }

    /**
     * Handle update available
     */
    handleUpdateAvailable(updateInfo) {
        console.log(`Asset update available: ${updateInfo.currentVersion} -> ${updateInfo.newVersion}`);
        
        // Emit update available event
        this.emit('updateAvailable', updateInfo);
        
        // Auto-apply update if enabled
        if (this.config.enableAutoUpdate) {
            console.log('Auto-applying update...');
            this.updateManager.applyUpdate(updateInfo).catch(error => {
                console.error('Auto-update failed:', error);
            });
        }
    }

    /**
     * Handle update completed
     */
    handleUpdateCompleted(result) {
        console.log(`Asset update completed: ${result.updateInfo.newVersion}`);
        
        this.metrics.updatedAssets += result.updateInfo.totalChanges;
        
        // Emit update completed event
        this.emit('updateCompleted', result);
        
        // Perform verification after update
        if (this.verificationSystem) {
            setTimeout(() => {
                this.verificationSystem.forceVerification().catch(error => {
                    console.error('Post-update verification failed:', error);
                });
            }, 1000);
        }
    }

    /**
     * Handle update failed
     */
    handleUpdateFailed(error) {
        console.error('Asset update failed:', error);
        
        this.metrics.criticalErrors++;
        
        // Emit update failed event
        this.emit('updateFailed', error);
    }

    /**
     * Handle asset loaded
     */
    handleAssetLoaded(assetInfo) {
        // Register asset for verification if not already registered
        if (this.verificationSystem && !this.verificationSystem.assetRegistry.has(assetInfo.id)) {
            this.verificationSystem.registerAsset(assetInfo.id, assetInfo);
        }
    }

    /**
     * Handle asset error
     */
    handleAssetError(assetInfo) {
        console.warn(`Asset error: ${assetInfo.id} - ${assetInfo.error}`);
        
        // Queue for verification and potential repair
        if (this.verificationSystem) {
            this.verificationSystem.queueAssetVerification(assetInfo.id);
        }
    }

    /**
     * Handle network restore
     */
    handleNetworkRestore() {
        console.log('Network restored - resuming asset operations');
        
        // Resume update operations
        if (this.updateManager) {
            this.updateManager.resumeDownloads();
        }
        
        // Resume verification operations
        if (this.verificationSystem && this.verificationSystem.repairQueue.length > 0) {
            this.verificationSystem.processRepairQueue();
        }
    }

    /**
     * Handle network loss
     */
    handleNetworkLoss() {
        console.log('Network lost - pausing network-dependent operations');
        
        // Pause update operations
        if (this.updateManager) {
            this.updateManager.pauseActiveDownloads();
        }
    }

    /**
     * Handle application shutdown
     */
    handleApplicationShutdown() {
        console.log('Application shutting down - saving asset integrity state');
        
        // Save current state
        if (this.verificationSystem) {
            this.verificationSystem.saveAssetRegistry();
        }
        
        if (this.updateManager) {
            this.updateManager.saveUpdateHistory();
            this.updateManager.saveCurrentManifest();
        }
    }

    /**
     * Send integrity report to server
     */
    async sendIntegrityReport(report) {
        try {
            const response = await fetch(this.config.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...report,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('Integrity report sent successfully');
        } catch (error) {
            console.warn('Failed to send integrity report:', error);
        }
    }

    /**
     * Perform manual integrity check
     */
    async performIntegrityCheck() {
        console.log('Performing manual integrity check...');
        
        if (!this.verificationSystem) {
            throw new Error('Verification system not initialized');
        }

        this.metrics.totalChecks++;
        
        try {
            const results = await this.verificationSystem.forceVerification();
            const report = this.analyzeVerificationResults(results);
            
            const integrityReport = {
                timestamp: Date.now(),
                type: 'manual',
                ...report
            };

            this.lastIntegrityReport = integrityReport;
            
            // Emit integrity check completed event
            this.emit('integrityCheckCompleted', integrityReport);
            
            return integrityReport;
        } catch (error) {
            this.metrics.failedChecks++;
            throw error;
        }
    }

    /**
     * Force asset repair
     */
    async forceAssetRepair(assetId) {
        console.log(`Forcing repair for asset: ${assetId}`);
        
        if (!this.verificationSystem) {
            throw new Error('Verification system not initialized');
        }

        try {
            await this.verificationSystem.forceRepair(assetId);
            this.metrics.repairedAssets++;
            
            // Emit repair completed event
            this.emit('assetRepairCompleted', { assetId });
            
            return { success: true, assetId };
        } catch (error) {
            console.error(`Failed to repair asset ${assetId}:`, error);
            throw error;
        }
    }

    /**
     * Check for updates
     */
    async checkForUpdates() {
        console.log('Checking for asset updates...');
        
        if (!this.updateManager) {
            throw new Error('Update manager not initialized');
        }

        return await this.updateManager.forceUpdateCheck();
    }

    /**
     * Apply available updates
     */
    async applyUpdates() {
        console.log('Applying available updates...');
        
        if (!this.updateManager) {
            throw new Error('Update manager not initialized');
        }

        // Check for updates first
        const updateInfo = await this.updateManager.checkForUpdates();
        
        if (!updateInfo.hasUpdates) {
            return { success: false, message: 'No updates available' };
        }

        // Apply updates
        return await this.updateManager.applyUpdate(updateInfo);
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            initialized: this.initialized,
            startupCheckCompleted: this.startupCheckCompleted,
            verificationSystem: this.verificationSystem ? this.verificationSystem.getVerificationStatus() : null,
            updateManager: this.updateManager ? this.updateManager.getUpdateStatus() : null,
            lastIntegrityReport: this.lastIntegrityReport,
            metrics: { ...this.metrics }
        };
    }

    /**
     * Get detailed integrity report
     */
    getIntegrityReport() {
        const status = this.getSystemStatus();
        
        return {
            timestamp: Date.now(),
            systemStatus: status,
            assetRegistry: this.verificationSystem ? this.verificationSystem.getIntegrityReport() : null,
            updateHistory: this.updateManager ? this.updateManager.getUpdateHistory() : null,
            recommendations: this.generateRecommendations(status)
        };
    }

    /**
     * Generate recommendations based on system status
     */
    generateRecommendations(status) {
        const recommendations = [];

        if (!status.initialized) {
            recommendations.push({
                type: 'critical',
                message: 'Asset integrity system not initialized',
                action: 'Restart application or contact support'
            });
            return recommendations;
        }

        if (status.verificationSystem) {
            const verificationStatus = status.verificationSystem;
            
            if (verificationStatus.corruptedAssets > 0) {
                recommendations.push({
                    type: 'warning',
                    message: `${verificationStatus.corruptedAssets} corrupted assets detected`,
                    action: 'Enable auto-repair or manually repair assets'
                });
            }

            if (verificationStatus.pendingVerification > 10) {
                recommendations.push({
                    type: 'info',
                    message: 'Many assets pending verification',
                    action: 'Consider performing manual integrity check'
                });
            }
        }

        if (status.updateManager) {
            const updateStatus = status.updateManager;
            
            if (updateStatus.pendingVersion) {
                recommendations.push({
                    type: 'info',
                    message: `Update available: ${updateStatus.currentVersion} -> ${updateStatus.pendingVersion}`,
                    action: 'Apply update to get latest assets and fixes'
                });
            }

            if (updateStatus.metrics.failedUpdates > 0) {
                recommendations.push({
                    type: 'warning',
                    message: 'Previous updates have failed',
                    action: 'Check network connection and retry updates'
                });
            }
        }

        if (status.metrics.criticalErrors > 0) {
            recommendations.push({
                type: 'critical',
                message: `${status.metrics.criticalErrors} critical errors detected`,
                action: 'Review error logs and contact support if issues persist'
            });
        }

        return recommendations;
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update subsystem configurations
        if (this.verificationSystem) {
            this.verificationSystem.updateConfig({
                enableVerification: this.config.enableVerification,
                enableAutoRepair: this.config.enableAutoRepair,
                debugMode: this.config.debugMode
            });
        }

        if (this.updateManager) {
            this.updateManager.updateConfig({
                enableAutoUpdate: this.config.enableAutoUpdate,
                debugMode: this.config.debugMode
            });
        }

        console.log('Asset Integrity Integration configuration updated:', this.config);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('Destroying Asset Integrity Integration');
        
        // Destroy subsystems
        if (this.verificationSystem) {
            this.verificationSystem.destroy();
        }
        
        if (this.updateManager) {
            this.updateManager.destroy();
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Reset state
        this.initialized = false;
        this.startupCheckCompleted = false;
        
        console.log('Asset Integrity Integration destroyed');
    }
}

export default AssetIntegrityIntegration;