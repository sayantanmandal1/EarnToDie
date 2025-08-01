import { VehicleManager } from '../VehicleManager';
import { VEHICLE_TYPES } from '../VehicleConfig';

// Mock Vehicle class
jest.mock('../Vehicle', () => ({
    Vehicle: jest.fn().mockImplementation((type, stats, gameEngine) => ({
        id: 'vehicle_' + Math.random().toString(36).substr(2, 9),
        type,
        stats,
        gameEngine,
        health: 100,
        fuel: stats.fuelCapacity || 100,
        isDestroyed: false,
        initialize: jest.fn().mockResolvedValue(true),
        update: jest.fn(),
        dispose: jest.fn(),
        setControls: jest.fn(),
        getPosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 5) }),
        getVelocity: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: jest.fn(() => 10) }),
        getSpeed: jest.fn().mockReturnValue(50),
        repair: jest.fn(),
        refuel: jest.fn(),
        applyUpgrade: jest.fn(),
        upgrades: { engine: 0, armor: 0 },
        body: {
            position: { 
                x: 0, y: 0, z: 0,
                set: jest.fn()
            }
        }
    }))
}));

// Mock the entire Three.js and Cannon.js modules for integration testing
jest.mock('three', () => ({
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x, y, z,
        copy: jest.fn(),
        clone: jest.fn(() => ({ 
            x, y, z,
            length: jest.fn(() => 10),
            copy: jest.fn(),
            clone: jest.fn(() => ({ x, y, z }))
        })),
        length: jest.fn(() => 10),
        distanceTo: jest.fn(() => 5)
    })),
    Euler: jest.fn().mockImplementation(() => ({
        setFromQuaternion: jest.fn(),
        clone: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
    })),
    Group: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        position: { copy: jest.fn() },
        quaternion: { copy: jest.fn() }
    })),
    BoxGeometry: jest.fn(),
    CylinderGeometry: jest.fn(),
    MeshLambertMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
        rotation: { z: 0 },
        position: { copy: jest.fn() },
        quaternion: { copy: jest.fn() },
        castShadow: true
    }))
}));

jest.mock('cannon-es', () => ({
    Vec3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x, y, z,
        clone: jest.fn(() => ({ x, y, z })),
        scale: jest.fn(),
        vadd: jest.fn()
    })),
    Box: jest.fn(),
    Cylinder: jest.fn(),
    Body: jest.fn().mockImplementation(() => ({
        position: { 
            x: 0, y: 0, z: 0,
            set: jest.fn()
        },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0, clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })) },
        linearDamping: 0,
        angularDamping: 0,
        vectorToWorldFrame: jest.fn(),
        applyForce: jest.fn(),
        applyTorque: jest.fn()
    })),
    Material: jest.fn(),
    ContactMaterial: jest.fn(),
    World: jest.fn().mockImplementation(() => ({
        addBody: jest.fn(),
        removeBody: jest.fn(),
        step: jest.fn()
    })),
    PointToPointConstraint: jest.fn()
}));

// Mock GameEngine
const mockGameEngine = {
    addObject: jest.fn(),
    removeObject: jest.fn(),
    physics: {
        add: jest.fn(),
        remove: jest.fn(),
        addConstraint: jest.fn(),
        removeConstraint: jest.fn()
    }
};

