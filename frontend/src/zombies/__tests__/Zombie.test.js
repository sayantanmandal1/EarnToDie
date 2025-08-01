import { Zombie } from '../Zombie';
import { ZOMBIE_STATES } from '../ZombieConfig';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../ZombieAI');
jest.mock('../ZombieAbilities');

const mockGameEngine = {
    addObject: jest.fn(),
    removeObject: jest.fn(),
    scoreManager: {
        addPoints: jest.fn()
    }
};

const mockZombieConfig = {
    health: 50,
    maxHealth: 50,
    speed: 8,
    damage: 15,
    pointValue: 10,
    size: { width: 0.6, height: 1.8, depth: 0.4 },
    color: 0x8B4513,
    abilities: ['sprint'],
    mass: 70
};

describe('Zombie', () => {
    let zombie;

    beforeEach(() => {
        zombie = new Zombie('walker', mockZombieConfig, mockGameEngine);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(zombie.type).toBe('walker');
            expect(zombie.health).toBe(50);
            expect(zombie.maxHealth).toBe(50);
            expect(zombie.speed).toBe(8);
            expect(zombie.isDestroyed).toBe(false);
            expect(zombie.isDying).toBe(false);
        });

        test('should generate unique ID', () => {
            const zombie2 = new Zombie('runner', mockZombieConfig, mockGameEngine);
            expect(zombie.id).not.toBe(zombie2.id);
            expect(zombie.id).toMatch(/^zombie_/);
        });

        test('should initialize with deep copy of config', () => {
            zombie.config.health = 100;
            expect(mockZombieConfig.health).toBe(50); // Original should be unchanged
        });
    });

    describe('Damage System', () => {
        test('should take damage correctly', () => {
            const damage = zombie.takeDamage(20);
            
            expect(damage).toBe(20);
            expect(zombie.health).toBe(30);
        });

        test('should apply armor reduction', () => {
            zombie.config.armor = 0.5; // 50% damage reduction
            
            const damage = zombie.takeDamage(20);
            
            expect(damage).toBe(10);
            expect(zombie.health).toBe(40);
        });

        test('should apply damage resistance ability', () => {
            zombie.abilities = {
                update: jest.fn(),
                dispose: jest.fn()
            };
            zombie.config.abilities = ['damage_resistance'];
            
            const damage = zombie.takeDamage(20);
            
            expect(damage).toBe(10); // 50% reduction from ability
            expect(zombie.health).toBe(40);
        });

        test('should not take damage when destroyed', () => {
            zombie.isDestroyed = true;
            
            const damage = zombie.takeDamage(20);
            
            expect(damage).toBe(0);
            expect(zombie.health).toBe(50); // Unchanged
        });

        test('should not take damage when dying', () => {
            zombie.isDying = true;
            
            const damage = zombie.takeDamage(20);
            
            expect(damage).toBe(0);
            expect(zombie.health).toBe(50); // Unchanged
        });

        test('should trigger death when health reaches zero', () => {
            zombie.takeDamage(50);
            zombie._checkHealth(); // Manually trigger health check
            
            expect(zombie.health).toBe(0);
            expect(zombie.isDying).toBe(true);
        });

        test('should set AI target when damaged by source', () => {
            const mockSource = { id: 'attacker' };
            zombie.ai = {
                setTarget: jest.fn(),
                alertLevel: 0,
                update: jest.fn(),
                dispose: jest.fn()
            };
            
            zombie.takeDamage(10, 'physical', mockSource);
            
            expect(zombie.ai.setTarget).toHaveBeenCalledWith(mockSource);
            expect(zombie.ai.alertLevel).toBeGreaterThan(0);
        });
    });

    describe('Healing System', () => {
        test('should heal correctly', () => {
            zombie.health = 30;
            
            const healing = zombie.heal(15);
            
            expect(healing).toBe(15);
            expect(zombie.health).toBe(45);
        });

        test('should not heal above max health', () => {
            zombie.health = 45;
            
            const healing = zombie.heal(20);
            
            expect(healing).toBe(5);
            expect(zombie.health).toBe(50);
        });

        test('should not heal when destroyed', () => {
            zombie.isDestroyed = true;
            zombie.health = 30;
            
            zombie.heal(20);
            
            expect(zombie.health).toBe(30); // Unchanged
        });

        test('should not heal when dying', () => {
            zombie.isDying = true;
            zombie.health = 30;
            
            zombie.heal(20);
            
            expect(zombie.health).toBe(30); // Unchanged
        });
    });

    describe('Status Effects', () => {
        test('should apply status effect', () => {
            zombie.applyStatusEffect('poison', 5.0, 2.0);
            
            expect(zombie.statusEffects.has('poison')).toBe(true);
            
            const effect = zombie.statusEffects.get('poison');
            expect(effect.duration).toBe(5.0);
            expect(effect.intensity).toBe(2.0);
        });

        test('should remove status effect', () => {
            zombie.applyStatusEffect('poison', 5.0);
            zombie.removeStatusEffect('poison');
            
            expect(zombie.statusEffects.has('poison')).toBe(false);
        });

        test('should update status effects over time', () => {
            zombie.applyStatusEffect('poison', 2.0);
            
            zombie._updateStatusEffects(1.0);
            
            const effect = zombie.statusEffects.get('poison');
            expect(effect.duration).toBe(1.0);
        });

        test('should remove expired status effects', () => {
            zombie.applyStatusEffect('poison', 1.0);
            
            zombie._updateStatusEffects(2.0);
            
            expect(zombie.statusEffects.has('poison')).toBe(false);
        });

        test('should apply poison damage over time', () => {
            zombie.applyStatusEffect('poison', 5.0, 10);
            
            // Mock random to always trigger poison damage
            jest.spyOn(Math, 'random').mockReturnValue(0.05);
            
            const originalHealth = zombie.health;
            zombie._updateStatusEffects(1.0);
            
            expect(zombie.health).toBeLessThan(originalHealth);
            
            Math.random.mockRestore();
        });

        test('should apply burning damage continuously', () => {
            zombie.applyStatusEffect('burning', 5.0, 5); // 5 damage per second
            
            const originalHealth = zombie.health;
            zombie._updateStatusEffects(1.0);
            
            expect(zombie.health).toBe(originalHealth - 5);
        });

        test('should reduce speed when frozen', () => {
            const originalSpeed = zombie.speed;
            zombie.applyStatusEffect('frozen', 5.0, 0.5); // 50% slow
            
            zombie._updateStatusEffects(0.1);
            
            expect(zombie.speed).toBe(originalSpeed * 0.5);
        });

        test('should stop movement when stunned', () => {
            zombie.applyStatusEffect('stunned', 3.0);
            
            zombie._updateStatusEffects(0.1);
            
            expect(zombie.speed).toBe(0);
        });
    });

    describe('Position and Movement', () => {
        test('should get position from physics body', () => {
            zombie.body = {
                position: { x: 10, y: 2, z: 5 }
            };
            
            const position = zombie.getPosition();
            
            expect(position.x).toBe(10);
            expect(position.y).toBe(2);
            expect(position.z).toBe(5);
        });

        test('should set position on physics body and mesh', () => {
            zombie.body = {
                position: { set: jest.fn() }
            };
            zombie.mesh = {
                position: { copy: jest.fn() }
            };
            
            const newPosition = new THREE.Vector3(5, 1, 3);
            zombie.setPosition(newPosition);
            
            expect(zombie.body.position.set).toHaveBeenCalledWith(5, 1, 3);
            expect(zombie.mesh.position.copy).toHaveBeenCalledWith(newPosition);
        });

        test('should get velocity from physics body', () => {
            zombie.body = {
                velocity: { x: 2, y: 0, z: 1 }
            };
            
            const velocity = zombie.getVelocity();
            
            expect(velocity.x).toBe(2);
            expect(velocity.y).toBe(0);
            expect(velocity.z).toBe(1);
        });
    });

    describe('Statistics', () => {
        test('should return correct stats', () => {
            zombie.health = 30;
            zombie.ai = {
                getState: () => ZOMBIE_STATES.CHASING,
                update: jest.fn(),
                dispose: jest.fn()
            };
            
            const stats = zombie.getStats();
            
            expect(stats).toEqual({
                id: zombie.id,
                type: 'walker',
                health: 30,
                maxHealth: 50,
                speed: 8,
                damage: 15,
                pointValue: 10,
                position: expect.any(THREE.Vector3),
                velocity: expect.any(THREE.Vector3),
                state: ZOMBIE_STATES.CHASING,
                isDestroyed: false,
                isDying: false
            });
        });
    });

    describe('Death System', () => {
        test('should die when health reaches zero', () => {
            zombie.ai = {
                _setState: jest.fn(),
                update: jest.fn(),
                dispose: jest.fn()
            };
            
            zombie.health = 0;
            zombie._checkHealth();
            
            expect(zombie.isDying).toBe(true);
            expect(zombie.ai._setState).toHaveBeenCalledWith(ZOMBIE_STATES.DYING);
        });

        test('should award points when dying', () => {
            zombie.health = 0;
            zombie._die();
            
            expect(mockGameEngine.scoreManager.addPoints).toHaveBeenCalledWith(10);
        });

        test('should trigger death abilities', () => {
            zombie.config.abilities = ['explosion_on_death'];
            zombie.abilities = {
                useAbility: jest.fn(),
                update: jest.fn(),
                dispose: jest.fn()
            };
            
            zombie.health = 0;
            zombie._triggerDeathAbilities();
            
            expect(zombie.abilities.useAbility).toHaveBeenCalledWith('explosion_on_death');
        });

        test('should fade out during death', () => {
            zombie.isDying = true;
            zombie.mesh = {
                traverse: jest.fn()
            };
            
            const mockMaterial = { transparent: false, opacity: 1.0 };
            const mockChild = { material: mockMaterial };
            zombie.mesh.traverse.mockImplementation(callback => callback(mockChild));
            
            zombie._updateDeath(1.0);
            
            expect(mockMaterial.transparent).toBe(true);
            expect(mockMaterial.opacity).toBeLessThan(1.0);
        });

        test('should dispose after fade out', () => {
            zombie.isDying = true;
            zombie.deathTimer = 4.0; // Exceed fade out time
            
            const disposeSpy = jest.spyOn(zombie, 'dispose');
            
            zombie._updateDeath(1.0);
            
            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('Update System', () => {
        beforeEach(() => {
            zombie.ai = {
                update: jest.fn(),
                dispose: jest.fn(),
                getState: jest.fn(() => 'idle')
            };
            zombie.abilities = {
                update: jest.fn(),
                dispose: jest.fn()
            };
        });

        test('should not update when destroyed', () => {
            zombie.isDestroyed = true;
            
            zombie.update(0.016);
            
            expect(zombie.ai.update).not.toHaveBeenCalled();
        });

        test('should only update death when dying', () => {
            zombie.isDying = true;
            
            zombie.update(0.016);
            
            expect(zombie.ai.update).not.toHaveBeenCalled();
        });

        test('should update AI and abilities when alive', () => {
            zombie.updateInterval = 0; // Disable throttling for test
            zombie.update(0.016);
            
            expect(zombie.ai.update).toHaveBeenCalledWith(expect.any(Number));
            expect(zombie.abilities.update).toHaveBeenCalledWith(expect.any(Number));
        });

        test('should throttle updates for performance', () => {
            zombie.updateInterval = 1.0; // Very slow update rate
            
            zombie.update(0.016);
            
            expect(zombie.ai.update).not.toHaveBeenCalled();
        });
    });

    describe('Visual Effects', () => {
        test('should show damage number', () => {
            zombie.mesh = {
                add: jest.fn()
            };
            
            // Mock getPosition to return a proper position object
            zombie.getPosition = jest.fn().mockReturnValue({
                clone: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
            });
            
            // Mock THREE.js components
            const mockTexture = {};
            const mockMaterial = {};
            const mockSprite = {
                position: { copy: jest.fn() },
                scale: { set: jest.fn() }
            };
            
            jest.spyOn(THREE, 'CanvasTexture').mockReturnValue(mockTexture);
            jest.spyOn(THREE, 'SpriteMaterial').mockReturnValue(mockMaterial);
            jest.spyOn(THREE, 'Sprite').mockReturnValue(mockSprite);
            
            // Mock canvas context
            const mockCanvas = {
                width: 64,
                height: 32,
                getContext: jest.fn().mockReturnValue({
                    font: '',
                    fillStyle: '',
                    textAlign: '',
                    fillText: jest.fn()
                })
            };
            
            jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
            
            zombie._showDamageNumber(25);
            
            expect(zombie.damageNumbers.length).toBe(1);
            expect(zombie.mesh.add).toHaveBeenCalled();
            
            // Restore mocks
            document.createElement.mockRestore();
            THREE.CanvasTexture.mockRestore();
            THREE.SpriteMaterial.mockRestore();
            THREE.Sprite.mockRestore();
        });

        test('should show healing number', () => {
            zombie.mesh = {
                add: jest.fn()
            };
            
            // Mock getPosition to return a proper position object
            zombie.getPosition = jest.fn().mockReturnValue({
                clone: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
            });
            
            // Mock THREE.js components
            const mockTexture = {};
            const mockMaterial = {};
            const mockSprite = {
                position: { copy: jest.fn() },
                scale: { set: jest.fn() }
            };
            
            jest.spyOn(THREE, 'CanvasTexture').mockReturnValue(mockTexture);
            jest.spyOn(THREE, 'SpriteMaterial').mockReturnValue(mockMaterial);
            jest.spyOn(THREE, 'Sprite').mockReturnValue(mockSprite);
            
            // Mock canvas context
            const mockCanvas = {
                width: 64,
                height: 32,
                getContext: jest.fn().mockReturnValue({
                    font: '',
                    fillStyle: '',
                    textAlign: '',
                    fillText: jest.fn()
                })
            };
            
            jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
            
            zombie._showHealingNumber(15);
            
            expect(zombie.damageNumbers.length).toBe(1);
            expect(zombie.mesh.add).toHaveBeenCalled();
            
            // Restore mocks
            document.createElement.mockRestore();
            THREE.CanvasTexture.mockRestore();
            THREE.SpriteMaterial.mockRestore();
            THREE.Sprite.mockRestore();
        });

        test('should update damage numbers over time', () => {
            zombie.mesh = {
                add: jest.fn(),
                remove: jest.fn()
            };
            
            // Mock getPosition to return a proper position object
            zombie.getPosition = jest.fn().mockReturnValue({
                clone: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
            });
            
            // Mock THREE.js components
            const mockTexture = {};
            const mockMaterial = {};
            const mockSprite = {
                position: { copy: jest.fn() },
                scale: { set: jest.fn() }
            };
            
            jest.spyOn(THREE, 'CanvasTexture').mockReturnValue(mockTexture);
            jest.spyOn(THREE, 'SpriteMaterial').mockReturnValue(mockMaterial);
            jest.spyOn(THREE, 'Sprite').mockReturnValue(mockSprite);
            
            // Mock canvas context
            const mockCanvas = {
                width: 64,
                height: 32,
                getContext: jest.fn().mockReturnValue({
                    font: '',
                    fillStyle: '',
                    textAlign: '',
                    fillText: jest.fn()
                })
            };
            
            jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
            
            zombie._showDamageNumber(10);
            
            // Update past damage number lifetime
            zombie._updateVisualEffects(3.0);
            
            expect(zombie.damageNumbers.length).toBe(0);
            expect(zombie.mesh.remove).toHaveBeenCalled();
            
            // Restore mocks
            document.createElement.mockRestore();
            THREE.CanvasTexture.mockRestore();
            THREE.SpriteMaterial.mockRestore();
            THREE.Sprite.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should dispose properly', () => {
            zombie.ai = {
                dispose: jest.fn()
            };
            zombie.abilities = {
                dispose: jest.fn()
            };
            zombie.mesh = {};
            zombie.body = {};
            
            zombie.dispose();
            
            expect(mockGameEngine.removeObject).toHaveBeenCalledWith(zombie.mesh, zombie.body);
            expect(zombie.ai.dispose).toHaveBeenCalled();
            expect(zombie.abilities.dispose).toHaveBeenCalled();
            expect(zombie.isDestroyed).toBe(true);
        });

        test('should cleanup visual effects on dispose', () => {
            zombie.mesh = {
                add: jest.fn(),
                remove: jest.fn()
            };
            
            zombie._showDamageNumber(10);
            
            const cleanupSpy = jest.spyOn(zombie, '_cleanupVisualEffects');
            
            zombie.dispose();
            
            expect(cleanupSpy).toHaveBeenCalled();
        });
    });
});