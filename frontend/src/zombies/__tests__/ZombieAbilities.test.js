import { ZombieAbilities } from '../ZombieAbilities';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Mock THREE.js
jest.mock('three', () => ({
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => {
        const vector = {
            x, y, z,
            distanceTo: jest.fn((other) => {
                const dx = x - other.x;
                const dy = y - other.y;
                const dz = z - other.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            }),
            clone: jest.fn(() => ({ 
                x, y, z,
                sub: jest.fn(() => ({ 
                    x: x - 0, y: y - 0, z: z - 0,
                    normalize: jest.fn(() => ({ 
                        x: 1, y: 0, z: 0,
                        multiplyScalar: jest.fn(() => ({ x: 20, y: 0, z: 0 }))
                    }))
                }))
            })),
            sub: jest.fn(() => ({ 
                x: x - 0, y: y - 0, z: z - 0,
                normalize: jest.fn(() => ({ 
                    x: 1, y: 0, z: 0,
                    multiplyScalar: jest.fn(() => ({ x: 10, y: 0, z: 0 }))
                }))
            }))
        };
        return vector;
    }),
    Color: jest.fn().mockImplementation((color) => ({
        r: 0, g: 0, b: 0,
        setHex: jest.fn()
    }))
}));

// Mock dependencies
const mockGameEngine = {
    vehicleManager: {
        getAllVehicles: jest.fn(() => []),
        getVehiclesInRadius: jest.fn(() => [])
    },
    zombieManager: {
        getAllZombies: jest.fn(() => [])
    }
};

