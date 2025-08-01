import { VehicleManager } from '../VehicleManager';
import { Vehicle } from '../Vehicle';
import { VEHICLE_TYPES } from '../VehicleConfig';

// Mock Vehicle class
jest.mock('../Vehicle');

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

describe('VehicleManager', () => {
    let vehicleManager;
    let mockVehicle;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a factory function for mock vehicles to ensure unique instances
        const createMockVehicle = () => ({
            id: 'test_vehicle_' + Math.random().toString(36).substr(2, 9),
            type: VEHICLE_TYPES.SEDAN,
            health: 100,
            fuel: 100,
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
            stats: { speed: 60, armor: 30 },
            upgrades: { engine: 0, armor: 0 },
            body: {
                position: { set: jest.fn() }
            }
        });

        // Set up the mock to return unique instances for each call
        Vehicle.mockImplementation(() => createMockVehicle());
        
        // Create a reference to the mock for tests that need to access it
        mockVehicle = createMockVehicle();
        
        vehicleManager = new VehicleManager(mockGameEngine);
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            const result = vehicleManager.initialize();
            expect(result).toBe(true);
            expect(vehicleManager.vehicles.size).toBe(0);
            expect(vehicleManager.activeVehicle).toBeNull();
            expect(vehicleManager.playerVehicle).toBeNull();
        });

        test('should set default properties', () => {
            expect(vehicleManager.gameEngine).toBe(mockGameEngine);
            expect(vehicleManager.maxVehicles).toBe(10);
            expect(vehicleManager.vehiclePool).toEqual([]);
        });
    });

    describe('Vehicle Creation', () => {
        test('should create vehicle successfully', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            
            expect(Vehicle).toHaveBeenCalledWith(
                VEHICLE_TYPES.SEDAN,
                expect.any(Object),
                mockGameEngine
            );
            expect(vehicle.initialize).toHaveBeenCalled();
            expect(vehicleManager.vehicles.has(vehicle.id)).toBe(true);
            expect(vehicle).toBeDefined();
        });

        test('should create vehicle with custom position', async () => {
            const position = { x: 10, y: 5, z: -3 };
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN, position);
            
            expect(vehicle.body.position.set).toHaveBeenCalledWith(10, 5, -3);
        });

        test('should create vehicle with upgrades', async () => {
            const upgrades = { engine: 3, armor: 2 };
            await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN, undefined, upgrades);
            
            expect(mockVehicle.applyUpgrade).toHaveBeenCalledWith('engine', 3);
            expect(mockVehicle.applyUpgrade).toHaveBeenCalledWith('armor', 2);
        });

        test('should handle vehicle creation failure', async () => {
            mockVehicle.initialize.mockRejectedValue(new Error('Initialization failed'));
            
            await expect(vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN))
                .rejects.toThrow('Initialization failed');
        });

        test('should trigger onVehicleSpawned callback', async () => {
            const callback = jest.fn();
            vehicleManager.onVehicleSpawned = callback;
            
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            
            expect(callback).toHaveBeenCalledWith(vehicle);
        });
    });

    describe('Player Vehicle Management', () => {
        test('should spawn player vehicle', async () => {
            const position = { x: 0, y: 2, z: 0 };
            const upgrades = { engine: 1 };
            
            const vehicle = await vehicleManager.spawnPlayerVehicle(
                VEHICLE_TYPES.SPORTS_CAR, 
                position, 
                upgrades
            );
            
            expect(vehicleManager.playerVehicle).toBe(vehicle);
            expect(vehicleManager.activeVehicle).toBe(vehicle);
        });

        test('should remove existing player vehicle when spawning new one', async () => {
            // Spawn first vehicle
            const firstVehicle = await vehicleManager.spawnPlayerVehicle(VEHICLE_TYPES.SEDAN);
            expect(vehicleManager.playerVehicle).toBe(firstVehicle);
            
            // Spawn second vehicle
            const secondVehicle = await vehicleManager.spawnPlayerVehicle(VEHICLE_TYPES.TRUCK);
            
            expect(vehicleManager.playerVehicle).toBe(secondVehicle);
            expect(firstVehicle.dispose).toHaveBeenCalled();
        });
    });

    describe('Active Vehicle Management', () => {
        test('should set active vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const result = vehicleManager.setActiveVehicle(vehicle.id);
            
            expect(result).toBe(true);
            expect(vehicleManager.activeVehicle).toBe(vehicle);
        });

        test('should handle setting non-existent active vehicle', () => {
            const result = vehicleManager.setActiveVehicle('non_existent_id');
            
            expect(result).toBe(false);
            expect(vehicleManager.activeVehicle).toBeNull();
        });

        test('should trigger onActiveVehicleChanged callback', async () => {
            const callback = jest.fn();
            vehicleManager.onActiveVehicleChanged = callback;
            
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            
            expect(callback).toHaveBeenCalledWith(vehicle);
        });

        test('should get active vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            
            expect(vehicleManager.getActiveVehicle()).toBe(vehicle);
        });

        test('should get player vehicle', async () => {
            const vehicle = await vehicleManager.spawnPlayerVehicle(VEHICLE_TYPES.SEDAN);
            
            expect(vehicleManager.getPlayerVehicle()).toBe(vehicle);
        });
    });

    describe('Vehicle Removal', () => {
        test('should remove vehicle successfully', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const result = vehicleManager.removeVehicle(vehicle.id);
            
            expect(result).toBe(true);
            expect(vehicle.dispose).toHaveBeenCalled();
            expect(vehicleManager.vehicles.has(vehicle.id)).toBe(false);
        });

        test('should handle removing non-existent vehicle', () => {
            const result = vehicleManager.removeVehicle('non_existent_id');
            
            expect(result).toBe(false);
        });

        test('should clear active vehicle when removed', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            
            vehicleManager.removeVehicle(vehicle.id);
            
            expect(vehicleManager.activeVehicle).toBeNull();
        });

        test('should clear player vehicle when removed', async () => {
            const vehicle = await vehicleManager.spawnPlayerVehicle(VEHICLE_TYPES.SEDAN);
            
            vehicleManager.removeVehicle(vehicle.id);
            
            expect(vehicleManager.playerVehicle).toBeNull();
        });

        test('should trigger onVehicleDestroyed callback', async () => {
            const callback = jest.fn();
            vehicleManager.onVehicleDestroyed = callback;
            
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.removeVehicle(vehicle.id);
            
            expect(callback).toHaveBeenCalledWith(vehicle);
        });
    });

    describe('Update System', () => {
        test('should update all vehicles', async () => {
            const vehicle1 = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const vehicle2 = await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            
            vehicleManager.update(0.016);
            
            expect(vehicle1.update).toHaveBeenCalledWith(0.016);
            expect(vehicle2.update).toHaveBeenCalledWith(0.016);
        });

        test('should remove destroyed vehicles during update', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicle.isDestroyed = true;
            
            vehicleManager.update(0.016);
            
            expect(vehicleManager.vehicles.has(vehicle.id)).toBe(false);
        });
    });

    describe('Control Application', () => {
        test('should apply controls to active vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            
            const controls = { forward: 0.8, left: 0.3 };
            vehicleManager.applyControls(controls);
            
            expect(vehicle.setControls).toHaveBeenCalledWith(controls);
        });

        test('should not apply controls when no active vehicle', () => {
            const controls = { forward: 0.8 };
            
            expect(() => {
                vehicleManager.applyControls(controls);
            }).not.toThrow();
        });

        test('should not apply controls to destroyed active vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            vehicle.isDestroyed = true;
            
            const controls = { forward: 0.8 };
            vehicleManager.applyControls(controls);
            
            expect(vehicle.setControls).not.toHaveBeenCalled();
        });
    });

    describe('Vehicle Queries', () => {
        test('should get vehicle by ID', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            
            expect(vehicleManager.getVehicle(vehicle.id)).toBe(vehicle);
            expect(vehicleManager.getVehicle('non_existent')).toBeUndefined();
        });

        test('should get all vehicles', async () => {
            const vehicle1 = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const vehicle2 = await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            
            const allVehicles = vehicleManager.getAllVehicles();
            
            expect(allVehicles).toHaveLength(2);
            expect(allVehicles).toContain(vehicle1);
            expect(allVehicles).toContain(vehicle2);
        });

        test('should get vehicles in radius', async () => {
            const vehicle1 = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const vehicle2 = await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            
            // Mock positions - vehicle1 close, vehicle2 far
            vehicle1.getPosition.mockReturnValue({
                distanceTo: jest.fn(() => 3) // Within radius
            });
            vehicle2.getPosition.mockReturnValue({
                distanceTo: jest.fn(() => 15) // Outside radius
            });
            
            const center = { x: 0, y: 0, z: 0 };
            const vehiclesInRadius = vehicleManager.getVehiclesInRadius(center, 10);
            
            expect(vehiclesInRadius).toHaveLength(1);
            expect(vehiclesInRadius[0]).toBe(vehicle1);
        });

        test('should get vehicle count', async () => {
            expect(vehicleManager.getVehicleCount()).toBe(0);
            
            await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            expect(vehicleManager.getVehicleCount()).toBe(1);
            
            await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            expect(vehicleManager.getVehicleCount()).toBe(2);
        });

        test('should check if at max capacity', async () => {
            vehicleManager.setMaxVehicles(2);
            
            expect(vehicleManager.isAtMaxCapacity()).toBe(false);
            
            await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            
            expect(vehicleManager.isAtMaxCapacity()).toBe(true);
        });
    });

    describe('Vehicle Operations', () => {
        test('should repair vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const result = vehicleManager.repairVehicle(vehicle.id, 50);
            
            expect(result).toBe(true);
            expect(vehicle.repair).toHaveBeenCalledWith(50);
        });

        test('should refuel vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const result = vehicleManager.refuelVehicle(vehicle.id, 30);
            
            expect(result).toBe(true);
            expect(vehicle.refuel).toHaveBeenCalledWith(30);
        });

        test('should upgrade vehicle', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const result = vehicleManager.upgradeVehicle(vehicle.id, 'engine', 3);
            
            expect(result).toBe(true);
            expect(vehicle.applyUpgrade).toHaveBeenCalledWith('engine', 3);
        });

        test('should return false for operations on non-existent vehicle', () => {
            expect(vehicleManager.repairVehicle('fake_id', 50)).toBe(false);
            expect(vehicleManager.refuelVehicle('fake_id', 30)).toBe(false);
            expect(vehicleManager.upgradeVehicle('fake_id', 'engine', 3)).toBe(false);
        });
    });

    describe('Vehicle Statistics', () => {
        test('should get vehicle stats', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
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
        });

        test('should return null for non-existent vehicle stats', () => {
            const stats = vehicleManager.getVehicleStats('fake_id');
            expect(stats).toBeNull();
        });

        test('should get performance stats', async () => {
            const vehicle = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            vehicleManager.setActiveVehicle(vehicle.id);
            
            const perfStats = vehicleManager.getPerformanceStats();
            
            expect(perfStats).toEqual({
                totalVehicles: 1,
                maxVehicles: 10,
                activeVehicle: vehicle.id,
                playerVehicle: null
            });
        });
    });

    describe('AI Vehicle Spawning', () => {
        test('should spawn multiple AI vehicles', async () => {
            const spawnedVehicles = await vehicleManager.spawnAIVehicles(3);
            
            expect(spawnedVehicles).toHaveLength(3);
            expect(vehicleManager.getVehicleCount()).toBe(3);
        });

        test('should spawn AI vehicles with specific types', async () => {
            const types = [VEHICLE_TYPES.SEDAN, VEHICLE_TYPES.TRUCK];
            await vehicleManager.spawnAIVehicles(2, types);
            
            expect(Vehicle).toHaveBeenCalledTimes(2);
        });

        test('should handle AI vehicle spawn failures gracefully', async () => {
            // Mock the initialize method to fail for all calls
            mockVehicle.initialize.mockRejectedValue(new Error('Spawn failed'));
            
            const spawnedVehicles = await vehicleManager.spawnAIVehicles(2);
            
            // All spawns should fail, so no vehicles should be spawned
            expect(spawnedVehicles).toHaveLength(0);
        });
    });

    describe('Cleanup', () => {
        test('should clear all vehicles', async () => {
            const vehicle1 = await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            const vehicle2 = await vehicleManager.createVehicle(VEHICLE_TYPES.TRUCK);
            
            vehicleManager.clearAllVehicles();
            
            expect(vehicle1.dispose).toHaveBeenCalled();
            expect(vehicle2.dispose).toHaveBeenCalled();
            expect(vehicleManager.getVehicleCount()).toBe(0);
            expect(vehicleManager.activeVehicle).toBeNull();
            expect(vehicleManager.playerVehicle).toBeNull();
        });

        test('should dispose correctly', async () => {
            await vehicleManager.createVehicle(VEHICLE_TYPES.SEDAN);
            
            vehicleManager.dispose();
            
            expect(vehicleManager.getVehicleCount()).toBe(0);
            expect(vehicleManager.onVehicleDestroyed).toBeNull();
            expect(vehicleManager.onVehicleSpawned).toBeNull();
            expect(vehicleManager.onActiveVehicleChanged).toBeNull();
        });
    });
});