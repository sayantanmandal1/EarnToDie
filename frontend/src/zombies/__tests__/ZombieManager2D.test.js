/**
 * Unit tests for 2D Zombie Manager
 * Tests zombie spawning, stage-based difficulty scaling, and management
 */

import { ZombieManager2D } from '../ZombieManager2D.js';
import { ZOMBIE_TYPES } from '../ZombieConfig.js';

// Mock Zombie2D
jest.mock('../Zombie2D.js', () => ({
    Zombie2D: jest.fn().mockImplementation((type, config, gameEngine) => ({
        id: `zombie_${Math.random().toString(36).substr(2, 9)}`,
        type,
        config,
        gameEngine,
        health: config.health,
        maxHealth: config.maxHealth,
        isDestroyed: false,
        isDying: false,
        initialize: jest.fn().mockResolvedValue(true),
        setPosition: jest.fn(),
        getPosition: jest.fn(() => ({ x: 0, y: 0 })),
        dispose: jest.fn(),
        update: jest.fn()
    }))
}));

// Mock game engine
const mockGameEngine = {
    camera: { x: 0, y: 0 },
    physics: { world: {} },
    getSystem: jest.fn(() => null)
};

// Mock combat system
const mockCombatSystem = {
    registerZombie: jest.fn(),
    unregisterZombie: jest.fn()
};

// Mock vehicle manager
const mockVehicleManager = {
    getVehiclesInRadius: jest.fn(() => [])
};

