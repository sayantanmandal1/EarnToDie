/**
 * Dynamic Difficulty and Spawning System
 * 
 * This system implements adaptive difficulty based on player performance,
 * intelligent zombie spawning patterns, boss zombies with special abilities,
 * and environmental hazards with interactive objects.
 * 
 * Features:
 * - Performance-based difficulty scaling
 * - Intelligent spawn pattern algorithms
 * - Boss zombie mechanics with special abilities
 * - Environmental hazards and interactive objects
 * - Real-time difficulty adjustment
 */

import PerformanceTracker from './PerformanceTracker';
import IntelligentSpawnManager from './IntelligentSpawnManager';

class DynamicDifficultySystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.difficultyLevel = 1.0;
        this.performanceTracker = new PerformanceTracker();
        this.spawnManager = new IntelligentSpawnManager();
        this.bossManager = new BossZombieManager();
        this.hazardManager = new EnvironmentalHazardManager();
        
        // Difficulty adjustment parameters
        this.adjustmentRate = 0.1;
        this.minDifficulty = 0.5;
        this.maxDifficulty = 3.0;
        this.evaluationInterval = 5000; // 5 seconds
        
        // Performance thresholds
        this.performanceThresholds = {
            excellent: 0.8,
            good: 0.6,
            average: 0.4,
            poor: 0.2
        };
        
        this.lastEvaluation = Date.now();
        this.difficultyHistory = [];
        
        this.initializeSystem();
    }
    
    initializeSystem() {
        console.log('🎯 Initializing Dynamic Difficulty System');
        
        // Set up performance tracking
        this.performanceTracker.initialize();
        
        // Initialize spawn patterns
        this.spawnManager.initialize(this.gameState);
        
        // Set up boss mechanics
        this.bossManager.initialize();
        
        // Initialize environmental hazards
        this.hazardManager.initialize(this.gameState);
        
        console.log('✅ Dynamic Difficulty System initialized');
    }
    
    update(deltaTime) {
        // Update performance tracking
        this.performanceTracker.update(deltaTime, this.gameState);
        
        // Check if it's time to evaluate difficulty
        const currentTime = Date.now();
        if (currentTime - this.lastEvaluation >= this.evaluationInterval) {
            this.evaluateAndAdjustDifficulty();
            this.lastEvaluation = currentTime;
        }
        
        // Update spawn manager with current difficulty
        this.spawnManager.update(deltaTime, this.difficultyLevel);
        
        // Update boss manager
        this.bossManager.update(deltaTime, this.difficultyLevel);
        
        // Update environmental hazards
        this.hazardManager.update(deltaTime, this.difficultyLevel);
    }
    
    evaluateAndAdjustDifficulty() {
        const performance = this.performanceTracker.getPerformanceScore();
        const targetDifficulty = this.calculateTargetDifficulty(performance);
        
        // Smooth difficulty adjustment
        const difficultyDelta = (targetDifficulty - this.difficultyLevel) * this.adjustmentRate;
        this.difficultyLevel = Math.max(
            this.minDifficulty,
            Math.min(this.maxDifficulty, this.difficultyLevel + difficultyDelta)
        );
        
        // Record difficulty change
        this.difficultyHistory.push({
            timestamp: Date.now(),
            difficulty: this.difficultyLevel,
            performance: performance,
            reason: this.getDifficultyChangeReason(performance)
        });
        
        // Limit history size
        if (this.difficultyHistory.length > 100) {
            this.difficultyHistory.shift();
        }
        
        console.log(`🎯 Difficulty adjusted to ${this.difficultyLevel.toFixed(2)} (Performance: ${performance.toFixed(2)})`);
    }
    
    calculateTargetDifficulty(performance) {
        if (performance >= this.performanceThresholds.excellent) {
            return Math.min(this.maxDifficulty, this.difficultyLevel * 1.2);
        } else if (performance >= this.performanceThresholds.good) {
            return Math.min(this.maxDifficulty, this.difficultyLevel * 1.1);
        } else if (performance >= this.performanceThresholds.average) {
            return this.difficultyLevel; // Maintain current difficulty
        } else if (performance >= this.performanceThresholds.poor) {
            return Math.max(this.minDifficulty, this.difficultyLevel * 0.9);
        } else {
            return Math.max(this.minDifficulty, this.difficultyLevel * 0.8);
        }
    }
    
    getDifficultyChangeReason(performance) {
        if (performance >= this.performanceThresholds.excellent) {
            return 'Player performing excellently - increasing challenge';
        } else if (performance >= this.performanceThresholds.good) {
            return 'Player performing well - slight increase';
        } else if (performance >= this.performanceThresholds.average) {
            return 'Player performing adequately - maintaining difficulty';
        } else if (performance >= this.performanceThresholds.poor) {
            return 'Player struggling - reducing difficulty';
        } else {
            return 'Player having significant difficulty - major reduction';
        }
    }
    
    // Spawn management interface
    requestZombieSpawn(position, type = 'normal') {
        return this.spawnManager.requestSpawn(position, type, this.difficultyLevel);
    }
    
    requestBossSpawn(position, bossType) {
        return this.bossManager.requestBossSpawn(position, bossType, this.difficultyLevel);
    }
    
    requestHazardActivation(hazardId) {
        return this.hazardManager.activateHazard(hazardId, this.difficultyLevel);
    }
    
    // Getters for system state
    getDifficultyLevel() {
        return this.difficultyLevel;
    }
    
    getPerformanceScore() {
        return this.performanceTracker.getPerformanceScore();
    }
    
    getDifficultyHistory() {
        return [...this.difficultyHistory];
    }
    
    getSpawnStatistics() {
        return this.spawnManager.getStatistics();
    }
    
    getBossStatistics() {
        return this.bossManager.getStatistics();
    }
    
    getHazardStatistics() {
        return this.hazardManager.getStatistics();
    }
    
    // Manual difficulty override (for testing/debugging)
    setDifficultyOverride(difficulty) {
        this.difficultyLevel = Math.max(
            this.minDifficulty,
            Math.min(this.maxDifficulty, difficulty)
        );
        console.log(`🎯 Difficulty manually set to ${this.difficultyLevel}`);
    }
    
    clearDifficultyOverride() {
        console.log('🎯 Difficulty override cleared - resuming adaptive difficulty');
    }
}

