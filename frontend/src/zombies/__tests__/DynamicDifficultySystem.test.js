/**
 * Dynamic Difficulty System Test Suite
 * 
 * Comprehensive tests for the dynamic difficulty and spawning system,
 * including performance tracking, spawn management, boss mechanics,
 * and environmental hazards.
 */

import DynamicDifficultySystem from '../DynamicDifficultySystem';
import PerformanceTracker from '../PerformanceTracker';
import IntelligentSpawnManager from '../IntelligentSpawnManager';

// Mock game state for testing
const createMockGameState = () => ({
    player: {
        position: { x: 0, y: 0, z: 0 },
        health: 100,
        velocity: { x: 0, z: 0 }
    },
    vehicle: {
        position: { x: 0, y: 0, z: 0 },
        speed: 15,
        collisionCount: 0
    },
    combat: {
        zombiesKilled: 0,
        shotsFired: 0,
        shotsHit: 0,
        currentCombo: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0
    },
    gameTime: 0,
    objectivesCompleted: 0,
    threats: []
});

describe('DynamicDifficultySystem', () => {
    let difficultySystem;
    let mockGameState;
    
    beforeEach(() => {
        mockGameState = createMockGameState();
        difficultySystem = new DynamicDifficultySystem(mockGameState);
        
        // Mock console.log to reduce test output
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default difficulty level', () => {
            expect(difficultySystem.getDifficultyLevel()).toBe(1.0);
        });
        
        test('should initialize all subsystems', () => {
            expect(difficultySystem.performanceTracker).toBeDefined();
            expect(difficultySystem.spawnManager).toBeDefined();
            expect(difficultySystem.bossManager).toBeDefined();
            expect(difficultySystem.hazardManager).toBeDefined();
        });
        
        test('should have valid configuration parameters', () => {
            expect(difficultySystem.minDifficulty).toBe(0.5);
            expect(difficultySystem.maxDifficulty).toBe(3.0);
            expect(difficultySystem.adjustmentRate).toBe(0.1);
            expect(difficultySystem.evaluationInterval).toBe(5000);
        });
    });
    
    describe('Difficulty Adjustment', () => {
        test('should increase difficulty for excellent performance', () => {
            // Mock excellent performance
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(0.9);
            
            const initialDifficulty = difficultySystem.getDifficultyLevel();
            difficultySystem.evaluateAndAdjustDifficulty();
            
            expect(difficultySystem.getDifficultyLevel()).toBeGreaterThan(initialDifficulty);
        });
        
        test('should decrease difficulty for poor performance', () => {
            // Mock poor performance
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(0.1);
            
            const initialDifficulty = difficultySystem.getDifficultyLevel();
            difficultySystem.evaluateAndAdjustDifficulty();
            
            expect(difficultySystem.getDifficultyLevel()).toBeLessThan(initialDifficulty);
        });
        
        test('should maintain difficulty for average performance', () => {
            // Mock average performance
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(0.5);
            
            const initialDifficulty = difficultySystem.getDifficultyLevel();
            difficultySystem.evaluateAndAdjustDifficulty();
            
            expect(Math.abs(difficultySystem.getDifficultyLevel() - initialDifficulty)).toBeLessThan(0.1);
        });
        
        test('should respect minimum difficulty bounds', () => {
            difficultySystem.difficultyLevel = 0.6;
            
            // Mock very poor performance
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(0.0);
            
            difficultySystem.evaluateAndAdjustDifficulty();
            
            expect(difficultySystem.getDifficultyLevel()).toBeGreaterThanOrEqual(0.5);
        });
        
        test('should respect maximum difficulty bounds', () => {
            difficultySystem.difficultyLevel = 2.8;
            
            // Mock excellent performance
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(1.0);
            
            difficultySystem.evaluateAndAdjustDifficulty();
            
            expect(difficultySystem.getDifficultyLevel()).toBeLessThanOrEqual(3.0);
        });
        
        test('should record difficulty history', () => {
            jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
                .mockReturnValue(0.8);
            
            difficultySystem.evaluateAndAdjustDifficulty();
            
            const history = difficultySystem.getDifficultyHistory();
            expect(history.length).toBe(1);
            expect(history[0]).toHaveProperty('timestamp');
            expect(history[0]).toHaveProperty('difficulty');
            expect(history[0]).toHaveProperty('performance');
            expect(history[0]).toHaveProperty('reason');
        });
    });
    
    describe('System Updates', () => {
        test('should update all subsystems', () => {
            const performanceUpdateSpy = jest.spyOn(difficultySystem.performanceTracker, 'update');
            const spawnUpdateSpy = jest.spyOn(difficultySystem.spawnManager, 'update');
            const bossUpdateSpy = jest.spyOn(difficultySystem.bossManager, 'update');
            const hazardUpdateSpy = jest.spyOn(difficultySystem.hazardManager, 'update');
            
            difficultySystem.update(16.67); // 60 FPS
            
            expect(performanceUpdateSpy).toHaveBeenCalledWith(16.67, mockGameState);
            expect(spawnUpdateSpy).toHaveBeenCalledWith(16.67, 1.0);
            expect(bossUpdateSpy).toHaveBeenCalledWith(16.67, 1.0);
            expect(hazardUpdateSpy).toHaveBeenCalledWith(16.67, 1.0);
        });
        
        test('should evaluate difficulty at regular intervals', () => {
            const evaluateSpy = jest.spyOn(difficultySystem, 'evaluateAndAdjustDifficulty');
            
            // Fast-forward time to trigger evaluation
            difficultySystem.lastEvaluation = Date.now() - 6000; // 6 seconds ago
            
            difficultySystem.update(16.67);
            
            expect(evaluateSpy).toHaveBeenCalled();
        });
        
        test('should not evaluate difficulty too frequently', () => {
            const evaluateSpy = jest.spyOn(difficultySystem, 'evaluateAndAdjustDifficulty');
            
            // Recent evaluation
            difficultySystem.lastEvaluation = Date.now() - 1000; // 1 second ago
            
            difficultySystem.update(16.67);
            
            expect(evaluateSpy).not.toHaveBeenCalled();
        });
    });
    
    describe('Manual Overrides', () => {
        test('should allow manual difficulty override', () => {
            difficultySystem.setDifficultyOverride(2.5);
            expect(difficultySystem.getDifficultyLevel()).toBe(2.5);
        });
        
        test('should clamp manual override to valid range', () => {
            difficultySystem.setDifficultyOverride(5.0);
            expect(difficultySystem.getDifficultyLevel()).toBe(3.0);
            
            difficultySystem.setDifficultyOverride(0.1);
            expect(difficultySystem.getDifficultyLevel()).toBe(0.5);
        });
    });
    
    describe('Statistics and Monitoring', () => {
        test('should provide spawn statistics', () => {
            const stats = difficultySystem.getSpawnStatistics();
            expect(stats).toHaveProperty('totalSpawned');
            expect(stats).toHaveProperty('spawnsByType');
            expect(stats).toHaveProperty('spawnsByPattern');
        });
        
        test('should provide boss statistics', () => {
            const stats = difficultySystem.getBossStatistics();
            expect(stats).toHaveProperty('bossesSpawned');
            expect(stats).toHaveProperty('bossesByType');
            expect(stats).toHaveProperty('bossesDefeated');
        });
        
        test('should provide hazard statistics', () => {
            const stats = difficultySystem.getHazardStatistics();
            expect(stats).toHaveProperty('hazardsSpawned');
            expect(stats).toHaveProperty('hazardsByType');
            expect(stats).toHaveProperty('hazardsTriggered');
        });
    });
});

