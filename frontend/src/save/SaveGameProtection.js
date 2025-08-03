/**
 * Save Game Protection System
 * Handles save game backup, corruption detection, and recovery
 */
class SaveGameProtection {
    constructor(saveManager, config = {}) {
        this.saveManager = saveManager;
        
        // Configuration
        this.config = {
            enableAutoBackup: true,
            enableCorruptionDetection: true,
            enableCloudSync: false,
            maxBackups: 10,
            backupInterval: 300000, // 5 minutes
            compressionEnabled: true,
            encryptionEnabled: false,
            checksumAlgorithm: 'sha256',
            cloudSyncInterval: 600000, // 10 minutes
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // State tracking
        this.backupQueue = [];
        this.backupInProgress = false;
        this.lastBackupTime = 0;
        this.corruptedSaves = new Set();
        
        // Cloud sync state
        this.cloudSyncEnabled = false;
        this.lastCloudSync = 0;
        this.cloudSyncInProgress = false;
        
        // Backup storage
        this.backupStorage = new Map();
        this.backupMetadata = new Map();
        
        // Metrics
        this.metrics = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            corruptionDetected: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0,
            cloudSyncAttempts: 0,
            successfulCloudSyncs: 0
        };

        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }

    /**
     * Initialize save game protection system
     */
    async initialize() {
        console.log('Initializing Save Game Protection System...');
        
        try {
            // Load existing backups
            await this.loadBackupMetadata();
            await this.loadBackupStorage();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start automatic backup if enabled
            if (this.config.enableAutoBackup) {
                this.startAutoBackup();
            }
            
            // Initialize cloud sync if enabled
            if (this.config.enableCloudSync) {
                await this.initializeCloudSync();
            }
            
            // Perform initial corruption check
            if (this.config.enableCorruptionDetection) {
                await this.performCorruptionCheck();
            }
            
            console.log('Save Game Protection System initialized');
            this.emit('initialized', {
                backupCount: this.backupMetadata.size,
                autoBackupEnabled: this.config.enableAutoBackup,
                cloudSyncEnabled: this.cloudSyncEnabled
            });
            
        } catch (error) {
            console.error('Failed to initialize Save Game Protection System:', error);
            throw error;
        }
    }

    /**
     * Load backup metadata from storage
     */
    async loadBackupMetadata() {
        try {
            const stored = localStorage.getItem('save_backup_metadata');
            if (stored) {
                const metadata = JSON.parse(stored);
                this.backupMetadata = new Map(Object.entries(metadata));
                console.log(`Loaded metadata for ${this.backupMetadata.size} backups`);
            }
        } catch (error) {
            console.warn('Failed to load backup metadata:', error);
        }
    }

    /**
     * Save backup metadata to storage
     */
    async saveBackupMetadata() {
        try {
            const metadata = Object.fromEntries(this.backupMetadata);
            localStorage.setItem('save_backup_metadata', JSON.stringify(metadata));
        } catch (error) {
            console.warn('Failed to save backup metadata:', error);
        }
    }

