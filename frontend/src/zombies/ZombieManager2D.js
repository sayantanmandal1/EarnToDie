/**
 * 2D Zombie Manager for Desert Survival Game
 * Handles spawning, updating, and managing 2D zombie instances with stage-based difficulty scaling
 */

import { Zombie2D } from './Zombie2D.js';
import { getZombieConfig, getRandomZombieType, ZOMBIE_TYPES } from './ZombieConfig.js';

export class ZombieManager2D {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.zombies = new Map();
        this.spawnPoints = [];
        
        // Spawning settings
        this.maxZombies = 50; // Reduced for 2D performance
        this.baseSpawnRate = 1.0; // Zombies per second
        this.currentSpawnRate = this.baseSpawnRate;
        this.spawnTimer = 0;
        this.spawnRadius = 200; // Pixels from camera view
        this.despawnDistance = 400; // Pixels from camera view
        
        // Stage-based difficulty scaling
        this.currentStage = 1;
        this.stageConfigs = {
            1: { // Early Desert
                zombieDensity: 0.3,
                spawnRateMultiplier: 1.0,
                maxZombies: 30,
                allowedTypes: [ZOMBIE_TYPES.WALKER, ZOMBIE_TYPES.CRAWLER],
                bossChance: 0
            },
            2: { // Deep Wasteland
                zombieDensity: 0.5,
                spawnRateMultiplier: 1.5,
                maxZombies: 40,
                allowedTypes: [ZOMBIE_TYPES.WALKER, ZOMBIE_TYPES.RUNNER, ZOMBIE_TYPES.CRAWLER, ZOMBIE_TYPES.SPITTER],
                bossChance: 0.05
            },
            3: { // Death Valley
                zombieDensity: 0.8,
                spawnRateMultiplier: 2.0,
                maxZombies: 50,
                allowedTypes: [ZOMBIE_TYPES.WALKER, ZOMBIE_TYPES.RUNNER, ZOMBIE_TYPES.BLOATER, ZOMBIE_TYPES.ARMORED, ZOMBIE_TYPES.BERSERKER],
                bossChance: 0.1
            }
        };
        
        // Performance optimization
        this.updateBatchSize = 5; // Update 5 zombies per frame
        this.currentUpdateIndex = 0;
        
        // Combat integration
        this.combatSystem = null;
        this.vehicleManager = null;
        
        // Statistics
        this.stats = {
            totalSpawned: 0,
            totalKilled: 0,
            activeZombies: 0,
            currentDensity: 0
        };
        
        // Event callbacks
        this.onZombieSpawned = null;
        this.onZombieDestroyed = null;
        this.onStageChanged = null;
        
