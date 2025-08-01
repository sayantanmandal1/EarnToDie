import { Zombie } from './Zombie';
import { getZombieConfig, getRandomZombieType, getBossZombieTypes, ZOMBIE_TYPES } from './ZombieConfig';
import * as THREE from 'three';

/**
 * ZombieManager handles spawning, updating, and managing zombie instances and hordes
 */
export class ZombieManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.zombies = new Map();
        this.spawnPoints = [];
        this.hordes = [];
        
        // Spawning settings
        this.maxZombies = 100;
        this.spawnRate = 2.0; // Zombies per second
        this.spawnTimer = 0;
        this.spawnRadius = 50;
        this.despawnDistance = 100;
        
        // Horde management
        this.hordeSpawnTimer = 0;
        this.hordeSpawnInterval = 30; // Spawn horde every 30 seconds
        
        // Performance optimization
        this.updateBatchSize = 10; // Update 10 zombies per frame
        this.currentUpdateIndex = 0;
        
        // Difficulty scaling
        this.difficultyLevel = 1;
        this.difficultyTimer = 0;
        this.difficultyIncreaseInterval = 60; // Increase difficulty every minute
        
        // Statistics
        this.stats = {
            totalSpawned: 0,
            totalKilled: 0,
            activeZombies: 0,
            hordesSpawned: 0
        };
        
        // Event callbacks
        this.onZombieSpawned = null;
        this.onZombieDestroyed = null;
        this.onHordeSpawned = null;
        this.onDifficultyChanged = null;
    }

    /**
     * Initialize the zombie manager
     */
    initialize() {
        this._setupDefaultSpawnPoints();
        console.log('ZombieManager initialized');
        return true;
    }

    /**
     * Update all zombies and spawning logic
     */
    update(deltaTime) {
        // Update spawn timers
        this.spawnTimer += deltaTime;
        this.hordeSpawnTimer += deltaTime;
        this.difficultyTimer += deltaTime;
        
        // Update difficulty
        this._updateDifficulty(deltaTime);
        
        // Handle spawning
        this._handleSpawning(deltaTime);
        
        // Update zombies in batches for performance
        this._updateZombiesBatched(deltaTime);
        
        // Clean up destroyed zombies
        this._cleanupDestroyedZombies();
        
        // Update statistics
        this._updateStatistics();
    }

    /**
     * Spawn a zombie at a specific position
     */
    async spawnZombie(type, position, options = {}) {
        try {
            if (this.zombies.size >= this.maxZombies) {
                console.warn('Maximum zombie limit reached');
                return null;
            }

            const config = getZombieConfig(type);
            if (!config) {
                throw new Error(`Unknown zombie type: ${type}`);
            }

            // Apply difficulty scaling
            const scaledConfig = this._applyDifficultyScaling(config);

            const zombie = new Zombie(type, scaledConfig, this.gameEngine);
            
            // Initialize the zombie
            await zombie.initialize();
            
            // Set position
            zombie.setPosition(position);
            
            // Apply options
            if (options.health) {
                zombie.health = options.health;
            }
            
            if (options.target) {
                zombie.ai.setTarget(options.target);
            }

            // Add to managed zombies
            this.zombies.set(zombie.id, zombie);
            this.stats.totalSpawned++;

            // Trigger callback
            if (this.onZombieSpawned) {
                this.onZombieSpawned(zombie);
            }

            console.log(`Spawned zombie: ${type} at position`, position);
            return zombie;
        } catch (error) {
            console.error(`Failed to spawn zombie ${type}:`, error);
            throw error;
        }
    }

    /**
     * Spawn a random zombie
     */
    async spawnRandomZombie(position, excludeBosses = true) {
        const type = getRandomZombieType(excludeBosses);
        return await this.spawnZombie(type, position);
    }

    /**
     * Spawn a horde of zombies
     */
    async spawnHorde(centerPosition, count = 10, radius = 15, types = null) {
        const spawnedZombies = [];
        const availableTypes = types || [
            ZOMBIE_TYPES.WALKER,
            ZOMBIE_TYPES.RUNNER,
            ZOMBIE_TYPES.CRAWLER,
            ZOMBIE_TYPES.SPITTER
        ];

        for (let i = 0; i < count; i++) {
            try {
                // Random position within radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radius;
                const position = new THREE.Vector3(
                    centerPosition.x + Math.cos(angle) * distance,
                    centerPosition.y,
                    centerPosition.z + Math.sin(angle) * distance
                );

                // Random zombie type from available types
                const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                
                const zombie = await this.spawnZombie(randomType, position);
                if (zombie) {
                    spawnedZombies.push(zombie);
                }
            } catch (error) {
                console.error(`Failed to spawn horde zombie ${i}:`, error);
            }
        }

        // Create horde data structure
        const horde = {
            id: this._generateId(),
            centerPosition: centerPosition.clone(),
            zombies: spawnedZombies,
            spawnTime: Date.now(),
            isActive: true
        };

        this.hordes.push(horde);
        this.stats.hordesSpawned++;

        // Trigger callback
        if (this.onHordeSpawned) {
            this.onHordeSpawned(horde);
        }

        console.log(`Spawned horde of ${spawnedZombies.length} zombies`);
        return horde;
    }

    /**
     * Spawn a boss zombie
     */
    async spawnBoss(position, bossType = null) {
        const bossTypes = getBossZombieTypes();
        const type = bossType || bossTypes[Math.floor(Math.random() * bossTypes.length)];
        
        const boss = await this.spawnZombie(type, position);
        
        if (boss) {
            // Spawn minions around the boss
            const minionCount = 5 + Math.floor(this.difficultyLevel * 2);
            await this.spawnHorde(position, minionCount, 20, [
                ZOMBIE_TYPES.WALKER,
                ZOMBIE_TYPES.RUNNER,
                ZOMBIE_TYPES.ARMORED
            ]);
        }
        
        return boss;
    }

    /**
     * Remove a zombie from the manager
     */
    removeZombie(zombieId) {
        const zombie = this.zombies.get(zombieId);
        if (!zombie) {
            console.warn(`Zombie ${zombieId} not found for removal`);
            return false;
        }

        // Dispose of the zombie
        zombie.dispose();

        // Remove from collections
        this.zombies.delete(zombieId);
        
        // Update horde data
        this._removeZombieFromHordes(zombie);

        // Update statistics
        if (zombie.health <= 0) {
            this.stats.totalKilled++;
        }

        // Trigger callback
        if (this.onZombieDestroyed) {
            this.onZombieDestroyed(zombie);
        }

        console.log(`Zombie ${zombieId} removed`);
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
    getZombiesInRadius(position, radius) {
        const zombies = [];
        
        for (const zombie of this.zombies.values()) {
            if (zombie.isDestroyed) continue;
            
            const zombiePos = zombie.getPosition();
            const distance = zombiePos.distanceTo(position);
            
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
     * Get zombies by type
     */
    getZombiesByType(type) {
        return Array.from(this.zombies.values()).filter(zombie => zombie.type === type);
    }

    /**
     * Get active hordes
     */
    getActiveHordes() {
        return this.hordes.filter(horde => horde.isActive);
    }

    /**
     * Set spawn points for zombie spawning
     */
    setSpawnPoints(spawnPoints) {
        this.spawnPoints = spawnPoints.map(point => ({
            position: point.position.clone(),
            radius: point.radius || 5,
            weight: point.weight || 1,
            types: point.types || null
        }));
    }

    /**
     * Add a spawn point
     */
    addSpawnPoint(position, radius = 5, weight = 1, types = null) {
        this.spawnPoints.push({
            position: position.clone(),
            radius,
            weight,
            types
        });
    }

    /**
     * Clear all zombies
     */
    clearAllZombies() {
        const zombieIds = Array.from(this.zombies.keys());
        zombieIds.forEach(id => this.removeZombie(id));
        
        this.hordes = [];
        
        console.log('All zombies cleared');
    }

    /**
     * Set maximum zombie count
     */
    setMaxZombies(max) {
        this.maxZombies = max;
    }

    /**
     * Set spawn rate
     */
    setSpawnRate(rate) {
        this.spawnRate = rate;
    }

    /**
     * Set difficulty level
     */
    setDifficultyLevel(level) {
        this.difficultyLevel = Math.max(1, level);
        
        if (this.onDifficultyChanged) {
            this.onDifficultyChanged(this.difficultyLevel);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.stats,
            activeZombies: this.zombies.size,
            maxZombies: this.maxZombies,
            spawnRate: this.spawnRate,
            difficultyLevel: this.difficultyLevel,
            activeHordes: this.hordes.filter(h => h.isActive).length
        };
    }

    /**
     * Setup default spawn points
     */
    _setupDefaultSpawnPoints() {
        // Create spawn points in a circle around the origin
        const spawnDistance = 40;
        const spawnCount = 8;
        
        for (let i = 0; i < spawnCount; i++) {
            const angle = (i / spawnCount) * Math.PI * 2;
            const position = new THREE.Vector3(
                Math.cos(angle) * spawnDistance,
                0,
                Math.sin(angle) * spawnDistance
            );
            
            this.addSpawnPoint(position, 10, 1);
        }
    }

    /**
     * Update difficulty scaling
     */
    _updateDifficulty(deltaTime) {
        if (this.difficultyTimer >= this.difficultyIncreaseInterval) {
            this.difficultyLevel++;
            this.difficultyTimer = 0;
            
            console.log(`Difficulty increased to level ${this.difficultyLevel}`);
            
            if (this.onDifficultyChanged) {
                this.onDifficultyChanged(this.difficultyLevel);
            }
        }
    }

    /**
     * Handle zombie spawning logic
     */
    _handleSpawning(deltaTime) {
        // Regular spawning
        if (this.spawnTimer >= 1.0 / this.spawnRate && this.zombies.size < this.maxZombies) {
            this._spawnAtRandomPoint();
            this.spawnTimer = 0;
        }
        
        // Horde spawning
        if (this.hordeSpawnTimer >= this.hordeSpawnInterval) {
            this._spawnRandomHorde();
            this.hordeSpawnTimer = 0;
        }
    }

    /**
     * Spawn zombie at random spawn point
     */
    async _spawnAtRandomPoint() {
        if (this.spawnPoints.length === 0) return;
        
        // Select spawn point based on weights
        const totalWeight = this.spawnPoints.reduce((sum, point) => sum + point.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedPoint = this.spawnPoints[0];
        for (const point of this.spawnPoints) {
            random -= point.weight;
            if (random <= 0) {
                selectedPoint = point;
                break;
            }
        }
        
        // Random position within spawn point radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * selectedPoint.radius;
        const spawnPosition = new THREE.Vector3(
            selectedPoint.position.x + Math.cos(angle) * distance,
            selectedPoint.position.y,
            selectedPoint.position.z + Math.sin(angle) * distance
        );
        
        // Select zombie type
        const availableTypes = selectedPoint.types || null;
        let zombieType;
        
        if (availableTypes) {
            zombieType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        } else {
            zombieType = getRandomZombieType(true);
        }
        
        await this.spawnZombie(zombieType, spawnPosition);
    }

    /**
     * Spawn random horde
     */
    async _spawnRandomHorde() {
        if (this.spawnPoints.length === 0) return;
        
        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        const hordeSize = 8 + Math.floor(this.difficultyLevel * 2);
        
        await this.spawnHorde(spawnPoint.position, hordeSize, 20);
    }

    /**
     * Update zombies in batches for performance
     */
    _updateZombiesBatched(deltaTime) {
        const zombieArray = Array.from(this.zombies.values());
        const batchSize = Math.min(this.updateBatchSize, zombieArray.length);
        
        for (let i = 0; i < batchSize; i++) {
            const index = (this.currentUpdateIndex + i) % zombieArray.length;
            const zombie = zombieArray[index];
            
            if (zombie && !zombie.isDestroyed) {
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
     * Apply difficulty scaling to zombie config
     */
    _applyDifficultyScaling(config) {
        const scaledConfig = { ...config };
        const scaleFactor = 1 + (this.difficultyLevel - 1) * 0.2; // 20% increase per level
        
        scaledConfig.health = Math.floor(config.health * scaleFactor);
        scaledConfig.maxHealth = Math.floor(config.maxHealth * scaleFactor);
        scaledConfig.damage = Math.floor(config.damage * scaleFactor);
        scaledConfig.speed = Math.min(config.speed * scaleFactor, config.speed * 2); // Cap at 2x speed
        scaledConfig.pointValue = Math.floor(config.pointValue * scaleFactor);
        
        return scaledConfig;
    }

    /**
     * Remove zombie from horde data
     */
    _removeZombieFromHordes(zombie) {
        this.hordes.forEach(horde => {
            const index = horde.zombies.indexOf(zombie);
            if (index !== -1) {
                horde.zombies.splice(index, 1);
                
                // Mark horde as inactive if all zombies are gone
                if (horde.zombies.length === 0) {
                    horde.isActive = false;
                }
            }
        });
    }

    /**
     * Update statistics
     */
    _updateStatistics() {
        this.stats.activeZombies = this.zombies.size;
    }

    /**
     * Generate unique ID
     */
    _generateId() {
        return 'horde_' + Math.random().toString(36).substr(2, 9);
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
        this.onHordeSpawned = null;
        this.onDifficultyChanged = null;
        
        console.log('ZombieManager disposed');
    }
}