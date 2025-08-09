/**
 * Unit tests for 2D Combat System
 * Tests collision detection, damage calculation, and combat mechanics
 */

import { CombatSystem2D } from '../CombatSystem2D.js';

// Mock Matter.js
jest.mock('matter-js', () => ({
    Events: {
        on: jest.fn(),
        off: jest.fn()
    },
    Body: {
        setVelocity: jest.fn(),
        applyForce: jest.fn()
    }
}));

// Mock game engine
const mockGameEngine = {
    physics: {},
    getSystem: jest.fn(() => ({
        createParticleEffect: jest.fn(),
        createDustEffect: jest.fn(),
        createExplosionEffect: jest.fn()
    })),
    emit: jest.fn()
};

describe('CombatSystem2D', () => {
    let combatSystem;
    let mockVehicle;
    let mockZombie;

    beforeEach(() => {
        combatSystem = new CombatSystem2D(mockGameEngine);
        jest.clearAllMocks();

        mockVehicle = {
            id: 'vehicle1',
            body: {
                position: { x: 100, y: 100 },
                velocity: { x: 10, y: 0 },
                bounds: { min: { x: 90, y: 90 }, max: { x: 110, y: 110 } },
                collisionFilter: {},
                userData: { type: 'vehicle', gameObject: null }
            },
            getPosition: () => ({ x: 100, y: 100 }),
            takeDamage: jest.fn(() => 5),
            damageMultiplier: 1.0,
            isDestroyed: false
        };

        mockZombie = {
            id: 'zombie1',
            type: 'walker',
            body: {
                position: { x: 120, y: 100 },
                velocity: { x: -2, y: 0 },
                bounds: { min: { x: 115, y: 95 }, max: { x: 125, y: 105 } },
                collisionFilter: {},
                userData: { type: 'zombie', gameObject: null }
            },
            config: { damage: 15, armor: 0 },
            health: 50,
            getPosition: () => ({ x: 120, y: 100 }),
            takeDamage: jest.fn(() => 25),
            isDestroyed: false,
            isDying: false
        };

        // Set up circular references
        mockVehicle.body.userData.gameObject = mockVehicle;
        mockZombie.body.userData.gameObject = mockZombie;
    });

    describe('Initialization', () => {
        test('should initialize with default settings', async () => {
            const initialized = await combatSystem.initialize();
            
            expect(initialized).toBe(true);
            expect(combatSystem.baseVehicleDamage).toBe(25);
            expect(combatSystem.criticalHitChance).toBe(0.1);
            expect(combatSystem.criticalHitMultiplier).toBe(2.0);
        });

        test('should setup collision event listeners', () => {
            const Matter = require('matter-js');
            
            expect(Matter.Events.on).toHaveBeenCalled();
        });
    });

    describe('Object Registration', () => {
        test('should register vehicle for combat', () => {
            combatSystem.registerVehicle(mockVehicle);
            
            expect(combatSystem.activeVehicles.has(mockVehicle.id)).toBe(true);
            expect(mockVehicle.body.collisionFilter.category).toBe(0x0001);
            expect(mockVehicle.body.userData.type).toBe('vehicle');
        });

        test('should register zombie for combat', () => {
            combatSystem.registerZombie(mockZombie);
            
            expect(combatSystem.activeZombies.has(mockZombie.id)).toBe(true);
            expect(mockZombie.body.collisionFilter.category).toBe(0x0002);
            expect(mockZombie.body.userData.type).toBe('zombie');
        });

        test('should unregister vehicle', () => {
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.unregisterVehicle(mockVehicle.id);
            
            expect(combatSystem.activeVehicles.has(mockVehicle.id)).toBe(false);
        });

        test('should unregister zombie', () => {
            combatSystem.registerZombie(mockZombie);
            combatSystem.unregisterZombie(mockZombie.id);
            
            expect(combatSystem.activeZombies.has(mockZombie.id)).toBe(false);
        });
    });

    describe('Collision Detection', () => {
        test('should identify vehicle-zombie collision', () => {
            const isCollision = combatSystem._isVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body
            );
            
            expect(isCollision).toBe(true);
        });

        test('should not identify non-vehicle-zombie collision', () => {
            const terrainBody = {
                userData: { type: 'terrain' }
            };
            
            const isCollision = combatSystem._isVehicleZombieCollision(
                mockVehicle.body,
                terrainBody
            );
            
            expect(isCollision).toBe(false);
        });

        test('should detect collision between bodies', () => {
            const areColliding = combatSystem._areColliding(
                mockVehicle.body,
                mockZombie.body
            );
            
            // Bodies are 20 units apart, with radius ~10 each, so should be colliding
            expect(areColliding).toBe(true);
        });

        test('should not detect collision when bodies are far apart', () => {
            mockZombie.body.position = { x: 200, y: 200 };
            
            const areColliding = combatSystem._areColliding(
                mockVehicle.body,
                mockZombie.body
            );
            
            expect(areColliding).toBe(false);
        });

        test('should get body radius correctly', () => {
            const radius = combatSystem._getBodyRadius(mockVehicle.body);
            
            expect(radius).toBe(10); // (110-90)/2 = 10
        });
    });

    describe('Damage Calculation', () => {
        let collisionData;

        beforeEach(() => {
            collisionData = {
                speed: 15,
                relativeVelocity: { x: 12, y: 0 },
                normal: { x: 1, y: 0 },
                distance: 20
            };
        });

        test('should calculate vehicle to zombie damage', () => {
            const damage = combatSystem._calculateVehicleToZombieDamage(
                mockVehicle,
                mockZombie,
                collisionData
            );
            
            expect(damage.damage).toBeGreaterThan(0);
            expect(damage.damageType).toBe('impact');
            expect(damage.components).toBeDefined();
            expect(damage.components.baseDamage).toBe(25);
            expect(damage.components.speedBonus).toBe(7.5); // 15 * 0.5
        });

        test('should apply critical hit multiplier', () => {
            // Mock random to always trigger critical hit
            jest.spyOn(Math, 'random').mockReturnValue(0.05);
            
            const damage = combatSystem._calculateVehicleToZombieDamage(
                mockVehicle,
                mockZombie,
                collisionData
            );
            
            expect(damage.isCritical).toBe(true);
            expect(damage.components.criticalMultiplier).toBe(2.0);
            
            Math.random.mockRestore();
        });

        test('should calculate zombie to vehicle damage', () => {
            const damage = combatSystem._calculateZombieToVehicleDamage(
                mockZombie,
                mockVehicle,
                collisionData
            );
            
            expect(damage.damage).toBeGreaterThan(0);
            expect(damage.damageType).toBe('impact');
        });

        test('should apply zombie resistance', () => {
            const resistance = combatSystem._getZombieResistance('walker', 'impact');
            
            expect(resistance).toBe(1.0); // Walker has no impact resistance
        });

        test('should apply armored zombie resistance', () => {
            const resistance = combatSystem._getZombieResistance('armored', 'impact');
            
            expect(resistance).toBe(0.5); // Armored zombie has 50% impact resistance
        });
    });

    describe('Combat Mechanics', () => {
        beforeEach(() => {
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
        });

        test('should handle vehicle-zombie collision', () => {
            const collisionPair = {};
            
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                collisionPair
            );
            
            expect(mockZombie.takeDamage).toHaveBeenCalled();
            expect(mockVehicle.takeDamage).toHaveBeenCalled();
        });

        test('should not process duplicate collisions', () => {
            // Process collision once
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                {}
            );
            
            // Try to process same collision again immediately
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                {}
            );
            
            // Should only be called once due to collision key tracking
            expect(mockZombie.takeDamage).toHaveBeenCalledTimes(1);
        });

        test('should not process collision with destroyed zombie', () => {
            mockZombie.isDestroyed = true;
            
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                {}
            );
            
            expect(mockZombie.takeDamage).not.toHaveBeenCalled();
        });

        test('should not process collision with dying zombie', () => {
            mockZombie.isDying = true;
            
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                {}
            );
            
            expect(mockZombie.takeDamage).not.toHaveBeenCalled();
        });

        test('should emit zombie kill event', () => {
            mockZombie.health = 1; // Low health so it will die
            mockZombie.takeDamage.mockImplementation((damage) => {
                mockZombie.health = 0;
                return damage;
            });
            
            combatSystem._handleVehicleZombieCollision(
                mockVehicle.body,
                mockZombie.body,
                {}
            );
            
            expect(mockGameEngine.emit).toHaveBeenCalledWith('zombieKilled', expect.objectContaining({
                zombie: mockZombie,
                vehicle: mockVehicle,
                killMethod: 'collision'
            }));
        });
    });

    describe('Visual Effects', () => {
        beforeEach(() => {
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
        });

        test('should create collision effects', () => {
            const spriteRenderer = mockGameEngine.getSystem();
            const collisionData = { speed: 15 };
            const vehicleDamage = { damage: 30, isCritical: false };
            
            combatSystem._createCollisionEffects(
                mockVehicle,
                mockZombie,
                collisionData,
                vehicleDamage,
                false
            );
            
            expect(spriteRenderer.createParticleEffect).toHaveBeenCalled();
            expect(spriteRenderer.createDustEffect).toHaveBeenCalled();
        });

        test('should create critical hit effects', () => {
            const spriteRenderer = mockGameEngine.getSystem();
            const collisionData = { speed: 15 };
            const vehicleDamage = { damage: 30, isCritical: true };
            
            combatSystem._createCollisionEffects(
                mockVehicle,
                mockZombie,
                collisionData,
                vehicleDamage,
                false
            );
            
            // Should create extra particle effect for critical hit
            expect(spriteRenderer.createParticleEffect).toHaveBeenCalledTimes(2);
        });

        test('should create death effects', () => {
            const spriteRenderer = mockGameEngine.getSystem();
            const collisionData = { speed: 15 };
            const vehicleDamage = { damage: 30, isCritical: false };
            
            combatSystem._createCollisionEffects(
                mockVehicle,
                mockZombie,
                collisionData,
                vehicleDamage,
                true // zombie killed
            );
            
            expect(spriteRenderer.createExplosionEffect).toHaveBeenCalled();
            expect(spriteRenderer.createParticleEffect).toHaveBeenCalledTimes(2); // Blood + death blood
        });
    });

    describe('Physics Effects', () => {
        beforeEach(() => {
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
        });

        test('should apply knockback to zombie', () => {
            const Matter = require('matter-js');
            const collisionData = {
                speed: 20,
                normal: { x: 1, y: 0 }
            };
            
            combatSystem._applyKnockback(mockVehicle, mockZombie, collisionData);
            
            expect(Matter.Body.applyForce).toHaveBeenCalledWith(
                mockZombie.body,
                mockZombie.body.position,
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number)
                })
            );
        });

        test('should apply vehicle slowdown', () => {
            const Matter = require('matter-js');
            
            combatSystem._applyVehicleSlowdown(mockVehicle, mockZombie, {});
            
            expect(Matter.Body.setVelocity).toHaveBeenCalledWith(
                mockVehicle.body,
                expect.objectContaining({
                    x: 8, // 10 * 0.8
                    y: 0
                })
            );
        });
    });

    describe('Statistics', () => {
        test('should track combat statistics', () => {
            combatSystem._updateCombatStats(5, 25, true, true);
            
            const stats = combatSystem.getCombatStats();
            
            expect(stats.totalCollisions).toBe(1);
            expect(stats.totalDamageDealt).toBe(25);
            expect(stats.zombiesKilled).toBe(1);
            expect(stats.criticalHits).toBe(1);
        });

        test('should reset combat statistics', () => {
            combatSystem._updateCombatStats(5, 25, true, true);
            combatSystem.resetCombatStats();
            
            const stats = combatSystem.getCombatStats();
            
            expect(stats.totalCollisions).toBe(0);
            expect(stats.totalDamageDealt).toBe(0);
            expect(stats.zombiesKilled).toBe(0);
            expect(stats.criticalHits).toBe(0);
        });
    });

    describe('Update and Cleanup', () => {
        test('should clean up destroyed vehicles', () => {
            combatSystem.registerVehicle(mockVehicle);
            mockVehicle.isDestroyed = true;
            
            combatSystem._cleanupDestroyedObjects();
            
            expect(combatSystem.activeVehicles.has(mockVehicle.id)).toBe(false);
            expect(combatSystem.combatStats.vehiclesDestroyed).toBe(1);
        });

        test('should clean up destroyed zombies', () => {
            combatSystem.registerZombie(mockZombie);
            mockZombie.isDestroyed = true;
            
            combatSystem._cleanupDestroyedObjects();
            
            expect(combatSystem.activeZombies.has(mockZombie.id)).toBe(false);
        });

        test('should check collisions manually', () => {
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
            
            const handleCollisionSpy = jest.spyOn(combatSystem, '_handleVehicleZombieCollision');
            
            combatSystem._checkCollisions();
            
            expect(handleCollisionSpy).toHaveBeenCalled();
        });
    });

    describe('System Integration', () => {
        test('should connect vehicle manager', () => {
            const mockVehicleManager = {};
            
            combatSystem.setVehicleManager(mockVehicleManager);
            
            expect(combatSystem.vehicleManager).toBe(mockVehicleManager);
        });

        test('should connect zombie manager', () => {
            const mockZombieManager = {};
            
            combatSystem.setZombieManager(mockZombieManager);
            
            expect(combatSystem.zombieManager).toBe(mockZombieManager);
        });
    });

    describe('Disposal', () => {
        test('should dispose correctly', () => {
            const Matter = require('matter-js');
            
            combatSystem.registerVehicle(mockVehicle);
            combatSystem.registerZombie(mockZombie);
            
            combatSystem.dispose();
            
            expect(Matter.Events.off).toHaveBeenCalled();
            expect(combatSystem.activeVehicles.size).toBe(0);
            expect(combatSystem.activeZombies.size).toBe(0);
        });
    });
});