import SaveManager from './SaveManager.js';
import { RobustSaveAPI } from './SaveAPI.js';

/**
 * SaveIntegration connects the save system with existing game systems
 * Handles automatic save triggers, milestone detection, and system coordination
 */
export class SaveIntegration {
    constructor(gameEngine, options = {}) {
        this.gameEngine = gameEngine;
        this.options = {
            autoSaveOnLevelComplete: true,
            autoSaveOnUpgrade: true,
            autoSaveOnAchievement: true,
            autoSaveOnScoreUpdate: true,
            saveOnGameStateChange: true,
            ...options
        };
        
        // Initialize save API
        this.saveAPI = new RobustSaveAPI('/api/v1', null, {
            retryAttempts: 3,
            retryDelay: 1000
        });
        
        // Initialize save manager
        this.saveManager = new SaveManager(this.saveAPI, {
            autoSaveInterval: 30000, // 30 seconds
            maxLocalSaves: 10,
            syncOnlineEnabled: true
        });
        
        // Track save milestones
        this.saveMilestones = {
            levelComplete: new Set(),
            upgradesPurchased: new Set(),
            achievementsUnlocked: new Set(),
            scoreThresholds: [1000, 5000, 10000, 25000, 50000, 100000]
        };
        
        // Event listeners storage
        this.eventListeners = new Map();
        
        console.log('SaveIntegration initialized');
    }

    /**
     * Initialize the save integration system
     */
    async initialize() {
        try {
            // Initialize save manager
            await this.saveManager.initialize();
            
            // Setup game system integrations
            this.setupLevelManagerIntegration();
            this.setupUpgradeManagerIntegration();
            this.setupScoringSystemIntegration();
            this.setupVehicleManagerIntegration();
            this.setupGameStateIntegration();
            this.setupAchievementIntegration();
            
            // Setup save manager event listeners
            this.setupSaveManagerListeners();
            
            // Load existing progress into game systems
            await this.loadProgressIntoGameSystems();
            
            console.log('SaveIntegration initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize SaveIntegration:', error);
            throw error;
        }
    }

    /**
     * Setup integration with level manager
     */
    setupLevelManagerIntegration() {
        const levelManager = this.gameEngine.getLevelManager?.();
        if (!levelManager) return;

        // Listen for level completion
        const onLevelComplete = (levelData) => {
            this.handleLevelComplete(levelData);
        };
        
        levelManager.on('levelCompleted', onLevelComplete);
        this.eventListeners.set('levelManager.levelCompleted', { 
            target: levelManager, 
            event: 'levelCompleted', 
            handler: onLevelComplete 
        });

        // Listen for checkpoint reached
        const onCheckpointReached = (checkpointData) => {
            this.handleCheckpointReached(checkpointData);
        };
        
        levelManager.on('checkpointReached', onCheckpointReached);
        this.eventListeners.set('levelManager.checkpointReached', { 
            target: levelManager, 
            event: 'checkpointReached', 
            handler: onCheckpointReached 
        });

        // Listen for level unlocked
        const onLevelUnlocked = (levelId) => {
            this.handleLevelUnlocked(levelId);
        };
        
        levelManager.on('levelUnlocked', onLevelUnlocked);
        this.eventListeners.set('levelManager.levelUnlocked', { 
            target: levelManager, 
            event: 'levelUnlocked', 
            handler: onLevelUnlocked 
        });
    }

    /**
     * Setup integration with upgrade manager
     */
    setupUpgradeManagerIntegration() {
        const upgradeManager = this.gameEngine.getUpgradeManager?.();
        if (!upgradeManager) return;

        // Listen for upgrade purchases
        const onUpgradeCompleted = (upgradeData) => {
            this.handleUpgradeCompleted(upgradeData);
        };
        
        upgradeManager.on('upgradeCompleted', onUpgradeCompleted);
        this.eventListeners.set('upgradeManager.upgradeCompleted', { 
            target: upgradeManager, 
            event: 'upgradeCompleted', 
            handler: onUpgradeCompleted 
        });

        // Listen for currency updates
        const onCurrencyUpdated = (newCurrency, oldCurrency) => {
            this.handleCurrencyUpdated(newCurrency, oldCurrency);
        };
        
        upgradeManager.on('currencyUpdated', onCurrencyUpdated);
        this.eventListeners.set('upgradeManager.currencyUpdated', { 
            target: upgradeManager, 
            event: 'currencyUpdated', 
            handler: onCurrencyUpdated 
        });
    }

