/**
 * Asset Update Manager
 * Handles asset version management, updates, and distribution
 */
class AssetUpdateManager {
    constructor(verificationSystem, config = {}) {
        this.verificationSystem = verificationSystem;
        
        // Configuration
        this.config = {
            updateCheckInterval: 3600000, // 1 hour
            enableAutoUpdate: false,
            enableBackgroundUpdate: true,
            maxConcurrentDownloads: 3,
            updateEndpoint: '/api/assets/updates',
            manifestEndpoint: '/api/assets/manifest',
            cdnEndpoints: [
                'https://cdn1.example.com',
                'https://cdn2.example.com'
            ],
            retryAttempts: 3,
            retryDelay: 2000,
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // Update state
        this.updateInProgress = false;
        this.downloadQueue = [];
        this.activeDownloads = new Map();
        this.updateHistory = [];
        this.lastUpdateCheck = 0;

        // Version tracking
        this.currentManifest = null;
        this.pendingManifest = null;
        this.rollbackManifest = null;

        // Metrics
        this.metrics = {
            totalUpdates: 0,
            successfulUpdates: 0,
            failedUpdates: 0,
            bytesDownloaded: 0,
            updateTime: 0,
            rollbacks: 0
        };

        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }

    /**
     * Initialize update manager
     */
    async initialize() {
        console.log('Initializing Asset Update Manager...');
        try {
            await this.loadUpdateHistory();
            await this.loadCurrentManifest();
            this.startUpdateCheckInterval();
            this.setupEventListeners();
            
            console.log('Asset Update Manager initialized');
            
            // Perform initial update check
            if (this.config.enableAutoUpdate) {
                await this.checkForUpdates();
            }
        } catch (error) {
            console.error('Failed to initialize Asset Update Manager:', error);
            throw error;
        }
    }

    /**
     * Load update history from storage
     */
    async loadUpdateHistory() {
        try {
            const stored = localStorage.getItem('asset_update_history');
            if (stored) {
                this.updateHistory = JSON.parse(stored);
                console.log(`Loaded ${this.updateHistory.length} update records`);
            }
        } catch (error) {
            console.warn('Failed to load update history:', error);
        }
    }

    /**
     * Save update history to storage
     */
    async saveUpdateHistory() {
        try {
            localStorage.setItem('asset_update_history', JSON.stringify(this.updateHistory));
        } catch (error) {
            console.warn('Failed to save update history:', error);
        }
    }

    /**
     * Load current manifest
     */
    async loadCurrentManifest() {
        try {
            const stored = localStorage.getItem('current_asset_manifest');
            if (stored) {
                this.currentManifest = JSON.parse(stored);
                console.log(`Loaded current manifest: ${this.currentManifest.version}`);
            }
        } catch (error) {
            console.warn('Failed to load current manifest:', error);
        }
    }

    /**
     * Save current manifest
     */
    async saveCurrentManifest() {
        try {
            localStorage.setItem('current_asset_manifest', JSON.stringify(this.currentManifest));
        } catch (error) {
            console.warn('Failed to save current manifest:', error);
        }
    }

    /**
     * Start update check interval
     */
    startUpdateCheckInterval() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
        
        this.updateCheckInterval = setInterval(() => {
            if (this.config.enableAutoUpdate) {
                this.checkForUpdates();
            }
        }, this.config.updateCheckInterval);
        
        console.log(`Update check interval started (${this.config.updateCheckInterval}ms)`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for network status changes
        window.addEventListener('online', () => {
            console.log('Network restored, resuming updates');
            if (this.downloadQueue.length > 0) {
                this.processDownloadQueue();
            }
        });

        window.addEventListener('offline', () => {
            console.log('Network lost, pausing updates');
            this.pauseActiveDownloads();
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page hidden - enable background updates
                this.enableBackgroundMode();
            } else {
                // Page visible - resume normal mode
                this.disableBackgroundMode();
            }
        });
    }

    /**
     * Check for updates
     */
    async checkForUpdates() {
        if (this.updateInProgress) {
            console.log('Update already in progress');
            return null;
        }

        console.log('Checking for asset updates...');
        this.lastUpdateCheck = Date.now();

        try {
            const response = await fetch(this.config.manifestEndpoint, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'If-Modified-Since': this.currentManifest ? 
                        new Date(this.currentManifest.timestamp).toUTCString() : 
                        new Date(0).toUTCString()
                }
            });

