import {
    SCORING_CONFIG,
    getZombiePoints,
    getKillMethodMultiplier,
    getComboTier,
    calculateCurrency,
    validateScore
} from '../ScoringConfig';

describe('ScoringConfig', () => {
    describe('SCORING_CONFIG', () => {
        test('should have all required configuration sections', () => {
            expect(SCORING_CONFIG.ZOMBIE_POINTS).toBeDefined();
            expect(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS).toBeDefined();
            expect(SCORING_CONFIG.COMBO_SYSTEM).toBeDefined();
            expect(SCORING_CONFIG.CURRENCY_CONVERSION).toBeDefined();
            expect(SCORING_CONFIG.BONUS_EVENTS).toBeDefined();
            expect(SCORING_CONFIG.ACHIEVEMENT_POINTS).toBeDefined();
            expect(SCORING_CONFIG.VALIDATION).toBeDefined();
        });

        test('should have reasonable zombie point values', () => {
            expect(SCORING_CONFIG.ZOMBIE_POINTS.walker).toBe(10);
            expect(SCORING_CONFIG.ZOMBIE_POINTS.boss_tyrant).toBe(500);
            expect(SCORING_CONFIG.ZOMBIE_POINTS.boss_abomination).toBe(1000);
        });

        test('should have valid kill method multipliers', () => {
            expect(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS.collision).toBe(1.0);
            expect(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS.explosion).toBe(1.5);
            expect(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS.environmental).toBe(2.0);
            expect(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS.special).toBe(2.5);
        });

        test('should have valid combo system configuration', () => {
            const combo = SCORING_CONFIG.COMBO_SYSTEM;
            expect(combo.baseMultiplier).toBe(1.0);
            expect(combo.maxMultiplier).toBe(5.0);
            expect(combo.multiplierIncrement).toBe(0.2);
            expect(combo.comboDecayTime).toBe(3000);
            expect(combo.comboThreshold).toBe(3);
        });
    });

    describe('getZombiePoints', () => {
        test('should return correct points for known zombie types', () => {
            expect(getZombiePoints('walker')).toBe(10);
            expect(getZombiePoints('runner')).toBe(15);
            expect(getZombiePoints('boss_tyrant')).toBe(500);
        });

        test('should return default points for unknown zombie types', () => {
            expect(getZombiePoints('unknown_zombie')).toBe(10); // walker default
        });

        test('should handle null/undefined input', () => {
            expect(getZombiePoints(null)).toBe(10);
            expect(getZombiePoints(undefined)).toBe(10);
        });
    });

    describe('getKillMethodMultiplier', () => {
        test('should return correct multipliers for known methods', () => {
            expect(getKillMethodMultiplier('collision')).toBe(1.0);
            expect(getKillMethodMultiplier('explosion')).toBe(1.5);
            expect(getKillMethodMultiplier('environmental')).toBe(2.0);
            expect(getKillMethodMultiplier('special')).toBe(2.5);
        });

        test('should return default multiplier for unknown methods', () => {
            expect(getKillMethodMultiplier('unknown_method')).toBe(1.0);
        });

        test('should handle null/undefined input', () => {
            expect(getKillMethodMultiplier(null)).toBe(1.0);
            expect(getKillMethodMultiplier(undefined)).toBe(1.0);
        });
    });

    describe('getComboTier', () => {
        test('should return correct tier for combo counts', () => {
            expect(getComboTier(2)).toBeNull(); // Below threshold
            expect(getComboTier(3)).toEqual({ multiplier: 1.2, name: 'Combo!' });
            expect(getComboTier(5)).toEqual({ multiplier: 1.4, name: 'Great Combo!' });
            expect(getComboTier(10)).toEqual({ multiplier: 2.0, name: 'Amazing Combo!' });
            expect(getComboTier(30)).toEqual({ multiplier: 5.0, name: 'UNSTOPPABLE!' });
        });

        test('should return highest applicable tier', () => {
            expect(getComboTier(12)).toEqual({ multiplier: 2.0, name: 'Amazing Combo!' });
            expect(getComboTier(50)).toEqual({ multiplier: 5.0, name: 'UNSTOPPABLE!' });
        });

        test('should handle edge cases', () => {
            expect(getComboTier(0)).toBeNull();
            expect(getComboTier(-1)).toBeNull();
        });
    });

    describe('calculateCurrency', () => {
        test('should calculate base currency correctly', () => {
            const currency = calculateCurrency(1000, 0, 'normal', null);
            expect(currency).toBe(100); // 1000 * 0.1
        });

        test('should apply achievement bonus', () => {
            const currency = calculateCurrency(1000, 2, 'normal', null);
            // Base: 100, Achievement bonus: 2 * 5% = 10% = 110
            expect(currency).toBe(110);
        });

        test('should apply difficulty multipliers', () => {
            expect(calculateCurrency(1000, 0, 'easy', null)).toBe(80);   // 100 * 0.8
            expect(calculateCurrency(1000, 0, 'normal', null)).toBe(100); // 100 * 1.0
            expect(calculateCurrency(1000, 0, 'hard', null)).toBe(130);   // 100 * 1.3
            expect(calculateCurrency(1000, 0, 'nightmare', null)).toBe(150); // 100 * 1.5
        });

        test('should apply level completion bonus', () => {
            expect(calculateCurrency(1000, 0, 'normal', 'bronze')).toBe(110); // 100 * 1.1
            expect(calculateCurrency(1000, 0, 'normal', 'silver')).toBe(125); // 100 * 1.25
            expect(calculateCurrency(1000, 0, 'normal', 'gold')).toBe(150);   // 100 * 1.5
        });

        test('should combine all bonuses', () => {
            // 1000 points, 2 achievements, hard difficulty, gold rating
            // Base: 100
            // Achievement: +10% = 110
            // Difficulty: *1.3 = 143
            // Level: *1.5 = 214.5 -> 214 (floored)
            const currency = calculateCurrency(1000, 2, 'hard', 'gold');
            expect(currency).toBe(214);
        });

        test('should handle unknown difficulty', () => {
            const currency = calculateCurrency(1000, 0, 'unknown', null);
            expect(currency).toBe(100); // Default to 1.0 multiplier
        });
    });

    describe('validateScore', () => {
        const validScoreData = {
            totalPoints: 1000,
            zombiesKilled: 50,
            distanceTraveled: 1000
        };

        test('should validate normal scores', () => {
            const result = validateScore(validScoreData, 60000); // 60 seconds
            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        test('should detect excessive points per second', () => {
            const scoreData = {
                totalPoints: 100000, // Too many points
                zombiesKilled: 50,
                distanceTraveled: 1000
            };
            
            const result = validateScore(scoreData, 10000); // 10 seconds
            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('points per second'))).toBe(true);
        });

        test('should detect excessive zombies per second', () => {
            const scoreData = {
                totalPoints: 1000,
                zombiesKilled: 200, // Too many zombies
                distanceTraveled: 1000
            };
            
            const result = validateScore(scoreData, 10000); // 10 seconds
            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('zombies per second'))).toBe(true);
        });

        test('should detect excessive distance per second', () => {
            const scoreData = {
                totalPoints: 1000,
                zombiesKilled: 50,
                distanceTraveled: 10000 // Too much distance
            };
            
            const result = validateScore(scoreData, 10000); // 10 seconds
            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('distance per second'))).toBe(true);
        });

        test('should detect invalid points per zombie ratio', () => {
            const scoreData = {
                totalPoints: 1, // Too few points for zombies killed
                zombiesKilled: 50,
                distanceTraveled: 1000
            };
            
            const result = validateScore(scoreData, 60000);
            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('points per zombie'))).toBe(true);
        });

        test('should detect suspiciously high scores', () => {
            const scoreData = {
                totalPoints: 200000, // Suspiciously high
                zombiesKilled: 50,
                distanceTraveled: 1000
            };
            
            const result = validateScore(scoreData, 600000); // 10 minutes
            expect(result.isValid).toBe(false);
            expect(result.issues.some(issue => issue.includes('Suspiciously high score'))).toBe(true);
        });

        test('should handle zero zombies killed', () => {
            const scoreData = {
                totalPoints: 100,
                zombiesKilled: 0,
                distanceTraveled: 1000
            };
            
            const result = validateScore(scoreData, 60000);
            expect(result.isValid).toBe(true); // Should not check points per zombie ratio
        });

        test('should detect multiple issues', () => {
            const scoreData = {
                totalPoints: 200000, // Too high and too many per second
                zombiesKilled: 200,  // Too many per second
                distanceTraveled: 10000 // Too much per second
            };
            
            const result = validateScore(scoreData, 10000); // 10 seconds
            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(1);
        });
    });

    describe('Configuration Consistency', () => {
        test('should have consistent combo tier ordering', () => {
            const tiers = Object.keys(SCORING_CONFIG.COMBO_SYSTEM.comboTiers).map(Number).sort((a, b) => a - b);
            
            for (let i = 1; i < tiers.length; i++) {
                const prevTier = SCORING_CONFIG.COMBO_SYSTEM.comboTiers[tiers[i - 1]];
                const currentTier = SCORING_CONFIG.COMBO_SYSTEM.comboTiers[tiers[i]];
                
                expect(currentTier.multiplier).toBeGreaterThanOrEqual(prevTier.multiplier);
            }
        });

        test('should have reasonable validation thresholds', () => {
            const validation = SCORING_CONFIG.VALIDATION;
            
            expect(validation.maxPointsPerSecond).toBeGreaterThan(0);
            expect(validation.maxZombiesPerSecond).toBeGreaterThan(0);
            expect(validation.maxDistancePerSecond).toBeGreaterThan(0);
            expect(validation.minPointsPerZombie).toBeGreaterThan(0);
            expect(validation.maxPointsPerZombie).toBeGreaterThan(validation.minPointsPerZombie);
        });

        test('should have all zombie types with positive point values', () => {
            Object.values(SCORING_CONFIG.ZOMBIE_POINTS).forEach(points => {
                expect(points).toBeGreaterThan(0);
            });
        });

        test('should have all kill method multipliers >= 1.0', () => {
            Object.values(SCORING_CONFIG.KILL_METHOD_MULTIPLIERS).forEach(multiplier => {
                expect(multiplier).toBeGreaterThanOrEqual(1.0);
            });
        });
    });
});