describe('PerformanceTracker', () => {
    let performanceTracker;
    let mockGameState;
    
    beforeEach(() => {
        performanceTracker = new PerformanceTracker();
        mockGameState = createMockGameState();
        performanceTracker.initialize();
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default metrics', () => {
            const metrics = performanceTracker.getDetailedMetrics();
            expect(metrics.current.zombiesKilled).toBe(0);
            expect(metrics.current.hitAccuracy).toBe(0);
            expect(metrics.current.healthPercentage).toBe(100);
        });
        
        test('should initialize with proper weights', () => {
            expect(performanceTracker.weights.combat).toBe(0.3);
            expect(performanceTracker.weights.movement).toBe(0.2);
            expect(performanceTracker.weights.survival).toBe(0.3);
            expect(performanceTracker.weights.skill).toBe(0.2);
        });
    });
    
    describe('Combat Metrics', () => {
        test('should track zombie kills', () => {
            mockGameState.combat.zombiesKilled = 10;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.zombiesKilled).toBe(10);
        });
        
        test('should calculate hit accuracy', () => {
            mockGameState.combat.shotsFired = 20;
            mockGameState.combat.shotsHit = 15;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.hitAccuracy).toBe(0.75);
        });
        
        test('should track combo multiplier', () => {
            mockGameState.combat.currentCombo = 5;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.comboMultiplier).toBe(5);
        });
        
        test('should track damage metrics', () => {
            mockGameState.combat.totalDamageDealt = 500;
            mockGameState.combat.totalDamageTaken = 100;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.damageDealt).toBe(500);
            expect(performanceTracker.metrics.damageTaken).toBe(100);
        });
    });
    
    describe('Movement Metrics', () => {
        test('should track average speed', () => {
            mockGameState.vehicle.speed = 20;
            performanceTracker.update(16.67, mockGameState);
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.averageSpeed).toBe(20);
        });
        
        test('should track distance traveled', () => {
            // Set initial position
            mockGameState.vehicle.position = { x: 0, y: 0, z: 0 };
            performanceTracker.update(16.67, mockGameState);
            
            // Move vehicle
            mockGameState.vehicle.position = { x: 10, y: 0, z: 0 };
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.distanceTraveled).toBeCloseTo(10, 1);
        });
        
        test('should track time stuck', () => {
            mockGameState.vehicle.speed = 0.5; // Very slow speed
            
            // Simulate being stuck for multiple updates
            for (let i = 0; i < 200; i++) { // ~3.3 seconds at 60fps
                performanceTracker.update(16.67, mockGameState);
            }
            
            expect(performanceTracker.metrics.timeStuck).toBeGreaterThan(0);
        });
        
        test('should track collisions', () => {
            mockGameState.vehicle.collisionCount = 5;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.collisions).toBe(5);
        });
    });
    
    describe('Survival Metrics', () => {
        test('should track health percentage', () => {
            mockGameState.player.health = 75;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.healthPercentage).toBe(75);
        });
        
        test('should track survival time', () => {
            mockGameState.gameTime = 30000; // 30 seconds
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.survivalTime).toBe(30000);
        });
        
        test('should track objectives completed', () => {
            mockGameState.objectivesCompleted = 3;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.objectivesCompleted).toBe(3);
        });
        
        test('should calculate resource efficiency', () => {
            // Start with full health
            mockGameState.player.health = 100;
            performanceTracker.update(16.67, mockGameState);
            
            // Take some damage
            mockGameState.player.health = 80;
            performanceTracker.update(16.67, mockGameState);
            
            expect(performanceTracker.metrics.resourceEfficiency).toBeLessThan(1.0);
        });
    });
    
    describe('Performance Score Calculation', () => {
        test('should calculate overall performance score', () => {
            // Set up good performance metrics
            mockGameState.combat.shotsFired = 10;
            mockGameState.combat.shotsHit = 8;
            mockGameState.combat.zombiesKilled = 15;
            mockGameState.vehicle.speed = 25;
            mockGameState.player.health = 90;
            mockGameState.gameTime = 30000;
            
            performanceTracker.update(16.67, mockGameState);
            
            const score = performanceTracker.getPerformanceScore();
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(1);
        });
        
        test('should provide detailed metric breakdown', () => {
            const metrics = performanceTracker.getDetailedMetrics();
            
            expect(metrics).toHaveProperty('current');
            expect(metrics).toHaveProperty('overall');
            expect(metrics).toHaveProperty('breakdown');
            expect(metrics.breakdown).toHaveProperty('combat');
            expect(metrics.breakdown).toHaveProperty('movement');
            expect(metrics.breakdown).toHaveProperty('survival');
            expect(metrics.breakdown).toHaveProperty('skill');
        });
        
        test('should record performance history', () => {
            // Simulate multiple updates to build history
            for (let i = 0; i < 5; i++) {
                performanceTracker.recordPerformanceSnapshot();
            }
            
            expect(performanceTracker.performanceHistory.length).toBe(5);
        });
        
        test('should limit performance history size', () => {
            // Simulate many updates
            for (let i = 0; i < 350; i++) {
                performanceTracker.recordPerformanceSnapshot();
            }
            
            expect(performanceTracker.performanceHistory.length).toBeLessThanOrEqual(300);
        });
    });
    
    describe('Metric Reset', () => {
        test('should reset all metrics to defaults', () => {
            // Set some metrics
            performanceTracker.metrics.zombiesKilled = 10;
            performanceTracker.metrics.hitAccuracy = 0.8;
            performanceTracker.performanceHistory.push({ test: 'data' });
            
            performanceTracker.resetMetrics();
            
            expect(performanceTracker.metrics.zombiesKilled).toBe(0);
            expect(performanceTracker.metrics.hitAccuracy).toBe(0);
            expect(performanceTracker.performanceHistory.length).toBe(0);
        });
    });
});

