/**
 * Game Data Models for Zombie Car Game
 * Defines data structures for vehicles, upgrades, player statistics, and stage progress
 */

/**
 * Vehicle Types Configuration
 * Defines base stats and unlock requirements for each vehicle type
 */
export const VehicleTypes = {
    STARTER_CAR: {
        name: "Old Sedan",
        description: "A beat-up family car. It's not much, but it runs.",
        baseStats: {
            engine: 50,
            fuel: 100,
            armor: 30,
            weapon: 0,
            wheels: 40
        },
        cost: 0,
        unlockDistance: 0,
        sprite: "starter_car.png"
    },
    OLD_TRUCK: {
        name: "Rusty Pickup",
        description: "More durable than the sedan, with a bit more power.",
        baseStats: {
            engine: 60,
            fuel: 120,
            armor: 50,
            weapon: 10,
            wheels: 50
        },
        cost: 500,
        unlockDistance: 1000,
        sprite: "old_truck.png"
    },
    SPORTS_CAR: {
        name: "Desert Racer",
        description: "Fast and agile, but fragile in the wasteland.",
        baseStats: {
            engine: 90,
            fuel: 80,
            armor: 20,
            weapon: 5,
            wheels: 70
        },
        cost: 1200,
        unlockDistance: 2500,
        sprite: "sports_car.png"
    },
    MONSTER_TRUCK: {
        name: "Wasteland Crusher",
        description: "Built to smash through anything in its path.",
        baseStats: {
            engine: 70,
            fuel: 140,
            armor: 80,
            weapon: 30,
            wheels: 90
        },
        cost: 2500,
        unlockDistance: 5000,
        sprite: "monster_truck.png"
    },
    ARMORED_VAN: {
        name: "Fortress Van",
        description: "Heavy armor and mounted weapons for serious survival.",
        baseStats: {
            engine: 65,
            fuel: 110,
            armor: 100,
            weapon: 50,
            wheels: 60
        },
        cost: 4000,
        unlockDistance: 8000,
        sprite: "armored_van.png"
    }
};

/**
 * Upgrade System Configuration
 * Defines upgrade categories, costs, and effects
 */
export const UpgradeConfig = {
    categories: ['engine', 'fuel', 'armor', 'weapon', 'wheels'],
    maxLevel: 5,
    
    // Base costs for each upgrade category
    baseCosts: {
        engine: 100,
        fuel: 80,
        armor: 120,
        weapon: 150,
        wheels: 90
    },
    
    // Cost multiplier per level (exponential scaling)
    costMultiplier: 1.5,
    
    // Effect multipliers for each upgrade category
    effects: {
        engine: {
            stat: 'enginePower',
            multiplier: 0.2,
            description: 'Increases acceleration and top speed',
            visual: 'exhaust_smoke'
        },
        fuel: {
            stat: 'fuelCapacity',
            multiplier: 0.3,
            description: 'Increases fuel tank capacity',
            visual: 'fuel_tank_size'
        },
        armor: {
            stat: 'armorStrength',
            multiplier: 0.25,
            description: 'Reduces damage from collisions',
            visual: 'armor_plating'
        },
        weapon: {
            stat: 'weaponDamage',
            multiplier: 0.4,
            description: 'Increases zombie destruction power',
            visual: 'roof_mounted_gun'
        },
        wheels: {
            stat: 'traction',
            multiplier: 0.15,
            description: 'Improves handling and terrain navigation',
            visual: 'tire_upgrade'
        }
    }
};

/**
 * Stage Configuration
 * Defines different desert stages with increasing difficulty
 */