    /**
     * Setup integration with scoring system
     */
    setupScoringSystemIntegration() {
        const scoringSystem = this.gameEngine.getScoringSystem?.();
        if (!scoringSystem) return;

        // Listen for score updates
        const onScoreUpdated = (scoreData) => {
            this.handleScoreUpdated(scoreData);
        };
        
        scoringSystem.on('scoreUpdated', onScoreUpdated);
        this.eventListeners.set('scoringSystem.scoreUpdated', { 
            target: scoringSystem, 
            event: 'scoreUpdated', 
            handler: onScoreUpdated 
        });

        // Listen for high score achieved
        const onHighScoreAchieved = (scoreData) => {
            this.handleHighScoreAchieved(scoreData);
        };
        
        scoringSystem.on('highScoreAchieved', onHighScoreAchieved);
        this.eventListeners.set('scoringSystem.highScoreAchieved', { 
            target: scoringSystem, 
            event: 'highScoreAchieved', 
            handler: onHighScoreAchieved 
        });
    }

    /**
     * Setup integration with vehicle manager
     */
    setupVehicleManagerIntegration() {
        const vehicleManager = this.gameEngine.getVehicleManager?.();
        if (!vehicleManager) return;

        // Listen for vehicle selection changes
        const onVehicleSelected = (vehicleData) => {
            this.handleVehicleSelected(vehicleData);
        };
        
        vehicleManager.on('vehicleSelected', onVehicleSelected);
        this.eventListeners.set('vehicleManager.vehicleSelected', { 
            target: vehicleManager, 
            event: 'vehicleSelected', 
            handler: onVehicleSelected 
        });

        // Listen for vehicle unlocked
        const onVehicleUnlocked = (vehicleData) => {
            this.handleVehicleUnlocked(vehicleData);
        };
        
        vehicleManager.on('vehicleUnlocked', onVehicleUnlocked);
        this.eventListeners.set('vehicleManager.vehicleUnlocked', { 
            target: vehicleManager, 
            event: 'vehicleUnlocked', 
            handler: onVehicleUnlocked 
        });
    }

    /**
     * Setup integration with game state manager
     */
    setupGameStateIntegration() {
        const gameStateManager = this.gameEngine.getGameStateManager?.();
        if (!gameStateManager) return;

        // Listen for game state changes
        const onGameStateChanged = (newState, oldState) => {
            this.handleGameStateChanged(newState, oldState);
        };
        
        gameStateManager.on('stateChanged', onGameStateChanged);
        this.eventListeners.set('gameStateManager.stateChanged', { 
            target: gameStateManager, 
            event: 'stateChanged', 
            handler: onGameStateChanged 
        });

        // Listen for session start/end
        const onSessionStarted = (sessionData) => {
            this.handleSessionStarted(sessionData);
        };
        
        gameStateManager.on('sessionStarted', onSessionStarted);
        this.eventListeners.set('gameStateManager.sessionStarted', { 
            target: gameStateManager, 
            event: 'sessionStarted', 
            handler: onSessionStarted 
        });

        const onSessionEnded = (sessionData) => {
            this.handleSessionEnded(sessionData);
        };
        
        gameStateManager.on('sessionEnded', onSessionEnded);
        this.eventListeners.set('gameStateManager.sessionEnded', { 
            target: gameStateManager, 
            event: 'sessionEnded', 
            handler: onSessionEnded 
        });
    }

