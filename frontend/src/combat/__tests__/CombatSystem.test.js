import { CombatSystem } from '../CombatSystem';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Mock dependencies
jest.mock('../CollisionDetector', () => ({
    CollisionDetector: jest.fn().mockImplementation(() => ({
        COLLISION_GROUPS: {
            VEHICLE: 1,
            ZOMBIE: 2,
            TERRAIN: 4,
            PROJECTILE: 8
        },
        registerCollisionCallback: jest.fn(),
        setupCollisionGroups: jest.fn(),
        dispose: jest.fn()
    }))
}));

jest.mock('../DamageCalculator', () => ({
    DamageCalculator: jest.fn().mockImplementation(() => ({
        DAMAGE_TYPES: {
            IMPACT: 'impact',
            EXPLOSION: 'explosion'
        },
        calculateVehicleToZombieDamage: jest.fn(),
        calculateZombieToVehicleDamage: jest.fn(),
        calculateExplosionDamage: jest.fn(),
        calculateDamageOverTime: jest.fn(),
        calculateKnockback: jest.fn(),
        getDamageColor: jest.fn()
    }))
}));

jest.mock('../ParticleEffects', () => ({
    ParticleEffects: jest.fn().mockImplementation(() => ({
        update: jest.fn(),
        createBloodEffect: jest.fn(),
        createSparkEffect: jest.fn(),
        createCriticalHitEffect: jest.fn(),
        createDamageNumber: jest.fn(),
        createImpactEffect: jest.fn(),
        createExplosionEffect: jest.fn(),
        createDamageOverTimeEffect: jest.fn(),
        dispose: jest.fn()
    }))
}));

const mockGameEngine = {
    scene: new THREE.Scene(),
    physics: {
        addEventListener: jest.fn(),
        bodies: []
    },
    scoreManager: {
        addPoints: jest.fn()
    }
};

