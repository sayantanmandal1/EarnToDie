/**
 * Game balance configuration and adjustment system
 */
export class GameBalance {
    constructor() {
        this.config = {
            // Vehicle balance
            vehicles: {
                baseSpeed: 50,
                maxSpeed: 120,
                acceleration: 25,
                handling: 0.8,
                durability: 100,
                fuelCapacity: 100,
                fuelConsumption: 0.5 // per second
            },

            // Zombie balance
            zombies: {
                baseHealth: 50,
                baseSpeed: 15,
                baseDamage: 20,
                spawnRate: 2.0, // per second
                maxActiveZombies: 50,
                difficultyScaling: {
                    healthMultiplier: 1.1, // per level
                    speedMultiplier: 1.05,
                    damageMultiplier: 1.08,
                    spawnRateMultiplier: 1.15
                }
            },

            // Combat balance
            combat: {
                baseDamage: 25,
                criticalChance: 0.1,
                criticalMultiplier: 2.0,
                weaponDamageMultipliers: {
                    'machine_gun': 1.0,
                    'shotgun': 1.5,
                    'rocket_launcher': 3.0,
                    'flamethrower': 0.8
                },
                armorReduction: {
                    'light': 0.1,
                    'medium': 0.25,
                    'heavy': 0.4
                }
            },

            // Scoring balance
            scoring: {
                baseZombieKillPoints: 10,
                distancePointsPerMeter: 1,
                survivalBonusPerSecond: 5,
                comboMultiplier: 1.2,
                maxComboMultiplier: 3.0,
                levelCompletionBonus: 1000,
                perfectRunMultiplier: 2.0
            },

            // Economy balance
            economy: {
                pointsToCurrencyRatio: 0.1,
                vehicleBaseCost: 1000,
                upgradeBaseCost: 500,
                repairCostPerPoint: 10,
                fuelCostPerUnit: 5
            },

            // Performance scaling
            performance: {
                particleCountLimits: {
                    low: 100,
                    medium: 300,
                    high: 500
                },
                zombieCountLimits: {
                    low: 20,
                    medium: 35,
                    high: 50
                },
                renderDistanceLimits: {
                    low: 100,
                    medium: 200,
                    high: 300
                }
            }
        };

        this.difficultyLevel = 1;
        this.playerSkillLevel = 1.0;
        this.adaptiveBalancing = true;
        this.balanceHistory = [];
    }

    /**
     * Get balanced vehicle stats
     */
    getVehicleStats(vehicleType, upgradeLevel = 0) {
        const base = this.config.vehicles;
        const multiplier = 1 + (upgradeLevel * 0.2);
        
        return {
            speed: base.baseSpeed * multiplier,
            maxSpeed: base.maxSpeed * multiplier,
            acceleration: base.acceleration * multiplier,
            handling: Math.min(base.handling * multiplier, 1.0),
            durability: base.durability * multiplier,
            fuelCapacity: base.fuelCapacity * multiplier,
            fuelConsumption: base.fuelConsumption / Math.sqrt(multiplier)
        };
    }

    /**
     * Get balanced zombie stats based on difficulty
     */
    getZombieStats(zombieType, difficultyLevel = this.difficultyLevel) {
        const base = this.config.zombies;
        const scaling = base.difficultyScaling;
        
        const healthMultiplier = Math.pow(scaling.healthMultiplier, difficultyLevel - 1);
        const speedMultiplier = Math.pow(scaling.speedMultiplier, difficultyLevel - 1);
        const damageMultiplier = Math.pow(scaling.damageMultiplier, difficultyLevel - 1);
        
        // Type-specific modifiers
        const typeModifiers = {
            'walker': { health: 1.0, speed: 1.0, damage: 1.0 },
            'runner': { health: 0.7, speed: 1.8, damage: 0.8 },
            'tank': { health: 3.0, speed: 0.5, damage: 2.0 },
            'spitter': { health: 0.8, speed: 1.2, damage: 1.5 },
            'boss': { health: 10.0, speed: 0.8, damage: 3.0 }
        };
        
        const modifier = typeModifiers[zombieType] || typeModifiers['walker'];
        
        return {
            health: base.baseHealth * healthMultiplier * modifier.health,
            speed: base.baseSpeed * speedMultiplier * modifier.speed,
            damage: base.baseDamage * damageMultiplier * modifier.damage,
            points: Math.floor(10 * modifier.health * modifier.damage)
        };
    }

    /**
     * Get balanced combat damage
     */
    calculateDamage(weaponType, upgradeLevel = 0, isCritical = false) {
        const base = this.config.combat;
        const weaponMultiplier = base.weaponDamageMultipliers[weaponType] || 1.0;
        const upgradeMultiplier = 1 + (upgradeLevel * 0.25);
        
        let damage = base.baseDamage * weaponMultiplier * upgradeMultiplier;
        
        if (isCritical) {
            damage *= base.criticalMultiplier;
        }
        
        return Math.floor(damage);
    }

    /**
     * Get spawn rate based on difficulty and player performance
     */
    getZombieSpawnRate(difficultyLevel = this.difficultyLevel) {
        const base = this.config.zombies.spawnRate;
        const scaling = this.config.zombies.difficultyScaling.spawnRateMultiplier;
        
        let spawnRate = base * Math.pow(scaling, difficultyLevel - 1);
        
        // Adaptive balancing based on player skill
        if (this.adaptiveBalancing) {
            if (this.playerSkillLevel > 1.5) {
                spawnRate *= 1.3; // Increase spawn rate for skilled players
            } else if (this.playerSkillLevel < 0.7) {
                spawnRate *= 0.8; // Decrease spawn rate for struggling players
            }
        }
        
        return spawnRate;
    }