describe('Vehicle System Integration', () => {
    let vehicleManager;

    beforeEach(() => {
        jest.clearAllMocks();
        vehicleManager = new VehicleManager(mockGameEngine);
        vehicleManager.initialize();
    });

    afterEach(() => {
        vehicleManager.dispose();
    });

    describe('Basic Vehicle Management Flow', () => {
        test('should handle complete vehicle lifecycle', async () => {
            // Create a vehicle
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            expect(vehicle).toBeDefined();
            expect(vehicleManager.getVehicleCount()).toBe(1);

            // Set as active vehicle
            const setResult = vehicleManager.setActiveVehicle(vehicle.id);
            expect(setResult).toBe(true);
            expect(vehicleManager.getActiveVehicle()).toBe(vehicle);

            // Apply controls
            const controls = { forward: 0.8, left: 0.3 };
            vehicleManager.applyControls(controls);
            expect(vehicle.setControls).toHaveBeenCalledWith(controls);

            // Update the vehicle
            vehicleManager.update(0.016);
            expect(vehicle.update).toHaveBeenCalledWith(0.016);

            // Remove the vehicle
            const removeResult = vehicleManager.removeVehicle(vehicle.id);
            expect(removeResult).toBe(true);
            expect(vehicleManager.getVehicleCount()).toBe(0);
            expect(vehicle.dispose).toHaveBeenCalled();
        });

        test('should handle player vehicle spawning and replacement', async () => {
            // Spawn initial player vehicle
            const firstVehicle = await vehicleManager.spawnPlayerVehicle(
                VEHICLE_TYPES.SEDAN,
                { x: 0, y: 2, z: 0 }
            );

            expect(vehicleManager.getPlayerVehicle()).toBe(firstVehicle);
            expect(vehicleManager.getActiveVehicle()).toBe(firstVehicle);

            // Spawn replacement player vehicle
            const secondVehicle = await vehicleManager.spawnPlayerVehicle(
                VEHICLE_TYPES.SPORTS_CAR,
                { x: 5, y: 2, z: 0 }
            );

            expect(vehicleManager.getPlayerVehicle()).toBe(secondVehicle);
            expect(vehicleManager.getActiveVehicle()).toBe(secondVehicle);
            expect(firstVehicle.dispose).toHaveBeenCalled();
        });

        test('should handle multiple vehicles simultaneously', async () => {
            const vehicles = [];

            // Create multiple vehicles
            for (let i = 0; i < 5; i++) {
                const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
                vehicles.push(vehicle);
            }

            expect(vehicleManager.getVehicleCount()).toBe(5);

            // Update all vehicles
            vehicleManager.update(0.016);
            vehicles.forEach(vehicle => {
                expect(vehicle.update).toHaveBeenCalledWith(0.016);
            });

            // Clear all vehicles
            vehicleManager.clearAllVehicles();
            expect(vehicleManager.getVehicleCount()).toBe(0);
            vehicles.forEach(vehicle => {
                expect(vehicle.dispose).toHaveBeenCalled();
            });
        });
    });

    describe('Vehicle Operations Integration', () => {
        test('should handle vehicle maintenance operations', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);

            // Test repair
            const repairResult = vehicleManager.repairVehicle(vehicle.id, 50);
            expect(repairResult).toBe(true);
            expect(vehicle.repair).toHaveBeenCalledWith(50);

            // Test refuel
            const refuelResult = vehicleManager.refuelVehicle(vehicle.id, 30);
            expect(refuelResult).toBe(true);
            expect(vehicle.refuel).toHaveBeenCalledWith(30);

            // Test upgrade
            const upgradeResult = vehicleManager.upgradeVehicle(vehicle.id, 'engine', 3);
            expect(upgradeResult).toBe(true);
            expect(vehicle.applyUpgrade).toHaveBeenCalledWith('engine', 3);
        });

        test('should provide comprehensive vehicle statistics', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);

            const stats = vehicleManager.getVehicleStats(vehicle.id);
            expect(stats).toEqual({
                id: vehicle.id,
                type: vehicle.type,
                health: vehicle.health,
                fuel: vehicle.fuel,
                position: expect.any(Object),
                velocity: expect.any(Object),
                speed: expect.any(Number),
                stats: vehicle.stats,
                upgrades: vehicle.upgrades,
                isDestroyed: vehicle.isDestroyed
            });

            const perfStats = vehicleManager.getPerformanceStats();
            expect(perfStats).toEqual({
                totalVehicles: 1,
                maxVehicles: 10,
                activeVehicle: vehicle.id,
                playerVehicle: null
            });
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle vehicle creation failures gracefully', async () => {
            // Mock a vehicle that fails to initialize
            const mockFailingVehicle = {
                initialize: jest.fn().mockRejectedValue(new Error('Init failed'))
            };

            const originalImplementation = require('../Vehicle').Vehicle;
            require('../Vehicle').Vehicle = jest.fn().mockImplementation(() => mockFailingVehicle);

            await expect(vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN))
                .rejects.toThrow('Init failed');

            // Restore original implementation
            require('../Vehicle').Vehicle = originalImplementation;
        });

        test('should handle operations on non-existent vehicles', () => {
            const fakeId = 'non_existent_vehicle';

            expect(vehicleManager.getVehicle(fakeId)).toBeUndefined();
            expect(vehicleManager.removeVehicle(fakeId)).toBe(false);
            expect(vehicleManager.repairVehicle(fakeId, 50)).toBe(false);
            expect(vehicleManager.refuelVehicle(fakeId, 30)).toBe(false);
            expect(vehicleManager.upgradeVehicle(fakeId, 'engine', 3)).toBe(false);
            expect(vehicleManager.getVehicleStats(fakeId)).toBeNull();
        });

        test('should handle destroyed vehicles during update', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);

            // Mark vehicle as destroyed
            vehicle.isDestroyed = true;

            // Update should remove destroyed vehicles
            vehicleManager.update(0.016);

            expect(vehicleManager.getVehicleCount()).toBe(0);
            expect(vehicle.dispose).toHaveBeenCalled();
        });
    });

    describe('Performance and Capacity Management', () => {
        test('should respect maximum vehicle capacity', async () => {
            vehicleManager.setMaxVehicles(3);

            // Create vehicles up to capacity
            await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            await vehicleManager.createVehicle(VEHICLE_TYPES.SUV);
            await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);

            expect(vehicleManager.isAtMaxCapacity()).toBe(true);
            expect(vehicleManager.getVehicleCount()).toBe(3);
        });

        test('should handle AI vehicle spawning with failures', async () => {
            // Mock some vehicles to fail initialization
            let callCount = 0;
            const originalImplementation = require('../Vehicle').Vehicle;
            require('../Vehicle').Vehicle = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    return {
                        initialize: jest.fn().mockRejectedValue(new Error('Spawn failed'))
                    };
                }
                return {
                    id: `ai_vehicle_${callCount}`,
                    initialize: jest.fn().mockResolvedValue(true),
                    dispose: jest.fn()
                };
            });

            const spawnedVehicles = await vehicleManager.spawnAIVehicles(3);

            // Should spawn 2 successfully (1st and 3rd), 2nd should fail
            expect(spawnedVehicles).toHaveLength(2);

            // Restore original implementation
            require('../Vehicle').Vehicle = originalImplementation;
        });
    });
});