export default DynamicDifficultySystem;

/**
 * Boss Zombie Manager
 * 
 * Manages boss zombie spawning, abilities, and special behaviors.
 * Creates challenging encounters with unique mechanics.
 */

class BossZombieManager {
    constructor() {
        this.bossTypes = new Map();
        this.activeBosses = [];
        this.bossHistory = [];
        this.bossSpawnCooldown = 0;
        
        // Boss spawn configuration
        this.minTimeBetweenBosses = 60000; // 1 minute
        this.maxActiveBosses = 2;
        this.bossSpawnChance = 0.1; // 10% base chance
        
        this.statistics = {
            bossesSpawned: 0,
            bossesByType: {},
            bossesDefeated: 0,
            averageBossFightDuration: 0
        };
        
        this.initializeBossTypes();
    }
    
    initialize() {
        console.log('👹 Initializing Boss Zombie Manager');
        this.resetStatistics();
    }
    
    initializeBossTypes() {
        // Brute Boss - High health, slow but devastating attacks
        this.bossTypes.set('brute', {
            name: 'Zombie Brute',
            health: 500,
            speed: 0.5,
            damage: 100,
            size: 2.0,
            abilities: ['charge_attack', 'ground_slam', 'intimidate'],
            spawnWeight: 0.4,
            minDifficulty: 1.0,
            description: 'Massive zombie with devastating melee attacks'
        });
        
        // Spitter Boss - Ranged acid attacks
        this.bossTypes.set('spitter', {
            name: 'Acid Spitter',
            health: 300,
            speed: 0.8,
            damage: 60,
            size: 1.5,
            abilities: ['acid_spit', 'acid_pool', 'corrosive_aura'],
            spawnWeight: 0.3,
            minDifficulty: 1.2,
            description: 'Ranged zombie that spits corrosive acid'
        });
        
        // Screamer Boss - Buffs other zombies, sonic attacks
        this.bossTypes.set('screamer', {
            name: 'Banshee Screamer',
            health: 250,
            speed: 1.2,
            damage: 40,
            size: 1.3,
            abilities: ['sonic_scream', 'zombie_rally', 'fear_aura'],
            spawnWeight: 0.2,
            minDifficulty: 1.5,
            description: 'Support zombie that enhances nearby zombies'
        });
        
        // Exploder Boss - Suicide bomber with massive damage
        this.bossTypes.set('exploder', {
            name: 'Volatile Exploder',
            health: 200,
            speed: 1.5,
            damage: 200,
            size: 1.2,
            abilities: ['explosive_charge', 'toxic_explosion', 'chain_reaction'],
            spawnWeight: 0.1,
            minDifficulty: 2.0,
            description: 'Unstable zombie that explodes on contact'
        });
    }
    
