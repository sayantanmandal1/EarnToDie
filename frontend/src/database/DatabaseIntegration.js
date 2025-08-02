/**
 * Database Integration Layer
 * Bridges the game systems with the local SQLite database
 */

import { databaseManager } from './DatabaseManager.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class DatabaseIntegration {
    constructor() {
        this.isInitialized = false;
        this.isElectron = electronIntegration.isElectron;
        this.logger = electronIntegration.getLogger();
        
        // Cache for frequently accessed data
        this.cache = {
            playerProfile: null,
            vehicles: null,
            levelProgress: null,
            statistics: null
        };
        
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;
    }

    /**
     * Initialize database integration
     */
    async initialize() {
        if (!this.isElectron) {
            this.logger.warn('Database integration only available in Electron environment');
            return false;
        }

        try {
            await databaseManager.initialize();
            this.isInitialized = true;
            
            // Load initial cache
            await this.refreshCache();
            
            this.logger.info('Database integration initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize database integration:', error);
            throw error;
        }
    }

    /**
     * Check if database is available
     */
    isAvailable() {
        return this.isInitialized && this.isElectron;
    }

    /**
     * Refresh cache with latest data
     */
    async refreshCache() {
        if (!this.isAvailable()) return;

        try {
            this.cache.playerProfile = databaseManager.getPlayerProfile();
            this.cache.vehicles = databaseManager.getPlayerVehicles();
            this.cache.levelProgress = databaseManager.getLevelProgress();
            this.cache.statistics = databaseManager.getPlayerStatistics();
            this.lastCacheUpdate = Date.now();
            
        } catch (error) {
            this.logger.error('Failed to refresh cache:', error);
        }
    }

    /**
     * Check if cache needs refresh
     */
    shouldRefreshCache() {
        return Date.now() - this.lastCacheUpdate > this.cacheTimeout;
    }

    /**
     * Player Profile Operations
     */
    
    async getPlayerProfile() {
        if (!this.isAvailable()) {
            return this.getDefaultPlayerProfile();
        }

        if (this.shouldRefreshCache()) {
            await this.refreshCache();
        }

        return this.cache.playerProfile || this.getDefaultPlayerProfile();
    }

    getDefaultPlayerProfile() {
        return {
            id: 1,
            username: 'Player',
            level: 1,
            experience: 0,
            total_currency: 1000, // Starting currency
            total_distance: 0,
            total_zombies_killed: 0,
            total_play_time: 0,
            settings: {
                audio: { master: 0.8, effects: 0.8, music: 0.6 },
                graphics: { quality: 'high', shadows: true, particles: true },
                controls: { sensitivity: 1.0, invertY: false }
            }
        };
    }

    async updatePlayerProfile(updates) {
        if (!this.isAvailable()) {
            this.logger.warn('Cannot update player profile - database not available');
            return false;
        }

        try {
            const result = databaseManager.updatePlayerProfile(1, updates);
            
            // Update cache
            if (this.cache.playerProfile) {
                Object.assign(this.cache.playerProfile, updates);
            }
            
            return result.changes > 0;
            
        } catch (error) {
            this.logger.error('Failed to update player profile:', error);
            return false;
        }
    }

    async addExperience(amount) {
        const profile = await this.getPlayerProfile();
        const newExperience = profile.experience + amount;
        const newLevel = Math.floor(newExperience / 1000) + 1;
        
        return await this.updatePlayerProfile({
            experience: newExperience,
            level: Math.max(profile.level, newLevel)
        });
    }

    async addCurrency(amount) {
        const profile = await this.getPlayerProfile();
        return await this.updatePlayerProfile({
            total_currency: profile.total_currency + amount
        });
    }

    async spendCurrency(amount) {
        const profile = await this.getPlayerProfile();
        if (profile.total_currency < amount) {
            return false; // Insufficient funds
        }
        
        return await this.updatePlayerProfile({
            total_currency: profile.total_currency - amount
        });
    }

    /**
     * Vehicle Operations
     */
    
    async getPlayerVehicles() {
        if (!this.isAvailable()) {
            return this.getDefaultVehicles();
        }

        if (this.shouldRefreshCache()) {
            await this.refreshCache();
        }

        return this.cache.vehicles || this.getDefaultVehicles();
    }

    getDefaultVehicles() {
        return [
            {
                id: 1,
                vehicle_type: 'sedan',
                is_owned: true,
                upgrade_levels: { engine: 1, armor: 1, tires: 1, fuel: 1 },
                customization: { color: '#ff0000', decals: [] },
                total_distance: 0,
                total_kills: 0
            }
        ];
    }

    async purchaseVehicle(vehicleType, price) {
        if (!await this.spendCurrency(price)) {
            return false; // Insufficient funds
        }

        try {
            const result = databaseManager.addPlayerVehicle(1, {
                vehicle_type: vehicleType,
                is_owned: true,
                upgrade_levels: { engine: 1, armor: 1, tires: 1, fuel: 1 },
                customization: { color: '#ffffff', decals: [] }
            });

            // Refresh cache
            await this.refreshCache();
            
            return result.lastInsertRowid;
            
        } catch (error) {
            // Refund currency on error
            await this.addCurrency(price);
            this.logger.error('Failed to purchase vehicle:', error);
            return false;
        }
    }

    async upgradeVehicle(vehicleId, upgradeType, upgradeCost) {
        if (!await this.spendCurrency(upgradeCost)) {
            return false; // Insufficient funds
        }

        try {
            const vehicles = await this.getPlayerVehicles();
            const vehicle = vehicles.find(v => v.id === vehicleId);
            
            if (!vehicle) {
                await this.addCurrency(upgradeCost); // Refund
                return false;
            }

            const newUpgradeLevels = { ...vehicle.upgrade_levels };
            newUpgradeLevels[upgradeType] = (newUpgradeLevels[upgradeType] || 1) + 1;

            const result = databaseManager.updatePlayerVehicle(vehicleId, {
                upgrade_levels: newUpgradeLevels
            });

            // Refresh cache
            await this.refreshCache();
            
            return result.changes > 0;
            
        } catch (error) {
            // Refund currency on error
            await this.addCurrency(upgradeCost);
            this.logger.error('Failed to upgrade vehicle:', error);
            return false;
        }
    }

    /**
     * Level Progress Operations
     */
    
    async getLevelProgress(levelId = null) {
        if (!this.isAvailable()) {
            return levelId ? null : [];
        }

        if (this.shouldRefreshCache()) {
            await this.refreshCache();
        }

        if (levelId) {
            return this.cache.levelProgress?.find(p => p.level_id === levelId) || null;
        }
        
        return this.cache.levelProgress || [];
    }

    async updateLevelProgress(levelId, progressData) {
        if (!this.isAvailable()) {
            this.logger.warn('Cannot update level progress - database not available');
            return false;
        }

        try {
            // Get existing progress
            const existing = await this.getLevelProgress(levelId);
            
            // Merge with new data, keeping best scores
            const mergedData = {
                best_score: Math.max(existing?.best_score || 0, progressData.score || 0),
                best_time: existing?.best_time ? 
                    Math.min(existing.best_time, progressData.time || Infinity) : 
                    progressData.time,
                completion_count: (existing?.completion_count || 0) + (progressData.completed ? 1 : 0),
                stars_earned: Math.max(existing?.stars_earned || 0, progressData.stars || 0),
                is_completed: (existing?.is_completed || false) || (progressData.completed || false),
                first_completed_at: existing?.first_completed_at || 
                    (progressData.completed ? new Date().toISOString() : null)
            };

            const result = databaseManager.updateLevelProgress(1, levelId, mergedData);
            
            // Refresh cache
            await this.refreshCache();
            
            return result.changes > 0;
            
        } catch (error) {
            this.logger.error('Failed to update level progress:', error);
            return false;
        }
    }

    /**
     * Game Session Operations
     */
    
    async startGameSession(levelId, vehicleType) {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return databaseManager.startGameSession(1, { level_id: levelId, vehicle_type: vehicleType });
        } catch (error) {
            this.logger.error('Failed to start game session:', error);
            return null;
        }
    }

    async endGameSession(sessionId, sessionData) {
        if (!this.isAvailable() || !sessionId) {
            return false;
        }

        try {
            const result = databaseManager.endGameSession(sessionId, sessionData);
            
            // Update player statistics
            await this.updateStatistics(sessionData);
            
            // Update level progress
            if (sessionData.level_id) {
                await this.updateLevelProgress(sessionData.level_id, {
                    score: sessionData.score,
                    time: sessionData.play_time,
                    completed: sessionData.completed,
                    stars: sessionData.stars
                });
            }
            
            return result.changes > 0;
            
        } catch (error) {
            this.logger.error('Failed to end game session:', error);
            return false;
        }
    }

    /**
     * Statistics Operations
     */
    
    async updateStatistics(sessionData) {
        if (!this.isAvailable()) return;

        try {
            // Update various statistics
            if (sessionData.distance) {
                await this.incrementStatistic('total_distance', sessionData.distance);
            }
            
            if (sessionData.zombies_killed) {
                await this.incrementStatistic('total_zombies_killed', sessionData.zombies_killed);
            }
            
            if (sessionData.play_time) {
                await this.incrementStatistic('total_play_time', sessionData.play_time);
            }
            
            await this.incrementStatistic('games_played', 1);
            
            if (sessionData.completed) {
                await this.incrementStatistic('games_completed', 1);
            }
            
        } catch (error) {
            this.logger.error('Failed to update statistics:', error);
        }
    }

    async incrementStatistic(statName, increment = 1, category = 'general') {
        if (!this.isAvailable()) return false;

        try {
            const result = databaseManager.incrementStatistic(1, statName, increment, category);
            return result.changes > 0;
        } catch (error) {
            this.logger.error('Failed to increment statistic:', error);
            return false;
        }
    }

    async getStatistics(category = null) {
        if (!this.isAvailable()) {
            return [];
        }

        if (this.shouldRefreshCache()) {
            await this.refreshCache();
        }

        let stats = this.cache.statistics || [];
        
        if (category) {
            stats = stats.filter(s => s.category === category);
        }
        
        return stats;
    }

    /**
     * Save Game Operations
     */
    
    async getSaveGames() {
        if (!this.isAvailable()) {
            return [];
        }

        try {
            return databaseManager.getSaveGames(1);
        } catch (error) {
            this.logger.error('Failed to get save games:', error);
            return [];
        }
    }

    async createSaveGame(saveData) {
        if (!this.isAvailable()) {
            this.logger.warn('Cannot create save game - database not available');
            return false;
        }

        try {
            const result = databaseManager.createSaveGame(1, saveData);
            return result.lastInsertRowid;
        } catch (error) {
            this.logger.error('Failed to create save game:', error);
            return false;
        }
    }

    async loadSaveGame(saveId) {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return databaseManager.getSaveGame(saveId);
        } catch (error) {
            this.logger.error('Failed to load save game:', error);
            return null;
        }
    }

    async deleteSaveGame(saveId) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const result = databaseManager.deleteSaveGame(saveId);
            return result.changes > 0;
        } catch (error) {
            this.logger.error('Failed to delete save game:', error);
            return false;
        }
    }

    /**
     * Backup and Maintenance Operations
     */
    
    async createBackup() {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return databaseManager.createBackup();
        } catch (error) {
            this.logger.error('Failed to create backup:', error);
            return null;
        }
    }

    async getDatabaseInfo() {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return databaseManager.getDbInfo();
        } catch (error) {
            this.logger.error('Failed to get database info:', error);
            return null;
        }
    }

    async performMaintenance() {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            databaseManager.vacuum();
            databaseManager.analyze();
            return true;
        } catch (error) {
            this.logger.error('Failed to perform maintenance:', error);
            return false;
        }
    }

    /**
     * Export/Import Operations
     */
    
    async exportGameData() {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            const data = {
                profile: await this.getPlayerProfile(),
                vehicles: await this.getPlayerVehicles(),
                levelProgress: await this.getLevelProgress(),
                statistics: await this.getStatistics(),
                saveGames: await this.getSaveGames(),
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            };
            
            return data;
            
        } catch (error) {
            this.logger.error('Failed to export game data:', error);
            return null;
        }
    }

    async importGameData(data) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            // TODO: Implement data import with validation
            this.logger.warn('Data import not yet implemented');
            return false;
            
        } catch (error) {
            this.logger.error('Failed to import game data:', error);
            return false;
        }
    }

    /**
     * Cleanup and disposal
     */
    
    dispose() {
        if (this.isAvailable()) {
            databaseManager.dispose();
        }
        
        this.cache = {};
        this.isInitialized = false;
        
        this.logger.info('Database integration disposed');
    }
}

// Export singleton instance
export const databaseIntegration = new DatabaseIntegration();