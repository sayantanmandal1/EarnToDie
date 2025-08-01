import { Vehicle } from '../Vehicle';
import { VEHICLE_TYPES, getVehicleConfig } from '../VehicleConfig';

// Mock Three.js and Cannon.js
jest.mock('three', () => ({
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x, y, z,
        copy: jest.fn(),
        clone: jest.fn(() => ({ 
            x, y, z,
            length: jest.fn(() => 10)
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
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0, clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })) },
        linearDamping: 0,
        angularDamping: 0,
        vectorToWorldFrame: jest.fn(),
        applyForce: jest.fn(),
        applyTorque: jest.fn()
    })),
    Material: jest.fn(),
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

describe('Vehicle', () => {
    let vehicle;
    const vehicleType = VEHICLE_TYPES.SEDAN;
    const vehicleStats = getVehicleConfig(vehicleType).stats;

    beforeEach(() => {
        jest.clearAllMocks();
        vehicle = new Vehicle(vehicleType, vehicleStats, mockGameEngine);
    });

    describe('Constructor', () => {
        test('should create vehicle with correct properties', () => {
            expect(vehicle.type).toBe(vehicleType);
            expect(vehicle.stats).toEqual(vehicleStats);
            expect(vehicle.gameEngine).toBe(mockGameEngine);
            expect(vehicle.health).toBe(100);
            expect(vehicle.fuel).toBe(vehicleStats.fuelCapacity);
            expect(vehicle.isDestroyed).toBe(false);
        });

        test('should generate unique ID', () => {
            const vehicle2 = new Vehicle(vehicleType, vehicleStats, mockGameEngine);
            expect(vehicle.id).not.toBe(vehicle2.id);
            expect(vehicle.id).toMatch(/^vehicle_[a-z0-9]+$/);
        });

        test('should initialize controls to zero', () => {
            expect(vehicle.controls).toEqual({
                forward: 0,
                backward: 0,
                left: 0,
                right: 0,
                brake: 0
            });
        });

        test('should initialize upgrades to zero', () => {
            expect(vehicle.upgrades).toEqual({
                engine: 0,
                armor: 0,
                weapons: 0,
                fuel: 0,
                tires: 0
            });
        });
    });

    describe('Control System', () => {
        test('should set controls correctly', () => {
            const newControls = {
                forward: 0.8,
                left: 0.5,
                brake: 0.3
            };

            vehicle.setControls(newControls);

            expect(vehicle.controls.forward).toBe(0.8);
            expect(vehicle.controls.left).toBe(0.5);
            expect(vehicle.controls.brake).toBe(0.3);
            expect(vehicle.controls.backward).toBe(0); // Should remain unchanged
            expect(vehicle.controls.right).toBe(0); // Should remain unchanged
        });

        test('should merge controls with existing values', () => {
            vehicle.controls.forward = 0.5;
            vehicle.controls.right = 0.3;

            vehicle.setControls({ forward: 0.8, left: 0.2 });

            expect(vehicle.controls.forward).toBe(0.8);
            expect(vehicle.controls.left).toBe(0.2);
            expect(vehicle.controls.right).toBe(0.3); // Should remain unchanged
        });
    });

    describe('Damage System', () => {
        test('should take damage correctly', () => {
            const damage = 20;
            const actualDamage = vehicle.takeDamage(damage);

            const expectedDamage = damage * (1 - vehicleStats.armor * 0.01);
            expect(vehicle.health).toBeCloseTo(100 - expectedDamage);
            expect(actualDamage).toBeCloseTo(expectedDamage);
        });

        test('should apply armor reduction', () => {
            vehicle.stats.armor = 50; // 50% damage reduction
            const damage = 100;
            const actualDamage = vehicle.takeDamage(damage);

            expect(actualDamage).toBe(50);
            expect(vehicle.health).toBe(50);
        });

        test('should not go below zero health', () => {
            vehicle.takeDamage(150);
            expect(vehicle.health).toBe(0);
            expect(vehicle.isDestroyed).toBe(true);
        });

        test('should not take damage when already destroyed', () => {
            vehicle.isDestroyed = true;
            const initialHealth = vehicle.health;
            
            vehicle.takeDamage(50);
            expect(vehicle.health).toBe(initialHealth);
        });

        test('should repair correctly', () => {
            vehicle.health = 50;
            vehicle.repair(30);
            expect(vehicle.health).toBe(80);
        });

        test('should not repair above 100 health', () => {
            vehicle.health = 90;
            vehicle.repair(20);
            expect(vehicle.health).toBe(100);
        });

        test('should not repair when destroyed', () => {
            vehicle.isDestroyed = true;
            vehicle.health = 0;
            vehicle.repair(50);
            expect(vehicle.health).toBe(0);
        });
    });

    describe('Fuel System', () => {
        test('should refuel correctly', () => {
            vehicle.fuel = 50;
            vehicle.refuel(30);
            expect(vehicle.fuel).toBe(80);
        });

        test('should not refuel above capacity', () => {
            vehicle.fuel = 90;
            vehicle.refuel(20);
            expect(vehicle.fuel).toBe(vehicleStats.fuelCapacity);
        });

        test('should consume fuel during movement', () => {
            const initialFuel = vehicle.fuel;
            vehicle.controls.forward = 1.0;
            
            // Mock fuel consumption
            vehicle._updateFuel(1.0); // 1 second
            
            expect(vehicle.fuel).toBeLessThan(initialFuel);
        });

        test('should not consume fuel when not moving', () => {
            const initialFuel = vehicle.fuel;
            vehicle.controls.forward = 0;
            vehicle.controls.backward = 0;
            
            vehicle._updateFuel(1.0);
            
            expect(vehicle.fuel).toBe(initialFuel);
        });
    });

    describe('Upgrade System', () => {
        test('should apply single upgrade', () => {
            vehicle.applyUpgrade('engine', 3);
            expect(vehicle.upgrades.engine).toBe(3);
        });

        test('should apply multiple upgrades', () => {
            vehicle.applyUpgrade('engine', 2);
            vehicle.applyUpgrade('armor', 4);
            vehicle.applyUpgrade('fuel', 1);

            expect(vehicle.upgrades.engine).toBe(2);
            expect(vehicle.upgrades.armor).toBe(4);
            expect(vehicle.upgrades.fuel).toBe(1);
        });

        test('should affect stats when upgrades are applied', () => {
            const originalSpeed = vehicle.stats.speed;
            vehicle.applyUpgrade('engine', 5);
            
            // Engine upgrades should increase speed
            expect(vehicle.stats.speed).toBeGreaterThan(originalSpeed);
        });
    });

    describe('Position and Movement', () => {
        beforeEach(() => {
            // Mock body for position tests
            vehicle.body = {
                position: { x: 10, y: 5, z: -3 },
                quaternion: { x: 0, y: 0, z: 0, w: 1 },
                velocity: { x: 2, y: 0, z: -1 }
            };
        });

        test('should get position correctly', () => {
            const position = vehicle.getPosition();
            expect(position).toBeDefined();
        });

        test('should get rotation correctly', () => {
            const rotation = vehicle.getRotation();
            expect(rotation).toBeDefined();
        });

        test('should get velocity correctly', () => {
            const velocity = vehicle.getVelocity();
            expect(velocity).toBeDefined();
        });

        test('should calculate speed correctly', () => {
            const speed = vehicle.getSpeed();
            expect(speed).toBeGreaterThan(0);
        });
    });

    describe('Vehicle Dimensions', () => {
        test('should return correct dimensions for sedan', () => {
            const dimensions = vehicle._getVehicleDimensions();
            expect(dimensions).toEqual({
                width: 1.8,
                height: 1.4,
                length: 4.5
            });
        });

        test('should return correct dimensions for different vehicle types', () => {
            const truckVehicle = new Vehicle(VEHICLE_TYPES.TRUCK, vehicleStats, mockGameEngine);
            const truckDimensions = truckVehicle._getVehicleDimensions();
            
            expect(truckDimensions.width).toBeGreaterThan(1.8);
            expect(truckDimensions.length).toBeGreaterThan(4.5);
        });
    });

    describe('Wheel System', () => {
        test('should get correct wheel positions', () => {
            const wheelPositions = vehicle._getWheelPositions();
            expect(wheelPositions).toHaveLength(4);
            
            // Check that positions are reasonable
            wheelPositions.forEach(pos => {
                expect(typeof pos.x).toBe('number');
                expect(typeof pos.y).toBe('number');
                expect(typeof pos.z).toBe('number');
            });
        });

        test('should have front and rear wheels', () => {
            const wheelPositions = vehicle._getWheelPositions();
            
            // Should have wheels with positive and negative Z positions (front/rear)
            const frontWheels = wheelPositions.filter(pos => pos.z > 0);
            const rearWheels = wheelPositions.filter(pos => pos.z < 0);
            
            expect(frontWheels).toHaveLength(2);
            expect(rearWheels).toHaveLength(2);
        });

        test('should have left and right wheels', () => {
            const wheelPositions = vehicle._getWheelPositions();
            
            // Should have wheels with positive and negative X positions (left/right)
            const leftWheels = wheelPositions.filter(pos => pos.x < 0);
            const rightWheels = wheelPositions.filter(pos => pos.x > 0);
            
            expect(leftWheels).toHaveLength(2);
            expect(rightWheels).toHaveLength(2);
        });
    });

    describe('Update Loop', () => {
        test('should update without errors when not destroyed', () => {
            expect(() => {
                vehicle.update(0.016); // ~60 FPS
            }).not.toThrow();
        });

        test('should not update when destroyed', () => {
            vehicle.isDestroyed = true;
            const spy = jest.spyOn(vehicle, '_updatePhysics');
            
            vehicle.update(0.016);
            
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('Disposal', () => {
        test('should dispose correctly', () => {
            vehicle.mesh = { remove: jest.fn() };
            vehicle.body = { remove: jest.fn() };
            vehicle.constraints = [{ remove: jest.fn() }];
            vehicle.wheelBodies = [{ remove: jest.fn() }];

            vehicle.dispose();

            expect(vehicle.isDestroyed).toBe(true);
            expect(mockGameEngine.removeObject).toHaveBeenCalled();
        });

        test('should handle disposal when mesh is null', () => {
            vehicle.mesh = null;
            vehicle.body = null;

            expect(() => {
                vehicle.dispose();
            }).not.toThrow();

            expect(vehicle.isDestroyed).toBe(true);
        });
    });

    describe('Vehicle Colors', () => {
        test('should return different colors for different vehicle types', () => {
            const sedanColor = vehicle._getVehicleColor();
            
            const truckVehicle = new Vehicle(VEHICLE_TYPES.TRUCK, vehicleStats, mockGameEngine);
            const truckColor = truckVehicle._getVehicleColor();
            
            expect(sedanColor).not.toBe(truckColor);
        });

        test('should return default color for unknown vehicle type', () => {
            const unknownVehicle = new Vehicle('unknown_type', vehicleStats, mockGameEngine);
            const color = unknownVehicle._getVehicleColor();
            
            expect(color).toBe(0x3366cc); // Default sedan color
        });
    });
});