    update(deltaTime, difficultyLevel) {
        // Update boss spawn cooldown
        if (this.bossSpawnCooldown > 0) {
            this.bossSpawnCooldown -= deltaTime;
        }
        
        // Update active bosses
        this.updateActiveBosses(deltaTime);
        
        // Check for boss spawn opportunity
        if (this.shouldSpawnBoss(difficultyLevel)) {
            this.attemptBossSpawn(difficultyLevel);
        }
        
        // Update statistics
        this.updateStatistics(deltaTime);
    }
    
    shouldSpawnBoss(difficultyLevel) {
        // Don't spawn if cooldown active
        if (this.bossSpawnCooldown > 0) {
            return false;
        }
        
        // Don't spawn if at max capacity
        if (this.activeBosses.length >= this.maxActiveBosses) {
            return false;
        }
        
        // Difficulty-based spawn chance
        const adjustedChance = this.bossSpawnChance * Math.min(2.0, difficultyLevel);
        
        return Math.random() < adjustedChance;
    }
    
    attemptBossSpawn(difficultyLevel) {
        const bossType = this.selectBossType(difficultyLevel);
        if (!bossType) {
            return null;
        }
        
        // Find spawn position (away from player but not too far)
        const spawnPosition = this.findBossSpawnPosition();
        if (!spawnPosition) {
            return null;
        }
        
        const boss = this.createBoss(bossType, spawnPosition, difficultyLevel);
        this.activeBosses.push(boss);
        this.bossHistory.push(boss);
        
        // Set cooldown
        this.bossSpawnCooldown = this.minTimeBetweenBosses;
        
        // Update statistics
        this.statistics.bossesSpawned++;
        this.statistics.bossesByType[bossType.name] = 
            (this.statistics.bossesByType[bossType.name] || 0) + 1;
        
        console.log(`👹 Boss spawned: ${bossType.name} at difficulty ${difficultyLevel.toFixed(2)}`);
        
        return boss;
    }
    
