/**
 * SaveManager for Zombie Car Game
 * Handles local storage persistence of game progress, vehicles, upgrades, and statistics
 * Focused implementation for the zombie car game requirements
 */
export class ZombieCarSaveManager {
    constructor() {
        this.saveKey = 'zombie_car_game_save';
        this.backupKey = 'zombie_car_game_backup';
        this.version = '1.0.0';
        
        // Default save data structure with starter car and initial game state
        this.defaultSaveData = {
            version: this.version,
            timestamp: Date.now(),
            
            // Player currency and statistics (Requirements 5.3, 5.4)
            player: {
                money: 0,
                bestDistance: 0,
                totalRuns: 0,
                totalZombiesKilled: 0,
                totalMoneyEarned: 0,
                totalPlayTime: 0
            },
            
            // Vehicle ownership and upgrades (Requirement 2.4)
            vehicles: {
                owned: ['STARTER_CAR'],
                selected: 'STARTER_CAR',
                upgrades: {
                    STARTER_CAR: {
                        engine: 0,
                        fuel: 0,
                        armor: 0,
                        weapon: 0,
                        wheels: 0
                    }
                }
            },
            
            // Stage progression
            stages: {
                currentStage: 0,
                unlockedStages: [0],
                stageProgress: {
                    0: { bestDistance: 0, completed: false }
                }
            },
            
            // Game settings
            settings: {
                masterVolume: 1.0,
                effectsVolume: 1.0,
                musicVolume: 0.7,
                showFPS: false
            },
            
            // Game completion status
            gameCompleted: false
        };
        
        this.currentSave = null;
    }

    /**
     * Initialize the save manager and load existing save data
     */
    async initialize() {
        try {
            await this.loadSaveData();
            console.log('ZombieCarSaveManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize ZombieCarSaveManager:', error);
            throw error;
        }
    }

    /**
     * Load save data from localStorage with error handling and validation
     */
    async loadSaveData() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const validationResult = this.validateSaveData(parsedData);
                
