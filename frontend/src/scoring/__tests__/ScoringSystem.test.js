import { ScoringSystem } from '../ScoringSystem';
import { SCORING_CONFIG } from '../ScoringConfig';

// Mock EventEmitter
jest.mock('events', () => ({
    EventEmitter: class MockEventEmitter {
        constructor() {
            this.events = {};
        }
        
        on(event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
        }
        
        off(event, callback) {
            if (this.events[event]) {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            }
        }
        
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        }
        
        removeAllListeners() {
            this.events = {};
        }
    }
}));

describe('ScoringSystem', () => {
    let scoringSystem;
    let mockGameEngine;
    let mockApiClient;

    beforeEach(() => {
        mockGameEngine = {
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn()
        };

        mockApiClient = {
            put: jest.fn().mockResolvedValue({ data: { success: true } }),
            post: jest.fn().mockResolvedValue({ data: { result: { currency_earned: 100 } } })
        };

        scoringSystem = new ScoringSystem(mockGameEngine, mockApiClient);
        
        // Reset session start time for consistent testing
        scoringSystem.sessionStartTime = Date.now() - 10000; // 10 seconds ago
    });

    afterEach(() => {
        scoringSystem.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(scoringSystem.sessionScore.totalPoints).toBe(0);
            expect(scoringSystem.sessionScore.zombiesKilled).toBe(0);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(0);
        });

        test('should setup event listeners on game engine', () => {
            expect(mockGameEngine.on).toHaveBeenCalledWith('zombieKilled', expect.any(Function));
            expect(mockGameEngine.on).toHaveBeenCalledWith('distanceUpdate', expect.any(Function));
            expect(mockGameEngine.on).toHaveBeenCalledWith('specialEvent', expect.any(Function));
        });
    });

    describe('Zombie Kill Handling', () => {
        test('should calculate points for basic zombie kill', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            scoringSystem._handleZombieKill(killData);

            // Should be 10 base points + 100 first blood achievement = 110
            expect(scoringSystem.sessionScore.totalPoints).toBe(110);
            expect(scoringSystem.sessionScore.zombiesKilled).toBe(1);
        });

        test('should apply kill method multipliers', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'explosion', damage: 50 };

            scoringSystem._handleZombieKill(killData);

            // explosion multiplier (15) + first blood (100) + explosive expert (200) = 315
            const expectedPoints = Math.floor(10 * 1.5) + 100 + 200;
            expect(scoringSystem.sessionScore.totalPoints).toBe(expectedPoints);
        });

        test('should apply overkill bonus', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 120 }; // > 2x health

            scoringSystem._handleZombieKill(killData);

            const expectedPoints = Math.floor(10 * 1.3) + 100; // overkill bonus + first blood
            expect(scoringSystem.sessionScore.totalPoints).toBe(expectedPoints);
        });

        test('should apply boss zombie bonus', () => {
            const zombie = { type: 'boss_tyrant', pointValue: 500, maxHealth: 1000 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 1000 };

            scoringSystem._handleZombieKill(killData);

            const expectedPoints = 500 * 3 + 100 + 1000; // boss multiplier + first blood + boss slayer
            expect(scoringSystem.sessionScore.totalPoints).toBe(expectedPoints);
        });
    });

    describe('Combo System', () => {
        test('should not start combo until threshold is reached', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            // First kill
            scoringSystem._handleZombieKill(killData);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(1);

            // Second kill
            scoringSystem._handleZombieKill(killData);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(2);

            // Third kill - combo starts (3 - 3) * 0.2 + 1.0 = 1.0
            scoringSystem._handleZombieKill(killData);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(3);

            // Fourth kill - now combo multiplier increases
            scoringSystem._handleZombieKill(killData);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.2);
            expect(scoringSystem.sessionScore.currentCombo).toBe(4);
        });

        test('should increase multiplier with combo count', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            // Build up combo
            for (let i = 0; i < 8; i++) {
                scoringSystem._handleZombieKill(killData);
            }

            // 8 kills = 5 above threshold * 0.2 increment = 1.0 base + 1.0 bonus = 2.0
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(2.0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(8);
        });

        test('should cap multiplier at maximum', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            // Build up very high combo
            for (let i = 0; i < 50; i++) {
                scoringSystem._handleZombieKill(killData);
            }

            expect(scoringSystem.sessionScore.comboMultiplier).toBe(5.0); // Max multiplier
        });

        test('should reset combo after timeout', (done) => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            // Build combo
            for (let i = 0; i < 5; i++) {
                scoringSystem._handleZombieKill(killData);
            }

            expect(scoringSystem.sessionScore.currentCombo).toBe(5);
            expect(scoringSystem.sessionScore.comboMultiplier).toBeGreaterThan(1.0);

            // Wait for combo to decay
            setTimeout(() => {
                expect(scoringSystem.sessionScore.currentCombo).toBe(0);
                expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
                done();
            }, 3100); // Just over decay time
        });
    });

    describe('Special Events', () => {
        test('should handle air time bonus', () => {
            const eventData = { type: 'airTime', value: 2.5 }; // 2.5 seconds

            scoringSystem._handleSpecialEvent(eventData);

            expect(scoringSystem.sessionScore.totalPoints).toBe(25); // 2.5 * 10
        });

        test('should handle near miss bonus', () => {
            const eventData = { type: 'nearMiss', value: 1 };

            scoringSystem._handleSpecialEvent(eventData);

            expect(scoringSystem.sessionScore.totalPoints).toBe(50);
        });

        test('should handle perfect landing bonus', () => {
            const eventData = { type: 'perfectLanding', value: 1 };

            scoringSystem._handleSpecialEvent(eventData);

            expect(scoringSystem.sessionScore.totalPoints).toBe(100);
        });

        test('should handle environmental kill bonus', () => {
            const eventData = { type: 'environmentalKill', value: 50 }; // Base points

            scoringSystem._handleSpecialEvent(eventData);

            expect(scoringSystem.sessionScore.totalPoints).toBe(100); // 50 * 2
        });
    });

    describe('Achievement System', () => {
        test('should unlock first blood achievement', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            let achievementUnlocked = null;
            scoringSystem.on('achievementUnlocked', (achievement) => {
                achievementUnlocked = achievement;
            });

            scoringSystem._handleZombieKill(killData);

            expect(achievementUnlocked).toBeTruthy();
            expect(achievementUnlocked.id).toBe('FIRST_BLOOD');
            expect(scoringSystem.sessionScore.achievements).toHaveLength(1);
        });

        test('should unlock kill milestone achievements', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            const achievements = [];
            scoringSystem.on('achievementUnlocked', (achievement) => {
                achievements.push(achievement);
            });

            // Kill 10 zombies
            for (let i = 0; i < 10; i++) {
                scoringSystem._handleZombieKill(killData);
            }

            // Should have first blood + 10 kill achievement + combo master (10x combo)
            expect(achievements.length).toBeGreaterThanOrEqual(2);
            expect(achievements.some(a => a.id === 'FIRST_BLOOD')).toBe(true);
            expect(achievements.some(a => a.id === 'KILL_10')).toBe(true);
        });

        test('should unlock combo achievements', () => {
            const zombie = { type: 'walker', pointValue: 10, maxHealth: 50 };
            const killData = { zombie, vehicle: {}, killMethod: 'collision', damage: 50 };

            let comboAchievement = null;
            scoringSystem.on('achievementUnlocked', (achievement) => {
                if (achievement.id === 'COMBO_MASTER') {
                    comboAchievement = achievement;
                }
            });

            // Build 10x combo
            for (let i = 0; i < 10; i++) {
                scoringSystem._handleZombieKill(killData);
            }

            expect(comboAchievement).toBeTruthy();
            expect(comboAchievement.id).toBe('COMBO_MASTER');
        });

        test('should unlock distance achievements', () => {
            let distanceAchievement = null;
            scoringSystem.on('achievementUnlocked', (achievement) => {
                if (achievement.id === 'DISTANCE_1000') {
                    distanceAchievement = achievement;
                }
            });

            scoringSystem._updateDistance(1000);

            expect(distanceAchievement).toBeTruthy();
            expect(distanceAchievement.id).toBe('DISTANCE_1000');
        });
    });

    describe('Currency Calculation', () => {
        test('should calculate base currency from points', () => {
            scoringSystem.sessionScore.totalPoints = 1000;

            const currency = scoringSystem.calculateCurrency();

            expect(currency.baseCurrency).toBe(100); // 1000 * 0.1
            expect(currency.totalCurrency).toBe(100);
        });

        test('should apply achievement bonus', () => {
            scoringSystem.sessionScore.totalPoints = 1000;
            scoringSystem.sessionScore.achievements = [
                { id: 'FIRST_BLOOD', points: 100 },
                { id: 'KILL_10', points: 20 }
            ];

            const currency = scoringSystem.calculateCurrency();

            // Base: 100, Achievement bonus: 2 * 5% = 10% bonus = 110
            expect(currency.totalCurrency).toBe(110);
            expect(currency.bonusCurrency).toBe(10);
        });
    });

    describe('Session Statistics', () => {
        test('should return comprehensive session stats', () => {
            scoringSystem.sessionScore.totalPoints = 500;
            scoringSystem.sessionScore.zombiesKilled = 25;
            scoringSystem.sessionScore.distanceTraveled = 2500;

            const stats = scoringSystem.getSessionStats();

            expect(stats.totalPoints).toBe(500);
            expect(stats.zombiesKilled).toBe(25);
            expect(stats.distanceTraveled).toBe(2500);
            expect(stats.averagePointsPerKill).toBe(20);
            expect(stats.currency).toBeDefined();
            expect(stats.timeElapsed).toBeGreaterThan(0);
        });
    });

    describe('API Integration', () => {
        test('should update session score via API', async () => {
            const sessionId = 'test-session-id';
            scoringSystem.sessionScore.totalPoints = 500;
            scoringSystem.sessionScore.zombiesKilled = 25;
            scoringSystem.sessionScore.distanceTraveled = 1000;

            await scoringSystem.updateSessionScore(sessionId);

            expect(mockApiClient.put).toHaveBeenCalledWith(
                `/api/v1/game/sessions/${sessionId}/score`,
                {
                    score: 500,
                    zombies_killed: 25,
                    distance_traveled: 1000
                }
            );
        });

        test('should end session via API', async () => {
            const sessionId = 'test-session-id';
            scoringSystem.sessionScore.totalPoints = 1000;
            scoringSystem.sessionScore.zombiesKilled = 50;
            scoringSystem.sessionScore.distanceTraveled = 2000;

            const result = await scoringSystem.endSession(sessionId, 'completed');

            expect(mockApiClient.post).toHaveBeenCalledWith(
                `/api/v1/game/sessions/${sessionId}/end`,
                {
                    final_score: 1000,
                    zombies_killed: 50,
                    distance_traveled: 2000,
                    session_state: 'completed'
                }
            );

            expect(result).toEqual({ currency_earned: 100 });
        });

        test('should handle API errors gracefully', async () => {
            const sessionId = 'test-session-id';
            mockApiClient.put.mockRejectedValue(new Error('Network error'));

            await expect(scoringSystem.updateSessionScore(sessionId)).rejects.toThrow('Network error');
        });
    });

    describe('Session Reset', () => {
        test('should reset all session data', () => {
            // Set some data
            scoringSystem.sessionScore.totalPoints = 1000;
            scoringSystem.sessionScore.zombiesKilled = 50;
            scoringSystem.sessionScore.currentCombo = 10;
            scoringSystem.sessionScore.achievements = [{ id: 'test' }];

            scoringSystem.resetSession();

            expect(scoringSystem.sessionScore.totalPoints).toBe(0);
            expect(scoringSystem.sessionScore.zombiesKilled).toBe(0);
            expect(scoringSystem.sessionScore.currentCombo).toBe(0);
            expect(scoringSystem.sessionScore.comboMultiplier).toBe(1.0);
            expect(scoringSystem.sessionScore.achievements).toHaveLength(0);
        });
    });

    describe('Update Loop', () => {
        test('should update time elapsed', () => {
            const initialTime = scoringSystem.sessionScore.timeElapsed;
            
            scoringSystem.update(16); // 16ms delta time
            
            expect(scoringSystem.sessionScore.timeElapsed).toBeGreaterThan(initialTime);
        });
    });
});