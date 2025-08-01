import { CollisionDetector } from '../CollisionDetector';
import * as CANNON from 'cannon-es';

// Mock GameEngine
const mockGameEngine = {
    physics: {
        addEventListener: jest.fn(),
        bodies: [],
        raycastClosest: jest.fn()
    }
};

describe('CollisionDetector', () => {
    let collisionDetector;

    beforeEach(() => {
        collisionDetector = new CollisionDetector(mockGameEngine);
    });

    afterEach(() => {
        collisionDetector.dispose();
    });

    describe('initialization', () => {
        test('should initialize with correct collision groups', () => {
            expect(collisionDetector.COLLISION_GROUPS.VEHICLE).toBe(1);
            expect(collisionDetector.COLLISION_GROUPS.ZOMBIE).toBe(2);
            expect(collisionDetector.COLLISION_GROUPS.TERRAIN).toBe(4);
            expect(collisionDetector.COLLISION_GROUPS.PROJECTILE).toBe(8);
        });

        test('should setup collision event listeners', () => {
            expect(mockGameEngine.physics.addEventListener).toHaveBeenCalledWith(
                'beginContact',
                expect.any(Function)
            );
            expect(mockGameEngine.physics.addEventListener).toHaveBeenCalledWith(
                'endContact',
                expect.any(Function)
            );
        });
    });

    describe('collision callbacks', () => {
        test('should register collision callback', () => {
            const callback = jest.fn();
            collisionDetector.registerCollisionCallback('vehicle', 'zombie', callback);
            
            expect(collisionDetector.collisionCallbacks.has('vehicle-zombie')).toBe(true);
            expect(collisionDetector.collisionCallbacks.get('vehicle-zombie')).toContain(callback);
        });

        test('should unregister collision callback', () => {
            const callback = jest.fn();
            collisionDetector.registerCollisionCallback('vehicle', 'zombie', callback);
            collisionDetector.unregisterCollisionCallback('vehicle', 'zombie', callback);
            
            const callbacks = collisionDetector.collisionCallbacks.get('vehicle-zombie');
            expect(callbacks).not.toContain(callback);
        });
    });

    describe('collision groups setup', () => {
        test('should setup collision groups for body', () => {
            const mockBody = {
                collisionFilterGroup: 0,
                collisionFilterMask: 0
            };

            collisionDetector.setupCollisionGroups(
                mockBody,
                collisionDetector.COLLISION_GROUPS.VEHICLE
            );

            expect(mockBody.collisionFilterGroup).toBe(1);
            expect(mockBody.collisionFilterMask).toBe(7); // VEHICLE | ZOMBIE | TERRAIN
        });

        test('should setup collision groups with custom mask', () => {
            const mockBody = {
                collisionFilterGroup: 0,
                collisionFilterMask: 0
            };

            collisionDetector.setupCollisionGroups(
                mockBody,
                collisionDetector.COLLISION_GROUPS.VEHICLE,
                collisionDetector.COLLISION_GROUPS.ZOMBIE
            );

            expect(mockBody.collisionFilterGroup).toBe(1);
            expect(mockBody.collisionFilterMask).toBe(2);
        });
    });

    describe('collision detection', () => {
        test('should detect active collisions', () => {
            const bodyA = { id: 'body1' };
            const bodyB = { id: 'body2' };
            
            // Simulate collision begin
            collisionDetector.activeCollisions.add('body1-body2');
            
            expect(collisionDetector.areColliding(bodyA, bodyB)).toBe(true);
        });

        test('should calculate collision normal', () => {
            const bodyA = { position: new CANNON.Vec3(1, 0, 0) };
            const bodyB = { position: new CANNON.Vec3(0, 0, 0) };
            
            const normal = collisionDetector.getCollisionNormal(bodyA, bodyB);
            
            expect(normal.x).toBeCloseTo(1);
            expect(normal.y).toBeCloseTo(0);
            expect(normal.z).toBeCloseTo(0);
        });

        test('should calculate impact force', () => {
            const bodyA = {
                position: new CANNON.Vec3(1, 0, 0),
                velocity: new CANNON.Vec3(5, 0, 0),
                mass: 1000
            };
            const bodyB = {
                position: new CANNON.Vec3(0, 0, 0),
                velocity: new CANNON.Vec3(0, 0, 0),
                mass: 70
            };
            
            const impact = collisionDetector.calculateImpactForce(bodyA, bodyB);
            
            expect(impact.force).toBeGreaterThan(0);
            expect(impact.speed).toBeCloseTo(5);
            expect(impact.normal).toBeDefined();
            expect(impact.relativeVelocity).toBeDefined();
        });
    });

    describe('raycast collision', () => {
        test('should perform raycast and return hit result', () => {
            const from = new CANNON.Vec3(0, 0, 0);
            const to = new CANNON.Vec3(10, 0, 0);
            
            // Mock successful raycast
            mockGameEngine.physics.raycastClosest.mockReturnValue(true);
            
            const result = collisionDetector.raycast(from, to);
            
            expect(mockGameEngine.physics.raycastClosest).toHaveBeenCalled();
            expect(result.hasHit).toBe(true);
        });

        test('should return no hit when raycast misses', () => {
            const from = new CANNON.Vec3(0, 0, 0);
            const to = new CANNON.Vec3(10, 0, 0);
            
            // Mock failed raycast
            mockGameEngine.physics.raycastClosest.mockReturnValue(false);
            
            const result = collisionDetector.raycast(from, to);
            
            expect(result.hasHit).toBe(false);
        });
    });

    describe('sphere collision test', () => {
        test('should detect sphere collisions', () => {
            const center = new CANNON.Vec3(0, 0, 0);
            const radius = 2;
            
            // Mock physics world with bodies
            const mockBody = {
                position: new CANNON.Vec3(1, 0, 0),
                shapes: [new CANNON.Sphere(1)],
                collisionFilterGroup: collisionDetector.COLLISION_GROUPS.ZOMBIE
            };
            
            mockGameEngine.physics.bodies = [mockBody];
            
            const collisions = collisionDetector.sphereCollisionTest(center, radius);
            
            expect(collisions.length).toBe(1);
            expect(collisions[0].body).toBe(mockBody);
            expect(collisions[0].distance).toBeCloseTo(1);
        });
    });

    describe('body type detection', () => {
        test('should detect body type from userData', () => {
            const body = {
                userData: { type: 'vehicle' }
            };
            
            const type = collisionDetector._getBodyType(body);
            expect(type).toBe('vehicle');
        });

        test('should detect body type from collision group', () => {
            const body = {
                collisionFilterGroup: collisionDetector.COLLISION_GROUPS.ZOMBIE
            };
            
            const type = collisionDetector._getBodyType(body);
            expect(type).toBe('zombie');
        });

        test('should return null for unknown body type', () => {
            const body = {
                collisionFilterGroup: 999
            };
            
            const type = collisionDetector._getBodyType(body);
            expect(type).toBeNull();
        });
    });

    describe('body radius calculation', () => {
        test('should calculate radius for sphere shape', () => {
            const body = {
                shapes: [new CANNON.Sphere(2.5)]
            };
            
            const radius = collisionDetector._getBodyRadius(body);
            expect(radius).toBe(2.5);
        });

        test('should calculate radius for box shape', () => {
            const body = {
                shapes: [new CANNON.Box(new CANNON.Vec3(1, 2, 3))]
            };
            
            const radius = collisionDetector._getBodyRadius(body);
            expect(radius).toBe(3); // Largest dimension
        });

        test('should return default radius for unknown shape', () => {
            const body = {
                shapes: []
            };
            
            const radius = collisionDetector._getBodyRadius(body);
            expect(radius).toBe(1);
        });
    });

    describe('collision event handling', () => {
        test('should handle collision begin event', () => {
            const callback = jest.fn();
            collisionDetector.registerCollisionCallback('vehicle', 'zombie', callback);
            
            const bodyA = {
                id: 'vehicle1',
                userData: { type: 'vehicle' },
                position: new CANNON.Vec3(0, 0, 0),
                velocity: new CANNON.Vec3(5, 0, 0),
                mass: 1000
            };
            
            const bodyB = {
                id: 'zombie1',
                userData: { type: 'zombie' },
                position: new CANNON.Vec3(1, 0, 0),
                velocity: new CANNON.Vec3(0, 0, 0),
                mass: 70
            };
            
            const event = {
                bodyA,
                bodyB,
                contact: {}
            };
            
            collisionDetector._handleCollisionBegin(event);
            
            expect(callback).toHaveBeenCalled();
            expect(collisionDetector.activeCollisions.has('vehicle1-zombie1')).toBe(true);
        });

        test('should handle collision end event', () => {
            const bodyA = { id: 'vehicle1' };
            const bodyB = { id: 'zombie1' };
            
            // Add active collision
            collisionDetector.activeCollisions.add('vehicle1-zombie1');
            
            const event = { bodyA, bodyB };
            collisionDetector._handleCollisionEnd(event);
            
            expect(collisionDetector.activeCollisions.has('vehicle1-zombie1')).toBe(false);
        });
    });

    describe('cleanup', () => {
        test('should dispose properly', () => {
            collisionDetector.registerCollisionCallback('vehicle', 'zombie', jest.fn());
            collisionDetector.activeCollisions.add('test-collision');
            
            collisionDetector.dispose();
            
            expect(collisionDetector.collisionCallbacks.size).toBe(0);
            expect(collisionDetector.activeCollisions.size).toBe(0);
        });
    });
});