describe('IntelligentSpawnManager', () => {
    let spawnManager;
    let mockGameState;
    
    beforeEach(() => {
        spawnManager = new IntelligentSpawnManager();
        mockGameState = createMockGameState();
        spawnManager.initialize(mockGameState);
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize spawn patterns', () => {
            expect(spawnManager.spawnPatterns.size).toBeGreaterThan(0);
            expect(spawnManager.spawnPatterns.has('scattered')).toBe(true);
            expect(spawnManager.spawnPatterns.has('clustered')).toBe(true);
            expect(spawnManager.spawnPatterns.has('ambush')).toBe(true);
            expect(spawnManager.spawnPatterns.has('swarm')).toBe(true);
        });
        
        test('should initialize zombie types', () => {
            expect(spawnManager.zombieTypes).toHaveProperty('normal');
            expect(spawnManager.zombieTypes).toHaveProperty('fast');
            expect(spawnManager.zombieTypes).toHaveProperty('heavy');
            expect(spawnManager.zombieTypes).toHaveProperty('special');
        });
        
        test('should initialize with proper configuration', () => {
            expect(spawnManager.maxActiveZombies).toBe(50);
            expect(spawnManager.baseSpawnRate).toBe(2000);
            expect(spawnManager.spawnRadius.min).toBe(30);
            expect(spawnManager.spawnRadius.max).toBe(100);
        });
    });
    
    describe('Spawn Decision Logic', () => {
        test('should spawn when conditions are met', () => {
            spawnManager.lastSpawnTime = Date.now() - 3000; // 3 seconds ago
            
            const shouldSpawn = spawnManager.shouldSpawn(Date.now(), 1.0);
            expect(shouldSpawn).toBe(true);
        });
        
        test('should not spawn when at max capacity', () => {
            // Fill up active spawns
            for (let i = 0; i < 50; i++) {
                spawnManager.activeSpawns.push({ status: 'active' });
            }
            
            const shouldSpawn = spawnManager.shouldSpawn(Date.now(), 1.0);
            expect(shouldSpawn).toBe(false);
        });
        
        test('should not spawn too frequently', () => {
            spawnManager.lastSpawnTime = Date.now() - 500; // 0.5 seconds ago
            
            const shouldSpawn = spawnManager.shouldSpawn(Date.now(), 1.0);
            expect(shouldSpawn).toBe(false);
        });
        
        test('should adjust spawn rate based on difficulty', () => {
            spawnManager.lastSpawnTime = Date.now() - 1500; // 1.5 seconds ago
            
            // High difficulty should allow more frequent spawns
            const shouldSpawnHigh = spawnManager.shouldSpawn(Date.now(), 2.0);
            expect(shouldSpawnHigh).toBe(true);
            
            // Low difficulty should require longer intervals
            const shouldSpawnLow = spawnManager.shouldSpawn(Date.now(), 0.5);
            expect(shouldSpawnLow).toBe(false);
        });
    });
    
    describe('Spawn Pattern Execution', () => {
        test('should execute scattered pattern', () => {
            const playerPos = { x: 0, y: 0, z: 0 };
            const spawns = spawnManager.executeScatteredPattern(playerPos, 5, 1.0);
            
            expect(spawns.length).toBe(5);
            spawns.forEach(spawn => {
                expect(spawn).toHaveProperty('position');
                expect(spawn).toHaveProperty('type');
                expect(spawn).toHaveProperty('priority');
                
                // Check spawn is within radius
                const distance = Math.sqrt(
                    Math.pow(spawn.position.x - playerPos.x, 2) +
                    Math.pow(spawn.position.z - playerPos.z, 2)
                );
                expect(distance).toBeGreaterThanOrEqual(30);
                expect(distance).toBeLessThanOrEqual(100);
            });
        });
        
        test('should execute clustered pattern', () => {
            const playerPos = { x: 0, y: 0, z: 0 };
            const spawns = spawnManager.executeClusteredPattern(playerPos, 9, 1.0);
            
            expect(spawns.length).toBe(9);
            spawns.forEach(spawn => {
                expect(spawn).toHaveProperty('position');
                expect(spawn).toHaveProperty('type');
                expect(spawn.priority).toBeGreaterThanOrEqual(0.7); // Higher priority for clusters
            });
        });
        
        test('should execute ambush pattern with moving player', () => {
            const playerPos = { x: 0, y: 0, z: 0 };
            mockGameState.player.velocity = { x: 10, z: 0 }; // Moving east
            
            const spawns = spawnManager.executeAmbushPattern(playerPos, 4, 1.0);
            
            expect(spawns.length).toBe(4);
            spawns.forEach(spawn => {
                expect(spawn.priority).toBeGreaterThanOrEqual(0.8); // High priority for ambush
                // Spawns should be ahead of player movement
                expect(spawn.position.x).toBeGreaterThan(playerPos.x);
            });
        });
        
        test('should execute swarm pattern', () => {
            const playerPos = { x: 0, y: 0, z: 0 };
            const spawns = spawnManager.executeSwarmPattern(playerPos, 8, 1.0);
            
            expect(spawns.length).toBe(8);
            spawns.forEach(spawn => {
                expect(spawn.priority).toBe(0.9); // Very high priority
                expect(spawn).toHaveProperty('swarmId');
            });
            
            // All spawns should have the same swarm ID
            const swarmIds = spawns.map(spawn => spawn.swarmId);
            expect(new Set(swarmIds).size).toBe(1);
        });
    });
    
    describe('Zombie Type Selection', () => {
        test('should select zombie types based on difficulty', () => {
            const lowDifficultyType = spawnManager.selectZombieType(0.5);
            const highDifficultyType = spawnManager.selectZombieType(2.5);
            
            expect(['normal', 'fast', 'heavy', 'special']).toContain(lowDifficultyType);
            expect(['normal', 'fast', 'heavy', 'special']).toContain(highDifficultyType);
        });
        
        test('should adjust type selection based on context', () => {
            // Test multiple selections to check distribution
            const ambushTypes = [];
            for (let i = 0; i < 20; i++) {
                ambushTypes.push(spawnManager.selectZombieType(1.5, 'ambush'));
            }
            
            // Ambush context should favor fast zombies
            const fastCount = ambushTypes.filter(type => type === 'fast').length;
            expect(fastCount).toBeGreaterThan(0);
        });
    });
    
    describe('Spawn Request Management', () => {
        test('should create spawn requests', () => {
            const position = { x: 10, y: 0, z: 10 };
            const request = spawnManager.requestSpawn(position, 'normal', 1.0);
            
            expect(request).toHaveProperty('id');
            expect(request).toHaveProperty('position');
            expect(request).toHaveProperty('type');
            expect(request).toHaveProperty('priority');
            expect(request.status).toBe('pending');
        });
        
        test('should track spawn statistics', () => {
            spawnManager.requestSpawn({ x: 0, y: 0, z: 0 }, 'normal', 1.0);
            spawnManager.requestSpawn({ x: 5, y: 0, z: 5 }, 'fast', 1.0);
            
            const stats = spawnManager.getStatistics();
            expect(stats.totalSpawned).toBe(2);
            expect(stats.spawnsByType.normal).toBe(1);
            expect(stats.spawnsByType.fast).toBe(1);
        });
        
        test('should cleanup completed spawns', () => {
            const request = spawnManager.requestSpawn({ x: 0, y: 0, z: 0 }, 'normal', 1.0);
            request.status = 'completed';
            
            spawnManager.cleanupCompletedSpawns();
            
            expect(spawnManager.activeSpawns.length).toBe(0);
        });
    });
    
    describe('Statistics and Monitoring', () => {
        test('should calculate pattern distribution', () => {
            spawnManager.statistics.spawnsByPattern = {
                scattered: 10,
                clustered: 5,
                ambush: 3,
                swarm: 2
            };
            
            const distribution = spawnManager.calculatePatternDistribution();
            expect(distribution.scattered).toBeCloseTo(0.5, 1);
            expect(distribution.clustered).toBeCloseTo(0.25, 1);
        });
        
        test('should calculate type distribution', () => {
            spawnManager.statistics.spawnsByType = {
                normal: 14,
                fast: 4,
                heavy: 2
            };
            
            const distribution = spawnManager.calculateTypeDistribution();
            expect(distribution.normal).toBeCloseTo(0.7, 1);
            expect(distribution.fast).toBeCloseTo(0.2, 1);
        });
        
        test('should provide comprehensive statistics', () => {
            const stats = spawnManager.getStatistics();
            
            expect(stats).toHaveProperty('totalSpawned');
            expect(stats).toHaveProperty('spawnsByType');
            expect(stats).toHaveProperty('spawnsByPattern');
            expect(stats).toHaveProperty('averageSpawnRate');
            expect(stats).toHaveProperty('spawnEfficiency');
            expect(stats).toHaveProperty('activeSpawns');
            expect(stats).toHaveProperty('patternDistribution');
            expect(stats).toHaveProperty('typeDistribution');
        });
    });
    
    describe('System Updates', () => {
        test('should update spawn statistics over time', () => {
            // Add some spawn history
            spawnManager.spawnHistory.push(
                { timestamp: Date.now() - 5000, status: 'completed' },
                { timestamp: Date.now() - 3000, status: 'completed' },
                { timestamp: Date.now() - 1000, status: 'failed' }
            );
            
            spawnManager.updateStatistics(16.67);
            
            const stats = spawnManager.getStatistics();
            expect(stats.averageSpawnRate).toBeGreaterThan(0);
            expect(stats.spawnEfficiency).toBeCloseTo(0.67, 1); // 2/3 successful
        });
        
        test('should limit spawn history size', () => {
            // Fill history beyond limit
            for (let i = 0; i < 1100; i++) {
                spawnManager.spawnHistory.push({ timestamp: Date.now() });
            }
            
            spawnManager.createSpawnRequest({ position: { x: 0, y: 0, z: 0 }, type: 'normal' }, 'test');
            
            expect(spawnManager.spawnHistory.length).toBeLessThanOrEqual(1000);
        });
    });
});