    /**
     * Calculate score with balanced multipliers
     */
    calculateScore(action, data = {}) {
        const scoring = this.config.scoring;
        let points = 0;
        
        switch (action) {
            case 'zombie_kill':
                const zombie = data.zombie || {};
                const basePoints = zombie.points || scoring.baseZombieKillPoints;
                const comboMultiplier = Math.min(
                    Math.pow(scoring.comboMultiplier, data.combo || 0),
                    scoring.maxComboMultiplier
                );
                points = basePoints * comboMultiplier;
                break;
                
            case 'distance':
                points = data.distance * scoring.distancePointsPerMeter;
                break;
                
            case 'survival':
                points = data.timeAlive * scoring.survivalBonusPerSecond;
                break;
                
            case 'level_complete':
                points = scoring.levelCompletionBonus;
                if (data.perfectRun) {
                    points *= scoring.perfectRunMultiplier;
                }
                break;
        }
        
        return Math.floor(points);
    }

    /**
     * Get balanced upgrade costs
     */
    getUpgradeCost(upgradeType, currentLevel) {
        const base = this.config.economy.upgradeBaseCost;
        const multiplier = Math.pow(1.5, currentLevel);
        
        const typeMultipliers = {
            'engine': 1.0,
            'armor': 1.2,
            'weapons': 1.5,
            'fuel_efficiency': 0.8,
            'handling': 1.1
        };
        
        const typeMultiplier = typeMultipliers[upgradeType] || 1.0;
        
        return Math.floor(base * multiplier * typeMultiplier);
    }

    /**
     * Update player skill level based on performance
     */
    updatePlayerSkill(performanceData) {
        const {
            zombiesKilled = 0,
            timeAlive = 0,
            damageReceived = 0,
            accuracy = 0.5,
            levelCompleted = false
        } = performanceData;
        
        // Calculate skill factors
        const killRate = zombiesKilled / Math.max(timeAlive, 1);
        const survivalFactor = Math.min(timeAlive / 300, 1.0); // 5 minutes max
        const damageFactor = Math.max(0, 1 - (damageReceived / 100));
        const accuracyFactor = accuracy;
        const completionFactor = levelCompleted ? 1.2 : 0.8;
        
        const skillScore = (killRate * 0.3 + survivalFactor * 0.2 + 
                          damageFactor * 0.2 + accuracyFactor * 0.2) * completionFactor;
        
        // Smooth skill level adjustment
        this.playerSkillLevel = this.playerSkillLevel * 0.8 + skillScore * 0.2;
        this.playerSkillLevel = Math.max(0.3, Math.min(3.0, this.playerSkillLevel));
        
        // Store in history for analysis
        this.balanceHistory.push({
            timestamp: Date.now(),
            skillLevel: this.playerSkillLevel,
            performance: performanceData
        });
        
        // Keep only last 10 entries
        if (this.balanceHistory.length > 10) {
            this.balanceHistory.shift();
        }
    }

    /**
     * Get performance-based limits
     */
    getPerformanceLimits(qualityLevel) {
        const limits = this.config.performance;
        
        return {
            maxParticles: limits.particleCountLimits[qualityLevel] || limits.particleCountLimits.medium,
            maxZombies: limits.zombieCountLimits[qualityLevel] || limits.zombieCountLimits.medium,
            renderDistance: limits.renderDistanceLimits[qualityLevel] || limits.renderDistanceLimits.medium
        };
    }

    /**
     * Adjust balance based on telemetry data
     */
    adjustBalance(telemetryData) {
        if (!this.adaptiveBalancing) return;
        
        const {
            averageSessionTime = 0,
            averageScore = 0,
            completionRate = 0,
            quitRate = 0
        } = telemetryData;
        
        // If players are quitting too early, make it easier
        if (quitRate > 0.7 && averageSessionTime < 120) {
            this.config.zombies.spawnRate *= 0.9;
            this.config.zombies.baseDamage *= 0.95;
        }
        
        // If completion rate is too high, increase difficulty
        if (completionRate > 0.8) {
            this.config.zombies.difficultyScaling.healthMultiplier *= 1.02;
            this.config.zombies.difficultyScaling.spawnRateMultiplier *= 1.02;
        }
        
        // If completion rate is too low, decrease difficulty
        if (completionRate < 0.3) {
            this.config.zombies.difficultyScaling.healthMultiplier *= 0.98;
            this.config.zombies.difficultyScaling.spawnRateMultiplier *= 0.98;
        }
    }

    /**
     * Get current difficulty level
     */
    getDifficultyLevel() {
        return this.difficultyLevel;
    }

    /**
     * Set difficulty level
     */
    setDifficultyLevel(level) {
        this.difficultyLevel = Math.max(1, Math.min(10, level));
    }

    /**
     * Get player skill level
     */
    getPlayerSkillLevel() {
        return this.playerSkillLevel;
    }

    /**
     * Enable/disable adaptive balancing
     */
    setAdaptiveBalancing(enabled) {
        this.adaptiveBalancing = enabled;
    }

    /**
     * Get balance configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update balance configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Reset balance to defaults
     */
    resetBalance() {
        this.difficultyLevel = 1;
        this.playerSkillLevel = 1.0;
        this.balanceHistory = [];
        // Reset config to defaults would go here
    }

    /**
     * Export balance data for analysis
     */
    exportBalanceData() {
        return {
            config: this.config,
            difficultyLevel: this.difficultyLevel,
            playerSkillLevel: this.playerSkillLevel,
            history: this.balanceHistory
        };
    }
}