    /**
     * Setup achievement system integration
     */
    setupAchievementIntegration() {
        // Achievement system might be part of scoring or separate
        const achievementSystem = this.gameEngine.getAchievementSystem?.();
        if (!achievementSystem) return;

        // Listen for achievement unlocked
        const onAchievementUnlocked = (achievement) => {
            this.handleAchievementUnlocked(achievement);
        };
        
        achievementSystem.on('achievementUnlocked', onAchievementUnlocked);
        this.eventListeners.set('achievementSystem.achievementUnlocked', { 
            target: achievementSystem, 
            event: 'achievementUnlocked', 
            handler: onAchievementUnlocked 
        });
    }

    /**
     * Setup save manager event listeners
     */
    setupSaveManagerListeners() {
        this.saveManager.on('saveCompleted', (saveData) => {
            console.log('Save completed:', saveData.timestamp);
        });

        this.saveManager.on('saveError', (error) => {
            console.error('Save error:', error);
            // Could show user notification here
        });

        this.saveManager.on('syncCompleted', () => {
            console.log('Save sync completed');
        });

        this.saveManager.on('syncError', (error) => {
            console.warn('Save sync error:', error);
        });

        this.saveManager.on('recoveredFromBackup', (backup) => {
            console.log('Recovered from backup:', backup.timestamp);
            // Could show user notification about recovery
        });
    }

    /**
     * Handle level completion
     */
    async handleLevelComplete(levelData) {
        const levelId = levelData.levelId || levelData.id;
        
        if (!this.saveMilestones.levelComplete.has(levelId)) {
            this.saveMilestones.levelComplete.add(levelId);
            
            // Update save data
            this.saveManager.updateLevelProgress(levelId, {
                completed: true,
                completedAt: Date.now(),
                score: levelData.score,
                time: levelData.completionTime,
                stats: levelData.stats
            });
            
            // Update statistics
            this.saveManager.updateStatistics({
                totalGamesPlayed: 1,
                totalPlayTime: levelData.completionTime || 0,
                totalZombiesKilled: levelData.stats?.zombiesKilled || 0,
                totalDistanceTraveled: levelData.stats?.distanceTraveled || 0
            });
            
            if (this.options.autoSaveOnLevelComplete) {
                await this.saveManager.saveToLocalStorage();
                console.log(`Auto-saved after level ${levelId} completion`);
            }
        }
    }