    selectBossType(difficultyLevel) {
        const availableTypes = [];
        const weights = [];
        
        for (const [typeId, bossType] of this.bossTypes) {
            if (difficultyLevel >= bossType.minDifficulty) {
                availableTypes.push(bossType);
                weights.push(bossType.spawnWeight);
            }
        }
        
        if (availableTypes.length === 0) {
            return null;
        }
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availableTypes[i];
            }
        }
        
        return availableTypes[0]; // Fallback
    }
    
    findBossSpawnPosition() {
        // This would integrate with the game's spatial system
        // For now, return a placeholder position
        return {
            x: Math.random() * 100 - 50,
            y: 0,
            z: Math.random() * 100 - 50
        };
    }
    
    createBoss(bossType, position, difficultyLevel) {
        const boss = {
            id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: bossType,
            position: { ...position },
            health: bossType.health * difficultyLevel,
            maxHealth: bossType.health * difficultyLevel,
            speed: bossType.speed,
            damage: bossType.damage * difficultyLevel,
            size: bossType.size,
            abilities: [...bossType.abilities],
            status: 'spawning',
            spawnTime: Date.now(),
            lastAbilityUse: 0,
            abilityQueue: [],
            difficultyLevel: difficultyLevel,
            
            // AI state
            target: null,
            state: 'idle',
            stateTimer: 0,
            
            // Combat state
            lastAttack: 0,
            combatTimer: 0,
            enrageThreshold: 0.3, // Enrage at 30% health
            isEnraged: false
        };
        
        // Initialize boss-specific data
        this.initializeBossAbilities(boss);
        
        return boss;
    }
    
    initializeBossAbilities(boss) {
        boss.abilityData = {};
        
        boss.abilities.forEach(abilityName => {
            switch (abilityName) {
                case 'charge_attack':
                    boss.abilityData.charge_attack = {
                        cooldown: 8000,
                        lastUsed: 0,
                        damage: boss.damage * 1.5,
                        range: 30
                    };
                    break;
                    
                case 'ground_slam':
                    boss.abilityData.ground_slam = {
                        cooldown: 12000,
                        lastUsed: 0,
                        damage: boss.damage * 2.0,
                        radius: 15
                    };
                    break;
                    
                case 'acid_spit':
                    boss.abilityData.acid_spit = {
                        cooldown: 3000,
                        lastUsed: 0,
                        damage: boss.damage * 0.8,
                        range: 50,
                        projectileSpeed: 20
                    };
                    break;
                    
                case 'sonic_scream':
                    boss.abilityData.sonic_scream = {
                        cooldown: 15000,
                        lastUsed: 0,
                        damage: boss.damage * 0.6,
                        radius: 25,
                        stunDuration: 2000
                    };
                    break;
                    
                case 'explosive_charge':
                    boss.abilityData.explosive_charge = {
                        cooldown: 20000,
                        lastUsed: 0,
                        damage: boss.damage * 3.0,
                        radius: 20,
                        chargeSpeed: boss.speed * 2
                    };
                    break;
            }
        });
    }
    
    updateActiveBosses(deltaTime) {
        this.activeBosses.forEach(boss => {
            this.updateBossAI(boss, deltaTime);
            this.updateBossAbilities(boss, deltaTime);
            this.updateBossState(boss, deltaTime);
        });
        
        // Remove defeated bosses
        this.activeBosses = this.activeBosses.filter(boss => boss.health > 0);
    }
    
    updateBossAI(boss, deltaTime) {
        boss.stateTimer += deltaTime;
        
        // Check for enrage
        if (!boss.isEnraged && boss.health / boss.maxHealth <= boss.enrageThreshold) {
            boss.isEnraged = true;
            boss.speed *= 1.5;
            boss.damage *= 1.3;
            console.log(`👹 ${boss.type.name} has become enraged!`);
        }
        
        // Simple state machine
        switch (boss.state) {
            case 'idle':
                if (boss.stateTimer > 1000) {
                    boss.state = 'seeking';
                    boss.stateTimer = 0;
                }
                break;
                
            case 'seeking':
                // Look for player target
                if (this.findPlayerTarget(boss)) {
                    boss.state = 'combat';
                    boss.stateTimer = 0;
                }
                break;
                
            case 'combat':
                this.updateBossCombat(boss, deltaTime);
                break;
        }
    }
    
    updateBossAbilities(boss, deltaTime) {
        const currentTime = Date.now();
        
        // Update ability cooldowns
        Object.values(boss.abilityData).forEach(ability => {
            if (ability.lastUsed > 0 && currentTime - ability.lastUsed >= ability.cooldown) {
                ability.ready = true;
            }
        });
        
        // Process ability queue
        if (boss.abilityQueue.length > 0 && boss.state === 'combat') {
            const nextAbility = boss.abilityQueue[0];
            if (this.canUseAbility(boss, nextAbility)) {
                this.executeAbility(boss, nextAbility);
                boss.abilityQueue.shift();
            }
        }
    }
    
    updateBossState(boss, deltaTime) {
        boss.combatTimer += deltaTime;
        
        // Update position (simplified movement)
        if (boss.target) {
            const direction = this.calculateDirection(boss.position, boss.target.position);
            const moveSpeed = boss.speed * (deltaTime / 1000);
            
            boss.position.x += direction.x * moveSpeed;
            boss.position.z += direction.z * moveSpeed;
        }
    }
    
    findPlayerTarget(boss) {
        // This would integrate with the game's player system
        // For now, return a mock target
        boss.target = {
            position: { x: 0, y: 0, z: 0 },
            health: 100
        };
        return true;
    }
    
    updateBossCombat(boss, deltaTime) {
        if (!boss.target) {
            boss.state = 'seeking';
            return;
        }
        
        const distance = this.calculateDistance(boss.position, boss.target.position);
        
        // Select and queue abilities based on distance and situation
        if (boss.abilityQueue.length === 0) {
            const ability = this.selectBestAbility(boss, distance);
            if (ability) {
                boss.abilityQueue.push(ability);
            }
        }
    }
    
    selectBestAbility(boss, distanceToTarget) {
        const availableAbilities = boss.abilities.filter(abilityName => 
            this.canUseAbility(boss, abilityName)
        );
        
        if (availableAbilities.length === 0) {
            return null;
        }
        
        // Simple ability selection logic
        if (distanceToTarget < 10) {
            // Close range - prefer melee abilities
            const meleeAbilities = availableAbilities.filter(ability => 
                ['charge_attack', 'ground_slam', 'explosive_charge'].includes(ability)
            );
            return meleeAbilities[Math.floor(Math.random() * meleeAbilities.length)] || availableAbilities[0];
        } else {
            // Long range - prefer ranged abilities
            const rangedAbilities = availableAbilities.filter(ability => 
                ['acid_spit', 'sonic_scream'].includes(ability)
            );
            return rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)] || availableAbilities[0];
        }
    }
    
    canUseAbility(boss, abilityName) {
        const abilityData = boss.abilityData[abilityName];
        if (!abilityData) return false;
        
        const currentTime = Date.now();
        return currentTime - abilityData.lastUsed >= abilityData.cooldown;
    }
    
    executeAbility(boss, abilityName) {
        const abilityData = boss.abilityData[abilityName];
        const currentTime = Date.now();
        
        console.log(`👹 ${boss.type.name} uses ${abilityName}`);
        
        // Mark ability as used
        abilityData.lastUsed = currentTime;
        
        // Execute ability-specific logic
        switch (abilityName) {
            case 'charge_attack':
                this.executeChargeAttack(boss);
                break;
            case 'ground_slam':
                this.executeGroundSlam(boss);
                break;
            case 'acid_spit':
                this.executeAcidSpit(boss);
                break;
            case 'sonic_scream':
                this.executeSonicScream(boss);
                break;
            case 'explosive_charge':
                this.executeExplosiveCharge(boss);
                break;
        }
    }
    
    executeChargeAttack(boss) {
        // Implementation would create a charge attack effect
        console.log(`💥 ${boss.type.name} charges forward!`);
    }
    
    executeGroundSlam(boss) {
        // Implementation would create ground slam effect
        console.log(`💥 ${boss.type.name} slams the ground!`);
    }
    
    executeAcidSpit(boss) {
        // Implementation would create acid projectile
        console.log(`🧪 ${boss.type.name} spits acid!`);
    }
    
    executeSonicScream(boss) {
        // Implementation would create sonic wave effect
        console.log(`📢 ${boss.type.name} lets out a terrifying scream!`);
    }
    
    executeExplosiveCharge(boss) {
        // Implementation would create explosive charge
        console.log(`💣 ${boss.type.name} begins explosive charge!`);
    }
    
    calculateDirection(from, to) {
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance === 0) return { x: 0, z: 0 };
        
        return {
            x: dx / distance,
            z: dz / distance
        };
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    requestBossSpawn(position, bossType, difficultyLevel) {
        const typeData = this.bossTypes.get(bossType);
        if (!typeData) {
            console.warn(`Unknown boss type: ${bossType}`);
            return null;
        }
        
        const boss = this.createBoss(typeData, position, difficultyLevel);
        this.activeBosses.push(boss);
        this.bossHistory.push(boss);
        
        this.statistics.bossesSpawned++;
        this.statistics.bossesByType[typeData.name] = 
            (this.statistics.bossesByType[typeData.name] || 0) + 1;
        
        return boss;
    }
    
    updateStatistics(deltaTime) {
        // Calculate average boss fight duration
        const completedBosses = this.bossHistory.filter(boss => boss.health <= 0);
        if (completedBosses.length > 0) {
            const totalDuration = completedBosses.reduce((sum, boss) => {
                return sum + (boss.defeatTime - boss.spawnTime);
            }, 0);
            this.statistics.averageBossFightDuration = totalDuration / completedBosses.length;
            this.statistics.bossesDefeated = completedBosses.length;
        }
    }
    
    getStatistics() {
        return {
            ...this.statistics,
            activeBosses: this.activeBosses.length,
            bossTypes: Array.from(this.bossTypes.keys()),
            cooldownRemaining: Math.max(0, this.bossSpawnCooldown)
        };
    }
    
    resetStatistics() {
        this.statistics = {
            bossesSpawned: 0,
            bossesByType: {},
            bossesDefeated: 0,
            averageBossFightDuration: 0
        };
        
        this.activeBosses = [];
        this.bossHistory = [];
        this.bossSpawnCooldown = 0;
    }
    
    getActiveBosses() {
        return [...this.activeBosses];
    }
    
    getBossHistory(limit = 20) {
        return this.bossHistory.slice(-limit);
    }
}