describe('CombatSystem', () => {
    let combatSystem;

    beforeEach(() => {
        combatSystem = new CombatSystem(mockGameEngine);
    });

    afterEach(() => {
        combatSystem.dispose();
    });

    describe('initialization', () => {
        test('should initialize with all components', () => {
            expect(combatSystem.collisionDetector).toBeDefined();
            expect(combatSystem.damageCalculator).toBeDefined();
            expect(combatSystem.particleEffects).toBeDefined();
            expect(combatSystem.activeVehicles).toBeInstanceOf(Map);
            expect(combatSystem.activeZombies).toBeInstanceOf(Map);
        });

        test('should initialize combat stats', () => {
            expect(combatSystem.combatStats).toEqual({
                totalCollisions: 0,
                totalDamageDealt: 0,
                zombiesKilled: 0,
                vehiclesDestroyed: 0
            });
        });
    });

    describe('vehicle registration', () => {
        test('should register vehicle for combat', () => {
            const mockVehicle = {
                id: 'vehicle1',
                body: {
                    userData: {}
                }
            };

            combatSystem.registerVehicle(mockVehicle);

            expect(combatSystem.activeVehicles.has('vehicle1')).toBe(true);
            expect(combatSystem.activeVehicles.get('vehicle1')).toBe(mockVehicle);
            expect(mockVehicle.body.userData.type).toBe('vehicle');
            expect(mockVehicle.body.userData.gameObject).toBe(mockVehicle);
        });

        test('should unregister vehicle from combat', () => {
            const mockVehicle = {
                id: 'vehicle1',
                body: { userData: {} }
            };

            combatSystem.registerVehicle(mockVehicle);
            combatSystem.unregisterVehicle('vehicle1');

            expect(combatSystem.activeVehicles.has('vehicle1')).toBe(false);
        });
    });

    describe('zombie registration', () => {
        test('should register zombie for combat', () => {
            const mockZombie = {
                id: 'zombie1',
                body: {
                    userData: {}
                }
            };

            combatSystem.registerZombie(mockZombie);

            expect(combatSystem.activeZombies.has('zombie1')).toBe(true);
            expect(combatSystem.activeZombies.get('zombie1')).toBe(mockZombie);
            expect(mockZombie.body.userData.type).toBe('zombie');
            expect(mockZombie.body.userData.gameObject).toBe(mockZombie);
        });

        test('should unregister zombie from combat', () => {
            const mockZombie = {
                id: 'zombie1',
                body: { userData: {} }
            };

            combatSystem.registerZombie(mockZombie);
            combatSystem.unregisterZombie('zombie1');

            expect(combatSystem.activeZombies.has('zombie1')).toBe(false);
        });
    });

    describe('vehicle-zombie collision handling', () => {
        test('should handle vehicle-zombie collision', () => {
            const mockVehicle = {
                id: 'vehicle1',
                type: 'sedan',
                stats: { damage: 50 },
                takeDamage: jest.fn().mockReturnValue(10),
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(0, 0, 0))
            };

            const mockZombie = {
                id: 'zombie1',
                type: 'walker',
                config: { damage: 20 },
                health: 100,
                isDestroyed: false,
                takeDamage: jest.fn().mockReturnValue(25),
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(1, 0, 0))
            };

            // Mock damage calculator results
            combatSystem.damageCalculator.calculateVehicleToZombieDamage = jest.fn()
                .mockReturnValue({
                    damage: 25,
                    damageType: 'impact',
                    isCritical: false
                });

            combatSystem.damageCalculator.calculateZombieToVehicleDamage = jest.fn()
                .mockReturnValue({
                    damage: 10,
                    damageType: 'impact'
                });

            const collisionData = {
                bodyA: { userData: { type: 'vehicle', gameObject: mockVehicle } },
                bodyB: { userData: { type: 'zombie', gameObject: mockZombie } },
                impact: {
                    speed: 10,
                    force: 200,
                    normal: new THREE.Vector3(1, 0, 0)
                }
            };

            combatSystem._handleVehicleZombieCollision(collisionData);

            expect(mockZombie.takeDamage).toHaveBeenCalledWith(25, 'impact', mockVehicle);
            expect(mockVehicle.takeDamage).toHaveBeenCalledWith(10);
            expect(combatSystem.combatStats.totalCollisions).toBe(1);
        });

        test('should not process collision with destroyed zombie', () => {
            const mockVehicle = {
                id: 'vehicle1',
                takeDamage: jest.fn()
            };

            const mockZombie = {
                id: 'zombie1',
                isDestroyed: true
            };

            const collisionData = {
                bodyA: { userData: { type: 'vehicle', gameObject: mockVehicle } },
                bodyB: { userData: { type: 'zombie', gameObject: mockZombie } },
                impact: { speed: 10, force: 200 }
            };

            combatSystem._handleVehicleZombieCollision(collisionData);

            expect(mockVehicle.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('vehicle-terrain collision handling', () => {
        test('should handle high-speed terrain collision', () => {
            const mockVehicle = {
                id: 'vehicle1',
                isDestroyed: false,
                takeDamage: jest.fn().mockReturnValue(15),
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(0, 0, 0))
            };

            const collisionData = {
                bodyA: { userData: { type: 'vehicle', gameObject: mockVehicle } },
                bodyB: { userData: { type: 'terrain' } },
                impact: {
                    speed: 15, // 54 km/h - above damage threshold
                    normal: new THREE.Vector3(0, 1, 0)
                }
            };

            combatSystem._handleVehicleTerrainCollision(collisionData);

            expect(mockVehicle.takeDamage).toHaveBeenCalled();
        });

        test('should not damage vehicle for low-speed terrain collision', () => {
            const mockVehicle = {
                id: 'vehicle1',
                isDestroyed: false,
                takeDamage: jest.fn()
            };

            const collisionData = {
                bodyA: { userData: { type: 'vehicle', gameObject: mockVehicle } },
                bodyB: { userData: { type: 'terrain' } },
                impact: {
                    speed: 3, // 10.8 km/h - below damage threshold
                    normal: new THREE.Vector3(0, 1, 0)
                }
            };

            combatSystem._handleVehicleTerrainCollision(collisionData);

            expect(mockVehicle.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('explosion creation', () => {
        test('should create explosion and damage targets', () => {
            const mockVehicle = {
                id: 'vehicle1',
                isDestroyed: false,
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(2, 0, 0)),
                takeDamage: jest.fn().mockReturnValue(30),
                body: { applyImpulse: jest.fn() }
            };

            const mockZombie = {
                id: 'zombie1',
                isDestroyed: false,
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(3, 0, 0)),
                takeDamage: jest.fn().mockReturnValue(40),
                body: { applyImpulse: jest.fn() }
            };

            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);

            // Mock damage calculator
            combatSystem.damageCalculator.calculateExplosionDamage = jest.fn()
                .mockReturnValue([
                    { target: mockVehicle, damage: 30, distance: 2 },
                    { target: mockZombie, damage: 40, distance: 3 }
                ]);

            combatSystem.damageCalculator.calculateKnockback = jest.fn()
                .mockReturnValue(new THREE.Vector3(5, 0, 0));

            const center = new THREE.Vector3(0, 0, 0);
            const radius = 5;
            const damage = 100;

            const results = combatSystem.createExplosion(center, radius, damage);

            expect(results).toHaveLength(2);
            expect(mockVehicle.takeDamage).toHaveBeenCalled();
            expect(mockZombie.takeDamage).toHaveBeenCalled();
            expect(mockVehicle.body.applyImpulse).toHaveBeenCalled();
            expect(mockZombie.body.applyImpulse).toHaveBeenCalled();
        });
    });

    describe('damage over time', () => {
        test('should apply damage over time effect', () => {
            const mockTarget = {
                type: 'walker',
                takeDamage: jest.fn().mockReturnValue(5),
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(0, 0, 0)),
                isDestroyed: false
            };

            // Mock damage calculator
            combatSystem.damageCalculator.calculateDamageOverTime = jest.fn()
                .mockReturnValue({
                    damagePerTick: 5,
                    totalTicks: 3,
                    tickRate: 1.0
                });

            const dotEffect = combatSystem.applyDamageOverTime(
                mockTarget, 'fire', 15, 3.0
            );

            expect(dotEffect).toBeDefined();
            expect(combatSystem.combatEvents).toHaveLength(1);
            expect(combatSystem.combatEvents[0].type).toBe('damage_over_time');
        });

        test('should process damage over time ticks', () => {
            const mockTarget = {
                isDestroyed: false,
                takeDamage: jest.fn().mockReturnValue(5),
                getPosition: jest.fn().mockReturnValue(new THREE.Vector3(0, 0, 0))
            };

            const dotEffect = {
                target: mockTarget,
                damageType: 'fire',
                damagePerTick: 5,
                ticksRemaining: 2,
                tickRate: 0.1, // Fast ticks for testing
                lastTick: Date.now() - 200, // Ensure tick is ready
                source: null
            };

            const processed = combatSystem._processDamageOverTime(dotEffect, Date.now());

            expect(mockTarget.takeDamage).toHaveBeenCalledWith(5, 'fire', null);
            expect(dotEffect.ticksRemaining).toBe(1);
            expect(processed).toBe(false); // Still has ticks remaining
        });
    });

    describe('combat statistics', () => {
        test('should update combat stats on collision', () => {
            combatSystem._updateCombatStats(10, 25, true);

            expect(combatSystem.combatStats.totalCollisions).toBe(1);
            expect(combatSystem.combatStats.totalDamageDealt).toBe(25);
            expect(combatSystem.combatStats.zombiesKilled).toBe(1);
        });

        test('should get combat stats', () => {
            combatSystem.combatStats.totalCollisions = 5;
            combatSystem.combatStats.zombiesKilled = 3;

            const stats = combatSystem.getCombatStats();

            expect(stats.totalCollisions).toBe(5);
            expect(stats.zombiesKilled).toBe(3);
            expect(stats).not.toBe(combatSystem.combatStats); // Should be a copy
        });

        test('should reset combat stats', () => {
            combatSystem.combatStats.totalCollisions = 10;
            combatSystem.combatStats.zombiesKilled = 5;

            combatSystem.resetCombatStats();

            expect(combatSystem.combatStats.totalCollisions).toBe(0);
            expect(combatSystem.combatStats.zombiesKilled).toBe(0);
        });
    });

    describe('cleanup', () => {
        test('should clean up destroyed vehicles', () => {
            const destroyedVehicle = {
                id: 'vehicle1',
                isDestroyed: true,
                body: { userData: {} }
            };

            const activeVehicle = {
                id: 'vehicle2',
                isDestroyed: false,
                body: { userData: {} }
            };

            combatSystem.registerVehicle(destroyedVehicle);
            combatSystem.registerVehicle(activeVehicle);

            combatSystem._cleanupDestroyedObjects();

            expect(combatSystem.activeVehicles.has('vehicle1')).toBe(false);
            expect(combatSystem.activeVehicles.has('vehicle2')).toBe(true);
            expect(combatSystem.combatStats.vehiclesDestroyed).toBe(1);
        });

        test('should clean up destroyed zombies', () => {
            const destroyedZombie = {
                id: 'zombie1',
                isDestroyed: true,
                body: { userData: {} }
            };

            const activeZombie = {
                id: 'zombie2',
                isDestroyed: false,
                body: { userData: {} }
            };

            combatSystem.registerZombie(destroyedZombie);
            combatSystem.registerZombie(activeZombie);

            combatSystem._cleanupDestroyedObjects();

            expect(combatSystem.activeZombies.has('zombie1')).toBe(false);
            expect(combatSystem.activeZombies.has('zombie2')).toBe(true);
        });
    });

    describe('update', () => {
        test('should update all systems', () => {
            const deltaTime = 0.016; // 60 FPS

            // Mock update methods
            combatSystem.particleEffects.update = jest.fn();
            combatSystem._processCombatEvents = jest.fn();
            combatSystem._cleanupDestroyedObjects = jest.fn();

            combatSystem.update(deltaTime);

            expect(combatSystem.particleEffects.update).toHaveBeenCalledWith(deltaTime);
            expect(combatSystem._processCombatEvents).toHaveBeenCalledWith(deltaTime);
            expect(combatSystem._cleanupDestroyedObjects).toHaveBeenCalled();
        });
    });

    describe('disposal', () => {
        test('should dispose all components', () => {
            const mockVehicle = { id: 'vehicle1', body: { userData: {} } };
            const mockZombie = { id: 'zombie1', body: { userData: {} } };

            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
            combatSystem.combatEvents.push({ type: 'test' });

            // Mock dispose methods
            combatSystem.collisionDetector.dispose = jest.fn();
            combatSystem.particleEffects.dispose = jest.fn();

            combatSystem.dispose();

            expect(combatSystem.collisionDetector.dispose).toHaveBeenCalled();
            expect(combatSystem.particleEffects.dispose).toHaveBeenCalled();
            expect(combatSystem.activeVehicles.size).toBe(0);
            expect(combatSystem.activeZombies.size).toBe(0);
            expect(combatSystem.combatEvents).toHaveLength(0);
        });
    });
});