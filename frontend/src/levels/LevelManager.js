import Level from './Level.js';
import TerrainGenerator from './TerrainGenerator.js';
import { LEVEL_CONFIGS } from './LevelConfig.js';

/**
 * LevelManager handles level loading, progression, and state management
 */
export default class LevelManager {
    constructor(scene, physicsWorld, gameEngine) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.gameEngine = gameEngine;
        
        // Level management
        this.currentLevel = null;
        this.terrainGenerator = new TerrainGenerator(scene, physicsWorld);
        this.levels = new Map();
        
        // Player progress
        this.playerProgress = {
            level: 1,
            currency: 0,
            completedLevels: [],
            levelStats: new Map()
        };
        
        // Event callbacks
        this.onLevelComplete = null;
        this.onLevelStart = null;
        this.onObjectiveComplete = null;
        this.onCheckpointReached = null;
        
        // Level unlock system
        this.unlockedLevels = new Set(['level-1']); // First level is always unlocked
        
        this.initializeLevels();
    }

    /**
     * Initialize the level manager (async version for compatibility)
     */
    async initialize() {
        // Level manager is already initialized in constructor
        // This method exists for compatibility with other systems
        return Promise.resolve();
    }

    /**
     * Initialize available levels
     */
    initializeLevels() {
        Object.keys(LEVEL_CONFIGS).forEach(levelId => {
            // Don't create level instances yet, just track availability
            console.log(`Level available: ${LEVEL_CONFIGS[levelId].name}`);
        });
    }

    /**
     * Load a specific level
     */
    async loadLevel(levelId) {
        if (!LEVEL_CONFIGS[levelId]) {
            throw new Error(`Level not found: ${levelId}`);
        }
        
        // Check if level is unlocked
        if (!this.isLevelUnlocked(levelId)) {
            throw new Error(`Level not unlocked: ${levelId}`);
        }
        
        // Unload current level if exists
        if (this.currentLevel) {
            await this.unloadCurrentLevel();
        }
        
        console.log(`Loading level: ${levelId}`);
        
        try {
            // Create level instance
            const level = new Level(levelId, this.scene, this.physicsWorld, this.terrainGenerator);
            
            // Set up event handlers
            level.onLevelComplete = (results) => this.handleLevelComplete(results);
            level.onObjectiveComplete = (objective) => this.handleObjectiveComplete(objective);
            level.onCheckpointReached = (checkpoint) => this.handleCheckpointReached(checkpoint);
            
            // Load the level
            await level.load();
            
            this.currentLevel = level;
            this.levels.set(levelId, level);
            
            console.log(`Level ${levelId} loaded successfully`);
            return level;
            
        } catch (error) {
            console.error(`Failed to load level ${levelId}:`, error);
            throw error;
        }
    }

    /**
     * Start the current level
     */
    startLevel() {
        if (!this.currentLevel) {
            throw new Error('No level loaded');
        }
        
        this.currentLevel.start();
        
        if (this.onLevelStart) {
            this.onLevelStart(this.currentLevel);
        }
    }

    /**
     * Update the current level
     */
    update(deltaTime) {
        if (!this.currentLevel || !this.currentLevel.isActive) return;
        
        // Get player position from game engine
        const playerPosition = this.getPlayerPosition();
        
        // Update current level
        this.currentLevel.update(deltaTime, playerPosition);
        
        // Update progress tracking
        this.updateProgressTracking(deltaTime, playerPosition);
    }

    /**
     * Get player position from game engine
     */
    getPlayerPosition() {
        if (!this.gameEngine || !this.gameEngine.vehicleManager) {
            return null;
        }
        
        const activeVehicle = this.gameEngine.vehicleManager.getActiveVehicle();
        return activeVehicle ? activeVehicle.position : null;
    }

    /**
     * Update progress tracking
     */
    updateProgressTracking(deltaTime, playerPosition) {
        if (!this.currentLevel || !playerPosition) return;
        
        const progress = this.currentLevel.progress;
        
        // Track distance traveled
        if (this.lastPlayerPosition) {
            const distance = playerPosition.distanceTo(this.lastPlayerPosition);
            progress.distanceTraveled += distance;
        }
        this.lastPlayerPosition = playerPosition ? playerPosition.clone() : null;
        
        // Get zombie kill count from combat system
        if (this.gameEngine.combatSystem) {
            const combatStats = this.gameEngine.combatSystem.getStats();
            progress.zombiesKilled = combatStats.zombiesKilled || 0;
        }
        
        // Get boss defeat count from zombie manager
        if (this.gameEngine.zombieManager) {
            const zombieStats = this.gameEngine.zombieManager.getStats();
            progress.bossesDefeated = zombieStats.bossesKilled || 0;
        }
        
        // Update level progress
        this.currentLevel.updateProgress(progress);
    }

    /**
     * Handle level completion
     */
    handleLevelComplete(results) {
        console.log(`Level completed: ${results.levelName}`);
        
        // Update player progress
        this.updatePlayerProgress(results);
        
        // Unlock next levels
        this.checkAndUnlockLevels();
        
        // Save progress
        this.saveProgress();
        
        if (this.onLevelComplete) {
            this.onLevelComplete(results);
        }
    }

    /**
     * Handle objective completion
     */
    handleObjectiveComplete(objective) {
        console.log(`Objective completed: ${objective.description}`);
        
        if (this.onObjectiveComplete) {
            this.onObjectiveComplete(objective);
        }
    }

    /**
     * Handle checkpoint reached
     */
    handleCheckpointReached(checkpoint) {
        console.log(`Checkpoint reached: ${checkpoint.id}`);
        
        // Save checkpoint progress
        this.saveCheckpointProgress(checkpoint);
        
        if (this.onCheckpointReached) {
            this.onCheckpointReached(checkpoint);
        }
    }

    /**
     * Update player progress after level completion
     */
    updatePlayerProgress(results) {
        const levelId = results.levelId;
        
        // Add to completed levels if not already there
        if (!this.playerProgress.completedLevels.includes(levelId)) {
            this.playerProgress.completedLevels.push(levelId);
        }
        
        // Update currency
        this.playerProgress.currency += results.rewards.currency;
        
        // Update level (experience-based progression)
        const experienceGained = results.rewards.experience;
        const newLevel = Math.floor((this.playerProgress.currency + experienceGained) / 1000) + 1;
        this.playerProgress.level = Math.max(this.playerProgress.level, newLevel);
        
        // Store level statistics
        this.playerProgress.levelStats.set(levelId, {
            bestScore: Math.max(
                this.playerProgress.levelStats.get(levelId)?.bestScore || 0,
                results.score
            ),
            bestTime: Math.min(
                this.playerProgress.levelStats.get(levelId)?.bestTime || Infinity,
                results.completionTime
            ),
            completionCount: (this.playerProgress.levelStats.get(levelId)?.completionCount || 0) + 1,
            lastCompleted: Date.now()
        });
    }

    /**
     * Check and unlock new levels based on player progress
     */
    checkAndUnlockLevels() {
        Object.keys(LEVEL_CONFIGS).forEach(levelId => {
            if (!this.unlockedLevels.has(levelId)) {
                if (Level.checkUnlockRequirements(levelId, this.playerProgress)) {
                    this.unlockedLevels.add(levelId);
                    console.log(`Level unlocked: ${LEVEL_CONFIGS[levelId].name}`);
                }
            }
        });
    }

    /**
     * Check if a level is unlocked
     */
    isLevelUnlocked(levelId) {
        return this.unlockedLevels.has(levelId);
    }

    /**
     * Get list of available levels with unlock status
     */
    getAvailableLevels() {
        return Object.keys(LEVEL_CONFIGS).map(levelId => {
            const config = LEVEL_CONFIGS[levelId];
            const stats = this.playerProgress.levelStats.get(levelId);
            
            return {
                id: levelId,
                name: config.name,
                description: config.description,
                difficulty: config.difficulty,
                unlocked: this.isLevelUnlocked(levelId),
                completed: this.playerProgress.completedLevels.includes(levelId),
                unlockRequirements: config.unlockRequirements,
                rewards: config.rewards,
                objectives: config.objectives,
                stats: stats ? {
                    bestScore: stats.bestScore,
                    bestTime: stats.bestTime,
                    completionCount: stats.completionCount
                } : null
            };
        });
    }

    /**
     * Get current level info
     */
    getCurrentLevelInfo() {
        if (!this.currentLevel) return null;
        
        return {
            level: this.currentLevel,
            config: this.currentLevel.config,
            progress: this.currentLevel.progress,
            objectives: Array.from(this.currentLevel.objectives.values()),
            isActive: this.currentLevel.isActive,
            isCompleted: this.currentLevel.isCompleted
        };
    }

    /**
     * Restart current level
     */
    async restartLevel() {
        if (!this.currentLevel) {
            throw new Error('No level to restart');
        }
        
        const levelId = this.currentLevel.id;
        await this.loadLevel(levelId);
        this.startLevel();
    }

    /**
     * Unload current level
     */
    async unloadCurrentLevel() {
        if (!this.currentLevel) return;
        
        console.log(`Unloading level: ${this.currentLevel.id}`);
        
        this.currentLevel.unload();
        this.currentLevel = null;
        this.lastPlayerPosition = null;
    }

    /**
     * Save checkpoint progress
     */
    saveCheckpointProgress(checkpoint) {
        if (!this.currentLevel) return;
        
        const levelId = this.currentLevel.id;
        const checkpointData = {
            levelId,
            checkpointId: checkpoint.id,
            position: checkpoint.position,
            timestamp: Date.now()
        };
        
        // Store in local storage for now
        const key = `checkpoint_${levelId}`;
        localStorage.setItem(key, JSON.stringify(checkpointData));
    }

    /**
     * Load checkpoint progress
     */
    loadCheckpointProgress(levelId) {
        const key = `checkpoint_${levelId}`;
        const data = localStorage.getItem(key);
        
        if (data) {
            try {
                return JSON.parse(data);
            } catch (error) {
                console.error('Failed to parse checkpoint data:', error);
            }
        }
        
        return null;
    }

    /**
     * Save player progress
     */
    saveProgress() {
        const progressData = {
            playerProgress: {
                ...this.playerProgress,
                levelStats: Array.from(this.playerProgress.levelStats.entries())
            },
            unlockedLevels: Array.from(this.unlockedLevels),
            timestamp: Date.now()
        };
        
        // Save to local storage
        localStorage.setItem('zombie_game_progress', JSON.stringify(progressData));
        
        // TODO: Also save to backend API
        this.saveProgressToBackend(progressData);
    }

    /**
     * Load player progress
     */
    loadProgress() {
        // Load from local storage
        const data = localStorage.getItem('zombie_game_progress');
        
        if (data) {
            try {
                const progressData = JSON.parse(data);
                
                this.playerProgress = {
                    ...progressData.playerProgress,
                    levelStats: new Map(progressData.playerProgress.levelStats || [])
                };
                
                this.unlockedLevels = new Set(progressData.unlockedLevels || ['level-1']);
                
                console.log('Player progress loaded');
                
            } catch (error) {
                console.error('Failed to load progress:', error);
                this.resetProgress();
            }
        }
        
        // TODO: Also load from backend API
        this.loadProgressFromBackend();
    }

    /**
     * Reset player progress
     */
    resetProgress() {
        this.playerProgress = {
            level: 1,
            currency: 0,
            completedLevels: [],
            levelStats: new Map()
        };
        
        this.unlockedLevels = new Set(['level-1']);
        
        // Clear local storage
        localStorage.removeItem('zombie_game_progress');
        
        console.log('Player progress reset');
    }

    /**
     * Save progress to backend (placeholder)
     */
    async saveProgressToBackend(progressData) {
        // TODO: Implement backend API call
        try {
            // const response = await fetch('/api/player/progress', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(progressData)
            // });
            // 
            // if (!response.ok) {
            //     throw new Error('Failed to save progress to backend');
            // }
        } catch (error) {
            console.warn('Failed to save progress to backend:', error);
        }
    }

    /**
     * Load progress from backend (placeholder)
     */
    async loadProgressFromBackend() {
        // TODO: Implement backend API call
        try {
            // const response = await fetch('/api/player/progress');
            // 
            // if (response.ok) {
            //     const backendData = await response.json();
            //     // Merge with local data, preferring more recent
            //     this.mergeProgressData(backendData);
            // }
        } catch (error) {
            console.warn('Failed to load progress from backend:', error);
        }
    }

    /**
     * Get player progress data
     */
    getPlayerProgress() {
        return {
            ...this.playerProgress,
            unlockedLevels: Array.from(this.unlockedLevels)
        };
    }

    /**
     * Set player progress (for loading saved games)
     */
    setPlayerProgress(progressData) {
        this.playerProgress = {
            ...progressData,
            levelStats: new Map(progressData.levelStats || [])
        };
        
        this.unlockedLevels = new Set(progressData.unlockedLevels || ['level-1']);
    }

    /**
     * Dispose of all level manager resources
     */
    dispose() {
        // Unload current level
        if (this.currentLevel) {
            this.currentLevel.dispose();
        }
        
        // Dispose all cached levels
        this.levels.forEach(level => {
            level.dispose();
        });
        this.levels.clear();
        
        // Dispose terrain generator
        if (this.terrainGenerator) {
            this.terrainGenerator.dispose();
        }
        
        console.log('LevelManager disposed');
    }
}