export const StageConfig = {
    0: {
        name: "Outskirts",
        description: "The edge of the wasteland. Relatively safe.",
        length: 10000,
        backgroundColor: '#d4a574',
        skyColor: '#ff8c42',
        zombieDensity: 0.2,
        obstacleTypes: ['small_rock', 'debris'],
        unlockDistance: 0,
        moneyMultiplier: 1.0
    },
    1: {
        name: "Deep Desert",
        description: "The heart of the wasteland. Danger increases.",
        length: 15000,
        backgroundColor: '#c49464',
        skyColor: '#ff7a2e',
        zombieDensity: 0.4,
        obstacleTypes: ['wrecked_car', 'large_rock', 'debris'],
        unlockDistance: 8000,
        moneyMultiplier: 1.5
    },
    2: {
        name: "Death Valley",
        description: "The final stretch. Only the strongest survive.",
        length: 20000,
        backgroundColor: '#b48454',
        skyColor: '#ff681a',
        zombieDensity: 0.7,
        obstacleTypes: ['tank_wreck', 'concrete_barrier', 'spike_trap'],
        unlockDistance: 20000,
        moneyMultiplier: 2.0
    },
    3: {
        name: "Evacuation Point",
        description: "The safe zone. Freedom awaits.",
        length: 5000,
        backgroundColor: '#a47444',
        skyColor: '#ff5406',
        zombieDensity: 1.0,
        obstacleTypes: ['military_checkpoint', 'barricade'],
        unlockDistance: 35000,
        moneyMultiplier: 3.0,
        isEndGame: true
    }
};

/**
 * Zombie Types Configuration
 * Defines different zombie types with varying stats
 */
export const ZombieTypes = {
    WALKER: {
        name: "Walker",
        health: 50,
        speed: 20,
        damage: 10,
        color: '#4a5d23',
        sprite: 'zombie_walker.png',
        spawnWeight: 0.5
    },
    CRAWLER: {
        name: "Crawler",
        health: 30,
        speed: 15,
        damage: 5,
        color: '#3d4a1f',
        sprite: 'zombie_crawler.png',
        spawnWeight: 0.3
    },
    RUNNER: {
        name: "Runner",
        health: 40,
        speed: 40,
        damage: 15,
        color: '#5a6d33',
        sprite: 'zombie_runner.png',
        spawnWeight: 0.15
    },
    BLOATER: {
        name: "Bloater",
        health: 100,
        speed: 10,
        damage: 25,
        color: '#6d7a43',
        sprite: 'zombie_bloater.png',
        spawnWeight: 0.04
    },
    ARMORED: {
        name: "Armored",
        health: 150,
        speed: 25,
        damage: 20,
        color: '#7a8750',
        sprite: 'zombie_armored.png',
        spawnWeight: 0.01
    }
};

/**
 * Game Balance Configuration
 * Defines various game balance parameters
 */
export const GameBalance = {
    // Distance to money conversion
    distanceToMoneyRate: 0.1, // 1 money per 10 distance units
    
    // Fuel consumption rates
    fuelConsumption: {
        idle: 0.1,      // fuel per second when idle
        driving: 0.5,   // fuel per second when driving
        boosting: 1.0   // fuel per second when boosting
    },
    
    // Milestone bonuses
    milestones: {
        1000: 50,   // $50 bonus at 1000m
        2500: 100,  // $100 bonus at 2500m
        5000: 200,  // $200 bonus at 5000m
        10000: 500, // $500 bonus at 10000m
        20000: 1000 // $1000 bonus at 20000m
    },
    
    // Zombie spawn rates per stage
    zombieSpawnRates: {
        0: 0.02,  // 2% chance per meter in stage 0
        1: 0.04,  // 4% chance per meter in stage 1
        2: 0.07,  // 7% chance per meter in stage 2
        3: 0.10   // 10% chance per meter in stage 3
    },
    
    // Obstacle spawn rates per stage
    obstacleSpawnRates: {
        0: 0.01,  // 1% chance per meter
        1: 0.02,  // 2% chance per meter
        2: 0.04,  // 4% chance per meter
        3: 0.06   // 6% chance per meter
    }
};

/**
 * Player Statistics Data Model
 * Defines the structure for tracking player statistics
 */
export class PlayerStatistics {
    constructor() {
        this.money = 0;
        this.bestDistance = 0;
        this.totalRuns = 0;
        this.totalZombiesKilled = 0;
        this.totalMoneyEarned = 0;
        this.totalPlayTime = 0;
        this.totalFuelConsumed = 0;
        this.totalObstaclesHit = 0;
        this.averageRunDistance = 0;
        this.longestSurvivalTime = 0;
    }
    