    /**
     * Load backup storage from IndexedDB
     */
    async loadBackupStorage() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SaveGameBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    const backups = getAllRequest.result;
                    backups.forEach(backup => {
                        this.backupStorage.set(backup.id, backup.data);
                    });
                    console.log(`Loaded ${backups.length} backup files`);
                    resolve();
                };
                
                getAllRequest.onerror = () => reject(getAllRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('backups')) {
                    db.createObjectStore('backups', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for save manager events
        if (this.saveManager && this.saveManager.addEventListener) {
            this.saveManager.addEventListener('gameSaved', (event) => {
                this.handleGameSaved(event.detail);
            });
            
            this.saveManager.addEventListener('saveError', (event) => {
                this.handleSaveError(event.detail);
            });
            
            this.saveManager.addEventListener('gameLoaded', (event) => {
                this.handleGameLoaded(event.detail);
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
     * Start automatic backup
     */
    startAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        
        this.backupInterval = setInterval(() => {
            this.performAutoBackup();
        }, this.config.backupInterval);
        
        console.log(`Auto backup started (${this.config.backupInterval}ms interval)`);
    }

    /**
     * Perform automatic backup
     */
    async performAutoBackup() {
        if (this.backupInProgress) {
            console.log('Backup already in progress, skipping auto backup');
            return;
        }

        try {
            // Get current save data
            const saveData = await this.saveManager.getCurrentSaveData();
            if (!saveData) {
                console.log('No save data available for backup');
                return;
            }

            // Check if save data has changed since last backup
            const lastBackup = this.getLatestBackup();
            if (lastBackup && this.isSaveDataIdentical(saveData, lastBackup.originalData)) {
                console.log('Save data unchanged, skipping backup');
                return;
            }

            // Create backup
            await this.createBackup(saveData, 'auto');
            
        } catch (error) {
            console.error('Auto backup failed:', error);
            this.metrics.failedBackups++;
        }
    }

    /**
     * Create backup of save data
     */
    async createBackup(saveData, type = 'manual', metadata = {}) {
        if (this.backupInProgress) {
            throw new Error('Backup already in progress');
        }

        console.log(`Creating ${type} backup...`);
        this.backupInProgress = true;
        const startTime = Date.now();

        try {
            // Generate backup ID
            const backupId = this.generateBackupId(type);
            
            // Calculate checksum for corruption detection
            const checksum = await this.calculateChecksum(saveData);
            
            // Compress data if enabled
            let backupData = saveData;
            if (this.config.compressionEnabled) {
                backupData = await this.compressData(saveData);
            }
            
            // Encrypt data if enabled
            if (this.config.encryptionEnabled) {
                backupData = await this.encryptData(backupData);
            }
            
            // Create backup metadata
            const backupMetadata = {
                id: backupId,
                type,
                timestamp: Date.now(),
                checksum,
                compressed: this.config.compressionEnabled,
                encrypted: this.config.encryptionEnabled,
                size: JSON.stringify(saveData).length,
                compressedSize: JSON.stringify(backupData).length,
                gameVersion: this.saveManager.getGameVersion?.() || '1.0.0',
                playerLevel: saveData.playerLevel || 0,
                playtime: saveData.playtime || 0,
                ...metadata
            };
            
            // Store backup
            await this.storeBackup(backupId, backupData, backupMetadata);
            
            // Update metrics
            this.metrics.totalBackups++;
            this.metrics.successfulBackups++;
            this.lastBackupTime = Date.now();
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            const duration = Date.now() - startTime;
            console.log(`Backup created successfully in ${duration}ms: ${backupId}`);
            
            // Emit backup created event
            this.emit('backupCreated', {
                backupId,
                type,
                metadata: backupMetadata,
                duration
            });
            
            return {
                success: true,
                backupId,
                metadata: backupMetadata,
                duration
            };
            
        } catch (error) {
            console.error('Backup creation failed:', error);
            this.metrics.failedBackups++;
            
            // Emit backup failed event
            this.emit('backupFailed', {
                type,
                error: error.message
            });
            
            throw error;
        } finally {
            this.backupInProgress = false;
        }
    }

    /**
     * Generate unique backup ID
     */
    generateBackupId(type) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${type}_${timestamp}_${random}`;
    }

    /**
     * Calculate checksum for data integrity
     */
    async calculateChecksum(data) {
        const dataString = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataString);
        
        const hashBuffer = await crypto.subtle.digest(
            this.config.checksumAlgorithm.toUpperCase(),
            dataBuffer
        );
        
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Compress data using built-in compression
     */
    async compressData(data) {
        try {
            const dataString = JSON.stringify(data);
            
            // Use CompressionStream if available
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(new TextEncoder().encode(dataString));
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }
                
                return Array.from(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
            } else {
                // Fallback: simple string compression
                return this.simpleCompress(dataString);
            }
        } catch (error) {
            console.warn('Compression failed, using uncompressed data:', error);
            return data;
        }
    }

    /**
     * Simple compression fallback
     */
    simpleCompress(str) {
        // Basic run-length encoding for demonstration
        let compressed = '';
        let count = 1;
        
        for (let i = 0; i < str.length; i++) {
            if (i < str.length - 1 && str[i] === str[i + 1]) {
                count++;
            } else {
                if (count > 1) {
                    compressed += count + str[i];
                } else {
                    compressed += str[i];
                }
                count = 1;
            }
        }
        
        return compressed;
    }

    /**
     * Encrypt data (placeholder implementation)
     */
    async encryptData(data) {
        // Placeholder for encryption implementation
        // In production, use proper encryption like AES-GCM
        console.warn('Encryption not implemented, using plain data');
        return data;
    }

    /**
     * Store backup in IndexedDB
     */
    async storeBackup(backupId, backupData, metadata) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SaveGameBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                const putRequest = store.put({
                    id: backupId,
                    data: backupData,
                    metadata
                });
                
                putRequest.onsuccess = () => {
                    // Store in memory cache
                    this.backupStorage.set(backupId, backupData);
                    this.backupMetadata.set(backupId, metadata);
                    
                    // Save metadata to localStorage
                    this.saveBackupMetadata();
                    
                    resolve();
                };
                
                putRequest.onerror = () => reject(putRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('backups')) {
                    db.createObjectStore('backups', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Cleanup old backups
     */
    async cleanupOldBackups() {
        const backups = Array.from(this.backupMetadata.entries())
            .map(([id, metadata]) => ({ id, ...metadata }))
            .sort((a, b) => b.timestamp - a.timestamp);

        if (backups.length <= this.config.maxBackups) {
            return;
        }

        const backupsToRemove = backups.slice(this.config.maxBackups);
        
        for (const backup of backupsToRemove) {
            try {
                await this.removeBackup(backup.id);
                console.log(`Removed old backup: ${backup.id}`);
            } catch (error) {
                console.warn(`Failed to remove backup ${backup.id}:`, error);
            }
        }
    }

    /**
     * Remove backup
     */
    async removeBackup(backupId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SaveGameBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                const deleteRequest = store.delete(backupId);
                
                deleteRequest.onsuccess = () => {
                    // Remove from memory cache
                    this.backupStorage.delete(backupId);
                    this.backupMetadata.delete(backupId);
                    
                    // Save updated metadata
                    this.saveBackupMetadata();
                    
                    resolve();
                };
                
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
        });
    }

    /**
     * Perform corruption check on save files
     */
    async performCorruptionCheck() {
        console.log('Performing save file corruption check...');
        
        try {
            // Check current save file
            const currentSave = await this.saveManager.getCurrentSaveData();
            if (currentSave) {
                const isCorrupted = await this.checkSaveCorruption(currentSave);
                if (isCorrupted) {
                    console.warn('Current save file is corrupted');
                    this.corruptedSaves.add('current');
                    this.metrics.corruptionDetected++;
                    
                    // Emit corruption detected event
                    this.emit('corruptionDetected', {
                        saveType: 'current',
                        saveData: currentSave
                    });
                }
            }
            
            // Check backup files
            for (const [backupId, metadata] of this.backupMetadata.entries()) {
                try {
                    const backupData = await this.getBackupData(backupId);
                    const isCorrupted = await this.checkBackupCorruption(backupData, metadata);
                    
                    if (isCorrupted) {
                        console.warn(`Backup ${backupId} is corrupted`);
                        this.corruptedSaves.add(backupId);
                        this.metrics.corruptionDetected++;
                        
                        // Emit corruption detected event
                        this.emit('corruptionDetected', {
                            saveType: 'backup',
                            backupId,
                            metadata
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to check backup ${backupId}:`, error);
                }
            }
            
            console.log(`Corruption check completed. Found ${this.corruptedSaves.size} corrupted saves`);
            
        } catch (error) {
            console.error('Corruption check failed:', error);
        }
    }

    /**
     * Check if save data is corrupted
     */
    async checkSaveCorruption(saveData) {
        try {
            // Basic structure validation
            if (!saveData || typeof saveData !== 'object') {
                return true;
            }
            
            // Check required fields
            const requiredFields = ['playerLevel', 'gameProgress', 'timestamp'];
            for (const field of requiredFields) {
                if (!(field in saveData)) {
                    console.warn(`Missing required field: ${field}`);
                    return true;
                }
            }
            
            // Validate data types
            if (typeof saveData.playerLevel !== 'number' || saveData.playerLevel < 0) {
                console.warn('Invalid player level');
                return true;
            }
            
            if (typeof saveData.gameProgress !== 'object') {
                console.warn('Invalid game progress');
                return true;
            }
            
            // Check timestamp validity
            const timestamp = new Date(saveData.timestamp);
            if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
                console.warn('Invalid timestamp');
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('Error during corruption check:', error);
            return true;
        }
    }

    /**
     * Check if backup is corrupted
     */
    async checkBackupCorruption(backupData, metadata) {
        try {
            // Decrypt if encrypted
            let data = backupData;
            if (metadata.encrypted) {
                data = await this.decryptData(data);
            }
            
            // Decompress if compressed
            if (metadata.compressed) {
                data = await this.decompressData(data);
            }
            
            // Calculate checksum and compare
            const calculatedChecksum = await this.calculateChecksum(data);
            if (calculatedChecksum !== metadata.checksum) {
                console.warn(`Checksum mismatch for backup ${metadata.id}`);
                return true;
            }
            
            // Validate save data structure
            return await this.checkSaveCorruption(data);
            
        } catch (error) {
            console.warn(`Error checking backup corruption:`, error);
            return true;
        }
    }

    /**
     * Get backup data
     */
    async getBackupData(backupId) {
        // Try memory cache first
        if (this.backupStorage.has(backupId)) {
            return this.backupStorage.get(backupId);
        }
        
        // Load from IndexedDB
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SaveGameBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                const getRequest = store.get(backupId);
                
                getRequest.onsuccess = () => {
                    const result = getRequest.result;
                    if (result) {
                        // Cache in memory
                        this.backupStorage.set(backupId, result.data);
                        resolve(result.data);
                    } else {
                        reject(new Error(`Backup not found: ${backupId}`));
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    }

    /**
     * Recover from backup
     */
    async recoverFromBackup(backupId) {
        console.log(`Attempting recovery from backup: ${backupId}`);
        this.metrics.recoveryAttempts++;
        
        try {
            const metadata = this.backupMetadata.get(backupId);
            if (!metadata) {
                throw new Error(`Backup metadata not found: ${backupId}`);
            }
            
            // Get backup data
            let backupData = await this.getBackupData(backupId);
            
            // Decrypt if encrypted
            if (metadata.encrypted) {
                backupData = await this.decryptData(backupData);
            }
            
            // Decompress if compressed
            if (metadata.compressed) {
                backupData = await this.decompressData(backupData);
            }
            
            // Verify integrity
            const calculatedChecksum = await this.calculateChecksum(backupData);
            if (calculatedChecksum !== metadata.checksum) {
                throw new Error('Backup integrity check failed');
            }
            
            // Validate save data
            const isCorrupted = await this.checkSaveCorruption(backupData);
            if (isCorrupted) {
                throw new Error('Backup data is corrupted');
            }
            
            // Create backup of current save before recovery
            try {
                const currentSave = await this.saveManager.getCurrentSaveData();
                if (currentSave) {
                    await this.createBackup(currentSave, 'pre-recovery', {
                        recoveryBackupId: backupId
                    });
                }
            } catch (error) {
                console.warn('Failed to backup current save before recovery:', error);
            }
            
            // Restore save data
            await this.saveManager.loadSaveData(backupData);
            
            // Remove from corrupted saves
            this.corruptedSaves.delete('current');
            this.corruptedSaves.delete(backupId);
            
            this.metrics.successfulRecoveries++;
            
            console.log(`Successfully recovered from backup: ${backupId}`);
            
            // Emit recovery completed event
            this.emit('recoveryCompleted', {
                backupId,
                metadata,
                recoveredData: backupData
            });
            
            return {
                success: true,
                backupId,
                metadata,
                message: 'Recovery completed successfully'
            };
            
        } catch (error) {
            console.error(`Recovery failed for backup ${backupId}:`, error);
            
            // Emit recovery failed event
            this.emit('recoveryFailed', {
                backupId,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Get latest backup
     */
    getLatestBackup() {
        const backups = Array.from(this.backupMetadata.entries())
            .map(([id, metadata]) => ({ id, ...metadata }))
            .sort((a, b) => b.timestamp - a.timestamp);
            
        return backups.length > 0 ? backups[0] : null;
    }

    /**
     * Check if save data is identical
     */
    isSaveDataIdentical(data1, data2) {
        try {
            return JSON.stringify(data1) === JSON.stringify(data2);
        } catch (error) {
            return false;
        }
    }

    /**
     * Decompress data
     */
    async decompressData(data) {
        try {
            // Use DecompressionStream if available
            if (typeof DecompressionStream !== 'undefined' && Array.isArray(data)) {
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(new Uint8Array(data));
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }
                
                const decompressed = new TextDecoder().decode(
                    new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
                );
                
                return JSON.parse(decompressed);
            } else {
                // Fallback: simple decompression
                return this.simpleDecompress(data);
            }
        } catch (error) {
            console.warn('Decompression failed:', error);
            return data;
        }
    }

    /**
     * Simple decompression fallback
     */
    simpleDecompress(str) {
        if (typeof str !== 'string') {
            return str;
        }
        
        let decompressed = '';
        let i = 0;
        
        while (i < str.length) {
            if (/\d/.test(str[i])) {
                const count = parseInt(str[i]);
                const char = str[i + 1];
                decompressed += char.repeat(count);
                i += 2;
            } else {
                decompressed += str[i];
                i++;
            }
        }
        
        try {
            return JSON.parse(decompressed);
        } catch (error) {
            return decompressed;
        }
    }

    /**
     * Decrypt data (placeholder)
     */
    async decryptData(data) {
        // Placeholder for decryption implementation
        console.warn('Decryption not implemented, using plain data');
        return data;
    } 
   /**
     * Export save game
     */
    async exportSaveGame(saveData, options = {}) {
        console.log('Exporting save game...');
        
        try {
            const exportData = {
                version: '1.0',
                gameVersion: this.saveManager.getGameVersion?.() || '1.0.0',
                exportTimestamp: Date.now(),
                saveData: saveData || await this.saveManager.getCurrentSaveData(),
                metadata: {
                    playerName: saveData?.playerName || 'Unknown',
                    playerLevel: saveData?.playerLevel || 0,
                    playtime: saveData?.playtime || 0,
                    gameProgress: saveData?.gameProgress || {},
                    ...options.metadata
                }
            };
            
            // Calculate checksum for integrity
            exportData.checksum = await this.calculateChecksum(exportData.saveData);
            
            // Compress if requested
            if (options.compress !== false) {
                exportData.compressed = true;
                exportData.saveData = await this.compressData(exportData.saveData);
            }
            
            // Create downloadable file
            const exportString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([exportString], { type: 'application/json' });
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = options.filename || `savegame_${timestamp}.json`;
            
            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`Save game exported: ${filename}`);
            
            // Emit export completed event
            this.emit('exportCompleted', {
                filename,
                size: blob.size,
                metadata: exportData.metadata
            });
            
            return {
                success: true,
                filename,
                size: blob.size,
                metadata: exportData.metadata
            };
            
        } catch (error) {
            console.error('Save game export failed:', error);
            
            // Emit export failed event
            this.emit('exportFailed', {
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Import save game
     */
    async importSaveGame(file) {
        console.log('Importing save game...');
        
        try {
            // Read file content
            const fileContent = await this.readFileContent(file);
            const importData = JSON.parse(fileContent);
            
            // Validate import data structure
            if (!this.validateImportData(importData)) {
                throw new Error('Invalid save game file format');
            }
            
            // Extract save data
            let saveData = importData.saveData;
            
            // Decompress if compressed
            if (importData.compressed) {
                saveData = await this.decompressData(saveData);
            }
            
            // Verify checksum if available
            if (importData.checksum) {
                const calculatedChecksum = await this.calculateChecksum(saveData);
                if (calculatedChecksum !== importData.checksum) {
                    throw new Error('Save game file integrity check failed');
                }
            }
            
            // Validate save data
            const isCorrupted = await this.checkSaveCorruption(saveData);
            if (isCorrupted) {
                throw new Error('Imported save data is corrupted or invalid');
            }
            
            // Create backup of current save before import
            try {
                const currentSave = await this.saveManager.getCurrentSaveData();
                if (currentSave) {
                    await this.createBackup(currentSave, 'pre-import', {
                        importFilename: file.name,
                        importTimestamp: Date.now()
                    });
                }
            } catch (error) {
                console.warn('Failed to backup current save before import:', error);
            }
            
            // Load imported save data
            await this.saveManager.loadSaveData(saveData);
            
            console.log('Save game imported successfully');
            
            // Emit import completed event
            this.emit('importCompleted', {
                filename: file.name,
                metadata: importData.metadata,
                gameVersion: importData.gameVersion
            });
            
            return {
                success: true,
                filename: file.name,
                metadata: importData.metadata,
                gameVersion: importData.gameVersion
            };
            
        } catch (error) {
            console.error('Save game import failed:', error);
            
            // Emit import failed event
            this.emit('importFailed', {
                filename: file.name,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Read file content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Validate import data structure
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check required fields
        const requiredFields = ['version', 'saveData'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                console.warn(`Missing required field in import data: ${field}`);
                return false;
            }
        }
        
        // Validate version compatibility
        if (data.version !== '1.0') {
            console.warn(`Unsupported save game version: ${data.version}`);
            return false;
        }
        
        return true;
    }

    /**
     * Initialize cloud sync
     */
    async initializeCloudSync() {
        console.log('Initializing cloud sync...');
        
        try {
            // Check if cloud sync is available
            if (!this.isCloudSyncAvailable()) {
                console.warn('Cloud sync not available');
                return;
            }
            
            // Initialize cloud storage
            await this.initializeCloudStorage();
            
            // Start cloud sync interval
            this.startCloudSync();
            
            this.cloudSyncEnabled = true;
            console.log('Cloud sync initialized');
            
        } catch (error) {
            console.error('Failed to initialize cloud sync:', error);
            this.cloudSyncEnabled = false;
        }
    }

    /**
     * Check if cloud sync is available
     */
    isCloudSyncAvailable() {
        // Check for required APIs and network connectivity
        return navigator.onLine && 
               typeof fetch !== 'undefined' && 
               this.config.enableCloudSync;
    }

    /**
     * Initialize cloud storage
     */
    async initializeCloudStorage() {
        // Placeholder for cloud storage initialization
        // In production, this would initialize connection to cloud provider
        console.log('Cloud storage initialized (placeholder)');
    }

    /**
     * Start cloud sync
     */
    startCloudSync() {
        if (this.cloudSyncInterval) {
            clearInterval(this.cloudSyncInterval);
        }
        
        this.cloudSyncInterval = setInterval(() => {
            this.performCloudSync();
        }, this.config.cloudSyncInterval);
        
        console.log(`Cloud sync started (${this.config.cloudSyncInterval}ms interval)`);
    }

    /**
     * Perform cloud sync
     */
    async performCloudSync() {
        if (!this.cloudSyncEnabled || this.cloudSyncInProgress || !navigator.onLine) {
            return;
        }
        
        console.log('Performing cloud sync...');
        this.cloudSyncInProgress = true;
        this.metrics.cloudSyncAttempts++;
        
        try {
            // Get current save data
            const saveData = await this.saveManager.getCurrentSaveData();
            if (!saveData) {
                console.log('No save data to sync');
                return;
            }
            
            // Check if save has changed since last sync
            const lastCloudSave = await this.getCloudSave();
            if (lastCloudSave && this.isSaveDataIdentical(saveData, lastCloudSave.data)) {
                console.log('Save data unchanged, skipping cloud sync');
                return;
            }
            
            // Upload to cloud
            await this.uploadToCloud(saveData);
            
            this.lastCloudSync = Date.now();
            this.metrics.successfulCloudSyncs++;
            
            console.log('Cloud sync completed successfully');
            
            // Emit cloud sync completed event
            this.emit('cloudSyncCompleted', {
                timestamp: this.lastCloudSync,
                saveData
            });
            
        } catch (error) {
            console.error('Cloud sync failed:', error);
            
            // Emit cloud sync failed event
            this.emit('cloudSyncFailed', {
                error: error.message
            });
        } finally {
            this.cloudSyncInProgress = false;
        }
    }

    /**
     * Upload save to cloud (placeholder)
     */
    async uploadToCloud(saveData) {
        // Placeholder for cloud upload implementation
        console.log('Uploading to cloud (placeholder)');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production, this would upload to actual cloud storage
        return {
            success: true,
            cloudId: 'cloud_' + Date.now(),
            timestamp: Date.now()
        };
    }

    /**
     * Get cloud save (placeholder)
     */
    async getCloudSave() {
        // Placeholder for cloud download implementation
        console.log('Getting cloud save (placeholder)');
        
        // In production, this would download from actual cloud storage
        return null;
    }

    /**
     * Handle game saved event
     */
    handleGameSaved(saveInfo) {
        console.log('Game saved, checking for backup...');
        
        // Trigger backup if auto backup is enabled
        if (this.config.enableAutoBackup) {
            // Debounce backup creation
            clearTimeout(this.backupTimeout);
            this.backupTimeout = setTimeout(() => {
                this.performAutoBackup();
            }, 5000); // Wait 5 seconds after save
        }
    }

    /**
     * Handle save error event
     */
    handleSaveError(errorInfo) {
        console.warn('Save error detected:', errorInfo);
        
        // Mark current save as potentially corrupted
        this.corruptedSaves.add('current');
        
        // Emit save error event
        this.emit('saveErrorDetected', errorInfo);
    }

    /**
     * Handle game loaded event
     */
    handleGameLoaded(loadInfo) {
        console.log('Game loaded, performing corruption check...');
        
        // Perform corruption check on loaded data
        setTimeout(() => {
            this.performCorruptionCheck();
        }, 1000);
    }

    /**
     * Handle network restore
     */
    handleNetworkRestore() {
        console.log('Network restored - resuming cloud sync');
        
        if (this.cloudSyncEnabled) {
            // Perform immediate sync
            setTimeout(() => {
                this.performCloudSync();
            }, 2000);
        }
    }

    /**
     * Handle network loss
     */
    handleNetworkLoss() {
        console.log('Network lost - pausing cloud sync');
        
        // Cloud sync will automatically pause due to network check
    }

    /**
     * Handle application shutdown
     */
    handleApplicationShutdown() {
        console.log('Application shutting down - saving backup state');
        
        // Save current state
        this.saveBackupMetadata();
        
        // Perform final backup if needed
        if (this.config.enableAutoBackup && !this.backupInProgress) {
            try {
                this.performAutoBackup();
            } catch (error) {
                console.warn('Failed to create shutdown backup:', error);
            }
        }
    }

    /**
     * Get backup list
     */
    getBackupList() {
        return Array.from(this.backupMetadata.entries())
            .map(([id, metadata]) => ({ id, ...metadata }))
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            backupCount: this.backupMetadata.size,
            lastBackupTime: this.lastBackupTime,
            backupInProgress: this.backupInProgress,
            corruptedSaves: Array.from(this.corruptedSaves),
            cloudSyncEnabled: this.cloudSyncEnabled,
            lastCloudSync: this.lastCloudSync,
            cloudSyncInProgress: this.cloudSyncInProgress,
            metrics: { ...this.metrics }
        };
    }

    /**
     * Force backup creation
     */
    async forceBackup(type = 'manual') {
        console.log('Forcing backup creation...');
        
        const saveData = await this.saveManager.getCurrentSaveData();
        if (!saveData) {
            throw new Error('No save data available for backup');
        }
        
        return await this.createBackup(saveData, type);
    }

    /**
     * Force cloud sync
     */
    async forceCloudSync() {
        if (!this.cloudSyncEnabled) {
            throw new Error('Cloud sync not enabled');
        }
        
        console.log('Forcing cloud sync...');
        return await this.performCloudSync();
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
        
        // Restart intervals if changed
        if (newConfig.backupInterval && this.config.enableAutoBackup) {
            this.startAutoBackup();
        }
        
        if (newConfig.cloudSyncInterval && this.cloudSyncEnabled) {
            this.startCloudSync();
        }
        
        console.log('Save Game Protection configuration updated:', this.config);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('Destroying Save Game Protection System');
        
        // Clear intervals
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        
        if (this.cloudSyncInterval) {
            clearInterval(this.cloudSyncInterval);
        }
        
        if (this.backupTimeout) {
            clearTimeout(this.backupTimeout);
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Save final state
        this.saveBackupMetadata();
        
        // Clear caches
        this.backupStorage.clear();
        this.backupMetadata.clear();
        this.corruptedSaves.clear();
        
        console.log('Save Game Protection System destroyed');
    }
}

export default SaveGameProtection;