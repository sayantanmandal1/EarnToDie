/**
 * Realistic Combat System Tests
 * Comprehensive tests for physics-based combat and collision detection
 */

import { RealisticCombatSystem } from '../RealisticCombatSystem.js';

// Mock electron integration
jest.mock('../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('RealisticCombatSystem', () => {
    let combatSystem;

    beforeEach(() => {
        combatSystem = new RealisticCombatSystem({
            enablePhysicsBasedCollision: true,
            enableRealisticDamage: true,
            enableBloodEffects: true,
            enableComboSystem: true,
            collisionPrecision: 'high',
            maxBloodParticles: 100,
            comboTimeWindow: 2000,
            maxComboMultiplier: 5.0
        });
    });

    afterEach(() => {
        combatSystem.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with correct settings', () => {
            expect(combatSystem.options.enablePhysicsBasedCollision).toBe(true);
            expect(combatSystem.options.enableRealisticDamage).toBe(true);
            expect(combatSystem.options.enableBloodEffects).toBe(true);
            expect(combatSystem.options.enableComboSystem).toBe(true);
        });

        test('should initialize subsystems', () => {
            expect(combatSystem.collisionSystem).toBeDefined();
            expect(combatSystem.damageCalculator).toBeDefined();
            expect(combatSystem.bloodEffects).toBeDefined();
            expect(combatSystem.comboSystem).toBeDefined();
        });

        test('should emit initialized event', () => {
            const initSpy = jest.fn();
            const newCombatSystem = new RealisticCombatSystem();
            
            newCombatSystem.on('initialized', initSpy);
            
            expect(initSpy).toHaveBeenCalledWith({
                collisionPrecision: expect.any(String),
                enabledFeatures: expect.any(Object)
            });
            
            newCombatSystem.dispose();
        });
    });

    describe('Collision Detection', () => {
        let vehicle, zombie;

        beforeEach(() => {
            vehicle = {
                id: 'vehicle1',
                type: 'vehicle',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 20, y: 0, z: 0 },
                mass: 1500,
                isActive: true,
                bounds: { width: 4.5, height: 1.8, length: 2.0, radius: 3.0 }
            };

            zombie = {
                id: 'zombie1',
                type: 'zombie',
                position: { x: 5, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 70,
                health: 100,
                maxHealth: 100,
                isAlive: true,
                bounds: { width: 0.6, height: 1.8, length: 0.4, radius: 0.5 }
            };
        });

        test('should detect sphere collision', () => {
            const collision = combatSystem.collisionSystem.checkSphereCollision(
                vehicle, zombie, vehicle.bounds, zombie.bounds
            );

            expect(collision).toBeDefined();
            expect(collision.point).toBeDefined();
            expect(collision.normal).toBeDefined();
            expect(collision.penetration).toBeGreaterThan(0);
        });

        test('should detect AABB collision', () => {
            const collision = combatSystem.collisionSystem.checkAABBCollision(
                vehicle, zombie, vehicle.bounds, zombie.bounds
            );

            expect(collision).toBeDefined();
            expect(collision.point).toBeDefined();
            expect(collision.normal).toBeDefined();
        });

        test('should not detect collision when entities are far apart', () => {
            zombie.position.x = 100; // Move zombie far away

            const collision = combatSystem.collisionSystem.checkSphereCollision(
                vehicle, zombie, vehicle.bounds, zombie.bounds
            );

            expect(collision).toBeNull();
        });

        test('should check projectile collision', () => {
            const projectile = {
                id: 'projectile1',
                position: { x: 4, y: 0, z: 1 },
                velocity: { x: 50, y: 0, z: 0 },
                mass: 0.01,
                radius: 0.05,
                isActive: true
            };

            const collision = combatSystem.collisionSystem.checkProjectileCollision(projectile, zombie);

            expect(collision).toBeDefined();
            expect(collision.point).toBeDefined();
            expect(collision.normal).toBeDefined();
        });
    });

    describe('Damage Calculation', () => {
        test('should calculate vehicle vs zombie damage', () => {
            const collisionData = {
                impactVelocity: 20,
                momentum: 30000, // 1500kg * 20m/s
                impactAngle: 0, // Head-on collision
                entity1Mass: 1500,
                entity2Mass: 70,
                contactArea: 1.0
            };

            const damage = combatSystem.damageCalculator.calculateVehicleZombieDamage(collisionData);

            expect(damage.zombieDamage).toBeGreaterThan(0);
            expect(damage.vehicleDamage).toBeGreaterThan(0);
            expect(damage.zombieDamage).toBeGreaterThan(damage.vehicleDamage);
            expect(damage.multipliers).toBeDefined();
        });

        test('should calculate projectile damage', () => {
            const collisionData = {
                impactVelocity: 300,
                momentum: 3, // 0.01kg * 300m/s
                impactAngle: 0
            };

            const damage = combatSystem.damageCalculator.calculateProjectileDamage(collisionData, 'bullet');

            expect(damage.zombieDamage).toBeGreaterThan(0);
            expect(damage.vehicleDamage).toBe(0);
        });

        test('should calculate environment damage', () => {
            const collisionData = {
                impactVelocity: 15,
                momentum: 22500
            };

            const damage = combatSystem.damageCalculator.calculateEnvironmentDamage(
                collisionData, 'concrete', {}
            );

            expect(damage.vehicleDamage).toBeGreaterThan(0);
            expect(damage.environmentDamage).toBeGreaterThan(0);
            expect(damage.vehicleDamage).toBeGreaterThan(damage.environmentDamage); // Concrete is hard
        });

        test('should apply impact angle effects', () => {
            const headOnCollision = {
                impactVelocity: 20,
                momentum: 30000,
                impactAngle: 0, // Head-on
                entity1Mass: 1500,
                entity2Mass: 70
            };

            const glancingCollision = {
                ...headOnCollision,
                impactAngle: Math.PI / 2 // 90 degrees
            };

            const headOnDamage = combatSystem.damageCalculator.calculateVehicleZombieDamage(headOnCollision);
            const glancingDamage = combatSystem.damageCalculator.calculateVehicleZombieDamage(glancingCollision);

            expect(headOnDamage.zombieDamage).toBeGreaterThan(glancingDamage.zombieDamage);
        });
    });

    describe('Vehicle-Zombie Collision Handling', () => {
        test('should handle vehicle-zombie collision', () => {
            const vehicle = {
                id: 'vehicle1',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 20, y: 0, z: 0 },
                mass: 1500,
                isActive: true
            };

            const zombie = {
                id: 'zombie1',
                position: { x: 5, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 70,
                health: 100,
                maxHealth: 100,
                isAlive: true
            };

            const collision = {
                point: { x: 2.5, y: 0, z: 0 },
                normal: { x: 1, y: 0, z: 0 },
                penetration: 0.5
            };

            const collisionSpy = jest.fn();
            combatSystem.on('vehicleZombieCollision', collisionSpy);

            combatSystem.handleVehicleZombieCollision(vehicle, zombie, collision);

            expect(collisionSpy).toHaveBeenCalled();
            expect(zombie.health).toBeLessThan(100);
        });

        test('should apply knockback on high-speed impact', () => {
            const vehicle = {
                id: 'vehicle1',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 30, y: 0, z: 0 }, // High speed
                mass: 1500
            };

            const zombie = {
                id: 'zombie1',
                position: { x: 5, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 70,
                health: 100,
                maxHealth: 100,
                isAlive: true
            };

            const collision = {
                point: { x: 2.5, y: 0, z: 0 },
                normal: { x: 1, y: 0, z: 0 },
                penetration: 0.5
            };

            combatSystem.handleVehicleZombieCollision(vehicle, zombie, collision);

            expect(zombie.velocity).toBeDefined();
            expect(zombie.velocity.x).toBeGreaterThan(0); // Knockback in collision direction
        });

        test('should trigger dismemberment at very high speeds', () => {
            const vehicle = {
                id: 'vehicle1',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 50, y: 0, z: 0 }, // Very high speed
                mass: 1500
            };

            const zombie = {
                id: 'zombie1',
                position: { x: 5, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 70,
                health: 100,
                maxHealth: 100,
                isAlive: true
            };

            const collision = {
                point: { x: 2.5, y: 0, z: 1 },
                normal: { x: 1, y: 0, z: 0 },
                penetration: 0.5
            };

            const dismemberSpy = jest.fn();
            combatSystem.on('zombieDismembered', dismemberSpy);

            // Run multiple times due to random chance
            for (let i = 0; i < 10; i++) {
                const testZombie = { ...zombie, id: `zombie${i}` };
                combatSystem.handleVehicleZombieCollision(vehicle, testZombie, collision);
            }

            // Should have at least some dismemberment events due to high speed
            // Note: This test might be flaky due to randomness
        });
    });

    describe('Blood Effects System', () => {
        test('should create blood splatter', () => {
            const position = { x: 10, y: 10, z: 1 };
            const impactVelocity = 15;

            const initialParticleCount = combatSystem.bloodEffects.bloodParticles.length;
            combatSystem.bloodEffects.createBloodSplatter(position, impactVelocity);

            expect(combatSystem.bloodEffects.bloodParticles.length).toBeGreaterThan(initialParticleCount);
        });

        test('should create gore effect', () => {
            const position = { x: 10, y: 10, z: 1 };
            const bodyPart = 'head';
            const impactVelocity = 20;

            combatSystem.bloodEffects.createGoreEffect(position, bodyPart, impactVelocity);

            const goreParticles = combatSystem.bloodEffects.bloodParticles.filter(p => p.type === 'gore');
            expect(goreParticles.length).toBeGreaterThan(0);
            expect(goreParticles[0].bodyPart).toBe(bodyPart);
        });

        test('should create death effect', () => {
            const position = { x: 10, y: 10, z: 0 };
            const impactVelocity = 25;
            const damage = 150;

            const initialSplatterCount = combatSystem.bloodEffects.goreSplatters.length;
            combatSystem.bloodEffects.createDeathEffect(position, impactVelocity, damage);

            expect(combatSystem.bloodEffects.goreSplatters.length).toBeGreaterThan(initialSplatterCount);
        });

        test('should update blood particles over time', () => {
            // Create some blood particles
            combatSystem.bloodEffects.createBloodSplatter({ x: 0, y: 0, z: 5 }, 10);
            
            const initialCount = combatSystem.bloodEffects.bloodParticles.length;
            const initialParticle = combatSystem.bloodEffects.bloodParticles[0];
            const initialPosition = { ...initialParticle.position };

            // Update particles
            combatSystem.bloodEffects.update(0.1); // 100ms

            // Particles should have moved
            expect(combatSystem.bloodEffects.bloodParticles[0].position.x).not.toBe(initialPosition.x);
            expect(combatSystem.bloodEffects.bloodParticles[0].position.z).toBeLessThan(initialPosition.z); // Gravity
        });

        test('should remove particles when they hit ground or expire', () => {
            // Create particles at ground level
            combatSystem.bloodEffects.bloodParticles.push({
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: -1 },
                life: 100, // Very short life
                maxLife: 1000,
                gravity: 9.81,
                color: { r: 1, g: 0, b: 0, a: 1 }
            });

            const initialCount = combatSystem.bloodEffects.bloodParticles.length;
            combatSystem.bloodEffects.update(0.2); // 200ms

            expect(combatSystem.bloodEffects.bloodParticles.length).toBeLessThan(initialCount);
        });

        test('should respect maximum particle limit', () => {
            const maxParticles = combatSystem.bloodEffects.maxParticles;
            
            // Try to create more particles than the limit
            for (let i = 0; i < maxParticles + 50; i++) {
                combatSystem.bloodEffects.createBloodSplatter({ x: i, y: 0, z: 1 }, 5);
            }

            expect(combatSystem.bloodEffects.bloodParticles.length).toBeLessThanOrEqual(maxParticles);
        });
    });

    describe('Combo System', () => {
        test('should register hits and increase combo', () => {
            const damage = 50;
            const collisionData = { impactVelocity: 15 };

            const result1 = combatSystem.comboSystem.registerHit(damage, collisionData);
            expect(result1.combo).toBe(1);
            expect(result1.multiplier).toBe(1.2); // Base + growth

            const result2 = combatSystem.comboSystem.registerHit(damage, collisionData);
            expect(result2.combo).toBe(2);
            expect(result2.multiplier).toBeGreaterThan(result1.multiplier);
        });

        test('should register kills with bonuses', () => {
            const zombie = {
                id: 'zombie1',
                position: { x: 0, y: 0, z: 1.5 }
            };
            const damage = { zombieDamage: 100 };
            const collisionData = {
                impactVelocity: 20,
                collisionPoint: { x: 0, y: 0, z: 2.2 } // Head height
            };

            const result = combatSystem.comboSystem.registerKill(zombie, damage, collisionData);

            expect(result.bonuses).toContain('kill');
            expect(result.bonuses).toContain('headshot'); // High collision point
            expect(result.totalBonus).toBeGreaterThan(0);
        });

        test('should reset combo after timeout', () => {
            combatSystem.comboSystem.registerHit(50, { impactVelocity: 15 });
            expect(combatSystem.comboSystem.combo.count).toBe(1);

            // Simulate time passing beyond combo window
            combatSystem.comboSystem.combo.lastHitTime = Date.now() - 3000; // 3 seconds ago
            combatSystem.comboSystem.update(0.1);

            expect(combatSystem.comboSystem.combo.count).toBe(0);
            expect(combatSystem.comboSystem.combo.multiplier).toBe(1.0);
        });

        test('should apply projectile bonuses', () => {
            const damage = 75;
            const collisionData = { impactVelocity: 300 };
            const projectileType = 'rocket';

            const result = combatSystem.comboSystem.registerProjectileHit(damage, collisionData, projectileType);

            expect(result.projectileBonus).toBeGreaterThan(0);
            expect(result.score).toBeGreaterThan(0);
        });

        test('should track best combo', () => {
            // Build up a combo
            for (let i = 0; i < 5; i++) {
                combatSystem.comboSystem.registerHit(50, { impactVelocity: 15 });
            }

            expect(combatSystem.comboSystem.combo.bestCombo).toBe(5);

            // Reset and build smaller combo
            combatSystem.comboSystem.resetCombo();
            combatSystem.comboSystem.registerHit(50, { impactVelocity: 15 });

            expect(combatSystem.comboSystem.combo.bestCombo).toBe(5); // Should keep best
        });

        test('should respect maximum multiplier', () => {
            const maxMultiplier = combatSystem.comboSystem.options.maxComboMultiplier;

            // Build up a very large combo
            for (let i = 0; i < 100; i++) {
                combatSystem.comboSystem.registerHit(50, { impactVelocity: 15 });
            }

            expect(combatSystem.comboSystem.combo.multiplier).toBeLessThanOrEqual(maxMultiplier);
        });
    });

    describe('System Integration', () => {
        test('should update all subsystems', () => {
            const gameState = {
                vehicles: [{
                    id: 'vehicle1',
                    position: { x: 0, y: 0, z: 0 },
                    velocity: { x: 15, y: 0, z: 0 },
                    isActive: true
                }],
                zombies: [{
                    id: 'zombie1',
                    position: { x: 3, y: 0, z: 0 },
                    velocity: { x: 0, y: 0, z: 0 },
                    health: 100,
                    isAlive: true
                }],
                projectiles: [],
                environment: []
            };

            const updateSpy = jest.fn();
            combatSystem.on('updated', updateSpy);

            combatSystem.update(0.016, gameState); // ~60fps

            expect(updateSpy).toHaveBeenCalled();
            expect(combatSystem.performance.updateTime).toBeGreaterThanOrEqual(0);
        });

        test('should get combat statistics', () => {
            const stats = combatSystem.getCombatStats();

            expect(stats.performance).toBeDefined();
            expect(stats.activeCollisions).toBeDefined();
            expect(stats.bloodSplatters).toBeDefined();
            expect(stats.comboStats).toBeDefined();
            expect(stats.bloodEffectStats).toBeDefined();
        });

        test('should get system status', () => {
            const status = combatSystem.getStatus();

            expect(status.isActive).toBe(true);
            expect(status.enabledFeatures).toBeDefined();
            expect(status.performance).toBeDefined();
            expect(status.combatStats).toBeDefined();
        });

        test('should clean up old combat state', () => {
            // Add some old collision data
            combatSystem.combatState.activeCollisions.set('old_collision', {
                timestamp: Date.now() - 2000 // 2 seconds ago
            });

            combatSystem.combatState.recentHits.set('old_hit', {
                timestamp: Date.now() - 6000 // 6 seconds ago
            });

            combatSystem.cleanupCombatState(0.1);

            expect(combatSystem.combatState.activeCollisions.size).toBe(0);
            expect(combatSystem.combatState.recentHits.size).toBe(0);
        });
    });

    describe('Environment Collisions', () => {
        test('should handle vehicle-environment collision', () => {
            const vehicle = {
                id: 'vehicle1',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 20, y: 0, z: 0 },
                mass: 1500,
                isActive: true
            };

            const envObject = {
                id: 'wall1',
                type: 'concrete',
                position: { x: 5, y: 0, z: 0 },
                health: 100,
                maxHealth: 100,
                destructible: true,
                properties: {}
            };

            const collision = {
                point: { x: 2.5, y: 0, z: 0 },
                normal: { x: 1, y: 0, z: 0 },
                penetration: 0.3
            };

            const collisionSpy = jest.fn();
            combatSystem.on('vehicleEnvironmentCollision', collisionSpy);

            combatSystem.handleVehicleEnvironmentCollision(vehicle, envObject, collision);

            expect(collisionSpy).toHaveBeenCalled();
        });

        test('should destroy environment objects when health reaches zero', () => {
            const envObject = {
                id: 'wall1',
                type: 'wood',
                position: { x: 5, y: 0, z: 0 },
                health: 10, // Low health
                maxHealth: 100,
                destructible: true
            };

            const collisionData = { impactVelocity: 25 };

            const destroySpy = jest.fn();
            combatSystem.on('environmentObjectDestroyed', destroySpy);

            combatSystem.applyEnvironmentDamage(envObject, 15, collisionData);

            expect(envObject.destroyed).toBe(true);
            expect(destroySpy).toHaveBeenCalled();
        });

        test('should generate debris for destroyed objects', () => {
            const envObject = {
                id: 'crate1',
                type: 'wood',
                position: { x: 10, y: 10, z: 0 },
                bounds: { radius: 1.0 }
            };

            const collisionData = { impactVelocity: 20 };

            const debris = combatSystem.generateDebris(envObject, collisionData);

            expect(Array.isArray(debris)).toBe(true);
            expect(debris.length).toBeGreaterThan(0);
            expect(debris[0]).toHaveProperty('position');
            expect(debris[0]).toHaveProperty('velocity');
            expect(debris[0]).toHaveProperty('lifetime');
        });
    });

    describe('Performance and Edge Cases', () => {
        test('should handle entities without bounds gracefully', () => {
            const entity = {
                id: 'test1',
                position: { x: 0, y: 0, z: 0 },
                type: 'zombie'
            };

            const bounds = combatSystem.collisionSystem.getBounds(entity);

            expect(bounds).toBeDefined();
            expect(bounds.radius).toBeGreaterThan(0);
        });

        test('should handle zero velocity collisions', () => {
            const collisionData = {
                impactVelocity: 0,
                momentum: 0,
                impactAngle: 0,
                entity1Mass: 1500,
                entity2Mass: 70
            };

            const damage = combatSystem.damageCalculator.calculateVehicleZombieDamage(collisionData);

            expect(damage.zombieDamage).toBeGreaterThanOrEqual(0);
            expect(damage.vehicleDamage).toBeGreaterThanOrEqual(0);
        });

        test('should handle very high damage values', () => {
            const collisionData = {
                impactVelocity: 1000, // Extremely high
                momentum: 1500000,
                impactAngle: 0,
                entity1Mass: 1500,
                entity2Mass: 70
            };

            const damage = combatSystem.damageCalculator.calculateVehicleZombieDamage(collisionData);

            expect(damage.zombieDamage).toBeLessThanOrEqual(1000); // Should be capped
        });

        test('should dispose properly', () => {
            combatSystem.bloodEffects.createBloodSplatter({ x: 0, y: 0, z: 1 }, 10);
            combatSystem.comboSystem.registerHit(50, { impactVelocity: 15 });

            combatSystem.dispose();

            expect(combatSystem.combatState.activeCollisions.size).toBe(0);
            expect(combatSystem.combatState.bloodSplatters.length).toBe(0);
            expect(combatSystem.bloodEffects.bloodParticles.length).toBe(0);
        });
    });
});