    /**
     * Update statistics after a run
     */
    updateAfterRun(runData) {
        this.totalRuns += 1;
        this.totalZombiesKilled += runData.zombiesKilled || 0;
        this.totalMoneyEarned += runData.moneyEarned || 0;
        this.totalPlayTime += runData.playTime || 0;
        this.totalFuelConsumed += runData.fuelConsumed || 0;
        this.totalObstaclesHit += runData.obstaclesHit || 0;
        
        if (runData.distance > this.bestDistance) {
            this.bestDistance = runData.distance;
        }
        
        if (runData.survivalTime > this.longestSurvivalTime) {
            this.longestSurvivalTime = runData.survivalTime;
        }
        
        // Calculate average run distance
        this.averageRunDistance = this.totalRuns > 0 ? 
            (this.averageRunDistance * (this.totalRuns - 1) + runData.distance) / this.totalRuns : 
            runData.distance;
    }
    
    /**
     * Get formatted statistics for display
     */
    getFormattedStats() {
        return {
            money: `$${this.money.toLocaleString()}`,
            bestDistance: `${this.bestDistance.toLocaleString()}m`,
            totalRuns: this.totalRuns.toLocaleString(),
            totalZombiesKilled: this.totalZombiesKilled.toLocaleString(),
            totalMoneyEarned: `$${this.totalMoneyEarned.toLocaleString()}`,
            totalPlayTime: this.formatTime(this.totalPlayTime),
            averageRunDistance: `${Math.round(this.averageRunDistance).toLocaleString()}m`,
            longestSurvivalTime: this.formatTime(this.longestSurvivalTime)
        };
    }
    
    /**
     * Format time in seconds to readable format
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

/**
 * Vehicle Data Model
 * Represents a vehicle with its stats and upgrades
 */
export class VehicleData {
    constructor(type, upgrades = {}) {
        this.type = type;
        this.baseStats = VehicleTypes[type].baseStats;
        this.upgrades = {
            engine: 0,
            fuel: 0,
            armor: 0,
            weapon: 0,
            wheels: 0,
            ...upgrades
        };
    }
    
    /**
     * Get effective stats with upgrades applied
     */
    getEffectiveStats() {
        const stats = { ...this.baseStats };
        
        // Apply upgrade multipliers
        Object.keys(this.upgrades).forEach(category => {
            const upgradeLevel = this.upgrades[category];
            const effect = UpgradeConfig.effects[category];
            
            if (effect && upgradeLevel > 0) {
                const multiplier = 1 + (effect.multiplier * upgradeLevel);
                stats[category] = Math.round(this.baseStats[category] * multiplier);
            }
        });
        
        return stats;
    }
    
    /**
     * Get upgrade cost for a specific category
     */
    getUpgradeCost(category) {
        const currentLevel = this.upgrades[category] || 0;
        
        if (currentLevel >= UpgradeConfig.maxLevel) {
            return null; // Max level reached
        }
        
        const baseCost = UpgradeConfig.baseCosts[category];
        return Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, currentLevel));
    }
    
    /**
     * Check if upgrade is available
     */
    canUpgrade(category) {
        const currentLevel = this.upgrades[category] || 0;
        return currentLevel < UpgradeConfig.maxLevel;
    }
    
    /**
     * Get total upgrade cost invested
     */
    getTotalUpgradeCost() {
        let total = 0;
        
        Object.keys(this.upgrades).forEach(category => {
            const level = this.upgrades[category];
            const baseCost = UpgradeConfig.baseCosts[category];
            
            for (let i = 0; i < level; i++) {
                total += Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, i));
            }
        });
        
        return total;
    }
}

/**
 * Stage Progress Data Model
 * Tracks progress through different stages
 */
