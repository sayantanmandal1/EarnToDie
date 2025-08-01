import { ZombieManager } from '../ZombieManager';
import { ZOMBIE_TYPES } from '../ZombieConfig';
import * as THREE from 'three';

// Mock the Zombie class
jest.mock('../Zombie', () => ({
    Zombie: jest.fn().mockImplementation((type, config, gameEngine) => ({
        id: `zombie_${Math.random().toString(36).substr(2, 9)}`,
        type,
        config,
        gameEngine,
        health: config.health,
        isDestroyed: false,
        initialize: jest.fn().mockResolvedValue(true),
        setPosition: jest.fn(),
        getPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
        update: jest.fn(),
        dispose: jest.fn(),
        ai: {
            setTarget: jest.fn()
        }
    }))
}));

// Mock dependencies
const mockGameEngine = {
    addObject: jest.fn(),
    removeObject: jest.fn(),
    scoreManager: {
        addPoints: jest.fn()
    }
};

describe('ZombieManager', () => {
    let zombieManager;

    beforeEach(() => {
        zombieManager = new ZombieManager(mockGameEngine);
        zombieManager.initialize();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(zombieManager.maxZombies).toBe(100);
            expect(zombieManager.spawnRate).toBe(2.0);
            expect(zombieManager.difficultyLevel).toBe(1);
            expect(zombieManager.zombies.size).toBe(0);
        });

        test('should setup default spawn points', () => {
            expect(zombieManager.spawnPoints.length).toBeGreaterThan(0);
            expect(zombieManager.spawnPoints[0]).toHaveProperty('position');
            expect(zombieManager.spawnPoints[0]).toHaveProperty('radius');
            expect(zombieManager.spawnPoints[0]).toHaveProperty('weight');
        });
    });

    describe('Zombie Spawning', () => {
        test('should spawn a zombie successfully', async () => {
            const position = new THREE.Vector3(10, 0, 10);
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, position);

            expect(zombie).toBeDefined();
            expect(zombie.type).toBe(ZOMBIE_TYPES.WALKER);
            expect(zombie.initialize).toHaveBeenCalled();
            expect(zombie.setPosition).toHaveBeenCalledWith(position);
            expect(zombieManager.zombies.size).toBe(1);
            expect(zombieManager.stats.totalSpawned).toBe(1);
        });

        test('should not spawn zombie when at maximum capacity', async () => {
            zombieManager.maxZombies = 0;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            
            expect(zombie).toBeNull();
            expect(zombieManager.zombies.size).toBe(0);
        });

        test('should spawn random zombie', async () => {
            const position = new THREE.Vector3(5, 0, 5);
            const zombie = await zombieManager.spawnRandomZombie(position);

            expect(zombie).toBeDefined();
            expect(Object.values(ZOMBIE_TYPES)).toContain(zombie.type);
            expect(zombieManager.zombies.size).toBe(1);
        });

        test('should apply difficulty scaling to spawned zombies', async () => {
            zombieManager.difficultyLevel = 3;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            
            // Health should be scaled up based on difficulty
            expect(zombie.config.health).toBeGreaterThan(50); // Base walker health
        });

        test('should trigger spawn callback', async () => {
            const spawnCallback = jest.fn();
            zombieManager.onZombieSpawned = spawnCallback;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            
            expect(spawnCallback).toHaveBeenCalledWith(zombie);
        });
    });

    describe('Horde Spawning', () => {
        test('should spawn a horde of zombies', async () => {
            const centerPosition = new THREE.Vector3(0, 0, 0);
            const count = 5;
            
            const horde = await zombieManager.spawnHorde(centerPosition, count, 10);

            expect(horde).toBeDefined();
            expect(horde.zombies.length).toBe(count);
            expect(horde.centerPosition).toEqual(centerPosition);
            expect(horde.isActive).toBe(true);
            expect(zombieManager.hordes.length).toBe(1);
            expect(zombieManager.stats.hordesSpawned).toBe(1);
        });

        test('should spawn zombies within specified radius', async () => {
            const centerPosition = new THREE.Vector3(0, 0, 0);
            const radius = 5;
            
            const horde = await zombieManager.spawnHorde(centerPosition, 3, radius);
            
            horde.zombies.forEach(zombie => {
                const spawnPosition = zombie.setPosition.mock.calls[0][0];
                const distance = centerPosition.distanceTo(spawnPosition);
                expect(distance).toBeLessThanOrEqual(radius);
            });
        });

        test('should trigger horde spawn callback', async () => {
            const hordeCallback = jest.fn();
            zombieManager.onHordeSpawned = hordeCallback;
            
            const horde = await zombieManager.spawnHorde(new THREE.Vector3(), 3);
            
            expect(hordeCallback).toHaveBeenCalledWith(horde);
        });
    });

    describe('Boss Spawning', () => {
        test('should spawn a boss zombie with minions', async () => {
            const position = new THREE.Vector3(0, 0, 0);
            
            const boss = await zombieManager.spawnBoss(position);

            expect(boss).toBeDefined();
            expect(boss.config.isBoss).toBe(true);
            
            // Should have spawned minions as well
            expect(zombieManager.zombies.size).toBeGreaterThan(1);
            expect(zombieManager.hordes.length).toBe(1); // Minion horde
        });

        test('should spawn specific boss type when requested', async () => {
            const boss = await zombieManager.spawnBoss(new THREE.Vector3(), ZOMBIE_TYPES.BOSS_TYRANT);
            
            expect(boss.type).toBe(ZOMBIE_TYPES.BOSS_TYRANT);
        });
    });

    describe('Zombie Management', () => {
        test('should remove zombie successfully', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            const zombieId = zombie.id;
            
            const removed = zombieManager.removeZombie(zombieId);
            
            expect(removed).toBe(true);
            expect(zombieManager.zombies.has(zombieId)).toBe(false);
            expect(zombie.dispose).toHaveBeenCalled();
        });

        test('should not remove non-existent zombie', () => {
            const removed = zombieManager.removeZombie('non-existent-id');
            
            expect(removed).toBe(false);
        });

        test('should trigger destroy callback when zombie is removed', async () => {
            const destroyCallback = jest.fn();
            zombieManager.onZombieDestroyed = destroyCallback;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            zombieManager.removeZombie(zombie.id);
            
            expect(destroyCallback).toHaveBeenCalledWith(zombie);
        });

        test('should update kill statistics when zombie dies', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            zombie.health = 0; // Simulate death
            
            zombieManager.removeZombie(zombie.id);
            
            expect(zombieManager.stats.totalKilled).toBe(1);
        });
    });

    describe('Zombie Queries', () => {
        test('should get zombie by ID', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            
            const retrieved = zombieManager.getZombie(zombie.id);
            
            expect(retrieved).toBe(zombie);
        });

        test('should get all zombies', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, new THREE.Vector3());
            
            const allZombies = zombieManager.getAllZombies();
            
            expect(allZombies.length).toBe(2);
        });

        test('should get zombies within radius', async () => {
            const zombie1 = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            const zombie2 = await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, new THREE.Vector3());
            
            // Mock positions
            zombie1.getPosition.mockReturnValue(new THREE.Vector3(5, 0, 0));
            zombie2.getPosition.mockReturnValue(new THREE.Vector3(50, 0, 0));
            
            const nearbyZombies = zombieManager.getZombiesInRadius(new THREE.Vector3(0, 0, 0), 10);
            
            expect(nearbyZombies.length).toBe(1);
            expect(nearbyZombies[0]).toBe(zombie1);
        });

        test('should get zombies by type', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, new THREE.Vector3());
            
            const walkers = zombieManager.getZombiesByType(ZOMBIE_TYPES.WALKER);
            
            expect(walkers.length).toBe(2);
            walkers.forEach(zombie => {
                expect(zombie.type).toBe(ZOMBIE_TYPES.WALKER);
            });
        });
    });

    describe('Spawn Points Management', () => {
        test('should set custom spawn points', () => {
            const spawnPoints = [
                { position: new THREE.Vector3(10, 0, 10), radius: 5, weight: 2 },
                { position: new THREE.Vector3(-10, 0, -10), radius: 3, weight: 1 }
            ];
            
            zombieManager.setSpawnPoints(spawnPoints);
            
            expect(zombieManager.spawnPoints.length).toBe(2);
            expect(zombieManager.spawnPoints[0].weight).toBe(2);
            expect(zombieManager.spawnPoints[1].weight).toBe(1);
        });

        test('should add individual spawn point', () => {
            const initialCount = zombieManager.spawnPoints.length;
            const position = new THREE.Vector3(20, 0, 20);
            
            zombieManager.addSpawnPoint(position, 8, 3);
            
            expect(zombieManager.spawnPoints.length).toBe(initialCount + 1);
            
            const newSpawnPoint = zombieManager.spawnPoints[zombieManager.spawnPoints.length - 1];
            expect(newSpawnPoint.position).toEqual(position);
            expect(newSpawnPoint.radius).toBe(8);
            expect(newSpawnPoint.weight).toBe(3);
        });
    });

    describe('Difficulty Scaling', () => {
        test('should increase difficulty over time', () => {
            const initialDifficulty = zombieManager.difficultyLevel;
            zombieManager.difficultyTimer = zombieManager.difficultyIncreaseInterval + 1;
            
            zombieManager._updateDifficulty(1.0);
            
            expect(zombieManager.difficultyLevel).toBe(initialDifficulty + 1);
            expect(zombieManager.difficultyTimer).toBe(0);
        });

        test('should trigger difficulty change callback', () => {
            const difficultyCallback = jest.fn();
            zombieManager.onDifficultyChanged = difficultyCallback;
            
            zombieManager.setDifficultyLevel(5);
            
            expect(difficultyCallback).toHaveBeenCalledWith(5);
        });

        test('should apply difficulty scaling to zombie stats', () => {
            zombieManager.difficultyLevel = 3;
            
            const baseConfig = { health: 50, damage: 15, speed: 8, pointValue: 10 };
            const scaledConfig = zombieManager._applyDifficultyScaling(baseConfig);
            
            expect(scaledConfig.health).toBeGreaterThan(baseConfig.health);
            expect(scaledConfig.damage).toBeGreaterThan(baseConfig.damage);
            expect(scaledConfig.speed).toBeGreaterThan(baseConfig.speed);
            expect(scaledConfig.pointValue).toBeGreaterThan(baseConfig.pointValue);
        });
    });

    describe('Performance Optimization', () => {
        test('should update zombies in batches', async () => {
            // Spawn more zombies than batch size
            for (let i = 0; i < 15; i++) {
                await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            }
            
            zombieManager.updateBatchSize = 5;
            zombieManager._updateZombiesBatched(0.016);
            
            // Should only update batch size number of zombies
            const zombies = Array.from(zombieManager.zombies.values());
            let updatedCount = 0;
            zombies.forEach(zombie => {
                if (zombie.update.mock.calls.length > 0) {
                    updatedCount++;
                }
            });
            
            expect(updatedCount).toBe(5);
        });

        test('should clean up destroyed zombies', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            zombie.isDestroyed = true;
            
            zombieManager._cleanupDestroyedZombies();
            
            expect(zombieManager.zombies.has(zombie.id)).toBe(false);
        });
    });

    describe('Statistics', () => {
        test('should track spawn statistics', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnHorde(new THREE.Vector3(), 3);
            
            const stats = zombieManager.getPerformanceStats();
            
            expect(stats.totalSpawned).toBe(4); // 1 + 3 from horde
            expect(stats.activeZombies).toBe(4);
            expect(stats.hordesSpawned).toBe(1);
            expect(stats.difficultyLevel).toBe(1);
        });

        test('should update active zombie count', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, new THREE.Vector3());
            
            zombieManager._updateStatistics();
            
            expect(zombieManager.stats.activeZombies).toBe(2);
        });
    });

    describe('Horde Management', () => {
        test('should get active hordes', async () => {
            await zombieManager.spawnHorde(new THREE.Vector3(), 3);
            await zombieManager.spawnHorde(new THREE.Vector3(10, 0, 10), 2);
            
            // Deactivate one horde
            zombieManager.hordes[0].isActive = false;
            
            const activeHordes = zombieManager.getActiveHordes();
            
            expect(activeHordes.length).toBe(1);
            expect(activeHordes[0].isActive).toBe(true);
        });

        test('should deactivate horde when all zombies are removed', async () => {
            const horde = await zombieManager.spawnHorde(new THREE.Vector3(), 2);
            
            // Verify horde was created with zombies
            expect(horde.zombies.length).toBe(2);
            expect(horde.isActive).toBe(true);
            
            // Store zombie IDs before removal
            const zombieIds = horde.zombies.map(zombie => zombie.id);
            
            // Remove all zombies from the horde
            zombieIds.forEach(zombieId => {
                zombieManager.removeZombie(zombieId);
            });
            
            expect(horde.isActive).toBe(false);
        });
    });

    describe('Settings Management', () => {
        test('should set maximum zombie count', () => {
            zombieManager.setMaxZombies(50);
            expect(zombieManager.maxZombies).toBe(50);
        });

        test('should set spawn rate', () => {
            zombieManager.setSpawnRate(5.0);
            expect(zombieManager.spawnRate).toBe(5.0);
        });

        test('should set difficulty level', () => {
            zombieManager.setDifficultyLevel(10);
            expect(zombieManager.difficultyLevel).toBe(10);
        });

        test('should not allow difficulty level below 1', () => {
            zombieManager.setDifficultyLevel(0);
            expect(zombieManager.difficultyLevel).toBe(1);
        });
    });

    describe('Cleanup', () => {
        test('should clear all zombies', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            await zombieManager.spawnHorde(new THREE.Vector3(), 3);
            
            zombieManager.clearAllZombies();
            
            expect(zombieManager.zombies.size).toBe(0);
            expect(zombieManager.hordes.length).toBe(0);
        });

        test('should dispose properly', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, new THREE.Vector3());
            
            zombieManager.dispose();
            
            expect(zombieManager.zombies.size).toBe(0);
            expect(zombieManager.spawnPoints.length).toBe(0);
            expect(zombie.dispose).toHaveBeenCalled();
        });
    });
});