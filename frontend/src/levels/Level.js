import * as THREE from 'three';
import Checkpoint from './Checkpoint.js';
import { LEVEL_CONFIGS, CHECKPOINT_CONFIGS, LEVEL_OBJECTIVES } from './LevelConfig.js';

/**
 * Level class representing a single game level
 */
export default class Level {
    constructor(levelId, scene, physicsWorld, terrainGenerator) {
        this.id = levelId;
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.terrainGenerator = terrainGenerator;
        
        // Load level configuration
        this.config = LEVEL_CONFIGS[levelId];
        if (!this.config) {
            throw new Error(`Level configuration not found for: ${levelId}`);
        }
        
        // Level state
        this.isLoaded = false;
        this.isActive = false;
        this.isCompleted = false;
        this.startTime = null;
        this.endTime = null;
        
        // Level components
        this.terrain = null;
        this.checkpoints = new Map();
        this.spawnPoints = [];
        this.objectives = new Map();
        
        // Progress tracking
        this.progress = {
            distanceTraveled: 0,
            zombiesKilled: 0,
            timeElapsed: 0,
            checkpointsReached: 0,
            bossesDefeated: 0
        };
        
        // Event callbacks
        this.onObjectiveComplete = null;
        this.onLevelComplete = null;
        this.onCheckpointReached = null;
        
        this.initializeObjectives();
    }

    /**
     * Initialize level objectives
     */
    initializeObjectives() {
        this.config.objectives.forEach((objectiveConfig, index) => {
            const objective = {
                id: `${this.id}-obj-${index}`,
                type: objectiveConfig.type,
                target: objectiveConfig.target,
                description: objectiveConfig.description,
                current: 0,
                completed: false
            };
            
            this.objectives.set(objective.id, objective);
        });
    }

    /**
     * Load the level (generate terrain, create checkpoints, etc.)
     */
    async load() {
        if (this.isLoaded) return;
        
        console.log(`Loading level: ${this.config.name}`);
        
        try {
            // Generate terrain
            this.terrain = this.terrainGenerator.generateTerrain(this.config);
            
            // Create checkpoints
            this.createCheckpoints();
            
            // Generate spawn points
            this.generateSpawnPoints();
            
            // Set up level lighting
            this.setupLighting();
            
            this.isLoaded = true;
            console.log(`Level ${this.config.name} loaded successfully`);
            
        } catch (error) {
            console.error(`Failed to load level ${this.id}:`, error);
            throw error;
        }
    }

    /**
     * Create checkpoints for the level
     */
    createCheckpoints() {
        const checkpointConfigs = CHECKPOINT_CONFIGS[this.id] || [];
        
        checkpointConfigs.forEach(config => {
            const checkpoint = new Checkpoint(config, this.scene);
            this.checkpoints.set(checkpoint.id, checkpoint);
        });
        
        // Activate the first checkpoint
        if (this.checkpoints.size > 0) {
            const firstCheckpoint = Array.from(this.checkpoints.values())[0];
            firstCheckpoint.activate();
        }
    }

    /**
     * Generate spawn points for zombies and other entities
     */
    generateSpawnPoints() {
        const { terrain } = this.config;
        const spawnCount = 20; // Number of spawn points to generate
        
        for (let i = 0; i < spawnCount; i++) {
            const position = this.terrainGenerator.getRandomSpawnPosition(terrain, 10);
            this.spawnPoints.push({
                id: `spawn-${i}`,
                position,
                type: 'zombie',
                isActive: true
            });
        }
    }

    /**
     * Set up level-specific lighting
     */
    setupLighting() {
        // Remove existing lights (if any)
        const existingLights = this.scene.children.filter(child => child.isLight);
        existingLights.forEach(light => this.scene.remove(light));
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        this.scene.add(directionalLight);
        
        // Environment-specific lighting adjustments
        switch (this.config.environmentType) {
            case 'desert':
                directionalLight.color.setHex(0xffeeaa);
                ambientLight.color.setHex(0x554433);
                break;
            case 'forest':
                directionalLight.intensity = 0.6;
                ambientLight.color.setHex(0x223322);
                break;
            case 'apocalypse':
                directionalLight.color.setHex(0xff6666);
                ambientLight.color.setHex(0x442222);
                break;
        }
    }