/**
 * Environmental Hazard Manager
 * 
 * Manages environmental hazards and interactive objects that add
 * complexity and challenge to the gameplay experience.
 */

class EnvironmentalHazardManager {
    constructor() {
        this.hazardTypes = new Map();
        this.activeHazards = [];
        this.interactiveObjects = [];
        this.hazardHistory = [];
        
        // Hazard configuration
        this.maxActiveHazards = 10;
        this.hazardSpawnRate = 15000; // 15 seconds
        this.lastHazardSpawn = 0;
        
        this.statistics = {
            hazardsSpawned: 0,
            hazardsByType: {},
            hazardsTriggered: 0,
            playerInteractions: 0
        };
        
        this.initializeHazardTypes();
    }
    
    initialize(gameState) {
        console.log('⚠️ Initializing Environmental Hazard Manager');
        this.gameState = gameState;
        this.resetStatistics();
    }
    
    initializeHazardTypes() {
        // Explosive Barrels
        this.hazardTypes.set('explosive_barrel', {
            name: 'Explosive Barrel',
            type: 'explosive',
            damage: 150,
            radius: 20,
            triggerType: 'collision',
            spawnWeight: 0.3,
            minDifficulty: 0.5,
            description: 'Explodes when hit, causing area damage'
        });
        
        // Acid Pools
        this.hazardTypes.set('acid_pool', {
            name: 'Acid Pool',
            type: 'environmental',
            damage: 30,
            radius: 10,
            triggerType: 'proximity',
            duration: 10000,
            spawnWeight: 0.25,
            minDifficulty: 1.0,
            description: 'Damages vehicles that drive through'
        });
        
        // Spike Traps
        this.hazardTypes.set('spike_trap', {
            name: 'Spike Trap',
            type: 'trap',
            damage: 80,
            radius: 5,
            triggerType: 'pressure',
            spawnWeight: 0.2,
            minDifficulty: 1.2,
            description: 'Hidden trap that damages tires'
        });
        
        // Fire Hazards
        this.hazardTypes.set('fire_hazard', {
            name: 'Fire Hazard',
            type: 'environmental',
            damage: 25,
            radius: 15,
            triggerType: 'proximity',
            duration: 15000,
            spawnWeight: 0.15,
            minDifficulty: 0.8,
            description: 'Continuous fire damage in area'
        });
        
        // Collapsing Structures
        this.hazardTypes.set('collapsing_structure', {
            name: 'Collapsing Structure',
            type: 'structural',
            damage: 200,
            radius: 25,
            triggerType: 'timed',
            warningTime: 3000,
            spawnWeight: 0.1,
            minDifficulty: 1.5,
            description: 'Structure collapses after warning period'
        });
    }
    
