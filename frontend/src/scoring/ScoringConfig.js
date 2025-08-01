/**
 * Configuration for the scoring system including point values, multipliers, and currency rates
 */

export const SCORING_CONFIG = {
    // Base point values for different zombie types
    ZOMBIE_POINTS: {
        // Basic zombies
        walker: 10,
        runner: 15,
        crawler: 8,
        
        // Special zombies
        spitter: 25,
        bloater: 30,
        armored: 35,
        giant: 50,
        screamer: 20,
        exploder: 40,
        toxic: 30,
        berserker: 45,
        leaper: 25,
        stalker: 35,
        brute: 60,
        swarm: 5, // Individual swarm zombie
        
        // Boss zombies
        boss_tyrant: 500,
        boss_horde_master: 750,
        boss_mutant: 600,
        boss_necromancer: 800,
        boss_abomination: 1000
    },

    // Kill method multipliers
    KILL_METHOD_MULTIPLIERS: {
        collision: 1.0,        // Standard vehicle collision
        explosion: 1.5,        // Explosive kills
        environmental: 2.0,    // Environmental hazards
        special: 2.5,          // Special abilities/weapons
        combo: 1.2,           // Part of a combo
        critical: 1.3,        // Critical hit
        overkill: 1.3         // Excessive damage
    },

    // Combo system configuration
    COMBO_SYSTEM: {
        baseMultiplier: 1.0,
        maxMultiplier: 5.0,
        multiplierIncrement: 0.2,
        comboDecayTime: 3000,     // 3 seconds
        comboThreshold: 3,        // Minimum kills to start combo
        comboTiers: {
            3: { multiplier: 1.2, name: 'Combo!' },
            5: { multiplier: 1.4, name: 'Great Combo!' },
            10: { multiplier: 2.0, name: 'Amazing Combo!' },
            15: { multiplier: 2.5, name: 'Incredible Combo!' },
            20: { multiplier: 3.0, name: 'Legendary Combo!' },
            25: { multiplier: 4.0, name: 'Godlike Combo!' },
            30: { multiplier: 5.0, name: 'UNSTOPPABLE!' }
        }
    },

    // Currency conversion rates
    CURRENCY_CONVERSION: {
        pointsToCurrencyRate: 0.1,    // 10 points = 1 currency
        bonusMultiplier: 1.0,         // Base bonus multiplier
        achievementBonus: 0.05,       // 5% bonus per achievement
        difficultyMultipliers: {
            easy: 0.8,
            normal: 1.0,
            hard: 1.3,
            nightmare: 1.5
        },
        levelCompletionBonus: {
            bronze: 1.1,    // 10% bonus
            silver: 1.25,   // 25% bonus
            gold: 1.5       // 50% bonus
        }
    },

    // Bonus point events
    BONUS_EVENTS: {
        airTime: {
            pointsPerSecond: 10,
            maxBonus: 500
        },
        nearMiss: {
            points: 50,
            maxDistance: 2.0  // meters
        },
        perfectLanding: {
            points: 100,
            angleThreshold: 15  // degrees
        },
        environmentalKill: {
            multiplier: 2.0
        },
        multiKill: {
            2: 50,   // Double kill
            3: 100,  // Triple kill
            4: 200,  // Quad kill
            5: 400   // Penta kill
        },
        speedBonus: {
            threshold: 80,    // km/h
            pointsPerKmh: 2
        },
        destructionBonus: {
            pointsPerObject: 25
        }
    },

    // Achievement point values
    ACHIEVEMENT_POINTS: {
        // Kill count achievements
        FIRST_BLOOD: 100,
        KILL_10: 20,
        KILL_25: 50,
        KILL_50: 100,
        KILL_100: 200,
        KILL_250: 500,
        KILL_500: 1000,
        KILL_1000: 2000,

        // Combo achievements
        COMBO_MASTER: 500,      // 10x combo
        COMBO_LEGEND: 1000,     // 25x combo
        COMBO_GOD: 2000,        // 50x combo

        // Special kill achievements
        EXPLOSIVE_EXPERT: 200,
        ENVIRONMENTAL_MASTER: 300,
        BOSS_SLAYER: 1000,
        PERFECT_DRIVER: 500,

        // Distance achievements
        DISTANCE_1000: 100,
        DISTANCE_5000: 500,
        DISTANCE_10000: 1000,
        DISTANCE_25000: 2500,
        DISTANCE_50000: 5000,

        // Time achievements
        SURVIVOR_5: 250,
        SURVIVOR_10: 500,
        SURVIVOR_30: 1500,
        SURVIVOR_60: 3000,

        // Special achievements
        FLAWLESS_VICTORY: 1000,  // Complete level without taking damage
        SPEED_DEMON: 750,        // Maintain high speed for extended time
        DESTRUCTION_DERBY: 500,  // Destroy many environmental objects
        ZOMBIE_MAGNET: 300       // Attract large zombie horde
    },

    // Score validation thresholds (anti-cheat)
    VALIDATION: {
        maxPointsPerSecond: 1000,
        maxZombiesPerSecond: 10,
        maxDistancePerSecond: 100,  // meters
        minPointsPerZombie: 5,
        maxPointsPerZombie: 2000,
        suspiciousScoreThreshold: 100000,
        
        // Combo validation
        maxComboTime: 300000,  // 5 minutes max combo
        maxComboCount: 1000,
        
        // Distance validation
        maxSpeedKmh: 200,
        maxAcceleration: 50,  // m/s²
        
        // Kill validation
        maxKillsPerCollision: 10,
        maxDamagePerHit: 10000
    }
};

