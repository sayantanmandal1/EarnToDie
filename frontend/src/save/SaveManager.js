import { EventEmitter } from 'events';

/**
 * SaveManager handles comprehensive save state management for game progress
 * Provides localStorage persistence, backend sync, validation, and recovery mechanisms
 */
export class SaveManager extends EventEmitter {
    constructor(apiClient, options = {}) {
        super();
        
        this.apiClient = apiClient;
        this.options = {
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            maxLocalSaves: options.maxLocalSaves || 10,
            compressionEnabled: options.compressionEnabled || true,
            encryptionEnabled: options.encryptionEnabled || false,
            syncOnlineEnabled: options.syncOnlineEnabled || true,
            ...options
        };
        
        // Save state structure
        this.saveState = {
            version: '1.0.0',
            timestamp: Date.now(),
            player: {
                id: null,
                username: null,
                currency: 0,
                level: 1,
                totalScore: 0,
                playTime: 0
            },
            vehicles: {
                owned: [],
                selected: null,
                upgrades: {}
            },
            levels: {
                progress: {},
                unlocked: ['level_1'],
                completed: [],
                bestScores: {}
            },
            settings: {
                audio: {},
                graphics: {},
                controls: {}
            },
            achievements: [],
            statistics: {
                totalZombiesKilled: 0,
                totalDistanceTraveled: 0,
                totalGamesPlayed: 0,
                totalPlayTime: 0
            },
            gameState: {
                currentSession: null,
                lastLevel: null,
                checkpoint: null
            }
        };
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        // Sync status
        this.syncStatus = {
            lastSync: null,
            pendingChanges: false,
            syncInProgress: false,
            lastError: null
        };
        
        // Local storage keys
        this.storageKeys = {
            mainSave: 'zombie_car_game_save',
            backupSaves: 'zombie_car_game_backups',
            settings: 'zombie_car_game_settings',
            syncStatus: 'zombie_car_game_sync_status'
        };
        
        console.log('SaveManager initialized');
    }

    /**
     * Initialize the save manager
     */
    async initialize() {
        try {
            // Load existing save data
            await this.loadFromLocalStorage();
            
            // Load sync status
            this.loadSyncStatus();
            
            // Start auto-save if enabled
            if (this.options.autoSaveInterval > 0) {
                this.startAutoSave();
            }
            
            // Attempt initial sync if online
            if (navigator.onLine && this.options.syncOnlineEnabled) {
                this.syncWithBackend().catch(error => {
                    console.warn('Initial sync failed:', error);
                });
            }
            
            // Setup network listeners
            this.setupNetworkListeners();
            
            console.log('SaveManager initialized successfully');
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize SaveManager:', error);
            throw error;
        }
    }

    /**
     * Load save data from localStorage
     */
    async loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem(this.storageKeys.mainSave);
            
            if (savedData) {
                const parsedData = this.parseAndValidateSaveData(savedData);
                if (parsedData) {
                    this.saveState = { ...this.saveState, ...parsedData };
                    console.log('Save data loaded from localStorage');
                    this.emit('saveLoaded', this.saveState);
                    return true;
                }
            }
            