describe('ZombieAbilities', () => {
    let zombieAbilities;
    let mockZombie;

    beforeEach(() => {
        // Create fresh mockZombie for each test to avoid state pollution
        mockZombie = {
            id: 'test-zombie',
            type: 'walker',
            config: {
                abilities: ['sprint', 'leap_attack', 'toxic_cloud', 'acid_spit', 'rage_mode'],
                damage: 15,
                attackRange: 1.5
            },
            speed: 8,
            health: 50,
            body: {
                position: { x: 0, y: 0, z: 0 },
                velocity: { vadd: jest.fn() }
            },
            mesh: {
                traverse: jest.fn()
            },
            getPosition: jest.fn(() => new THREE.Vector3(0, 0, 0)),
            heal: jest.fn(),
            takeDamage: jest.fn()
        };

        zombieAbilities = new ZombieAbilities(mockZombie, mockGameEngine);
        jest.clearAllMocks();
        // Reset all cooldowns to 0
        for (const [ability] of zombieAbilities.cooldowns.entries()) {
            zombieAbilities.cooldowns.set(ability, 0);
        }
    });

    describe('Initialization', () => {
        test('should initialize abilities based on zombie config', () => {
            expect(zombieAbilities.cooldowns.has('sprint')).toBe(true);
            expect(zombieAbilities.cooldowns.has('leap_attack')).toBe(true);
            expect(zombieAbilities.cooldowns.has('toxic_cloud')).toBe(true);
            expect(zombieAbilities.cooldowns.get('sprint')).toBe(0);
        });

        test('should handle zombies with no abilities', () => {
            const zombieWithoutAbilities = {
                ...mockZombie,
                config: { ...mockZombie.config, abilities: undefined }
            };
            
            const abilities = new ZombieAbilities(zombieWithoutAbilities, mockGameEngine);
            expect(abilities.cooldowns.size).toBe(0);
        });
    });

    describe('Cooldown Management', () => {
        test('should update cooldowns over time', () => {
            zombieAbilities.cooldowns.set('sprint', 5.0);
            
            zombieAbilities.update(1.0);
            
            expect(zombieAbilities.cooldowns.get('sprint')).toBe(4.0);
        });

        test('should not reduce cooldowns below zero', () => {
            zombieAbilities.cooldowns.set('sprint', 0.5);
            
            zombieAbilities.update(1.0);
            
            expect(zombieAbilities.cooldowns.get('sprint')).toBe(0);
        });

        test('should check if ability is available', () => {
            zombieAbilities.cooldowns.set('sprint', 0);
            zombieAbilities.cooldowns.set('leap_attack', 5.0);
            
            expect(zombieAbilities.isAbilityAvailable('sprint')).toBe(true);
            expect(zombieAbilities.isAbilityAvailable('leap_attack')).toBe(false);
            expect(zombieAbilities.isAbilityAvailable('unknown_ability')).toBe(false);
        });
    });

    describe('Basic Abilities', () => {
        test('should execute sprint ability', () => {
            const originalSpeed = mockZombie.speed;
            
            const success = zombieAbilities.useAbility('sprint');
            
            expect(success).toBe(true);
            expect(mockZombie.speed).toBe(originalSpeed * 2);
            expect(zombieAbilities.activeAbilities.has('sprint')).toBe(true);
            expect(zombieAbilities.cooldowns.get('sprint')).toBeGreaterThan(0);
        });

        test('should update sprint ability duration', () => {
            zombieAbilities.useAbility('sprint');
            const originalSpeed = mockZombie.speed;
            
            // Update for longer than sprint duration
            zombieAbilities.update(4.0);
            
            expect(mockZombie.speed).toBe(originalSpeed / 2); // Should be restored
            expect(zombieAbilities.activeAbilities.has('sprint')).toBe(false);
        });

        test('should execute acid spit ability with target', () => {
            const mockTarget = {
                getPosition: () => new THREE.Vector3(1, 0, 0) // Within range
            };
            
            const success = zombieAbilities.useAbility('acid_spit', mockTarget);
            
            expect(success).toBe(true);
            expect(zombieAbilities.cooldowns.get('acid_spit')).toBeGreaterThan(0);
        });

        test('should fail acid spit without target', () => {
            const success = zombieAbilities.useAbility('acid_spit');
            
            expect(success).toBe(false);
        });

        test('should fail acid spit when target is out of range', () => {
            const mockTarget = {
                getPosition: () => new THREE.Vector3(100, 0, 0) // Out of range
            };
            
            const success = zombieAbilities.useAbility('acid_spit', mockTarget);
            
            expect(success).toBe(false);
        });

        test('should execute toxic cloud ability', () => {
            const success = zombieAbilities.useAbility('toxic_cloud');
            
            expect(success).toBe(true);
            expect(zombieAbilities.cooldowns.get('toxic_cloud')).toBeGreaterThan(0);
        });
    });

    describe('Combat Abilities', () => {
        test('should execute leap attack ability', () => {
            const mockTarget = {
                getPosition: () => new THREE.Vector3(1, 0, 0) // Within leap range (1.5)
            };
            
            const success = zombieAbilities.useAbility('leap_attack', mockTarget);
            
            expect(success).toBe(true);
            expect(mockZombie.body.velocity.vadd).toHaveBeenCalled();
        });

        test('should execute shield bash with knockback', () => {
            mockZombie.config.abilities = ['shield_bash'];
            zombieAbilities._initializeAbilities();
            
            const mockTarget = {
                getPosition: () => new THREE.Vector3(1, 0, 0),
                takeDamage: jest.fn(),
                body: {
                    applyForce: jest.fn()
                }
            };
            
            const success = zombieAbilities.useAbility('shield_bash', mockTarget);
            
            expect(success).toBe(true);
            expect(mockTarget.takeDamage).toHaveBeenCalledWith(mockZombie.config.damage * 1.5);
        });

        test('should execute suicide explosion', () => {
            mockZombie.config.abilities = ['suicide_explosion'];
            zombieAbilities._initializeAbilities();
            
            const success = zombieAbilities.useAbility('suicide_explosion');
            
            expect(success).toBe(true);
            expect(mockZombie.takeDamage).toHaveBeenCalledWith(mockZombie.health);
        });
    });

    describe('Status Effect Abilities', () => {
        test('should execute toxic aura ability', () => {
            mockZombie.config.abilities = ['toxic_aura'];
            zombieAbilities._initializeAbilities();
            
            const success = zombieAbilities.useAbility('toxic_aura');
            
            expect(success).toBe(true);
            expect(zombieAbilities.activeAbilities.has('toxic_aura')).toBe(true);
        });

        test('should update toxic aura with damage over time', () => {
            mockZombie.config.abilities = ['toxic_aura'];
            zombieAbilities._initializeAbilities();
            zombieAbilities.useAbility('toxic_aura');
            
            // Mock nearby vehicles
            const mockVehicle = {
                takeDamage: jest.fn()
            };
            mockGameEngine.vehicleManager.getVehiclesInRadius.mockReturnValue([mockVehicle]);
            
            // Update for damage interval
            zombieAbilities.update(1.5);
            
            expect(mockVehicle.takeDamage).toHaveBeenCalled();
        });

        test('should execute stealth ability', () => {
            mockZombie.config.abilities = ['stealth'];
            zombieAbilities._initializeAbilities();
            
            const mockMaterial = { transparent: false, opacity: 1.0 };
            const mockChild = { material: mockMaterial };
            mockZombie.mesh.traverse.mockImplementation(callback => callback(mockChild));
            
            const success = zombieAbilities.useAbility('stealth');
            
            expect(success).toBe(true);
            expect(mockMaterial.transparent).toBe(true);
            expect(mockMaterial.opacity).toBe(0.3);
        });

        test('should restore visibility after stealth expires', () => {
            mockZombie.config.abilities = ['stealth'];
            zombieAbilities._initializeAbilities();
            
            const mockMaterial = { transparent: false, opacity: 1.0 };
            const mockChild = { material: mockMaterial };
            mockZombie.mesh.traverse.mockImplementation(callback => callback(mockChild));
            
            zombieAbilities.useAbility('stealth');
            
            // Update past stealth duration
            zombieAbilities.update(10.0);
            
            expect(mockMaterial.opacity).toBe(1.0);
            expect(mockMaterial.transparent).toBe(false);
        });
    });

    describe('Rage and Enhancement Abilities', () => {
        test('should execute rage mode ability', () => {
            mockZombie.config.abilities = ['rage_mode'];
            zombieAbilities._initializeAbilities();
            
            const originalDamage = mockZombie.config.damage;
            const originalSpeed = mockZombie.speed;
            
            const success = zombieAbilities.useAbility('rage_mode');
            
            expect(success).toBe(true);
            expect(mockZombie.config.damage).toBe(originalDamage * 2);
            expect(mockZombie.speed).toBe(originalSpeed * 1.5);
        });

        test('should restore stats after rage mode expires', () => {
            mockZombie.config.abilities = ['rage_mode'];
            zombieAbilities._initializeAbilities();
            
            const originalDamage = mockZombie.config.damage;
            const originalSpeed = mockZombie.speed;
            
            zombieAbilities.useAbility('rage_mode');
            
            // Update past rage duration
            zombieAbilities.update(20.0);
            
            expect(mockZombie.config.damage).toBe(originalDamage);
            expect(mockZombie.speed).toBe(originalSpeed);
        });
    });

    describe('Boss Abilities', () => {
        test('should execute roar stun ability', () => {
            mockZombie.config.abilities = ['roar_stun'];
            zombieAbilities._initializeAbilities();
            
            const success = zombieAbilities.useAbility('roar_stun');
            
            expect(success).toBe(true);
        });

        test('should execute regeneration ability', () => {
            mockZombie.config.abilities = ['regeneration'];
            zombieAbilities._initializeAbilities();
            
            const success = zombieAbilities.useAbility('regeneration');
            
            expect(success).toBe(true);
            expect(zombieAbilities.activeAbilities.has('regeneration')).toBe(true);
        });

        test('should heal zombie during regeneration', () => {
            mockZombie.config.abilities = ['regeneration'];
            zombieAbilities._initializeAbilities();
            zombieAbilities.useAbility('regeneration');
            
            // Update for heal interval
            zombieAbilities.update(1.5);
            
            expect(mockZombie.heal).toHaveBeenCalled();
        });

        test('should execute teleport ability', () => {
            mockZombie.config.abilities = ['teleport'];
            zombieAbilities._initializeAbilities();
            
            // Mock target vehicle
            const mockVehicle = {
                getPosition: () => new THREE.Vector3(10, 0, 10)
            };
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([mockVehicle]);
            
            const success = zombieAbilities.useAbility('teleport');
            
            expect(success).toBe(true);
        });

        test('should fail teleport without target vehicles', () => {
            mockZombie.config.abilities = ['teleport'];
            zombieAbilities._initializeAbilities();
            
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([]);
            
            const success = zombieAbilities.useAbility('teleport');
            
            expect(success).toBe(false);
        });
    });

    describe('Ability Restrictions', () => {
        test('should not use ability if not in zombie config', () => {
            const success = zombieAbilities.useAbility('unknown_ability');
            
            expect(success).toBe(false);
        });

        test('should not use ability if on cooldown', () => {
            zombieAbilities.cooldowns.set('sprint', 5.0);
            
            const success = zombieAbilities.useAbility('sprint');
            
            expect(success).toBe(false);
        });

        test('should set cooldown only on successful ability use', () => {
            // Try to use ability not in config
            zombieAbilities.useAbility('unknown_ability');
            
            expect(zombieAbilities.cooldowns.has('unknown_ability')).toBe(false);
        });
    });

    describe('Ability Cooldown Times', () => {
        test('should have correct cooldown times for different abilities', () => {
            expect(zombieAbilities._getAbilityCooldown('sprint')).toBe(5.0);
            expect(zombieAbilities._getAbilityCooldown('leap_attack')).toBe(6.0);
            expect(zombieAbilities._getAbilityCooldown('suicide_explosion')).toBe(0.1);
            expect(zombieAbilities._getAbilityCooldown('unknown_ability')).toBe(5.0); // Default
        });
    });

    describe('Helper Methods', () => {
        test('should apply knockback to target', () => {
            const mockTarget = {
                getPosition: () => new THREE.Vector3(5, 0, 0),
                body: {
                    velocity: {
                        vadd: jest.fn()
                    }
                }
            };
            
            zombieAbilities._applyKnockback(mockTarget, new THREE.Vector3(0, 0, 0), 10);
            
            expect(mockTarget.body.velocity.vadd).toHaveBeenCalled();
        });

        test('should damage nearby vehicles', () => {
            const mockVehicle = {
                takeDamage: jest.fn()
            };
            mockGameEngine.vehicleManager.getVehiclesInRadius.mockReturnValue([mockVehicle]);
            
            zombieAbilities._damageNearbyVehicles(new THREE.Vector3(0, 0, 0), 5, 10);
            
            expect(mockVehicle.takeDamage).toHaveBeenCalledWith(10);
        });
    });

    describe('Active Ability Management', () => {
        test('should track active abilities', () => {
            const success = zombieAbilities.useAbility('sprint');
            
            expect(success).toBe(true);
            expect(zombieAbilities.activeAbilities.size).toBe(1);
            expect(zombieAbilities.activeAbilities.has('sprint')).toBe(true);
        });

        test('should remove expired active abilities', () => {
            zombieAbilities.useAbility('sprint');
            
            // Update past sprint duration
            zombieAbilities.update(5.0);
            
            expect(zombieAbilities.activeAbilities.has('sprint')).toBe(false);
        });
    });

    describe('Cleanup', () => {
        test('should dispose properly', () => {
            zombieAbilities.useAbility('sprint');
            zombieAbilities.cooldowns.set('test', 5.0);
            
            zombieAbilities.dispose();
            
            expect(zombieAbilities.activeAbilities.size).toBe(0);
            expect(zombieAbilities.cooldowns.size).toBe(0);
        });
    });
});