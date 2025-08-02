/**
 * Tests for VehiclePhysicsEngine
 */

import { VehiclePhysicsEngine } from '../VehiclePhysicsEngine.js';

// Mock dependencies
jest.mock('../EngineSimulator.js');
jest.mock('../TransmissionSimulator.js');
jest.mock('../SuspensionSimulator.js');
jest.mock('../TirePhysicsSimulator.js');

describe('VehiclePhysicsEngine', () => {
    let physicsEngine;
    let mockVehicleConfig;

    beforeEach(() => {
        mockVehicleConfig = {
            mass: 1500,
            dimensions: { length: 4.5, width: 1.8, height: 1.4 },
            centerOfGravity: { x: 0, y: 0, z: 0.5 },
            engine: { type: 'V6', displacement: 3.0 },
            transmission: { type: 'automatic', gears: 6 },
            suspension: { type: 'independent' },
            tires: { width: 225, aspectRatio: 45, diameter: 17 }
        };

        physicsEngine = new VehiclePhysicsEngine(mockVehicleConfig);
    });

    afterEach(() => {
        if (physicsEngine) {
            physicsEngine.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with vehicle configuration', () => {
            expect(physicsEngine.config.mass).toBe(1500);
            expect(physicsEngine.config.dimensions.length).toBe(4.5);
        });

        test('should initialize all subsystems', () => {
            expect(physicsEngine.engineSimulator).toBeDefined();
            expect(physicsEngine.transmissionSimulator).toBeDefined();
            expect(physicsEngine.suspensionSimulator).toBeDefined();
            expect(physicsEngine.tireSimulator).toBeDefined();
        });

        test('should set initial state', () => {
            expect(physicsEngine.state.position).toEqual({ x: 0, y: 0, z: 0 });
            expect(physicsEngine.state.velocity).toEqual({ x: 0, y: 0, z: 0 });
            expect(physicsEngine.state.acceleration).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe('Physics Update', () => {
        test('should update physics state', () => {
            const inputs = {
                throttle: 0.5,
                brake: 0,
                steering: 0.2,
                clutch: 0
            };

            physicsEngine.update(0.016, inputs); // 60 FPS

            expect(physicsEngine.state.lastUpdate).toBeGreaterThan(0);
        });

        test('should handle zero delta time', () => {
            const inputs = { throttle: 0, brake: 0, steering: 0, clutch: 0 };
            
            expect(() => {
                physicsEngine.update(0, inputs);
            }).not.toThrow();
        });

        test('should cap maximum delta time', () => {
            const inputs = { throttle: 0, brake: 0, steering: 0, clutch: 0 };
            
            expect(() => {
                physicsEngine.update(1.0, inputs); // Very large delta time
            }).not.toThrow();
        });
    });

    describe('Force Calculations', () => {
        test('should calculate engine forces', () => {
            const forces = physicsEngine.calculateEngineForces(0.5, 2000);
            
            expect(forces).toHaveProperty('torque');
            expect(forces).toHaveProperty('power');
            expect(typeof forces.torque).toBe('number');
            expect(typeof forces.power).toBe('number');
        });

        test('should calculate aerodynamic forces', () => {
            physicsEngine.state.velocity = { x: 30, y: 0, z: 0 }; // 30 m/s
            
            const forces = physicsEngine.calculateAerodynamicForces();
            
            expect(forces).toHaveProperty('drag');
            expect(forces).toHaveProperty('lift');
            expect(forces.drag).toBeLessThan(0); // Drag opposes motion
        });

        test('should calculate rolling resistance', () => {
            const resistance = physicsEngine.calculateRollingResistance();
            
            expect(typeof resistance).toBe('number');
            expect(resistance).toBeLessThanOrEqual(0); // Resistance opposes motion
        });
    });

    describe('Vehicle Dynamics', () => {
        test('should update position based on velocity', () => {
            physicsEngine.state.velocity = { x: 10, y: 0, z: 0 };
            
            const initialPosition = { ...physicsEngine.state.position };
            physicsEngine.updatePosition(0.1);
            
            expect(physicsEngine.state.position.x).toBeGreaterThan(initialPosition.x);
        });

        test('should update velocity based on acceleration', () => {
            physicsEngine.state.acceleration = { x: 5, y: 0, z: 0 };
            
            const initialVelocity = { ...physicsEngine.state.velocity };
            physicsEngine.updateVelocity(0.1);
            
            expect(physicsEngine.state.velocity.x).toBeGreaterThan(initialVelocity.x);
        });

        test('should calculate vehicle speed correctly', () => {
            physicsEngine.state.velocity = { x: 3, y: 4, z: 0 };
            
            const speed = physicsEngine.getSpeed();
            
            expect(speed).toBeCloseTo(5, 2); // 3-4-5 triangle
        });
    });

    describe('Weight Transfer', () => {
        test('should calculate longitudinal weight transfer', () => {
            physicsEngine.state.acceleration = { x: 5, y: 0, z: 0 };
            
            const transfer = physicsEngine.calculateWeightTransfer();
            
            expect(transfer).toHaveProperty('longitudinal');
            expect(transfer).toHaveProperty('lateral');
            expect(typeof transfer.longitudinal).toBe('number');
        });

        test('should calculate lateral weight transfer', () => {
            physicsEngine.state.acceleration = { x: 0, y: 5, z: 0 };
            
            const transfer = physicsEngine.calculateWeightTransfer();
            
            expect(transfer.lateral).not.toBe(0);
        });
    });

    describe('Telemetry', () => {
        test('should provide comprehensive telemetry data', () => {
            const telemetry = physicsEngine.getTelemetry();
            
            expect(telemetry).toHaveProperty('state');
            expect(telemetry).toHaveProperty('engine');
            expect(telemetry).toHaveProperty('transmission');
            expect(telemetry).toHaveProperty('suspension');
            expect(telemetry).toHaveProperty('tires');
            expect(telemetry).toHaveProperty('performance');
        });

        test('should include performance metrics', () => {
            const telemetry = physicsEngine.getTelemetry();
            
            expect(telemetry.performance).toHaveProperty('speed');
            expect(telemetry.performance).toHaveProperty('acceleration');
            expect(telemetry.performance).toHaveProperty('gForce');
        });
    });

    describe('Configuration Updates', () => {
        test('should update vehicle configuration', () => {
            const newConfig = { mass: 1600 };
            
            physicsEngine.updateConfiguration(newConfig);
            
            expect(physicsEngine.config.mass).toBe(1600);
        });

        test('should emit configuration updated event', () => {
            const configSpy = jest.fn();
            physicsEngine.on('configurationUpdated', configSpy);
            
            physicsEngine.updateConfiguration({ mass: 1600 });
            
            expect(configSpy).toHaveBeenCalled();
        });
    });

    describe('Reset and Disposal', () => {
        test('should reset to initial state', () => {
            // Modify state
            physicsEngine.state.velocity = { x: 10, y: 5, z: 0 };
            physicsEngine.state.position = { x: 100, y: 50, z: 0 };
            
            physicsEngine.reset();
            
            expect(physicsEngine.state.velocity).toEqual({ x: 0, y: 0, z: 0 });
            expect(physicsEngine.state.position).toEqual({ x: 0, y: 0, z: 0 });
        });

        test('should dispose cleanly', () => {
            expect(() => {
                physicsEngine.dispose();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid inputs gracefully', () => {
            const invalidInputs = {
                throttle: NaN,
                brake: -1,
                steering: 2,
                clutch: undefined
            };
            
            expect(() => {
                physicsEngine.update(0.016, invalidInputs);
            }).not.toThrow();
        });

        test('should handle extreme values', () => {
            const extremeInputs = {
                throttle: 1000,
                brake: 1000,
                steering: 1000,
                clutch: 1000
            };
            
            expect(() => {
                physicsEngine.update(0.016, extremeInputs);
            }).not.toThrow();
        });
    });
});