describe('Integration Tests', () => {
    let difficultySystem;
    let mockGameState;
    
    beforeEach(() => {
        mockGameState = createMockGameState();
        difficultySystem = new DynamicDifficultySystem(mockGameState);
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Performance-Difficulty Feedback Loop', () => {
        test('should increase difficulty when player performs well', () => {
            // Simulate excellent performance over time
            mockGameState.combat.shotsFired = 50;
            mockGameState.combat.shotsHit = 45;
            mockGameState.combat.zombiesKilled = 30;
            mockGameState.vehicle.speed = 30;
            mockGameState.player.health = 95;
            
            const initialDifficulty = difficultySystem.getDifficultyLevel();
            
            // Update system multiple times
            for (let i = 0; i < 10; i++) {
                difficultySystem.update(16.67);
            }
            
            // Force difficulty evaluation
            difficultySystem.lastEvaluation = Date.now() - 6000;
            difficultySystem.update(16.67);
            
            expect(difficultySystem.getDifficultyLevel()).toBeGreaterThan(initialDifficulty);
        });
        
        test('should decrease difficulty when player struggles', () => {
            // Simulate poor performance
            mockGameState.combat.shotsFired = 50;
            mockGameState.combat.shotsHit = 10;
            mockGameState.combat.zombiesKilled = 2;
            mockGameState.vehicle.speed = 5;
            mockGameState.player.health = 30;
            
            const initialDifficulty = difficultySystem.getDifficultyLevel();
            
            // Update system multiple times
            for (let i = 0; i < 10; i++) {
                difficultySystem.update(16.67);
            }
            
            // Force difficulty evaluation
            difficultySystem.lastEvaluation = Date.now() - 6000;
            difficultySystem.update(16.67);
            
            expect(difficultySystem.getDifficultyLevel()).toBeLessThan(initialDifficulty);
        });
    });
    
    describe('Spawn System Integration', () => {
        test('should spawn more zombies at higher difficulty', () => {
            difficultySystem.setDifficultyOverride(2.0);
            
            const spawnCount1 = difficultySystem.spawnManager.calculateSpawnCount(1.0);
            const spawnCount2 = difficultySystem.spawnManager.calculateSpawnCount(2.0);
            
            expect(spawnCount2).toBeGreaterThanOrEqual(spawnCount1);
        });
        
        test('should select more challenging zombie types at higher difficulty', () => {
            const lowDifficultyTypes = [];
            const highDifficultyTypes = [];
            
            // Sample multiple selections
            for (let i = 0; i < 50; i++) {
                lowDifficultyTypes.push(difficultySystem.spawnManager.selectZombieType(0.5));
                highDifficultyTypes.push(difficultySystem.spawnManager.selectZombieType(2.5));
            }
            
            const lowSpecialCount = lowDifficultyTypes.filter(type => type === 'special').length;
            const highSpecialCount = highDifficultyTypes.filter(type => type === 'special').length;
            
            expect(highSpecialCount).toBeGreaterThanOrEqual(lowSpecialCount);
        });
    });
    
    describe('System State Consistency', () => {
        test('should maintain consistent state across updates', () => {
            const initialState = {
                difficulty: difficultySystem.getDifficultyLevel(),
                performance: difficultySystem.getPerformanceScore()
            };
            
            // Multiple updates without changing game state
            for (let i = 0; i < 100; i++) {
                difficultySystem.update(16.67);
            }
            
            // State should remain consistent
            expect(difficultySystem.getDifficultyLevel()).toBe(initialState.difficulty);
        });
        
        test('should handle rapid state changes gracefully', () => {
            // Rapidly change game state
            for (let i = 0; i < 50; i++) {
                mockGameState.combat.zombiesKilled = i;
                mockGameState.player.health = 100 - i;
                difficultySystem.update(16.67);
            }
            
            // System should still be functional
            expect(difficultySystem.getDifficultyLevel()).toBeGreaterThan(0);
            expect(difficultySystem.getPerformanceScore()).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('Edge Cases and Error Handling', () => {
    let difficultySystem;
    let mockGameState;
    
    beforeEach(() => {
        mockGameState = createMockGameState();
        difficultySystem = new DynamicDifficultySystem(mockGameState);
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    test('should handle missing game state gracefully', () => {
        const systemWithoutState = new DynamicDifficultySystem(null);
        
        expect(() => {
            systemWithoutState.update(16.67);
        }).not.toThrow();
    });
    
    test('should handle invalid difficulty values', () => {
        difficultySystem.setDifficultyOverride(-1);
        expect(difficultySystem.getDifficultyLevel()).toBe(0.5);
        
        difficultySystem.setDifficultyOverride(10);
        expect(difficultySystem.getDifficultyLevel()).toBe(3.0);
    });
    
    test('should handle extreme performance values', () => {
        // Mock extreme performance
        jest.spyOn(difficultySystem.performanceTracker, 'getPerformanceScore')
            .mockReturnValue(10); // Invalid high value
        
        expect(() => {
            difficultySystem.evaluateAndAdjustDifficulty();
        }).not.toThrow();
        
        expect(difficultySystem.getDifficultyLevel()).toBeLessThanOrEqual(3.0);
    });
    
    test('should handle corrupted game state', () => {
        mockGameState.combat = null;
        mockGameState.vehicle = undefined;
        mockGameState.player = {};
        
        expect(() => {
            difficultySystem.update(16.67);
        }).not.toThrow();
    });
    
    test('should handle zero or negative delta time', () => {
        expect(() => {
            difficultySystem.update(0);
            difficultySystem.update(-16.67);
        }).not.toThrow();
    });
});