    update(deltaTime, difficultyLevel) {
        const currentTime = Date.now();
        
        // Update active hazards
        this.updateActiveHazards(deltaTime);
        
        // Check for new hazard spawns
        if (this.shouldSpawnHazard(currentTime, difficultyLevel)) {
            this.spawnRandomHazard(difficultyLevel);
            this.lastHazardSpawn = currentTime;
        }
        
        // Update interactive objects
        this.updateInteractiveObjects(deltaTime);
        
        // Update statistics
        this.updateStatistics(deltaTime);
    }
    
    shouldSpawnHazard(currentTime, difficultyLevel) {
        if (this.activeHazards.length >= this.maxActiveHazards * difficultyLevel) {
            return false;
        }
        
        const adjustedSpawnRate = this.hazardSpawnRate / Math.max(0.5, difficultyLevel);
        return currentTime - this.lastHazardSpawn >= adjustedSpawnRate;
    }
    
    spawnRandomHazard(difficultyLevel) {
        const hazardType = this.selectHazardType(difficultyLevel);
        if (!hazardType) return null;
        
        const position = this.findHazardSpawnPosition();
        if (!position) return null;
        
        return this.createHazard(hazardType, position, difficultyLevel);
    }
    
    selectHazardType(difficultyLevel) {
        const availableTypes = [];
        const weights = [];
        
        for (const [typeId, hazardType] of this.hazardTypes) {
            if (difficultyLevel >= hazardType.minDifficulty) {
                availableTypes.push(hazardType);
                weights.push(hazardType.spawnWeight);
            }
        }
        
        if (availableTypes.length === 0) return null;
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availableTypes[i];
            }
        }
        
        return availableTypes[0];
    }
    
    findHazardSpawnPosition() {
        // This would integrate with the level generation system
        return {
            x: Math.random() * 200 - 100,
            y: 0,
            z: Math.random() * 200 - 100
        };
    }
    
    createHazard(hazardType, position, difficultyLevel) {
        const hazard = {
            id: `hazard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: hazardType,
            position: { ...position },
            damage: hazardType.damage * difficultyLevel,
            radius: hazardType.radius,
            status: 'active',
            spawnTime: Date.now(),
            triggerTime: 0,
            warningTime: hazardType.warningTime || 0,
            duration: hazardType.duration || -1,
            difficultyLevel: difficultyLevel,
            
            // State tracking
            hasWarned: false,
            isTriggered: false,
            affectedTargets: new Set()
        };
        
        this.activeHazards.push(hazard);
        this.hazardHistory.push(hazard);
        
        // Update statistics
        this.statistics.hazardsSpawned++;
        this.statistics.hazardsByType[hazardType.name] = 
            (this.statistics.hazardsByType[hazardType.name] || 0) + 1;
        
        console.log(`⚠️ Hazard spawned: ${hazardType.name} at difficulty ${difficultyLevel.toFixed(2)}`);
        
        return hazard;
    }
    
    updateActiveHazards(deltaTime) {
        const currentTime = Date.now();
        
        this.activeHazards.forEach(hazard => {
            const age = currentTime - hazard.spawnTime;
            
            // Handle timed hazards
            if (hazard.type.triggerType === 'timed') {
                if (!hazard.hasWarned && age >= hazard.warningTime) {
                    this.triggerHazardWarning(hazard);
                    hazard.hasWarned = true;
                }
                
                if (!hazard.isTriggered && age >= hazard.warningTime + 1000) {
                    this.triggerHazard(hazard);
                }
            }
            
            // Handle duration-based hazards
            if (hazard.duration > 0 && age >= hazard.duration) {
                hazard.status = 'expired';
            }
            
            // Check for proximity triggers
            if (hazard.type.triggerType === 'proximity' && !hazard.isTriggered) {
                this.checkProximityTrigger(hazard);
            }
        });
        
        // Remove expired hazards
        this.activeHazards = this.activeHazards.filter(hazard => 
            hazard.status === 'active' || hazard.status === 'triggered'
        );
    }
    
    checkProximityTrigger(hazard) {
        // This would check against player/vehicle positions
        // For now, simulate random triggering
        if (Math.random() < 0.001) { // 0.1% chance per frame
            this.triggerHazard(hazard);
        }
    }
    
    triggerHazardWarning(hazard) {
        console.log(`⚠️ Warning: ${hazard.type.name} will trigger soon!`);
        // Implementation would show visual/audio warning
    }
    
    triggerHazard(hazard) {
        if (hazard.isTriggered) return;
        
        hazard.isTriggered = true;
        hazard.triggerTime = Date.now();
        hazard.status = 'triggered';
        
        console.log(`💥 Hazard triggered: ${hazard.type.name}`);
        
        // Execute hazard-specific effects
        switch (hazard.type.type) {
            case 'explosive':
                this.executeExplosiveHazard(hazard);
                break;
            case 'environmental':
                this.executeEnvironmentalHazard(hazard);
                break;
            case 'trap':
                this.executeTrapHazard(hazard);
                break;
            case 'structural':
                this.executeStructuralHazard(hazard);
                break;
        }
        
        this.statistics.hazardsTriggered++;
    }
    
    executeExplosiveHazard(hazard) {
        // Create explosion effect
        console.log(`💥 Explosion at ${hazard.position.x}, ${hazard.position.z} (radius: ${hazard.radius})`);
    }
    
    executeEnvironmentalHazard(hazard) {
        // Create environmental effect
        console.log(`🌊 Environmental hazard active at ${hazard.position.x}, ${hazard.position.z}`);
    }
    
    executeTrapHazard(hazard) {
        // Activate trap
        console.log(`🪤 Trap activated at ${hazard.position.x}, ${hazard.position.z}`);
    }
    
    executeStructuralHazard(hazard) {
        // Collapse structure
        console.log(`🏗️ Structure collapsed at ${hazard.position.x}, ${hazard.position.z}`);
    }
    
    updateInteractiveObjects(deltaTime) {
        // Update any interactive objects (fuel cans, repair kits, etc.)
        this.interactiveObjects.forEach(obj => {
            if (obj.type === 'temporary' && Date.now() - obj.spawnTime > obj.lifetime) {
                obj.status = 'expired';
            }
        });
        
        // Remove expired objects
        this.interactiveObjects = this.interactiveObjects.filter(obj => 
            obj.status !== 'expired'
        );
    }
    
    activateHazard(hazardId, difficultyLevel) {
        const hazard = this.activeHazards.find(h => h.id === hazardId);
        if (hazard && !hazard.isTriggered) {
            this.triggerHazard(hazard);
            return true;
        }
        return false;
    }
    
    updateStatistics(deltaTime) {
        // Statistics are updated in real-time during hazard events
    }
    
    getStatistics() {
        return {
            ...this.statistics,
            activeHazards: this.activeHazards.length,
            interactiveObjects: this.interactiveObjects.length,
            hazardTypes: Array.from(this.hazardTypes.keys())
        };
    }
    
    resetStatistics() {
        this.statistics = {
            hazardsSpawned: 0,
            hazardsByType: {},
            hazardsTriggered: 0,
            playerInteractions: 0
        };
        
        this.activeHazards = [];
        this.interactiveObjects = [];
        this.hazardHistory = [];
    }
    
    getActiveHazards() {
        return [...this.activeHazards];
    }
    
    getHazardHistory(limit = 50) {
        return this.hazardHistory.slice(-limit);
    }
}

// Additional classes are exported from their respective files