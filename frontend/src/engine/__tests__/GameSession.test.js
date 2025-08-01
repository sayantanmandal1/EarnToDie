import { GameSession } from '../GameSession';

// Mock GameStateManager
const mockGameStateManager = {
    updateGameStats: jest.fn()
};

// Mock ScoringSystem
const mockScoringSystem = {
    calculateScore: jest.fn(),
    getMultiplier: jest.fn().mockReturnValue(1)
};

describe('GameSession', () => {
    let gameSession;

    beforeEach(() => {
        gameSession = new GameSession(mockGameStateManager, mockScoringSystem);
        jest.clearAllMocks();
    });

    afterEach(() => {
        gameSession.dispose();
    });

    describe('Session Lifecycle', () => {
        test('should start a new session correctly', () => {
            const objectives = [
                { id: 'obj1', name: 'Kill 10 zombies', bonusPoints: 100 },
                { id: 'obj2', name: 'Reach checkpoint', bonusPoints: 200 }
            ];

            const sessionStartedSpy = jest.fn();
            gameSession.on('sessionStarted', sessionStartedSpy);

            const result = gameSession.start('level1', 'sedan', objectives);

            expect(result).toBe(true);
            expect(gameSession.isActive).toBe(true);
            expect(gameSession.levelId).toBe('level1');
            expect(gameSession.vehicleId).toBe('sedan');
            expect(gameSession.objectives).toEqual(objectives);
            expect(sessionStartedSpy).toHaveBeenCalled();
        });

        test('should not start session if already active', () => {
            gameSession.start('level1', 'sedan');
            const result = gameSession.start('level2', 'truck');

            expect(result).toBe(false);
            expect(gameSession.levelId).toBe('level1'); // Should remain unchanged
        });

        test('should end session correctly', () => {
            const sessionEndedSpy = jest.fn();
            gameSession.on('sessionEnded', sessionEndedSpy);

            gameSession.start('level1', 'sedan');
            const results = gameSession.end('manual', false);

            expect(gameSession.isActive).toBe(false);
            expect(gameSession.endTime).toBeDefined();
            expect(results).toBeDefined();
            expect(results.completed).toBe(false);
            expect(results.reason).toBe('manual');
            expect(sessionEndedSpy).toHaveBeenCalled();
        });

        test('should not end session if not active', () => {
            const result = gameSession.end('manual', false);
            expect(result).toBeNull();
        });
    });

    describe('Statistics Tracking', () => {
        beforeEach(() => {
            gameSession.start('level1', 'sedan');
        });

        test('should update statistics correctly', () => {
            const statsUpdatedSpy = jest.fn();
            gameSession.on('statsUpdated', statsUpdatedSpy);

            gameSession.updateStats({ score: 1000, zombiesKilled: 5 });

            expect(gameSession.stats.score).toBe(1000);
            expect(gameSession.stats.zombiesKilled).toBe(5);
            expect(statsUpdatedSpy).toHaveBeenCalledWith(gameSession.stats);
        });

        test('should add score correctly', () => {
            const scoreAddedSpy = jest.fn();
            gameSession.on('scoreAdded', scoreAddedSpy);

            gameSession.addScore(500, 'zombie_kills');

            expect(gameSession.stats.score).toBe(500);
            expect(gameSession.stats.totalPointsEarned).toBe(500);
            expect(gameSession.stats.scoreBreakdown.zombie_kills).toBe(500);
            expect(scoreAddedSpy).toHaveBeenCalledWith({
                points: 500,
                source: 'zombie_kills',
                totalScore: 500
            });
        });

        test('should record zombie kills correctly', () => {
            const zombieKilledSpy = jest.fn();
            gameSession.on('zombieKilled', zombieKilledSpy);

            gameSession.recordZombieKill('walker', 100, 2);

            expect(gameSession.stats.zombiesKilled).toBe(1);
            expect(gameSession.stats.zombieKills.walker).toBe(1);
            expect(gameSession.stats.currentCombo).toBe(1);
            expect(gameSession.stats.maxCombo).toBe(1);
            expect(gameSession.stats.score).toBe(200); // 100 * 2 multiplier
            expect(zombieKilledSpy).toHaveBeenCalledWith({
                zombieType: 'walker',
                points: 200,
                comboMultiplier: 2,
                currentCombo: 1
            });
        });

        test('should track combo correctly', () => {
            gameSession.recordZombieKill('walker', 100);
            gameSession.recordZombieKill('runner', 150);
            gameSession.recordZombieKill('brute', 300);

            expect(gameSession.stats.currentCombo).toBe(3);
            expect(gameSession.stats.maxCombo).toBe(3);
        });

        test('should break combo correctly', () => {
            const comboBreakSpy = jest.fn();
            gameSession.on('comboBreak', comboBreakSpy);

            gameSession.recordZombieKill('walker', 100);
            gameSession.breakCombo();

            expect(gameSession.stats.currentCombo).toBe(0);
            expect(gameSession.stats.maxCombo).toBe(1);
            expect(comboBreakSpy).toHaveBeenCalled();
        });

        test('should update distance traveled', () => {
            const distanceUpdatedSpy = jest.fn();
            gameSession.on('distanceUpdated', distanceUpdatedSpy);

            gameSession.updateDistance(1500);

            expect(gameSession.stats.distanceTraveled).toBe(1500);
            expect(distanceUpdatedSpy).toHaveBeenCalledWith(1500);
        });

        test('should record damage correctly', () => {
            const damageRecordedSpy = jest.fn();
            gameSession.on('damageRecorded', damageRecordedSpy);

            gameSession.recordDamage(25, 'zombie_attack');

            expect(gameSession.stats.damageTaken).toBe(25);
            expect(gameSession.stats.damageBySource.zombie_attack).toBe(25);
            expect(damageRecordedSpy).toHaveBeenCalledWith({
                damage: 25,
                source: 'zombie_attack',
                totalDamage: 25
            });
        });

        test('should update vehicle status', () => {
            const vehicleStatusSpy = jest.fn();
            gameSession.on('vehicleStatusUpdated', vehicleStatusSpy);

            gameSession.updateVehicleStatus(75, 60);

            expect(gameSession.stats.vehicleHealth).toBe(75);
            expect(gameSession.stats.vehicleFuel).toBe(60);
            expect(vehicleStatusSpy).toHaveBeenCalledWith({ health: 75, fuel: 60 });
        });
    });

    describe('Checkpoint System', () => {
        beforeEach(() => {
            gameSession.start('level1', 'sedan');
        });

        test('should record checkpoint correctly', () => {
            const checkpointSpy = jest.fn();
            gameSession.on('checkpointReached', checkpointSpy);

            const position = { x: 100, y: 0, z: 200 };
            gameSession.reachCheckpoint('cp1', position, 30);

            expect(gameSession.checkpoints).toHaveLength(1);
            expect(gameSession.checkpoints[0].id).toBe('cp1');
            expect(gameSession.checkpoints[0].position).toEqual(position);
            expect(gameSession.checkpoints[0].timeElapsed).toBe(30);
            expect(gameSession.stats.checkpointsReached).toBe(1);
            expect(gameSession.stats.score).toBe(100); // Checkpoint bonus
            expect(checkpointSpy).toHaveBeenCalled();
        });
    });

    describe('Objective System', () => {
        beforeEach(() => {
            const objectives = [
                { id: 'obj1', name: 'Kill 10 zombies', bonusPoints: 100 },
                { id: 'obj2', name: 'Reach checkpoint', bonusPoints: 200 }
            ];
            gameSession.start('level1', 'sedan', objectives);
        });

        test('should complete objective correctly', () => {
            const objectiveCompletedSpy = jest.fn();
            gameSession.on('objectiveCompleted', objectiveCompletedSpy);

            gameSession.completeObjective('obj1');

            expect(gameSession.completedObjectives).toContain('obj1');
            expect(gameSession.stats.score).toBe(100); // Objective bonus
            expect(objectiveCompletedSpy).toHaveBeenCalledWith({
                objectiveId: 'obj1',
                objective: gameSession.objectives[0],
                bonusPoints: 100,
                completedCount: 1,
                totalCount: 2
            });
        });

        test('should not complete same objective twice', () => {
            gameSession.completeObjective('obj1');
            const initialScore = gameSession.stats.score;
            
            gameSession.completeObjective('obj1'); // Try again

            expect(gameSession.completedObjectives).toHaveLength(1);
            expect(gameSession.stats.score).toBe(initialScore); // No additional points
        });

        test('should trigger level completion when all objectives are done', () => {
            const levelCompletedSpy = jest.fn();
            gameSession.on('levelCompleted', levelCompletedSpy);

            gameSession.completeObjective('obj1');
            gameSession.completeObjective('obj2');

            expect(gameSession.levelCompleted).toBe(true);
            expect(levelCompletedSpy).toHaveBeenCalled();
        });
    });

    describe('Results Calculation', () => {
        beforeEach(() => {
            gameSession.start('level1', 'sedan', [
                { id: 'obj1', name: 'Test objective', bonusPoints: 100 }
            ]);
        });

        test('should calculate results for completed level', () => {
            // Simulate gameplay
            gameSession.recordZombieKill('walker', 100);
            gameSession.recordZombieKill('runner', 150);
            gameSession.updateDistance(1000);
            gameSession.completeObjective('obj1');

            const results = gameSession.end('level_completed', true);

            expect(results.completed).toBe(true);
            expect(results.baseScore).toBeGreaterThan(0);
            expect(results.bonuses.completion).toBe(1000);
            expect(results.finalScore).toBeGreaterThan(results.baseScore);
            expect(results.stars).toBeGreaterThanOrEqual(2);
            expect(results.grade).not.toBe('F');
        });

        test('should calculate results for failed level', () => {
            gameSession.recordZombieKill('walker', 100);
            gameSession.recordDamage(100, 'zombie_attack');

            const results = gameSession.end('vehicle_destroyed', false);

            expect(results.completed).toBe(false);
            expect(results.bonuses.completion).toBe(0);
            expect(results.bonuses.time).toBe(0);
            expect(results.stars).toBe(1);
            expect(results.grade).toBe('F');
        });

        test('should calculate achievements correctly', () => {
            // Simulate high combo
            for (let i = 0; i < 15; i++) {
                gameSession.recordZombieKill('walker', 100);
            }

            const results = gameSession.end('manual', false);
            expect(results.achievements).toContain('combo_starter');
        });
    });

    describe('Session Data', () => {
        test('should provide complete session data', () => {
            const objectives = [{ id: 'obj1', name: 'Test', bonusPoints: 100 }];
            gameSession.start('level1', 'sedan', objectives);
            gameSession.recordZombieKill('walker', 100);

            const sessionData = gameSession.getSessionData();

            expect(sessionData.sessionId).toBeDefined();
            expect(sessionData.levelId).toBe('level1');
            expect(sessionData.vehicleId).toBe('sedan');
            expect(sessionData.isActive).toBe(true);
            expect(sessionData.stats).toBeDefined();
            expect(sessionData.objectives).toEqual(objectives);
            expect(sessionData.completedObjectives).toEqual([]);
            expect(sessionData.checkpoints).toEqual([]);
        });

        test('should calculate session duration correctly', () => {
            const startTime = Date.now();
            gameSession.start('level1', 'sedan');
            
            // Mock time passage
            const endTime = startTime + 5000; // 5 seconds later
            jest.spyOn(Date, 'now').mockReturnValue(endTime);

            const duration = gameSession.getDuration();
            expect(duration).toBe(5); // 5 seconds
        });
    });

    describe('Disposal', () => {
        test('should dispose correctly', () => {
            gameSession.start('level1', 'sedan');
            gameSession.dispose();

            expect(gameSession.isActive).toBe(false);
            expect(gameSession.gameStateManager).toBeNull();
            expect(gameSession.scoringSystem).toBeNull();
        });
    });
});