            if (response.status === 304) {
                console.log('No updates available');
                return { hasUpdates: false };
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const newManifest = await response.json();

            // Validate manifest
            if (!this.validateManifest(newManifest)) {
                throw new Error('Invalid manifest received');
            }

            // Compare with current manifest
            const updateInfo = this.compareManifests(this.currentManifest, newManifest);

            if (updateInfo.hasUpdates) {
                console.log(`Update available: ${updateInfo.currentVersion} -> ${updateInfo.newVersion}`);
                console.log(`Changes: ${updateInfo.totalChanges} assets`);
                
                this.pendingManifest = newManifest;
                
                // Emit update available event
                this.emit('updateAvailable', updateInfo);
                
                // Auto-update if enabled
                if (this.config.enableAutoUpdate) {
                    await this.applyUpdate(updateInfo);
                }
            }

            return updateInfo;
        } catch (error) {
            console.error('Failed to check for updates:', error);
            this.emit('updateCheckFailed', { error: error.message });
            return { hasUpdates: false, error: error.message };
        }
    }

    /**
     * Validate manifest structure
     */
    validateManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            return false;
        }

        if (!manifest.version || !manifest.assets || !manifest.timestamp) {
            return false;
        }

        // Validate assets
        for (const [assetId, asset] of Object.entries(manifest.assets)) {
            if (!asset.url || !asset.checksum || !asset.size) {
                console.warn(`Invalid asset in manifest: ${assetId}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Compare manifests to find changes
     */
    compareManifests(currentManifest, newManifest) {
        const changes = {
            updated: [],
            added: [],
            removed: []
        };

        // Find added and updated assets
        Object.keys(newManifest.assets).forEach(assetId => {
            const newAsset = newManifest.assets[assetId];
            const currentAsset = currentManifest?.assets[assetId];

            if (!currentAsset) {
                changes.added.push({
                    id: assetId,
                    ...newAsset
                });
            } else if (currentAsset.checksum !== newAsset.checksum) {
                changes.updated.push({
                    id: assetId,
                    ...newAsset,
                    previousChecksum: currentAsset.checksum
                });
            }
        });

        // Find removed assets
        if (currentManifest?.assets) {
            Object.keys(currentManifest.assets).forEach(assetId => {
                if (!newManifest.assets[assetId]) {
                    changes.removed.push({
                        id: assetId,
                        ...currentManifest.assets[assetId]
                    });
                }
            });
        }

        const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;

        return {
            hasUpdates: totalChanges > 0,
            currentVersion: currentManifest?.version || 'unknown',
            newVersion: newManifest.version,
            changes,
            totalChanges,
            totalSize: [...changes.updated, ...changes.added].reduce((sum, asset) => sum + asset.size, 0)
        };
    }

    /**
     * Apply update
     */
    async applyUpdate(updateInfo) {
        if (this.updateInProgress) {
            throw new Error('Update already in progress');
        }

        if (!updateInfo.hasUpdates) {
            throw new Error('No updates to apply');
        }

        console.log(`Applying update to version ${updateInfo.newVersion}`);
        this.updateInProgress = true;
        const startTime = Date.now();

        try {
            // Create rollback point
            this.rollbackManifest = this.currentManifest;

            // Emit update started event
            this.emit('updateStarted', updateInfo);

            // Download updated and new assets
            const assetsToDownload = [...updateInfo.changes.updated, ...updateInfo.changes.added];
            if (assetsToDownload.length > 0) {
                await this.downloadAssets(assetsToDownload, updateInfo);
            }

            // Remove obsolete assets
            if (updateInfo.changes.removed.length > 0) {
                await this.removeAssets(updateInfo.changes.removed);
            }

            // Update current manifest
            this.currentManifest = this.pendingManifest;
            this.pendingManifest = null;
            await this.saveCurrentManifest();

            // Update verification system
            if (this.verificationSystem) {
                await this.updateVerificationSystem(updateInfo);
            }

            // Record update in history
            const updateRecord = {
                fromVersion: updateInfo.currentVersion,
                toVersion: updateInfo.newVersion,
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                changes: updateInfo.changes,
                success: true,
                error: null
            };

            this.updateHistory.push(updateRecord);
            await this.saveUpdateHistory();

            // Update metrics
            this.metrics.totalUpdates++;
            this.metrics.successfulUpdates++;
            this.metrics.updateTime = updateRecord.duration;

            console.log(`Update completed successfully in ${updateRecord.duration}ms`);

            // Emit update completed event
            this.emit('updateCompleted', {
                updateInfo,
                updateRecord
            });

            return {
                success: true,
                version: updateInfo.newVersion,
                duration: updateRecord.duration,
                changes: updateInfo.changes
            };

        } catch (error) {
            console.error('Update failed:', error);

            // Record failed update
            const failedRecord = {
                fromVersion: updateInfo.currentVersion,
                toVersion: updateInfo.newVersion,
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                changes: updateInfo.changes,
                success: false,
                error: error.message
            };

            this.updateHistory.push(failedRecord);
            await this.saveUpdateHistory();

            // Update metrics
            this.metrics.totalUpdates++;
            this.metrics.failedUpdates++;

            // Attempt rollback if possible
            if (this.rollbackManifest) {
                console.log('Attempting rollback...');
                try {
                    await this.rollbackUpdate();
                } catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                }
            }

            // Emit update failed event
            this.emit('updateFailed', {
                updateInfo,
                error: error.message,
                failedRecord
            });

            throw error;
        } finally {
            this.updateInProgress = false;
            this.pendingManifest = null;
        }
    }

    /**
     * Download assets
     */
    async downloadAssets(assets, updateInfo) {
        console.log(`Downloading ${assets.length} assets`);

        // Add assets to download queue
        this.downloadQueue.push(...assets.map(asset => ({
            ...asset,
            updateInfo,
            attempts: 0,
            status: 'pending'
        })));

        // Process download queue
        await this.processDownloadQueue();
    }

    /**
     * Process download queue
     */
    async processDownloadQueue() {
        if (!navigator.onLine) {
            console.log('Offline - pausing downloads');
            return;
        }

        // Process downloads with concurrency limit
        const activeDownloads = Array.from(this.activeDownloads.values());
        const availableSlots = this.config.maxConcurrentDownloads - activeDownloads.length;

        if (availableSlots <= 0) {
            return;
        }

        // Get pending downloads
        const pendingDownloads = this.downloadQueue
            .filter(item => item.status === 'pending')
            .slice(0, availableSlots);

        // Start downloads
        const downloadPromises = pendingDownloads.map(item => this.downloadAsset(item));
        await Promise.allSettled(downloadPromises);

        // Continue processing if queue has more items
        if (this.downloadQueue.some(item => item.status === 'pending')) {
            await this.processDownloadQueue();
        }
    }

    /**
     * Download single asset
     */
    async downloadAsset(assetItem) {
        const { id, url, size, checksum } = assetItem;
        console.log(`Downloading asset: ${id}`);

        assetItem.status = 'downloading';
        this.activeDownloads.set(id, assetItem);

        try {
            // Try multiple CDN endpoints
            let assetData = null;
            let downloadError = null;

            for (const endpoint of this.config.cdnEndpoints) {
                try {
                    const assetUrl = url.startsWith('http') ? url : `${endpoint}${url}`;
                    const response = await fetch(assetUrl, {
                        headers: {
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    assetData = await response.arrayBuffer();
                    this.metrics.bytesDownloaded += assetData.byteLength;
                    break;
                } catch (error) {
                    downloadError = error;
                    console.warn(`Failed to download from ${endpoint}:`, error);
                }
            }

            if (!assetData) {
                throw downloadError || new Error('All CDN endpoints failed');
            }

            // Verify checksum
            const calculatedChecksum = await this.calculateChecksum(assetData);
            if (calculatedChecksum !== checksum) {
                throw new Error(`Checksum mismatch: expected ${checksum}, got ${calculatedChecksum}`);
            }

            // Store asset
            await this.storeAsset(id, assetData);

            // Update verification system
            if (this.verificationSystem) {
                this.verificationSystem.registerAsset(id, {
                    url,
                    type: assetItem.type || 'unknown',
                    size,
                    checksum,
                    version: assetItem.updateInfo.newVersion
                });
            }

            assetItem.status = 'completed';
            console.log(`Asset downloaded successfully: ${id}`);

        } catch (error) {
            console.error(`Failed to download asset ${id}:`, error);
            assetItem.attempts++;

            if (assetItem.attempts < this.config.retryAttempts) {
                assetItem.status = 'pending';
                console.log(`Retrying download for ${id} (attempt ${assetItem.attempts + 1})`);
                
                // Add delay before retry
                setTimeout(() => {
                    this.processDownloadQueue();
                }, this.config.retryDelay * assetItem.attempts);
            } else {
                assetItem.status = 'failed';
                assetItem.error = error.message;
                throw error;
            }
        } finally {
            this.activeDownloads.delete(id);
        }
    }

    /**
     * Calculate checksum for asset data
     */
    async calculateChecksum(data) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Store asset in cache
     */
    async storeAsset(assetId, assetData) {
        try {
            // Store in IndexedDB
            await this.storeAssetInIndexedDB(assetId, assetData);
            // Store in browser cache
            await this.storeAssetInCache(assetId, assetData);
        } catch (error) {
            console.warn(`Failed to store asset ${assetId}:`, error);
        }
    }

    /**
     * Store asset in IndexedDB
     */
    async storeAssetInIndexedDB(assetId, assetData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AssetCache', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['assets'], 'readwrite');
                const store = transaction.objectStore('assets');
                const putRequest = store.put({
                    id: assetId,
                    data: assetData,
                    timestamp: Date.now()
                });
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Store asset in browser cache
     */
    async storeAssetInCache(assetId, assetData) {
        try {
            const cache = await caches.open('asset-cache');
            const response = new Response(assetData);
            await cache.put(`asset_${assetId}`, response);
        } catch (error) {
            console.warn(`Failed to store asset in cache: ${assetId}`, error);
        }
    }

    /**
     * Remove assets
     */
    async removeAssets(assets) {
        console.log(`Removing ${assets.length} obsolete assets`);
        for (const asset of assets) {
            try {
                await this.removeAsset(asset.id);
                // Update verification system
                if (this.verificationSystem && this.verificationSystem.unregisterAsset) {
                    this.verificationSystem.unregisterAsset(asset.id);
                }
            } catch (error) {
                console.warn(`Failed to remove asset ${asset.id}:`, error);
            }
        }
    }

    /**
     * Remove single asset
     */
    async removeAsset(assetId) {
        try {
            // Remove from IndexedDB
            await this.removeAssetFromIndexedDB(assetId);
            // Remove from browser cache
            await this.removeAssetFromCache(assetId);
            console.log(`Asset removed: ${assetId}`);
        } catch (error) {
            console.warn(`Failed to remove asset ${assetId}:`, error);
        }
    }

    /**
     * Remove asset from IndexedDB
     */
    async removeAssetFromIndexedDB(assetId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AssetCache', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['assets'], 'readwrite');
                const store = transaction.objectStore('assets');
                const deleteRequest = store.delete(assetId);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
        });
    }

    /**
     * Remove asset from browser cache
     */
    async removeAssetFromCache(assetId) {
        try {
            const cache = await caches.open('asset-cache');
            await cache.delete(`asset_${assetId}`);
        } catch (error) {
            console.warn(`Failed to remove asset from cache: ${assetId}`, error);
        }
    }

    /**
     * Update verification system
     */
    async updateVerificationSystem(updateInfo) {
        if (!this.verificationSystem) return;

        try {
            // Update asset registry with new checksums
            updateInfo.changes.updated.forEach(asset => {
                if (this.verificationSystem.updateAsset) {
                    this.verificationSystem.updateAsset(asset.id, {
                        checksum: asset.checksum,
                        version: updateInfo.newVersion,
                        size: asset.size
                    });
                }
            });

            // Add new assets
            updateInfo.changes.added.forEach(asset => {
                this.verificationSystem.registerAsset(asset.id, {
                    url: asset.url,
                    type: asset.type || 'unknown',
                    size: asset.size,
                    checksum: asset.checksum,
                    version: updateInfo.newVersion
                });
            });

            // Remove obsolete assets
            updateInfo.changes.removed.forEach(asset => {
                if (this.verificationSystem.unregisterAsset) {
                    this.verificationSystem.unregisterAsset(asset.id);
                }
            });

            console.log('Verification system updated');
        } catch (error) {
            console.warn('Failed to update verification system:', error);
        }
    }

    /**
     * Rollback update
     */
    async rollbackUpdate() {
        if (!this.rollbackManifest) {
            throw new Error('No rollback manifest available');
        }

        console.log(`Rolling back to version ${this.rollbackManifest.version}`);

        try {
            // Restore previous manifest
            this.currentManifest = this.rollbackManifest;
            this.rollbackManifest = null;
            await this.saveCurrentManifest();

            // Update metrics
            this.metrics.rollbacks++;

            console.log('Rollback completed successfully');

            // Emit rollback event
            this.emit('rollbackCompleted', {
                version: this.currentManifest.version
            });

            return { success: true, version: this.currentManifest.version };
        } catch (error) {
            console.error('Rollback failed:', error);
            throw error;
        }
    }

    /**
     * Pause active downloads
     */
    pauseActiveDownloads() {
        console.log('Pausing active downloads');
        // Mark pending downloads as paused
        this.downloadQueue.forEach(item => {
            if (item.status === 'downloading') {
                item.status = 'paused';
            }
        });
    }

    /**
     * Resume paused downloads
     */
    resumeDownloads() {
        console.log('Resuming downloads');
        // Mark paused downloads as pending
        this.downloadQueue.forEach(item => {
            if (item.status === 'paused') {
                item.status = 'pending';
            }
        });
        // Process queue
        this.processDownloadQueue();
    }

    /**
     * Enable background mode
     */
    enableBackgroundMode() {
        if (!this.config.enableBackgroundUpdate) return;
        
        console.log('Enabling background update mode');
        // Reduce update frequency in background
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = setInterval(() => {
                if (this.config.enableAutoUpdate) {
                    this.checkForUpdates();
                }
            }, this.config.updateCheckInterval * 2); // Double the interval
        }
    }

    /**
     * Disable background mode
     */
    disableBackgroundMode() {
        console.log('Disabling background update mode');
        // Restore normal update frequency
        this.startUpdateCheckInterval();
    }

    /**
     * Get update status
     */
    getUpdateStatus() {
        return {
            updateInProgress: this.updateInProgress,
            lastUpdateCheck: this.lastUpdateCheck,
            currentVersion: this.currentManifest?.version || 'unknown',
            pendingVersion: this.pendingManifest?.version || null,
            downloadQueueSize: this.downloadQueue.length,
            activeDownloads: this.activeDownloads.size,
            updateHistory: this.updateHistory.slice(-10), // Last 10 updates
            metrics: { ...this.metrics }
        };
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
     * Force update check
     */
    async forceUpdateCheck() {
        console.log('Forcing update check');
        return await this.checkForUpdates();
    }

    /**
     * Cancel pending update
     */
    cancelUpdate() {
        if (!this.updateInProgress) {
            return { success: false, message: 'No update in progress' };
        }

        console.log('Cancelling update');
        
        // Clear download queue
        this.downloadQueue = [];
        
        // Cancel active downloads
        this.activeDownloads.clear();
        
        // Reset state
        this.updateInProgress = false;
        this.pendingManifest = null;
        
        // Emit cancelled event
        this.emit('updateCancelled');
        
        return { success: true, message: 'Update cancelled' };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Restart update check interval if changed
        if (newConfig.updateCheckInterval) {
            this.startUpdateCheckInterval();
        }
        
        console.log('Asset Update Manager configuration updated:', this.config);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('Destroying Asset Update Manager');
        
        // Clear intervals
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
        
        // Cancel active downloads
        this.cancelUpdate();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Save final state
        this.saveUpdateHistory();
        this.saveCurrentManifest();
        
        console.log('Asset Update Manager destroyed');
    }
}

export default AssetUpdateManager;