    /**
     * Start the level
     */
    start() {
        if (!this.isLoaded) {
            throw new Error('Level must be loaded before starting');
        }
        
        this.isActive = true;
        this.startTime = Date.now();
        
        console.log(`Level ${this.config.name} started`);
    }

    /**
     * Update level state (called each frame)
     */
    update(deltaTime, playerPosition) {
        if (!this.isActive) return;
        
        // Update time elapsed
        this.progress.timeElapsed = (Date.now() - this.startTime) / 1000;
        
        // Update checkpoints
        this.updateCheckpoints(playerPosition);
        
        // Update objectives
        this.updateObjectives();
        
        // Check for level completion
        this.checkLevelCompletion();
    }

    /**
     * Update checkpoint states
     */
    updateCheckpoints(playerPosition) {
        if (!playerPosition) return;
        
        this.checkpoints.forEach(checkpoint => {
            checkpoint.update(0.016); // Assume 60 FPS for checkpoint animations
            
            if (!checkpoint.isReached && checkpoint.isPositionInRange(playerPosition)) {
                checkpoint.reach();
                this.progress.checkpointsReached++;
                
                if (this.onCheckpointReached) {
                    this.onCheckpointReached(checkpoint);
                }
                
                // Activate next checkpoint
                this.activateNextCheckpoint(checkpoint);
            }
        });
    }

    /**
     * Activate the next checkpoint in sequence
     */
    activateNextCheckpoint(currentCheckpoint) {
        const checkpointArray = Array.from(this.checkpoints.values());
        const currentIndex = checkpointArray.findIndex(cp => cp.id === currentCheckpoint.id);
        
        if (currentIndex >= 0 && currentIndex < checkpointArray.length - 1) {
            const nextCheckpoint = checkpointArray[currentIndex + 1];
            nextCheckpoint.activate();
        }
    }

    /**
     * Update objective progress
     */
    updateObjectives() {
        this.objectives.forEach(objective => {
            if (objective.completed) return;
            
            let currentValue = 0;
            
            switch (objective.type) {
                case LEVEL_OBJECTIVES.SURVIVE_DISTANCE:
                    currentValue = this.progress.distanceTraveled;
                    break;
                case LEVEL_OBJECTIVES.KILL_COUNT:
                    currentValue = this.progress.zombiesKilled;
                    break;
                case LEVEL_OBJECTIVES.TIME_LIMIT:
                    currentValue = this.progress.timeElapsed;
                    break;
                case LEVEL_OBJECTIVES.REACH_CHECKPOINT:
                    currentValue = this.progress.checkpointsReached;
                    break;
                case LEVEL_OBJECTIVES.BOSS_DEFEAT:
                    currentValue = this.progress.bossesDefeated;
                    break;
            }
            
            objective.current = currentValue;
            
            // Check if objective is completed
            const isCompleted = (objective.type === LEVEL_OBJECTIVES.TIME_LIMIT) 
                ? currentValue <= objective.target 
                : currentValue >= objective.target;
                
            if (isCompleted && !objective.completed) {
                objective.completed = true;
                console.log(`Objective completed: ${objective.description}`);
                
                if (this.onObjectiveComplete) {
                    this.onObjectiveComplete(objective);
                }
            }
        });
    }

    /**
     * Check if all objectives are completed
     */
    checkLevelCompletion() {
        if (this.isCompleted) return;
        
        const allObjectivesCompleted = Array.from(this.objectives.values())
            .every(objective => objective.completed);
            
        if (allObjectivesCompleted) {
            this.completLevel();
        }
    }

    /**
     * Complete the level
     */
    completLevel() {
        this.isCompleted = true;
        this.isActive = false;
        this.endTime = Date.now();
        
        const completionTime = (this.endTime - this.startTime) / 1000;
        
        console.log(`Level ${this.config.name} completed in ${completionTime.toFixed(2)} seconds`);
        
        if (this.onLevelComplete) {
            this.onLevelComplete(this.getLevelResults());
        }
    }

    /**
     * Update progress values
     */
    updateProgress(progressUpdate) {
        Object.assign(this.progress, progressUpdate);
    }