    /**
     * Handle checkpoint reached
     */
    async handleCheckpointReached(checkpointData) {
        const levelId = checkpointData.levelId;
        const checkpointId = checkpointData.checkpointId;
        
        // Update level progress with checkpoint
        this.saveManager.updateLevelProgress(levelId, {
            lastCheckpoint: checkpointId,
            checkpointReachedAt: Date.now(),
            checkpointData: checkpointData
        });
        
        // Checkpoint saves are usually automatic and frequent
        if (this.options.saveOnGameStateChange) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle level unlocked
     */
    async handleLevelUnlocked(levelId) {
        const currentLevels = this.saveManager.getSaveState().levels.unlocked;
        if (!currentLevels.includes(levelId)) {
            const levelData = this.saveManager.getLevelData();
            levelData.unlocked.push(levelId);
            
            this.saveManager.updateLevelProgress(levelId, {
                unlockedAt: Date.now()
            });
            
            if (this.options.saveOnGameStateChange) {
                await this.saveManager.saveToLocalStorage();
            }
        }
    }

    /**
     * Handle upgrade completed
     */
    async handleUpgradeCompleted(upgradeData) {
        const upgradeKey = `${upgradeData.vehicleId}_${upgradeData.category}_${upgradeData.newLevel}`;
        
        if (!this.saveMilestones.upgradesPurchased.has(upgradeKey)) {
            this.saveMilestones.upgradesPurchased.add(upgradeKey);
            
            // Update vehicle upgrade data
            const vehicleData = this.saveManager.getVehicleData();
            if (!vehicleData.upgrades[upgradeData.vehicleId]) {
                vehicleData.upgrades[upgradeData.vehicleId] = {};
            }
            vehicleData.upgrades[upgradeData.vehicleId][upgradeData.category] = upgradeData.newLevel;
            
            this.saveManager.updateVehicleData(vehicleData);
            
            // Update player currency
            this.saveManager.updatePlayerData({
                currency: upgradeData.remainingCurrency || this.saveManager.getPlayerData().currency
            });
            
            if (this.options.autoSaveOnUpgrade) {
                await this.saveManager.saveToLocalStorage();
                console.log(`Auto-saved after upgrade: ${upgradeData.category} level ${upgradeData.newLevel}`);
            }
        }
    }

    /**
     * Handle currency updated
     */
    async handleCurrencyUpdated(newCurrency, oldCurrency) {
        this.saveManager.updatePlayerData({
            currency: newCurrency
        });
        
        // Save on significant currency changes
        const change = Math.abs(newCurrency - oldCurrency);
        if (change >= 100) { // Save on changes of 100+ currency
            if (this.options.autoSaveOnUpgrade) {
                await this.saveManager.saveToLocalStorage();
            }
        }
    }

    /**
     * Handle score updated
     */
    async handleScoreUpdated(scoreData) {
        // Check for score milestones
        const currentScore = scoreData.totalPoints || scoreData.score;
        const thresholdReached = this.saveMilestones.scoreThresholds.find(threshold => 
            currentScore >= threshold && 
            (this.saveManager.getPlayerData().totalScore || 0) < threshold
        );
        
        if (thresholdReached) {
            console.log(`Score milestone reached: ${thresholdReached}`);
        }
        
        // Update player total score if it's higher
        const currentTotalScore = this.saveManager.getPlayerData().totalScore || 0;
        if (currentScore > currentTotalScore) {
            this.saveManager.updatePlayerData({
                totalScore: currentScore
            });
        }
        
        // Update statistics
        this.saveManager.updateStatistics({
            totalZombiesKilled: scoreData.zombiesKilled || 0,
            totalDistanceTraveled: scoreData.distanceTraveled || 0
        });
        
        if (this.options.autoSaveOnScoreUpdate && thresholdReached) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle high score achieved
     */
    async handleHighScoreAchieved(scoreData) {
        const levelId = scoreData.levelId;
        if (levelId) {
            this.saveManager.updateLevelProgress(levelId, {
                score: scoreData.score,
                highScoreAchievedAt: Date.now()
            });
        }
        
        this.saveManager.updatePlayerData({
            totalScore: Math.max(
                this.saveManager.getPlayerData().totalScore || 0,
                scoreData.score
            )
        });
        
        if (this.options.autoSaveOnScoreUpdate) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle vehicle selected
     */
    async handleVehicleSelected(vehicleData) {
        this.saveManager.updateVehicleData({
            selected: vehicleData.id || vehicleData.vehicleId
        });
        
        if (this.options.saveOnGameStateChange) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle vehicle unlocked
     */
    async handleVehicleUnlocked(vehicleData) {
        const vehicleId = vehicleData.id || vehicleData.vehicleId;
        const currentVehicles = this.saveManager.getVehicleData().owned;
        
        if (!currentVehicles.includes(vehicleId)) {
            currentVehicles.push(vehicleId);
            this.saveManager.updateVehicleData({
                owned: currentVehicles
            });
            
            if (this.options.saveOnGameStateChange) {
                await this.saveManager.saveToLocalStorage();
            }
        }
    }

    /**
     * Handle game state changed
     */
    async handleGameStateChanged(newState, oldState) {
        this.saveManager.saveState.gameState.currentSession = newState;
        
        if (this.options.saveOnGameStateChange) {
            // Debounced save for frequent state changes
            this.saveManager.debouncedSave();
        }
    }

    /**
     * Handle session started
     */
    async handleSessionStarted(sessionData) {
        this.saveManager.saveState.gameState.currentSession = sessionData;
        this.saveManager.saveState.gameState.lastLevel = sessionData.levelId;
        
        if (this.options.saveOnGameStateChange) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle session ended
     */
    async handleSessionEnded(sessionData) {
        // Update play time
        const playTime = sessionData.duration || 0;
        this.saveManager.updateStatistics({
            totalPlayTime: playTime,
            totalGamesPlayed: 1
        });
        
        // Clear current session
        this.saveManager.saveState.gameState.currentSession = null;
        
        if (this.options.saveOnGameStateChange) {
            await this.saveManager.saveToLocalStorage();
        }
    }

    /**
     * Handle achievement unlocked
     */
    async handleAchievementUnlocked(achievement) {
        const achievementId = achievement.id;
        
        if (!this.saveMilestones.achievementsUnlocked.has(achievementId)) {
            this.saveMilestones.achievementsUnlocked.add(achievementId);
            
            this.saveManager.addAchievement(achievement);
            
            if (this.options.autoSaveOnAchievement) {
                await this.saveManager.saveToLocalStorage();
                console.log(`Auto-saved after achievement unlocked: ${achievement.name}`);
            }
        }
    }

    /**
     * Load existing progress into game systems
     */
    async loadProgressIntoGameSystems() {
        const saveData = this.saveManager.getSaveState();
        
        // Load player data
        const playerData = saveData.player;
        if (playerData.id) {
            // Set player info in game systems
            this.gameEngine.setPlayerInfo?.(playerData);
        }
        
        // Load vehicle data
        const vehicleData = saveData.vehicles;
        const vehicleManager = this.gameEngine.getVehicleManager?.();
        if (vehicleManager && vehicleData.owned.length > 0) {
            vehicleManager.setOwnedVehicles?.(vehicleData.owned);
            if (vehicleData.selected) {
                vehicleManager.selectVehicle?.(vehicleData.selected);
            }
        }
        
        // Load upgrade data
        const upgradeManager = this.gameEngine.getUpgradeManager?.();
        if (upgradeManager && Object.keys(vehicleData.upgrades).length > 0) {
            upgradeManager.loadUpgradeData?.(vehicleData.upgrades);
        }
        
        // Load level progress
        const levelData = saveData.levels;
        const levelManager = this.gameEngine.getLevelManager?.();
        if (levelManager) {
            levelManager.setUnlockedLevels?.(levelData.unlocked);
            levelManager.setCompletedLevels?.(levelData.completed);
            levelManager.setBestScores?.(levelData.bestScores);
        }
        
        // Load settings
        const settings = saveData.settings;
        if (Object.keys(settings).length > 0) {
            this.gameEngine.applySettings?.(settings);
        }
        
        console.log('Progress loaded into game systems');
    }

    /**
     * Force save current game state
     */
    async forceSave() {
        try {
            await this.saveManager.saveToLocalStorage();
            console.log('Force save completed');
            return true;
        } catch (error) {
            console.error('Force save failed:', error);
            throw error;
        }
    }

    /**
     * Force sync with server
     */
    async forceSync() {
        try {
            await this.saveManager.syncWithBackend();
            console.log('Force sync completed');
            return true;
        } catch (error) {
            console.error('Force sync failed:', error);
            throw error;
        }
    }

    /**
     * Get save system status
     */
    getStatus() {
        return {
            saveManager: this.saveManager.getStatus(),
            integration: {
                eventListeners: this.eventListeners.size,
                milestones: {
                    levelsCompleted: this.saveMilestones.levelComplete.size,
                    upgradesPurchased: this.saveMilestones.upgradesPurchased.size,
                    achievementsUnlocked: this.saveMilestones.achievementsUnlocked.size
                }
            }
        };
    }

    /**
     * Dispose of the save integration
     */
    dispose() {
        // Remove all event listeners
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.off(event, handler);
        });
        this.eventListeners.clear();
        
        // Dispose save manager
        this.saveManager.dispose();
        
        console.log('SaveIntegration disposed');
    }
}

export default SaveIntegration;