export class StageProgress {
    constructor() {
        this.currentStage = 0;
        this.unlockedStages = [0];
        this.stageData = {};
        
        // Initialize stage data
        Object.keys(StageConfig).forEach(stageId => {
            this.stageData[stageId] = {
                bestDistance: 0,
                completed: false,
                attempts: 0,
                totalZombiesKilled: 0,
                totalMoneyEarned: 0
            };
        });
    }
    
    /**
     * Update progress for a specific stage
     */
    updateStageProgress(stageId, runData) {
        if (!this.stageData[stageId]) {
            this.stageData[stageId] = {
                bestDistance: 0,
                completed: false,
                attempts: 0,
                totalZombiesKilled: 0,
                totalMoneyEarned: 0
            };
        }
        
        const stage = this.stageData[stageId];
        stage.attempts += 1;
        stage.totalZombiesKilled += runData.zombiesKilled || 0;
        stage.totalMoneyEarned += runData.moneyEarned || 0;
        
        if (runData.distance > stage.bestDistance) {
            stage.bestDistance = runData.distance;
        }
        
        // Check if stage is completed
        const stageConfig = StageConfig[stageId];
        if (runData.distance >= stageConfig.length) {
            stage.completed = true;
            
            // Unlock next stage
            const nextStageId = parseInt(stageId) + 1;
            if (StageConfig[nextStageId] && !this.unlockedStages.includes(nextStageId)) {
                this.unlockedStages.push(nextStageId);
            }
        }
    }
    
    /**
     * Check if a stage is unlocked
     */
    isStageUnlocked(stageId) {
        return this.unlockedStages.includes(parseInt(stageId));
    }
    
    /**
     * Get completion percentage for a stage
     */
    getStageCompletion(stageId) {
        const stage = this.stageData[stageId];
        const stageConfig = StageConfig[stageId];
        
        if (!stage || !stageConfig) return 0;
        
        return Math.min(100, (stage.bestDistance / stageConfig.length) * 100);
    }
}

/**
 * Default Save Data Factory
 * Creates the default save data structure
 */
export function createDefaultSaveData() {
    return {
        version: '1.0.0',
        timestamp: Date.now(),
        
        player: new PlayerStatistics(),
        
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
        
        stages: new StageProgress(),
        
        settings: {
            masterVolume: 1.0,
            effectsVolume: 1.0,
            musicVolume: 0.7,
            showFPS: false,
            showMinimap: true,
            enableParticles: true,
            graphicsQuality: 'medium'
        },
        
        gameCompleted: false
    };
}

/**
 * Utility functions for working with game data
 */
export const GameDataUtils = {
    /**
     * Calculate money earned from distance
     */
    calculateMoneyFromDistance(distance, stageId = 0) {
        const baseAmount = distance * GameBalance.distanceToMoneyRate;
        const stageMultiplier = StageConfig[stageId]?.moneyMultiplier || 1.0;
        return Math.round(baseAmount * stageMultiplier);
    },
    
    /**
     * Check milestone bonuses
     */
    getMilestoneBonus(distance) {
        let bonus = 0;
        Object.keys(GameBalance.milestones).forEach(milestone => {
            if (distance >= parseInt(milestone)) {
                bonus = Math.max(bonus, GameBalance.milestones[milestone]);
            }
        });
        return bonus;
    },
    
    /**
     * Get vehicle unlock requirements
     */
    getVehicleUnlockStatus(vehicleType, playerStats) {
        const vehicle = VehicleTypes[vehicleType];
        return {
            unlocked: playerStats.bestDistance >= vehicle.unlockDistance,
            distanceRequired: vehicle.unlockDistance,
            distanceRemaining: Math.max(0, vehicle.unlockDistance - playerStats.bestDistance)
        };
    },
    
    /**
     * Calculate total upgrade value for a vehicle
     */
    calculateVehicleValue(vehicleType, upgrades) {
        const baseValue = VehicleTypes[vehicleType].cost;
        const vehicleData = new VehicleData(vehicleType, upgrades);
        const upgradeValue = vehicleData.getTotalUpgradeCost();
        return baseValue + upgradeValue;
    }
};