    /**
     * Get level results
     */
    getLevelResults() {
        const completionTime = this.endTime ? (this.endTime - this.startTime) / 1000 : 0;
        
        return {
            levelId: this.id,
            levelName: this.config.name,
            completed: this.isCompleted,
            progress: { ...this.progress },
            objectives: Array.from(this.objectives.values()),
            completionTime,
            rewards: this.config.rewards,
            score: this.calculateScore()
        };
    }

    /**
     * Calculate level score based on performance
     */
    calculateScore() {
        let score = 0;
        
        // Base score for completion
        if (this.isCompleted) {
            score += 1000;
        }
        
        // Bonus for zombies killed
        score += this.progress.zombiesKilled * 10;
        
        // Bonus for distance traveled
        score += Math.floor(this.progress.distanceTraveled / 10);
        
        // Time bonus (faster completion = higher score)
        const targetTime = 300; // 5 minutes
        if (this.progress.timeElapsed < targetTime) {
            const timeBonus = Math.floor((targetTime - this.progress.timeElapsed) * 5);
            score += timeBonus;
        }
        
        // Checkpoint bonus
        score += this.progress.checkpointsReached * 50;
        
        // Boss defeat bonus
        score += this.progress.bossesDefeated * 200;
        
        return Math.max(0, score);
    }

    /**
     * Get spawn points for entities
     */
    getSpawnPoints(type = 'zombie') {
        return this.spawnPoints.filter(spawn => spawn.type === type && spawn.isActive);
    }

    /**
     * Get random spawn point
     */
    getRandomSpawnPoint(type = 'zombie') {
        const validSpawns = this.getSpawnPoints(type);
        if (validSpawns.length === 0) return null;
        
        return validSpawns[Math.floor(Math.random() * validSpawns.length)];
    }

    /**
     * Check if level requirements are met for unlocking
     */
    static checkUnlockRequirements(levelId, playerData) {
        const config = LEVEL_CONFIGS[levelId];
        if (!config) return false;
        
        const requirements = config.unlockRequirements;
        
        // Check player level
        if (playerData.level < requirements.level) {
            return false;
        }
        
        // Check currency
        if (playerData.currency < requirements.currency) {
            return false;
        }
        
        // Check previous levels completed
        for (const requiredLevel of requirements.previousLevels) {
            if (!playerData.completedLevels.includes(requiredLevel)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get level state for saving
     */
    getState() {
        return {
            id: this.id,
            isCompleted: this.isCompleted,
            progress: { ...this.progress },
            objectives: Array.from(this.objectives.entries()),
            checkpoints: Array.from(this.checkpoints.entries()).map(([id, checkpoint]) => [
                id,
                checkpoint.getState()
            ])
        };
    }

    /**
     * Load level state
     */
    setState(state) {
        this.isCompleted = state.isCompleted;
        this.progress = { ...state.progress };
        
        // Restore objectives
        state.objectives.forEach(([id, objectiveState]) => {
            if (this.objectives.has(id)) {
                Object.assign(this.objectives.get(id), objectiveState);
            }
        });
        
        // Restore checkpoints
        state.checkpoints.forEach(([id, checkpointState]) => {
            if (this.checkpoints.has(id)) {
                this.checkpoints.get(id).setState(checkpointState);
            }
        });
    }

    /**
     * Unload the level and clean up resources
     */
    unload() {
        if (!this.isLoaded) return;
        
        // Clean up terrain
        if (this.terrain && this.terrainGenerator) {
            this.terrainGenerator.clearTerrain();
        }
        
        // Clean up checkpoints
        this.checkpoints.forEach(checkpoint => {
            checkpoint.dispose();
        });
        this.checkpoints.clear();
        
        // Remove lights
        const lights = this.scene.children.filter(child => child.isLight);
        lights.forEach(light => this.scene.remove(light));
        
        this.isLoaded = false;
        this.isActive = false;
        
        console.log(`Level ${this.config.name} unloaded`);
    }

    /**
     * Dispose of all level resources
     */
    dispose() {
        this.unload();
        this.spawnPoints = [];
        this.objectives.clear();
    }
}