        console.log('2D Zombie Manager initialized');
    }

    /**
     * Initialize the zombie manager
     */
    async initialize() {
        this._setupDefaultSpawnPoints();
        this._updateStageSettings();
        
        console.log('2D Zombie Manager ready');
        return true;
    }

    /**
     * Set combat system for zombie-vehicle interactions
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
        console.log('Combat system connected to 2D Zombie Manager');
    }

    /**
     * Set vehicle manager for zombie AI targeting
     */
    setVehicleManager(vehicleManager) {
        this.vehicleManager = vehicleManager;
        console.log('Vehicle manager connected to 2D Zombie Manager');
    }

    /**
     * Update all zombies and spawning logic
     */
    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        // Handle spawning based on stage difficulty
        this._handleSpawning(deltaTime);
        
        // Update zombies in batches for performance
        this._updateZombiesBatched(deltaTime);
        
        // Clean up destroyed zombies
        this._cleanupDestroyedZombies();
        
        // Update statistics
        this._updateStatistics();
        
        // Check for despawning distant zombies
        this._despawnDistantZombies();
    }

    /**
     * Spawn a zombie at a specific position
     */
    async spawnZombie(type, x, y, options = {}) {
        try {
            if (this.zombies.size >= this.maxZombies) {
                return null; // Max zombies reached
            }

            const config = getZombieConfig(type);
            if (!config) {
                throw new Error(`Unknown zombie type: ${type}`);
            }

            // Apply stage-based scaling
            const scaledConfig = this._applyStageScaling(config);

            const zombie = new Zombie2D(type, scaledConfig, this.gameEngine);
            
            // Initialize the zombie
            await zombie.initialize();
            
            // Set position
            zombie.setPosition(x, y);
            
            // Apply options
            if (options.health) {
                zombie.health = options.health;
            }

            // Add to managed zombies
            this.zombies.set(zombie.id, zombie);
            this.stats.totalSpawned++;

            // Register with combat system
            if (this.combatSystem) {
                this.combatSystem.registerZombie(zombie);
            }

            // Trigger callback
            if (this.onZombieSpawned) {
                this.onZombieSpawned(zombie);
            }

            console.log(`Spawned 2D zombie: ${type} at (${x}, ${y})`);
            return zombie;
        } catch (error) {
            console.error(`Failed to spawn 2D zombie ${type}:`, error);
            return null;
        }
    }

    /**
     * Spawn a random zombie based on current stage
     */
    async spawnRandomZombie(x, y) {
        const stageConfig = this.stageConfigs[this.currentStage];
        const allowedTypes = stageConfig.allowedTypes;
        
        // Check for boss spawn
        if (Math.random() < stageConfig.bossChance) {
            const bossTypes = [ZOMBIE_TYPES.BOSS_TYRANT, ZOMBIE_TYPES.BOSS_MUTANT];
            const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            return await this.spawnZombie(bossType, x, y);
        }
        
        // Spawn regular zombie
        const randomType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        return await this.spawnZombie(randomType, x, y);
    }

    /**
     * Spawn multiple zombies in an area (horde)
     */
    async spawnHorde(centerX, centerY, count = 5, radius = 50) {
        const spawnedZombies = [];
        
        for (let i = 0; i < count; i++) {
            // Random position within radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const zombie = await this.spawnRandomZombie(x, y);
            if (zombie) {
                spawnedZombies.push(zombie);
            }
        }
        
        console.log(`Spawned horde of ${spawnedZombies.length} zombies`);
        return spawnedZombies;
    }

    /**
     * Remove a zombie from the manager
     */
    removeZombie(zombieId) {
        const zombie = this.zombies.get(zombieId);
        if (!zombie) {
            return false;
        }

        // Unregister from combat system
        if (this.combatSystem) {
            this.combatSystem.unregisterZombie(zombieId);
        }

        // Dispose of the zombie
        zombie.dispose();

        // Remove from collection
        this.zombies.delete(zombieId);

        // Update statistics
        if (zombie.health <= 0) {
            this.stats.totalKilled++;
        }

        // Trigger callback
        if (this.onZombieDestroyed) {
            this.onZombieDestroyed(zombie);
        }

        return true;
    }

    /**
     * Get zombie by ID
     */
    getZombie(zombieId) {
        return this.zombies.get(zombieId);
    }

    /**
     * Get all zombies
     */
    getAllZombies() {
        return Array.from(this.zombies.values());
    }

    /**
     * Get zombies within a radius of a position
     */
    getZombiesInRadius(x, y, radius) {
        const zombies = [];
        
        for (const zombie of this.zombies.values()) {
            if (zombie.isDestroyed) continue;
            
            const zombiePos = zombie.getPosition();
            const dx = zombiePos.x - x;
            const dy = zombiePos.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                zombies.push({
                    zombie,
                    distance
                });
            }
        }
        
        // Sort by distance
        zombies.sort((a, b) => a.distance - b.distance);
        return zombies.map(item => item.zombie);
    }

    /**
     * Set current stage and update difficulty
     */
    setStage(stageNumber) {
        if (stageNumber !== this.currentStage && this.stageConfigs[stageNumber]) {
            this.currentStage = stageNumber;
            this._updateStageSettings();
            
            if (this.onStageChanged) {
                this.onStageChanged(stageNumber);
            }
            
            console.log(`Stage changed to ${stageNumber}`);
        }
    }

    /**
     * Clear all zombies
     */
    clearAllZombies() {
        const zombieIds = Array.from(this.zombies.keys());
        zombieIds.forEach(id => this.removeZombie(id));
        
        console.log('All 2D zombies cleared');
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.stats,
            activeZombies: this.zombies.size,
            maxZombies: this.maxZombies,
            spawnRate: this.currentSpawnRate,
            currentStage: this.currentStage,
            zombieDensity: this.stageConfigs[this.currentStage].zombieDensity
        };
    }

    /**
     * Setup default spawn points around the camera view
     */
    _setupDefaultSpawnPoints() {
        // Create spawn points in a circle around the camera
        const spawnDistance = this.spawnRadius;
        const spawnCount = 8;
        
        for (let i = 0; i < spawnCount; i++) {
            const angle = (i / spawnCount) * Math.PI * 2;
            this.spawnPoints.push({
                offsetX: Math.cos(angle) * spawnDistance,
                offsetY: Math.sin(angle) * spawnDistance,
                weight: 1
            });
        }
    }

    /**
     * Update stage-based settings
     */
    _updateStageSettings() {
        const stageConfig = this.stageConfigs[this.currentStage];
        if (!stageConfig) return;
        
        this.maxZombies = stageConfig.maxZombies;
        this.currentSpawnRate = this.baseSpawnRate * stageConfig.spawnRateMultiplier;
        
        console.log(`Updated settings for stage ${this.currentStage}: max=${this.maxZombies}, rate=${this.currentSpawnRate}`);
    }

    /**
     * Handle zombie spawning logic
     */
    _handleSpawning(deltaTime) {
        const stageConfig = this.stageConfigs[this.currentStage];
        const targetDensity = stageConfig.zombieDensity;
        const currentDensity = this.zombies.size / this.maxZombies;
        
        // Only spawn if below target density
        if (currentDensity < targetDensity) {
            const spawnInterval = 1000 / this.currentSpawnRate; // ms between spawns
            
            if (this.spawnTimer >= spawnInterval) {
                this._spawnAtRandomPoint();
                this.spawnTimer = 0;
            }
        }
    }

    /**
     * Spawn zombie at random spawn point relative to camera
     */
    async _spawnAtRandomPoint() {
        if (this.spawnPoints.length === 0) return;
        
        // Get camera position
        const camera = this.gameEngine.camera;
        const cameraX = camera ? camera.x : 0;
        const cameraY = camera ? camera.y : 0;
        
        // Select random spawn point
        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        
        // Calculate world position
        const spawnX = cameraX + spawnPoint.offsetX + (Math.random() - 0.5) * 100;
        const spawnY = cameraY + spawnPoint.offsetY + (Math.random() - 0.5) * 100;
        
        await this.spawnRandomZombie(spawnX, spawnY);
    }

    /**
     * Update zombies in batches for performance
     */
    _updateZombiesBatched(deltaTime) {
        const zombieArray = Array.from(this.zombies.values());
        if (zombieArray.length === 0) return;
        
        const batchSize = Math.min(this.updateBatchSize, zombieArray.length);
        
        for (let i = 0; i < batchSize; i++) {
            const index = (this.currentUpdateIndex + i) % zombieArray.length;
            const zombie = zombieArray[index];
            
            if (zombie && !zombie.isDestroyed) {
                // Provide vehicle information for AI
                if (this.vehicleManager) {
                    const nearbyVehicles = this.vehicleManager.getVehiclesInRadius(
                        zombie.getPosition().x,
                        zombie.getPosition().y,
                        zombie.detectionRadius
                    );
                    
                    if (nearbyVehicles.length > 0) {
                        zombie.targetVehicle = nearbyVehicles[0]; // Target closest vehicle
                    }
                }
                
                zombie.update(deltaTime);
            }
        }
        
        this.currentUpdateIndex = (this.currentUpdateIndex + batchSize) % zombieArray.length;
    }

    /**
     * Clean up destroyed zombies
     */
    _cleanupDestroyedZombies() {
        const zombiesToRemove = [];
        
        for (const [id, zombie] of this.zombies.entries()) {
            if (zombie.isDestroyed) {
                zombiesToRemove.push(id);
            }
        }
        
        zombiesToRemove.forEach(id => this.removeZombie(id));
    }

    /**
     * Despawn zombies that are too far from camera
     */
    _despawnDistantZombies() {
        const camera = this.gameEngine.camera;
        if (!camera) return;
        
        const cameraX = camera.x;
        const cameraY = camera.y;
        const despawnDistanceSq = this.despawnDistance * this.despawnDistance;
        
        const zombiesToRemove = [];
        
        for (const [id, zombie] of this.zombies.entries()) {
            const pos = zombie.getPosition();
            const dx = pos.x - cameraX;
            const dy = pos.y - cameraY;
            const distanceSq = dx * dx + dy * dy;
            
            if (distanceSq > despawnDistanceSq) {
                zombiesToRemove.push(id);
            }
        }
        
        zombiesToRemove.forEach(id => this.removeZombie(id));
        
        if (zombiesToRemove.length > 0) {
            console.log(`Despawned ${zombiesToRemove.length} distant zombies`);
        }
    }

    /**
     * Apply stage-based scaling to zombie config
     */
    _applyStageScaling(config) {
        const scaledConfig = { ...config };
        const stageMultiplier = 1 + (this.currentStage - 1) * 0.3; // 30% increase per stage
        
        scaledConfig.health = Math.floor(config.health * stageMultiplier);
        scaledConfig.maxHealth = Math.floor(config.maxHealth * stageMultiplier);
        scaledConfig.damage = Math.floor(config.damage * stageMultiplier);
        scaledConfig.speed = Math.min(config.speed * stageMultiplier, config.speed * 2); // Cap at 2x speed
        scaledConfig.pointValue = Math.floor(config.pointValue * stageMultiplier);
        
        return scaledConfig;
    }

    /**
     * Update statistics
     */
    _updateStatistics() {
        this.stats.activeZombies = this.zombies.size;
        this.stats.currentDensity = this.zombies.size / this.maxZombies;
    }

    /**
     * Dispose of the zombie manager and clean up all resources
     */
    dispose() {
        this.clearAllZombies();
        
        // Clear spawn points
        this.spawnPoints = [];
        
        // Clear callbacks
        this.onZombieSpawned = null;
        this.onZombieDestroyed = null;
        this.onStageChanged = null;
        
        console.log('2D Zombie Manager disposed');
    }
}