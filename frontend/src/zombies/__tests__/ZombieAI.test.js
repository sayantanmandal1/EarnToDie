import { ZombieAI } from '../ZombieAI';
import { ZOMBIE_STATES, ZOMBIE_BEHAVIORS } from '../ZombieConfig';
import * as THREE from 'three';
import { createPositionMock } from '../../zombies-test-fixes.js';

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

const mockZombie = {
    id: 'test-zombie',
    type: 'walker',
    config: {
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 15,
        attackRange: 1.5,
        attackCooldown: 2.0,
        damage: 15,
        abilities: []
    },
    speed: 8,
    health: 50,
    body: {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { setFromAxisAngle: jest.fn() },
        applyForce: jest.fn()
    },
    getPosition: jest.fn(() => createPositionMock(0, 0, 0)),
    moveDirection: new THREE.Vector3(),
    abilities: {
        isAbilityAvailable: jest.fn(() => false),
        useAbility: jest.fn()
    }
};

describe('ZombieAI', () => {
    let zombieAI;

    beforeEach(() => {
        zombieAI = new ZombieAI(mockZombie, mockGameEngine);
        jest.clearAllMocks();
        
        // Reset mock implementations
        mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([]);
        mockZombie.getPosition.mockReturnValue(createPositionMock(0, 0, 0));
    });

    describe('Initialization', () => {
        test('should initialize with idle state', () => {
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.IDLE);
            expect(zombieAI.previousState).toBe(ZOMBIE_STATES.IDLE);
            expect(zombieAI.currentTarget).toBeNull();
        });

        test('should set behavior-specific parameters for aggressive zombies', () => {
            const aggressiveZombie = {
                ...mockZombie,
                config: {
                    ...mockZombie.config,
                    behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
                    detectionRange: 15
                }
            };
            
            const ai = new ZombieAI(aggressiveZombie, mockGameEngine);
            expect(ai.chaseDistance).toBe(15 * 1.2); // 20% increase for aggressive
        });

        test('should set behavior-specific parameters for defensive zombies', () => {
            const defensiveZombie = {
                ...mockZombie,
                config: {
                    ...mockZombie.config,
                    behavior: ZOMBIE_BEHAVIORS.DEFENSIVE,
                    detectionRange: 15
                }
            };
            
            const ai = new ZombieAI(defensiveZombie, mockGameEngine);
            expect(ai.chaseDistance).toBe(15 * 0.8); // 20% decrease for defensive
        });
    });

    describe('State Management', () => {
        test('should transition from idle to wandering after timeout', () => {
            zombieAI.stateTimer = 3.0; // Exceed idle timeout
            zombieAI._makeDecision();
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.WANDERING);
        });

        test('should transition from idle to chasing when target detected', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => ({
                    x: 7, y: 0, z: 0,
                    distanceTo: jest.fn(() => 7)
                }),
                isDestroyed: false
            };
            
            // Mock zombie getPosition to return object with distanceTo method
            mockZombie.getPosition = jest.fn(() => ({
                x: 0, y: 0, z: 0,
                distanceTo: jest.fn(() => 7)
            }));
            
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([mockVehicle]);
            
            zombieAI._makeDecision();
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.CHASING);
            expect(zombieAI.currentTarget).toBe(mockVehicle);
        });

        test('should transition from chasing to attacking when in range', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(1, 0, 0), // Within attack range
                isDestroyed: false
            };
            
            // Mock the vehicle manager to return the mock vehicle
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([mockVehicle]);
            
            zombieAI.currentTarget = mockVehicle;
            zombieAI.currentState = ZOMBIE_STATES.CHASING;
            zombieAI.attackCooldown = 0;
            
            zombieAI._makeDecision();
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.ATTACKING);
        });

        test('should give up chase when target is too far', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => createPositionMock(100, 0, 0), // Very far away
                isDestroyed: false
            };
            
            // Mock the vehicle manager to return the mock vehicle
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([mockVehicle]);
            
            zombieAI.currentTarget = mockVehicle;
            zombieAI.currentState = ZOMBIE_STATES.CHASING;
            
            zombieAI._makeDecision();
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.WANDERING);
            expect(zombieAI.currentTarget).toBeNull();
        });
    });

    describe('Target Detection', () => {
        test('should detect targets within detection range', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => ({
                    x: 7, y: 0, z: 0,
                    distanceTo: jest.fn(() => 7)
                }),
                isDestroyed: false
            };
            
            // Mock zombie getPosition to return object with distanceTo method
            mockZombie.getPosition = jest.fn(() => ({
                x: 0, y: 0, z: 0,
                distanceTo: jest.fn(() => 7)
            }));
            
            const canDetect = zombieAI._canDetectTarget(mockVehicle);
            expect(canDetect).toBe(true);
        });

        test('should not detect targets outside detection range', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => createPositionMock(50, 0, 0), // Outside range
                isDestroyed: false
            };
            
            // Ensure awareness level is low so detection range is limited
            zombieAI.awarenessLevel = 0;
            
            const canDetect = zombieAI._canDetectTarget(mockVehicle);
            expect(canDetect).toBe(false);
        });

        test('should not detect destroyed targets', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(5, 0, 0),
                isDestroyed: true
            };
            
            const canDetect = zombieAI._canDetectTarget(mockVehicle);
            expect(canDetect).toBe(false);
        });

        test('should have reduced detection range when stealthed', () => {
            zombieAI.isStealthed = true;
            
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(10, 0, 0),
                isDestroyed: false
            };
            
            const canDetect = zombieAI._canDetectTarget(mockVehicle);
            expect(canDetect).toBe(false); // Should not detect at normal range when stealthed
        });
    });

    describe('Pathfinding and Movement', () => {
        test('should set wander target when wandering', () => {
            zombieAI.currentState = ZOMBIE_STATES.WANDERING;
            zombieAI.wanderTarget = null;
            
            zombieAI._executeWandering(0.016);
            
            expect(zombieAI.wanderTarget).not.toBeNull();
            expect(zombieAI.wanderTarget).toHaveProperty('x');
            expect(zombieAI.wanderTarget).toHaveProperty('y');
            expect(zombieAI.wanderTarget).toHaveProperty('z');
        });

        test('should move towards wander target', () => {
            zombieAI.wanderTarget = new THREE.Vector3(10, 0, 0);
            
            zombieAI._executeWandering(0.016);
            
            expect(mockZombie.moveDirection.length()).toBeGreaterThan(0);
        });

        test('should face movement direction', () => {
            const direction = new THREE.Vector3(1, 0, 0);
            zombieAI._faceDirection(direction);
            
            expect(mockZombie.body.quaternion.setFromAxisAngle).toHaveBeenCalled();
        });

        test('should handle stuck condition', () => {
            zombieAI.stuckTimer = 4.0; // Exceed stuck threshold
            zombieAI.currentState = ZOMBIE_STATES.CHASING;
            
            zombieAI._handleStuckCondition();
            
            expect(mockZombie.body.applyForce).toHaveBeenCalled();
            expect(zombieAI.path).toEqual([]);
        });
    });

    describe('Attack Behavior', () => {
        test('should perform attack when in attacking state', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(1, 0, 0),
                takeDamage: jest.fn(),
                isDestroyed: false
            };
            
            zombieAI.currentTarget = mockVehicle;
            zombieAI.currentState = ZOMBIE_STATES.ATTACKING;
            zombieAI.stateTimer = 1.0; // Exceed attack delay
            
            zombieAI._executeAttacking(0.016);
            
            expect(mockVehicle.takeDamage).toHaveBeenCalledWith(mockZombie.config.damage);
        });

        test('should set attack cooldown after attacking', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => createPositionMock(1, 0, 0),
                takeDamage: jest.fn(),
                isDestroyed: false
            };
            
            // Mock zombie getPosition to return enhanced position mock
            mockZombie.getPosition = jest.fn(() => createPositionMock(0, 0, 0));
            
            zombieAI.currentTarget = mockVehicle;
            zombieAI.currentState = ZOMBIE_STATES.ATTACKING;
            zombieAI.stateTimer = 1.0; // Past attack delay
            
            zombieAI._executeAttacking(0.1);
            
            expect(zombieAI.attackCooldown).toBe(mockZombie.config.attackCooldown);
        });
    });

    describe('Awareness and Alert System', () => {
        test('should increase awareness when vehicles are nearby', () => {
            const mockVehicle = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(5, 0, 0),
                isDestroyed: false
            };
            
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([mockVehicle]);
            
            const initialAwareness = zombieAI.awarenessLevel;
            zombieAI._updateAwareness(1.0);
            
            expect(zombieAI.awarenessLevel).toBeGreaterThan(initialAwareness);
        });

        test('should decrease awareness when no vehicles are nearby', () => {
            zombieAI.awarenessLevel = 0.8;
            mockGameEngine.vehicleManager.getAllVehicles.mockReturnValue([]);
            
            zombieAI._updateAwareness(1.0);
            
            expect(zombieAI.awarenessLevel).toBeLessThan(0.8);
        });

        test('should share awareness with pack members', () => {
            const packMember = {
                ai: {
                    awarenessLevel: 0.1,
                    currentTarget: null,
                    _setState: jest.fn()
                },
                config: {
                    behavior: ZOMBIE_BEHAVIORS.PACK
                }
            };
            
            zombieAI.awarenessLevel = 0.8;
            zombieAI.currentTarget = { id: 'target' };
            
            zombieAI._sharePackAwareness([packMember]);
            
            expect(packMember.ai.awarenessLevel).toBeGreaterThan(0.1);
            expect(packMember.ai.currentTarget).toBe(zombieAI.currentTarget);
        });
    });

    describe('Special Abilities Integration', () => {
        test('should consider using abilities when chasing', () => {
            mockZombie.config.abilities = ['sprint'];
            mockZombie.abilities.isAbilityAvailable.mockReturnValue(true);
            
            zombieAI.currentTarget = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(10, 0, 0)
            };
            
            zombieAI._considerSpecialAbilities();
            
            expect(mockZombie.abilities.isAbilityAvailable).toHaveBeenCalledWith('sprint');
        });

        test('should use leap attack when target is in range', () => {
            mockZombie.config.abilities = ['leap_attack'];
            mockZombie.abilities.isAbilityAvailable.mockReturnValue(true);
            
            zombieAI.currentTarget = {
                id: 'test-vehicle',
                getPosition: () => new THREE.Vector3(5, 0, 0) // Within leap range
            };
            
            // Mock random to always trigger ability
            jest.spyOn(Math, 'random').mockReturnValue(0.1);
            
            zombieAI._considerSpecialAbilities();
            
            expect(mockZombie.abilities.useAbility).toHaveBeenCalledWith('leap_attack', zombieAI.currentTarget);
            
            Math.random.mockRestore();
        });
    });

    describe('Stunned State', () => {
        test('should enter stunned state when stunned', () => {
            zombieAI.stun(3.0);
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.STUNNED);
            expect(zombieAI.stateDuration).toBe(3.0);
        });

        test('should exit stunned state after duration', () => {
            zombieAI.stun(1.0);
            zombieAI.stateTimer = 1.5; // Exceed stun duration
            
            zombieAI._makeDecision();
            
            expect(zombieAI.currentState).toBe(ZOMBIE_STATES.IDLE);
        });

        test('should not move while stunned', () => {
            zombieAI.currentState = ZOMBIE_STATES.STUNNED;
            
            zombieAI._updateMovement(0.016);
            
            expect(mockZombie.body.applyForce).not.toHaveBeenCalled();
        });
    });

    describe('Debug Information', () => {
        test('should provide debug information', () => {
            zombieAI.currentState = ZOMBIE_STATES.CHASING;
            zombieAI.currentTarget = { id: 'test-target' };
            zombieAI.awarenessLevel = 0.7;
            zombieAI.path = [new THREE.Vector3(1, 0, 0)];
            
            const debugInfo = zombieAI.getDebugInfo();
            
            expect(debugInfo).toEqual({
                state: ZOMBIE_STATES.CHASING,
                target: 'test-target',
                awarenessLevel: 0.7,
                alertLevel: expect.any(Number),
                pathLength: 1,
                stuckTimer: expect.any(Number)
            });
        });
    });

    describe('Cleanup', () => {
        test('should dispose properly', () => {
            zombieAI.currentTarget = { id: 'target' };
            zombieAI.path = [new THREE.Vector3(1, 0, 0)];
            
            zombieAI.dispose();
            
            expect(zombieAI.currentTarget).toBeNull();
            expect(zombieAI.path).toEqual([]);
        });
    });
});