/**
 * Get point value for zombie type
 */
export function getZombiePoints(zombieType) {
    return SCORING_CONFIG.ZOMBIE_POINTS[zombieType] || SCORING_CONFIG.ZOMBIE_POINTS.walker;
}

/**
 * Get kill method multiplier
 */
export function getKillMethodMultiplier(method) {
    return SCORING_CONFIG.KILL_METHOD_MULTIPLIERS[method] || 1.0;
}

/**
 * Get combo tier information
 */
export function getComboTier(comboCount) {
    const tiers = Object.keys(SCORING_CONFIG.COMBO_SYSTEM.comboTiers)
        .map(Number)
        .sort((a, b) => b - a);
    
    const tier = tiers.find(t => comboCount >= t);
    return tier ? SCORING_CONFIG.COMBO_SYSTEM.comboTiers[tier] : null;
}

/**
 * Calculate currency from points with bonuses
 */
export function calculateCurrency(points, achievements = 0, difficulty = 'normal', levelRating = null) {
    const config = SCORING_CONFIG.CURRENCY_CONVERSION;
    
    // Base currency
    let currency = points * config.pointsToCurrencyRate;
    
    // Achievement bonus
    const achievementBonus = achievements * config.achievementBonus;
    currency *= (1 + achievementBonus);
    
    // Difficulty multiplier
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
    currency *= difficultyMultiplier;
    
    // Level completion bonus
    if (levelRating && config.levelCompletionBonus[levelRating]) {
        currency *= config.levelCompletionBonus[levelRating];
    }
    
    return Math.floor(currency);
}

/**
 * Validate score for anti-cheat
 */
export function validateScore(scoreData, sessionDuration) {
    const validation = SCORING_CONFIG.VALIDATION;
    const durationSeconds = sessionDuration / 1000;
    
    const issues = [];
    
    // Check points per second
    const pointsPerSecond = scoreData.totalPoints / durationSeconds;
    if (pointsPerSecond > validation.maxPointsPerSecond) {
        issues.push(`Excessive points per second: ${pointsPerSecond.toFixed(2)}`);
    }
    
    // Check zombies per second
    const zombiesPerSecond = scoreData.zombiesKilled / durationSeconds;
    if (zombiesPerSecond > validation.maxZombiesPerSecond) {
        issues.push(`Excessive zombies per second: ${zombiesPerSecond.toFixed(2)}`);
    }
    
    // Check distance per second
    const distancePerSecond = scoreData.distanceTraveled / durationSeconds;
    if (distancePerSecond > validation.maxDistancePerSecond) {
        issues.push(`Excessive distance per second: ${distancePerSecond.toFixed(2)}`);
    }
    
    // Check points per zombie ratio
    if (scoreData.zombiesKilled > 0) {
        const pointsPerZombie = scoreData.totalPoints / scoreData.zombiesKilled;
        if (pointsPerZombie < validation.minPointsPerZombie || 
            pointsPerZombie > validation.maxPointsPerZombie) {
            issues.push(`Invalid points per zombie ratio: ${pointsPerZombie.toFixed(2)}`);
        }
    }
    
    // Check suspicious score threshold
    if (scoreData.totalPoints > validation.suspiciousScoreThreshold) {
        issues.push(`Suspiciously high score: ${scoreData.totalPoints}`);
    }
    
    return {
        isValid: issues.length === 0,
        issues
    };
}

export default SCORING_CONFIG;