            // No valid save data found, use defaults
            console.log('No valid save data found, using defaults');
            return false;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            
            // Attempt to recover from backup
            return await this.recoverFromBackup();
        }
    }

    /**
     * Parse and validate save data
     */
    parseAndValidateSaveData(data) {
        try {
            let parsed;
            
            if (this.options.compressionEnabled) {
                parsed = this.decompressData(data);
            } else {
                parsed = JSON.parse(data);
            }
            
            // Validate save data structure
            const validation = this.validateSaveData(parsed);
            if (!validation.isValid) {
                console.warn('Save data validation failed:', validation.errors);
                
                // Attempt to repair if possible
                const repaired = this.repairSaveData(parsed, validation.errors);
                if (repaired) {
                    console.log('Save data repaired successfully');
                    return repaired;
                }
                
                return null;
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to parse save data:', error);
            return null;
        }
    }

    /**
     * Validate save data structure and integrity
     */
    validateSaveData(data) {
        const errors = [];
        
        // Check required fields
        if (!data.version) errors.push('Missing version');
        if (!data.timestamp) errors.push('Missing timestamp');
        if (!data.player) errors.push('Missing player data');
        if (!data.vehicles) errors.push('Missing vehicles data');
        if (!data.levels) errors.push('Missing levels data');
        
        // Check data types
        if (data.player && typeof data.player.currency !== 'number') {
            errors.push('Invalid currency type');
        }
        
        if (data.vehicles && !Array.isArray(data.vehicles.owned)) {
            errors.push('Invalid vehicles.owned type');
        }
        
        if (data.levels && typeof data.levels.progress !== 'object') {
            errors.push('Invalid levels.progress type');
        }
        
        // Check timestamp validity
        if (data.timestamp && (Date.now() - data.timestamp > 365 * 24 * 60 * 60 * 1000)) {
            errors.push('Save data is too old (>1 year)');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Attempt to repair corrupted save data
     */
    repairSaveData(data, errors) {
        try {
            const repaired = { ...this.saveState }; // Start with defaults
            
            // Merge valid data from corrupted save
            if (data.player && typeof data.player === 'object') {
                repaired.player = { ...repaired.player };
                
                // Only merge valid player fields
                if (typeof data.player.level === 'number' && data.player.level >= 1) {
                    repaired.player.level = data.player.level;
                }
                if (typeof data.player.currency === 'number' && data.player.currency >= 0) {
                    repaired.player.currency = data.player.currency;
                }
                if (typeof data.player.name === 'string') {
                    repaired.player.name = data.player.name;
                }
                if (typeof data.player.totalScore === 'number' && data.player.totalScore >= 0) {
                    repaired.player.totalScore = data.player.totalScore;
                }
            }
            
            if (data.vehicles && typeof data.vehicles === 'object') {
                repaired.vehicles = { ...repaired.vehicles, ...data.vehicles };
            }
            
            if (data.levels && typeof data.levels === 'object') {
                repaired.levels = { ...repaired.levels, ...data.levels };
            }
            
            if (data.settings && typeof data.settings === 'object') {
                repaired.settings = { ...repaired.settings, ...data.settings };
            }
            
            // Update timestamp and version
            repaired.timestamp = Date.now();
            repaired.version = this.saveState.version;
            
            console.log('Save data repair completed');
            return repaired;
        } catch (error) {
            console.error('Failed to repair save data:', error);
            return null;
        }
    }

    /**
     * Save current state to localStorage
     */
    async saveToLocalStorage() {
        try {
            // Update timestamp
            this.saveState.timestamp = Date.now();
            
            // Create backup before saving
            await this.createBackup();
            
            // Prepare data for storage
            let dataToSave;
            if (this.options.compressionEnabled) {
                dataToSave = this.compressData(this.saveState);
            } else {
                dataToSave = JSON.stringify(this.saveState);
            }
            
            // Save to localStorage
            localStorage.setItem(this.storageKeys.mainSave, dataToSave);
            
            // Mark as having pending changes for sync
            this.syncStatus.pendingChanges = true;
            this.saveSyncStatus();
            
            console.log('Save data written to localStorage');
            this.emit('saveCompleted', this.saveState);
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            this.emit('saveError', error);
            throw error;
        }
    }

    /**
     * Create backup of current save
     */
    async createBackup() {
        try {
            const backups = this.getBackups();
            
            // Add current save as backup
            const backup = {
                timestamp: Date.now(),
                data: { ...this.saveState }
            };
            
            backups.unshift(backup);
            
            // Keep only max number of backups
            if (backups.length > this.options.maxLocalSaves) {
                backups.splice(this.options.maxLocalSaves);
            }
            
            // Save backups
            localStorage.setItem(this.storageKeys.backupSaves, JSON.stringify(backups));
            
            console.log(`Backup created, total backups: ${backups.length}`);
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    }

    /**
     * Get list of available backups
     */
    getBackups() {
        try {
            const backupsData = localStorage.getItem(this.storageKeys.backupSaves);
            return backupsData ? JSON.parse(backupsData) : [];
        } catch (error) {
            console.error('Failed to get backups:', error);
            return [];
        }
    }

    /**
     * Recover from backup
     */
    async recoverFromBackup() {
        try {
            const backups = this.getBackups();
            
            if (backups.length === 0) {
                console.log('No backups available for recovery');
                return false;
            }
            
            // Try each backup until we find a valid one
            for (const backup of backups) {
                const validation = this.validateSaveData(backup.data);
                if (validation.isValid) {
                    this.saveState = { ...this.saveState, ...backup.data };
                    console.log('Recovered from backup:', new Date(backup.timestamp));
                    this.emit('recoveredFromBackup', backup);
                    return true;
                }
            }
            
            console.warn('No valid backups found for recovery');
            return false;
        } catch (error) {
            console.error('Failed to recover from backup:', error);
            return false;
        }
    }

    /**
     * Sync save data with backend
     */
    async syncWithBackend() {
        if (this.syncStatus.syncInProgress) {
            console.log('Sync already in progress');
            return;
        }
        
        this.syncStatus.syncInProgress = true;
        this.emit('syncStarted');
        
        try {
            // Get server save data
            const serverData = await this.getServerSaveData();
            
            // Determine which save is newer
            const localTimestamp = this.saveState.timestamp;
            const serverTimestamp = serverData?.timestamp || 0;
            
            if (serverTimestamp > localTimestamp) {
                // Server data is newer, download and merge
                await this.downloadFromServer(serverData);
            } else if (localTimestamp > serverTimestamp) {
                // Local data is newer, upload to server
                await this.uploadToServer();
            } else {
                // Data is in sync
                console.log('Save data is already in sync');
            }
            
            this.syncStatus.lastSync = Date.now();
            this.syncStatus.pendingChanges = false;
            this.syncStatus.lastError = null;
            
            console.log('Sync completed successfully');
            this.emit('syncCompleted');
        } catch (error) {
            console.error('Sync failed:', error);
            this.syncStatus.lastError = error.message;
            this.emit('syncError', error);
        } finally {
            this.syncStatus.syncInProgress = false;
            this.saveSyncStatus();
        }
    }

    /**
     * Get save data from server
     */
    async getServerSaveData() {
        try {
            const response = await this.apiClient.request('/player/save');
            return response.data.save_data;
        } catch (error) {
            if (error.status === 404) {
                // No save data on server yet
                return null;
            }
            throw error;
        }
    }

    /**
     * Upload save data to server
     */
    async uploadToServer() {
        try {
            await this.apiClient.request('/player/save', {
                method: 'PUT',
                body: JSON.stringify({
                    save_data: this.saveState
                })
            });
            
            console.log('Save data uploaded to server');
        } catch (error) {
            console.error('Failed to upload save data:', error);
            throw error;
        }
    }

    /**
     * Download and merge save data from server
     */
    async downloadFromServer(serverData) {
        try {
            // Validate server data
            const validation = this.validateSaveData(serverData);
            if (!validation.isValid) {
                console.warn('Server save data is invalid:', validation.errors);
                return;
            }
            
            // Create backup before merging
            await this.createBackup();
            
            // Merge server data with local data
            this.saveState = this.mergeSaveData(this.saveState, serverData);
            
            // Save merged data locally
            await this.saveToLocalStorage();
            
            console.log('Save data downloaded and merged from server');
            this.emit('saveDownloaded', serverData);
        } catch (error) {
            console.error('Failed to download save data:', error);
            throw error;
        }
    }

    /**
     * Merge two save data objects intelligently
     */
    mergeSaveData(localData, serverData) {
        const merged = { ...localData };
        
        // Use server data for most fields if it's newer
        merged.player = { ...localData.player, ...serverData.player };
        merged.vehicles = { ...localData.vehicles, ...serverData.vehicles };
        merged.levels = { ...localData.levels, ...serverData.levels };
        merged.achievements = [...new Set([...localData.achievements, ...serverData.achievements])];
        
        // Merge statistics by taking the maximum values
        merged.statistics = {
            totalZombiesKilled: Math.max(
                localData.statistics.totalZombiesKilled,
                serverData.statistics.totalZombiesKilled
            ),
            totalDistanceTraveled: Math.max(
                localData.statistics.totalDistanceTraveled,
                serverData.statistics.totalDistanceTraveled
            ),
            totalGamesPlayed: Math.max(
                localData.statistics.totalGamesPlayed,
                serverData.statistics.totalGamesPlayed
            ),
            totalPlayTime: Math.max(
                localData.statistics.totalPlayTime,
                serverData.statistics.totalPlayTime
            )
        };
        
        // Merge level best scores by taking the highest
        Object.keys(serverData.levels.bestScores).forEach(levelId => {
            const serverScore = serverData.levels.bestScores[levelId];
            const localScore = localData.levels.bestScores[levelId] || 0;
            merged.levels.bestScores[levelId] = Math.max(localScore, serverScore);
        });
        
        // Use server timestamp and version
        merged.timestamp = serverData.timestamp;
        merged.version = serverData.version;
        
        return merged;
    }

    /**
     * Update player data
     */
    updatePlayerData(playerData) {
        this.saveState.player = { ...this.saveState.player, ...playerData };
        this.saveState.timestamp = Date.now();
        
        this.emit('playerDataUpdated', this.saveState.player);
        
        // Auto-save if enabled
        if (this.options.autoSaveInterval > 0) {
            this.debouncedSave();
        }
    }

    /**
     * Update vehicle data
     */
    updateVehicleData(vehicleData) {
        this.saveState.vehicles = { ...this.saveState.vehicles, ...vehicleData };
        this.saveState.timestamp = Date.now();
        
        this.emit('vehicleDataUpdated', this.saveState.vehicles);
        
        if (this.options.autoSaveInterval > 0) {
            this.debouncedSave();
        }
    }

    /**
     * Update level progress
     */
    updateLevelProgress(levelId, progressData) {
        this.saveState.levels.progress[levelId] = {
            ...this.saveState.levels.progress[levelId],
            ...progressData
        };
        
        // Update best score if better
        if (progressData.score && progressData.score > (this.saveState.levels.bestScores[levelId] || 0)) {
            this.saveState.levels.bestScores[levelId] = progressData.score;
        }
        
        // Mark level as completed if specified
        if (progressData.completed && !this.saveState.levels.completed.includes(levelId)) {
            this.saveState.levels.completed.push(levelId);
        }
        
        this.saveState.timestamp = Date.now();
        this.emit('levelProgressUpdated', levelId, progressData);
        
        if (this.options.autoSaveInterval > 0) {
            this.debouncedSave();
        }
    }

    /**
     * Update game statistics
     */
    updateStatistics(stats) {
        Object.keys(stats).forEach(key => {
            if (typeof stats[key] === 'number') {
                this.saveState.statistics[key] = (this.saveState.statistics[key] || 0) + stats[key];
            }
        });
        
        this.saveState.timestamp = Date.now();
        this.emit('statisticsUpdated', this.saveState.statistics);
        
        if (this.options.autoSaveInterval > 0) {
            this.debouncedSave();
        }
    }

    /**
     * Add achievement
     */
    addAchievement(achievement) {
        if (!this.saveState.achievements.find(a => a.id === achievement.id)) {
            this.saveState.achievements.push({
                ...achievement,
                unlockedAt: Date.now()
            });
            
            this.saveState.timestamp = Date.now();
            this.emit('achievementUnlocked', achievement);
            
            if (this.options.autoSaveInterval > 0) {
                this.debouncedSave();
            }
        }
    }

    /**
     * Get current save state
     */
    getSaveState() {
        return { ...this.saveState };
    }

    /**
     * Get specific save data section
     */
    getPlayerData() {
        return { ...this.saveState.player };
    }

    getVehicleData() {
        return { ...this.saveState.vehicles };
    }

    getLevelData() {
        return { ...this.saveState.levels };
    }

    getStatistics() {
        return { ...this.saveState.statistics };
    }

    getAchievements() {
        return [...this.saveState.achievements];
    }

    /**
     * Export save data for backup
     */
    exportSaveData() {
        const exportData = {
            ...this.saveState,
            exportedAt: Date.now(),
            gameVersion: this.saveState.version
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import save data from backup
     */
    async importSaveData(importData) {
        try {
            const parsed = JSON.parse(importData);
            
            // Validate imported data
            const validation = this.validateSaveData(parsed);
            if (!validation.isValid) {
                throw new Error('Invalid save data: ' + validation.errors.join(', '));
            }
            
            // Create backup before importing
            await this.createBackup();
            
            // Import the data
            this.saveState = { ...this.saveState, ...parsed };
            this.saveState.timestamp = Date.now();
            
            // Save imported data
            await this.saveToLocalStorage();
            
            console.log('Save data imported successfully');
            this.emit('saveImported', this.saveState);
            return true;
        } catch (error) {
            console.error('Failed to import save data:', error);
            throw error;
        }
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.saveToLocalStorage().catch(error => {
                console.error('Auto-save failed:', error);
            });
        }, this.options.autoSaveInterval);
        
        console.log(`Auto-save started with ${this.options.autoSaveInterval}ms interval`);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('Auto-save stopped');
        }
    }

    /**
     * Debounced save for frequent updates
     */
    debouncedSave() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        this.saveDebounceTimer = setTimeout(() => {
            this.saveToLocalStorage().catch(error => {
                console.error('Debounced save failed:', error);
            });
        }, 1000); // 1 second debounce
    }

    /**
     * Setup network listeners for sync
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network online, attempting sync');
            if (this.options.syncOnlineEnabled && this.syncStatus.pendingChanges) {
                this.syncWithBackend().catch(error => {
                    console.warn('Sync on network online failed:', error);
                });
            }
        });
        
        window.addEventListener('beforeunload', () => {
            // Force save before page unload
            if (this.syncStatus.pendingChanges) {
                this.saveToLocalStorage();
            }
        });
    }

    /**
     * Load sync status from localStorage
     */
    loadSyncStatus() {
        try {
            const statusData = localStorage.getItem(this.storageKeys.syncStatus);
            if (statusData) {
                this.syncStatus = { ...this.syncStatus, ...JSON.parse(statusData) };
            }
        } catch (error) {
            console.error('Failed to load sync status:', error);
        }
    }

    /**
     * Save sync status to localStorage
     */
    saveSyncStatus() {
        try {
            localStorage.setItem(this.storageKeys.syncStatus, JSON.stringify(this.syncStatus));
        } catch (error) {
            console.error('Failed to save sync status:', error);
        }
    }

    /**
     * Compress data for storage (simple implementation)
     */
    compressData(data) {
        // Simple compression by removing whitespace
        return JSON.stringify(data);
    }

    /**
     * Decompress data from storage
     */
    decompressData(data) {
        return JSON.parse(data);
    }

    /**
     * Get save manager status
     */
    getStatus() {
        return {
            initialized: true,
            autoSaveEnabled: this.autoSaveTimer !== null,
            syncStatus: { ...this.syncStatus },
            saveState: {
                version: this.saveState.version,
                timestamp: this.saveState.timestamp,
                size: JSON.stringify(this.saveState).length
            },
            backupCount: this.getBackups().length
        };
    }

    /**
     * Clear all save data (for testing or reset)
     */
    async clearAllSaveData() {
        try {
            // Clear localStorage
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Reset save state to defaults
            this.saveState = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: {
                    id: null,
                    username: null,
                    currency: 0,
                    level: 1,
                    totalScore: 0,
                    playTime: 0
                },
                vehicles: {
                    owned: [],
                    selected: null,
                    upgrades: {}
                },
                levels: {
                    progress: {},
                    unlocked: ['level_1'],
                    completed: [],
                    bestScores: {}
                },
                settings: {
                    audio: {},
                    graphics: {},
                    controls: {}
                },
                achievements: [],
                statistics: {
                    totalZombiesKilled: 0,
                    totalDistanceTraveled: 0,
                    totalGamesPlayed: 0,
                    totalPlayTime: 0
                },
                gameState: {
                    currentSession: null,
                    lastLevel: null,
                    checkpoint: null
                }
            };
            
            // Reset sync status
            this.syncStatus = {
                lastSync: null,
                pendingChanges: false,
                syncInProgress: false,
                lastError: null
            };
            
            console.log('All save data cleared');
            this.emit('saveDataCleared');
            return true;
        } catch (error) {
            console.error('Failed to clear save data:', error);
            throw error;
        }
    }

    /**
     * Dispose of the save manager
     */
    dispose() {
        this.stopAutoSave();
        
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Final save before disposal
        if (this.syncStatus.pendingChanges) {
            this.saveToLocalStorage().catch(error => {
                console.error('Final save failed:', error);
            });
        }
        
        this.removeAllListeners();
        console.log('SaveManager disposed');
    }
}

export default SaveManager;