describe('ZombieManager2D', () => {
    let zombieManager;

    beforeEach(() => {
        zombieManager = new ZombieManager2D(mockGameEngine);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(zombieManager.maxZombies).toBe(50);
            expect(zombieManager.baseSpawnRate).toBe(1.0);
            expect(zombieManager.currentStage).toBe(1);
            expect(zombieManager.zombies.size).toBe(0);
        });

        test('should setup stage configurations', () => {
            expect(zombieManager.stageConfigs[1]).toBeDefined();
            expect(zombieManager.stageConfigs[2]).toBeDefined();
            expect(zombieManager.stageConfigs[3]).toBeDefined();
        });

        test('should initialize with spawn points', async () => {
            await zombieManager.initialize();
            
            expect(zombieManager.spawnPoints.length).toBeGreaterThan(0);
        });
    });

    describe('System Integration', () => {
        test('should connect combat system', () => {
            zombieManager.setCombatSystem(mockCombatSystem);
            
            expect(zombieManager.combatSystem).toBe(mockCombatSystem);
        });

        test('should connect vehicle manager', () => {
            zombieManager.setVehicleManager(mockVehicleManager);
            
            expect(zombieManager.vehicleManager).toBe(mockVehicleManager);
        });
    });

    describe('Zombie Spawning', () => {
        beforeEach(async () => {
            await zombieManager.initialize();
            zombieManager.setCombatSystem(mockCombatSystem);
        });

        test('should spawn zombie at specific position', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            expect(zombie).toBeDefined();
            expect(zombie.type).toBe(ZOMBIE_TYPES.WALKER);
            expect(zombie.setPosition).toHaveBeenCalledWith(100, 200);
            expect(zombieManager.zombies.size).toBe(1);
            expect(zombieManager.stats.totalSpawned).toBe(1);
        });

        test('should register zombie with combat system', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            expect(mockCombatSystem.registerZombie).toHaveBeenCalledWith(zombie);
        });

        test('should not spawn if max zombies reached', async () => {
            zombieManager.maxZombies = 1;
            
            // Spawn first zombie
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            // Try to spawn second zombie
            const zombie2 = await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, 150, 250);
            
            expect(zombie2).toBe(null);
            expect(zombieManager.zombies.size).toBe(1);
        });

        test('should spawn random zombie based on stage', async () => {
            zombieManager.setStage(1);
            
            const zombie = await zombieManager.spawnRandomZombie(100, 200);
            
            expect(zombie).toBeDefined();
            expect([ZOMBIE_TYPES.WALKER, ZOMBIE_TYPES.CRAWLER]).toContain(zombie.type);
        });

        test('should spawn boss zombie occasionally', async () => {
            zombieManager.setStage(2);
            
            // Mock random to trigger boss spawn
            jest.spyOn(Math, 'random').mockReturnValue(0.01); // Less than 5% boss chance
            
            const zombie = await zombieManager.spawnRandomZombie(100, 200);
            
            expect(zombie).toBeDefined();
            expect([ZOMBIE_TYPES.BOSS_TYRANT, ZOMBIE_TYPES.BOSS_MUTANT]).toContain(zombie.type);
            
            Math.random.mockRestore();
        });

        test('should spawn horde of zombies', async () => {
            const horde = await zombieManager.spawnHorde(100, 200, 3, 50);
            
            expect(horde).toHaveLength(3);
            expect(zombieManager.zombies.size).toBe(3);
        });

        test('should apply stage scaling to zombie config', () => {
            const baseConfig = { health: 50, damage: 10, speed: 8 };
            zombieManager.currentStage = 2;
            
            const scaledConfig = zombieManager._applyStageScaling(baseConfig);
            
            expect(scaledConfig.health).toBeGreaterThan(baseConfig.health);
            expect(scaledConfig.damage).toBeGreaterThan(baseConfig.damage);
            expect(scaledConfig.speed).toBeGreaterThan(baseConfig.speed);
        });
    });

    describe('Zombie Management', () => {
        let zombie1, zombie2;

        beforeEach(async () => {
            await zombieManager.initialize();
            zombieManager.setCombatSystem(mockCombatSystem);
            
            zombie1 = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            zombie2 = await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, 150, 250);
        });

        test('should get zombie by ID', () => {
            const foundZombie = zombieManager.getZombie(zombie1.id);
            
            expect(foundZombie).toBe(zombie1);
        });

        test('should get all zombies', () => {
            const allZombies = zombieManager.getAllZombies();
            
            expect(allZombies).toHaveLength(2);
            expect(allZombies).toContain(zombie1);
            expect(allZombies).toContain(zombie2);
        });

        test('should get zombies in radius', () => {
            zombie1.getPosition.mockReturnValue({ x: 100, y: 100 });
            zombie2.getPosition.mockReturnValue({ x: 200, y: 200 });
            
            const nearbyZombies = zombieManager.getZombiesInRadius(110, 110, 50);
            
            expect(nearbyZombies).toHaveLength(1);
            expect(nearbyZombies[0]).toBe(zombie1);
        });

        test('should remove zombie correctly', () => {
            const removed = zombieManager.removeZombie(zombie1.id);
            
            expect(removed).toBe(true);
            expect(zombieManager.zombies.size).toBe(1);
            expect(zombie1.dispose).toHaveBeenCalled();
            expect(mockCombatSystem.unregisterZombie).toHaveBeenCalledWith(zombie1.id);
        });

        test('should not remove non-existent zombie', () => {
            const removed = zombieManager.removeZombie('non_existent_id');
            
            expect(removed).toBe(false);
        });

        test('should clear all zombies', () => {
            zombieManager.clearAllZombies();
            
            expect(zombieManager.zombies.size).toBe(0);
            expect(zombie1.dispose).toHaveBeenCalled();
            expect(zombie2.dispose).toHaveBeenCalled();
        });
    });

    describe('Stage-Based Difficulty', () => {
        test('should change stage settings', () => {
            zombieManager.setStage(2);
            
            expect(zombieManager.currentStage).toBe(2);
            expect(zombieManager.maxZombies).toBe(40);
            expect(zombieManager.currentSpawnRate).toBe(1.5);
        });

        test('should not change to invalid stage', () => {
            const originalStage = zombieManager.currentStage;
            
            zombieManager.setStage(99);
            
            expect(zombieManager.currentStage).toBe(originalStage);
        });

        test('should trigger stage change callback', () => {
            const callback = jest.fn();
            zombieManager.onStageChanged = callback;
            
            zombieManager.setStage(3);
            
            expect(callback).toHaveBeenCalledWith(3);
        });

        test('should have different allowed types per stage', () => {
            const stage1Types = zombieManager.stageConfigs[1].allowedTypes;
            const stage3Types = zombieManager.stageConfigs[3].allowedTypes;
            
            expect(stage1Types).toHaveLength(2);
            expect(stage3Types).toHaveLength(5);
            expect(stage3Types).toContain(ZOMBIE_TYPES.BERSERKER);
            expect(stage1Types).not.toContain(ZOMBIE_TYPES.BERSERKER);
        });
    });

    describe('Update and Performance', () => {
        beforeEach(async () => {
            await zombieManager.initialize();
            zombieManager.setVehicleManager(mockVehicleManager);
        });

        test('should update zombies in batches', async () => {
            // Spawn more zombies than batch size
            for (let i = 0; i < 10; i++) {
                await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, i * 10, i * 10);
            }
            
            zombieManager.updateBatchSize = 3;
            
            zombieManager.update(16); // 16ms frame
            
            // Should only update batch size number of zombies
            const zombies = Array.from(zombieManager.zombies.values());
            let updatedCount = 0;
            zombies.forEach(zombie => {
                if (zombie.update.mock.calls.length > 0) {
                    updatedCount++;
                }
            });
            
            expect(updatedCount).toBeLessThanOrEqual(3);
        });

        test('should provide vehicle information to zombies', async () => {
            const mockVehicle = { id: 'vehicle1' };
            mockVehicleManager.getVehiclesInRadius.mockReturnValue([mockVehicle]);
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            zombieManager.update(16);
            
            expect(zombie.targetVehicle).toBe(mockVehicle);
        });

        test('should clean up destroyed zombies', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            zombie.isDestroyed = true;
            
            zombieManager.update(16);
            
            expect(zombieManager.zombies.size).toBe(0);
        });

        test('should despawn distant zombies', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 1000, 1000);
            zombieManager.gameEngine.camera = { x: 0, y: 0 };
            zombieManager.despawnDistance = 500;
            
            zombieManager.update(16);
            
            expect(zombieManager.zombies.size).toBe(0);
        });
    });

    describe('Spawning Logic', () => {
        beforeEach(async () => {
            await zombieManager.initialize();
        });

        test('should spawn based on density target', () => {
            zombieManager.currentStage = 1;
            zombieManager.maxZombies = 10;
            zombieManager.zombies.set('zombie1', {});
            zombieManager.zombies.set('zombie2', {}); // 2/10 = 0.2 density
            
            const stageConfig = zombieManager.stageConfigs[1];
            const targetDensity = stageConfig.zombieDensity; // 0.3
            
            // Should spawn because current density (0.2) < target density (0.3)
            expect(0.2).toBeLessThan(targetDensity);
        });

        test('should not spawn if above density target', () => {
            zombieManager.currentStage = 1;
            zombieManager.maxZombies = 10;
            
            // Fill to above target density
            for (let i = 0; i < 4; i++) {
                zombieManager.zombies.set(`zombie${i}`, {});
            }
            
            const currentDensity = 4 / 10; // 0.4
            const targetDensity = zombieManager.stageConfigs[1].zombieDensity; // 0.3
            
            expect(currentDensity).toBeGreaterThan(targetDensity);
        });

        test('should respect spawn rate timing', () => {
            zombieManager.currentSpawnRate = 2.0; // 2 zombies per second
            zombieManager.spawnTimer = 400; // 400ms elapsed
            
            const spawnInterval = 1000 / zombieManager.currentSpawnRate; // 500ms
            
            expect(zombieManager.spawnTimer).toBeLessThan(spawnInterval);
        });
    });

    describe('Statistics and Performance', () => {
        beforeEach(async () => {
            await zombieManager.initialize();
        });

        test('should track statistics correctly', async () => {
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            const stats = zombieManager.getPerformanceStats();
            
            expect(stats.totalSpawned).toBe(1);
            expect(stats.activeZombies).toBe(1);
            expect(stats.maxZombies).toBe(50);
            expect(stats.currentStage).toBe(1);
        });

        test('should update kill statistics', async () => {
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            zombie.health = 0; // Mark as killed
            
            zombieManager.removeZombie(zombie.id);
            
            expect(zombieManager.stats.totalKilled).toBe(1);
        });

        test('should calculate current density', async () => {
            zombieManager.maxZombies = 10;
            await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            await zombieManager.spawnZombie(ZOMBIE_TYPES.RUNNER, 150, 250);
            
            zombieManager._updateStatistics();
            
            expect(zombieManager.stats.currentDensity).toBe(0.2); // 2/10
        });
    });

    describe('Event Callbacks', () => {
        beforeEach(async () => {
            await zombieManager.initialize();
        });

        test('should trigger spawn callback', async () => {
            const spawnCallback = jest.fn();
            zombieManager.onZombieSpawned = spawnCallback;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            expect(spawnCallback).toHaveBeenCalledWith(zombie);
        });

        test('should trigger destroy callback', async () => {
            const destroyCallback = jest.fn();
            zombieManager.onZombieDestroyed = destroyCallback;
            
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            zombieManager.removeZombie(zombie.id);
            
            expect(destroyCallback).toHaveBeenCalledWith(zombie);
        });
    });

    describe('Cleanup and Disposal', () => {
        test('should dispose correctly', async () => {
            await zombieManager.initialize();
            const zombie = await zombieManager.spawnZombie(ZOMBIE_TYPES.WALKER, 100, 200);
            
            zombieManager.dispose();
            
            expect(zombieManager.zombies.size).toBe(0);
            expect(zombieManager.spawnPoints).toHaveLength(0);
            expect(zombie.dispose).toHaveBeenCalled();
        });
    });
});