                if (validationResult.isValid) {
                    // Deep merge with default structure to ensure all fields exist
                    this.currentSave = this.deepMerge(this.defaultSaveData, parsedData);
                    console.log('Save data loaded successfully');
                    return this.currentSave;
                } else {
                    console.warn('Save data validation failed:', validationResult.errors);
                    
                    // Attempt to repair the save data
                    const repairedData = this.repairSaveData(parsedData);
                    if (repairedData) {
                        this.currentSave = repairedData;
                        await this.saveToDisk();
                        console.log('Save data repaired and loaded');
                        return this.currentSave;
                    } else {
                        // Try to load from backup
                        const backupLoaded = await this.loadFromBackup();
                        if (backupLoaded) {
                            return backupLoaded;
                        }
                        
                        // Use default data
                        this.currentSave = { ...this.defaultSaveData };
                        await this.saveToDisk();
                        console.log('Using default save data due to repair failure');
                        return this.currentSave;
                    }
                }
            } else {
                // No save data exists, create default
                this.currentSave = { ...this.defaultSaveData };
                await this.saveToDisk();
                console.log('Created new save data with defaults');
                return this.currentSave;
            }
        } catch (error) {
            console.error('Error loading save data:', error);
            
            // Try to recover from backup
            const backupLoaded = await this.loadFromBackup();
            if (backupLoaded) {
                return backupLoaded;
            }
            
            // Last resort: use default data
            this.currentSave = { ...this.defaultSaveData };
            console.log('Using default save data due to load error');
            return this.currentSave;
        }
    }

    /**
     * Validate save data structure and integrity
     */
    validateSaveData(data) {
        const errors = [];
        
        // Check required top-level fields
        if (!data.version) errors.push('Missing version');
        if (!data.timestamp) errors.push('Missing timestamp');
        if (!data.player) errors.push('Missing player data');
        if (!data.vehicles) errors.push('Missing vehicles data');
        if (!data.stages) errors.push('Missing stages data');
        
        // Validate player data
        if (data.player) {
            if (typeof data.player.money !== 'number' || data.player.money < 0) {
                errors.push('Invalid player money');
            }
            if (typeof data.player.bestDistance !== 'number' || data.player.bestDistance < 0) {
                errors.push('Invalid best distance');
            }
            if (typeof data.player.totalRuns !== 'number' || data.player.totalRuns < 0) {
                errors.push('Invalid total runs');
            }
        }
        
        // Validate vehicles data
        if (data.vehicles) {
            if (!Array.isArray(data.vehicles.owned)) {
                errors.push('Invalid vehicles.owned - must be array');
            }
            if (!data.vehicles.selected) {
                errors.push('Missing selected vehicle');
            }
            if (!data.vehicles.upgrades || typeof data.vehicles.upgrades !== 'object') {
                errors.push('Invalid vehicles.upgrades');
            }
        }
        
        // Validate stages data
        if (data.stages) {
            if (typeof data.stages.currentStage !== 'number') {
                errors.push('Invalid current stage');
            }
            if (!Array.isArray(data.stages.unlockedStages)) {
                errors.push('Invalid unlocked stages');
            }
        }
        
        // Check timestamp validity (not too old)
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
    repairSaveData(data) {
        try {
            const repaired = { ...this.defaultSaveData };
            
            // Merge valid player data
            if (data.player && typeof data.player === 'object') {
                if (typeof data.player.money === 'number' && data.player.money >= 0) {
                    repaired.player.money = data.player.money;
                }
                if (typeof data.player.bestDistance === 'number' && data.player.bestDistance >= 0) {
                    repaired.player.bestDistance = data.player.bestDistance;
                }
                if (typeof data.player.totalRuns === 'number' && data.player.totalRuns >= 0) {
                    repaired.player.totalRuns = data.player.totalRuns;
                }
                if (typeof data.player.totalZombiesKilled === 'number' && data.player.totalZombiesKilled >= 0) {
                    repaired.player.totalZombiesKilled = data.player.totalZombiesKilled;
                }
                if (typeof data.player.totalMoneyEarned === 'number' && data.player.totalMoneyEarned >= 0) {
                    repaired.player.totalMoneyEarned = data.player.totalMoneyEarned;
                }
            }
            
            // Merge valid vehicle data
            if (data.vehicles && typeof data.vehicles === 'object') {
                if (Array.isArray(data.vehicles.owned) && data.vehicles.owned.length > 0) {
                    repaired.vehicles.owned = data.vehicles.owned;
                }
                if (typeof data.vehicles.selected === 'string') {
                    repaired.vehicles.selected = data.vehicles.selected;
                }
                if (data.vehicles.upgrades && typeof data.vehicles.upgrades === 'object') {
                    repaired.vehicles.upgrades = { ...repaired.vehicles.upgrades, ...data.vehicles.upgrades };
                }
            }
            
            // Merge valid stage data
            if (data.stages && typeof data.stages === 'object') {
                if (typeof data.stages.currentStage === 'number' && data.stages.currentStage >= 0) {
                    repaired.stages.currentStage = data.stages.currentStage;
                }
                if (Array.isArray(data.stages.unlockedStages)) {
                    repaired.stages.unlockedStages = data.stages.unlockedStages;
                }
                if (data.stages.stageProgress && typeof data.stages.stageProgress === 'object') {
                    repaired.stages.stageProgress = { ...repaired.stages.stageProgress, ...data.stages.stageProgress };
                }
            }
            
            // Merge valid settings
            if (data.settings && typeof data.settings === 'object') {
                repaired.settings = { ...repaired.settings, ...data.settings };
            }
            
            // Update timestamp and version
            repaired.timestamp = Date.now();
            repaired.version = this.version;
            
            console.log('Save data repair completed');
            return repaired;
        } catch (error) {
            console.error('Failed to repair save data:', error);
            return null;
        }
    }

    /**
     * Save current data to localStorage with backup creation
     */
    async saveToDisk() {
        try {
            if (!this.currentSave) {
                throw new Error('No save data to write');
            }
            
            // Create backup before saving
            await this.createBackup();
            
            // Update timestamp
            this.currentSave.timestamp = Date.now();
            
            // Save to localStorage
            const saveDataString = JSON.stringify(this.currentSave);
            localStorage.setItem(this.saveKey, saveDataString);
            
            console.log('Save data written to localStorage');
            return true;
        } catch (error) {
            console.error('Failed to save data to disk:', error);
            throw error;
        }
    }

    /**
     * Create backup of current save data
     */
    async createBackup() {
        try {
            if (this.currentSave) {
                const backupData = {
                    timestamp: Date.now(),
                    data: { ...this.currentSave }
                };
                localStorage.setItem(this.backupKey, JSON.stringify(backupData));
                console.log('Backup created');
            }
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    }

    /**
     * Load from backup if main save fails
     */
    async loadFromBackup() {
        try {
            const backupData = localStorage.getItem(this.backupKey);
            if (backupData) {
                const parsed = JSON.parse(backupData);
                const validationResult = this.validateSaveData(parsed.data);
                
                if (validationResult.isValid) {
                    this.currentSave = parsed.data;
                    console.log('Loaded from backup successfully');
                    return this.currentSave;
                }
            }
            
            console.log('No valid backup found');
            return null;
        } catch (error) {
            console.error('Failed to load from backup:', error);
            return null;
        }
    }

    /**
     * Get current save data
     */
    getSaveData() {
        return this.currentSave ? { ...this.currentSave } : null;
    }

    /**
     * Update player money and statistics
     */
    async updatePlayerData(updates) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        // Update player data
        Object.keys(updates).forEach(key => {
            if (key in this.currentSave.player) {
                this.currentSave.player[key] = updates[key];
            }
        });
        
        await this.saveToDisk();
        return this.currentSave.player;
    }

    /**
     * Add money to player account
     */
    async addMoney(amount) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        this.currentSave.player.money += amount;
        this.currentSave.player.totalMoneyEarned += amount;
        
        await this.saveToDisk();
        return this.currentSave.player.money;
    }

    /**
     * Spend money from player account
     */
    async spendMoney(amount) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        if (this.currentSave.player.money < amount) {
            throw new Error('Insufficient funds');
        }
        
        this.currentSave.player.money -= amount;
        
        await this.saveToDisk();
        return this.currentSave.player.money;
    }

    /**
     * Purchase a new vehicle
     */
    async purchaseVehicle(vehicleType) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        if (this.currentSave.vehicles.owned.includes(vehicleType)) {
            throw new Error('Vehicle already owned');
        }
        
        // Add vehicle to owned list
        this.currentSave.vehicles.owned.push(vehicleType);
        
        // Initialize upgrade levels for new vehicle
        this.currentSave.vehicles.upgrades[vehicleType] = {
            engine: 0,
            fuel: 0,
            armor: 0,
            weapon: 0,
            wheels: 0
        };
        
        await this.saveToDisk();
        return this.currentSave.vehicles;
    }

    /**
     * Select a vehicle
     */
    async selectVehicle(vehicleType) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        if (!this.currentSave.vehicles.owned.includes(vehicleType)) {
            throw new Error('Vehicle not owned');
        }
        
        this.currentSave.vehicles.selected = vehicleType;
        
        await this.saveToDisk();
        return vehicleType;
    }

    /**
     * Upgrade a vehicle component
     */
    async upgradeVehicle(vehicleType, component, newLevel) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        if (!this.currentSave.vehicles.owned.includes(vehicleType)) {
            throw new Error('Vehicle not owned');
        }
        
        if (!this.currentSave.vehicles.upgrades[vehicleType]) {
            this.currentSave.vehicles.upgrades[vehicleType] = {
                engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
            };
        }
        
        this.currentSave.vehicles.upgrades[vehicleType][component] = newLevel;
        
        await this.saveToDisk();
        return this.currentSave.vehicles.upgrades[vehicleType];
    }

    /**
     * Update run statistics
     */
    async updateRunStats(distance, zombiesKilled, moneyEarned) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        // Update statistics
        this.currentSave.player.totalRuns += 1;
        this.currentSave.player.totalZombiesKilled += zombiesKilled;
        
        // Update best distance if this run was better
        if (distance > this.currentSave.player.bestDistance) {
            this.currentSave.player.bestDistance = distance;
        }
        
        // Add money earned
        await this.addMoney(moneyEarned);
        
        return this.currentSave.player;
    }

    /**
     * Update stage progress
     */
    async updateStageProgress(stageId, distance, completed = false) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        if (!this.currentSave.stages.stageProgress[stageId]) {
            this.currentSave.stages.stageProgress[stageId] = {
                bestDistance: 0,
                completed: false
            };
        }
        
        // Update best distance for this stage
        if (distance > this.currentSave.stages.stageProgress[stageId].bestDistance) {
            this.currentSave.stages.stageProgress[stageId].bestDistance = distance;
        }
        
        // Mark as completed if specified
        if (completed) {
            this.currentSave.stages.stageProgress[stageId].completed = true;
            
            // Unlock next stage
            const nextStage = stageId + 1;
            if (!this.currentSave.stages.unlockedStages.includes(nextStage)) {
                this.currentSave.stages.unlockedStages.push(nextStage);
            }
        }
        
        await this.saveToDisk();
        return this.currentSave.stages;
    }

    /**
     * Mark game as completed
     */
    async completeGame() {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        this.currentSave.gameCompleted = true;
        
        await this.saveToDisk();
        return true;
    }

    /**
     * Update game settings
     */
    async updateSettings(settings) {
        if (!this.currentSave) {
            throw new Error('No save data loaded');
        }
        
        this.currentSave.settings = { ...this.currentSave.settings, ...settings };
        
        await this.saveToDisk();
        return this.currentSave.settings;
    }

    /**
     * Reset save data to defaults
     */
    async resetSaveData() {
        this.currentSave = { 
            ...this.defaultSaveData,
            timestamp: Date.now()
        };
        await this.saveToDisk();
        console.log('Save data reset to defaults');
        return this.currentSave;
    }

    /**
     * Export save data for backup
     */
    exportSaveData() {
        if (!this.currentSave) {
            throw new Error('No save data to export');
        }
        
        const exportData = {
            ...this.currentSave,
            exportedAt: Date.now(),
            gameVersion: this.version
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import save data from backup
     */
    async importSaveData(importDataString) {
        try {
            const importData = JSON.parse(importDataString);
            
            // Validate imported data
            const validationResult = this.validateSaveData(importData);
            if (!validationResult.isValid) {
                throw new Error('Invalid save data: ' + validationResult.errors.join(', '));
            }
            
            // Create backup before importing
            await this.createBackup();
            
            // Import the data
            this.currentSave = { ...importData };
            this.currentSave.timestamp = Date.now();
            
            // Save imported data
            await this.saveToDisk();
            
            console.log('Save data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import save data:', error);
            throw error;
        }
    }

    /**
     * Deep merge two objects, preserving nested structures
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // Recursively merge objects
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    // Direct assignment for primitives and arrays
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
}

// Export singleton instance
export const zombieCarSaveManager = new ZombieCarSaveManager();