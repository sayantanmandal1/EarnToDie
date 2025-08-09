/**
 * Unit tests for 2D Zombie class
 * Tests zombie behavior, combat mechanics, and visual feedback
 */

import { Zombie2D } from '../Zombie2D.js';
import { ZOMBIE_TYPES, getZombieConfig } from '../ZombieConfig.js';

// Mock Matter.js
jest.mock('matter-js', () => ({
    Bodies: {
        rectangle: jest.fn(() => ({
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            bounds: { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } },
            collisionFilter: {},
            userData: {}
        }))
    },
    Body: {
        setPosition: jest.fn(),
        setVelocity: jest.fn(),
        applyForce: jest.fn()
    },
    World: {
        add: jest.fn(),
        remove: jest.fn()
    }
}));

// Mock sprite renderer
const mockSpriteRenderer = {
    registerSprite: jest.fn(),
    removeSprite: jest.fn(),
    updateSprite: jest.fn(),
    createParticleEffect: jest.fn(),
    createDustEffect: jest.fn(),
    createExplosionEffect: jest.fn()
};

// Mock game engine
const mockGameEngine = {
    physics: {
        world: {}
    },
    getSystem: jest.fn(() => mockSpriteRenderer),
    emit: jest.fn()
};

describe('Zombie2D', () => {
    let zombie;
    let zombieConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        zombieConfig = getZombieConfig(ZOMBIE_TYPES.WALKER);
        zombie = new Zombie2D(ZOMBIE_TYPES.WALKER, zombieConfig, mockGameEngine);
    });

    describe('Initialization', () => {
        test('should create zombie with correct properties', () => {
            expect(zombie.type).toBe(ZOMBIE_TYPES.WALKER);
            expect(zombie.health).toBe(zombieConfig.health);
            expect(zombie.maxHealth).toBe(zombieConfig.maxHealth);
            expect(zombie.speed).toBe(zombieConfig.speed);
            expect(zombie.isDestroyed).toBe(false);
            expect(zombie.isDying).toBe(false);
        });

        test('should generate unique ID', () => {
            const zombie2 = new Zombie2D(ZOMBIE_TYPES.WALKER, zombieConfig, mockGameEngine);
            expect(zombie.id).not.toBe(zombie2.id);
            expect(zombie.id).toMatch(/^zombie2d_/);
        });

        test('should initialize with correct position', () => {
            expect(zombie.position).toEqual({ x: 0, y: 0 });
        });

        test('should initialize animation state', () => {
            expect(zombie.animationState).toBe('idle');
            expect(zombie.animationFrame).toBe(0);
            expect(zombie.isFlailing).toBe(false);
        });
    });

    describe('Damage System', () => {
        test('should take damage correctly', () => {
            const initialHealth = zombie.health;
            const damage = 20;
            
            const actualDamage = zombie.takeDamage(damage);
            
            expect(zombie.health).toBe(initialHealth - damage);
            expect(actualDamage).toBe(damage);
        });

        test('should apply damage resistance', () => {
            const damage = 20;
            
            // Mock resistance method to return 0.5 (50% resistance)
            zombie._getDamageResistance = jest.fn(() => 0.5);
            
            const actualDamage = zombie.takeDamage(damage, 'fire');
            
            expect(actualDamage).toBe(damage * 0.5);
            expect(zombie._getDamageResistance).toHaveBeenCalledWith('fire');
        });

        test('should not take damage when destroyed', () => {
            zombie.isDestroyed = true;
            const initialHealth = zombie.health;
            
            const actualDamage = zombie.takeDamage(20);
            
            expect(zombie.health).toBe(initialHealth);
            expect(actualDamage).toBe(0);
        });

        test('should not take damage when dying', () => {
            zombie.isDying = true;
            const initialHealth = zombie.health;
            
            const actualDamage = zombie.takeDamage(20);
            
            expect(zombie.health).toBe(initialHealth);
            expect(actualDamage).toBe(0);
        });

        test('should trigger flailing when hit', () => {
            zombie.takeDamage(10);
            
            expect(zombie.isFlailing).toBe(true);
            expect(zombie.flailTimer).toBe(0);
        });

        test('should create visual effects when hit', () => {
            zombie.takeDamage(15);
            
            expect(mockSpriteRenderer.createParticleEffect).toHaveBeenCalled();
        });
    });

    describe('Death System', () => {
        test('should die when health reaches zero', () => {
            zombie.health = 10;
            
            zombie.takeDamage(10);
            
            expect(zombie.health).toBe(0);
            expect(zombie.isDying).toBe(true);
            expect(zombie.animationState).toBe('dying');
        });

        test('should not die if health is above zero', () => {
            zombie.health = 20;
            
            zombie.takeDamage(10);
            
            expect(zombie.health).toBe(10);
            expect(zombie.isDying).toBe(false);
        });

        test('should create death effects when dying', () => {
            zombie.health = 1;
            
            zombie.takeDamage(1);
            
            expect(mockSpriteRenderer.createExplosionEffect).toHaveBeenCalled();
            expect(mockSpriteRenderer.createParticleEffect).toHaveBeenCalled();
            expect(mockSpriteRenderer.createDustEffect).toHaveBeenCalled();
        });

        test('should dispose after death timer expires', () => {
            zombie.isDying = true;
            zombie.deathTimer = zombie.deathDuration + 0.1;
            
            const disposeSpy = jest.spyOn(zombie, 'dispose');
            
            zombie.update(16); // 16ms frame
            
            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('Position and Movement', () => {
        test('should get position correctly', () => {
            zombie.position = { x: 100, y: 200 };
            
            const position = zombie.getPosition();
            
            expect(position).toEqual({ x: 100, y: 200 });
        });

        test('should set position correctly', () => {
            zombie.setPosition(150, 250);
            
            expect(zombie.position).toEqual({ x: 150, y: 250 });
        });

        test('should update position from physics body', () => {
            zombie.body = {
                position: { x: 300, y: 400 },
                velocity: { x: 5, y: -3 }
            };
            
            zombie._updatePhysics(0.016);
            
            expect(zombie.position.x).toBe(300);
            expect(zombie.position.y).toBe(400);
            expect(zombie.velocity.x).toBe(5);
            expect(zombie.velocity.y).toBe(-3);
        });
    });

    describe('Animation System', () => {
        test('should handle flailing animation', () => {
            zombie.isFlailing = true;
            zombie.sprite = {
                rotation: 0,
                scaleX: 1,
                scaleY: 1
            };
            
            zombie._updateAnimations(0.1);
            
            // Flailing should randomize sprite properties
            expect(zombie.sprite.rotation).not.toBe(0);
            expect(zombie.sprite.scaleX).not.toBe(1);
            expect(zombie.sprite.scaleY).not.toBe(1);
        });

        test('should stop flailing after duration', () => {
            zombie.isFlailing = true;
            zombie.flailTimer = 0.6; // Longer than 0.5 second duration
            
            zombie._updateAnimations(0.1);
            
            expect(zombie.isFlailing).toBe(false);
            expect(zombie.flailTimer).toBe(0);
        });

        test('should handle walking animation', () => {
            zombie.animationState = 'walking';
            zombie.sprite = {
                rotation: 0,
                scaleX: 1,
                scaleY: 1
            };
            
            zombie._updateAnimations(0.1);
            
            // Walking animation should modify scaleY
            expect(zombie.sprite.scaleY).not.toBe(1);
        });

        test('should handle attack animation', () => {
            zombie.isAttacking = true;
            zombie.attackTimer = 0.1;
            zombie.sprite = {
                scaleX: 1,
                scaleY: 1
            };
            
            zombie._updateAnimations(0.1);
            
            expect(zombie.sprite.scaleX).toBe(1.2);
            expect(zombie.sprite.scaleY).toBe(0.8);
        });

        test('should end attack animation after duration', () => {
            zombie.isAttacking = true;
            zombie.attackTimer = 0.4; // Longer than 0.3 second duration
            
            zombie._updateAnimations(0.1);
            
            expect(zombie.isAttacking).toBe(false);
            expect(zombie.attackTimer).toBe(0);
            expect(zombie.animationState).toBe('walking');
        });
    });

    describe('Combat System', () => {
        let mockVehicle;

        beforeEach(() => {
            mockVehicle = {
                id: 'vehicle1',
                getPosition: () => ({ x: 50, y: 50 }),
                takeDamage: jest.fn(() => 10)
            };
        });

        test('should check if can attack target', () => {
            zombie.setPosition(45, 45); // Within attack range
            zombie.lastAttackTime = 0;
            
            const canAttack = zombie.canAttack(mockVehicle);
            
            expect(canAttack).toBe(true);
        });

        test('should not attack if on cooldown', () => {
            zombie.setPosition(45, 45);
            zombie.lastAttackTime = Date.now(); // Just attacked
            
            const canAttack = zombie.canAttack(mockVehicle);
            
            expect(canAttack).toBe(false);
        });

        test('should not attack if too far away', () => {
            zombie.setPosition(100, 100); // Too far from vehicle
            zombie.lastAttackTime = 0;
            
            const canAttack = zombie.canAttack(mockVehicle);
            
            expect(canAttack).toBe(false);
        });

        test('should attack target successfully', () => {
            zombie.setPosition(45, 45);
            zombie.lastAttackTime = 0;
            
            const attacked = zombie.attack(mockVehicle);
            
            expect(attacked).toBe(true);
            expect(zombie.isAttacking).toBe(true);
            expect(zombie.animationState).toBe('attacking');
            expect(mockVehicle.takeDamage).toHaveBeenCalledWith(
                zombie.config.damage,
                'zombie_attack',
                zombie
            );
        });

        test('should not attack if cannot attack', () => {
            zombie.setPosition(100, 100); // Too far
            
            const attacked = zombie.attack(mockVehicle);
            
            expect(attacked).toBe(false);
            expect(mockVehicle.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('Status Effects', () => {
        test('should apply poison damage over time', () => {
            zombie.statusEffects.set('poison', {
                duration: 1.0,
                intensity: 5
            });
            
            const takeDamageSpy = jest.spyOn(zombie, 'takeDamage');
            
            // Mock random to always trigger poison
            jest.spyOn(Math, 'random').mockReturnValue(0.05);
            
            zombie._updateStatusEffect('poison', zombie.statusEffects.get('poison'), 0.1);
            
            expect(takeDamageSpy).toHaveBeenCalledWith(5, 'poison');
            
            Math.random.mockRestore();
        });

        test('should apply burning damage', () => {
            const effect = { duration: 1.0, intensity: 10 };
            const takeDamageSpy = jest.spyOn(zombie, 'takeDamage');
            
            zombie._updateStatusEffect('burning', effect, 0.1);
            
            expect(takeDamageSpy).toHaveBeenCalledWith(1, 'fire'); // 10 * 0.1
        });

        test('should reduce speed when frozen', () => {
            const effect = { duration: 1.0, intensity: 0.5 };
            const originalSpeed = zombie.speed;
            
            zombie._updateStatusEffect('frozen', effect, 0.1);
            
            expect(zombie.speed).toBe(originalSpeed * 0.5);
        });

        test('should stop movement when stunned', () => {
            const effect = { duration: 1.0, intensity: 1.0 };
            
            zombie._updateStatusEffect('stunned', effect, 0.1);
            
            expect(zombie.speed).toBe(0);
        });
    });

    describe('Visual Effects', () => {
        test('should show damage numbers', () => {
            zombie._showDamageNumber(25);
            
            expect(mockSpriteRenderer.registerSprite).toHaveBeenCalled();
            expect(zombie.damageNumbers).toHaveLength(1);
        });

        test('should update damage numbers over time', () => {
            // Add a damage number
            zombie.damageNumbers.push({
                spriteId: 'damage1',
                x: 100,
                y: 100,
                life: 1.0
            });
            
            zombie._updateVisualEffects(0.5);
            
            expect(zombie.damageNumbers[0].life).toBe(0.5);
            expect(zombie.damageNumbers[0].y).toBe(75); // Moved up
            expect(mockSpriteRenderer.updateSprite).toHaveBeenCalled();
        });

        test('should remove expired damage numbers', () => {
            // Add an expired damage number
            zombie.damageNumbers.push({
                spriteId: 'damage1',
                x: 100,
                y: 100,
                life: -0.1
            });
            
            zombie._updateVisualEffects(0.1);
            
            expect(zombie.damageNumbers).toHaveLength(0);
            expect(mockSpriteRenderer.removeSprite).toHaveBeenCalledWith('damage1');
        });

        test('should handle flash effect', () => {
            zombie.sprite = { tint: null };
            zombie.flashTimer = 0.1;
            
            zombie._updateVisualEffects(0.05);
            
            expect(zombie.flashTimer).toBe(0.05);
            expect(zombie.sprite.tint).toContain('rgba(255, 0, 0');
        });

        test('should end flash effect', () => {
            zombie.sprite = { tint: 'rgba(255, 0, 0, 0.5)' };
            zombie.flashTimer = 0.05;
            
            zombie._updateVisualEffects(0.1);
            
            expect(zombie.flashTimer).toBe(-0.05);
            expect(zombie.sprite.tint).toBe(null);
        });
    });

    describe('Cleanup and Disposal', () => {
        test('should dispose correctly', () => {
            zombie.sprite = { id: 'zombie_sprite' };
            zombie.body = {};
            
            zombie.dispose();
            
            expect(zombie.isDestroyed).toBe(true);
            expect(mockSpriteRenderer.removeSprite).toHaveBeenCalledWith('zombie_sprite');
        });

        test('should clean up visual effects on disposal', () => {
            zombie.damageNumbers.push({
                spriteId: 'damage1'
            });
            
            zombie.dispose();
            
            expect(mockSpriteRenderer.removeSprite).toHaveBeenCalledWith('damage1');
            expect(zombie.damageNumbers).toHaveLength(0);
        });
    });

    describe('Stats and Information', () => {
        test('should return correct stats', () => {
            zombie.health = 30;
            zombie.position = { x: 100, y: 200 };
            zombie.velocity = { x: 5, y: -2 };
            zombie.animationState = 'walking';
            
            const stats = zombie.getStats();
            
            expect(stats).toEqual({
                id: zombie.id,
                type: ZOMBIE_TYPES.WALKER,
                health: 30,
                maxHealth: zombieConfig.maxHealth,
                speed: zombieConfig.speed,
                damage: zombieConfig.damage,
                pointValue: zombieConfig.pointValue,
                position: { x: 100, y: 200 },
                velocity: { x: 5, y: -2 },
                state: 'walking',
                isDestroyed: false,
                isDying: false
            });
        });
    });
});